declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

export interface MomenceCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  center?: string;
  homeLocationId?: number;
}

export interface MomenceCustomer {
  memberId: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  tags?: unknown;
  action?: 'found_existing' | 'created_new';
}

export interface MomenceCheckoutResult {
  success: boolean;
  orderId?: string;
  memberId?: number;
  data?: unknown;
  error?: string;
  customerAction?: 'found_existing' | 'created_new';
}

export interface MomenceMembershipPurchaseInput {
  membershipId: number;
  productName: string;
  priceInCurrency?: number;
}

export class MomenceAPIService {
  private hostId: number;
  private homeLocationId: number;
  private defaultHomeLocationId: number;
  private kwalityHomeLocationId: number;
  private transactionTagId: number;
  private apiV2BasicAuth: string;
  private apiV2Username: string;
  private apiV2Password: string;

  constructor(
    private cookies: string,
    private accessToken?: string
  ) {
    this.hostId = Number(Deno.env.get('MOMENCE_HOST_ID') || '13752');
    this.homeLocationId = Number(Deno.env.get('MOMENCE_HOME_LOCATION_ID') || '9030');
    this.defaultHomeLocationId = Number(Deno.env.get('MOMENCE_DEFAULT_HOME_LOCATION_ID') || '29821');
    this.kwalityHomeLocationId = Number(Deno.env.get('MOMENCE_KWALITY_HOME_LOCATION_ID') || '9030');
    this.transactionTagId = Number(Deno.env.get('MOMENCE_EXTERNAL_TRANSACTION_TAG_ID') || '4578');
    this.apiV2BasicAuth = String(Deno.env.get('MOMENCE_API_V2_BASIC_AUTH') || '').trim();
    this.apiV2Username = String(Deno.env.get('MOMENCE_API_V2_USERNAME') || '').trim();
    this.apiV2Password = String(Deno.env.get('MOMENCE_API_V2_PASSWORD') || '').trim();
  }

  private resolveHomeLocationId(input: MomenceCustomerInput): number {
    if (Number.isFinite(input.homeLocationId) && Number(input.homeLocationId) > 0) {
      return Number(input.homeLocationId);
    }

    const normalizedCenter = String(input.center || '').trim().toLowerCase();
    if (normalizedCenter.includes('kwality house') || normalizedCenter.includes('kemps')) {
      return this.kwalityHomeLocationId;
    }

    return this.defaultHomeLocationId || this.homeLocationId;
  }

  private assertApiV2Configured(): void {
    if (!this.apiV2BasicAuth || !this.apiV2Username || !this.apiV2Password) {
      throw new Error('Momence API v2 customer-creation secrets are missing. Set MOMENCE_API_V2_BASIC_AUTH, MOMENCE_API_V2_USERNAME, and MOMENCE_API_V2_PASSWORD.');
    }
  }

  private async getApiV2AccessToken(): Promise<string> {
    this.assertApiV2Configured();

    const response = await fetch('https://api.momence.com/api/v2/auth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: this.apiV2BasicAuth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.apiV2Username,
        password: this.apiV2Password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Momence API v2 auth failed: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return String(data.access_token || '').trim();
  }

  private parseApiV2Customer(customer: Record<string, unknown>, action: 'found_existing' | 'created_new'): MomenceCustomer {
    const firstName = String(customer.firstName || customer.first_name || customer.givenName || '');
    const lastName = String(customer.lastName || customer.last_name || customer.familyName || '');
    return {
      memberId: Number(customer.memberId || customer.id || 0),
      email: String(customer.email || ''),
      firstName,
      lastName,
      phoneNumber: String(customer.phoneNumber || customer.phone || ''),
      tags: customer.tags,
      action,
    };
  }

  private async searchCustomerViaApiV2(email: string, accessToken: string): Promise<MomenceCustomer | null> {
    const searchUrl = `https://api.momence.com/api/v2/customers/search?email=${encodeURIComponent(email)}`;
    const response = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Momence API v2 customer search failed:', response.status, responseText);
      return null;
    }

    const customers = JSON.parse(responseText);
    const customer = Array.isArray(customers?.data) && customers.data.length > 0 ? customers.data[0] : null;
    return customer ? this.parseApiV2Customer(customer, 'found_existing') : null;
  }

