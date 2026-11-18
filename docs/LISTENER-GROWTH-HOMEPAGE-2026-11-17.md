# Listener-focused homepage — November17,2026

Branch `feat/listener-growth-home-1117`, website repository `wccg-new-platform`, based on deployed dc10be5. Owner request: improve marketing on wccg1045fm.com to attract more listeners.

## Changes

The homepage now leads with WCCG104.5FM/Fayetteville, hip hop and R&B, a clear daily-listening benefit and **Listen live — free**. The existing flagship player still opens immediately from the user click. Copy explains browser listening and no account requirement. On phones the pitch and CTA precede artwork; desktop retains the two-card presentation. Featured carousel labels and prior image repairs are preserved.

The next section invites repeat listening through shows, music channels and song requests. A direct listening link is available without browsing the platform. A listener can share the station with the device share sheet, copy a link, or manually copy when clipboard access is unavailable. Cancellation quietly returns; native failure falls back to copy. The URL points to `/listen/wccg/` with `utm_source=listener_share`, `utm_medium=referral`, `utm_campaign=listen_wccg`. No automatic share, email, post or audio start occurs.

Show lineup/music discovery now take the former shopping-first quick-access positions. Community/services remain available. Removed the unsupported “thousands of listeners” assertion from the community CTA. New title, description, canonical, social-preview metadata and RadioStation JSON-LD identify the station and listening offer. No rating, audience estimate, offer guarantee or fabricated result is embedded. Schema type checked against https://schema.org/RadioStation.

## Measurement and limits

Hero play intent uses existing `play_clicked` with source `home_hero` / campaign `listener_growth_20261117`; completed share/copy uses `station_share` with method. Both use the existing vendor-neutral analytics wrapper. **This is instrumentation, not evidence of increased listeners.** The current deployment does not configure a PostHog key and the wrapper is a production no-op when no provider is configured. Provider setup/collection is not silently enabled, and no analytics credentials or new SDK were added. Referral query tags remain usable in existing access logs and future configured analytics.

Assess impact with homepage visits→actual playback, listening minutes, return listening and referral sessions over a comparable period. Clicks/share completion alone are not listener counts; station/server listener reports are the appropriate audience evidence. No growth percentage is claimed. Distribution campaigns and analytics-provider activation are separate follow-up work; no paid spend or outward messages were initiated.

## Validation

- ESLint: all five changed TS/TSX files pass. Full web TypeScript passes.
- Final Next16.1.6 webpack static production build succeeds,5642/5642 pages.
- 10 export assertions pass: marketing metadata, valid RadioStation JSON, both responsive CTA labels, mobile DOM order, referral section, removal of unsupported count, and preservation of earlier image/channel fixes.
- Five real share-handler scenarios pass with injected browser/analytics transports: native success, cancellation, clipboard-only, native failure→clipboard, and clipboard failure→manual read-only link. No real sharing or clipboard write was used in those tests.
- Actual loopback preview: desktop and390px mobile visually inspected. Mobile CTA observed at top362px/bottom410px in844px viewport, before artwork. Search/social metadata and station JSON were inspected in the browser. No listening/share/newsletter action was submitted during browser review; temporary viewport override is reset.

No npm dependency or lockfile change. Existing installed tools are reused. Live deployment and evidence are recorded after the normal web-only KnownHost workflow completes. AirSuite Production0.21.162, Library0.21.118, ENDEC/OnAir/audio/EAS records and existing monitor warnings are outside this change.

## Deployment and responsive follow-up

Homepage source 3783055ecfea9d41fc9d4df5355d8223a0c08414 deployed successfully through KnownHost workflow 44219569692; public homepage readback confirmed the listener pitch, free-listening CTA, invitation/share section, metadata and RadioStation schema.

The final live phone check uncovered an existing header overflow (398px content against 384px client width at a 390px viewport), plus a tablet navigation gap: desktop links began at lg while the drawer trigger disappeared at md. The follow-up keeps the drawer available until lg and reduces phone header spacing. Phone account and theme controls move into the drawer; desktop/tablet retain them in the header. Listening and search stay immediately available. No account actions or permissions changed.

Follow-up validation: both changed navigation files pass ESLint; full web TypeScript and the 5642-page production build pass. Browser preview at 390px has client/scroll width 384/384, with the free-listen CTA at 362–410px. Phone drawer opens and contains Sign In, Sign Up and theme controls. At 900px, the previously missing drawer opens and layout has no horizontal overflow. At 320px the header menu fits (right 298px in 314px content); pre-existing footer social links and the fixed navigation dock still exceed that narrow width, outside this header repair. No playback or account action was triggered.
