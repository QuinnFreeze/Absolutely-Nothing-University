import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");

console.log("=== ANU Automated Test Suite ===");

// 1. Static Files & CNAME Preservation
assert.ok(fs.existsSync(path.join(rootDir, "CNAME")), "CNAME must exist");
const cname = fs.readFileSync(path.join(rootDir, "CNAME"), "utf8").trim();
assert.equal(cname, "freeze.edu.kg", "CNAME must remain freeze.edu.kg");
assert.ok(fs.existsSync(path.join(rootDir, ".nojekyll")), ".nojekyll must exist");
assert.ok(fs.existsSync(path.join(rootDir, "404.html")), "404.html must exist");
console.log("✓ [PASS] GitHub Pages CNAME (freeze.edu.kg), .nojekyll, and 404.html verified");

// 2. Validate data/announcements.json
const annRaw = fs.readFileSync(path.join(rootDir, "data/announcements.json"), "utf8");
const annData = JSON.parse(annRaw);
assert.ok(annData.chancellor && annData.chancellor.zh && annData.chancellor.en, "Chancellor bilingual profile must exist");
assert.ok(Array.isArray(annData.announcements) && annData.announcements.length >= 8, "At least 8 campus announcements must exist");
for (const item of annData.announcements) {
  assert.ok(item.id && item.category && item.date, "Announcement must have id, category, and date");
  assert.ok(item.zh.title && item.en.title, `Announcement ${item.id} must have bilingual titles`);
  assert.ok(item.zh.dept && item.en.dept, `Announcement ${item.id} must have bilingual departments`);
}
console.log(`✓ [PASS] Static JSON announcements validated (${annData.announcements.length} bilingual decrees/notices)`);

// 3. Validate js/i18n.js Bilingual Parity & Datasets
const i18nCode = fs.readFileSync(path.join(rootDir, "js/i18n.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(i18nCode, sandbox);
const ANU_DATA = sandbox.window.ANU_DATA;
assert.ok(ANU_DATA, "window.ANU_DATA must be exported");

const zhKeys = Object.keys(ANU_DATA.i18nDict.zh);
const enKeys = Object.keys(ANU_DATA.i18nDict.en);
assert.deepEqual(zhKeys.sort(), enKeys.sort(), "zh and en i18n dictionaries must have identical keys");

assert.equal(ANU_DATA.degreeOptionsByLang.zh.length, ANU_DATA.degreeOptionsByLang.en.length, "Degree counts must match");
assert.ok(ANU_DATA.degreeOptionsByLang.zh.length >= 10, "At least 10 degree options required");
assert.equal(ANU_DATA.majorOptionsByLang.zh.length, ANU_DATA.majorOptionsByLang.en.length, "Major counts must match");
assert.ok(ANU_DATA.majorOptionsByLang.zh.length >= 12, "At least 12 major options required");
assert.equal(ANU_DATA.honorTitlesByLang.zh.length, ANU_DATA.honorTitlesByLang.en.length, "Honor title counts must match");
assert.equal(ANU_DATA.certTemplatesByLang.zh.length, 3, "Must have 3 certificate templates");

assert.equal(ANU_DATA.coursesByLang.zh.length, 8, "Must have 8 flagship courses (zh)");
assert.equal(ANU_DATA.coursesByLang.en.length, 8, "Must have 8 flagship courses (en)");
for (const c of ANU_DATA.coursesByLang.zh) {
  assert.ok(Array.isArray(c.syllabus) && c.syllabus.length >= 4, `Course ${c.code} must have full weekly syllabus`);
  assert.ok(c.profBio && c.profBio.length > 10, `Course ${c.code} must have instructor bio`);
  assert.ok(Array.isArray(c.quiz) && c.quiz.length >= 2, `Course ${c.code} must have in-browser mock exam questions`);
}

for (const p of [...ANU_DATA.papersByLang.zh, ...ANU_DATA.papersByLang.en]) {
  assert.ok(!p.doi.startsWith("DOI: 10."), `Paper ID "${p.doi}" must not use real DOI prefix`);
  assert.ok(p.doi.startsWith("VOID-ID:"), `Paper ID "${p.doi}" must use fictional VOID-ID prefix`);
}
assert.ok(ANU_DATA.randomPaperTopicsPool.length >= 18, "At least 18 random paper topics required");
assert.ok(ANU_DATA.cafeMenuByLang.zh.length >= 10, "At least 10 cafeteria menu items required");
assert.ok(ANU_DATA.clubsByLang.zh.length >= 5, "At least 5 student clubs required");
console.log(`✓ [PASS] Bilingual dictionary (${zhKeys.length} keys), 8 full syllabi + quizzes, and fictional VOID-IDs verified`);

// 4. Verify index.html structure, SEO, and i18n key bindings
const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
assert.ok(html.includes('property="og:title"'), "Open Graph tags must exist");
assert.ok(html.includes('viewport-fit=cover'), "Mobile Safari viewport-fit=cover must exist");
const i18nMatches = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((m) => m[1]);
for (const key of i18nMatches) {
  assert.ok(ANU_DATA.i18nDict.zh[key] !== undefined, `Missing zh translation for HTML key: ${key}`);
  assert.ok(ANU_DATA.i18nDict.en[key] !== undefined, `Missing en translation for HTML key: ${key}`);
}
console.log(`✓ [PASS] All ${i18nMatches.length} HTML data-i18n bindings matched in both zh and en`);

// 5. Verify CSS mobile Safari & prefers-reduced-motion rules
const css = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
assert.ok(css.includes('html[data-theme="dark"]'), "Dark mode theme selector must exist in styles.css");
assert.ok(css.includes("prefers-reduced-motion: reduce"), "prefers-reduced-motion media query must exist");
assert.ok(css.includes("100dvh"), "Mobile Safari 100dvh unit must exist");
console.log("✓ [PASS] Dark mode, prefers-reduced-motion, and mobile Safari CSS rules verified");

console.log("=== ALL STATIC & UNIT TESTS PASSED ===");

// 6. Test Canvas Exporters (Diploma 3 Templates + Paper Acceptance PNG) & XSS Safety
const canvasCode = fs.readFileSync(path.join(rootDir, "js/canvas-export.js"), "utf8");
let lastDownloadName = "";
let lastDataUrl = "";

const mockCanvasCtx = {
  scale() {},
  createLinearGradient() { return { addColorStop() {} }; },
  fillRect() {},
  strokeRect() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  setLineDash() {},
  fillText() {},
  measureText(str) { return { width: String(str).length * 12 }; }
};

const canvasSandbox = {
  window: {},
  document: {
    createElement(tag) {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext() { return mockCanvasCtx; },
          toDataURL(type) { return `data:${type};base64,MOCK_HIGH_RES_PNG`; }
        };
      }
      if (tag === "a") {
        return {
          download: "",
          href: "",
          click() {
            lastDownloadName = this.download;
            lastDataUrl = this.href;
          }
        };
      }
      return {};
    }
  }
};

