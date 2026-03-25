# 📊 Conversion Tracking & Attribution Guide

## Overview

This project now uses a stronger attribution stack than plain UTM tags alone.

On every successful submission, the app can now:

- submit the lead to Momence
- append the lead to Google Sheets
- capture browser and platform attribution identifiers
- fire a browser-side Meta Pixel `Lead` event
- fire a server-side Meta Conversions API `Lead` event
- fire a Google Ads conversion event when configured

That gives you much more reliable reporting on which campaigns and ads actually worked.

---

## 🎯 What Data Is Captured

### Standard UTM Parameters

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `utm_id`

### Platform Click IDs

- `gclid` — Google Ads click ID
- `gbraid` — Google Ads iOS app/web braid identifier
- `wbraid` — Google Ads web braid identifier
- `fbclid` — Meta click ID
- `msclkid` — Microsoft Ads click ID
- `ttclid` — TikTok click ID

### Meta Browser Identifiers

- `fbp` — Meta browser identifier from the pixel cookie
- `fbc` — Meta click identifier derived from `_fbc` cookie or `fbclid`

### Additional Context

- `landing_page`
- `referrer`
- `event_id` — shared browser/server deduplication ID for Meta and conversion events

---

## 📍 Where The Data Goes

### 1. Momence API

Successful submissions are sent server-side to your configured Momence endpoint.

Configured through:

- `MOMENCE_API_TOKEN`
- `MOMENCE_SOURCE_ID`
- `MOMENCE_LEAD_ENDPOINT`

### 2. Google Sheets

After a successful Momence submission, the lead is appended to Google Sheets.

The sheet now stores:

- lead details
- UTMs
- click IDs
- `gbraid`
- `wbraid`
- `fbp`
- `fbc`

### 3. Meta Pixel + Meta Conversions API

On successful submission:

- browser sends a Meta Pixel `Lead`
- server sends a Meta CAPI `Lead`
- both use the same `event_id` for deduplication

### 4. Google Ads Conversion Tracking

When configured, the browser sends a Google Ads conversion event on successful submission using:

- `GOOGLE_ADS_ID`
- `GOOGLE_ADS_CONVERSION_LABEL`
- `GOOGLE_ADS_CONVERSION_VALUE`
- `GOOGLE_ADS_CONVERSION_CURRENCY`

---

## ✅ Current Successful Submission Flow

1. User submits the form
2. Backend sends the lead to Momence
3. If Momence succeeds, the app:
   - stores the lead locally
   - appends to Google Sheets
   - sends Meta CAPI event if configured
4. Browser fires:
   - Meta Pixel `Lead`
   - Google Ads conversion event if configured
   - Snap `SIGN_UP`
5. Success confetti animation plays
6. User is redirected

This means Google Sheets entries happen only after successful submission, exactly as requested.

---

## 🟦 Meta Conversions API Setup

### Required environment variables

```env
META_PIXEL_ID=your_meta_pixel_id
META_CONVERSIONS_ACCESS_TOKEN=your_meta_conversions_access_token
```

Optional for testing:

```env
META_TEST_EVENT_CODE=your_test_event_code
```

### What the server sends to Meta

The server sends a `Lead` event with:

- hashed email
- hashed phone
- hashed first name
- hashed last name
- `fbp`
- `fbc`
- client IP address
- client user agent
- event source URL
- shared `event_id`

### Why the shared `event_id` matters

The browser pixel and server event both send the same conversion identifier. This lets Meta deduplicate them so you do not double count conversions.

### How to test Meta CAPI

1. Open Meta Events Manager
2. Select your pixel
3. Open **Test Events**
4. Add `META_TEST_EVENT_CODE` to `.env`
5. Restart the app
6. Submit a lead

You should see browser and server lead events attributed to the same conversion.

---

## 🟨 Google Ads Conversion Tracking Setup

### Required environment variables

