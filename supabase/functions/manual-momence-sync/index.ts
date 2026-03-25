// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { MomenceAuthenticator } from "../_shared/momence-auth.ts";
import { MomenceAPIService } from "../_shared/momence-api.ts";
import { CSVParser } from "../_shared/csv-parser.ts";
import { MEMBERSHIPS_CSV } from "../_shared/memberships-data.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedAuthResult: Awaited<ReturnType<MomenceAuthenticator["authenticate"]>> | null = null;
let cachedCSVParser: CSVParser | null = null;
let lastAuthTime = 0;
const AUTH_CACHE_DURATION = 12 * 60 * 60 * 1000;

interface IncomingRequestBody {
  action?: string;
  source?: string;
  lead?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    phoneCountry?: string;
    center?: string;
    type?: string;
    time?: string;
    waiverAccepted?: string;
    event_id?: string;
    draft_id?: string;
  };
  member?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    center?: string;
  };
  membership?: {
    id?: number | string;
    name?: string;
    price?: number | string;
    priceAfterProration?: number | string;
  };
  stripe?: {
    sessionId?: string;
    paymentIntentId?: string;
    customerDetails?: {
      email?: string;
      name?: string;
      phone?: string;
    };
    metadata?: Record<string, string>;
  };
  paymentIntentId?: string;
  customerEmail?: string;
  customerName?: string;
  productName?: string;
}

interface ResolvedMembership {
  id: number;
  name: string;
}

function pickString(...values: Array<unknown>): string {
  const value = values.find((entry) => typeof entry === "string" && entry.trim());
  return typeof value === "string" ? value.trim() : "";
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) {
    return { firstName: "Customer", lastName: "" };
  }

  const [firstName = "Customer", ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function normalizeRequest(body: IncomingRequestBody) {
  const customerEmail = pickString(
    body.customerEmail,
    body.member?.email,
    body.lead?.email,
    body.stripe?.customerDetails?.email,
    body.stripe?.metadata?.email
  );
  const customerName = pickString(
    body.customerName,
    [body.member?.firstName, body.member?.lastName].filter(Boolean).join(" "),
    [body.lead?.firstName, body.lead?.lastName].filter(Boolean).join(" "),
    body.stripe?.customerDetails?.name,
    [body.stripe?.metadata?.first_name, body.stripe?.metadata?.last_name].filter(Boolean).join(" ")
  );
  const productName = pickString(
    body.productName,
    body.membership?.name,
    body.stripe?.metadata?.product_name
  );
  const paymentIntentId = pickString(body.paymentIntentId, body.stripe?.paymentIntentId);
  const membershipId = Number(body.membership?.id || 0) || null;
  const membershipPrice = Number(body.membership?.priceAfterProration || body.membership?.price || 0) || null;
  const phoneNumber = pickString(body.member?.phoneNumber, body.lead?.phoneNumber, body.stripe?.customerDetails?.phone);
  const center = pickString(body.member?.center, body.lead?.center, body.stripe?.metadata?.center);
  const nameParts = splitName(customerName);

  return {
    customerEmail,
    customerName,
    productName,
    paymentIntentId,
    membershipId,
    membershipPrice,
    phoneNumber,
    center,
    firstName: pickString(body.member?.firstName, body.lead?.firstName, nameParts.firstName),
    lastName: pickString(body.member?.lastName, body.lead?.lastName, nameParts.lastName),
  };
}

function resolveMembership(csvParser: CSVParser, normalized: ReturnType<typeof normalizeRequest>): ResolvedMembership | null {
  if (normalized.membershipId) {
    const matchedMembership = csvParser.getAllMemberships().find((entry) => Number(entry.id) === normalized.membershipId);
    if (matchedMembership) {
      return {
        id: Number(matchedMembership.id),
        name: String(matchedMembership.name || normalized.productName || `Membership ${normalized.membershipId}`),
      };
    }

    return {
      id: normalized.membershipId,
      name: normalized.productName || `Membership ${normalized.membershipId}`,
    };
  }

  const matchedMembership = csvParser.findMembershipByName(normalized.productName)
    || csvParser.findMembershipByPartialName(normalized.productName);

  if (!matchedMembership) {
    return null;
  }

  return {
    id: Number(matchedMembership.id),
    name: String(matchedMembership.name || normalized.productName || ''),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as IncomingRequestBody;
    const normalized = normalizeRequest(body);

    console.log("📋 Manual Momence sync triggered", normalized);

    if (!normalized.customerEmail) {
      throw new Error("Missing customer email");
    }

    if (!normalized.productName && !normalized.membershipId) {
      throw new Error("Missing membership/product information");
    }

    const authResult = await getAuthentication();
    if (!authResult.success || !authResult.cookies) {
      throw new Error(authResult.error || "Failed to authenticate with Momence");
    }

    const csvParser = await getCSVParser();
    const membership = resolveMembership(csvParser, normalized);

    if (!membership) {
      throw new Error(`Could not find membership for product: ${normalized.productName || normalized.membershipId}`);
    }

    const momenceAPI = new MomenceAPIService(authResult.cookies, authResult.accessToken);
    const result = await momenceAPI.ensureCustomerAndCheckout(
      {
        email: normalized.customerEmail,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        phoneNumber: normalized.phoneNumber,
        center: normalized.center,
      },
      {
        membershipId: Number(membership.id),
        productName: membership.name,
        priceInCurrency: normalized.membershipPrice ?? undefined,
      }
    );

    if (!result.success) {
      throw new Error(`Momence checkout failed: ${result.error}`);
    }

    if (normalized.paymentIntentId) {
      await updatePaymentIntentMetadata(normalized.paymentIntentId, {
        momence_booking_id: result.orderId || "completed",
        momence_synced: "true",
        momence_sync_status: "completed",
        momence_membership_id: membership.id,
        momence_membership_name: membership.name,
        momence_member_id: String(result.memberId || ""),
        momence_customer_action: String(result.customerAction || "found_existing"),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: result.customerAction || "found_existing",
        memberId: result.memberId,
        purchaseId: result.orderId,
        membershipId: membership.id,
        membershipName: membership.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Manual sync failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getAuthentication() {
  const now = Date.now();

  if (cachedAuthResult && cachedAuthResult.success && now - lastAuthTime < AUTH_CACHE_DURATION) {
    return cachedAuthResult;
  }

  const authenticator = new MomenceAuthenticator();
  const authResult = await authenticator.authenticate();
  if (authResult.success) {
    cachedAuthResult = authResult;
    lastAuthTime = now;
  }

  return authResult;
}

async function getCSVParser() {
  if (cachedCSVParser) {
    return cachedCSVParser;
  }

  const parser = new CSVParser();
  parser.parseCSV(MEMBERSHIPS_CSV);
  cachedCSVParser = parser;
  return parser;
}

async function updatePaymentIntentMetadata(paymentIntentId: string, metadata: Record<string, string>) {
  const stripeSecretKey = String(Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key not configured");
  }

  const formData = new URLSearchParams();
  Object.entries(metadata).forEach(([key, value]) => {
    formData.append(`metadata[${key}]`, value);
  });

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to update payment intent metadata: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