  private isApiV2CreateUnavailable(errorMessage: string): boolean {
    const normalized = String(errorMessage || '').toLowerCase();
    return normalized.includes('cannot post /api/v2/customers')
      || normalized.includes('cannot post /api/v2/host/members')
      || normalized.includes('notfoundexception')
      || normalized.includes('404');
  }

  private async createCustomerViaApiV2(input: MomenceCustomerInput, accessToken: string): Promise<MomenceCustomer> {
    const homeLocationId = this.resolveHomeLocationId(input);
    const payload = {
      email: input.email,
      firstName: input.firstName || 'Customer',
      lastName: input.lastName || '',
      phoneNumber: input.phoneNumber || '',
      homeLocationId,
    };

    const response = await fetch('https://api.momence.com/api/v2/host/members', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Customer creation failed: ${response.status} - ${responseText}`);
    }

    const newCustomer = JSON.parse(responseText);
    return {
      memberId: Number(newCustomer.memberId || newCustomer.id || 0),
      email: input.email,
      firstName: input.firstName || 'Customer',
      lastName: input.lastName || '',
      phoneNumber: input.phoneNumber || '',
      action: 'created_new',
    };
  }

  private buildHeaders(originPath: string, extra: Record<string, string> = {}): Record<string, string> {
    return {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      cookie: this.cookies,
      dnt: '1',
      origin: 'https://momence.com',
      priority: 'u=1, i',
      referer: `https://momence.com/dashboard/${this.hostId}/${originPath}`,
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'x-app': 'dashboard-3bcae6cb92a385289d4f07a1aff4c7876e4fe7cd',
      'x-origin': `https://momence.com/dashboard/${this.hostId}/${originPath}`,
      ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
      ...extra,
    };
  }

  private parseCustomer(customer: Record<string, unknown>): MomenceCustomer {
    return {
      memberId: Number(customer.memberId || customer.id || 0),
      email: String(customer.email || ''),
      firstName: String(customer.firstName || ''),
      lastName: String(customer.lastName || ''),
      phoneNumber: String(customer.phoneNumber || customer.phone || ''),
      tags: customer.tags,
    };
  }

  async findCustomerByEmail(email: string): Promise<MomenceCustomer | null> {
    try {
      const encodedEmail = encodeURIComponent(email);
      const url = `https://momence.com/_api/primary/host/${this.hostId}/customers?query=${encodedEmail}&page=0&pageSize=20`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders('crm'),
      });

      if (!response.ok) {
        console.error(`Customer lookup failed: ${response.status}`, await response.text());
        return null;
      }

      const data = await response.json();
      const payload = Array.isArray(data?.payload) ? data.payload : [];
      if (!payload.length) {
        return null;
      }

