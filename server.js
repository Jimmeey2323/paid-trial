const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const portfinder = require('portfinder');
const GoogleSheetsService = require('./googleSheets');
const SupabaseLeadStore = require('./supabaseService');
const ScheduleService = require('./scheduleService');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    console.log('dotenv not installed; using system environment variables');
  }
}

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;
const INDEX_TEMPLATE_PATH = path.join(__dirname, 'index.html');
const INDEX_TEMPLATE = fs.readFileSync(INDEX_TEMPLATE_PATH, 'utf8');
const googleSheets = new GoogleSheetsService();
const supabaseLeadStore = new SupabaseLeadStore();
const scheduleService = new ScheduleService();
const STATIC_DIRECTORY_ROUTES = [
  ['/styles', path.join(__dirname, 'styles')],
  ['/scripts', path.join(__dirname, 'scripts')],
  ['/assets', path.join(__dirname, 'assets')]
];

const STUDIO_CLASS_OPTIONS = {
  'Supreme Headquarters, Bandra': ['powerCycle'],
  'Kwality House, Kemps Corner': ['powerCycle', 'Strength Lab']
};

const ALLOWED_TIME_WINDOWS = [
  'Early Morning (6 AM - 9 AM)',
  'Mid-Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
  'Flexible / Needs Recommendation'
];

const TRACKING_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_id',
  'utm_term',
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'gbraid',
  'wbraid',
  'fbp',
  'fbc'
];

const URL_FIELDS = ['landing_page', 'referrer'];
const PARTIAL_FIELDS = ['draft_id', 'phoneCountry', 'session_id', 'status'];
const JSON_BODY_LIMIT = '32kb';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const rateLimitStore = new Map();

const DEFAULT_STRIPE_CHECKOUT_CONFIG = {
  amount: 183800,
  currency: 'inr',
  productName: 'Physique 57 trial booking fee',
  productDescription: 'Secure your paid trial and onboarding flow.',
  paymentMethodTypes: ['card'],
  allowPromotionCodes: true,
  billingAddressCollection: 'required',
  phoneNumberCollection: true,
  taxIdCollection: false,
  automaticTax: false,
  invoiceCreation: false,
  submitType: 'pay',
  shippingCountries: [],
  customFields: [],
  customText: {},
  consentCollection: null,
  metadata: {},
  buttonLabel: 'Pay ₹1,838',
  successUrl: '/?payment=success&session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: '/?payment=cancelled'
};

const DEFAULT_MOMENCE_MEMBERSHIP = {
  id: 240932,
  hostId: 13752,
  taxBracketId: 36758,
  type: 'package-events',
  subscriptionType: 'absolute',
  name: 'Newcomers 2 For 1',
  price: 1750,
  currency: 'inr',
  duration: 14,
  durationUnit: 'days',
  activateOnFirstUse: true,
  numberOfEvents: 2,
  isIntroOffer: true,
  isSingleBuy: true,
  priceAfterProration: 1750,
  description: 'Physique 57 Newcomers 2 For 1 package.'
};

const DEFAULT_PAYMENT_STAGE = 'production';
const DEFAULT_PAYMENT_STAGE_CONFIGS = {
  production: {
    label: 'Production',
    description: 'Production mode charges ₹1,838 and triggers the live Momence membership purchase after payment.',
    checkout: {},
    membership: {}
  },
  testing: {
    label: 'Testing',
    description: 'Testing mode charges ₹1 and triggers the Momence test membership purchase after payment.',
    checkout: {
      amount: 100,
      productName: 'Physique 57 trial test payment',
      productDescription: 'Testing checkout flow for the paid trial experience.',
      buttonLabel: 'Pay ₹1'
    },
    membership: {
      id: 675444,
      name: 'Test',
      price: 1,
      priceAfterProration: 1,
      currency: 'inr',
      description: 'Momence test membership purchase used for checkout validation.'
    }
  }
};

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Stripe checkout endpoints (optional - requires STRIPE_SECRET_KEY in environment)
let stripeClient = null;
const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
if (stripeSecretKey) {
  try {
    const Stripe = require('stripe');
    stripeClient = Stripe(stripeSecretKey);
  } catch (err) {
    console.error('Stripe module not available or failed to initialize:', err && err.message);
    stripeClient = null;
  }
}

function serializeForInlineScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function escapeHtmlAttribute(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sendStaticFile(res, rootDirectory, relativeFilePath) {
  const normalizedRoot = path.resolve(rootDirectory);
  const sanitizedRelativePath = String(relativeFilePath || '').replace(/^\/+/, '');
  const resolvedPath = path.resolve(normalizedRoot, sanitizedRelativePath);

  if (!sanitizedRelativePath) {
    return res.status(404).send('Not found');
  }

  if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    return res.status(404).send('Not found');
  }

  return res.sendFile(resolvedPath, (error) => {
    if (!error || res.headersSent) {
      return;
    }

    if (error.code === 'ENOENT') {
      res.status(404).send('Not found');
      return;
    }

    res.status(error.statusCode || 500).send('Unable to load resource');
  });
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJson(value, fallback) {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  try {
    return JSON.parse(String(value));
  } catch (error) {
    console.error('Invalid JSON configuration detected:', error.message);
    return fallback;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return Array.isArray(overrideValue) ? [...overrideValue] : [...(baseValue || [])];
  }

  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return overrideValue === undefined ? baseValue : overrideValue;
  }

  const merged = { ...baseValue };
  Object.keys(overrideValue).forEach((key) => {
    merged[key] = deepMerge(baseValue[key], overrideValue[key]);
  });
  return merged;
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((entry) => entry !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result = {};
  Object.entries(value).forEach(([key, entry]) => {
    const cleaned = stripUndefined(entry);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  });

  return result;
}

function getRequestOrigin(req) {
  const configuredOrigin = String(process.env.FORM_API_BASE_URL || '').trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${protocol}://${host}`.replace(/\/$/, '');
}

function resolveUrl(value, origin, fallbackPath) {
  const target = String(value || fallbackPath || '').trim();
  if (!target) {
    return origin;
  }

  try {
    return new URL(target, `${origin}/`).toString();
  } catch (error) {
    return new URL(fallbackPath || '/', `${origin}/`).toString();
  }
}

function formatMoney(amountMinor, currency = 'INR') {
  const normalizedCurrency = String(currency || 'INR').toUpperCase();
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2
  }).format((Number(amountMinor) || 0) / 100);
}

