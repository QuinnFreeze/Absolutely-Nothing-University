import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const source = fs.readFileSync(new URL("../js/canvas-export.js", import.meta.url), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function createHarness({ canvasUnavailable = false, encodingFailure = false, fontsReady } = {}) {
  const canvases = [];
  const downloads = [];
  const revoked = [];
  const timers = [];
  let blobCalls = 0;
  let dataUrlCalls = 0;
  const activeLinks = new Set();
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  function measure(value, font) {
    const size = Number(/([\d.]+)px/.exec(font || "10px")[1]);
    return Array.from(segmenter.segment(String(value)), ({ segment }) =>
      size * (/^[\x00-\x7F]+$/.test(segment) ? 0.55 : 1.05)).reduce((sum, width) => sum + width, 0);
  }
  function newCanvas() {
    const drawing = [];
    const rectangles = [];
    const stateStack = [];
    const canvas = { width: 300, height: 150, drawing, rectangles };
    const ctx = {
      font: "10px sans-serif", textAlign: "left", fillStyle: "#000", textBaseline: "alphabetic",
      tx: 0, ty: 0, pixelScale: 1,
      scale(scale) { this.pixelScale = scale; },
      save() {
        stateStack.push({ font: this.font, textAlign: this.textAlign, fillStyle: this.fillStyle, tx: this.tx, ty: this.ty });
      },
      restore() { Object.assign(this, stateStack.pop()); },
      translate(x, y) { this.tx += x; this.ty += y; },
      rotate() {},
      createLinearGradient() {
        return { stops: [], addColorStop(offset, color) { this.stops.push({ offset, color }); } };
      },
      fillRect(x, y, width, height) { rectangles.push({ x, y, width, height, fill: this.fillStyle }); },
      strokeRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
      moveTo() {}, lineTo() {}, setLineDash() {},
      fillText(value, x, y) {
        const width = measure(value, this.font);
        const start = x + this.tx - (this.textAlign === "center" ? width / 2 : this.textAlign === "right" ? width : 0);
        drawing.push({ text: String(value), x: x + this.tx, y: y + this.ty, width, left: start, right: start + width, font: this.font });
      },
      measureText(value) { return { width: measure(value, this.font) }; }
    };
    canvas.getContext = () => canvasUnavailable ? null : ctx;
    canvas.toDataURL = (type) => { dataUrlCalls++; return encodingFailure ? "data:," : `data:${type};base64,MOCK_PNG`; };
    canvas.toBlob = (callback) => { blobCalls++; callback(encodingFailure ? null : { type: "image/png", size: 1024 }); };
    canvas.ctx = ctx;
    canvases.push(canvas);
    return canvas;
  }
  const sandbox = {
    window: { URL: {
      createObjectURL() { return "blob:anu-test/png"; },
      revokeObjectURL(url) { revoked.push(url); }
    } },
    document: {
      fonts: { ready: fontsReady || Promise.resolve() },
      body: { appendChild(link) { activeLinks.add(link); } },
      createElement(tag) {
        if (tag === "canvas") return newCanvas();
        if (tag === "a") return {
          click() { downloads.push({ filename: this.download, href: this.href, attached: activeLinks.has(this) }); },
          remove() { activeLinks.delete(this); }
        };
        return {};
      }
    },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {
    api: sandbox.window.ANU_CANVAS, canvases, downloads, revoked, timers,
    get blobCalls() { return blobCalls; }, get dataUrlCalls() { return dataUrlCalls; }
  };
}

function compact(value) { return value.replace(/\s/g, ""); }

function assertRenderedCompletely(canvas, value, message) {
  const rendered = compact(canvas.drawing.map(({ text }) => text).join(""));
  assert.ok(rendered.includes(compact(value)), message);
}

function assertWithinCanvas(canvas) {
  const height = canvas.height / canvas.ctx.pixelScale;
  for (const line of canvas.drawing) {
    assert.ok(line.left >= 70 && line.right <= 1130, `Text must stay within horizontal margins: ${line.text}`);
    assert.ok(line.y >= 60 && line.y + 8 < height - 44, `Text must remain above the bottom frame: ${line.text}`);
  }
  assert.ok(canvas.width * canvas.height <= 12000000, "Export must respect the pixel budget");
  assert.ok(canvas.width <= 8192 && canvas.height <= 8192, "Export must respect Safari canvas dimensions");
  assert.ok(canvas.rectangles[0].fill.stops.every(({ color }) => color !== "#000000"), "PNG must paint an explicit light background");
}

export async function runCanvasExportTests() {
  console.log("\n=== Canvas export tests (mock canvas measurements, not real browser PNG rendering) ===");
  {
    const h = createHarness();
    const recipient = "长姓名欧阳 Long Recipient 👨‍👩‍👧‍👦 e\u0301".repeat(9) + "姓名终点";
    const degree = "Philosophiae Doctor of Exceptionally Lengthy Nothingness 虚无学博士学位".repeat(6) + "学位终点";
    const citation = "For patient contemplation, 跨越昼夜的学术性休息 🧑🏽‍🎓，所有内容都应该完整保留。".repeat(20) + "评语终点";
    const major = "Major in Strategic Procrastination 战略性拖延研究".repeat(4);
    const honor = "Summa Cum Somno 最高睡眠荣誉".repeat(5);
    for (const template of ["oxford", "parchment", "minimal"]) {
      const result = h.api.exportDiplomaPNG({ template, certLang: "bilingual", recipient, degree,
        majorLine: major, honorLine: honor, citationText: citation,
        proclamation: "Hereby confers on", sigLeft: "University Chancellor", sigRight: "Academic Provost",
        serialLine: "ANU-2026-TEST", dateLine: "2026-10-19", isStamped: true });
      assert.match(result, /^data:image\/png/);
      const canvas = h.canvases.at(-1);
      for (const value of [recipient, degree, major, honor, citation]) {
        assertRenderedCompletely(canvas, value, "Long diploma fields must not be truncated");
      }
      assertWithinCanvas(canvas);
      assert.ok(canvas.height > 1720, "Long content must grow the document height");
      assert.ok(h.downloads.at(-1).filename.startsWith(`ANU-Diploma-${template}-`));
      assert.equal(canvas.rectangles[0].fill.stops[0].color,
        { oxford: "#F8FAFF", parchment: "#FFFDF7", minimal: "#FFFFFF" }[template], "All three existing template palettes must remain");
      assert.ok(!canvas.drawing.some(({ text }) => /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u.test(text)), "Wrap boundaries must preserve Unicode surrogate pairs");
      assert.ok(!canvas.drawing.some(({ text }) => text.startsWith("\u200D") || text.endsWith("\u200D")), "Wrap boundaries must preserve joined emoji");
    }
    console.log("✓ [PASS] Three diploma palettes retain complete long names/degrees/citations, graphemes, dynamic height and canvas bounds");
  }
  {
    const h = createHarness();
    const title = "An Unreasonably Lengthy Title Concerning Nothingness 虚无论文研究 🧑🏽‍🎓".repeat(9) + "标题终点";
    const authors = "欧阳作者甲 / Very Long Co-Author 👨‍👩‍👧‍👦".repeat(5) + "作者终点";
    const review = "Reviewer: Your unusually extensive description of an empty manuscript has been thoroughly ignored. 审稿意见仍完整保存。".repeat(20) + "审稿终点";
    const content = "A zero-word manuscript with a surprisingly long descriptive note. 零字数手稿注释。".repeat(5);
    const footnote = "This is a fictional academic publication. 本证明仅供娱乐。".repeat(5);
    h.api.exportPaperAcceptancePNG({ title, author_display: authors, void_id: "VOID-ID: /../../🧑🏽‍🎓?bad", journal_zh: "虚构期刊", content_zh: content, footnote_zh: footnote, review_zh: review, reviewer_header_zh: "同行评审意见", created_at: "2026-10-19T08:00:00Z" }, "zh");
    const canvas = h.canvases.at(-1);
    for (const value of [title, authors, review, content, footnote, "同行评审意见", "虚构期刊"]) {
      assertRenderedCompletely(canvas, value, "Paper export must retain every long title, author and review field");
    }
    assertWithinCanvas(canvas);
    assert.ok(!/[/?<>:]/.test(h.downloads[0].filename), "Paper identifiers must not inject filename paths");
    console.log("✓ [PASS] Paper title/authors/content/footnote/review remain complete and localized snake_case fields are supported");
  }
  {
    const h = createHarness();
    const verdict = "Very long feedback 原始评语 📖 " .repeat(20) + "反馈终点";
    h.api.exportTranscriptPNG([
      { course_code: "VOID-101", course_title_zh: "虚无课程", score: 0, grade: "F", grade_label_zh: "零分记录", verdict_zh: verdict, created_at: "2026-10-19" },
      { courseCode: "REST-202", courseTitleZh: "休息课程", score: 87, grade: "B+", gradeLabelZh: "原始等级文字", verdictZh: "云端原始判词", createdAt: "2026-10-18" }
    ], "zh", { nickname: "完整档案姓名", student_number: "ANU-2026-STUDENT" });
    const canvas = h.canvases.at(-1);
    for (const value of ["虚无课程", "休息课程", "成绩：0 / 100", "成绩：87 / 100", verdict, "完整档案姓名", "ANU-2026-STUDENT", "原始等级文字", "云端原始判词"]) {
      assertRenderedCompletely(canvas, value, "Transcript must use the supplied actual grades and identity, including score zero");
    }
    assertWithinCanvas(canvas);
    assert.match(h.downloads.at(-1).filename, /^ANU-Transcript-/);
    h.api.exportTranscriptPNG({ course_code: "READ-303", course_title_en: "Reading Nothing", score: 42, grade: "F", verdict_en: "Try resting." }, "en");
    assertRenderedCompletely(h.canvases.at(-1), "Reading Nothing", "English transcript must select English data");
    assert.throws(() => h.api.exportTranscriptPNG([], "zh"), { code: "PNG_NO_TRANSCRIPTS" });
    console.log("✓ [PASS] Actual transcript rows preserve zero/positive scores, bilingual snake/camel aliases, feedback and profile details");
  }
  {
    const h = createHarness();
    h.api.exportDiplomaPNG({ recipient: ["unexpected", "array"], degree: null, citationText: {}, dateLine: ["bad"] });
    h.api.exportPaperAcceptancePNG({ title: ["unexpected"], authors: null, doi: ["invalid"], review: {} }, "zh");
    assert.ok(h.canvases.every((canvas) => canvas.drawing.every(({ text }) => !/undefined|null|\[object Object\]|unexpected/.test(text))), "Malformed values must not leak coercions or crash export");
    const unsafe = "../../some\\name\u0000:<script>";
    h.api.exportDiplomaPNG({ recipient: unsafe, template: "__proto__" });
    assert.ok(!/[\\/<>:\u0000]/.test(h.downloads.at(-1).filename));
    assert.match(h.downloads.at(-1).filename, /^ANU-Diploma-oxford-/);
    const unavailable = createHarness({ canvasUnavailable: true });
    assert.throws(() => unavailable.api.exportDiplomaPNG({}), { code: "PNG_CANVAS_UNAVAILABLE" });
    const failed = createHarness({ encodingFailure: true });
    assert.throws(() => failed.api.exportDiplomaPNG({}), { code: "PNG_ENCODING_FAILED" });
    assert.equal(failed.downloads.length, 0);
    assert.throws(() => h.api.exportPaperAcceptancePNG({ review: "A".repeat(40001) }, "en"), { code: "PNG_CONTENT_TOO_LARGE" });
    console.log("✓ [PASS] Malformed fields and unsafe filenames are normalized; unavailable/oversized/failed exports report explicit errors");
  }
  {
    const fonts = deferred();
    const h = createHarness({ fontsReady: fonts.promise });
    const result = h.api.downloadDiplomaPNG({ recipient: "Fonts Ready" });
    await Promise.resolve();
    assert.equal(h.canvases.length, 0, "Rendering must wait for document.fonts.ready");
    fonts.resolve();
    const metadata = await result;
    assert.ok(metadata.width > 0 && metadata.height > 0);
    assert.equal(h.blobCalls, 1, "Async download must prefer Blob encoding");
    assert.equal(h.dataUrlCalls, 0, "Blob download avoids allocating a base64 PNG string");
    assert.equal(h.downloads[0].href, "blob:anu-test/png");
    assert.equal(h.downloads[0].attached, true, "Safari anchor must be attached during click");
    assert.equal(h.revoked.length, 0, "Object URL must survive the download click");
    assert.equal(h.timers[0].delay, 60000);
    h.timers[0].fn();
    assert.deepEqual(h.revoked, ["blob:anu-test/png"]);
    await h.api.downloadPaperAcceptancePNG({ title: "Async Paper", doi: "VOID-ID:ASYNC" }, "en");
    await h.api.downloadTranscriptPNG({ courseCode: "ASYNC", score: 99, grade: "A+" }, "en");
    assert.equal(h.blobCalls, 3);
    const failed = createHarness({ encodingFailure: true });
    await assert.rejects(failed.api.downloadTranscriptPNG({ score: 0 }, "en"), { code: "PNG_ENCODING_FAILED" });
    assert.equal(failed.downloads.length, 0);
    const rejectedFonts = createHarness({ fontsReady: Promise.reject(new Error("font failed")) });
    await assert.rejects(rejectedFonts.api.downloadDiplomaPNG({}), { code: "PNG_EXPORT_FAILED" });
    console.log("✓ [PASS] Async PNG APIs wait for fonts, use Blob download with Safari URL lifecycle, and propagate errors to await/catch");
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runCanvasExportTests();