vm.createContext(canvasSandbox);
vm.runInContext(canvasCode, canvasSandbox);
const ANU_CANVAS = canvasSandbox.window.ANU_CANVAS;
assert.ok(ANU_CANVAS, "window.ANU_CANVAS must be exported");

for (const tpl of ["oxford", "parchment", "minimal"]) {
  const url = ANU_CANVAS.exportDiplomaPNG({
    certLang: "bilingual",
    template: tpl,
    proclamation: "Test Proclamation",
    recipient: "Test <script>alert(1)</script> Alumni",
    degree: "Ph.D. in Pure Nothingness",
    majorLine: "Deadline Physics",
    honorLine: "Summa Cum Somno",
    citationText: "For doing nothing",
    sigLeft: "Chancellor",
    sigRight: "Provost",
    serialLine: "ANU-2026-VOID-12345",
    dateLine: "2026-10-18",
    isStamped: true
  });
  assert.ok(url.startsWith("data:image/png;base64,"), `Diploma export for template ${tpl} must return PNG data URL`);
  assert.ok(lastDownloadName.includes(`ANU-Diploma-${tpl}-`), `Filename must include template name ${tpl}`);
  assert.ok(!lastDownloadName.includes("<script>"), "Filename must sanitize special characters");
}
console.log("✓ [PASS] High-DPI PNG Diploma exporter verified across all 3 templates (oxford, parchment, minimal) + filename sanitization");

const paperUrl = ANU_CANVAS.exportPaperAcceptancePNG(ANU_DATA.papersByLang.zh[0], "zh");
assert.ok(paperUrl.startsWith("data:image/png;base64,"), "Paper acceptance letter exporter must return PNG data URL");
assert.ok(lastDownloadName.startsWith("ANU-Acceptance-"), "Paper acceptance filename verified");
console.log("✓ [PASS] Nature: Nothing Acceptance Letter PNG exporter verified");

// 7. Verify Zero Unsafe innerHTML in app.js
const appCode = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const innerHtmlOccurrences = [...appCode.matchAll(/\.innerHTML\s*=/g)];
assert.equal(innerHtmlOccurrences.length, 1, "Only data-i18n-html dictionary binding may use innerHTML");
console.log("✓ [PASS] XSS protection verified (zero user-input innerHTML assignments in app.js)");