function normalizePaymentStage(value, fallback = process.env.DEFAULT_PAYMENT_STAGE || DEFAULT_PAYMENT_STAGE) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const fallbackValue = String(fallback || DEFAULT_PAYMENT_STAGE).trim().toLowerCase();

  if (normalizedValue === 'testing') {
    return 'testing';
  }

  if (normalizedValue === 'production') {
    return 'production';
  }

  return fallbackValue === 'testing' ? 'testing' : DEFAULT_PAYMENT_STAGE;
}

function getPaymentStageConfigs() {
  const configuredStages = parseJson(process.env.PAYMENT_STAGE_CONFIG_JSON, {});
  return deepMerge(DEFAULT_PAYMENT_STAGE_CONFIGS, configuredStages);
}

function getPaymentStageConfig(stageName) {
  const stages = getPaymentStageConfigs();
  const normalizedStage = normalizePaymentStage(stageName);
  return stages[normalizedStage] || stages[DEFAULT_PAYMENT_STAGE] || DEFAULT_PAYMENT_STAGE_CONFIGS.production;
}

function getStripeCheckoutConfig(req, stageName = normalizePaymentStage()) {
  const envConfig = parseJson(process.env.STRIPE_CHECKOUT_CONFIG_JSON, {});
  const origin = getRequestOrigin(req);
  const merged = deepMerge(DEFAULT_STRIPE_CHECKOUT_CONFIG, envConfig);
  const configuredBase = {
    ...merged,
    amount: parseInteger(process.env.STRIPE_CHECKOUT_AMOUNT, merged.amount),
    currency: String(process.env.STRIPE_CHECKOUT_CURRENCY || merged.currency || 'inr').trim().toLowerCase(),
    productName: String(process.env.STRIPE_CHECKOUT_PRODUCT_NAME || merged.productName || '').trim() || DEFAULT_STRIPE_CHECKOUT_CONFIG.productName,
    productDescription: String(process.env.STRIPE_CHECKOUT_PRODUCT_DESCRIPTION || merged.productDescription || '').trim(),
    paymentMethodTypes: parseList(process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES, merged.paymentMethodTypes || ['card']),
    allowPromotionCodes: parseBoolean(process.env.STRIPE_CHECKOUT_ALLOW_PROMO_CODES, merged.allowPromotionCodes),
    billingAddressCollection: String(process.env.STRIPE_CHECKOUT_BILLING_ADDRESS_COLLECTION || merged.billingAddressCollection || 'required').trim(),
    phoneNumberCollection: parseBoolean(process.env.STRIPE_CHECKOUT_PHONE_NUMBER_COLLECTION, merged.phoneNumberCollection),
    taxIdCollection: parseBoolean(process.env.STRIPE_CHECKOUT_TAX_ID_COLLECTION, merged.taxIdCollection),
    automaticTax: parseBoolean(process.env.STRIPE_CHECKOUT_AUTOMATIC_TAX, merged.automaticTax),
    invoiceCreation: parseBoolean(process.env.STRIPE_CHECKOUT_INVOICE_CREATION, merged.invoiceCreation),
    submitType: String(process.env.STRIPE_CHECKOUT_SUBMIT_TYPE || merged.submitType || 'pay').trim(),
    shippingCountries: parseList(process.env.STRIPE_CHECKOUT_SHIPPING_COUNTRIES, merged.shippingCountries || []),
    customFields: parseJson(process.env.STRIPE_CHECKOUT_CUSTOM_FIELDS_JSON, merged.customFields || []),
    customText: parseJson(process.env.STRIPE_CHECKOUT_CUSTOM_TEXT_JSON, merged.customText || {}),
    consentCollection: parseJson(process.env.STRIPE_CHECKOUT_CONSENT_COLLECTION_JSON, merged.consentCollection),
    metadata: parseJson(process.env.STRIPE_CHECKOUT_METADATA_JSON, merged.metadata || {}),
    buttonLabel: String(process.env.STRIPE_CHECKOUT_BUTTON_LABEL || merged.buttonLabel || '').trim() || `Pay ${formatMoney(parseInteger(process.env.STRIPE_CHECKOUT_AMOUNT, merged.amount), String(process.env.STRIPE_CHECKOUT_CURRENCY || merged.currency || 'inr').trim().toLowerCase())}`,
    successUrl: resolveUrl(process.env.STRIPE_CHECKOUT_SUCCESS_URL || merged.successUrl, origin, '/?payment=success&session_id={CHECKOUT_SESSION_ID}'),
    cancelUrl: resolveUrl(process.env.STRIPE_CHECKOUT_CANCEL_URL || merged.cancelUrl, origin, '/?payment=cancelled')
  };
  const stageConfig = getPaymentStageConfig(stageName);
  const stageCheckoutConfig = deepMerge(configuredBase, stageConfig.checkout || {});

  const amount = parseInteger(stageCheckoutConfig.amount, configuredBase.amount);
  const currency = String(stageCheckoutConfig.currency || configuredBase.currency || 'inr').trim().toLowerCase();
  const config = {
    ...stageCheckoutConfig,
    amount,
    currency,
    productName: String(stageCheckoutConfig.productName || '').trim() || DEFAULT_STRIPE_CHECKOUT_CONFIG.productName,
    productDescription: String(stageCheckoutConfig.productDescription || '').trim(),
    paymentMethodTypes: Array.isArray(stageCheckoutConfig.paymentMethodTypes) && stageCheckoutConfig.paymentMethodTypes.length
      ? stageCheckoutConfig.paymentMethodTypes
      : ['card'],
    allowPromotionCodes: Boolean(stageCheckoutConfig.allowPromotionCodes),
    billingAddressCollection: String(stageCheckoutConfig.billingAddressCollection || 'required').trim(),
    phoneNumberCollection: Boolean(stageCheckoutConfig.phoneNumberCollection),
    taxIdCollection: Boolean(stageCheckoutConfig.taxIdCollection),
    automaticTax: Boolean(stageCheckoutConfig.automaticTax),
    invoiceCreation: Boolean(stageCheckoutConfig.invoiceCreation),
    submitType: String(stageCheckoutConfig.submitType || 'pay').trim(),
    shippingCountries: Array.isArray(stageCheckoutConfig.shippingCountries) ? stageCheckoutConfig.shippingCountries : [],
    customFields: Array.isArray(stageCheckoutConfig.customFields) ? stageCheckoutConfig.customFields : [],
    customText: isPlainObject(stageCheckoutConfig.customText) ? stageCheckoutConfig.customText : {},
    consentCollection: stageCheckoutConfig.consentCollection || null,
    metadata: isPlainObject(stageCheckoutConfig.metadata) ? stageCheckoutConfig.metadata : {},
    buttonLabel: String(stageCheckoutConfig.buttonLabel || '').trim() || `Pay ${formatMoney(amount, currency)}`,
    successUrl: resolveUrl(stageCheckoutConfig.successUrl, origin, '/?payment=success&session_id={CHECKOUT_SESSION_ID}'),
    cancelUrl: resolveUrl(stageCheckoutConfig.cancelUrl, origin, '/?payment=cancelled')
  };

  return config;
}

