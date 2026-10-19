(function (global) {
  "use strict";

  const LOGICAL_WIDTH = 1200;
  const MAX_LOGICAL_HEIGHT = 7600;
  const MAX_PIXEL_COUNT = 12000000;
  const MAX_CANVAS_EDGE = 8192;
  const SERIF = "Georgia, 'Noto Serif SC', 'Songti SC', serif";
  const SANS = "Georgia, 'PingFang SC', sans-serif";
  const palettes = {
    oxford: {
      bgTop: "#F8FAFF", bgBottom: "#EDF4FF", outerStroke: "#0B2E59",
      innerStroke: "#2563EB", cornerAccent: "#1D4ED8", crestFill: "#0B2E59",
      crestBorder: "#2563EB", crestInner: "#93C5FD", accent: "#60A5FA",
      heading: "#0B2E59", sub: "#4A6583", recipient: "#1D4ED8",
      body: "#0F2540", honorBg: "#EFF6FF", honorBorder: "#93C5FD",
      sealFill: "#1D4ED8", sealRing: "#BFDBFE"
    },
    parchment: {
      bgTop: "#FFFDF7", bgBottom: "#F7EFE0", outerStroke: "#1E3A5F",
      innerStroke: "#B45309", cornerAccent: "#D97706", crestFill: "#1E3A5F",
      crestBorder: "#D97706", crestInner: "#FDE68A", accent: "#F59E0B",
      heading: "#1E3A5F", sub: "#78350F", recipient: "#92400E",
      body: "#1F2937", honorBg: "#FEF3C7", honorBorder: "#F59E0B",
      sealFill: "#991B1B", sealRing: "#FDE68A"
    },
    minimal: {
      bgTop: "#FFFFFF", bgBottom: "#F1F5F9", outerStroke: "#0F172A",
      innerStroke: "#0284C7", cornerAccent: "#0369A1", crestFill: "#0F172A",
      crestBorder: "#0284C7", crestInner: "#7DD3FC", accent: "#38BDF8",
      heading: "#0F172A", sub: "#475569", recipient: "#0369A1",
      body: "#1E293B", honorBg: "#F0F9FF", honorBorder: "#7DD3FC",
      sealFill: "#0F172A", sealRing: "#38BDF8"
    }
  };

  function exportError(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  // Objects/arrays must never become "[object Object]", throw on .replace(), or
  // accidentally expose serialized account data in a document or its filename.
  function text(value, fallback) {
    let result = "";
    if (typeof value === "string") result = value;
    else if (typeof value === "number" && Number.isFinite(value)) result = String(value);
    if (result.length > 40000) {
      throw exportError("PNG_CONTENT_TOO_LARGE", "This document is too long to export as one PNG. Please export fewer records.");
    }
    result = result.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    return result || fallback || "";
  }

  function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function field(source, keys, fallback) {
    for (const key of keys) {
      const value = text(source[key]);
      if (value) return value;
    }
    return fallback || "";
  }

  function localized(source, key, lang, fallback) {
    const suffix = lang === "zh" ? "Zh" : "En";
    const snakeKey = key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
    return field(source, [snakeKey + "_" + (lang === "zh" ? "zh" : "en"), key + suffix, key, snakeKey], fallback);
  }

  function safeFilename(value, fallback) {
    const normalized = text(value, fallback).normalize("NFKC");
    const safe = normalized.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
    return Array.from(safe).slice(0, 70).join("") || fallback;
  }

  const graphemeSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

  function graphemes(value) {
    return graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(value), (part) => part.segment)
      : Array.from(value);
  }

  function wrapCanvasText(ctx, value, maxWidth) {
    const valueText = text(value);
    if (!valueText) return [];
    const lines = [];
    for (const paragraph of valueText.split("\n")) {
      if (!paragraph) { lines.push(""); continue; }
      let line = "";
      for (const part of graphemes(paragraph)) {
        const candidate = line + part;
        if (line && ctx.measureText(candidate).width > maxWidth) {
          // Prefer a word boundary in Latin text, while allowing long words,
          // CJK text and complete emoji graphemes to wrap without truncation.
          const lastSpace = line.lastIndexOf(" ");
          if (lastSpace > line.length * 0.45) {
            lines.push(line.slice(0, lastSpace).trimEnd());
            line = line.slice(lastSpace + 1) + part;
          } else {
            lines.push(line.trimEnd());
            line = part === " " ? "" : part;
          }
        } else {
          line = candidate;
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }

  function block(ctx, value, font, maxWidth, y, lineHeight, color, x, align) {
    ctx.font = font;
    const lines = wrapCanvasText(ctx, value, maxWidth);
    return {
      lines, font, maxWidth, y, lineHeight, color,
      x: x === undefined ? 600 : x, align: align || "center",
      bottom: y + Math.max(0, lines.length - 1) * lineHeight
    };
  }

  function drawBlock(ctx, item) {
    ctx.font = item.font;
    ctx.fillStyle = item.color;
    ctx.textAlign = item.align;
    ctx.textBaseline = "alphabetic";
    item.lines.forEach((line, index) => ctx.fillText(line, item.x, item.y + index * item.lineHeight));
  }

  function createCanvas() {
    if (typeof document === "undefined" || !document.createElement) {
      throw exportError("PNG_CANVAS_UNAVAILABLE", "PNG export is unavailable in this browser.");
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) throw exportError("PNG_CANVAS_UNAVAILABLE", "Cannot create a canvas for PNG export. Please try another browser.");
    return { canvas, ctx };
  }

  function sizeCanvas(canvas, height) {
    const logicalHeight = Math.ceil(height);
    if (!Number.isFinite(logicalHeight) || logicalHeight > MAX_LOGICAL_HEIGHT) {
      throw exportError("PNG_CONTENT_TOO_LARGE", "This document is too long to export as one PNG. Please export fewer records.");
    }
    // A fixed devicePixelRatio can allocate hundreds of MB for a long record.
    // Keep useful resolution while bounding both area and Safari canvas edges.
    const scale = Math.min(2, MAX_CANVAS_EDGE / logicalHeight, Math.sqrt(MAX_PIXEL_COUNT / (LOGICAL_WIDTH * logicalHeight)));
    canvas.width = Math.floor(LOGICAL_WIDTH * scale);
    canvas.height = Math.floor(logicalHeight * scale);
    return { height: logicalHeight, scale };
  }

  function drawFrame(ctx, height, p, template) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, p.bgTop);
    gradient.addColorStop(1, p.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, height);
    ctx.save();
    ctx.translate(600, height / 2);
    ctx.strokeStyle = "rgba(11, 46, 89, 0.035)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = p.outerStroke;
    ctx.lineWidth = template === "minimal" ? 6 : 10;
    ctx.strokeRect(28, 28, LOGICAL_WIDTH - 56, height - 56);
    ctx.strokeStyle = p.innerStroke;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(46, 46, LOGICAL_WIDTH - 92, height - 92);
    ctx.strokeStyle = p.cornerAccent;
    ctx.lineWidth = 3;
    [[46, 46, 1, 1], [1154, 46, -1, 1], [46, height - 46, 1, -1], [1154, height - 46, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * 10, y + dy * 28);
      ctx.lineTo(x + dx * 10, y + dy * 10);
      ctx.lineTo(x + dx * 28, y + dy * 10);
      ctx.stroke();
    });
  }

  function drawCrest(ctx, cx, cy, radius, p) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = p.crestFill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.crestBorder;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = p.crestInner;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, radius * 0.4);
    ctx.lineTo(radius * 0.4, -radius * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  function drawWaxSeal(ctx, cx, cy, radius, p, isStamped) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.11);
    ctx.fillStyle = p.sealFill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.sealRing;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Georgia, serif";
    ctx.fillText(isStamped ? "OFFICIAL SEAL" : "UNSTAMPED", 0, -15);
    ctx.fillText("NIHIL AGERE", 0, 4);
    ctx.fillText("100% VOID", 0, 22);
    ctx.restore();
  }

  function renderDiploma(value) {
    const opts = record(value);
    const { canvas, ctx } = createCanvas();
    const requestedTemplate = field(opts, ["template", "template_id", "templateId"], "oxford");
    const template = Object.prototype.hasOwnProperty.call(palettes, requestedTemplate) ? requestedTemplate : "oxford";
    const p = palettes[template];
    const lang = field(opts, ["certLang", "cert_lang"], "en");
    const blocks = [];
    const add = (...args) => { const item = block(ctx, ...args); blocks.push(item); return item; };
    const heading = add("ABSOLUTELY NOTHING UNIVERSITY", "bold 36px " + SERIF, 1040, 194, 44, p.heading);
    const subtitle = add(lang === "zh"
      ? "绝对虚无大学 · 创校于公元前 ∞ 年 · 全球排名 NaN"
      : lang === "bilingual"
        ? "绝对虚无大学 · Universitas Rerum Nullarum · Sigillum Magnum"
        : "Universitas Rerum Nullarum · Sigillum Magnum · Est. ∞ B.C.", "italic 18px " + SERIF, 1040, heading.bottom + 30, 27, p.sub);
    const proclamation = add(field(opts, ["proclamation"]), "19px " + SANS, 1000, subtitle.bottom + 48, 29, p.sub);
    const recipientName = field(opts, ["recipient", "recipient_name", "recipientName"], "Alumni");
    const recipient = add(recipientName, "bold 44px " + SERIF, 1000, proclamation.bottom + 62, 56, p.recipient);
    const degree = add(field(opts, ["degree"], localized(opts, "degree", lang)), "bold 27px " + SERIF, 1000, recipient.bottom + 64, 38, p.heading);
    const major = add(field(opts, ["majorLine", "major_line"], localized(opts, "major", lang)), "bold 21px " + SANS, 1000, degree.bottom + 38, 31, p.body);
    const honorY = major.bottom + 20;
    const honor = add(field(opts, ["honorLine", "honor_line"], localized(opts, "honor", lang)), "bold 16px " + SERIF, 850, honorY + 24, 24, p.heading);
    const honorHeight = Math.max(36, honor.lines.length * 24 + 12);
    const citation = add(field(opts, ["citationText", "citation_text", "citation"]), "italic 17px " + SERIF, 940, honorY + honorHeight + 40, 27, p.sub);
    const sigY = Math.max(682, citation.bottom + 115);
    add("Albert Slackingstein", "italic 23px Georgia, serif", 310, sigY - 14, 30, p.heading, 275);
    add("Prof. Ginger (Meow)", "italic 23px Georgia, serif", 310, sigY - 14, 30, p.heading, 925);
    const sigLeft = add(field(opts, ["sigLeft", "sig_left"]), "14px " + SANS, 310, sigY + 24, 22, p.sub, 275);
    const sigRight = add(field(opts, ["sigRight", "sig_right"]), "14px " + SANS, 310, sigY + 24, 22, p.sub, 925);
    const serial = field(opts, ["serialLine", "serial_line", "serial_number", "serialNumber"]);
    const date = field(opts, ["dateLine", "date_line", "issued_date", "issuedDate"]);
    const footer = add([serial, date, "Template: " + template.toUpperCase()].filter(Boolean).join("   |   "), "bold 14px monospace", 1000, Math.max(760, sigLeft.bottom + 54, sigRight.bottom + 54), 22, p.body);
    const disclaimer = add("FICTIONAL PARODY DIPLOMA · NOT AN ACCREDITED INSTITUTION · 虚构讽刺大学娱乐证书 · 非法定认可学历学位", "12px 'PingFang SC', sans-serif", 1000, footer.bottom + 32, 19, p.sub);
    const dimensions = sizeCanvas(canvas, Math.max(860, disclaimer.bottom + 68));
    ctx.scale(dimensions.scale, dimensions.scale);
    drawFrame(ctx, dimensions.height, p, template);
    drawCrest(ctx, 600, 112, 38, p);
    ctx.strokeStyle = p.innerStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(290, recipient.bottom + 16);
    ctx.lineTo(910, recipient.bottom + 16);
    ctx.stroke();
    ctx.fillStyle = p.honorBg;
    ctx.fillRect(160, honorY, 880, honorHeight);
    ctx.strokeStyle = p.honorBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(160, honorY, 880, honorHeight);
    ctx.strokeStyle = p.heading;
    ctx.beginPath();
    ctx.moveTo(120, sigY);
    ctx.lineTo(430, sigY);
    ctx.moveTo(770, sigY);
    ctx.lineTo(1080, sigY);
    ctx.stroke();
    blocks.forEach((item) => drawBlock(ctx, item));
    drawWaxSeal(ctx, 600, sigY - 8, 52, p, opts.isStamped === true || opts.is_stamped === true || opts.is_stamped === 1);
    return { canvas, filename: "ANU-Diploma-" + template + "-" + safeFilename(recipientName, "Alumni") + ".png" };
  }

  function renderPaperAcceptance(value, currentLang) {
    const paper = record(value);
    const lang = currentLang === "zh" ? "zh" : "en";
    const { canvas, ctx } = createCanvas();
    const p = palettes.oxford;
    const blocks = [];
    const add = (...args) => { const item = block(ctx, ...args); blocks.push(item); return item; };
    const heading = add("ABSOLUTELY NOTHING UNIVERSITY PRESS", "bold 32px " + SERIF, 1040, 110, 42, p.heading);
    const subtitle = add(lang === "zh" ? "《Nature: Nothing》零字数手稿无条件录用通知书 · ACCEPTANCE LETTER"
      : "OFFICIAL LETTER OF ZERO-WORD MANUSCRIPT ACCEPTANCE", "bold 21px " + SERIF, 1040, heading.bottom + 38, 30, p.recipient);
    const journal = localized(paper, "journal", lang);
    const doi = field(paper, ["doi", "void_id", "voidId"], "VOID-ID");
    const date = field(paper, ["created_at", "createdAt"], new Date().toISOString().slice(0, 10));
    const meta = add([journal, doi, "Date: " + date.slice(0, 10)].filter(Boolean).join("   |   "), "15px monospace", 1000, subtitle.bottom + 36, 24, p.sub);
    const dividerY = meta.bottom + 22;
    const titleText = localized(paper, "title", lang, lang === "zh" ? "未命名论文" : "Untitled Manuscript");
    const title = add(lang === "zh" ? "《" + titleText + "》" : '"' + titleText + '"', "bold 25px " + SERIF, 940, dividerY + 46, 35, p.body);
    const authors = add(field(paper, ["authors", "author_display", "authorDisplay", "author"]), "18px " + SANS, 940, Math.max(336, title.bottom + 46), 28, p.recipient);
    const boxY = authors.bottom + 26;
    const content = add(localized(paper, "content", lang), "italic 17px " + SERIF, 920, boxY + 43, 27, p.heading);
    const footnote = add(localized(paper, "footnote", lang), "14px " + SANS, 920, content.bottom + 34, 23, p.sub);
    const boxHeight = Math.max(126, footnote.bottom - boxY + 22);
    const reviewHeader = add(localized(paper, "reviewerHeader", lang, "Peer Review Panel Verdict:"), "bold 16px " + SANS, 940, boxY + boxHeight + 42, 25, p.body);
    const review = add(localized(paper, "review", lang), "italic 15px " + SERIF, 940, reviewHeader.bottom + 32, 25, "#1E3A5F");
    const sealY = Math.max(704, review.bottom + 96);
    const disclaimer = add("SATIRICAL PARODY PUBLICATION · NO REAL DOI OR JOURNAL AFFILIATION · 虚构学术期刊娱乐证明 · 非真实学术发表", "12px 'PingFang SC', sans-serif", 1000, Math.max(788, sealY + 84), 19, p.sub);
    const dimensions = sizeCanvas(canvas, Math.max(860, disclaimer.bottom + 72));
    ctx.scale(dimensions.scale, dimensions.scale);
    drawFrame(ctx, dimensions.height, p, "oxford");
    ctx.strokeStyle = "#BFDBFE";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, dividerY);
    ctx.lineTo(1100, dividerY);
    ctx.stroke();
    ctx.fillStyle = p.honorBg;
    ctx.fillRect(100, boxY, 1000, boxHeight);
    ctx.strokeStyle = p.honorBorder;
    ctx.strokeRect(100, boxY, 1000, boxHeight);
    blocks.forEach((item) => drawBlock(ctx, item));
    ctx.save();
    ctx.translate(600, sealY);
    ctx.rotate(-0.08);
    ctx.fillStyle = p.sealFill;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.honorBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("ACCEPTED", 0, -6);
    ctx.fillText("0 WORDS", 0, 12);
    ctx.restore();
    return { canvas, filename: "ANU-Acceptance-" + safeFilename(doi, "VOID-ID") + ".png" };
  }

  function renderTranscript(value, currentLang, profileValue) {
    const source = record(value);
    const records = Array.isArray(value) ? value : Array.isArray(source.transcripts) ? source.transcripts : value && typeof value === "object" ? [value] : [];
    if (!records.length || records.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw exportError("PNG_NO_TRANSCRIPTS", "No transcript records are available to export.");
    }
    const profile = record(profileValue || source.profile);
    const lang = currentLang === "zh" ? "zh" : "en";
    const { canvas, ctx } = createCanvas();
    const p = palettes.oxford;
    const blocks = [];
    const boxes = [];
    const add = (...args) => { const item = block(ctx, ...args); blocks.push(item); return item; };
    const heading = add("ABSOLUTELY NOTHING UNIVERSITY", "bold 34px " + SERIF, 1040, 178, 44, p.heading);
    const subtitle = add(lang === "zh" ? "个人成绩单 · ACADEMIC TRANSCRIPT" : "ACADEMIC TRANSCRIPT · 个人成绩单", "bold 24px " + SERIF, 1040, heading.bottom + 40, 34, p.recipient);
    const name = add(field(profile, ["nickname", "displayName", "display_name", "recipientName", "recipient_name"], lang === "zh" ? "学生" : "Student"), "bold 25px " + SERIF, 1000, subtitle.bottom + 48, 36, p.heading);
    const studentNumber = field(profile, ["studentNumber", "student_number"]);
    let cursor = name.bottom + 30;
    if (studentNumber) {
      const id = add((lang === "zh" ? "学号：" : "Student ID: ") + studentNumber, "16px monospace", 1000, cursor, 25, p.sub);
      cursor = id.bottom + 32;
    }
    for (const item of records) {
      const row = record(item);
      const boxY = cursor;
      const courseCode = field(row, ["course_code", "courseCode", "code"], "EXAM");
      const title = localized(row, "courseTitle", lang, localized(row, "title", lang));
      const titleBlock = add([courseCode, title].filter(Boolean).join(" · "), "bold 22px " + SERIF, 948, boxY + 36, 32, p.heading, 126, "left");
      const score = field(row, ["score"], "—");
      const grade = field(row, ["grade"], "—");
      const scoreLine = add((lang === "zh" ? "成绩：" : "Score: ") + score + " / 100   |   " + (lang === "zh" ? "等级：" : "Grade: ") + grade, "bold 19px " + SANS, 948, titleBlock.bottom + 32, 29, p.recipient, 126, "left");
      const gradeLabel = add(localized(row, "gradeLabel", lang), "16px " + SANS, 948, scoreLine.bottom + 27, 25, p.body, 126, "left");
      const verdict = add(localized(row, "verdict", lang), "italic 16px " + SERIF, 948, gradeLabel.bottom + (gradeLabel.lines.length ? 29 : 3), 25, p.sub, 126, "left");
      const date = field(row, ["created_at", "createdAt", "date"]);
      const dateLine = add(date ? (lang === "zh" ? "记录日期：" : "Recorded: ") + date : "", "14px monospace", 948, verdict.bottom + 29, 23, p.sub, 126, "left");
      const boxHeight = dateLine.bottom - boxY + 26;
      boxes.push({ y: boxY, height: boxHeight });
      cursor = boxY + boxHeight + 24;
    }
    const disclaimer = add(lang === "zh"
      ? "虚构讽刺大学娱乐成绩单 · 非法定认可学历或成绩证明 · FICTIONAL PARODY · UNOFFICIAL RECORD"
      : "FICTIONAL PARODY · UNOFFICIAL RECORD · NOT AN ACCREDITED ACADEMIC TRANSCRIPT · 虚构娱乐成绩单", "12px 'PingFang SC', sans-serif", 1000, cursor + 20, 20, p.sub);
    const dimensions = sizeCanvas(canvas, Math.max(860, disclaimer.bottom + 72));
    ctx.scale(dimensions.scale, dimensions.scale);
    drawFrame(ctx, dimensions.height, p, "oxford");
    drawCrest(ctx, 600, 100, 38, p);
    boxes.forEach((box) => {
      ctx.fillStyle = p.honorBg;
      ctx.fillRect(100, box.y, 1000, box.height);
      ctx.strokeStyle = p.honorBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(100, box.y, 1000, box.height);
    });
    blocks.forEach((item) => drawBlock(ctx, item));
    return { canvas, filename: "ANU-Transcript-" + safeFilename(studentNumber || field(profile, ["nickname"]), "Student") + ".png" };
  }

  function clickDownload(href, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    // Keep the anchor in the document while activating it for Safari.
    if (document.body && document.body.appendChild) document.body.appendChild(link);
    try { link.click(); } finally { if (link.remove) link.remove(); }
  }

  function exportSynchronously(render) {
    try {
      const result = render();
      const dataUrl = result.canvas.toDataURL("image/png");
      if (!dataUrl || !dataUrl.startsWith("data:image/png")) {
        throw exportError("PNG_ENCODING_FAILED", "The browser could not encode this PNG. Please try again.");
      }
      clickDownload(dataUrl, result.filename);
      return dataUrl;
    } catch (error) {
      if (error && error.code) throw error;
      throw exportError("PNG_EXPORT_FAILED", "PNG export failed. Please retry or use another browser.", error);
    }
  }

  async function downloadAsynchronously(render) {
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const result = render();
      const urlAPI = global.URL || (typeof URL !== "undefined" ? URL : null);
      if (typeof result.canvas.toBlob !== "function" || !urlAPI || !urlAPI.createObjectURL || !urlAPI.revokeObjectURL) {
        const dataUrl = result.canvas.toDataURL("image/png");
        if (!dataUrl || !dataUrl.startsWith("data:image/png")) throw exportError("PNG_ENCODING_FAILED", "The browser could not encode this PNG. Please try again.");
        clickDownload(dataUrl, result.filename);
        return { filename: result.filename, width: result.canvas.width, height: result.canvas.height };
      }
      const blob = await new Promise((resolve, reject) => {
        result.canvas.toBlob((value) => value ? resolve(value) : reject(exportError("PNG_ENCODING_FAILED", "The browser could not encode this PNG. Please try again.")), "image/png");
      });
      const url = urlAPI.createObjectURL(blob);
      try { clickDownload(url, result.filename); } finally {
        // Revoking immediately can cancel Safari's asynchronous download.
        setTimeout(() => urlAPI.revokeObjectURL(url), 60000);
      }
      return { filename: result.filename, width: result.canvas.width, height: result.canvas.height };
    } catch (error) {
      if (error && error.code) throw error;
      throw exportError("PNG_EXPORT_FAILED", "PNG export failed. Please retry or use another browser.", error);
    }
  }

  global.ANU_CANVAS = {
    // Legacy synchronous API retained for callers/tests that expect data URLs.
    exportDiplomaPNG: (opts) => exportSynchronously(() => renderDiploma(opts)),
    exportPaperAcceptancePNG: (paper, lang) => exportSynchronously(() => renderPaperAcceptance(paper, lang)),
    exportTranscriptPNG: (transcript, lang, profile) => exportSynchronously(() => renderTranscript(transcript, lang, profile)),
    // UI callers should await these font-ready, Blob-based download APIs and
    // display rejected errors; all methods retain an explicit light background.
    downloadDiplomaPNG: (opts) => downloadAsynchronously(() => renderDiploma(opts)),
    downloadPaperAcceptancePNG: (paper, lang) => downloadAsynchronously(() => renderPaperAcceptance(paper, lang)),
    downloadTranscriptPNG: (transcript, lang, profile) => downloadAsynchronously(() => renderTranscript(transcript, lang, profile))
  };
})(window);