```env
GOOGLE_ADS_ID=AW-XXXXXXXXX
GOOGLE_ADS_CONVERSION_LABEL=your_conversion_label
GOOGLE_ADS_CONVERSION_VALUE=1
GOOGLE_ADS_CONVERSION_CURRENCY=INR
```

### How it works

On successful submission, the browser sends:

- a Google Ads conversion event
- the shared `event_id` as `transaction_id`

This is useful for lead conversion tracking in Google Ads.

### Where to get the conversion label

In Google Ads:

1. Go to **Goals** → **Conversions**
2. Create or open your lead conversion action
3. Choose **Use Google tag**
4. Copy the conversion label

It will look something like:

```text
abcDEFghiJKLmnopQR
```

The app will send the full destination as:

```text
AW-XXXXXXXXX/abcDEFghiJKLmnopQR
```

---

## 📄 Google Sheets Columns Now Stored

The sheet header now includes:

```text
Timestamp
First Name
Last Name
Email
Phone Number
Preferred Time
Studio Location
Class Type
UTM Source
UTM Medium
UTM Campaign
UTM Content
UTM Term
Google Click ID
Facebook Click ID
Microsoft Click ID
TikTok Click ID
Google Braid ID
Google Web Braid ID
Meta Browser ID (fbp)
Meta Click ID (fbc)
Landing Page
Referrer
```

---

## 📊 How To Analyze Which Campaigns Worked

### Best practice

Do not rely only on UTMs.

Use this layered approach:

1. **Platform attribution**
   - Meta Pixel + Meta CAPI
   - Google Ads conversion tracking

2. **First-party storage**
   - Google Sheets
   - your app’s `/api/leads`

3. **Outcome stages**
   - lead submitted
   - trial booked
   - trial attended
   - membership purchased

That gives you better answers than “which UTM generated traffic?” because it tells you which ads actually drove business outcomes.

---

## 🔍 Useful Endpoints In This Project

### Health check

```text
GET /health
```

### Test Google Sheets connection

```text
GET /api/sheets/test
```

### Reset or update Google Sheets headers

```text
POST /api/sheets/setup
```

### List recorded leads

```text
GET /api/leads
```

### Export leads as CSV

```text
GET /api/leads/export
```

### Campaign summary

```text
GET /api/campaigns/stats
```

---

## 🧪 Testing Checklist

### Basic lead tracking

1. Start the Node app
2. Submit the form
3. Confirm:
   - Momence submission succeeds
   - sheet gets a new row
   - success confetti appears

### UTM test

Open the page with something like:

```text
?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&utm_content=creative_a&utm_term=barre_class
```

### Google click-ID test

Test with query values such as:

```text
?gclid=test-gclid&gbraid=test-gbraid&wbraid=test-wbraid
```

### Meta click-ID test

Test with:

```text
?fbclid=test-fbclid
```

Then verify:

- `fbc` is derived
- `fbp` is read from browser cookie if available

---

## 🆘 Troubleshooting

### Google Sheets not updating

Check:

- `GET /api/sheets/test`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_SPREADSHEET_ID`

### Meta CAPI not sending

Check:

- `META_PIXEL_ID`
- `META_CONVERSIONS_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE` in test mode
- server logs for Meta API errors

### Google Ads conversions not appearing

Check:

- `GOOGLE_ADS_ID`
- `GOOGLE_ADS_CONVERSION_LABEL`
- Google Ads tag diagnostics
- ad click IDs are preserved on landing

### No attribution data captured

Check:

- browser console logs
- query parameters on landing page URL
- cookies are enabled
- page is opened through the real Node app or correct configured API base

---

## Recommended next upgrades

If you want even stronger measurement, add downstream business events such as:

- `trial_booked`
- `trial_attended`
- `membership_purchased`

and send those back to Meta / Google as later-stage conversions.

That will tell you not just which campaigns generated leads, but which campaigns generated revenue.