function getMomencePostPaymentConfig(stageName = normalizePaymentStage()) {
  const baseMembership = deepMerge(DEFAULT_MOMENCE_MEMBERSHIP, parseJson(process.env.MOMENCE_MEMBERSHIP_JSON, {}));
  const stageConfig = getPaymentStageConfig(stageName);
  const membership = deepMerge(baseMembership, stageConfig.membership || {});
  const explicitUrl = String(process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_URL || '').trim();
  const supabaseBase = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const functionUrl = explicitUrl || (supabaseBase ? `${supabaseBase}/functions/v1/manual-momence-sync` : '');
  const functionKey = String(
    process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_MOMENCE_SESSIONS_KEY
    || ''
  ).trim();

  return {
    mode: String(process.env.MOMENCE_POST_PAYMENT_MODE || (functionUrl ? 'supabase-function' : 'disabled')).trim(),
    functionUrl,
    functionKey,
    action: String(process.env.SUPABASE_MOMENCE_PAYMENT_SYNC_ACTION || 'create-member-and-purchase-membership').trim(),
    membership
  };
}

function buildStripeMetadata(leadPayload, checkoutConfig) {
  return {
    source: 'paid-trial-form',
    payment_stage: String(leadPayload.stage || normalizePaymentStage()),
    event_id: String(leadPayload.event_id || ''),
    draft_id: String(leadPayload.draft_id || ''),
    first_name: String(leadPayload.firstName || ''),
    last_name: String(leadPayload.lastName || ''),
    email: String(leadPayload.email || ''),
    phone_number: String(leadPayload.phoneNumber || ''),
    phone_country: String(leadPayload.phoneCountry || ''),
    center: String(leadPayload.center || ''),
    type: String(leadPayload.type || ''),
    time: String(leadPayload.time || ''),
    product_name: String(checkoutConfig.productName || ''),
    waiver_accepted: String(leadPayload.waiverAccepted || ''),
    ...Object.fromEntries(Object.entries(checkoutConfig.metadata || {}).map(([key, value]) => [key, String(value)]))
  };
}

function isPaidStripeSession(session) {
  return Boolean(session) && (
    session.payment_status === 'paid'
    || session.status === 'complete'
    || session.payment_intent?.status === 'succeeded'
  );
}

