(function (global) {
  "use strict";

  function wrapCanvasText(ctx, text, maxWidth) {
    if (!text) return [];
    const chars = Array.from(text);
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < chars.length; i++) {
      const testLine = currentLine + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = chars[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function drawCrest(ctx, cx, cy, radius, palette) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = palette.crestFill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.crestBorder;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = palette.crestInner;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, radius * 0.4);
    ctx.lineTo(radius * 0.4, -radius * 0.4);
    ctx.stroke();

    ctx.restore();
  }

  function drawWaxSeal(ctx, cx, cy, radius, palette, isStamped) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.11);

    ctx.fillStyle = palette.sealFill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.sealRing;
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

  function exportDiplomaPNG(opts) {
    const scale = 2; // 2400 x 1680 High-DPI PNG
    const logicalW = 1200;
    const logicalH = 860;

    const canvas = document.createElement("canvas");
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const template = opts.template || "oxford";
    const palettes = {
      oxford: {
        bgTop: "#F8FAFF",
        bgBottom: "#EDF4FF",
        outerStroke: "#0B2E59",
        innerStroke: "#2563EB",
        cornerAccent: "#1D4ED8",
        crestFill: "#0B2E59",
        crestBorder: "#2563EB",
        crestInner: "#93C5FD",
        accent: "#60A5FA",
        heading: "#0B2E59",
        sub: "#4A6583",
        recipient: "#1D4ED8",
        body: "#0F2540",
        honorBg: "#EFF6FF",
        honorBorder: "#93C5FD",
        sealFill: "#1D4ED8",
        sealRing: "#BFDBFE"
      },
      parchment: {
        bgTop: "#FFFDF7",
        bgBottom: "#F7EFE0",
        outerStroke: "#1E3A5F",
        innerStroke: "#B45309",
        cornerAccent: "#D97706",
        crestFill: "#1E3A5F",
        crestBorder: "#D97706",
        crestInner: "#FDE68A",
        accent: "#F59E0B",
        heading: "#1E3A5F",
        sub: "#78350F",
        recipient: "#92400E",
        body: "#1F2937",
        honorBg: "#FEF3C7",
        honorBorder: "#F59E0B",
        sealFill: "#991B1B",
        sealRing: "#FDE68A"
      },
      minimal: {
        bgTop: "#FFFFFF",
        bgBottom: "#F1F5F9",
        outerStroke: "#0F172A",
        innerStroke: "#0284C7",
        cornerAccent: "#0369A1",
        crestFill: "#0F172A",
        crestBorder: "#0284C7",
        crestInner: "#7DD3FC",
        accent: "#38BDF8",
        heading: "#0F172A",
        sub: "#475569",
        recipient: "#0369A1",
        body: "#1E293B",
        honorBg: "#F0F9FF",
        honorBorder: "#7DD3FC",
        sealFill: "#0F172A",
        sealRing: "#38BDF8"
      }
    };

    const p = palettes[template] || palettes.oxford;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, logicalH);
    grad.addColorStop(0, p.bgTop);
    grad.addColorStop(1, p.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Subtle watermark
    ctx.save();
    ctx.translate(600, 430);
    ctx.strokeStyle = "rgba(11, 46, 89, 0.035)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Borders
    ctx.strokeStyle = p.outerStroke;
    ctx.lineWidth = template === "minimal" ? 6 : 10;
    ctx.strokeRect(28, 28, logicalW - 56, logicalH - 56);

    ctx.strokeStyle = p.innerStroke;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(46, 46, logicalW - 92, logicalH - 92);

    // Corner ornaments
    const corners = [
      [46, 46, 1, 1],
      [logicalW - 46, 46, -1, 1],
      [46, logicalH - 46, 1, -1],
      [logicalW - 46, logicalH - 46, -1, -1]
    ];
    ctx.strokeStyle = p.cornerAccent;
    ctx.lineWidth = 3;
    corners.forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * 10, y + dy * 28);
      ctx.lineTo(x + dx * 10, y + dy * 10);
      ctx.lineTo(x + dx * 28, y + dy * 10);
      ctx.stroke();
    });

    // Crest
    drawCrest(ctx, 600, 112, 38, p);

    ctx.textAlign = "center";
    ctx.fillStyle = p.heading;
    ctx.font = "bold 36px Georgia, 'Noto Serif SC', serif";
    ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY", 600, 194);

    ctx.fillStyle = p.sub;
    ctx.font = "italic 18px Georgia, 'Noto Serif SC', serif";
    ctx.fillText(
      opts.certLang === "zh"
        ? "绝对虚无大学 · 创校于公元前 ∞ 年 · 全球排名 NaN"
        : opts.certLang === "bilingual"
          ? "绝对虚无大学 · Universitas Rerum Nullarum · Sigillum Magnum"
          : "Universitas Rerum Nullarum · Sigillum Magnum · Est. ∞ B.C.",
      600,
      224
    );

    ctx.fillStyle = p.sub;
    ctx.font = "19px Georgia, 'PingFang SC', sans-serif";
    ctx.fillText(opts.proclamation, 600, 272);

    // Recipient
    ctx.fillStyle = p.recipient;
    ctx.font = "bold 44px Georgia, 'Songti SC', serif";
    ctx.fillText(opts.recipient, 600, 334);

    ctx.strokeStyle = p.innerStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(290, 350);
    ctx.lineTo(910, 350);
    ctx.stroke();

    // Degree & Major
    ctx.fillStyle = p.heading;
    ctx.font = "bold 27px Georgia, 'PingFang SC', serif";
    ctx.fillText(opts.degree, 600, 398);

    ctx.fillStyle = p.body;
    ctx.font = "bold 21px Georgia, 'PingFang SC', sans-serif";
    ctx.fillText(opts.majorLine, 600, 436);

    // Honor pill
    ctx.fillStyle = p.honorBg;
    ctx.fillRect(250, 456, 700, 36);
    ctx.strokeStyle = p.honorBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(250, 456, 700, 36);

    ctx.fillStyle = p.heading;
    ctx.font = "bold 16px Georgia, 'PingFang SC', serif";
    ctx.fillText(opts.honorLine, 600, 480);

    // Citation wrapped
    ctx.fillStyle = p.sub;
    ctx.font = "italic 17px Georgia, 'PingFang SC', serif";
    const citLines = wrapCanvasText(ctx, opts.citationText, 860);
    citLines.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(line, 600, 532 + idx * 26);
    });

    // Signatures & Wax Seal
    const sigY = 682;
    ctx.strokeStyle = p.heading;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, sigY);
    ctx.lineTo(430, sigY);
    ctx.moveTo(770, sigY);
    ctx.lineTo(1080, sigY);
    ctx.stroke();

    ctx.fillStyle = p.heading;
    ctx.font = "italic 23px Georgia, serif";
    ctx.fillText("Albert Slackingstein", 275, sigY - 14);
    ctx.fillText("Prof. Ginger (Meow)", 925, sigY - 14);

    ctx.fillStyle = p.sub;
    ctx.font = "14px Georgia, 'PingFang SC', sans-serif";
    ctx.fillText(opts.sigLeft, 275, sigY + 24);
    ctx.fillText(opts.sigRight, 925, sigY + 24);

    drawWaxSeal(ctx, 600, sigY - 8, 52, p, opts.isStamped);

    // Serial & Date bar
    ctx.fillStyle = p.body;
    ctx.font = "bold 14px monospace";
    ctx.fillText(
      `${opts.serialLine}   |   ${opts.dateLine}   |   Template: ${template.toUpperCase()}`,
      600,
      760
    );

    // Explicit fictional & non-accredited disclaimer on certificate
    ctx.fillStyle = p.sub;
    ctx.font = "12px 'PingFang SC', sans-serif";
    ctx.fillText(
      "FICTIONAL PARODY DIPLOMA · NOT AN ACCREDITED INSTITUTION · 虚构讽刺大学娱乐证书 · 非法定认可学历学位",
      600,
      792
    );

    const dataUrl = canvas.toDataURL("image/png");
    const safeFileRecipient = (opts.recipient || "Alumni")
      .replace(/[^a-zA-Z0-9一-龥_-]/g, "_")
      .slice(0, 30) || "Alumni";
    const link = document.createElement("a");
    link.download = `ANU-Diploma-${template}-${safeFileRecipient}.png`;
    link.href = dataUrl;
    link.click();
    return dataUrl;
  }

  function exportPaperAcceptancePNG(paper, currentLang) {
    if (!paper) return null;
    const scale = 2; // 2400 x 1680 High-DPI PNG
    const logicalW = 1200;
    const logicalH = 860;

    const canvas = document.createElement("canvas");
    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#F7FAFF";
    ctx.fillRect(0, 0, logicalW, logicalH);

    ctx.strokeStyle = "#0B2E59";
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, logicalW - 60, logicalH - 60);

    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(48, 48, logicalW - 96, logicalH - 96);

    ctx.textAlign = "center";
    ctx.fillStyle = "#0B2E59";
    ctx.font = "bold 32px Georgia, serif";
    ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY PRESS", 600, 110);

    ctx.fillStyle = "#1D4ED8";
    ctx.font = "bold 21px Georgia, 'PingFang SC', serif";
    ctx.fillText(
      currentLang === "zh"
        ? "《Nature: Nothing》零字数手稿无条件录用通知书 · ACCEPTANCE LETTER"
        : "OFFICIAL LETTER OF ZERO-WORD MANUSCRIPT ACCEPTANCE",
      600,
      148
    );

    const dateStr = new Date().toISOString().slice(0, 10);
    ctx.fillStyle = "#4A6583";
    ctx.font = "15px monospace";
    ctx.fillText(`${paper.journal}   |   ${paper.doi}   |   Date: ${dateStr}`, 600, 184);

    ctx.strokeStyle = "#BFDBFE";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 206);
    ctx.lineTo(1100, 206);
    ctx.stroke();

    ctx.fillStyle = "#0F2540";
    const titleStr = currentLang === "zh" ? `《${paper.title}》` : `"${paper.title}"`;
    ctx.font = "bold 25px Georgia, 'Songti SC', serif";
    const titleLines = wrapCanvasText(ctx, titleStr, 940);
    titleLines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, 600, 252 + idx * 34);
    });

    ctx.fillStyle = "#1D4ED8";
    ctx.font = "18px Georgia, 'PingFang SC', sans-serif";
    ctx.fillText(paper.authors, 600, 336);

    // Manuscript box
    ctx.fillStyle = "#EFF6FF";
    ctx.fillRect(100, 362, 1000, 126);
    ctx.strokeStyle = "#93C5FD";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 362, 1000, 126);

    ctx.fillStyle = "#0B2E59";
    ctx.font = "italic 17px Georgia, 'PingFang SC', serif";
    const bodyLines = wrapCanvasText(ctx, paper.content, 920);
    bodyLines.slice(0, 2).forEach((l, i) => {
      ctx.fillText(l, 600, 405 + i * 26);
    });

    ctx.fillStyle = "#4A6583";
    ctx.font = "14px Georgia, 'PingFang SC', sans-serif";
    const footLines = wrapCanvasText(ctx, paper.footnote, 920);
    if (footLines[0]) ctx.fillText(footLines[0], 600, 466);

    // Peer Review Section
    ctx.fillStyle = "#0F2540";
    ctx.font = "bold 16px Georgia, 'PingFang SC', sans-serif";
    ctx.fillText(paper.reviewerHeader || "Peer Review Panel Verdict:", 600, 530);

    ctx.fillStyle = "#1E3A5F";
    ctx.font = "italic 15px Georgia, 'PingFang SC', serif";
    const cleanReview = (paper.review || "").replace(/\n+/g, "  ");
    const revLines = wrapCanvasText(ctx, cleanReview, 940);
    revLines.slice(0, 3).forEach((l, idx) => {
      ctx.fillText(l, 600, 562 + idx * 24);
    });

    // Stamp
    ctx.save();
    ctx.translate(600, 704);
    ctx.rotate(-0.08);
    ctx.fillStyle = "#1D4ED8";
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#93C5FD";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 12px Georgia, serif";
    ctx.fillText("ACCEPTED", 0, -6);
    ctx.fillText("0 WORDS", 0, 12);
    ctx.restore();

    ctx.fillStyle = "#4A6583";
    ctx.font = "12px 'PingFang SC', sans-serif";
    ctx.fillText(
      "SATIRICAL PARODY PUBLICATION · NO REAL DOI OR JOURNAL AFFILIATION · 虚构学术期刊娱乐证明 · 非真实学术发表",
      600,
      788
    );

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ANU-Acceptance-${paper.doi.replace(/[^a-zA-Z0-9.-]/g, "_")}.png`;
    link.href = dataUrl;
    link.click();
    return dataUrl;
  }

  global.ANU_CANVAS = {
    exportDiplomaPNG,
    exportPaperAcceptancePNG
  };
})(window);
