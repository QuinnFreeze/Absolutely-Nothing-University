(function () {
  // 1. Emergency Bulletins
  const bulletins = [
    "原定于今日下午举行的《拖延症导论》期中考试，因出卷教授尚未起床，正式推迟至下个世纪举行。",
    "校医院温馨提示：换季期间请注意保暖，如遇周一综合症发作，建议直接请假至周五下午。",
    "图书馆通告：三楼靠窗第 4 张沙发已被橘座主任征用为终身午睡区，请各位同学绕道发呆。",
    "后勤处喜讯：经过三年零八个月的激烈讨论，关于“是否要讨论食堂加菜”的提案已决定暂缓讨论。",
    "招生办紧急声明：请勿再向我校投递简历，凡是寄来的简历一律折成纸飞机从行政楼顶放飞。"
  ];
  let bulletinIdx = 0;
  const bulletinText = document.getElementById("bulletin-text");
  const nextBulletinBtn = document.getElementById("next-bulletin-btn");

  if (nextBulletinBtn && bulletinText) {
    nextBulletinBtn.addEventListener("click", () => {
      bulletinIdx = (bulletinIdx + 1) % bulletins.length;
      bulletinText.textContent = bulletins[bulletinIdx];
    });
  }

  // Tuition button Easter egg
  const tuitionBtn = document.getElementById("tuition-btn");
  if (tuitionBtn) {
    const tuitionStates = [
      "学费：¥0.00",
      "奖学金：精神鼓励 1 次",
      "住宿费：自备沙发",
      "教材费：全靠脑补"
    ];
    let tIdx = 0;
    tuitionBtn.addEventListener("click", () => {
      tIdx = (tIdx + 1) % tuitionStates.length;
      tuitionBtn.textContent = tuitionStates[tIdx];
    });
  }

  // 2. Live Provost Inactivity Ledger Counter
  let idleSeconds = 9482104;
  let savedBudget = 4290810;
  const idleCounterEl = document.getElementById("idle-seconds-counter");
  const savedBudgetEl = document.getElementById("saved-budget");
  const contributeBtn = document.getElementById("contribute-idle-btn");
  const contributeFeedback = document.getElementById("contribute-feedback");

  function updateLedgerDisplay() {
    if (idleCounterEl) {
      idleCounterEl.textContent = idleSeconds.toLocaleString("en-US") + " 秒";
    }
    if (savedBudgetEl) {
      savedBudgetEl.textContent = "$" + savedBudget.toLocaleString("en-US");
    }
  }

  setInterval(() => {
    idleSeconds += 1;
    if (Math.random() > 0.65) {
      savedBudget += Math.floor(Math.random() * 15);
    }
    updateLedgerDisplay();
  }, 1000);

  const praiseMessages = [
    "感谢贡献！教务处已为您记入三等摸鱼功勋一次。",
    "您的发呆极具学术深度，宇宙熵增速率因此下降了 0.0001%。",
    "校长在梦中向您投来了赞许的呼噜声。",
    "继续保持！再点几次您就能晋升为终身荣誉退堂鼓手。"
  ];

  if (contributeBtn) {
    contributeBtn.addEventListener("click", () => {
      idleSeconds += 10;
      savedBudget += 250;
      updateLedgerDisplay();
      if (contributeFeedback) {
        const msg = praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
        contributeFeedback.textContent = msg;
      }
    });
  }

  // 3. Instant Admission & Honorary Ph.D. Generator
  const nameInput = document.getElementById("applicant-name");
  const degreeSelect = document.getElementById("applicant-degree");
  const majorSelect = document.getElementById("applicant-major");
  const achievementSelect = document.getElementById("applicant-achievement");

  const certName = document.getElementById("cert-name");
  const certDegree = document.getElementById("cert-degree");
  const certMajor = document.getElementById("cert-major");
  const certCitation = document.getElementById("cert-citation");
  const certSerial = document.getElementById("cert-serial");
  const waxSeal = document.getElementById("wax-seal-badge");
  const stampBtn = document.getElementById("stamp-diploma-btn");
  const downloadBtn = document.getElementById("download-diploma-btn");
  const randomProfileBtn = document.getElementById("random-profile-btn");

  let currentSerial = "ANU-2026-VOID-00404";

  function syncDiplomaPreview() {
    const rawName = (nameInput && nameInput.value.trim()) || "无名躺平学者";
    if (certName) certName.textContent = rawName;
    if (certDegree && degreeSelect) certDegree.textContent = degreeSelect.value;
    if (certMajor && majorSelect) certMajor.textContent = "专业方向：" + majorSelect.value;
    if (certCitation && achievementSelect) {
      certCitation.textContent = "“" + achievementSelect.value + "并享有在全球任何沙发上理直气壮躺平之特权。”";
    }
  }

  [nameInput, degreeSelect, majorSelect, achievementSelect].forEach((el) => {
    if (el) {
      el.addEventListener("input", syncDiplomaPreview);
      el.addEventListener("change", syncDiplomaPreview);
    }
  });

  if (stampBtn && waxSeal) {
    stampBtn.addEventListener("click", () => {
      waxSeal.classList.remove("stamped");
      void waxSeal.offsetWidth; // trigger reflow
      waxSeal.classList.add("stamped");
      const randNum = Math.floor(10000 + Math.random() * 89999);
      currentSerial = `ANU-2026-VOID-${randNum}`;
      if (certSerial) {
        certSerial.textContent = `证书档案号：${currentSerial}（已加盖火漆大印）`;
      }
    });
  }

  const randomNames = [
    "周日晚上开始写作业选手",
    "会议静音吃薯片专家",
    "薛定谔的早起人",
    "奶茶三分糖去冰研究员",
    "被窝引力场捕获者",
    "闹钟连响八次不醒学者"
  ];

  if (randomProfileBtn) {
    randomProfileBtn.addEventListener("click", () => {
      if (nameInput) {
        nameInput.value = randomNames[Math.floor(Math.random() * randomNames.length)];
      }
      if (degreeSelect) {
        degreeSelect.selectedIndex = Math.floor(Math.random() * degreeSelect.options.length);
      }
      if (majorSelect) {
        majorSelect.selectedIndex = Math.floor(Math.random() * majorSelect.options.length);
      }
      if (achievementSelect) {
        achievementSelect.selectedIndex = Math.floor(Math.random() * achievementSelect.options.length);
      }
      syncDiplomaPreview();
      if (stampBtn) stampBtn.click();
    });
  }

  // High-Resolution Canvas Diploma Export
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext("2d");

      // Background Vellum
      ctx.fillStyle = "#FCF8EE";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer & Inner Borders
      ctx.strokeStyle = "#0D1B2A";
      ctx.lineWidth = 10;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // Crest Circle
      ctx.save();
      ctx.translate(600, 125);
      ctx.fillStyle = "#0D1B2A";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Empty Set Symbol inside Crest
      ctx.strokeStyle = "#DFC16D";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#8C1D40";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-16, 16);
      ctx.lineTo(16, -16);
      ctx.stroke();
      ctx.restore();

      // Header Texts
      ctx.textAlign = "center";
      ctx.fillStyle = "#0D1B2A";
      ctx.font = "bold 38px Georgia, serif";
      ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY", 600, 215);

      ctx.fillStyle = "#8C8577";
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillText("Universitas Rerum Nullarum · Sigillum Magnum", 600, 248);

      ctx.fillStyle = "#525B66";
      ctx.font = "20px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillText("经绝对虚无大学评议会全票弃权通过，兹郑重授予", 600, 305);

      // Recipient Name
      const recipient = (nameInput && nameInput.value.trim()) || "首席退堂鼓演奏家";
      ctx.fillStyle = "#8C1D40";
      ctx.font = "bold 48px 'Songti SC', Georgia, serif";
      ctx.fillText(recipient, 600, 375);

      // Golden Underline
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(330, 392);
      ctx.lineTo(870, 392);
      ctx.stroke();

      // Degree & Major
      const degree = (degreeSelect && degreeSelect.value) || "";
      const major = (majorSelect && majorSelect.value) || "";
      const citation = (achievementSelect && achievementSelect.value) || "";

      ctx.fillStyle = "#0D1B2A";
      ctx.font = "bold 28px Georgia, 'PingFang SC', serif";
      ctx.fillText(degree, 600, 448);

      ctx.fillStyle = "#1B2430";
      ctx.font = "bold 22px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillText("主修方向：" + major, 600, 492);

      ctx.fillStyle = "#525B66";
      ctx.font = "italic 19px 'PingFang SC', serif";
      ctx.fillText("“" + citation + "”", 600, 545);
      ctx.fillText("并享有在全球任何沙发上理直气壮躺平之特权。", 600, 576);

      // Signatures
      ctx.strokeStyle = "#0D1B2A";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(140, 700);
      ctx.lineTo(410, 700);
      ctx.moveTo(790, 700);
      ctx.lineTo(1060, 700);
      ctx.stroke();

      ctx.fillStyle = "#0D1B2A";
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillText("Albert Slackingstein", 275, 685);
      ctx.fillText("Prof. Ginger (Meow)", 925, 685);

      ctx.fillStyle = "#525B66";
      ctx.font = "16px 'PingFang SC', sans-serif";
      ctx.fillText("第 404 任校长（代签：他睡着了）", 275, 728);
      ctx.fillText("教务长兼图书馆首席呼噜官", 925, 728);

      // Crimson Seal Stamp
      ctx.save();
      ctx.translate(600, 688);
      ctx.rotate(-0.12);
      ctx.fillStyle = "#8C1D40";
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#DFC16D";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      ctx.fillStyle = "#FAF6EE";
      ctx.font = "bold 14px Georgia, serif";
      ctx.fillText("OFFICIAL SEAL", 0, -14);
      ctx.fillText("NIHIL AGERE", 0, 5);
      ctx.fillText("100% VOID", 0, 24);
      ctx.restore();

      // Serial Footer
      ctx.fillStyle = "#8C8577";
      ctx.font = "15px monospace";
      ctx.fillText(`Serial: ${currentSerial}  |  Issued by Absolutely Nothing University`, 600, 772);

      const link = document.createElement("a");
      link.download = `ANU-Diploma-${recipient}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }

  // 4. Course Catalog & Syllabus Drawer
  const courses = [
    {
      code: "NTH-101",
      title: "如何把两分钟的活干成两个月",
      deptKey: "procrastination",
      deptName: "量子拖延与死线实验室",
      credits: "0.0",
      room: "404 查无此室",
      prof: "司马改天 教授",
      desc: "深入剖析“先泡杯茶、再清理桌面、顺便重装系统”的完整心理防御机制，手把手指导学生将一封三句话的邮件拖延至跨年。",
      grading: "按时交作业者直接挂科（违背本院宗旨）；死线后一周提交得 B；彻底忘记有这门课者获评 A+ 模范标兵。",
      book: "《从入门到放弃：全新未拆封空白笔记本》（第 17 版，买来垫显示器即可）"
    },
    {
      code: "RET-202",
      title: "退堂鼓古典打击乐与战略性放弃",
      deptKey: "retreat",
      deptName: "退堂鼓与战略放弃学院",
      credits: "0.0",
      room: "被窝远程连线",
      prof: "堂吉诃退 院士",
      desc: "系统传授在立完新年 Flag 后第 3 分钟精准击响退堂鼓的腕部发力技巧，实现“只要我不开始，就不会失败”的哲学闭环。",
      grading: "第一周即办理退课者直接获得满分学分；坚持听完第二节课者需补交检讨。",
      book: "《算了吧，也没多重要》（精装空白画册）"
    },
    {
      code: "PRF-305",
      title: "会议室眼神放空与高频点头工程学",
      deptKey: "perfunctory",
      deptName: "高级糊弄与会议放空系",
      credits: "0.0",
      room: "腾讯/Zoom 静音房",
      prof: "伊丽莎白·行吧 教授",
      desc: "训练学生在长达四小时的汇报中保持每分钟 4.2 次微幅点头、眉头微蹙若有所思，同时大脑完整重温《甄嬛传》全集。",
      grading: "期末考核为连续回复十句“确实”“有道理”“回去对齐一下”而不露破绽。",
      book: "《糊弄学大辞典：从“收到”到“下次一定”》"
    },
    {
      code: "DRM-108",
      title: "阳光午后沙发流体力学与深度呼噜",
      deptKey: "daydream",
      deptName: "神游太虚与午睡工程学院",
      credits: "0.0",
      room: "图书馆三楼绒布沙发",
      prof: "橘座大主任 (猫)",
      desc: "研究人体在饭后 13:15 与绒布沙发接触时的液化相变过程，掌握在闹钟响起时将其无缝编织进梦境剧本的高阶技能。",
      grading: "呼吸均匀即及格，打呼噜自带混响者加授院级奖章。",
      book: "无需教材（建议直接拿枕头代替）"
    },
    {
      code: "NTH-404",
      title: "死线前 10 分钟肾上腺素超光速物理",
      deptKey: "procrastination",
      deptName: "量子拖延与死线实验室",
      credits: "0.0",
      room: "23:50 的书桌前",
      prof: "司马改天 教授",
      desc: "探索人类在 23:59 截止提交前 9 分钟突破打字速度物理极限的相对论效应，证明“生产力与剩余时间成反比”宇宙定律。",
      grading: "23:59:59 压哨提交或因断网顺延者获评优秀。",
      book: "《今晚通宵明天一定早睡》（科幻小说分册）"
    },
    {
      code: "PRF-210",
      title: "空文件夹命名艺术：从 v1 到打死不改版",
      deptKey: "perfunctory",
      deptName: "高级糊弄与会议放空系",
      credits: "0.0",
      room: "桌面新建文件夹(99)",
      prof: "伊丽莎白·行吧 教授",
      desc: "探讨如何通过创建结构严谨的文件夹目录来产生“工作已经完成了一大半”的饱满成就感，然后安心去吃夜宵。",
      grading: "提交一个 0 字节的 .zip 压缩包并声称文件损坏即可满分通过。",
      book: "《Ctrl+N 的精神慰藉》"
    },
    {
      code: "RET-330",
      title: "健身房年卡慈善捐助与洗澡导论",
      deptKey: "retreat",
      deptName: "退堂鼓与战略放弃学院",
      credits: "0.0",
      room: "办卡柜台（仅去一次）",
      prof: "堂吉诃退 院士",
      desc: "阐述“办卡即瘦身、买书即读完、收藏即学会”的量子纠缠等效原理，彻底消除不去健身房的道德负罪感。",
      grading: "全年去健身房不超过 1 次（含办卡当天）者自动保研。",
      book: "《我的瑜伽垫为什么长草了》"
    },
    {
      code: "DRM-499",
      title: "如果当初中了五千万：平行宇宙资产配置",
      deptKey: "daydream",
      deptName: "神游太虚与午睡工程学院",
      credits: "0.0",
      room: "发呆窗台前",
      prof: "阿尔伯特·摸鱼斯坦 校长",
      desc: "手把手推演中奖后如何低调领奖、穿什么面具、买哪座海岛、以及如何优雅地向老板递交空白辞职信，尽管从未买过彩票。",
      grading: "白日梦情节越细腻、越脱离现实，平时分越高。",
      book: "《意念富豪榜年度报告》"
    }
  ];

  const courseTbody = document.getElementById("course-tbody");
  const deptTabs = document.querySelectorAll(".dept-tab");
  const sylCode = document.getElementById("syl-code");
  const sylTitle = document.getElementById("syl-title");
  const sylDept = document.getElementById("syl-dept");
  const sylCredits = document.getElementById("syl-credits");
  const sylProf = document.getElementById("syl-prof");
  const sylRoom = document.getElementById("syl-room");
  const sylDesc = document.getElementById("syl-desc");
  const sylGrading = document.getElementById("syl-grading");
  const sylBook = document.getElementById("syl-book");
  const enrollBtn = document.getElementById("enroll-course-btn");
  const enrollFeedback = document.getElementById("enroll-feedback");

  let selectedCourseCode = courses[0].code;

  function renderInspector(course) {
    if (!course) return;
    selectedCourseCode = course.code;
    if (sylCode) sylCode.textContent = course.code;
    if (sylTitle) sylTitle.textContent = course.title;
    if (sylDept) sylDept.textContent = "院系：" + course.deptName;
    if (sylCredits) sylCredits.textContent = `学分：${course.credits} 学分`;
    if (sylProf) sylProf.textContent = "主讲：" + course.prof;
    if (sylRoom) sylRoom.textContent = "教室：" + course.room;
    if (sylDesc) sylDesc.textContent = course.desc;
    if (sylGrading) sylGrading.textContent = course.grading;
    if (sylBook) sylBook.textContent = course.book;
    if (enrollFeedback) {
      enrollFeedback.textContent = `当前正在查看《${course.title}》大纲。`;
    }
  }

  function renderCourseTable(filterDept) {
    if (!courseTbody) return;
    courseTbody.innerHTML = "";
    const filtered = filterDept === "all"
      ? courses
      : courses.filter((c) => c.deptKey === filterDept);

    filtered.forEach((course) => {
      const tr = document.createElement("tr");
      tr.className = "course-row" + (course.code === selectedCourseCode ? " selected" : "");
      tr.innerHTML = `
        <td class="course-code">${course.code}</td>
        <td class="course-title-cell">
          <strong>${course.title}</strong>
          <span>${course.deptName} · 主讲：${course.prof}</span>
        </td>
        <td>${course.credits}</td>
        <td>${course.room}</td>
      `;
      tr.addEventListener("click", () => {
        renderInspector(course);
        renderCourseTable(filterDept);
      });
      courseTbody.appendChild(tr);
    });
  }

  deptTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      deptTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const dept = tab.getAttribute("data-dept") || "all";
      const firstMatch = dept === "all" ? courses[0] : courses.find((c) => c.deptKey === dept);
      if (firstMatch) renderInspector(firstMatch);
      renderCourseTable(dept);
    });
  });

  if (enrollBtn) {
    enrollBtn.addEventListener("click", () => {
      const current = courses.find((c) => c.code === selectedCourseCode) || courses[0];
      if (enrollFeedback) {
        enrollFeedback.textContent = `恭喜！您已成功选修《${current.title}》并同步办理了全学期自动翘课手续，期末成绩锁定为 A+。`;
      }
    });
  }

  renderCourseTable("all");

  // 5. Blank Paper Archive
  const papers = [
    {
      doi: "DOI: 10.0000/anu.void.2026.001",
      journal: "Nature: Nothing · Vol. 404",
      title: "论什么都不做对避免犯错的决定性贡献：一项为期十年的空白对照实验",
      authors: "张躺平¹, 李改天², 橘座(猫)³ · 绝对虚无大学高等摸鱼研究院",
      citations: "被引次数：∞ 次（全靠作者梦里自引）",
      content: "[ 全文完 · 本论文正文共 0 字，耗资 0 元，未伤害任何脑细胞 ]",
      footnote: "注：作者原计划撰写三万字综述，后因下午茶太好吃而作罢。",
      review: "“这是我审稿生涯中读过最清爽的一篇论文！没有任何语法错误，没有任何数据造假，因为根本没有数据。建议直接颁发诺贝尔和平奖与最佳睡眠奖。”"
    },
    {
      doi: "DOI: 10.0000/anu.void.2026.002",
      journal: "Journal of Pure Procrastination · Issue 0",
      title: "基于“下次一定”算法的无限期任务推迟模型及其在周报中的应用",
      authors: "司马改天¹, 王算了² · 量子拖延与死线实验室",
      citations: "被引次数：0 次（审稿人说改天再看）",
      content: "摘要：待补充。引言：明天写。实验结果：略。结论：算了吧。",
      footnote: "致谢：感谢外卖小哥在截稿前送来的炸鸡，使作者彻底放弃了写作。",
      review: "“作者将拖延主义贯彻到了论文排版本身，连页码都懒得标，展现了极高的知行合一水准，原则上同意无条件发表。”"
    },
    {
      doi: "DOI: 10.0000/anu.void.2026.003",
      journal: "Transactions on Feline Nap Engineering",
      title: "咕噜声频率对两脚兽放弃写代码意愿的催化作用研究",
      authors: "橘座大主任 (唯一通讯作者)",
      citations: "被引次数：8,920 罐金枪鱼罐头",
      content: "喵。呼噜噜噜噜噜噜。喵。（附三枚沾有猫毛的肉垫印章）",
      footnote: "基金支持：本课题受“全校师生自发投喂小鱼干基金”全额资助。",
      review: "“虽然看不懂正文，但通讯作者实在太可爱了，谁敢拒稿谁就是猫猫的敌人。Accept as is!”"
    }
  ];

  const paperListEl = document.getElementById("paper-list");
  const readerDoi = document.getElementById("reader-doi");
  const readerCitations = document.getElementById("reader-citations");
  const readerTitle = document.getElementById("reader-title");
  const readerAuthors = document.getElementById("reader-authors");
  const readerContent = document.getElementById("reader-content");
  const readerFootnote = document.getElementById("reader-footnote");
  const readerReview = document.getElementById("reader-review");

  let activePaperIdx = 0;

  function renderPaperList() {
    if (!paperListEl) return;
    paperListEl.innerHTML = "";
    papers.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "paper-entry" + (idx === activePaperIdx ? " active" : "");
      card.innerHTML = `
        <div class="paper-journal">${p.journal}</div>
        <h3 class="paper-entry-title">${p.title}</h3>
        <div class="paper-authors">${p.authors}</div>
      `;
      card.addEventListener("click", () => {
        activePaperIdx = idx;
        if (readerDoi) readerDoi.textContent = p.doi;
        if (readerCitations) readerCitations.textContent = p.citations;
        if (readerTitle) readerTitle.textContent = p.title;
        if (readerAuthors) readerAuthors.textContent = p.authors;
        if (readerContent) readerContent.textContent = p.content;
        if (readerFootnote) readerFootnote.textContent = p.footnote;
        if (readerReview) readerReview.textContent = p.review;
        renderPaperList();
      });
      paperListEl.appendChild(card);
    });
  }

  renderPaperList();

  // 6. Live Campus Webcams Clock & Refresh
  const clocks = document.querySelectorAll(".webcam-clock");
  function updateWebcamClocks() {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    clocks.forEach((c) => {
      c.textContent = timeStr;
    });
  }
  updateWebcamClocks();
  setInterval(updateWebcamClocks, 1000);

  const camUpdates = {
    "1": [
      "画面静止：空无一人（蜘蛛正在结第 4 张网）",
      "最新动态：刚才有一粒灰尘落在了第 3 排课桌上",
      "最新动态：依然没人，连蜘蛛都去睡午觉了"
    ],
    "2": [
      "特写画面：一杯从周一泡到周五的枸杞保温杯",
      "最新动态：枸杞沉下去了一颗，校长仍未出现",
      "最新动态：窗外飞过一只鸽子，与本室气场高度契合"
    ],
    "3": [
      "节能模式：插头已拔下，机箱正用于烘烤红薯",
      "最新动态：红薯已经烤出糖油，香气弥漫整个机房",
      "最新动态：保卫处大爷翻了个面，红薯熟度达 99%"
    ],
    "4": [
      "微风吹过一片落叶，全校师生一致认为不必扫地",
      "最新动态：又落下一片树叶，与前一片组成了二元对称留白",
      "最新动态：橘座主任路过草坪并打了个哈欠"
    ]
  };

  const camStateIdx = { "1": 0, "2": 0, "3": 0, "4": 0 };
  document.querySelectorAll(".webcam-ping-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const camId = btn.getAttribute("data-cam");
      if (!camId || !camUpdates[camId]) return;
      camStateIdx[camId] = (camStateIdx[camId] + 1) % camUpdates[camId].length;
      const statusEl = document.getElementById(`cam-status-${camId}`);
      if (statusEl) {
        statusEl.textContent = camUpdates[camId][camStateIdx[camId]];
      }
    });
  });

  // Footer donate nothing link
  const donateLink = document.getElementById("donate-nothing-link");
  if (donateLink) {
    donateLink.addEventListener("click", (e) => {
      e.preventDefault();
      alert("捐赠成功！您向绝对虚无大学校友基金会慷慨捐赠了 ¥0.00 元，财务处决定懒得给您开发票。");
    });
  }
})();