function buildLeadPayloadFromCheckoutSession(session) {
  const metadata = session?.metadata || {};
  const customerDetails = session?.customer_details || {};
  const fullName = String(customerDetails.name || '').trim();
  const [derivedFirstName = '', ...restName] = fullName.split(' ');

  return {
    firstName: metadata.first_name || derivedFirstName,
    lastName: metadata.last_name || restName.join(' '),
    email: metadata.email || customerDetails.email || '',
    phoneNumber: metadata.phone_number || customerDetails.phone || '',
    phoneCountry: metadata.phone_country || 'IN',
    center: metadata.center || '',
    type: metadata.type || '',
    time: metadata.time || '',
    stage: metadata.payment_stage || normalizePaymentStage(),
    waiverAccepted: metadata.waiver_accepted || 'accepted',
    event_id: metadata.event_id || '',
    draft_id: metadata.draft_id || '',
    payment_session_id: session?.id || ''
  };
}

async function updateCheckoutSessionMetadata(sessionId, metadataPatch = {}) {
  if (!stripeClient || !sessionId || !Object.keys(metadataPatch).length) {
    return null;
  }

  try {
    return await stripeClient.checkout.sessions.update(sessionId, {
      metadata: Object.fromEntries(Object.entries(metadataPatch).map(([key, value]) => [key, String(value)]))
    });
  } catch (error) {
    console.error('Unable to update Stripe checkout session metadata:', error.message);
    return null;
  }
}

