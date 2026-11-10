# Liberty-inspired ANU visual redesign

Status: proposed frontend revision; not a production release.

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

## Publication and rollback

Review and merge the frontend PR only after approval of the new design. GitHub Pages follows the existing main-branch publication flow. No Worker deployment or D1 migration is needed. If rollback is necessary, revert the redesign commit and allow Pages to republish; backend resources require no changes. After publication, verify the new CSS and three image assets load, then check desktop/mobile navigation, language/theme persistence, search and a guest PNG export on the actual site.
