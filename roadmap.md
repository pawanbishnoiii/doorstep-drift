# Get Xpress upgrade
## Current request — landing, onboarding and exploration
- [ ] Upgrade landing typography, motion, imagery and footer; add policy pages.
- [ ] Debounced parallel Google/free location searches with bounded caching and stale-result protection.
- [ ] Two-step personal details and contact verification onboarding; investigate current key error.
- [ ] Isolated realistic demo customers, hubs, shipments and hub processing exploration.
- [ ] Provider documentation and truthful configuration readiness; hub-independent delivery.
- [ ] Improve admin table exploration and export; verify central flows and role checks.

- [ ] Google Maps renderer and authenticated suggestions; keyless fallback.
- [ ] Get Xpress name, logos, favicon, domain references and upgraded landing page.
- [ ] Public booking, persistent guest drafts, login/OTP continuation at confirmation.
- [ ] Per-parcel presets/custom dimensions, service comparison and coupon preview.
- [ ] Admin service rates, pay-at-pickup toggle and pincode master management.
- [ ] Returns/RTO, bags/manifests and commission pages using existing scoped records.
- [ ] Professional dashboard navigation and end-to-end checks.
- [ ] App email sending — blocked until an owned sender domain is configured.
- [ ] Real online payments and SMS — blocked on provider credentials; retain clearly labelled demo/on-screen OTP.

## Open (Oct 21 request)
- [x] Serviceable pincodes loaded (19k India pincodes)
- [x] "Point" renamed to "Hub" on public pages
- [ ] /users/dashboard, /users/orders, /users/addorder, /users/returns (customer area, in-dashboard tracking)
- [ ] Separate dashboards per role (hub, area/state manager, director, admin) + 5-digit user IDs, last seen
- [ ] Hub wallet (top-up, booking deduction, commissions, history)
- [ ] Bags & manifests rename + seal/bag barcode scan; hub delivery tally + delivery score; camera scanning
- [x] Login page redesign (scooter courier) + phone login
- [x] Rule-based parcel exception helper on scan page; booking quality scores on admin dashboard
- [x] Role dashboards (state/area manager, network), team prices, dispatch bag/seal/plastic camera scans, admin integrations settings, landing size guide + GSAP, profile onboarding
- [ ] Admin email alerts on booking/application — blocked: needs a sender email domain
- [ ] Rider photo still shows old DropBox branding — regenerate
- [ ] Dynamic hub application form (pincode autofill, state/district/city, WhatsApp, age, gender)
- [ ] Landing page GSAP + parcel size icons; admin integrations (SMTP, payments, OTP, WhatsApp)

## Oct 21 audit
- [x] Database baseline applied cleanly (1 entry, all 28 tables + 39 functions present).
- [x] Booking works even when price/settings rows are missing (uses default prices).
- [x] Google address search + reverse lookup fixed; signed-in pincode suggestions use Google, guests use free map.
- [ ] Load India pincodes — blocked: remix has no data; first user must claim Admin, then Staff console → "Load full India list".
- [ ] Logos placement, Parcel images, scan sounds, bulk seal/plastic-bag codes, hub bag labels, AI booking summaries, Area/Cluster manager pincode flow — next rounds.
- [x] Key error ("No suitable key") — stale sessions auto-refresh on load.
- [x] Main wordmark in header/auth/dashboard; Speed logo in footer; brand icon favicon; help@getxpress.in.
- [x] Admin Diagnostics page (map display, address lookup, suggestions, pincodes, SMS/payments/SMTP status).
- [x] Tracking page "Ask about this parcel" AI assistant.
- [x] Automated role/page-access checks (src/test/role-access.test.tsx).
- [x] 10 parcel pictures in booking parcel picker + size guide.
- [ ] SMS (MSG91/Fast2SMS) and Razorpay — blocked: no API keys yet.
- [ ] Scan sounds, bulk seal/plastic-bag code generator, bag labels, AI booking summaries, Area/Cluster pincode flow — next round.

## Oct 21 (round 2)
- [x] Server sign-in check verifies with auth server (fixes "No suitable key or wrong key type")
- [x] Google sign-in provider enabled
- [x] Phone verification merged into onboarding; /verify-phone redirects
- [x] OTP required to confirm each booking
- [x] Bulk seal / plastic-bag code generator (Admin, PDF sheet)
- [x] Printable hub bag labels
- [x] Parcel images compressed to small WebP
- [ ] Landing page redesign to match /point-partner (fonts, GSAP)
- [ ] Faster dual-provider (Google + OSM) Get a quote suggestions
- [ ] Demo data + full end-to-end flow test
