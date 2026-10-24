/*
 * Real Chrome rendering with local static files and isolated Firebase, Worker,
 * Turnstile and web-font fixtures. This is NOT a production integration test.
 * The iPhone Safari scenario changes UA/viewport only; it still uses Chromium.
 * Run: node tests/browser-regression.cjs (Chrome + Playwright must be installed).
 * Optional: PLAYWRIGHT_MODULE=/absolute/module ANU_CHROME_CHANNEL=chrome
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }
catch (error) {
  const bundled = path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
  try { playwright = require(bundled); }
  catch (_) { throw new Error("Playwright is required. Set PLAYWRIGHT_MODULE to an existing installation. " + error.message); }
}

const ROOT = path.resolve(__dirname, "..");
const BASE = "http://localhost:8088";
const OUT = process.env.ANU_BROWSER_EVIDENCE_DIR || "/tmp/anu-browser-regression";
const API = "https://api.freeze.edu.kg";
const SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
fs.mkdirSync(OUT, { recursive: true });

const localFixtures = {
  anu_lang: "zh",
  anu_local_profile: JSON.stringify({ nickname: "本机游客档案", avatarSeed: "crest-oxford", visibility: "private" }),
  anu_local_exams: JSON.stringify([{ courseCode: "LOCAL-101", courseTitleZh: "本机游客课程", courseTitleEn: "Device Guest Course", score: 50, grade: "B+", gradeLabelZh: "游客成绩", gradeLabelEn: "Guest Grade", verdictZh: "本机游客评语", verdictEn: "Device guest feedback", createdAt: "2026-10-19" }]),
  anu_local_papers: JSON.stringify([{ title: "本机游客论文", author: "游客作者", void_id: "VOID-ID:LOCAL", journal_zh: "游客期刊" }]),
  anu_local_diplomas: JSON.stringify([{ recipientName: "本机游客证书", degreeZh: "本机学位", degreeEn: "Guest Degree", serialNumber: "ANU-LOCAL-DIPLOMA", issuedDate: "2026-10-19" }]),
  anu_joined_clubs: JSON.stringify(["local-fixture-badge"])
};

function makeBundle(uid, populated = false) {
  const nickname = uid === "second-user" ? "第二账号云端" : "第一账号云端";
  return {
    profile: { nickname, studentNumber: uid === "second-user" ? "ANU-2026-SECOND" : "ANU-2026-FIRST1", avatarSeed: "crest-oxford", visibility: "private", publicConsent: false, college: "retreat", collegeNameZh: "退堂鼓学院", collegeNameEn: "Retreat College", major: "虚无学", enrollmentYear: 2026, enrollmentDate: "2026-10-19", fictionalHonor: "Test Honor" },
    transcripts: populated ? [{ id: "cloud-exam", course_code: "CLOUD-101", course_title_zh: "云端原始课程", course_title_en: "Original Cloud Course", score: 0, grade: "F", grade_label_zh: "云端原始零分", grade_label_en: "Original cloud zero score", verdict_zh: "云端原始评语与完整结尾", verdict_en: "Original cloud feedback and complete ending", created_at: "2026-10-19" }] : [],
    papers: populated ? [{ id: "cloud-paper", title: "云端论文完整标题与结尾 🧑🏽‍🎓", author_display: nickname, void_id: "VOID-ID:CLOUD", journal_zh: "虚构云端期刊", journal_en: "Fictional Cloud Journal", content_zh: "零字数手稿说明", content_en: "A zero-word manuscript", footnote_zh: "此证明仅供娱乐", footnote_en: "For entertainment only", reviewer_header_zh: "同行评审", reviewer_header_en: "Peer Review", review_zh: "完整审稿评语与结尾", review_en: "Complete review and ending", created_at: "2026-10-19" }] : [],
    diplomas: populated ? [{ id: "cloud-diploma", recipient_name: nickname, degree_zh: "云端虚无学博士", degree_en: "Cloud Doctor of Nothing", major_zh: "云端拖延学", major_en: "Cloud Procrastination", honor_zh: "最高睡眠荣誉", honor_en: "Summa Cum Somno", serial_number: "ANU-CLOUD-DIPLOMA", issued_date: "2026-10-19", template_id: "oxford", cert_lang: "zh", is_stamped: 1 }] : [],
    honors: populated ? [{ badge_key: "cloud-badge", title_zh: "云端勋章", title_en: "Cloud Badge", desc_zh: "云端记录", desc_en: "Cloud record" }] : []
  };
}

const SDK = `
const state=window.__qaFirebase||(window.__qaFirebase={listeners:[],auth:{currentUser:null},signOuts:0,popups:[]});
function makeUser(uid){return uid?{uid,displayName:'模拟Google用户',email:uid+'@example.invalid',getIdToken:async(force)=>'fixture-token-'+uid}:null;}
if(!state.initialized){state.auth.currentUser=makeUser(window.__qaInitialUID);state.initialized=true;}
window.__qaEmitUser=async(uid)=>{state.auth.currentUser=makeUser(uid);await Promise.all(state.listeners.map(fn=>fn(state.auth.currentUser)));};
export function initializeApp(config){return config;}
export function getAuth(){return state.auth;}
export const indexedDBLocalPersistence={};export const browserLocalPersistence={};
export async function setPersistence(){} export async function getRedirectResult(){return null;}
export function onAuthStateChanged(auth,fn){state.listeners.push(fn);queueMicrotask(()=>fn(auth.currentUser));return ()=>{};}
export class GoogleAuthProvider{setCustomParameters(value){state.parameters=value;}}
export async function signInWithPopup(auth,provider){state.popups.push({active:navigator.userActivation.isActive,parameters:state.parameters});if(window.__qaPopupError){throw Object.assign(new Error(window.__qaPopupError),{code:window.__qaPopupError});}await window.__qaEmitUser(window.__qaNextUID||'first-user');return {user:auth.currentUser};}
export async function signInWithRedirect(){throw new Error('Cross-origin redirect must not be used in this test');}
export async function signOut(auth){state.signOuts++;await window.__qaEmitUser(null);}
`;
const TURNSTILE = `window.__qaChallenges={};window.turnstile={render(el,opts){window.__qaChallenges[opts.action]=opts;el.textContent='Security check (isolated fixture)';return el.id;},remove(id){const el=document.getElementById(id);if(el)el.textContent='';},reset(){window.__qaResetCount=(window.__qaResetCount||0)+1;}};`;

async function ensureStaticServer() {
  try {
    const response = await fetch(BASE + "/index.html");
    if (response.ok && (await response.text()).includes("Absolutely Nothing University")) return null;
  } catch (_) {}
  const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, BASE).pathname);
    const filename = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403); return response.end(); }
    fs.readFile(filename, (error, content) => {
      response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" });
      response.end(error ? "Not found" : content);
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(8088, "127.0.0.1", resolve); });
  return server;
}

async function setupContext(browser, { initialUID = "first-user", userAgent, viewport = { width: 1440, height: 1000 } } = {}) {
  const context = await browser.newContext({ viewport, userAgent, locale: "zh-CN", reducedMotion: "reduce", acceptDownloads: true, colorScheme: "dark" });
  const fixture = { requests: [], errors: [], expectedFailures: [], unexpectedRemote: [], syncUnavailable: false, deleteMode: "fail", deletedUIDs: new Set(), bundles: { "first-user": makeBundle("first-user"), "second-user": makeBundle("second-user", true) } };
  await context.addInitScript(({ initialUID, localFixtures }) => {
    window.__qaInitialUID = initialUID;
    // Seed once per isolated browser context; deletion and reload checks must
    // observe the resulting storage, rather than silently re-seeding it.
    if (!localStorage.getItem("anu_qa_seeded")) {
      for (const [key, value] of Object.entries(localFixtures)) localStorage.setItem(key, value);
      localStorage.setItem("anu_qa_seeded", "yes");
    }
    window.__qaCanvasText = [];
    window.__qaCanvasDraws = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(value, x, y, ...rest) {
      window.__qaCanvasText.push(String(value));
      const transform = this.getTransform();
      const width = this.measureText(value).width;
      const left = x - (this.textAlign === "center" ? width / 2 : this.textAlign === "right" ? width : 0);
      window.__qaCanvasDraws.push({ text: String(value), left: transform.a * left + transform.e, right: transform.a * (left + width) + transform.e, y: transform.d * y + transform.f, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height, rotated: transform.b !== 0 || transform.c !== 0 });
      return original.call(this, value, x, y, ...rest);
    };
  }, { initialUID, localFixtures });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === BASE || url.origin === "http://127.0.0.1:8088") return route.continue();
    if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) return route.fulfill({ contentType: "application/javascript", body: SDK });
    if (url.hostname === "challenges.cloudflare.com" && url.pathname.startsWith("/turnstile/")) return route.fulfill({ contentType: "application/javascript", body: TURNSTILE });
    if (url.hostname === "fonts.googleapis.com") return route.fulfill({ contentType: "text/css", body: "/* Web fonts isolated: system font fallback exercised. */" });
    if (url.origin === API) {
      const method = request.method();
      const uid = (request.headers().authorization || "").replace("Bearer fixture-token-", "");
      const requestInfo = { path: url.pathname, method, uid, headers: request.headers(), body: request.postData() ? request.postDataJSON() : null };
      fixture.requests.push(requestInfo);
      const fulfill = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (method === "GET" && url.pathname === "/api/v1/me/export") {
        return fulfill({ ok: true, exportedAt: "2026-10-19T00:00:00Z", data: fixture.bundles[uid] });
      }
      if (method === "GET" && url.pathname === "/api/v1/me") {
        if (fixture.syncUnavailable) return fulfill({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Fixture Worker unavailable" } }, 503);
        const registered = !fixture.deletedUIDs.has(uid);
        return fulfill({ ok: true, registered, data: registered ? fixture.bundles[uid] : null });
      }
      if (method === "DELETE" && url.pathname === "/api/v1/me") {
        if (fixture.deleteMode === "fail") return fulfill({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "Fixture deletion failed" } }, 503);
        if (fixture.deleteMode === "unconfirmed") return fulfill({ ok: true, deleted: false });
        fixture.deletedUIDs.add(uid);
        return fulfill({ ok: true, deleted: true });
      }
      if (method === "POST" && url.pathname === "/api/v1/me/import") return fulfill({ ok: true, data: fixture.bundles[uid], importedSummary: { clubsAndBadges: 1, exams: 1, papers: 1, diplomas: 1 } });
      throw new Error(`Unexpected simulated API request: ${method} ${url.pathname}`);
    }
    fixture.unexpectedRemote.push(request.url());
    return route.fulfill({ status: 200, contentType: "text/plain", body: "isolated external resource" });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => fixture.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location().url;
    if (location.startsWith(API) && /503|Failed to load resource/.test(message.text())) fixture.expectedFailures.push(message.text());
    else fixture.errors.push(message.text());
  });
  await page.goto(BASE + "/#my-anu");
  await page.waitForFunction(() => window.ANU_AUTH && window.ANU_AUTH.getState().authReady);
  if (initialUID) await page.waitForFunction(() => window.ANU_AUTH.getState().bundleLoaded);
  assert.match(await page.title(), /Absolutely Nothing University/);
  assert.equal(await page.locator("#page-my-anu").isVisible(), true);
  assert.ok((await page.locator("#page-my-anu").innerText()).length > 200, "Meaningful content must render");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light", "System dark mode must keep the default blue/white theme");
  return { page, context, fixture };
}

