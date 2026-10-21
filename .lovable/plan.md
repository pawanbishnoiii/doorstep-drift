# Verify Google Maps + database baseline, then fix

## 1. Database baseline check
- Confirm the empty baseline is recorded as applied and that no old copied changes are pending.
- Count rows in the key tables (pincodes ~24k, shipments, profiles, roles, coupons, rates, settings) and confirm the core functions (AWB numbering, tracking, scanning, pincode allocation) still exist.
- Load the home page, tracking page and a signed-in dashboard to confirm the app starts with data showing.
- Report any missing tables or empty data clearly instead of re-creating anything silently.

## 2. Google Maps checks
- Address search (signed in): call the Google place search and reverse lookup directly and inspect results for Indian addresses (e.g. "Malviya Nagar Jaipur") — pincode, city, state must be filled.
- Location suggestions in the pincode box: today these only use the pincode list plus the free OpenStreetMap service, never Google. Route the locality fallback through Google for signed-in users (keep OpenStreetMap for guests and as backup).
- Map display: the map cannot load inside the testing sandbox (Google blocks it there), so I will check the setup code and fallback, and ask you to confirm the map shows on the preview.

## 3. Fixes expected
- "Choose a serviceable pincode from suggestions" error: accept any typed 6-digit pincode that exists in the pincode list (checked on blur/submit), not only picked suggestions; when a Google/map result returns a pincode, match it to the list automatically. Show a clear "not serviceable" message only when the pincode truly isn't in the list.
- Reverse lookup: switch to the current Google geocoding with a correct request (current code sends a places field filter on a geocode call), and handle "no result" gracefully.
- Debounce + ignore stale answers in suggestions; cache repeated lookups to limit Google usage.

## 4. Verify
- Run existing tests, add a small test for the pincode acceptance rule (typed valid serviceable pincode accepted; unknown one rejected).
- Drive booking form in a browser: type pincode, type locality, pick suggestion, submit.

## Out of scope this round
The other items in your notes (new images, logos placement, scanning sounds, seal/bag label bulk generation, Hub renaming, AI summaries) stay in the roadmap and will be planned next.

## Technical details
- Files: `src/lib/maps.functions.ts` (field mask only for Places, geocode without it), `src/lib/pin-lookup.ts` (Google fallback via server fn when signed in), `src/components/site/PinAutocomplete.tsx` + booking validation (exact-pincode check via `pinInfo`).
- DB checks via read-only queries on `drizzle.__drizzle_migrations` and table counts.