async function fulfillMomencePurchaseFromSession(session) {
  const paymentStage = normalizePaymentStage(session?.metadata?.payment_stage);
  const paymentConfig = getMomencePostPaymentConfig(paymentStage);
  const existingStatus = String(session?.metadata?.momence_fulfillment_status || '').trim().toLowerCase();

  if (existingStatus === 'success') {
    return {
      success: true,
      memberId: session.metadata.momence_member_id || '',
      purchaseId: session.metadata.momence_purchase_id || '',
      source: 'stripe-metadata'
    };
  }

  if (paymentConfig.mode !== 'supabase-function' || !paymentConfig.functionUrl || !paymentConfig.functionKey) {
    throw new Error('Post-payment Momence sync is not configured. Set the Supabase Momence payment sync function URL and key.');
  }

  const leadData = buildLeadPayloadFromCheckoutSession(session);
  const payload = {
    action: paymentConfig.action,
    source: 'paid-trial-form',
    lead: leadData,
    member: {
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phoneNumber: leadData.phoneNumber,
      phoneCountry: leadData.phoneCountry,
      waiverAccepted: leadData.waiverAccepted,
      center: leadData.center,
      type: leadData.type,
      time: leadData.time
    },
    membership: paymentConfig.membership,
    stripe: {
      sessionId: session.id,
      paymentIntentId: session.payment_intent?.id || session.payment_intent || '',
      paymentStatus: session.payment_status || '',
      amountTotal: session.amount_total,
      currency: session.currency,
      customerDetails: session.customer_details || {},
      metadata: session.metadata || {}
    }
  };

  const response = await fetch(paymentConfig.functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${paymentConfig.functionKey}`,
      apikey: paymentConfig.functionKey
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    const failureMessage = result.error || result.message || `Supabase Momence sync failed with ${response.status}`;
    await updateCheckoutSessionMetadata(session.id, {
      momence_fulfillment_status: 'failed',
      momence_fulfillment_error: failureMessage.slice(0, 400)
    });
    throw new Error(failureMessage);
  }

  const normalizedResult = {
    success: true,
    memberId: result.memberId || result.customerId || result.member?.id || '',
    purchaseId: result.purchaseId || result.orderId || result.membershipPurchaseId || '',
    stage: paymentStage,
    raw: result
  };

  await updateCheckoutSessionMetadata(session.id, {
    momence_fulfillment_status: 'success',
    momence_member_id: normalizedResult.memberId || '',
    momence_purchase_id: normalizedResult.purchaseId || ''
  });

  return normalizedResult;
}

async function retrieveAndValidatePaidSession(sessionId) {
  if (!stripeClient) {
    throw new Error('Payments are not configured on this server.');
  }

  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    throw new Error('Missing payment session identifier.');
  }

  const session = await stripeClient.checkout.sessions.retrieve(normalizedSessionId, {
    expand: ['payment_intent']
  });

  if (!isPaidStripeSession(session)) {
    throw new Error('Payment has not been completed yet.');
  }

  const fulfillment = await fulfillMomencePurchaseFromSession(session);
  return { session, fulfillment };
}

app.get(['/styles/*', '/scripts/*', '/assets/*'], (req, res, next) => {
  const staticRoute = STATIC_DIRECTORY_ROUTES.find(([routePrefix]) => req.path.startsWith(`${routePrefix}/`));

  if (!staticRoute) {
    return next();
  }

  const [routePrefix, rootDirectory] = staticRoute;
  const relativeFilePath = req.path.slice(routePrefix.length);

  return sendStaticFile(res, rootDirectory, relativeFilePath);
});

function getPublicClientConfig() {
  const mockRequest = {
    get: () => '',
    protocol: 'https'
  };
  const defaultPaymentStage = normalizePaymentStage();
  const checkoutConfig = getStripeCheckoutConfig(mockRequest, defaultPaymentStage);
  const paymentStages = ['production', 'testing'].reduce((result, stageName) => {
    const stageCheckoutConfig = getStripeCheckoutConfig(mockRequest, stageName);
    const stageConfig = getPaymentStageConfig(stageName);
    const stageMembership = getMomencePostPaymentConfig(stageName).membership;

    result[stageName] = {
      label: String(stageConfig.label || (stageName === 'testing' ? 'Testing' : 'Production')),
      amountDisplay: formatMoney(stageCheckoutConfig.amount, stageCheckoutConfig.currency),
      buttonLabel: stageCheckoutConfig.buttonLabel,
      description: String(stageConfig.description || ''),
      membershipName: String(stageMembership.name || ''),
      membershipId: Number(stageMembership.id || 0) || ''
    };

    return result;
  }, {});

  return {
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
    googleAdsId: process.env.GOOGLE_ADS_ID || '',
    googleAdsConversionLabel: process.env.GOOGLE_ADS_CONVERSION_LABEL || '',
    googleAdsConversionValue: process.env.GOOGLE_ADS_CONVERSION_VALUE || '',
    googleAdsConversionCurrency: process.env.GOOGLE_ADS_CONVERSION_CURRENCY || 'INR',
    metaPixelId: process.env.META_PIXEL_ID || '',
    snapPixelId: process.env.SNAP_PIXEL_ID || '',
    apiBaseUrl: process.env.FORM_API_BASE_URL || '',
    scheduleUrl: process.env.FORM_SCHEDULE_URL || process.env.FORM_REDIRECT_URL || 'https://momence.com/u/physique-57-india-fffoSp',
    redirectUrl: process.env.FORM_REDIRECT_URL || 'https://momence.com/u/physique-57-india-fffoSp',
    defaultPaymentStage,
    paymentStages,
    paymentButtonLabel: checkoutConfig.buttonLabel,
    paymentAmountDisplay: formatMoney(checkoutConfig.amount, checkoutConfig.currency),
    paymentCurrency: String(checkoutConfig.currency || 'inr').toUpperCase()
  };
}

function renderIndexHtml() {
  const publicConfig = serializeForInlineScript(getPublicClientConfig());
  const gtmId = process.env.GTM_ID || '';
  const gtmNoscript = gtmId
    ? `<noscript>\n        <iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtmlAttribute(gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe>\n    </noscript>`
    : '';

  return INDEX_TEMPLATE
    .replace('<script id="app-config-data" type="application/json">{}</script>', `<script id="app-config-data" type="application/json">${publicConfig}</script>`)
    .replace('<!-- __GTM_NOSCRIPT__ -->', gtmNoscript);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

function sanitizeText(value, maxLength = 255) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(value) {
  return sanitizeText(value, 254).toLowerCase();
}

function sanitizePhone(value) {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

function sanitizeTrackingValue(value) {
  return sanitizeText(value, 255);
}

function sanitizeUrl(value) {
  const rawValue = sanitizeText(value, 2048);

  if (!rawValue) {
    return '';
  }

  try {
    const parsed = new URL(rawValue);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch (error) {
    return '';
  }
}

function generateLeadId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateEventId(value) {
  const sanitized = sanitizeText(value, 120);
  return /^[A-Za-z0-9_-]{8,120}$/.test(sanitized) ? sanitized : `lead_${generateLeadId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}

function isTruthyConsent(value) {
  return ['accepted', 'true', '1', 'on', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function validateLeadPayload(payload) {
  const fieldErrors = {};

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      fieldErrors: {
        form: 'Invalid request body.'
      }
    };
  }

  if (sanitizeText(payload.company, 255)) {
    return {
      isValid: false,
      isBot: true,
      fieldErrors: {}
    };
  }

  const firstName = sanitizeText(payload.firstName, 80);
  if (!firstName) {
    fieldErrors.firstName = 'First name is required.';
  }

  const lastName = sanitizeText(payload.lastName, 80);
  if (!lastName) {
    fieldErrors.lastName = 'Last name is required.';
  }

  const email = sanitizeEmail(payload.email);
  if (!email) {
    fieldErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  const phoneNumber = sanitizePhone(payload.phoneNumber);
  const phoneDigits = normalizePhone(phoneNumber);
  if (!phoneNumber) {
    fieldErrors.phoneNumber = 'Phone number is required.';
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    fieldErrors.phoneNumber = 'Enter a valid phone number including country code.';
  }

  const time = sanitizeText(payload.time, 80);
  if (!ALLOWED_TIME_WINDOWS.includes(time)) {
    fieldErrors.time = 'Choose an available time window.';
  }

  const center = sanitizeText(payload.center, 120);
  if (!Object.prototype.hasOwnProperty.call(STUDIO_CLASS_OPTIONS, center)) {
    fieldErrors.center = 'Choose a valid studio location.';
  }

  const type = sanitizeText(payload.type, 80);
  if (!type) {
    fieldErrors.type = 'Choose a class format.';
  } else if (center && Array.isArray(STUDIO_CLASS_OPTIONS[center]) && !STUDIO_CLASS_OPTIONS[center].includes(type)) {
    fieldErrors.type = 'Choose a class format available at that studio.';
  }

  if (!isTruthyConsent(payload.waiverAccepted)) {
    fieldErrors.waiverAccepted = 'You must accept the waiver before submitting.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      isValid: false,
      fieldErrors
    };
  }

  const sanitizedPayload = {
    firstName,
    lastName,
    email,
    phoneNumber,
    phoneCountry: sanitizeText(payload.phoneCountry, 4).toUpperCase(),
    time,
    center,
    type,
    waiverAccepted: 'accepted',
    event_id: getOrCreateEventId(payload.event_id),
    draft_id: sanitizeText(payload.draft_id || payload.draftId, 120),
    session_id: sanitizeText(payload.session_id || payload.sessionId, 120),
    payment_session_id: sanitizeText(payload.payment_session_id || payload.paymentSessionId, 120)
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeTrackingValue(payload[fieldName]);
  });

  URL_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeUrl(payload[fieldName]);
  });

  return {
    isValid: true,
    fieldErrors: {},
    data: sanitizedPayload
  };
}

function sanitizePartialLeadPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const sanitizedPayload = {
    draft_id: sanitizeText(payload.draft_id || payload.draftId, 120),
    event_id: getOrCreateEventId(payload.event_id || payload.eventId || generateLeadId()),
    status: sanitizeText(payload.status || 'in_progress', 40) || 'in_progress',
    session_id: sanitizeText(payload.session_id || payload.sessionId, 120),
    phoneCountry: sanitizeText(payload.phoneCountry, 4).toUpperCase(),
    firstName: sanitizeText(payload.firstName, 80),
    lastName: sanitizeText(payload.lastName, 80),
    email: sanitizeEmail(payload.email),
    phoneNumber: sanitizePhone(payload.phoneNumber),
    time: sanitizeText(payload.time, 80),
    center: sanitizeText(payload.center, 120),
    type: sanitizeText(payload.type, 80),
    waiverAccepted: isTruthyConsent(payload.waiverAccepted) ? 'accepted' : '',
    company: sanitizeText(payload.company, 255)
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeTrackingValue(payload[fieldName]);
  });

  URL_FIELDS.forEach((fieldName) => {
    sanitizedPayload[fieldName] = sanitizeUrl(payload[fieldName]);
  });

  const hasMeaningfulData = [
    sanitizedPayload.firstName,
    sanitizedPayload.lastName,
    sanitizedPayload.email,
    sanitizedPayload.phoneNumber,
    sanitizedPayload.center,
    sanitizedPayload.type,
    sanitizedPayload.time,
    sanitizedPayload.waiverAccepted,
    ...TRACKING_FIELDS.map((fieldName) => sanitizedPayload[fieldName])
  ].some((value) => Boolean(String(value || '').trim()));

  if (!sanitizedPayload.draft_id || sanitizedPayload.company || !hasMeaningfulData) {
    return null;
  }

  return sanitizedPayload;
}

function applySubmissionRateLimit(req, res, next) {
  const now = Date.now();
  const clientIp = getClientIp(req) || 'unknown';
  const currentEntry = rateLimitStore.get(clientIp);

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return next();
  }

  if (currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((currentEntry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: 'Too many submission attempts. Please wait a few minutes and try again.'
    });
  }

  currentEntry.count += 1;
  rateLimitStore.set(clientIp, currentEntry);
  return next();
}

function buildLeadRecord(validatedPayload) {
  return {
    id: generateLeadId(),
    timestamp: new Date().toISOString(),
    ...validatedPayload
  };
}

function buildMomencePayload(leadData) {
  const momencePayload = {
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    email: leadData.email,
    phoneNumber: leadData.phoneNumber,
    time: leadData.time,
    center: leadData.center,
    type: leadData.type,
    waiverAccepted: leadData.waiverAccepted,
    event_id: leadData.event_id
  };

  TRACKING_FIELDS.forEach((fieldName) => {
    if (leadData[fieldName]) {
      momencePayload[fieldName] = leadData[fieldName];
    }
  });

  URL_FIELDS.forEach((fieldName) => {
    if (leadData[fieldName]) {
      momencePayload[fieldName] = leadData[fieldName];
    }
  });

  return momencePayload;
}

async function sendMetaLeadEvent(leadData, req) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { sent: false, reason: 'Meta Conversions API not configured' };
  }

  const email = normalizeEmail(leadData.email);
  const phone = normalizePhone(leadData.phoneNumber);
  const firstName = String(leadData.firstName || '').trim().toLowerCase();
  const lastName = String(leadData.lastName || '').trim().toLowerCase();
  const clientUserAgent = req.headers['user-agent'] || '';
  const clientIpAddress = getClientIp(req);
  const eventId = leadData.event_id;
  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId,
        event_source_url: leadData.landing_page || '',
        user_data: {
          ...(email ? { em: [sha256(email)] } : {}),
          ...(phone ? { ph: [sha256(phone)] } : {}),
          ...(firstName ? { fn: [sha256(firstName)] } : {}),
          ...(lastName ? { ln: [sha256(lastName)] } : {}),
          ...(leadData.fbp ? { fbp: leadData.fbp } : {}),
          ...(leadData.fbc ? { fbc: leadData.fbc } : {}),
          ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
          ...(clientIpAddress ? { client_ip_address: clientIpAddress } : {}),
          external_id: [sha256(String(leadData.id))]
        },
        custom_data: {
          studio_location: leadData.center || '',
          class_type: leadData.type || '',
          preferred_time: leadData.time || '',
          utm_source: leadData.utm_source || '',
          utm_medium: leadData.utm_medium || '',
          utm_campaign: leadData.utm_campaign || '',
          gclid: leadData.gclid || '',
          gbraid: leadData.gbraid || '',
          wbraid: leadData.wbraid || ''
        }
      }
    ]
  };

  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Meta Conversions API error: ${response.status} ${responseText || response.statusText}`.trim());
  }

  return { sent: true, eventId, response: responseText };
}

async function submitToMomence(leadData) {
  const momenceToken = process.env.MOMENCE_API_TOKEN || process.env.MOMENCE_TOKEN;
  const momenceSourceId = process.env.MOMENCE_SOURCE_ID;
  const momenceEndpoint = process.env.MOMENCE_LEAD_ENDPOINT;

  if (!momenceToken || !momenceSourceId || !momenceEndpoint) {
    throw new Error('Server configuration incomplete. Please set the Momence environment variables.');
  }

  const momencePayload = {
    token: momenceToken,
    sourceId: momenceSourceId,
    ...buildMomencePayload(leadData)
  };

  const momenceResponse = await fetch(momenceEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${momenceToken}`
    },
    body: JSON.stringify(momencePayload)
  });

  if (!momenceResponse.ok) {
    const errorText = await momenceResponse.text();
    throw new Error(`Failed to submit to Momence: ${momenceResponse.status} ${errorText || momenceResponse.statusText}`.trim());
  }
}