async function waitForFeedback(page, pattern) {
  await page.waitForFunction((pattern) => new RegExp(pattern).test(document.querySelector("#my-anu-global-feedback").textContent), pattern.source);
}
async function assertLocalIntact(page) {
  const storage = await page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), Object.keys(localFixtures).filter((key) => key !== "anu_lang"));
  for (const [key, value] of Object.entries(storage)) assert.equal(value, localFixtures[key], `Cloud action must preserve device storage ${key}`);
}
async function snapshot(page, name) {
  const filename = path.join(OUT, name + ".png");
  await page.screenshot({ path: filename, fullPage: false });
  return filename;
}
async function download(page, action, filename) {
  const pending = page.waitForEvent("download");
  await action();
  const result = await pending;
  assert.equal(await result.failure(), null, "Download must complete");
  const target = path.join(OUT, filename);
  await result.saveAs(target);
  return target;
}
async function assertPNG(page, filename, expectedTexts) {
  const png = fs.readFileSync(filename);
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.ok(width >= 1200 && height >= 860 && width * height <= 12000000);
  const decoded = await page.evaluate(async (base64) => {
    const image = new Image(); image.src = "data:image/png;base64," + base64; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    const pixel = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bluePixels = 0;
    for (let index = 0; index < pixels.length; index += 64) if (pixels[index + 2] > pixels[index] + 20 && pixels[index] < 160) bluePixels++;
    return { pixel, bluePixels };
  }, png.toString("base64"));
  assert.ok(decoded.pixel.slice(0, 3).every((value) => value > 220), "Export has an opaque light background independent of page theme");
  assert.equal(decoded.pixel[3], 255);
  assert.ok(decoded.bluePixels > 100, "Real decoded PNG must contain academic blue drawing/text");
  const bounds = await page.evaluate(() => window.__qaCanvasDraws.filter((line) => !line.rotated && (line.left < 60 || line.right > line.canvasWidth - 60 || line.y < 50 || line.y > line.canvasHeight - 50)));
  assert.deepEqual(bounds, [], "Actual canvas text bounds must stay inside the image frame");
  const drawn = await page.evaluate(() => window.__qaCanvasText.join("").replace(/\s/g, ""));
  for (const expected of expectedTexts) assert.ok(drawn.includes(expected.replace(/\s/g, "")), `Actual canvas drawing must include ${expected}`);
  return { filename, width, height, bytes: png.length };
}

