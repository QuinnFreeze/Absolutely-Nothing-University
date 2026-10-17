(function () {
  "use strict";

  const DATA = window.ANU_DATA;
  const CANVAS_EXPORT = window.ANU_CANVAS;
  if (!DATA) return;

  const {
    i18nDict,
    excusesByLang,
    bulletinsByLang,
    tuitionStatesByLang,
    praiseByLang,
    degreeOptionsByLang,
    majorOptionsByLang,
    honorTitlesByLang,
    certTemplatesByLang,
    citationOptionsByLang,
    randomNamesByLang,
    coursesByLang,
    papersByLang,
    journalOptionsByLang,
    methodologyOptionsByLang,
    randomPaperTopicsPool,
    peerReviewPoolByLang,
    citationsPoolByLang,
    facultyByLang,
    cafeMenuByLang,
    clubsByLang,
    camUpdatesByLang
  } = DATA;

  // Fallback static announcements in case fetch() fails under file:// protocol
  const fallbackAnnouncementsData = {
    chancellor: {
      id: "ANU-CHANCELLOR-404",
      term: "1899 – ∞",
      officeRoom: "Room 404, Hall of Strategic Slacking",
      zh: {
        name: "阿尔伯特·摸鱼斯坦 爵士 (Prof. Sir Albert Slackingstein)",
        title: "绝对虚无大学第 404 任终身荣誉校长 · 皇家退堂鼓学会首席院士",
        degrees: "Ph.D. (Pure Void), D.S.P. (Honoris Causa), F.R.S. (Fellow of Royal Snoozing)",
        motto: "“凡事只要拖到明天，就有 50% 的概率永远不需要做了。”",
        bio: "摸鱼斯坦校长于 1899 年因在就任典礼上睡过头而全票当选。执掌 ANU 百余年来，他成功取消了全校所有早八课程、废除了期末绩效考核，并将行政楼改造为恒温午睡保护区。他的学术代表作《论什么都不做的宇宙热力学优越性》至今仍未动笔。",
        schedule: [
          { time: "09:00 – 11:30", activity: "深度 REM 睡眠与被窝引力场观测" },
          { time: "11:30 – 13:30", activity: "思考中午吃什么及带薪午休" },
          { time: "13:30 – 17:00", activity: "在办公桌前凝视枸杞保温杯发呆" },
          { time: "17:00 – 次日", activity: "准时下班并开启全校邮件免打扰模式" }
        ]
      },
      en: {
        name: "Prof. Sir Albert Slackingstein",
        title: "404th Tenured Chancellor of ANU · Fellow of the Royal Snoozing Society",
        degrees: "Ph.D. (Pure Void), D.S.P. (Honoris Causa), F.R.S. (Fellow of Royal Snoozing)",
        motto: "“Any task postponed until tomorrow has a 50% chance of never needing to be done at all.”",
        bio: "Elected unanimously in 1899 after oversleeping his own inauguration ceremony, Chancellor Slackingstein has spent over a century abolishing 8:00 AM lectures, dismantling faculty KPIs, and converting the Administration Building into a climate-controlled nap sanctuary.",
        schedule: [
          { time: "09:00 – 11:30", activity: "Deep REM Sleep & Duvet Gravity Observation" },
          { time: "11:30 – 13:30", activity: "Contemplating Lunch & Compensatory Nap" },
          { time: "13:30 – 17:00", activity: "Staring Pensively at a Cold Goji-Berry Thermos" },
          { time: "17:00 – Next Day", activity: "Punctual Departure & Campus-Wide Email Mute" }
        ]
      }
    },
    announcements: []
  };

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem("anu_lang");
      if (saved === "zh" || saved === "en") return saved;
    } catch (_) {}
    const langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
    for (const l of langs) {
      if (!l) continue;
      const lower = l.toLowerCase();
      if (lower.startsWith("zh")) return "zh";
      if (lower.startsWith("en")) return "en";
    }
    return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function detectInitialTheme() {
    try {
      const saved = localStorage.getItem("anu_theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch (_) {}
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function loadJoinedClubs() {
    try {
      const raw = localStorage.getItem("anu_joined_clubs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (_) {}
    return new Set();
  }

  function saveJoinedClubs(setObj) {
    try {
      localStorage.setItem("anu_joined_clubs", JSON.stringify(Array.from(setObj)));
    } catch (_) {}
  }

  let currentLang = detectInitialLang();
  let currentTheme = detectInitialTheme();
  let currentPage = "overview";

  const validPages = [
    "overview",
    "admissions",
    "academics",
    "research",
    "faculty",
    "campus",
    "webcams"
  ];

  // Runtime states
  let bulletinIdx = 0;
  let tuitionIdx = 0;
  let excuseIdx = 0;
  let idleSeconds = 9482104;
  let savedBudget = 4290810;
  let currentSerial = "ANU-2026-VOID-00404";
  let isStamped = false;
  let currentDeptFilter = "all";
  let selectedCourseCode = "NTH-101";
  let activePaperIdx = 0;
  let randomTopicCursor = 0;
  let currentCafeFilter = "all";
  let currentAnnCategory = "all";
  let highlightedAnnId = null;
  let announcementsData = fallbackAnnouncementsData;
  const joinedClubs = loadJoinedClubs();
  const camStateIdx = { "1": 0, "2": 0, "3": 0, "4": 0 };

  // DOM References
  const sidebarEl = document.getElementById("uni-sidebar");
  const backdropEl = document.getElementById("sidebar-backdrop");
  const mobileToggleBtn = document.getElementById("mobile-menu-toggle");
  const mobileLangBtn = document.getElementById("mobile-lang-btn");
  const mobileThemeBtn = document.getElementById("mobile-theme-btn");
  const navButtons = document.querySelectorAll("[data-page-target]");
  const pageViews = document.querySelectorAll(".page-view");

  const bulletinText = document.getElementById("bulletin-text");
  const nextBulletinBtn = document.getElementById("next-bulletin-btn");
  const tuitionBtn = document.getElementById("tuition-btn");
  const langSwitchBtn = document.getElementById("lang-switch-btn");
  const themeSwitchBtn = document.getElementById("theme-switch-btn");
  const excuseGenBtn = document.getElementById("excuse-gen-btn");
  const sidebarExcuseText = document.getElementById("sidebar-excuse-text");

  const idleCounterEl = document.getElementById("idle-seconds-counter");
  const savedBudgetEl = document.getElementById("saved-budget");
  const contributeBtn = document.getElementById("contribute-idle-btn");
  const contributeFeedback = document.getElementById("contribute-feedback");

  // Chancellor & Announcements DOM
  const chancellorNameEl = document.getElementById("chancellor-name");
  const chancellorTitleEl = document.getElementById("chancellor-title");
  const chancellorDegreesEl = document.getElementById("chancellor-degrees");
  const chancellorBioEl = document.getElementById("chancellor-bio");
  const chancellorMottoEl = document.getElementById("chancellor-motto");
  const chancellorScheduleListEl = document.getElementById("chancellor-schedule-list");
  const announcementsListEl = document.getElementById("announcements-list");
  const randomAnnBtn = document.getElementById("random-ann-btn");
  const annFilterBtns = document.querySelectorAll("[data-ann-cat]");

  // Admissions & Diploma DOM
  const nameInput = document.getElementById("applicant-name");
  const degreeSelect = document.getElementById("applicant-degree");
  const majorSelect = document.getElementById("applicant-major");
  const honorSelect = document.getElementById("applicant-honor");
  const templateSelect = document.getElementById("applicant-template");
  const certLangSelect = document.getElementById("applicant-cert-lang");
  const achievementSelect = document.getElementById("applicant-achievement");
  const diplomaCard = document.getElementById("diploma-card");
  const certSubHeader = document.getElementById("cert-sub-header");
  const certProclamation = document.getElementById("cert-proclamation");
  const certName = document.getElementById("cert-name");
  const certDegree = document.getElementById("cert-degree");
  const certMajor = document.getElementById("cert-major");
  const certHonor = document.getElementById("cert-honor");
  const certCitation = document.getElementById("cert-citation");
  const certSigLeft = document.getElementById("cert-sig-left");
  const certSigRight = document.getElementById("cert-sig-right");
  const certSerial = document.getElementById("cert-serial");
  const certDate = document.getElementById("cert-date");
  const waxSeal = document.getElementById("wax-seal-badge");
  const stampBtn = document.getElementById("stamp-diploma-btn");
  const downloadBtn = document.getElementById("download-diploma-btn");
  const randomProfileBtn = document.getElementById("random-profile-btn");
  const randomHonorBtn = document.getElementById("random-honor-btn");

  // Academics & Exam DOM
  const courseTbody = document.getElementById("course-tbody");
  const deptTabs = document.querySelectorAll(".dept-tab");
  const sylCode = document.getElementById("syl-code");
  const sylTitle = document.getElementById("syl-title");
  const sylDept = document.getElementById("syl-dept");
  const sylCredits = document.getElementById("syl-credits");
  const sylProf = document.getElementById("syl-prof");
  const sylRoom = document.getElementById("syl-room");
  const sylDesc = document.getElementById("syl-desc");
  const sylProfBio = document.getElementById("syl-prof-bio");
  const sylWeeksList = document.getElementById("syl-weeks-list");
  const sylGrading = document.getElementById("syl-grading");
  const sylBook = document.getElementById("syl-book");
  const enrollBtn = document.getElementById("enroll-course-btn");
  const scrollExamBtn = document.getElementById("scroll-exam-btn");
  const enrollFeedback = document.getElementById("enroll-feedback");
  const mockExamSection = document.getElementById("mock-exam-section");
  const examPanelHeading = document.getElementById("exam-panel-heading");
  const examCourseBadge = document.getElementById("exam-course-badge");
  const examQuestionsContainer = document.getElementById("exam-questions-container");
  const submitExamBtn = document.getElementById("submit-exam-btn");
  const resetExamBtn = document.getElementById("reset-exam-btn");
  const examTranscriptBox = document.getElementById("exam-transcript-box");
  const examTranscriptGrade = document.getElementById("exam-transcript-grade");
  const examTranscriptComment = document.getElementById("exam-transcript-comment");

  // Research DOM
  const paperListEl = document.getElementById("paper-list");
  const readerDoi = document.getElementById("reader-doi");
  const readerCitations = document.getElementById("reader-citations");
  const readerTitle = document.getElementById("reader-title");
  const readerAuthors = document.getElementById("reader-authors");
  const readerContent = document.getElementById("reader-content");
  const readerFootnote = document.getElementById("reader-footnote");
  const readerReviewerHeader = document.getElementById("reader-reviewer-header");
  const readerReview = document.getElementById("reader-review");
  const downloadPaperCertBtn = document.getElementById("download-paper-cert-btn");
  const newPaperInput = document.getElementById("new-paper-title-input");
  const newPaperAuthorInput = document.getElementById("new-paper-author-input");
  const newPaperJournalSelect = document.getElementById("new-paper-journal-select");
  const newPaperStyleSelect = document.getElementById("new-paper-style-select");
  const submitBlankPaperBtn = document.getElementById("submit-blank-paper-btn");
  const randomPaperTopicBtn = document.getElementById("random-paper-topic-btn");
  const submitPaperStatusEl = document.getElementById("submit-paper-status");

  // Faculty & Campus Life DOM
  const facultyGridEl = document.getElementById("faculty-grid");
  const emailProfSelect = document.getElementById("email-prof-select");
  const emailQuestionInput = document.getElementById("email-question-input");
  const sendProfEmailBtn = document.getElementById("send-prof-email-btn");
  const emailReplyOutput = document.getElementById("email-reply-output");

  const cafeMenuListEl = document.getElementById("cafe-menu-list");
  const cafeFilterBtns = document.querySelectorAll("[data-cafe-cat]");
  const oracleResultEl = document.getElementById("oracle-result");
  const spinLunchBtn = document.getElementById("spin-lunch-btn");
  const clubsListEl = document.getElementById("clubs-list");
  const clubJoinFeedbackEl = document.getElementById("club-join-feedback");
  const toggleNightVisionBtn = document.getElementById("toggle-night-vision-btn");
  const webcamGridEl = document.getElementById("webcam-grid");

  // Theme Controller
  function applyTheme(theme) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    try {
      localStorage.setItem("anu_theme", currentTheme);
    } catch (_) {}
    syncThemeButtons();
  }

  function syncThemeButtons() {
    const dict = i18nDict[currentLang];
    if (themeSwitchBtn) {
      themeSwitchBtn.textContent = currentTheme === "dark" ? dict.theme_btn_light : dict.theme_btn_dark;
    }
    if (mobileThemeBtn) {
      mobileThemeBtn.textContent = currentTheme === "dark" ? "☀️" : "🌙";
    }
  }

  // Multi-Page Sidebar Router
  function closeMobileSidebar() {
    if (sidebarEl) sidebarEl.classList.remove("open");
    if (backdropEl) backdropEl.classList.remove("open");
    if (mobileToggleBtn) mobileToggleBtn.setAttribute("aria-expanded", "false");
  }

  function switchToPage(pageKey, updateHash = true) {
    const target = validPages.includes(pageKey) ? pageKey : "overview";
    currentPage = target;

    pageViews.forEach((sec) => {
      const p = sec.getAttribute("data-page");
      sec.classList.toggle("active", p === target);
    });

    navButtons.forEach((btn) => {
      const p = btn.getAttribute("data-page-target");
      const isMatch = p === target;
      btn.classList.toggle("active", isMatch);
      if (isMatch) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    if (updateHash) {
      history.replaceState(null, "", `#${target}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeMobileSidebar();
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-page-target");
      if (target) switchToPage(target, true);
    });
  });

  document.querySelectorAll("[data-goto-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-goto-page");
      if (target) switchToPage(target, true);
    });
  });

  window.addEventListener("hashchange", () => {
    const rawHash = (window.location.hash || "").replace(/^#/, "");
    if (validPages.includes(rawHash)) {
      switchToPage(rawHash, false);
    }
  });

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener("click", () => {
      const isOpen = sidebarEl && sidebarEl.classList.toggle("open");
      if (backdropEl) backdropEl.classList.toggle("open", Boolean(isOpen));
      mobileToggleBtn.setAttribute("aria-expanded", String(Boolean(isOpen)));
    });
  }

  if (backdropEl) {
    backdropEl.addEventListener("click", closeMobileSidebar);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileSidebar();
    }
  });

  // Load Announcements JSON
  async function fetchAnnouncementsData() {
    try {
      const res = await fetch("data/announcements.json");
      if (res.ok) {
        const json = await res.json();
        if (json && json.chancellor && Array.isArray(json.announcements)) {
          announcementsData = json;
          renderChancellorAndAnnouncements();
        }
      }
    } catch (_) {
      renderChancellorAndAnnouncements();
    }
  }

  function renderChancellorAndAnnouncements() {
    if (!announcementsData) return;
    const ch = announcementsData.chancellor && announcementsData.chancellor[currentLang];
    if (ch) {
      if (chancellorNameEl) chancellorNameEl.textContent = ch.name;
      if (chancellorTitleEl) chancellorTitleEl.textContent = ch.title;
      if (chancellorDegreesEl) chancellorDegreesEl.textContent = ch.degrees;
      if (chancellorBioEl) chancellorBioEl.textContent = ch.bio;
      if (chancellorMottoEl) chancellorMottoEl.textContent = ch.motto;

      if (chancellorScheduleListEl) {
        chancellorScheduleListEl.textContent = "";
        (ch.schedule || []).forEach((slot) => {
          const li = document.createElement("li");
          const timeSpan = document.createElement("strong");
          timeSpan.textContent = slot.time;
          const actSpan = document.createElement("span");
          actSpan.textContent = slot.activity;
          li.appendChild(timeSpan);
          li.appendChild(actSpan);
          chancellorScheduleListEl.appendChild(li);
        });
      }
    }

    if (!announcementsListEl) return;
    announcementsListEl.textContent = "";
    const allItems = announcementsData.announcements || [];
    const filtered = currentAnnCategory === "all"
      ? allItems
      : allItems.filter((item) => item.category === currentAnnCategory);

    filtered.forEach((item) => {
      const loc = item[currentLang] || item.zh;
      if (!loc) return;

      const card = document.createElement("article");
      card.className = "ann-item" + (item.id === highlightedAnnId ? " highlighted" : "");
      card.setAttribute("data-ann-id", item.id);

      const metaDiv = document.createElement("div");
      metaDiv.className = "ann-item-meta";

      const leftMeta = document.createElement("span");
      const badgeSpan = document.createElement("span");
      badgeSpan.className = "ann-badge";
      badgeSpan.textContent = loc.categoryLabel;
      const deptText = document.createTextNode(` · ${loc.dept}`);
      leftMeta.appendChild(badgeSpan);
      leftMeta.appendChild(deptText);

      const rightMeta = document.createElement("span");
      rightMeta.textContent = `${item.id} · ${item.date}`;

      metaDiv.appendChild(leftMeta);
      metaDiv.appendChild(rightMeta);

      const titleH4 = document.createElement("h4");
      titleH4.textContent = loc.title;

      const summaryP = document.createElement("p");
      summaryP.textContent = loc.summary;

      card.appendChild(metaDiv);
      card.appendChild(titleH4);
      card.appendChild(summaryP);
      announcementsListEl.appendChild(card);
    });
  }

  annFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      annFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentAnnCategory = btn.getAttribute("data-ann-cat") || "all";
      highlightedAnnId = null;
      renderChancellorAndAnnouncements();
    });
  });

  if (randomAnnBtn) {
    randomAnnBtn.addEventListener("click", () => {
      const list = announcementsData.announcements || [];
      if (!list.length) return;
      currentAnnCategory = "all";
      annFilterBtns.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-ann-cat") === "all");
      });
      const picked = list[Math.floor(Math.random() * list.length)];
      highlightedAnnId = picked.id;
      renderChancellorAndAnnouncements();
      const el = announcementsListEl && announcementsListEl.querySelector(`[data-ann-id="${picked.id}"]`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  // Ledger Display
  function updateLedgerDisplay() {
    if (idleCounterEl) {
      const unit = currentLang === "zh" ? " 秒" : " sec";
      idleCounterEl.textContent = idleSeconds.toLocaleString("en-US") + unit;
    }
    if (savedBudgetEl) {
      savedBudgetEl.textContent = "$" + savedBudget.toLocaleString("en-US");
    }
  }

  // Admissions & Diploma Generator
  function populateAdmissionSelects(preserveIndices) {
    const degIdx = preserveIndices && degreeSelect ? Math.max(0, degreeSelect.selectedIndex) : 0;
    const majIdx = preserveIndices && majorSelect ? Math.max(0, majorSelect.selectedIndex) : 0;
    const honIdx = preserveIndices && honorSelect ? Math.max(0, honorSelect.selectedIndex) : 0;
    const tplIdx = preserveIndices && templateSelect ? Math.max(0, templateSelect.selectedIndex) : 0;
    const citIdx = preserveIndices && achievementSelect ? Math.max(0, achievementSelect.selectedIndex) : 0;

    if (degreeSelect) {
      degreeSelect.textContent = "";
      degreeOptionsByLang[currentLang].forEach((deg, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = deg;
        degreeSelect.appendChild(opt);
      });
      degreeSelect.selectedIndex = Math.min(degIdx, degreeOptionsByLang[currentLang].length - 1);
    }

    if (majorSelect) {
      majorSelect.textContent = "";
      majorOptionsByLang[currentLang].forEach((maj, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = maj;
        majorSelect.appendChild(opt);
      });
      majorSelect.selectedIndex = Math.min(majIdx, majorOptionsByLang[currentLang].length - 1);
    }

    if (honorSelect) {
      honorSelect.textContent = "";
      honorTitlesByLang[currentLang].forEach((hon, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = hon;
        honorSelect.appendChild(opt);
      });
      honorSelect.selectedIndex = Math.min(honIdx, honorTitlesByLang[currentLang].length - 1);
    }

    if (templateSelect) {
      templateSelect.textContent = "";
      certTemplatesByLang[currentLang].forEach((tpl) => {
        const opt = document.createElement("option");
        opt.value = tpl.id;
        opt.textContent = tpl.label;
        templateSelect.appendChild(opt);
      });
      templateSelect.selectedIndex = Math.min(tplIdx, certTemplatesByLang[currentLang].length - 1);
    }

    if (achievementSelect) {
      achievementSelect.textContent = "";
      citationOptionsByLang[currentLang].forEach((cit, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = cit.label;
        achievementSelect.appendChild(opt);
      });
      achievementSelect.selectedIndex = Math.min(citIdx, citationOptionsByLang[currentLang].length - 1);
    }
  }

  function getResolvedCertData() {
    const mode = (certLangSelect && certLangSelect.value) || "auto";
    const targetLang = mode === "auto" ? currentLang : (mode === "en" ? "en" : "zh");
    const isBilingual = mode === "bilingual";

    const degIdx = degreeSelect ? (parseInt(degreeSelect.value, 10) || 0) : 0;
    const majIdx = majorSelect ? (parseInt(majorSelect.value, 10) || 0) : 0;
    const honIdx = honorSelect ? (parseInt(honorSelect.value, 10) || 0) : 0;
    const citIdx = achievementSelect ? (parseInt(achievementSelect.value, 10) || 0) : 0;
    const tplId = (templateSelect && templateSelect.value) || "oxford";

    const dict = i18nDict[targetLang];
    const rawName = (nameInput && nameInput.value.trim()) || i18nDict[currentLang].form_default_name;

    const degreeText = isBilingual
      ? `${degreeOptionsByLang.en[degIdx]} · ${degreeOptionsByLang.zh[degIdx]}`
      : degreeOptionsByLang[targetLang][degIdx];

    const majorText = isBilingual
      ? `${majorOptionsByLang.zh[majIdx]} / ${majorOptionsByLang.en[majIdx]}`
      : dict.cert_major_prefix + majorOptionsByLang[targetLang][majIdx];

    const honorText = isBilingual
      ? honorTitlesByLang.zh[honIdx]
      : dict.cert_honor_prefix + honorTitlesByLang[targetLang][honIdx];

    const citVal = citationOptionsByLang[targetLang][citIdx]
      ? citationOptionsByLang[targetLang][citIdx].value
      : citationOptionsByLang[targetLang][0].value;

    const citationFull = `“${citVal}${dict.cert_privilege_suffix}”`;
    const dateStr = new Date().toISOString().slice(0, 10);
    const serialFull = dict.cert_serial_prefix + currentSerial + (isStamped ? dict.cert_serial_stamped : "");
    const dateFull = dict.cert_date_prefix + dateStr;

    return {
      certLang: mode === "auto" ? currentLang : mode,
      template: tplId,
      proclamation: isBilingual
        ? `${i18nDict.zh.cert_proclamation} / ${i18nDict.en.cert_proclamation}`
        : dict.cert_proclamation,
      recipient: rawName,
      degree: degreeText,
      majorLine: majorText,
      honorLine: honorText,
      citationText: citationFull,
      sigLeft: dict.cert_sig_left,
      sigRight: dict.cert_sig_right,
      serialLine: serialFull,
      dateLine: dateFull,
      isStamped
    };
  }

  function syncDiplomaPreview() {
    const info = getResolvedCertData();
    if (diplomaCard) {
      diplomaCard.className = `diploma-certificate template-${info.template}`;
    }
    if (certSubHeader) {
      certSubHeader.textContent = info.certLang === "zh"
        ? "绝对虚无大学 · 创校于公元前 ∞ 年 · Sigillum Magnum"
        : "Universitas Rerum Nullarum · Sigillum Magnum · Est. ∞ B.C.";
    }
    if (certProclamation) certProclamation.textContent = info.proclamation;
    if (certName) certName.textContent = info.recipient;
    if (certDegree) certDegree.textContent = info.degree;
    if (certMajor) certMajor.textContent = info.majorLine;
    if (certHonor) certHonor.textContent = info.honorLine;
    if (certCitation) certCitation.textContent = info.citationText;
    if (certSigLeft) certSigLeft.textContent = info.sigLeft;
    if (certSigRight) certSigRight.textContent = info.sigRight;
    if (certSerial) certSerial.textContent = info.serialLine;
    if (certDate) certDate.textContent = info.dateLine;
  }

  // Courses, Syllabus & In-Browser Mock Exam
  function renderMockExam(course) {
    if (!course || !examQuestionsContainer) return;
    if (examCourseBadge) examCourseBadge.textContent = course.code;
    if (examPanelHeading) {
      examPanelHeading.textContent = currentLang === "zh"
        ? `《${course.title}》随堂摸鱼水平统考`
        : `Slacking Proficiency Exam: ${course.title}`;
    }
    if (examTranscriptBox) {
      examTranscriptBox.classList.remove("visible");
    }

    examQuestionsContainer.textContent = "";
    (course.quiz || []).forEach((qItem, qIdx) => {
      const card = document.createElement("div");
      card.className = "exam-question-card";

      const qTitle = document.createElement("h4");
      qTitle.textContent = qItem.q;
      card.appendChild(qTitle);

      const optList = document.createElement("div");
      optList.className = "exam-options-list";

      qItem.options.forEach((optObj, oIdx) => {
        const label = document.createElement("label");
        label.className = "exam-option-label";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `anu-exam-q-${qIdx}`;
        radio.value = String(optObj.score);
        if (oIdx === 1) radio.checked = true;

        const span = document.createElement("span");
        span.textContent = optObj.text;

        label.appendChild(radio);
        label.appendChild(span);
        optList.appendChild(label);
      });

      card.appendChild(optList);
      examQuestionsContainer.appendChild(card);
    });
  }

  function renderInspector(course) {
    if (!course) return;
    selectedCourseCode = course.code;
    if (sylCode) sylCode.textContent = course.code;
    if (sylTitle) sylTitle.textContent = course.title;
    if (sylDept) sylDept.textContent = (currentLang === "zh" ? "院系：" : "Dept: ") + course.deptName;
    if (sylCredits) sylCredits.textContent = (currentLang === "zh" ? `学分：${course.credits} 学分` : `Credits: ${course.credits}`);
    if (sylProf) sylProf.textContent = (currentLang === "zh" ? "主讲：" : "Instructor: ") + course.prof;
    if (sylRoom) sylRoom.textContent = (currentLang === "zh" ? "教室：" : "Room: ") + course.room;
    if (sylDesc) sylDesc.textContent = course.desc;
    if (sylProfBio) sylProfBio.textContent = course.profBio || "";

    if (sylWeeksList) {
      sylWeeksList.textContent = "";
      (course.syllabus || []).forEach((wk) => {
        const li = document.createElement("li");
        li.textContent = wk;
        sylWeeksList.appendChild(li);
      });
    }

    if (sylGrading) sylGrading.textContent = course.grading;
    if (sylBook) sylBook.textContent = course.book;
    if (enrollFeedback) {
      enrollFeedback.textContent = currentLang === "zh"
        ? `当前正在查看《${course.title}》完整大纲。`
        : `Currently viewing full syllabus for "${course.title}".`;
    }

    renderMockExam(course);
  }

  function renderCourseTable(filterDept) {
    if (!courseTbody) return;
    courseTbody.textContent = "";
    const list = coursesByLang[currentLang];
    const filtered = filterDept === "all"
      ? list
      : list.filter((c) => c.deptKey === filterDept);

    const dict = i18nDict[currentLang];
    const profLabel = currentLang === "zh" ? "主讲：" : "Instructor: ";

    filtered.forEach((course) => {
      const tr = document.createElement("tr");
      tr.className = "course-row" + (course.code === selectedCourseCode ? " selected" : "");
      tr.setAttribute("tabindex", "0");
      tr.setAttribute("role", "button");

      const tdCode = document.createElement("td");
      tdCode.className = "course-code";
      tdCode.setAttribute("data-label", dict.th_code);
      tdCode.textContent = course.code;

      const tdTitle = document.createElement("td");
      tdTitle.className = "course-title-cell";
      tdTitle.setAttribute("data-label", dict.th_name);
      const strongEl = document.createElement("strong");
      strongEl.textContent = course.title;
      const spanEl = document.createElement("span");
      spanEl.textContent = `${course.deptName} · ${profLabel}${course.prof}`;
      tdTitle.appendChild(strongEl);
      tdTitle.appendChild(spanEl);

      const tdCredits = document.createElement("td");
      tdCredits.setAttribute("data-label", dict.th_credits);
      tdCredits.textContent = course.credits;

      const tdRoom = document.createElement("td");
      tdRoom.setAttribute("data-label", dict.th_room);
      tdRoom.textContent = course.room;

      tr.appendChild(tdCode);
      tr.appendChild(tdTitle);
      tr.appendChild(tdCredits);
      tr.appendChild(tdRoom);

      const selectRow = () => {
        renderInspector(course);
        renderCourseTable(filterDept);
      };
      tr.addEventListener("click", selectRow);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectRow();
        }
      });

      courseTbody.appendChild(tr);
    });
  }

  if (scrollExamBtn && mockExamSection) {
    scrollExamBtn.addEventListener("click", () => {
      mockExamSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (submitExamBtn) {
    submitExamBtn.addEventListener("click", () => {
      const course = coursesByLang[currentLang].find((c) => c.code === selectedCourseCode) || coursesByLang[currentLang][0];
      let totalScore = 0;
      const qCount = (course.quiz || []).length;
      for (let i = 0; i < qCount; i++) {
        const checked = document.querySelector(`input[name="anu-exam-q-${i}"]:checked`);
        if (checked) {
          totalScore += parseInt(checked.value, 10) || 0;
        }
      }

      let letterGrade = "A+ (Summa Cum Somno)";
      let comment = "";

      if (totalScore >= 85) {
        letterGrade = currentLang === "zh"
          ? `最终摸鱼成绩：${totalScore} / 100 · 等级：A+（免修保博）`
          : `Final Slacking Score: ${totalScore} / 100 · Grade: A+ (Direct Ph.D. Track)`;
        comment = currentLang === "zh"
          ? `主讲教授 ${course.prof} 评语：“极具天赋！您对逃避工作的理解已经超越了教材本身，教务处决定直接免除您未来十年的所有早八考勤。”`
          : `Instructor ${course.prof}'s Verdict: "Extraordinary natural talent! Your mastery of avoiding effort surpasses the syllabus itself."`;
      } else if (totalScore >= 50) {
        letterGrade = currentLang === "zh"
          ? `最终摸鱼成绩：${totalScore} / 100 · 等级：B+（尚有内卷残留）`
          : `Final Slacking Score: ${totalScore} / 100 · Grade: B+ (Mild Hustle Residue)`;
        comment = currentLang === "zh"
          ? `主讲教授 ${course.prof} 评语：“您已经掌握了基本的糊弄技巧，但偶尔还会产生‘要不要努努力’的危险念头，建议去食堂加餐一份炸鸡巩固道心。”`
          : `Instructor ${course.prof}'s Verdict: "Solid slacking fundamentals, though we detected slight traces of ambition. Prescribed 2 hours of sofa rest."`;
      } else {
        letterGrade = currentLang === "zh"
          ? `最终摸鱼成绩：${totalScore} / 100 · 等级：F（因过于勤奋被判挂科）`
          : `Final Slacking Score: ${totalScore} / 100 · Grade: F (Failed Due to Excessive Diligence)`;
        comment = currentLang === "zh"
          ? `主讲教授 ${course.prof} 警告：“严重违纪！您居然试图认真完成任务，这严重违背了我校‘什么都不做’的创校宪章，罚您立刻去睡午觉补考！”`
          : `Instructor ${course.prof}'s Warning: "Severe academic violation! You actually tried to be productive. Sentenced to an immediate compensatory nap!"`;
      }

      if (examTranscriptGrade) examTranscriptGrade.textContent = letterGrade;
      if (examTranscriptComment) examTranscriptComment.textContent = comment;
      if (examTranscriptBox) examTranscriptBox.classList.add("visible");
    });
  }

  if (resetExamBtn) {
    resetExamBtn.addEventListener("click", () => {
      const course = coursesByLang[currentLang].find((c) => c.code === selectedCourseCode) || coursesByLang[currentLang][0];
      renderMockExam(course);
    });
  }

  // Blank Paper Archive & Submission Studio
  function populatePaperStudioSelects(preserveIndices) {
    const jIdx = preserveIndices && newPaperJournalSelect ? Math.max(0, newPaperJournalSelect.selectedIndex) : 0;
    const sIdx = preserveIndices && newPaperStyleSelect ? Math.max(0, newPaperStyleSelect.selectedIndex) : 0;

    if (newPaperJournalSelect) {
      newPaperJournalSelect.textContent = "";
      journalOptionsByLang[currentLang].forEach((jName, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = jName;
        newPaperJournalSelect.appendChild(opt);
      });
      newPaperJournalSelect.selectedIndex = Math.min(jIdx, journalOptionsByLang[currentLang].length - 1);
    }

    if (newPaperStyleSelect) {
      newPaperStyleSelect.textContent = "";
      methodologyOptionsByLang[currentLang].forEach((mObj, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = mObj.label;
        newPaperStyleSelect.appendChild(opt);
      });
      newPaperStyleSelect.selectedIndex = Math.min(sIdx, methodologyOptionsByLang[currentLang].length - 1);
    }
  }

  function renderPaperList() {
    if (!paperListEl) return;
    paperListEl.textContent = "";
    const list = papersByLang[currentLang];
    const activePaper = list[activePaperIdx] || list[0];

    if (activePaper) {
      if (readerDoi) readerDoi.textContent = activePaper.doi;
      if (readerCitations) readerCitations.textContent = activePaper.citations;
      if (readerTitle) readerTitle.textContent = activePaper.title;
      if (readerAuthors) readerAuthors.textContent = activePaper.authors;
      if (readerContent) readerContent.textContent = activePaper.content;
      if (readerFootnote) readerFootnote.textContent = activePaper.footnote;
      if (readerReviewerHeader) {
        readerReviewerHeader.textContent = activePaper.reviewerHeader || i18nDict[currentLang].res_reviewer_label;
      }
      if (readerReview) readerReview.textContent = activePaper.review;
    }

    list.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "paper-entry" + (idx === activePaperIdx ? " active" : "");
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");

      const jDiv = document.createElement("div");
      jDiv.className = "paper-journal";
      jDiv.textContent = p.journal;

      const tH3 = document.createElement("h3");
      tH3.className = "paper-entry-title";
      tH3.textContent = p.title;

      const aDiv = document.createElement("div");
      aDiv.className = "paper-authors";
      aDiv.textContent = p.authors;

      card.appendChild(jDiv);
      card.appendChild(tH3);
      card.appendChild(aDiv);

      const activatePaper = () => {
        activePaperIdx = idx;
        renderPaperList();
      };
      card.addEventListener("click", activatePaper);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activatePaper();
        }
      });
      paperListEl.appendChild(card);
    });
  }

  // Faculty & Auto-Responder
  function renderFaculty() {
    if (!facultyGridEl) return;
    facultyGridEl.textContent = "";
    const hoursLabel = i18nDict[currentLang].fac_hours_label;
    const list = facultyByLang[currentLang];

    if (emailProfSelect) {
      const prevIdx = Math.max(0, emailProfSelect.selectedIndex);
      emailProfSelect.textContent = "";
      list.forEach((f, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = f.name;
        emailProfSelect.appendChild(opt);
      });
      emailProfSelect.selectedIndex = Math.min(prevIdx, list.length - 1);
    }

    list.forEach((f) => {
      const article = document.createElement("article");
      article.className = "faculty-dossier";

      const topDiv = document.createElement("div");
      const avDiv = document.createElement("div");
      avDiv.className = "faculty-avatar";
      avDiv.textContent = f.avatar;

      const nameH3 = document.createElement("h3");
      nameH3.className = "faculty-name";
      nameH3.textContent = f.name;

      const roleP = document.createElement("p");
      roleP.className = "faculty-role";
      roleP.textContent = f.role;

      const bioP = document.createElement("p");
      bioP.className = "faculty-bio";
      bioP.textContent = f.bio;

      topDiv.appendChild(avDiv);
      topDiv.appendChild(nameH3);
      topDiv.appendChild(roleP);
      topDiv.appendChild(bioP);

      const hoursDiv = document.createElement("div");
      hoursDiv.className = "faculty-hours";
      const spanEl = document.createElement("span");
      const strongEl = document.createElement("strong");
      strongEl.textContent = hoursLabel;
      spanEl.appendChild(strongEl);
      spanEl.appendChild(document.createTextNode(f.hours));
      hoursDiv.appendChild(spanEl);

      article.appendChild(topDiv);
      article.appendChild(hoursDiv);
      facultyGridEl.appendChild(article);
    });
  }

  // Campus Life: Safe DOM creation (Zero innerHTML) + Club Persistence
  function renderCafeteriaMenu() {
    if (!cafeMenuListEl) return;
    cafeMenuListEl.textContent = "";
    const allDishes = cafeMenuByLang[currentLang];
    const filtered = currentCafeFilter === "all"
      ? allDishes
      : allDishes.filter((d) => d.cat === currentCafeFilter);

    filtered.forEach((m) => {
      const row = document.createElement("div");
      row.className = "menu-item";

      const nameWrap = document.createElement("div");
      nameWrap.className = "menu-item-name";

      const strongEl = document.createElement("strong");
      strongEl.textContent = m.name;

      const descSpan = document.createElement("span");
      descSpan.textContent = m.desc;

      nameWrap.appendChild(strongEl);
      nameWrap.appendChild(descSpan);

      const priceSpan = document.createElement("span");
      priceSpan.className = "menu-item-price";
      priceSpan.textContent = m.price;

      row.appendChild(nameWrap);
      row.appendChild(priceSpan);
      cafeMenuListEl.appendChild(row);
    });
  }

  function renderCampusLife() {
    renderCafeteriaMenu();

    if (oracleResultEl) {
      oracleResultEl.textContent = i18nDict[currentLang].oracle_init;
    }

    if (clubsListEl) {
      clubsListEl.textContent = "";
      const dict = i18nDict[currentLang];

      clubsByLang[currentLang].forEach((club) => {
        const div = document.createElement("div");
        div.className = "club-card";

        const headerDiv = document.createElement("div");
        headerDiv.className = "club-card-header";

        const h4 = document.createElement("h4");
        h4.textContent = club.name;

        const memberSpan = document.createElement("span");
        memberSpan.className = "club-member-count";
        memberSpan.textContent = club.members;

        headerDiv.appendChild(h4);
        headerDiv.appendChild(memberSpan);

        const p = document.createElement("p");
        p.textContent = club.desc;

        const isMember = joinedClubs.has(club.id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "portal-card-btn" + (isMember ? " joined" : "");
        btn.textContent = isMember ? dict.club_joined_btn : dict.club_join_btn;

        btn.addEventListener("click", () => {
          if (joinedClubs.has(club.id)) {
            joinedClubs.delete(club.id);
            saveJoinedClubs(joinedClubs);
            renderCampusLife();
            if (clubJoinFeedbackEl) {
              clubJoinFeedbackEl.textContent = currentLang === "zh"
                ? `您已退出【${club.name}】（反正本来也没有群消息）。`
                : `You left [${club.name}] (not that anyone ever posted a message).`;
            }
          } else {
            joinedClubs.add(club.id);
            saveJoinedClubs(joinedClubs);
            renderCampusLife();
            if (clubJoinFeedbackEl) {
              clubJoinFeedbackEl.textContent = currentLang === "zh"
                ? `已成功加入【${club.name}】！社长已将您设为永久免打扰，当前共加入 ${joinedClubs.size} 个摸鱼社团。`
                : `Joined [${club.name}]! Notifications muted forever. Active memberships: ${joinedClubs.size}.`;
            }
          }
        });

        div.appendChild(headerDiv);
        div.appendChild(p);
        div.appendChild(btn);
        clubsListEl.appendChild(div);
      });
    }

    if (clubJoinFeedbackEl && !joinedClubs.size) {
      clubJoinFeedbackEl.textContent = i18nDict[currentLang].club_feedback_init;
    }
  }

  cafeFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      cafeFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCafeFilter = btn.getAttribute("data-cafe-cat") || "all";
      renderCafeteriaMenu();
    });
  });

  function renderWebcams() {
    ["1", "2", "3", "4"].forEach((camId) => {
      const statusEl = document.getElementById(`cam-status-${camId}`);
      const updates = camUpdatesByLang[currentLang][camId];
      if (statusEl && updates) {
        statusEl.textContent = updates[camStateIdx[camId] % updates.length];
      }
    });
  }

  // Language Switcher
  function applyLanguage(lang, isInitial) {
    currentLang = lang === "en" ? "en" : "zh";
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
    const dict = i18nDict[currentLang];
    document.title = dict.page_title;

    try {
      localStorage.setItem("anu_lang", currentLang);
    } catch (_) {}

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (key && dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    if (langSwitchBtn) langSwitchBtn.textContent = dict.lang_btn;
    if (mobileLangBtn) mobileLangBtn.textContent = currentLang === "zh" ? "EN" : "中";
    syncThemeButtons();

    if (bulletinText) {
      const list = bulletinsByLang[currentLang];
      bulletinText.textContent = list[bulletinIdx % list.length];
    }

    if (tuitionBtn) {
      const tList = tuitionStatesByLang[currentLang];
      tuitionBtn.textContent = tList[tuitionIdx % tList.length];
    }

    if (sidebarExcuseText) {
      const eList = excusesByLang[currentLang];
      sidebarExcuseText.textContent = eList[excuseIdx % eList.length];
    }

    if (newPaperInput) newPaperInput.placeholder = dict.sub_paper_placeholder;
    if (newPaperAuthorInput) newPaperAuthorInput.placeholder = dict.sub_author_placeholder;
    populatePaperStudioSelects(!isInitial);

    if (emailQuestionInput) emailQuestionInput.placeholder = dict.email_prof_placeholder;
    if (emailReplyOutput) emailReplyOutput.textContent = dict.email_prof_init;

    if (nameInput) {
      nameInput.placeholder = dict.form_placeholder_name;
      const prevDefaultZh = i18nDict.zh.form_default_name;
      const prevDefaultEn = i18nDict.en.form_default_name;
      const val = nameInput.value.trim();
      if (
        val === prevDefaultZh ||
        val === prevDefaultEn ||
        randomNamesByLang.zh.includes(val) ||
        randomNamesByLang.en.includes(val)
      ) {
        nameInput.value = dict.form_default_name;
      }
    }

    populateAdmissionSelects(!isInitial);
    syncDiplomaPreview();
    renderChancellorAndAnnouncements();

    const activeCourse = coursesByLang[currentLang].find((c) => c.code === selectedCourseCode) || coursesByLang[currentLang][0];
    renderInspector(activeCourse);
    renderCourseTable(currentDeptFilter);
    renderPaperList();
    renderFaculty();
    renderCampusLife();
    renderWebcams();
    updateLedgerDisplay();
  }

  // Event Listeners
  if (langSwitchBtn) {
    langSwitchBtn.addEventListener("click", () => {
      applyLanguage(currentLang === "zh" ? "en" : "zh", false);
    });
  }

  if (mobileLangBtn) {
    mobileLangBtn.addEventListener("click", () => {
      applyLanguage(currentLang === "zh" ? "en" : "zh", false);
    });
  }

  if (themeSwitchBtn) {
    themeSwitchBtn.addEventListener("click", () => {
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }

  if (mobileThemeBtn) {
    mobileThemeBtn.addEventListener("click", () => {
      applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }

  if (excuseGenBtn && sidebarExcuseText) {
    excuseGenBtn.addEventListener("click", () => {
      const list = excusesByLang[currentLang];
      excuseIdx = (excuseIdx + 1) % list.length;
      sidebarExcuseText.textContent = list[excuseIdx];
    });
  }

  if (nextBulletinBtn && bulletinText) {
    nextBulletinBtn.addEventListener("click", () => {
      const list = bulletinsByLang[currentLang];
      bulletinIdx = (bulletinIdx + 1) % list.length;
      bulletinText.textContent = list[bulletinIdx];
    });
  }

  if (tuitionBtn) {
    tuitionBtn.addEventListener("click", () => {
      const list = tuitionStatesByLang[currentLang];
      tuitionIdx = (tuitionIdx + 1) % list.length;
      tuitionBtn.textContent = list[tuitionIdx];
    });
  }

  setInterval(() => {
    idleSeconds += 1;
    if (Math.random() > 0.65) {
      savedBudget += Math.floor(Math.random() * 15);
    }
    updateLedgerDisplay();
  }, 1000);

  if (contributeBtn) {
    contributeBtn.addEventListener("click", () => {
      idleSeconds += 10;
      savedBudget += 250;
      updateLedgerDisplay();
      if (contributeFeedback) {
        const list = praiseByLang[currentLang];
        contributeFeedback.textContent = list[Math.floor(Math.random() * list.length)];
      }
    });
  }

  [nameInput, degreeSelect, majorSelect, honorSelect, templateSelect, certLangSelect, achievementSelect].forEach((el) => {
    if (el) {
      el.addEventListener("input", syncDiplomaPreview);
      el.addEventListener("change", syncDiplomaPreview);
    }
  });

  if (stampBtn && waxSeal) {
    stampBtn.addEventListener("click", () => {
      waxSeal.classList.remove("stamped");
      void waxSeal.offsetWidth;
      waxSeal.classList.add("stamped");
      const randNum = Math.floor(10000 + Math.random() * 89999);
      currentSerial = `ANU-2026-VOID-${randNum}`;
      isStamped = true;
      syncDiplomaPreview();
    });
  }

  if (randomHonorBtn && honorSelect) {
    randomHonorBtn.addEventListener("click", () => {
      honorSelect.selectedIndex = (honorSelect.selectedIndex + 1) % honorSelect.options.length;
      syncDiplomaPreview();
    });
  }

  if (randomProfileBtn) {
    randomProfileBtn.addEventListener("click", () => {
      const names = randomNamesByLang[currentLang];
      if (nameInput) {
        nameInput.value = names[Math.floor(Math.random() * names.length)];
      }
      if (degreeSelect) {
        degreeSelect.selectedIndex = Math.floor(Math.random() * degreeSelect.options.length);
      }
      if (majorSelect) {
        majorSelect.selectedIndex = Math.floor(Math.random() * majorSelect.options.length);
      }
      if (honorSelect) {
        honorSelect.selectedIndex = Math.floor(Math.random() * honorSelect.options.length);
      }
      if (achievementSelect) {
        achievementSelect.selectedIndex = Math.floor(Math.random() * achievementSelect.options.length);
      }
      syncDiplomaPreview();
      if (stampBtn) stampBtn.click();
    });
  }

  if (downloadBtn && CANVAS_EXPORT) {
    downloadBtn.addEventListener("click", () => {
      const certData = getResolvedCertData();
      CANVAS_EXPORT.exportDiplomaPNG(certData);
    });
  }

  // Multi-Dimensional Zero-Word Paper Submission Generator
  let submissionCounter = 106;

  function generateAndPublishPaper(forceRandomTopic) {
    const customTitle = !forceRandomTopic && newPaperInput ? newPaperInput.value.trim() : "";
    let zhTitle = customTitle;
    let enTitle = customTitle;

    if (!customTitle) {
      const topicObj = randomPaperTopicsPool[randomTopicCursor % randomPaperTopicsPool.length];
      randomTopicCursor += 1;
      zhTitle = topicObj.zh;
      enTitle = topicObj.en;
    }

    const rawAuthor = newPaperAuthorInput ? newPaperAuthorInput.value.trim() : "";
    const zhAuthor = rawAuthor
      ? `${rawAuthor}¹ · 绝对虚无大学特聘摸鱼客座学者`
      : "匿名摸鱼学者¹ · 绝对虚无大学访问研究员";
    const enAuthor = rawAuthor
      ? `${rawAuthor}¹ · Distinguished Visiting Slacker at ANU`
      : "Anonymous Slacker¹ · Visiting Fellow at ANU";

    const jIdx = newPaperJournalSelect ? (parseInt(newPaperJournalSelect.value, 10) || 0) : 0;
    const sIdx = newPaperStyleSelect ? (parseInt(newPaperStyleSelect.value, 10) || 0) : 0;

    const zhJournal = journalOptionsByLang.zh[jIdx] || journalOptionsByLang.zh[0];
    const enJournal = journalOptionsByLang.en[jIdx] || journalOptionsByLang.en[0];

    const zhMethod = methodologyOptionsByLang.zh[sIdx] || methodologyOptionsByLang.zh[0];
    const enMethod = methodologyOptionsByLang.en[sIdx] || methodologyOptionsByLang.en[0];

    const reviewIdx = (submissionCounter + sIdx + jIdx) % peerReviewPoolByLang.zh.length;
    const citIdx = (submissionCounter + jIdx) % citationsPoolByLang.zh.length;

    const voidIdStr = `VOID-ID: ANU.NULL.2026.${submissionCounter}`;
    submissionCounter += 1;

    const zhEntry = {
      doi: voidIdStr,
      journal: zhJournal,
      title: zhTitle,
      authors: zhAuthor,
      citations: citationsPoolByLang.zh[citIdx],
      content: zhMethod.content,
      footnote: zhMethod.footnote,
      reviewerHeader: peerReviewPoolByLang.zh[reviewIdx].header,
      review: peerReviewPoolByLang.zh[reviewIdx].text
    };

    const enEntry = {
      doi: voidIdStr,
      journal: enJournal,
      title: enTitle,
      authors: enAuthor,
      citations: citationsPoolByLang.en[citIdx],
      content: enMethod.content,
      footnote: enMethod.footnote,
      reviewerHeader: peerReviewPoolByLang.en[reviewIdx].header,
      review: peerReviewPoolByLang.en[reviewIdx].text
    };

    papersByLang.zh.unshift(zhEntry);
    papersByLang.en.unshift(enEntry);
    activePaperIdx = 0;
    if (newPaperInput) newPaperInput.value = "";
    renderPaperList();

    if (submitPaperStatusEl) {
      submitPaperStatusEl.textContent = currentLang === "zh"
        ? `🎉 秒录用成功！已刊发于《${zhJournal}》（${voidIdStr}），请查看上方阅览室！`
        : `🎉 Instant Accept! Published in "${enJournal}" (${voidIdStr}) — see reading room above!`;
    }
  }

  if (submitBlankPaperBtn) {
    submitBlankPaperBtn.addEventListener("click", () => {
      generateAndPublishPaper(false);
    });
  }

  if (randomPaperTopicBtn) {
    randomPaperTopicBtn.addEventListener("click", () => {
      generateAndPublishPaper(true);
    });
  }

  if (downloadPaperCertBtn && CANVAS_EXPORT) {
    downloadPaperCertBtn.addEventListener("click", () => {
      const list = papersByLang[currentLang];
      const activePaper = list[activePaperIdx] || list[0];
      CANVAS_EXPORT.exportPaperAcceptancePNG(activePaper, currentLang);
    });
  }

  // Send Email to Absentee Professor
  let emailTicketCounter = 4040;
  const extraRepliesByLang = {
    zh: [
      "（系统补充：教授的邮箱自动转发规则已把您的邮件归档至【下辈子再看】文件夹。）",
      "（系统补充：检测到您的邮件包含学术词汇，已触发教授的防加班防火墙并自动静音。）",
      "（系统补充：此时教授正在食堂纠结吃什么，精神上与您同在。）"
    ],
    en: [
      "(System Note: A filter rule automatically moved your message to the 'Read in Next Reincarnation' folder.)",
      "(System Note: Academic keywords detected; Professor's anti-overtime firewall muted this thread.)",
      "(System Note: The professor is currently daydreaming at the cafeteria in spiritual solidarity with you.)"
    ]
  };

  if (sendProfEmailBtn) {
    sendProfEmailBtn.addEventListener("click", () => {
      const idx = emailProfSelect ? parseInt(emailProfSelect.value, 10) || 0 : 0;
      const prof = facultyByLang[currentLang][idx] || facultyByLang[currentLang][0];
      const qVal = emailQuestionInput ? emailQuestionInput.value.trim() : "";
      emailTicketCounter += 1;
      const extraPool = extraRepliesByLang[currentLang];
      const extraNote = extraPool[emailTicketCounter % extraPool.length];
      if (emailReplyOutput && prof) {
        const prefix = qVal
          ? (currentLang === "zh" ? `[回执 #${emailTicketCounter} · 针对“${qVal.slice(0, 24)}”] ` : `[Ticket #${emailTicketCounter} · Re: "${qVal.slice(0, 28)}"] `)
          : `[Ticket #${emailTicketCounter}] `;
        emailReplyOutput.textContent = `${prefix}${prof.reply} ${extraNote}`;
      }
    });
  }

  // 3-Course Random Meal Combo Oracle
  if (spinLunchBtn && oracleResultEl) {
    spinLunchBtn.addEventListener("click", () => {
      const menu = cafeMenuByLang[currentLang];
      const entrees = menu.filter((m) => m.cat === "entree");
      const drinks = menu.filter((m) => m.cat === "drink");
      const desserts = menu.filter((m) => m.cat === "dessert");

      const ePick = entrees[Math.floor(Math.random() * entrees.length)] || menu[0];
      const drPick = drinks[Math.floor(Math.random() * drinks.length)] || menu[1];
      const dePick = desserts[Math.floor(Math.random() * desserts.length)] || menu[2];

      oracleResultEl.textContent = currentLang === "zh"
        ? `🍽️ 今日钦定摸鱼三件套：【主食】${ePick.name} + 【特饮】${drPick.name} + 【甜点】${dePick.name}（总热量：0 卡路里 · 总价：¥0.00）`
        : `🍽️ Today's 3-Course Slacker Combo: [Entree] ${ePick.name} + [Drink] ${drPick.name} + [Dessert] ${dePick.name} (Total: 0 Calories · $0.00)`;
    });
  }

  deptTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      deptTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentDeptFilter = tab.getAttribute("data-dept") || "all";
      const list = coursesByLang[currentLang];
      const firstMatch = currentDeptFilter === "all" ? list[0] : list.find((c) => c.deptKey === currentDeptFilter);
      if (firstMatch) renderInspector(firstMatch);
      renderCourseTable(currentDeptFilter);
    });
  });

  if (enrollBtn) {
    enrollBtn.addEventListener("click", () => {
      const list = coursesByLang[currentLang];
      const current = list.find((c) => c.code === selectedCourseCode) || list[0];
      if (enrollFeedback) {
        enrollFeedback.textContent = currentLang === "zh"
          ? `恭喜！您已成功选修《${current.title}》并同步办理了全学期自动翘课手续，期末成绩锁定为 A+。`
          : `Enrolled! You have registered for "${current.title}" and automatically skipped all lectures. Final Grade locked at A+.`;
      }
    });
  }

  // Simulated Webcams & Night-Vision Toggle
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

  document.querySelectorAll(".webcam-ping-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const camId = btn.getAttribute("data-cam");
      const updates = camUpdatesByLang[currentLang][camId];
      if (!camId || !updates) return;
      camStateIdx[camId] = (camStateIdx[camId] + 1) % updates.length;
      const statusEl = document.getElementById(`cam-status-${camId}`);
      if (statusEl) {
        statusEl.textContent = updates[camStateIdx[camId]];
      }
    });
  });

  if (toggleNightVisionBtn && webcamGridEl) {
    toggleNightVisionBtn.addEventListener("click", () => {
      webcamGridEl.classList.toggle("night-vision");
    });
  }

  // Hidden Easter Eggs (5x Crest Click + Konami Code)
  const easterToast = document.getElementById("easter-egg-toast");
  const easterTitle = document.getElementById("easter-egg-title");
  const easterBody = document.getElementById("easter-egg-body");
  const crestTrigger = document.getElementById("sidebar-crest-trigger");
  let crestClickCount = 0;
  let easterTimer = null;

  function triggerEasterEgg(mode) {
    idleSeconds += 10000;
    savedBudget += 88888;
    updateLedgerDisplay();

    if (!easterToast || !easterTitle || !easterBody) return;
    if (mode === "konami") {
      easterTitle.textContent = currentLang === "zh"
        ? "🐾 秘技触发：橘座大主任的午夜呼噜赐福！"
        : "🐾 Konami Code Unlocked: Prof. Ginger's Midnight Purr Blessing!";
      easterBody.textContent = currentLang === "zh"
        ? "您发现了绝对虚无大学的终极秘籍！全校发呆时长瞬间 +10,000 秒，节省经费 +$88,888，祝您今晚好梦！"
        : "You unlocked ANU's secret slacking cheat code! +10,000 daydreaming seconds and +$88,888 saved budget credited!";
    } else {
      easterTitle.textContent = currentLang === "zh"
        ? "🏆 隐藏成就解锁：校徽摸鱼狂魔！"
        : "🏆 Hidden Achievement: Crest Daydreamer!";
      easterBody.textContent = currentLang === "zh"
        ? "您连续点击了 5 次校徽！摸鱼斯坦校长在梦中授予您“终身免早八特权卡”，发呆账本已暴涨 +10,000 秒！"
        : "You clicked the university crest 5 times! Chancellor Slackingstein grants you lifetime immunity from 8 AM alarms!";
    }

    easterToast.classList.add("active");
    if (easterTimer) clearTimeout(easterTimer);
    easterTimer = setTimeout(() => {
      easterToast.classList.remove("active");
    }, 5500);
  }

  if (crestTrigger) {
    crestTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      switchToPage("overview", true);
      crestClickCount += 1;
      if (crestClickCount >= 5) {
        crestClickCount = 0;
        triggerEasterEgg("crest");
      }
    });
  }

  const konamiSeq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiPos = 0;
  document.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konamiSeq[konamiPos]) {
      konamiPos += 1;
      if (konamiPos === konamiSeq.length) {
        konamiPos = 0;
        triggerEasterEgg("konami");
      }
    } else {
      konamiPos = 0;
    }
  });

  // Initial Boot
  applyTheme(currentTheme);
  applyLanguage(currentLang, true);
  fetchAnnouncementsData();

  const initialHash = (window.location.hash || "").replace(/^#/, "");
  if (validPages.includes(initialHash)) {
    switchToPage(initialHash, false);
  } else {
    switchToPage("overview", false);
  }
})();