async function storeLeadData(leadData, requestMeta = {}) {
  console.log('New lead captured', {
    id: leadData.id,
    name: `${leadData.firstName} ${leadData.lastName}`.trim(),
    studio: leadData.center,
    format: leadData.type,
    source: leadData.utm_source || 'direct',
    campaign: leadData.utm_campaign || 'none'
  });

  try {
    const supabaseResult = await supabaseLeadStore.saveSubmittedLead(leadData, requestMeta);
    if (supabaseResult.success) {
      console.log('Lead synced to Supabase');

      const submissionRowId = Array.isArray(supabaseResult.data) && supabaseResult.data[0] ? supabaseResult.data[0].id : null;

      if (leadData.draft_id) {
        try {
          await supabaseLeadStore.markPartialSubmitted(leadData.draft_id, leadData, submissionRowId);
          console.log('Partial lead marked as submitted in Supabase');
        } catch (error) {
          console.error('Supabase partial lead update failed:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('Supabase submitted lead sync failed:', error.message);
  }

  try {
    await googleSheets.appendLead(leadData);
    console.log('Lead synced to Google Sheets');
  } catch (error) {
    console.error('Google Sheets sync failed:', error.message);
  }

  return leadData;
}

function requireAdmin(req, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const providedKey = req.get('x-admin-key') || req.query.key || '';

  if (providedKey !== adminApiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return next();
}

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripeClient) {
    return res.status(500).json({ success: false, error: 'Payments are not configured on this server.' });
  }

  try {
    const validation = validateLeadPayload(req.body);

    if (validation.isBot) {
      return res.status(202).json({ success: false, error: 'Request ignored.' });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    const paymentStage = normalizePaymentStage(req.body?.stage);
    const checkoutConfig = getStripeCheckoutConfig(req, paymentStage);
    const metadata = buildStripeMetadata({ ...validation.data, stage: paymentStage }, checkoutConfig);
    const sessionPayload = stripUndefined({
      payment_method_types: checkoutConfig.paymentMethodTypes?.length ? checkoutConfig.paymentMethodTypes : ['card'],
      mode: 'payment',
      client_reference_id: validation.data.event_id,
      customer_email: validation.data.email,
      submit_type: checkoutConfig.submitType || 'pay',
      allow_promotion_codes: checkoutConfig.allowPromotionCodes,
      billing_address_collection: checkoutConfig.billingAddressCollection,
      phone_number_collection: { enabled: Boolean(checkoutConfig.phoneNumberCollection) },
      tax_id_collection: { enabled: Boolean(checkoutConfig.taxIdCollection) },
      automatic_tax: { enabled: Boolean(checkoutConfig.automaticTax) },
      invoice_creation: { enabled: Boolean(checkoutConfig.invoiceCreation) },
      shipping_address_collection: checkoutConfig.shippingCountries?.length
        ? { allowed_countries: checkoutConfig.shippingCountries }
        : undefined,
      consent_collection: checkoutConfig.consentCollection || undefined,
      custom_fields: Array.isArray(checkoutConfig.customFields) && checkoutConfig.customFields.length
        ? checkoutConfig.customFields
        : undefined,
      custom_text: isPlainObject(checkoutConfig.customText) && Object.keys(checkoutConfig.customText).length
        ? checkoutConfig.customText
        : undefined,
      success_url: checkoutConfig.successUrl,
      cancel_url: checkoutConfig.cancelUrl,
      metadata,
      payment_intent_data: {
        metadata
      },
      line_items: [
        {
          price_data: {
            currency: checkoutConfig.currency,
            product_data: stripUndefined({
              name: checkoutConfig.productName,
              description: checkoutConfig.productDescription || undefined
            }),
            unit_amount: checkoutConfig.amount
          },
          quantity: 1
        }
      ]
    });

    const session = await stripeClient.checkout.sessions.create(sessionPayload);

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      stage: paymentStage,
      amountDisplay: formatMoney(checkoutConfig.amount, checkoutConfig.currency),
      buttonLabel: checkoutConfig.buttonLabel
    });
  } catch (error) {
    console.error('create-checkout-session error:', error && error.message);
    return res.status(500).json({ success: false, error: 'Unable to create checkout session.' });
  }
});

app.get('/api/verify-payment', async (req, res) => {
  try {
    const { session, fulfillment } = await retrieveAndValidatePaidSession(req.query.session_id);
    const paymentStage = normalizePaymentStage(session?.metadata?.payment_stage);

    return res.json({
      success: true,
      paid: true,
      fulfilled: Boolean(fulfillment?.success),
      stage: paymentStage,
      paymentSessionId: session.id,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency
      },
      fulfillment
    });
  } catch (error) {
    console.error('verify-payment error:', error && error.message);
    return res.status(500).json({ success: false, error: error.message || 'Unable to verify payment session.' });
  }
});