async function main() {
  const server = await ensureStaticServer();
  let browser;
  const summary = { result: "FAIL", mode: "Local actual Chrome rendering; Firebase/API/Turnstile mocked; system fonts; Safari UA is Chromium, not physical Safari", base: BASE, browserPlugin: "Browser plugin skill unavailable; requested independent Chrome/Playwright", checks: [], screenshots: [], png: [] };
  try {
    browser = await playwright.chromium.launch({ channel: process.env.ANU_CHROME_CHANNEL || "chrome", headless: true });
    const { page, context, fixture } = await setupContext(browser);
    assert.equal(await page.locator("#archive-source-select").inputValue(), "cloud");
    assert.equal(await page.locator("#my-anu-registration-panel").isVisible(), false);
    await page.waitForFunction(() => window.__qaChallenges && window.__qaChallenges.import);
    await page.evaluate(() => window.__qaChallenges.import.callback("fixture-import-token"));
    assert.equal(await page.evaluate(() => window.ANU_AUTH.getTurnstileToken()), "fixture-import-token");
    await page.evaluate(() => window.__qaChallenges.import["expired-callback"]());
    assert.equal(await page.evaluate(() => window.ANU_AUTH.getTurnstileToken()), "", "Expired fixture token must leave client state");
    for (const id of ["transcripts", "papers", "diplomas", "honors"]) {
      assert.equal(await page.locator(`#my-${id}-list article`).count(), 0, "Empty cloud lists must never fall back to device records");
      assert.doesNotMatch(await page.locator(`#my-${id}-list`).textContent(), /本机游客|local-fixture-badge/);
    }
    await page.locator("#archive-source-select").selectOption("local");
    assert.match(await page.locator("#my-transcripts-list").textContent(), /本机游客课程/);
    assert.match(await page.locator("#my-papers-list").textContent(), /本机游客论文/);
    assert.match(await page.locator("#my-diplomas-list").textContent(), /本机游客证书/);
    assert.match(await page.locator("#my-honors-list").textContent(), /local-fixture-badge/);
    const beforeExport = fixture.requests.filter((req) => req.path.endsWith("/export")).length;
    const deviceExport = await download(page, () => page.locator("#export-archive-btn").click(), "device-archive.json");
    const deviceJSON = JSON.parse(fs.readFileSync(deviceExport));
    assert.equal(deviceJSON.source, "device");
    assert.equal(deviceJSON.data.transcripts[0].courseCode, "LOCAL-101");
    assert.equal(fixture.requests.filter((req) => req.path.endsWith("/export")).length, beforeExport, "Local export must not request a cloud archive");
    await page.reload();
    await page.waitForFunction(() => window.ANU_AUTH.getState().bundleLoaded);
    assert.equal(await page.locator("#archive-source-select").inputValue(), "cloud", "Source defaults to cloud after reload");
    await page.locator("#archive-source-select").selectOption("local");
    await page.evaluate(() => { window.__qaNextUID = "second-user"; });
    assert.match(await page.locator("#google-signin-btn").textContent(), /切换 Google 账号/);
    await page.locator("#google-signin-btn").click();
    await page.waitForFunction(() => window.ANU_AUTH.getState().bundle && window.ANU_AUTH.getState().bundle.profile.nickname === "第二账号云端");
    assert.equal(await page.locator("#archive-source-select").inputValue(), "cloud", "Account change resets source to the current cloud account");
    assert.match(await page.locator("#my-transcripts-list").textContent(), /云端原始课程/);
    assert.doesNotMatch(await page.locator("#my-transcripts-list").textContent(), /本机游客课程/);
    const cloudExport = await download(page, () => page.locator("#export-archive-btn").click(), "cloud-archive.json");
    const cloudJSON = JSON.parse(fs.readFileSync(cloudExport));
    assert.equal(cloudJSON.source, "cloud");
    assert.equal(cloudJSON.data.profile.nickname, "第二账号云端");
    assert.ok(fixture.requests.some((req) => req.path === "/api/v1/me/export" && req.method === "GET" && req.uid === "second-user"));
    summary.checks.push("Empty cloud/device separation, explicit source switch, reload/account source reset, real JSON cloud/device downloads");

    const firstTab = page.locator("#my-tab-transcripts");
    await firstTab.focus(); await page.keyboard.press("End");
    assert.equal(await page.locator("#my-tab-settings").getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#my-tab-settings").evaluate((el) => el === document.activeElement), true);
    assert.equal(await page.locator("#my-tab-pane-settings").getAttribute("role"), "tabpanel");
    assert.equal(await page.locator("#my-tab-pane-settings").getAttribute("aria-labelledby"), "my-tab-settings");
    await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#my-tab-papers").getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#my-tab-pane-transcripts").getAttribute("hidden"), "");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await firstTab.getAttribute("aria-selected"), "true");
    assert.equal(await page.locator('[data-my-tab][tabindex="0"]').count(), 1);
    summary.checks.push("ARIA tab/tabpanel relationships, single keyboard tab stop, ArrowLeft/ArrowRight/Home/End focus and pane switching");

    for (const [tab, filename, expected] of [
      ["transcripts", "transcript.png", ["云端原始课程", "成绩：0 / 100", "云端原始评语与完整结尾", "第二账号云端"]],
      ["papers", "paper.png", ["云端论文完整标题与结尾 🧑🏽‍🎓", "完整审稿评语与结尾", "第二账号云端"]],
      ["diplomas", "diploma.png", ["云端虚无学博士", "最高睡眠荣誉", "第二账号云端"]]
    ]) {
      await page.locator(`#my-tab-${tab}`).click();
      await page.evaluate(() => { window.__qaCanvasText = []; window.__qaCanvasDraws = []; });
      const button = page.locator(`#my-${tab}-list .archive-png-btn`).first();
      const target = await download(page, () => button.click(), filename);
      summary.png.push(await assertPNG(page, target, expected));
      await page.waitForFunction((selector) => !document.querySelector(selector).disabled, `#my-${tab}-list .archive-png-btn`);
    }
    const longName = "长姓名与完整英文 Long Student 👨‍👩‍👧‍👦 ".repeat(7) + "姓名终点";
    const longDegree = "A Very Long Degree of Nothingness 虚无学博士 ".repeat(6) + "学位终点";
    const longCitation = "This full citation must remain readable. 完整评语与字符 🧑🏽‍🎓 ".repeat(16) + "评语终点";
    await page.evaluate(() => { window.__qaCanvasText = []; window.__qaCanvasDraws = []; });
    const longDiploma = await download(page, () => page.evaluate(({ recipient, degree, citationText }) => window.ANU_CANVAS.downloadDiplomaPNG({ recipient, degree, citationText, template: "parchment", certLang: "bilingual", majorLine: "Long Content Regression", honorLine: "With Complete Text" }), { recipient: longName, degree: longDegree, citationText: longCitation }), "diploma-long-content.png");
    const longMetadata = await assertPNG(page, longDiploma, [longName, longDegree, longCitation]);
    assert.ok(longMetadata.height > 1720, "Real browser export must grow for complete long content");
    summary.png.push(longMetadata);
    await page.evaluate(() => { window.__qaOriginalToBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); }; });
    await page.locator("#my-diplomas-list .archive-png-btn").click();
    await waitForFeedback(page, /PNG 导出失败/);
    assert.equal(await page.locator("#my-diplomas-list .archive-png-btn").isEnabled(), true);
    await page.locator("#lang-switch-btn").click();
    assert.doesNotMatch(await page.locator("#my-anu-global-feedback").textContent(), /[\u3400-\u9FFF]/u, "Switching to English must remove stale Chinese export feedback");
    await page.locator("#my-diplomas-list .archive-png-btn").click();
    await waitForFeedback(page, /^PNG export failed/);
    assert.doesNotMatch(await page.locator("#my-anu-global-feedback").textContent(), /[\u3400-\u9FFF]/u, "An English PNG error must use localized wording");
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.__qaOriginalToBlob; });
    await page.locator("#lang-switch-btn").click();
    summary.checks.push("Three real PNG types and a long-content parchment diploma decode with light background/blue pixels, complete fields and measured frame bounds; PNG failure feedback/re-enabled control");

    await page.locator("#my-tab-transcripts").click();
    for (const width of [320, 360, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      // Chromium can expose the new innerWidth before applying resize styles.
      // Wait for the shell breakpoint, then inspect actual content boundaries.
      await page.waitForFunction(() => {
        const mobile = matchMedia("(max-width: 980px)").matches;
        const headerVisible = getComputedStyle(document.querySelector(".mobile-topbar")).display !== "none";
        const margin = parseFloat(getComputedStyle(document.querySelector(".main-stage")).marginLeft);
        return mobile === headerVisible && (mobile ? margin === 0 : margin > 0);
      });
      for (const lang of ["zh", "en"]) {
        if ((await page.locator("html").getAttribute("lang")).startsWith("zh") !== (lang === "zh")) await page.locator(width < 960 ? "#mobile-lang-btn" : "#lang-switch-btn").click();
        for (const theme of ["light", "dark"]) {
          if (await page.locator("html").getAttribute("data-theme") !== theme) await page.locator(width < 960 ? "#mobile-theme-btn" : "#theme-switch-btn").click();
          assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
          assert.equal(await page.evaluate(() => localStorage.getItem("anu_theme_preference")), theme === "light" && width === 320 && lang === "zh" ? null : theme);
          const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, bad: Array.from(document.querySelectorAll("#page-my-anu *")).filter((el) => { const r = el.getBoundingClientRect(); const style = getComputedStyle(el); return r.width && style.display !== "none" && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 8).map((el) => ({ tag: el.tagName, id: el.id, class: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })) }));
          assert.ok(overflow.scroll <= width + 1, `No horizontal document overflow at ${width}/${lang}/${theme}: ${JSON.stringify(overflow)}`);
          assert.deepEqual(overflow.bad, [], `No clipped off-screen content at ${width}/${lang}/${theme}`);
          await page.evaluate(() => scrollTo(0, 0));
          summary.screenshots.push(await snapshot(page, `my-anu-${width}-${lang}-${theme}`));
          if (width === 390) {
            await page.locator("#archive-source-select").scrollIntoViewIfNeeded();
            summary.screenshots.push(await snapshot(page, `my-anu-archive-${width}-${lang}-${theme}`));
          }
        }
      }
    }
    summary.checks.push("320/360/390/430/768/1440 px x Chinese/English x manual light/dark: no document or element overflow and screenshot evidence");

    // Restore desktop Chinese for unambiguous deletion UI assertions.
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (!(await page.locator("html").getAttribute("lang")).startsWith("zh")) await page.locator("#lang-switch-btn").click();
    await page.locator("#my-tab-settings").click();
    await page.locator("#delete-account-confirm-input").fill("DELETE_MY_ANU_ARCHIVE");
    for (const mode of ["fail", "unconfirmed"]) {
      fixture.deleteMode = mode;
      const deleteResponse = page.waitForResponse((response) => response.request().method() === "DELETE" && response.url() === API + "/api/v1/me");
      await page.locator("#delete-account-btn").click();
      await deleteResponse;
      await page.waitForFunction(() => !window.ANU_AUTH.getState().cloudSaving && !document.querySelector("#delete-account-btn").disabled);
      await waitForFeedback(page, /删除未确认成功/);
      await assertLocalIntact(page);
      assert.equal(await page.evaluate(() => window.ANU_AUTH.getState().isRegistered), true);
      assert.equal(await page.locator("#my-anu-registration-panel").isVisible(), false);
      assert.equal(await page.locator("#delete-account-confirm-input").inputValue(), "DELETE_MY_ANU_ARCHIVE");
      assert.doesNotMatch(await page.locator("#my-anu-global-feedback").textContent(), /^✓/);
    }
    summary.screenshots.push(await snapshot(page, "delete-failed-records-retained"));
    fixture.deleteMode = "success";
    await page.locator("#delete-account-btn").click();
    await waitForFeedback(page, /本人 ANU 云端校园档案已删除/);
    await assertLocalIntact(page);
    const deletedState = await page.evaluate(() => ({ user: window.ANU_AUTH.getState().user.uid, registered: window.ANU_AUTH.getState().isRegistered, signOuts: window.__qaFirebase.signOuts, sdkUser: window.__qaFirebase.auth.currentUser.uid }));
    assert.deepEqual(deletedState, { user: "second-user", registered: false, signOuts: 0, sdkUser: "second-user" });
    assert.equal(await page.locator("#my-transcripts-list article").count(), 0);
    assert.equal(await page.locator("#my-anu-registration-panel").isVisible(), true);
    summary.screenshots.push(await snapshot(page, "delete-cloud-only-google-retained"));
    summary.checks.push("503 and unconfirmed DELETE preserve device records/cloud identity and show no false success; confirmed DELETE removes cloud archive only and preserves Firebase/Google session");
    assert.deepEqual(fixture.errors, [], "Main context must have no unexpected console/page errors");
    assert.deepEqual(fixture.unexpectedRemote, [], "External requests must be explicitly isolated");
    await context.close();

    for (const safari of [false, true]) {
      const { page: guest, context: guestContext, fixture: guestFixture } = await setupContext(browser, { initialUID: null, userAgent: safari ? SAFARI_UA : undefined, viewport: safari ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
      assert.equal(await guest.locator("#archive-source-select").inputValue(), "local");
      assert.equal(await guest.locator("#archive-source-select").isDisabled(), true);
      assert.match(await guest.locator("#my-transcripts-list").textContent(), /本机游客课程/);
      await guest.evaluate(() => { window.__qaPopupError = "auth/popup-closed-by-user"; });
      await guest.locator("#google-signin-btn").click(); await waitForFeedback(guest, /取消 Google 登录/);
      assert.equal(await guest.evaluate(() => window.ANU_AUTH.getState().user), null);
      assert.match(await guest.locator("#my-transcripts-list").textContent(), /本机游客课程/);
      await guest.evaluate(() => { window.__qaPopupError = "auth/popup-blocked"; });
      await guest.locator("#google-signin-btn").click(); await waitForFeedback(guest, /允许登录弹窗/);
      guestFixture.syncUnavailable = true;
      await guest.evaluate(() => { window.__qaPopupError = null; window.__qaNextUID = "first-user"; });
      await guest.locator("#google-signin-btn").click(); await waitForFeedback(guest, /无法同步|未加载|尚未加载/);
      assert.equal(await guest.locator("#my-anu-registration-panel").isVisible(), false, "Worker failure must not show false registration UI");
      assert.equal(await guest.locator("#sync-cloud-btn").isVisible(), true);
      summary.screenshots.push(await snapshot(guest, safari ? "safari-ua-worker-unavailable" : "desktop-worker-unavailable"));
      guestFixture.syncUnavailable = false;
      await guest.locator("#sync-cloud-btn").click();
      await guest.waitForFunction(() => window.ANU_AUTH.getState().isRegistered);
      await waitForFeedback(guest, /已同步/);
      assert.equal(await guest.evaluate(() => window.__qaFirebase.popups.every((item) => item.active && item.parameters.prompt === "select_account")), true, "Popup must preserve user activation and request account selection");
      await guest.locator("#google-signout-btn").click();
      await guest.waitForFunction(() => !window.ANU_AUTH.getState().user);
      assert.match(await guest.locator("#my-transcripts-list").textContent(), /本机游客课程/);
      await guest.evaluate(() => { window.__qaNextUID = "second-user"; });
      await guest.locator("#google-signin-btn").click();
      await guest.waitForFunction(() => window.ANU_AUTH.getState().user && window.ANU_AUTH.getState().user.uid === "second-user" && window.ANU_AUTH.getState().isRegistered);
      assert.equal(await guest.locator("#archive-source-select").inputValue(), "cloud");
      assert.match(await guest.locator("#my-transcripts-list").textContent(), /云端原始课程/);
      await assertLocalIntact(guest);
      assert.deepEqual(guestFixture.errors, []);
      assert.deepEqual(guestFixture.unexpectedRemote, []);
      summary.checks.push((safari ? "iPhone Safari UA on Chromium" : "Desktop Chrome") + ": guest/cancel/blocked popup/account-selection gesture/Worker outage+retry/sign-out/account switch; guest data survives");
      await guestContext.close();
    }
    summary.result = "PASS";
  } finally {
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
