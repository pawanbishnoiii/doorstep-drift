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
- Pricing lives only in `src/lib/pricing.ts` and is recomputed server-side in `createShipment`; never trust client prices.
- Phone OTP codes are hashed in `phone_otps` (service-role only); `OTP_DEV_DISPLAY` in `src/lib/otp.functions.ts` returns the code to the UI until an SMS provider is wired.
- Public tracking goes through the `track_shipment` SQL function, which exposes only non-personal fields.
- Signed-in pages live under `src/routes/_authenticated/` and use `AppShell`, which gates on a verified phone.
- DB health is probed by `/api/public/health-check`, called by a managed 4-hourly schedule.
- Brand name/domain/contacts are centralised in `src/lib/brand.ts`.