app.get(['/', '/index.html'], (req, res) => {
  res.type('html').send(renderIndexHtml());
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.post('/api/partial-lead', async (req, res) => {
  try {
    const partialLead = sanitizePartialLeadPayload(req.body);

    if (!partialLead) {
      return res.status(202).json({
        success: true,
        skipped: true,
        message: 'No meaningful draft data to persist.'
      });
    }

    const supabaseResult = await supabaseLeadStore.savePartialLead(
      {
        ...partialLead,
        session_id: partialLead.session_id || getClientIp(req)
      },
      {
        ip_address: getClientIp(req),
        user_agent: req.get('user-agent') || ''
      }
    );

    return res.json({
      success: true,
      saved: Boolean(supabaseResult.success),
      draftId: partialLead.draft_id
    });
  } catch (error) {
    console.error('Error saving partial lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to save partial lead.'
    });
  }
});

app.get('/api/schedule/sessions', async (req, res) => {
  try {
    const sessionsPayload = await scheduleService.getSessions({
      startDate: sanitizeText(req.query.startDate, 20),
      endDate: sanitizeText(req.query.endDate, 20),
      center: sanitizeText(req.query.center, 120),
      type: sanitizeText(req.query.type, 80)
    });

    return res.json({
      success: true,
      ...sessionsPayload,
      fallbackUrl: getPublicClientConfig().scheduleUrl
    });
  } catch (error) {
    console.error('Error loading schedule sessions:', error);
    return res.status(503).json({
      success: false,
      error: error.message || 'Unable to load the schedule right now.',
      fallbackUrl: getPublicClientConfig().scheduleUrl
    });
  }
});

app.post('/api/submit-lead', applySubmissionRateLimit, async (req, res) => {
  try {
    const validation = validateLeadPayload(req.body);

    if (validation.isBot) {
      return res.status(202).json({
        success: true,
        id: 'filtered',
        redirectUrl: getPublicClientConfig().redirectUrl
      });
    }

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        fieldErrors: validation.fieldErrors
      });
    }

    if (!validation.data.payment_session_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment is required before submitting.',
        fieldErrors: {
          payment: 'Complete payment before submitting your request.'
        }
      });
    }

    try {
      await retrieveAndValidatePaidSession(validation.data.payment_session_id);
    } catch (paymentError) {
      return res.status(400).json({
        success: false,
        error: paymentError.message || 'Payment could not be verified.',
        fieldErrors: {
          payment: paymentError.message || 'Payment could not be verified.'
        }
      });
    }

    const leadData = buildLeadRecord(validation.data);

    await submitToMomence(leadData);
    await storeLeadData(leadData, {
      ip_address: getClientIp(req),
      user_agent: req.get('user-agent') || ''
    });

    try {
      const metaResult = await sendMetaLeadEvent(leadData, req);
      if (metaResult.sent) {
        console.log(`Meta Conversions API event sent: ${metaResult.eventId}`);
      } else {
        console.log(`Meta Conversions API skipped: ${metaResult.reason}`);
      }
    } catch (error) {
      console.error('Meta Conversions API send failed:', error.message);
    }

    return res.json({
      success: true,
      id: leadData.id,
      redirectUrl: getPublicClientConfig().redirectUrl
    });
  } catch (error) {
    console.error('Error submitting lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred.'
    });
  }
});

app.post('/api/sheets/setup', requireAdmin, async (req, res) => {
  try {
    await googleSheets.setupHeaders();
    res.json({ success: true, message: 'Headers setup successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sheets/test', requireAdmin, async (req, res) => {
  try {
    const connected = await googleSheets.testConnection();
    res.json({ success: connected, message: connected ? 'Connected' : 'Failed to connect' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

if (require.main === module) {
  portfinder.basePort = process.env.PORT || 3000;
  portfinder.getPort((err, availablePort) => {
    if (err) {
      console.error('Error finding available port:', err);
      process.exit(1);
    }

    app.listen(availablePort, async () => {
      console.log(`Server is running on port ${availablePort}`);
      console.log(`Form: http://localhost:${availablePort}`);
      console.log(`Health: http://localhost:${availablePort}/health`);

      if (supabaseLeadStore.isConfigured) {
        console.log(`Supabase lead storage enabled (${supabaseLeadStore.config.schema}.${supabaseLeadStore.config.submissionsTable})`);
      } else {
        console.log(`Supabase lead storage disabled: ${supabaseLeadStore.status.reason}`);
      }

      if (googleSheets.isConfigured) {
        console.log('Testing Google Sheets connection...');
        const connected = await googleSheets.testConnection();
        console.log(connected ? 'Google Sheets ready for automatic sync' : 'Google Sheets connection failed');
      } else {
        console.log('Google Sheets integration disabled. Set environment variables to enable.');
      }
    });
  });
}

module.exports = app;
module.exports.app = app;
module.exports.validateLeadPayload = validateLeadPayload;
