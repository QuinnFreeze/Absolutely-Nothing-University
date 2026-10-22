/*
 * Real isolated Chrome regression for grouped navigation, the native public
 * search dialog, and My ANU layout, using Playwright + fresh Chrome contexts.
 *
 * Local static files are served on an ephemeral loopback port. student-auth.js
 * is replaced at its public interface: Firebase/Google OAuth/Worker/Turnstile
 * are fixtures, never live services. Web fonts use the system-font fallback.
 * No existing Chrome profile, browser tab, production write, or OAuth is used.
 *
 * Run: node tests/site-search-browser.cjs
 * Optional: PLAYWRIGHT_MODULE, ANU_CHROME_CHANNEL, ANU_SITE_SEARCH_EVIDENCE_DIR.
 * Evidence defaults outside this repository; no new dependencies are installed.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }
catch (_) {
  playwright = require(path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
}

const ROOT = path.resolve(__dirname, "..");
const OUT = process.env.ANU_SITE_SEARCH_EVIDENCE_DIR || path.join(os.tmpdir(), "anu-site-search-browser");
const ANNOUNCEMENTS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/announcements.json"), "utf8"));
const PRIVATE = {
  dom: "QA_PRIVATE_DOM_729641",
  nickname: "QA_LOCAL_NICKNAME_729642",
  localPaper: "QA_LOCAL_PAPER_729643",
  account: "QA_GOOGLE_ACCOUNT_729644",
  cloudNickname: "QA_CLOUD_NICKNAME_729645",
  cloudExam: "QA_CLOUD_EXAM_729646",
  cloudPaper: "QA_CLOUD_PAPER_729647",
  cloudDiploma: "QA_CLOUD_DIPLOMA_729648"
};
const STORAGE = {
  anu_local_profile: JSON.stringify({ nickname: PRIVATE.nickname, avatarSeed: "crest-oxford", visibility: "private" }),
  anu_local_papers: JSON.stringify([{ title: PRIVATE.localPaper, author: PRIVATE.nickname, void_id: "VOID-ID:QA-LOCAL", journal_zh: "隔离测试期刊", journal_en: "Isolated Fixture Journal" }])
};
const LONG_EMAIL = PRIVATE.account + "." + "long-private-email-segment.".repeat(5) + "@example.invalid";
const CLOUD_BUNDLE = {
  profile: { nickname: PRIVATE.cloudNickname, studentNumber: "ANU-2026-QA1234", avatarSeed: "crest-oxford", visibility: "private", publicConsent: false, college: "retreat", collegeNameZh: "隔离测试学院", collegeNameEn: "Isolated Fixture College", major: "Fixture Major", enrollmentYear: 2026, enrollmentDate: "2026-10-22", fictionalHonor: "Fixture Honor" },
  transcripts: [{ course_code: "QA-000", course_title_zh: PRIVATE.cloudExam, course_title_en: PRIVATE.cloudExam, grade_label_zh: "Fixture", grade_label_en: "Fixture", score: 0, created_at: "2026-10-22" }],
  papers: [{ title: PRIVATE.cloudPaper, author_display: PRIVATE.cloudNickname, void_id: "VOID-ID:QA-CLOUD", journal_zh: "隔离测试期刊", journal_en: "Isolated Fixture Journal" }],
  diplomas: [{ recipient_name: PRIVATE.cloudNickname, degree_zh: PRIVATE.cloudDiploma, degree_en: PRIVATE.cloudDiploma, serial_number: "ANU-QA-CLOUD", issued_date: "2026-10-22" }],
  honors: []
};

const AUTH_FIXTURE = `(() => {
  const listeners = [];
  const state = {authReady:true,isConfigured:true,user:null,isRegistered:false,
    bundle:null,bundleLoaded:false,cloudLoading:false,cloudError:null,authError:null,
    authInitializing:false,authSigningIn:false,authSigningOut:false,cloudSaving:false};
  const notify = () => listeners.forEach(fn => fn({...state}));
  window.__qaAuthEmit = patch => {Object.assign(state,patch);notify();};
  window.ANU_AUTH = {
    getState:()=>({...state}),onStateChange:fn=>listeners.push(fn),
    initAuth:async()=>notify(),isFirebaseConfigured:()=>true,prepareSignIn:async()=>{},
    signInWithGoogle:async()=>{throw new Error('Real OAuth is forbidden in this fixture');},
    signOutStudent:async()=>{Object.assign(state,{user:null,isRegistered:false,bundle:null,bundleLoaded:false});notify();},
    mountTurnstileWidget:()=>{},getTurnstileToken:()=>null,
    renderCrestAvatarSvg:element=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 60 64');svg.setAttribute('aria-hidden','true');const shield=document.createElementNS(svg.namespaceURI,'path');shield.setAttribute('d','M6 5h48v35L30 59 6 40Z');shield.setAttribute('fill','#0B2E59');svg.appendChild(shield);element.replaceChildren(svg);}
  };
})();`;

function staticServer() {
  const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname); }
    catch (_) { response.writeHead(400); return response.end("Bad request"); }
    const filename = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403); return response.end("Forbidden"); }
    fs.readFile(filename, (error, content) => {
      response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream", "Cache-Control": "no-store" });
      response.end(error ? "Not found" : content);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const summary = {
  result: "FAIL", startedAt: new Date().toISOString(),
  mode: "Real isolated Chrome rendering; ephemeral local server; ANU_AUTH public-interface fixture replaces Firebase/OAuth/Worker/Turnstile; system-font fallback; no production integration claims",
  driver: "Playwright with isolated Chrome contexts",
  checks: [], scenarios: [], screenshots: [], failures: [], errors: [], unexpectedExternal: []
};

async function verify(env, name, action) {
  try {
    await action();
    summary.checks.push({ scenario: env.name, name, result: "PASS" });
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    summary.checks.push({ scenario: env.name, name, result: "FAIL", error: error.message });
    throw error;
  }
}

async function screenshot(env, label) {
  const filename = path.join(OUT, `${env.name}-${label}.png`);
  await env.page.screenshot({ path: filename, fullPage: false, animations: "disabled" });
  fs.chmodSync(filename, 0o600);
  const bytes = fs.readFileSync(filename);
  const details = { path: filename, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), label };
  summary.screenshots.push(details);
  return details;
}

async function focusIs(page, selector) {
  try {
    await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), selector);
  } catch (error) {
    const focus = await page.evaluate(selector => ({ selector, active: document.activeElement && document.activeElement.outerHTML.slice(0, 600), expected: document.querySelector(selector)?.outerHTML.slice(0, 600), focused: document.hasFocus(), sidebarInert: document.querySelector("#uni-sidebar").inert, mainInert: document.querySelector(".main-stage").inert, log: window.__qaFocusLog?.slice(-12) }), selector);
    throw new Error(error.message + " " + JSON.stringify(focus));
  }
}

async function go(page, pageKey) {
  if (new URL(page.url()).hash !== "#" + pageKey) await page.evaluate(key => { location.hash = key; }, pageKey);
  await page.waitForFunction(key => document.querySelector(`#page-${key}`).classList.contains("active"), pageKey);
}

async function openSearch(env, entry = env.width <= 980 ? "#mobile-search-open" : "#site-search-open") {
  await env.page.locator(entry).click();
  await env.page.waitForFunction(() => document.querySelector("#site-search-dialog").open);
  await focusIs(env.page, "#site-search-input");
  assert.equal(await env.page.locator("#site-search-dialog").evaluate(dialog => dialog.matches(":modal")), true, "Search must be a native modal dialog");
}

async function closeSearch(env, method = "Escape") {
  if (method === "Escape") await env.page.keyboard.press("Escape");
  else await env.page.locator("#site-search-close").click();
  try {
    await env.page.waitForFunction(() => !document.querySelector("#site-search-dialog").open);
  } catch (error) {
    const state = await env.page.evaluate(() => ({ open: document.querySelector("#site-search-dialog").open, value: document.querySelector("#site-search-input").value, active: document.activeElement.id }));
    throw new Error(`Search did not close after ${method}: ${JSON.stringify(state)}; ${error.message}`);
  }
}

async function fillSearch(env, query) {
  await env.page.locator("#site-search-input").fill(query);
  await env.page.evaluate(() => new Promise(requestAnimationFrame));
}

async function noOverflow(env, selectors = ["#my-anu-auth-banner", ".my-anu-auth-main", ".my-anu-auth-controls"]) {
  if (selectors.includes("#uni-sidebar")) await env.page.waitForFunction(() => Math.abs(document.querySelector("#uni-sidebar").getBoundingClientRect().left) <= 1);
  const geometry = await env.page.evaluate(selectors => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    boxes: selectors.flatMap(selector => Array.from(document.querySelectorAll(selector)).filter(el => el.getClientRects().length).map(el => {
      const rect = el.getBoundingClientRect();
      return { selector, left: rect.left, right: rect.right, scroll: el.scrollWidth, client: el.clientWidth };
    }))
  }), selectors);
  assert.ok(geometry.document <= geometry.viewport + 1, JSON.stringify(geometry));
  for (const box of geometry.boxes) {
    assert.ok(box.left >= -1 && box.right <= geometry.viewport + 1, JSON.stringify(box));
    assert.ok(box.scroll <= box.client + 1, JSON.stringify(box));
  }
}

async function navigation(env) {
  const { page } = env;
  await verify(env, "All four grouped sections toggle, navigate, and reopen for their active route", async () => {
    assert.equal(await page.locator(".sidebar-nav-group").count(), 4);
    for (const [group, target] of [["resources", "my-anu"], ["academics", "academics"], ["admissions", "admissions"], ["campus", "campus"]]) {
      const details = page.locator(`[data-nav-group="${group}"]`);
      if (await details.evaluate(el => el.open)) await details.locator("summary").click();
      assert.equal(await details.evaluate(el => el.open), false);
      await details.locator("summary").click();
      assert.equal(await details.evaluate(el => el.open), true);
      await details.locator(`[data-page-target="${target}"]`).click();
      await go(page, target);
      assert.equal(await details.locator(`[data-page-target="${target}"]`).getAttribute("aria-current"), "page");
      await details.locator("summary").click();
      await go(page, target === "overview" ? "admissions" : "overview");
      await go(page, target);
      assert.equal(await details.evaluate(el => el.open), true, `Active ${group} group must reopen`);
    }
  });
}

async function searchBasics(env) {
  const { page, lang } = env;
  const entry = env.width <= 980 ? "#mobile-search-open" : "#site-search-open";
  await verify(env, "Search button opens with input focus; close button and Escape restore the opener", async () => {
    await openSearch(env);
    await closeSearch(env, "button");
    await focusIs(page, entry);
    await openSearch(env);
    await closeSearch(env);
    await focusIs(page, entry);
  });
  await verify(env, "Ctrl K opens search and restores its original focused control", async () => {
    await go(page, "my-anu");
    await page.locator("#google-signin-btn").focus();
    await page.keyboard.press("Control+k");
    await focusIs(page, "#site-search-input");
    assert.equal(await page.locator("#site-search-dialog").evaluate(el => el.matches(":modal")), true);
    await closeSearch(env);
    await focusIs(page, "#google-signin-btn");
  });
  await verify(env, "Native modal Tab and Shift Tab remain within search", async () => {
    await openSearch(env);
    await fillSearch(env, "");
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let index = 0; index < 15; index++) {
        await page.keyboard.press(key);
        const focus = await page.evaluate(() => ({ inside: document.querySelector("#site-search-dialog").contains(document.activeElement), tag: document.activeElement.tagName, id: document.activeElement.id, modal: document.querySelector("#site-search-dialog").matches(":modal"), documentFocused: document.hasFocus() }));
        assert.equal(focus.inside, true, `${key} ${index} escaped the dialog: ${JSON.stringify(focus)}`);
      }
    }
    await closeSearch(env);
  });
  await verify(env, "Whitespace suggestions, no result, clear, HTML input, and in-memory-only queries", async () => {
    await openSearch(env);
    const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, writes: window.__qaStorageWrites.length }));
    const requests = env.requests.length;
    await fillSearch(env, "   ");
    assert.equal(await page.locator(".search-result").count(), 8);
    assert.equal(await page.locator("#site-search-status").innerText(), await page.evaluate(lang => ANU_DATA.i18nDict[lang].search_suggested, lang));
    await fillSearch(env, "QA_QUERY_NO_MATCH_729649");
    assert.equal(await page.locator(".search-result").count(), 0);
    assert.equal(await page.locator(".search-empty").count(), 1);
    assert.equal(await page.locator("#site-search-status").innerText(), await page.evaluate(lang => ANU_DATA.i18nDict[lang].search_none, lang));
    await page.locator("#site-search-clear").click();
    assert.equal(await page.locator("#site-search-input").inputValue(), "");
    assert.equal(await page.locator("#site-search-clear").isVisible(), false);
    assert.equal(await page.locator(".search-result").count(), 8);
    await focusIs(page, "#site-search-input");
    await fillSearch(env, '<img src="qa-query-xss" onerror="window.__qaXssExecuted=true">');
    assert.equal(await page.locator("#site-search-results img, #site-search-results script").count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.__qaXssExecuted)), false);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(env.requests.length, requests, "Typing/clearing queries must not cause any network request");
    assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, writes: window.__qaStorageWrites.length })), storage, "Search must not save queries in browser storage");
    await fillSearch(env, "NTH-101");
    await noOverflow(env, ["#site-search-dialog", "#site-search-form", "#site-search-input", "#site-search-results"]);
    await screenshot(env, "search");
    await closeSearch(env);
  });
}

async function searchDestinations(env) {
  const { page, lang } = env;
  const data = await page.evaluate(lang => ({
    course: ANU_DATA.coursesByLang[lang][1],
    crossCourse: ANU_DATA.coursesByLang[lang === "zh" ? "en" : "zh"][2],
    crossTitle: ANU_DATA.coursesByLang[lang][2].title,
    paper: ANU_DATA.papersByLang[lang][1],
    entree: ANU_DATA.cafeMenuByLang[lang].find(item => item.cat === "entree")
  }), lang);
  await verify(env, "Arrow keys and Enter select a course and render its actual full syllabus", async () => {
    await openSearch(env);
    await fillSearch(env, "");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.locator(".search-result").first().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("ArrowUp");
    await focusIs(page, "#site-search-input");
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.locator(".search-result").last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.locator(".search-result").first().evaluate(el => el === document.activeElement), true);
    await fillSearch(env, data.course.code.toLowerCase());
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(code => document.querySelector("#syl-code").textContent === code, data.course.code);
    assert.equal(await page.locator("#syl-title").innerText(), data.course.title);
    assert.equal(await page.locator("#syl-desc").innerText(), data.course.desc);
    assert.equal(await page.locator("#syl-weeks-list li").count(), data.course.syllabus.length);
    assert.equal(await page.locator(".course-row.selected .course-code").innerText(), data.course.code);
    await focusIs(page, "#syllabus-panel");
    assert.equal(new URL(page.url()).hash, "#academics");
    assert.equal(await page.locator('[data-nav-group="academics"]').evaluate(el => el.open), true);
  });
  await verify(env, "Search matches content in the other language and displays the current language", async () => {
    await openSearch(env);
    await fillSearch(env, data.crossCourse.title);
    await page.locator("#site-search-results").getByText(data.crossTitle, { exact: true }).click();
    await page.waitForFunction(code => document.querySelector("#syl-code").textContent === code, data.crossCourse.code);
    assert.equal(await page.locator("#syl-title").innerText(), data.crossTitle);
  });
  await verify(env, "Public paper search selects the intended paper in the real reader", async () => {
    await openSearch(env);
    await fillSearch(env, data.paper.doi);
    await page.locator("#site-search-results").getByText(data.paper.title, { exact: true }).click();
    await page.waitForFunction(doi => document.querySelector("#reader-doi").textContent === doi, data.paper.doi);
    assert.equal(await page.locator("#reader-title").innerText(), data.paper.title);
    assert.equal(await page.locator("#reader-content").innerText(), data.paper.content);
    assert.equal(await page.locator(".paper-entry.active .paper-entry-title").innerText(), data.paper.title);
    await focusIs(page, "#paper-reader");
    assert.equal(new URL(page.url()).hash, "#research");
  });
  await verify(env, "Announcement search resets category and focuses/highlights the selected notice", async () => {
    await go(page, "overview");
    const announcement = ANNOUNCEMENTS.announcements.find(item => item.category !== "campus") || ANNOUNCEMENTS.announcements[0];
    await page.locator('[data-ann-cat="campus"]').click();
    await openSearch(env);
    await fillSearch(env, announcement.id);
    await page.locator("#site-search-results").getByText(announcement[lang].title, { exact: true }).click();
    const notice = page.locator(`[data-ann-id="${announcement.id}"]`);
    assert.equal(await notice.isVisible(), true);
    assert.equal(await notice.evaluate(el => el.classList.contains("highlighted")), true);
    assert.equal(await page.locator('[data-ann-cat="all"]').evaluate(el => el.classList.contains("active")), true);
    await focusIs(page, `[data-ann-id="${announcement.id}"]`);
  });
  await verify(env, "Cafeteria search clears a prior drinks filter so the entree is actually visible", async () => {
    await go(page, "campus");
    await page.locator('[data-cafe-cat="drink"]').click();
    assert.equal(await page.locator("#cafe-menu-list").getByText(data.entree.name, { exact: true }).count(), 0);
    await openSearch(env);
    await fillSearch(env, data.entree.name);
    await page.locator("#site-search-results").getByText(data.entree.name, { exact: true }).click();
    assert.equal(await page.locator('[data-cafe-cat="all"]').evaluate(el => el.classList.contains("active")), true);
    assert.equal(await page.locator("#cafe-menu-list").getByText(data.entree.name, { exact: true }).isVisible(), true);
    const destination = page.locator("#cafe-menu-list .menu-item").filter({ hasText: data.entree.name });
    await page.waitForFunction(name => Array.from(document.querySelectorAll("#cafe-menu-list .menu-item")).some(el => el.textContent.includes(name) && el === document.activeElement), data.entree.name);
    assert.equal(await destination.evaluate(el => el === document.activeElement), true, "The actual matching dish must receive focus");
  });
}

async function privateExclusion(env) {
  const { page } = env;
  await go(page, "my-anu");
  await verify(env, "Private DOM, stored nickname and stored paper are present but unsearchable", async () => {
    assert.equal(await page.locator("#my-anu-display-name").innerText(), PRIVATE.nickname);
    assert.ok((await page.locator("#my-papers-list").textContent()).includes(PRIVATE.localPaper));
    await page.evaluate(token => {
      const element = document.createElement("p");
      element.id = "qa-private-dom";
      element.textContent = token;
      document.querySelector("#page-my-anu").appendChild(element);
    }, PRIVATE.dom);
    await openSearch(env);
    for (const token of [PRIVATE.dom, PRIVATE.nickname, PRIVATE.localPaper]) {
      await fillSearch(env, token);
      assert.equal(await page.locator(".search-result").count(), 0, `${token} leaked into public search`);
    }
    await closeSearch(env);
  });
  await verify(env, "Signed-in account and cloud records remain excluded; long email and busy controls render", async () => {
    await page.evaluate(({ bundle, email, account }) => window.__qaAuthEmit({ user: { uid: "qa-isolated-user", displayName: account, email }, isRegistered: true, bundleLoaded: true, bundle }), { bundle: CLOUD_BUNDLE, email: LONG_EMAIL, account: PRIVATE.account });
    assert.equal(await page.locator("#my-anu-auth-banner").getAttribute("data-auth-state"), "signed-in");
    assert.ok((await page.locator("#my-anu-status-sub").innerText()).includes(LONG_EMAIL));
    assert.equal(await page.locator("#my-anu-display-name").innerText(), PRIVATE.cloudNickname);
    assert.ok((await page.locator("#my-transcripts-list").textContent()).includes(PRIVATE.cloudExam));
    assert.ok((await page.locator("#my-papers-list").textContent()).includes(PRIVATE.cloudPaper));
    assert.ok((await page.locator("#my-diplomas-list").textContent()).includes(PRIVATE.cloudDiploma));
    for (const id of ["google-signin-btn", "google-signout-btn", "sync-cloud-btn", "import-local-archive-btn"]) assert.equal(await page.locator("#" + id).isVisible(), true, `${id} must remain visible when signed in`);
    await noOverflow(env);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await screenshot(env, "signed-in-long-email");
    await page.evaluate(() => window.__qaAuthEmit({ cloudLoading: true }));
    assert.equal(await page.locator("#sync-cloud-btn").isEnabled(), false);
    assert.equal(await page.locator("#sync-cloud-btn").getAttribute("aria-busy"), "true");
    await page.evaluate(() => window.__qaAuthEmit({ cloudLoading: false }));
    await openSearch(env);
    const before = { requests: env.requests.length, storage: await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, writes: window.__qaStorageWrites.length })) };
    for (const token of [PRIVATE.account, PRIVATE.cloudNickname, PRIVATE.cloudExam, PRIVATE.cloudPaper, PRIVATE.cloudDiploma]) {
      await fillSearch(env, token);
      assert.equal(await page.locator(".search-result").count(), 0, `${token} leaked into public search`);
    }
    assert.equal(env.requests.length, before.requests);
    assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, writes: window.__qaStorageWrites.length })), before.storage);
    await closeSearch(env);
  });
}

async function mobileNavigation(env) {
  const { page } = env;
  await verify(env, "Closed mobile sidebar is hidden/inert and cannot receive focus", async () => {
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.inert), true);
    assert.equal(await page.locator("#uni-sidebar").getAttribute("aria-hidden"), "true");
    await page.locator("#site-search-open").evaluate(el => el.focus());
    assert.equal(await page.locator("#site-search-open").evaluate(el => el === document.activeElement), false);
  });
  await verify(env, "Mobile navigation opens with close focus, traps Tab, and Escape restores menu focus", async () => {
    await page.locator("#mobile-menu-toggle").click();
    await focusIs(page, "#sidebar-close");
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.inert), false);
    assert.equal(await page.locator(".main-stage").evaluate(el => el.inert), true);
    assert.equal(await page.locator("#mobile-menu-toggle").getAttribute("aria-expanded"), "true");
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let index = 0; index < 20; index++) {
        await page.keyboard.press(key);
        assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.contains(document.activeElement)), true, "Sidebar focus escaped");
      }
    }
    await page.locator("#uni-sidebar").evaluate(el => { el.scrollTop = 0; });
    await noOverflow(env, ["#uni-sidebar", ".sidebar-search-trigger", ".sidebar-quick-links"]);
    await screenshot(env, "sidebar-open");
    await page.keyboard.press("Escape");
    await focusIs(page, "#mobile-menu-toggle");
    assert.equal(await page.locator(".main-stage").evaluate(el => el.inert), false);
  });
  await verify(env, "Close button and same-route My ANU quick link both dismiss navigation", async () => {
    await page.locator("#mobile-menu-toggle").click();
    await page.locator("#sidebar-close").click();
    await focusIs(page, "#mobile-menu-toggle");
    await go(page, "my-anu");
    await page.locator("#mobile-menu-toggle").click();
    await page.locator('.sidebar-quick-links a[href="#my-anu"]').click();
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.classList.contains("open")), false);
    assert.equal(await page.locator(".main-stage").evaluate(el => el.inert), false);
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.inert), true);
  });
  await verify(env, "Sidebar search closes navigation; closing its dialog restores the menu trigger", async () => {
    await page.locator("#mobile-menu-toggle").click();
    await openSearch(env, "#site-search-open");
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.inert), true);
    assert.equal(await page.locator(".main-stage").evaluate(el => el.inert), false);
    await closeSearch(env);
    await focusIs(page, "#mobile-menu-toggle");
  });
  await verify(env, "Resizing an open mobile sidebar restores desktop navigation and mobile inert state", async () => {
    await page.locator("#mobile-menu-toggle").click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForFunction(() => !document.querySelector(".main-stage").inert && !document.querySelector("#uni-sidebar").inert);
    assert.equal(await page.locator("#uni-sidebar").evaluate(el => el.classList.contains("open")), false);
    await page.setViewportSize({ width: env.width, height: env.height });
    await page.waitForFunction(() => document.querySelector("#uni-sidebar").inert);
    assert.equal(await page.locator(".main-stage").evaluate(el => el.inert), false);
  });
}

async function runScenario(browser, base, options, action) {
  const { lang, width, height = 1000, theme = "light", deviceScaleFactor = 1 } = options;
  const name = `${lang}-${width}-${theme}${deviceScaleFactor !== 1 ? "-dpr" + deviceScaleFactor : ""}${height !== (width === 390 ? 900 : 1000) ? "-h" + height : ""}`;
  if (process.env.ANU_SITE_SEARCH_SCENARIO && !name.startsWith(process.env.ANU_SITE_SEARCH_SCENARIO)) return;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, locale: lang === "zh" ? "zh-CN" : "en-US", colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block" });
  const env = { name, lang, width, height, theme, requests: [], errors: [], unexpectedExternal: [], context };
  try {
    await context.addInitScript(({ lang, theme, storage }) => {
      localStorage.setItem("anu_lang", lang);
      if (theme === "dark") localStorage.setItem("anu_theme_preference", "dark");
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      window.__qaStorageWrites = [];
      const setItem = Storage.prototype.setItem;
      const removeItem = Storage.prototype.removeItem;
      const clear = Storage.prototype.clear;
      Storage.prototype.setItem = function (key, value) { window.__qaStorageWrites.push({ operation: "set", key: String(key), value: String(value) }); return setItem.call(this, key, value); };
      Storage.prototype.removeItem = function (key) { window.__qaStorageWrites.push({ operation: "remove", key: String(key) }); return removeItem.call(this, key); };
      Storage.prototype.clear = function () { window.__qaStorageWrites.push({ operation: "clear" }); return clear.call(this); };
      window.__qaFocusLog = [];
      document.addEventListener("focusin", event => window.__qaFocusLog.push({ action: "focusin", id: event.target.id, tag: event.target.tagName }));
      document.addEventListener("focusout", event => window.__qaFocusLog.push({ action: "focusout", id: event.target.id, tag: event.target.tagName }));
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (...args) {
        const result = focus.apply(this, args);
        window.__qaFocusLog.push({ action: "focus-call", id: this.id, tag: this.tagName, active: document.activeElement.id || document.activeElement.tagName, ancestorInert: this.closest("[inert]")?.id, display: getComputedStyle(this).display, visibility: getComputedStyle(this).visibility, disabled: this.disabled });
        return result;
      };
    }, { lang, theme, storage: STORAGE });
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === base && url.pathname === "/js/student-auth.js") return route.fulfill({ contentType: "application/javascript", body: AUTH_FIXTURE });
      if (url.origin === base) return route.continue();
      if (url.hostname === "fonts.googleapis.com") return route.fulfill({ contentType: "text/css", body: "/* Isolated fixture: system-font fallback. */" });
      // These are defensive fixture routes, even though ANU_AUTH bypasses SDK/API loading.
      if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) return route.fulfill({ contentType: "application/javascript", body: "/* Firebase disabled by ANU_AUTH fixture. */" });
      if (url.hostname === "challenges.cloudflare.com") return route.fulfill({ contentType: "application/javascript", body: "window.turnstile={render(){return 0},remove(){},reset(){}};" });
      env.unexpectedExternal.push({ method: route.request().method(), url: url.origin + url.pathname });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "ISOLATED_FIXTURE", message: "External services disabled" } }) });
    });
    const page = env.page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on("request", request => { if (/^https?:/.test(request.url())) env.requests.push({ method: request.method(), url: request.url() }); });
    page.on("pageerror", error => env.errors.push(error.message));
    page.on("console", message => { if (["error", "warning"].includes(message.type())) env.errors.push(message.type() + ": " + message.text()); });
    await page.goto(base + "/#my-anu", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.ANU_AUTH && window.ANU_SEARCH && document.querySelectorAll("#announcements-list [data-ann-id]").length > 0);
    await verify(env, "Page identity, meaningful UI, no framework overlay, and expected explicit/default theme", async () => {
      assert.equal(new URL(page.url()).origin, base);
      assert.match(await page.title(), /Absolutely Nothing University/);
      assert.ok((await page.locator("#page-my-anu").innerText()).length > 200);
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
      assert.doesNotMatch(await page.locator("body").innerText(), /Application error|Internal Server Error|webpack error/i);
      assert.equal(await page.locator("#site-search-input").getAttribute("placeholder"), await page.evaluate(lang => ANU_DATA.i18nDict[lang].search_placeholder, lang));
      assert.equal(await page.locator("#mobile-search-open").getAttribute("aria-label"), await page.evaluate(lang => ANU_DATA.i18nDict[lang].search_open, lang));
    });
    await action(env);
    assert.deepEqual(env.errors, [], "Unexpected browser console/runtime errors");
    assert.deepEqual(env.unexpectedExternal, [], "Unexpected external request (all external traffic was fulfilled locally)");
    summary.scenarios.push({ name, result: "PASS", requests: env.requests.length });
  } catch (error) {
    summary.failures.push({ scenario: name, message: error.message, stack: error.stack });
    summary.scenarios.push({ name, result: "FAIL" });
    if (env.page) try { await screenshot(env, "FAILURE"); } catch (_) {}
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    summary.errors.push(...env.errors.map(message => ({ scenario: name, message })));
    summary.unexpectedExternal.push(...env.unexpectedExternal.map(request => ({ scenario: name, ...request })));
    await context.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true, mode: 0o700 });
  const server = await staticServer();
  const base = summary.base = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await playwright.chromium.launch({ channel: process.env.ANU_CHROME_CHANNEL || "chrome", headless: true });
    summary.browserVersion = browser.version();
    for (const lang of ["zh", "en"]) for (const width of [390, 768, 1440]) for (const theme of ["light", "dark"]) {
      await runScenario(browser, base, { lang, width, height: width === 390 ? 900 : 1000, theme }, async env => {
        await verify(env, "Responsive My ANU auth layout fits the viewport and preserves guest/busy/private states", async () => {
          await noOverflow(env);
          const panels = await env.page.locator("#my-anu-auth-banner").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
          assert.equal(panels, width <= 900 ? 1 : 2);
          assert.equal(await env.page.locator(".my-anu-auth-benefits li").count(), 2);
          assert.equal(await env.page.locator("#google-signout-btn").isVisible(), false);
          assert.equal(await env.page.locator("#sync-cloud-btn").isVisible(), false);
          await env.page.evaluate(() => window.__qaAuthEmit({ authSigningIn: true }));
          assert.equal(await env.page.locator("#google-signin-btn").isEnabled(), false);
          assert.equal(await env.page.locator("#google-signin-btn").getAttribute("aria-busy"), "true");
          assert.equal(await env.page.locator("#my-anu-auth-state").innerText(), await env.page.evaluate(lang => ANU_DATA.i18nDict[lang].my_auth_status_pending, lang));
          await env.page.evaluate(() => window.__qaAuthEmit({ authSigningIn: false }));
          if (theme === "light") {
            const toggle = width <= 980 ? "#mobile-theme-btn" : "#theme-switch-btn";
            await env.page.locator(toggle).click();
            assert.equal(await env.page.locator("html").getAttribute("data-theme"), "dark");
            await env.page.locator(toggle).click();
            assert.equal(await env.page.locator("html").getAttribute("data-theme"), "light");
            assert.equal(await env.page.evaluate(() => localStorage.getItem("anu_theme_preference")), "light");
          }
          await env.page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await screenshot(env, "login");
        });
        if (theme === "light" && width === 1440) {
          await navigation(env);
          await searchBasics(env);
          await searchDestinations(env);
          await privateExclusion(env);
        } else if (theme === "light" && width === 390) {
          await mobileNavigation(env);
          await searchBasics(env);
          await searchDestinations(env);
          await privateExclusion(env);
        } else {
          await verify(env, "Search modal and sidebar fit this language/theme/viewport", async () => {
            await openSearch(env);
            await fillSearch(env, "NTH-101");
            assert.equal(await env.page.locator(".search-result").count(), 1);
            await noOverflow(env, ["#site-search-dialog", "#site-search-form", "#site-search-results"]);
            if (width === 768 || theme === "dark") await screenshot(env, "search");
            await closeSearch(env);
            if (width <= 980) {
              await env.page.locator("#mobile-menu-toggle").click();
              await noOverflow(env, ["#uni-sidebar", ".sidebar-search-trigger", ".sidebar-quick-links"]);
              if (width === 768) await screenshot(env, "sidebar-open");
              await env.page.locator("#sidebar-close").click();
            }
          });
        }
      });
      console.log(`Completed ${lang}/${width}/${theme}`);
    }
    await runScenario(browser, base, { lang: "zh", width: 393, height: 589, theme: "light", deviceScaleFactor: 3 }, async env => {
      await verify(env, "Native reference-size sidebar capture is exactly 1179 × 1767 pixels", async () => {
        await env.page.locator("#mobile-menu-toggle").click();
        await noOverflow(env, ["#uni-sidebar", ".sidebar-search-trigger", ".sidebar-quick-links"]);
        const shot = await screenshot(env, "reference-native-sidebar");
        assert.equal(shot.width, 1179);
        assert.equal(shot.height, 1767);
      });
    });
    for (const [width, height] of [[1440, 500], [390, 320]]) {
      await runScenario(browser, base, { lang: "en", width, height, theme: "light" }, async env => {
        await verify(env, "Search dialog fits a short viewport and keeps its results scrollable", async () => {
          await openSearch(env);
          await fillSearch(env, "");
          const geometry = await env.page.locator("#site-search-dialog").evaluate(dialog => {
            const rect = dialog.getBoundingClientRect();
            const results = document.querySelector("#site-search-results");
            return { top: rect.top, bottom: rect.bottom, viewport: innerHeight, client: results.clientHeight, scroll: results.scrollHeight, overflow: getComputedStyle(results).overflowY };
          });
          assert.ok(geometry.top >= -1 && geometry.bottom <= geometry.viewport + 1, JSON.stringify(geometry));
          assert.ok(geometry.scroll > geometry.client && geometry.client > 0, JSON.stringify(geometry));
          assert.equal(geometry.overflow, "auto");
          await screenshot(env, "short-viewport-search");
        });
      });
    }
    summary.result = summary.failures.length ? "FAIL" : "PASS";
  } finally {
    summary.finishedAt = new Date().toISOString();
    const filename = path.join(OUT, "results.json");
    fs.writeFileSync(filename, JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
    console.log(JSON.stringify({ result: summary.result, passedChecks: summary.checks.filter(check => check.result === "PASS").length, failures: summary.failures.map(failure => ({ scenario: failure.scenario, message: failure.message })), screenshots: summary.screenshots.length, results: filename }, null, 2));
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  if (summary.failures.length) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
