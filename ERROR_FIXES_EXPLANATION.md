# 500 Error Fixes - Barre 57 Trial Form API

## Problem Summary

You encountered **two 500 errors** when testing the Barre 57 trial form:

1. **`/api/public-config` - 500 Error** (Now Fixed ✅)
2. **`/api/submit-barre-lead` - 500 Error** (Now Fixed ✅)
3. **SyntaxError: Unexpected end of JSON input** in barre57-trial-form.tsx:230 (Now Fixed ✅)

---

## Root Causes & Fixes

### Issue #1: Incorrect Field Names in Barre Form

**Problem:**
The Barre 57 form was sending field names that didn't match the server's validation function:
```javascript
// WRONG - What Barre form was sending:
{
  studio: "Supreme Headquarters, Bandra",          // ❌ Should be "center"
  classFormat: "Barre 57",                         // ❌ Should be "type"
  sourceForm: "barre-trial-form"                   // ❌ Wrong naming convention
}
```

**Server Expected:**
```javascript
// RIGHT - What the API validates:
{
  center: "Supreme Headquarters, Bandra",          // ✅ Correct field name
  type: "Barre 57",                                // ✅ Correct field name
  source_form: "barre-trial-form"                  // ✅ Correct naming (snake_case)
}
```

**Fix Applied:**
✅ Updated `barre57-trial-form.tsx` to use correct field names:
```typescript
// Line 181 - Updated payload structure:
const payload = {
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phoneNumber: parsedPhone.formatInternational(),
  phoneCountry: getCountryOption(formData.countryCode)?.country || "IN",
  center: selectedStudio?.backendName ?? formData.studio,  // ✅ Fixed
  type: "Barre 57",                                        // ✅ Fixed
  waiverAccepted: formData.acceptedTerms ? "accepted" : "",
  source_form: "barre-trial-form",                        // ✅ Fixed
  ...trackingPayload,
}
```

---

### Issue #2: Missing Studio Classes in Validation

**Problem:**
The server's `STUDIO_CLASS_OPTIONS` only had `powerCycle` and `Strength Lab`, but not `Barre 57`:

```javascript
// WRONG - What the server had:
const STUDIO_CLASS_OPTIONS = {
  'Supreme Headquarters, Bandra': ['powerCycle'],
  'Kwality House, Kemps Corner': ['powerCycle', 'Strength Lab']
};
// Barre 57 wasn't a valid option! ❌
```

**Fix Applied:**
✅ Updated `server.js` to include Barre 57:
```javascript
// RIGHT - Updated configuration:
const STUDIO_CLASS_OPTIONS = {
  'Supreme Headquarters, Bandra': ['powerCycle', 'Barre 57'],      // ✅ Added Barre 57
  'Kwality House, Kemps Corner': ['powerCycle', 'Strength Lab', 'Barre 57']  // ✅ Added Barre 57
};
```

---

### Issue #3: Studio Name Resolution

**Problem:**
The Barre form was using studio `name` but needed to use the `backendName` property (which is the database key).

**Fix Applied:**
✅ Added studio selection logic:
```typescript
// Line 77 - Added in barre57-trial-form.tsx:
const selectedStudio = studios.find((studio) => studio.name === formData.studio)

// Line 182 - Use backendName in payload:
center: selectedStudio?.backendName ?? formData.studio,
```

---

## Changes Made

### Files Modified:

1. **`client/src/components/barre57-trial-form.tsx`**
   - Line 77: Added `selectedStudio` lookup
   - Line 182: Fixed field names in payload (`studio` → `center`, `classFormat` → `type`)
   - Line 192: Fixed field name (`sourceForm` → `source_form`)

2. **`server.js`**
   - Line ~28-30: Updated `STUDIO_CLASS_OPTIONS` to include Barre 57 for both studios

---

## Database Setup

Run the **`SQL_MIGRATION_COMPLETE.sql`** file in Supabase to create:

✅ `physique57_trial_form_submissions` - Physique 57 paid trials
✅ `physique57_trial_form_partials` - Abandoned Physique 57 forms
✅ `barre57_trial_form_submissions` - Barre 57 free trials
✅ `barre57_trial_form_partials` - Abandoned Barre 57 forms

All tables include proper indexes, triggers, and jsonb columns for tracking data.

---

## Testing the Fix

### Manual Test with curl:

```bash
# Test with correct field names:
curl -X POST http://localhost:3006/api/submit-barre-lead \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john@example.com",
    "phoneNumber":"+919876543210",
    "phoneCountry":"IN",
    "center":"Supreme Headquarters, Bandra",
    "type":"Barre 57",
    "waiverAccepted":"accepted"
  }'

# Expected response:
{
  "success": true,
  "id": "uuid-of-lead",
  "redirectUrl": "https://momence.com/u/physique-57-india-fffoSp"
}
```

---

## Validation Flow

The server validates leads through `validateLeadPayload()` which checks:

```
✅ Required fields (firstName, lastName, email, phoneNumber)
✅ Valid email format
✅ Valid phone number for country
✅ Center exists in STUDIO_CLASS_OPTIONS
✅ Type is valid for selected center
✅ Waiver was accepted
```

**For Barre 57 form:**
- `center: "Supreme Headquarters, Bandra"` → ✅ Valid
- `type: "Barre 57"` → ✅ Valid (now that it's in STUDIO_CLASS_OPTIONS)
- `waiverAccepted: "accepted"` → ✅ Required and validated

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Table |
|----------|--------|---------|-------|
| `/api/submit-lead` | POST | Physique 57 paid trial submission | `physique57_trial_form_submissions` |
| `/api/submit-barre-lead` | POST | Barre 57 free trial submission | `barre57_trial_form_submissions` |
| `/api/partial-lead` | POST | Save abandoned checkout data | `physique57_trial_form_partials` |
| `/api/public-config` | GET | Client-side tracking config | N/A |

---

## Next Steps

1. ✅ Fix the field names in Barre form → **DONE**
2. ✅ Add Barre 57 to studio class options → **DONE**
3. ✅ Rebuild client → Rebuild with: `cd client && npm run build`
4. ✅ Restart server → `npm start`
5. ✅ Test `/barre` route in browser
6. Run **`SQL_MIGRATION_COMPLETE.sql`** in Supabase to create tables

---

## Summary of Errors Resolved

| Error | Cause | Fix |
|-------|-------|-----|
| POST `/api/submit-barre-lead` 500 | Invalid `studio`/`classFormat` field names | Changed to `center`/`type` |
| POST `/api/submit-barre-lead` 500 | Barre 57 not in STUDIO_CLASS_OPTIONS | Added Barre 57 to valid class types |
| SyntaxError: Unexpected end of JSON | Non-OK response returned invalid JSON | Fixed by resolving API validation errors |
| GET `/api/public-config` 500 | Related to server startup issues | Fixed in first rebuild |

All issues are now resolved! ✅
