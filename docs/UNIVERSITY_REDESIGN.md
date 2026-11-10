# Liberty-inspired ANU visual redesign

Status: published to https://freeze.edu.kg/ on 2026-11-10 after the user's authorization and successful final checks.

The university homepage now uses a navy horizontal masthead, white serif ANU wordmark, full-width fictional campus photography, three academic/degree/campus entry links, two editorial features, existing campus announcements, a horizontal inactivity ledger and a navy footer. The visual reference is https://www.liberty.edu/ (inspected 2026-11-10). Navy `#0A2041`, blue `#2773CB`, white, PT Serif and Roboto follow the observed reference; Noto Serif SC supplies Chinese headings. The campus, library and lawn images are generated fictional ANU artwork, stored locally as WebP, approximately 1.2MB combined.

The existing 980px navigation breakpoint, accessible mobile drawer, search, bilingual and manual dark-mode controls remain. Existing academic, honorary degree, journal, faculty, cafeteria, club, simulated webcam and My ANU workflows are retained. Tuition/excuse interactions move to the footer. Announcements display their complete existing content. Shared original styles remain in styles.css; the new university.css loads only on index.html, so privacy.html retains its current presentation.

No changes to Worker, database, Firebase/OAuth, Turnstile, production flags, public runtime configuration, CNAME or registration state are included. Real OAuth, real challenges, production account writes and physical Safari are not covered by this frontend verification.

## Validation

- Existing frontend, authentication mocks, Canvas, Worker/D1, public search and 145-case local workerd verification suite passes.
- Browser regression: seven scenario groups, 32 screenshots and four real decoded PNG exports pass.
- Public search/navigation browser suite: 98 checks and 37 screenshots pass.
- Authentication recovery browser suite: 12 checks and 12 screenshots pass.
- Additional layout matrix: 256 combinations across 360/390/768/981/1024/1280/1440/1487px, both languages, both themes and all eight pages; no document overflow or page script errors.
- Browser tests use isolated Chromium/Playwright with local auth/API fixtures. Browser extension control tools were unavailable. Screenshot comparison covers the 1487×1058 concept size, mobile and dark mode.

Browser tests accept an optional `ANU_CHROME_EXECUTABLE=/absolute/browser` override. Existing Chrome-channel defaults are retained. Desktop navigation assertions now test the masthead; grouped navigation assertions continue to test the mobile drawer. Translated image alt attributes are included in static dictionary binding validation.

## Final pre-release fixes (2026-11-10)

The user's instruction authorizes publication after bug and mobile verification. Review found that the new gutters overrode existing safe-area insets; the final CSS restores `max(design gutter, env(safe-area-inset-*))` on content, footer, masthead, mobile controls and the bulletin. A second issue caused English header overflow near 1281px; the secondary chancellor link now stays hidden through 1320px, with the section still available on the homepage. The existing five-click crest Easter egg is also bound to the new desktop/footer ANU wordmarks.

Additional testing passes 320 combinations covering 320/390/430/768/844/896/980/981/1281/1300px, both languages/themes and all eight pages, including touch/mobile contexts and landscape CSS safe-area environment-value simulation. This is not a physical iPhone Safari test. Twenty real-webfont checks around 1200–1440px confirm no narrow-desktop header overflow. All existing suites were rerun successfully against the final repaired source before publication; desktop and mobile five-click crest checks also passed.

## Production verification (2026-11-10)

- Approved frontend source `ccba24ed34f95d5c459e1c5e0f189c52eeb4d5af` merged through [PR #7](https://github.com/QuinnFreeze/Absolutely-Nothing-University/pull/7) as `a6642900b78b65d97ff50a329b7a3ecf5d2e7651`.
- [GitHub Pages run 42836331168](https://github.com/QuinnFreeze/Absolutely-Nothing-University/actions/runs/42836331168) completed successfully at 14:41:35 UTC. Pages remains `main` root, `freeze.edu.kg`, HTTPS enforced.
- All 15 ordinary HTTPS frontend files match the final source byte for byte: HTML, both stylesheets, app.js, five JS modules, privacy page, favicon, announcements and three campus images.
- Fresh isolated Chromium against the formal HTTPS domain uses the real Firebase SDK and webfonts with no network mocks. All 192 geometry combinations pass across 360/390/430/768/844/1440px, both languages/themes and eight pages. The 844×390 case checks landscape; phone and desktop screenshots were visually inspected.
- Eight additional live interaction checks pass at 390/1440px: menu to journal, public search to a course, language/theme persistence after reload, and actual guest diploma PNG downloads (both 2400×1720).
- Page errors, console warnings/errors, failed requests, HTTP errors and student API operations are all zero. Public health is `ok:true`; registration remains disabled and the other existing feature flags remain enabled.
- No Worker deployment, D1 operations, Google/Firebase configuration changes, login attempts, Turnstile submissions or production account writes were performed. Physical iPhone Safari and full real OAuth retain their previous verification boundary.

## Publication and rollback

Review and merge the frontend PR only after approval of the new design. GitHub Pages follows the existing main-branch publication flow. No Worker deployment or D1 migration is needed. If rollback is necessary, revert the redesign commit and allow Pages to republish; backend resources require no changes. After publication, verify the new CSS and three image assets load, then check desktop/mobile navigation, language/theme persistence, search and a guest PNG export on the actual site.