      return this.parseCustomer(payload[0]);
    } catch (error) {
      console.error('Error finding customer:', error);
      return null;
    }
  }

  private extractCreatedCustomer(data: any): MomenceCustomer | null {
    const candidates = [
      data,
      data?.payload,
      data?.customer,
      data?.payload?.customer,
      Array.isArray(data?.payload) ? data.payload[0] : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const memberId = Number(candidate.memberId || candidate.id || 0);
      if (memberId) {
        return this.parseCustomer(candidate);
      }
    }

    return null;
  }

  async createCustomer(input: MomenceCustomerInput): Promise<MomenceCustomer> {
    const payloadVariants = [
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber || '',
        homeLocationId: this.homeLocationId,
      },
      {
        customer: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneNumber: input.phoneNumber || '',
        },
        homeLocationId: this.homeLocationId,
      },
      {
        hostId: this.hostId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber || '',
        homeLocationId: this.homeLocationId,
      },
    ];

    const endpoints = [
      `https://momence.com/_api/primary/host/${this.hostId}/customers`,
      `https://momence.com/_api/primary/host/${this.hostId}/crm/customers`,
    ];

    let lastError = 'Unable to create customer in Momence.';

    for (const endpoint of endpoints) {
      for (const payload of payloadVariants) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildHeaders('crm', {
              'content-type': 'application/json',
            }),
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            lastError = `Customer creation failed at ${endpoint}: ${response.status} ${await response.text()}`;
            continue;
          }

          const data = await response.json().catch(() => ({}));
          const createdCustomer = this.extractCreatedCustomer(data);
          if (createdCustomer?.memberId) {
            return createdCustomer;
          }

          const fetchedCustomer = await this.findCustomerByEmail(input.email);
          if (fetchedCustomer?.memberId) {
            return fetchedCustomer;
          }
        } catch (error) {
          lastError = (error as Error).message;
        }
      }
    }

    throw new Error(lastError);
  }

  async ensureCustomer(input: MomenceCustomerInput): Promise<MomenceCustomer> {
    const accessToken = await this.getApiV2AccessToken();
    const existingCustomer = await this.searchCustomerViaApiV2(input.email, accessToken);
    if (existingCustomer?.memberId) {
      return existingCustomer;
    }

    const existingDashboardCustomer = await this.findCustomerByEmail(input.email);
    if (existingDashboardCustomer?.memberId) {
      return {
        ...existingDashboardCustomer,
        action: 'found_existing',
      };
    }

    let createdCustomer: MomenceCustomer | null = null;

    try {
      createdCustomer = await this.createCustomerViaApiV2(input, accessToken);
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (!this.isApiV2CreateUnavailable(errorMessage)) {
        throw error;
      }

      console.warn('Momence API v2 customer creation is unavailable, falling back to dashboard customer creation flow.');
      const fallbackCustomer = await this.createCustomer(input);
      return {
        ...fallbackCustomer,
        action: 'created_new',
      };
    }

    const hydratedCustomer = await this.findCustomerByEmail(input.email);

    if (hydratedCustomer?.memberId) {
      return {
        ...hydratedCustomer,
        action: 'created_new',
      };
    }

    return createdCustomer;
  }

  async performCheckout(memberId: number, purchase: MomenceMembershipPurchaseInput): Promise<MomenceCheckoutResult> {
    try {
      const idempotenceKey = crypto.randomUUID();
      const itemGuid = crypto.randomUUID();
      const paymentGuid = crypto.randomUUID();
      const priceInCurrency = Number.isFinite(purchase.priceInCurrency)
        ? Math.max(1, Number(purchase.priceInCurrency))
        : 1;

      const checkoutPayload = {
        hostId: this.hostId,
        payingMemberId: memberId,
        targetMemberId: memberId,
        items: [
          {
            guid: itemGuid,
            type: 'membership',
            quantity: 1,
            priceInCurrency,
            isPaymentPlanUsed: false,
            membershipId: purchase.membershipId,
            appliedPriceRuleIds: [],
          },
        ],
        paymentMethods: [
          {
            type: 'custom',
            transactionTagId: this.transactionTagId,
            weightRelative: 1,
            guid: paymentGuid,
          },
        ],
        isEmailSent: false,
        homeLocationId: this.homeLocationId,
      };

      const response = await fetch(`https://momence.com/_api/primary/host/${this.hostId}/pos/payments/pay-cart`, {
        method: 'POST',
        headers: this.buildHeaders('inbox', {
          'content-type': 'application/json',
          'x-idempotence-key': idempotenceKey,
        }),
        body: JSON.stringify(checkoutPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          error: `Checkout failed: ${response.status} ${errorData}`,
        };
      }

      const checkoutData = await response.json().catch(() => ({}));
      return {
        success: true,
        orderId: String(checkoutData.orderId || checkoutData.id || 'completed'),
        memberId,
        data: checkoutData,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async ensureCustomerAndCheckout(input: MomenceCustomerInput, purchase: MomenceMembershipPurchaseInput): Promise<MomenceCheckoutResult> {
    const customer = await this.ensureCustomer(input);
    const checkoutResult = await this.performCheckout(customer.memberId, purchase);

    return {
      ...checkoutResult,
      memberId: customer.memberId,
      customerAction: customer.action,
    };
  }
}
