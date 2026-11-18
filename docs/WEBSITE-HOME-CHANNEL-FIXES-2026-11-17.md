# Homepage artwork, featured labels and channel accessibility

Requested November17,2026 after the bounded public-site audit. Branch `feat/website-home-channel-fixes-1117`, based on main262372e. This is the separate `wccg-new-platform` website repository; no AirSuite/ENDEC/OnAir source, process, routing or filing record is changed.

## Changes

- Build-time show/host mapping replaces only the four audited missing station WordPress image URLs with the same record's existing bundled artwork. Current CMS URLs, other hosts/domains and unrelated content remain unchanged. If that subject has no bundled replacement, the image is omitted rather than showing the wrong person. This fixes all consumers of build-time content, including serialized homepage data; no database write is required.
- Both mobile and desktop rotating show slides say **Featured Show**. Rotation is editorial promotion, not current playout evidence. Actual live metadata elsewhere remains unchanged.
- Both channel action variants (show image and radio icon) expose **Play/Pause + channel name** and the existing playing state via `aria-pressed`. Missing stream URLs disable the action. Existing click handlers and audio behavior are retained; Coming Soon channels still have no playback action.

The four audited legacy paths are `/wp-content/uploads/2025/09/bootleg-kev-new1.png`, `/wp-content/uploads/2025/09/streetz.png`, `/wp-content/uploads/2025/11/attachment-thumbnail_new-streetz-pix.png` and `/wp-content/uploads/2025/11/GAxhqlAXcAAPZOQ.jpg`. They are corrected at rendering time; this does not restore retired URLs for outside bookmarks.

## Validation

- ESLint passes for all four changed TS/TSX files; full web TypeScript check passes.
-19 mapping checks cover all audited paths as relative/apex/www URLs, current and foreign artwork preservation, absent subject replacement and query/hash variants.
- Next16.1.6 webpack production build succeeds with its5642-page static export. Generated homepage contains two Featured Show labels and zero audited broken URL references; channels export contains five named Play controls.
- Loopback8196 serves only this worktree's static export for browser review. Desktop and temporary390px mobile inspection confirm featured labels and loaded473px Bootleg artwork; no loaded image failure was observed in the reviewed hero. Temporary viewport override is reset. Playback controls are inspected, not pressed, preserving audio state.
- Existing dependencies are reused without adding packages or changing the lockfile. The installed pnpm11 attempted an automatic dependency refresh and refused the cross-worktree module directory; no dependency removal was authorized or performed. Direct existing ESLint/TypeScript/Next binaries completed validation.

## Deployment

Use the repository's existing web-only KnownHost workflow `.github/workflows/deploy.yml`. API/admin/workers paths and deployment settings are not modified. Public-site verification must confirm the new label, corrected image references/loaded artwork and five named controls after workflow success. The existing deployment exclusions for Broadcast Copy addon domains remain intact.

Deployment result and pull request are recorded in the final task report. The original working checkout and other agents' untracked work are preserved. Full playback, authenticated workflows and unrelated preexisting page issues are outside this repair.
