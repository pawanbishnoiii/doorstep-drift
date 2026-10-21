<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Keep this remix's migration history independent of the source project; use the migration tool for future changes so copied migrations are not replayed.
- Pricing lives only in `src/lib/pricing.ts` and is recomputed server-side in `createShipment`; never trust client prices.
- Phone OTP codes are hashed in `phone_otps` (service-role only); `OTP_DEV_DISPLAY` in `src/lib/otp.functions.ts` returns the code to the UI until an SMS provider is wired.
- Public tracking goes through the `track_shipment` SQL function, which exposes only non-personal fields.
- Signed-in pages live under `src/routes/_authenticated/` and use `AppShell`, which gates on a verified phone.
- DB health is probed by `/api/public/health-check`, called by a managed 4-hourly schedule.
- Brand name/domain/contacts are centralised in `src/lib/brand.ts`.
- Role hierarchy is Admin → state_director → state_manager → area_manager → point; `network` is a separate ops role. Grants go through the `grant_staff_role` DB function, pincode scope through `allocate_pincode`/`release_pincode` — never direct table writes.
- Pincode master data lives in `public.pincodes` (24k rows, CSV-imported, audited via `import_pincodes`). Booking rejects unserviceable pincodes.
- Every booking gets a master AWB from `next_awb()` plus one `shipment_pieces` row + `next_piece_code()` per physical parcel. IDs come from the `awb_seq` sequence server-side and are never reused.
- Labels are generated client-side (`src/lib/labels.ts`, bwip-js Code 128 + qrcode + jsPDF) from saved records; every print/reprint is logged in `label_prints` and reprints require a reason. `awaiting_payment`/`cancelled` shipments cannot print.
- Staff scan parcels via `/scan` → `scan_piece` rpc (staff-only, writes tracking_events + audit_logs). Shipment visibility is pincode-scoped through `can_access_pincode`.
- Public base URL for QR/tracking links: `publicBaseUrl()` in `src/lib/brand.ts` (env `VITE_PUBLIC_BASE_URL`).
- Menu visibility per role lives in `src/lib/access.ts` (`navVisible`) and is covered by `src/test/role-access.test.tsx`; data access is still enforced by RLS.
- Customer tracking Q&A goes through `/api/public/track-assistant`, which only feeds `track_shipment` output to the model, so no personal data reaches AI.
