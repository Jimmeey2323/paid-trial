declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

export interface MomenceAuthConfig {
  LOGIN_URL: string;
  MFA_URL: string;
  SECRET_KEY: string;
  EMAIL: string;
  PASSWORD: string;
  TIMEOUT: number;
  CACHE_DURATION: number;
}

export interface MomenceAuthResult {
  success: boolean;
  accessToken?: string;
  cookies?: string;
  deviceId?: string;
  sessionId?: string;
  user?: unknown;
  error?: string;
  timestamp?: number;
}

export class MomenceAuthenticator {
  private config: MomenceAuthConfig;

  constructor() {
    const secretKey = String(Deno.env.get('MOMENCE_TOTP_SECRET') || '').trim();
    const email = String(Deno.env.get('MOMENCE_LOGIN_EMAIL') || '').trim();
    const password = String(Deno.env.get('MOMENCE_LOGIN_PASSWORD') || '').trim();

    this.config = {
      LOGIN_URL: 'https://api.momence.com/auth/login',
      MFA_URL: 'https://api.momence.com/auth/mfa/totp/verify',
      SECRET_KEY: secretKey,
      EMAIL: email,
      PASSWORD: password,
      TIMEOUT: 30000,
      CACHE_DURATION: 12 * 60 * 60 * 1000,
    };
  }

  private assertConfigured() {
    if (!this.config.EMAIL || !this.config.PASSWORD || !this.config.SECRET_KEY) {
      throw new Error('Momence auth secrets are missing. Set MOMENCE_LOGIN_EMAIL, MOMENCE_LOGIN_PASSWORD, and MOMENCE_TOTP_SECRET.');
    }
  }

  private async generateOTP(): Promise<string> {
    const secret = this.config.SECRET_KEY;
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epoch / timeStep);
    const key = this.base32Decode(secret);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(counter), false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new Uint8Array(buffer));
    const hmac = new Uint8Array(signature);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff)
    );

    return (code % 1000000).toString().padStart(6, '0');
  }

  private base32Decode(encoded: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanedInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let index = 0; index < cleanedInput.length; index += 1) {
      const alphabetIndex = alphabet.indexOf(cleanedInput[index]);
      if (alphabetIndex === -1) {
        continue;
      }

      value = (value << 5) | alphabetIndex;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  private async performLogin(): Promise<{ response: Response; cookies: string[] }> {
    const loginPayload = {
      email: this.config.EMAIL,
      password: this.config.PASSWORD,
      deviceData: {
        browser: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        screen: { width: 1470, height: 956 },
      },
    };

    const response = await fetch(this.config.LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': loginPayload.deviceData.browser,
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(loginPayload),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    return {
      response,
      cookies: response.headers.get('set-cookie')?.split(', ') || [],
    };
  }

  private async performMFA(loginCookies: string[]): Promise<{ response: Response; cookies: string[] }> {
    const otp = await this.generateOTP();
    const browser = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0';
    const mfaPayload = {
      token: otp,
      deviceData: {
        browser,
        screen: { width: 1470, height: 956 },
      },
      trustDevice: true,
    };

    const cookieHeader = loginCookies.map((cookie) => cookie.split(';')[0]).join('; ');
    const response = await fetch(this.config.MFA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'User-Agent': browser,
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(mfaPayload),
    });

    if (!response.ok) {
      throw new Error(`MFA failed: ${response.status} ${response.statusText}`);
    }

    return {
      response,
      cookies: response.headers.get('set-cookie')?.split(', ') || [],
    };
  }

  private formatCookies(loginCookies: string[], mfaCookies: string[]): string {
    const allCookies = [...loginCookies, ...mfaCookies];
    const cookieMap = new Map<string, string>();

    allCookies.forEach((cookie) => {
      const parts = cookie.split(';');
      const [name] = parts[0].split('=');
      if (name) {
        cookieMap.set(name.trim(), parts[0]);
      }
    });

    return Array.from(cookieMap.values()).join('; ');
  }

  private extractCookieValue(cookies: string[], cookieName: string): string {
    for (const cookie of cookies) {
      if (cookie.includes(`${cookieName}=`)) {
        const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
        return match ? decodeURIComponent(match[1]) : '';
      }
    }

    return '';
  }

  async authenticate(): Promise<MomenceAuthResult> {
    try {
      this.assertConfigured();
      console.log('🚀 Starting Momence authentication...');
      const { cookies: loginCookies } = await this.performLogin();
      const { response: mfaResponse, cookies: mfaCookies } = await this.performMFA(loginCookies);
      const mfaData = await mfaResponse.json();
      const allCookies = this.formatCookies(loginCookies, mfaCookies);

      return {
        success: true,
        accessToken: mfaData.access_token,
        cookies: allCookies,
        deviceId: this.extractCookieValue([...loginCookies, ...mfaCookies], 'momence.device.id'),
        sessionId: this.extractCookieValue([...loginCookies, ...mfaCookies], 'ribbon.connect.sid'),
        user: mfaData.user,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
