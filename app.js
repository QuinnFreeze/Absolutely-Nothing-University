(function () {
  "use strict";

  const DATA = window.ANU_DATA;
  const CANVAS_EXPORT = window.ANU_CANVAS;
  const SEARCH = window.ANU_SEARCH;
  if (!DATA) return;

  // Native selects stay single-line on iOS. Show the complete selected label
  // below a narrow control when it cannot fit; keep native keyboard/AT behavior.
  const selectNotes = [];
  let selectNoteFrame = 0;
  const selectTextMeasure = document.createElement("canvas").getContext("2d");

  function scheduleSelectNotes() {
    if (selectNoteFrame || !selectNotes.length) return;
    selectNoteFrame = requestAnimationFrame(() => {
      selectNoteFrame = 0;
      const mobile = window.matchMedia("(max-width: 980px)").matches;
      selectNotes.forEach(({ select, note }) => {
        const label = select.selectedOptions[0]?.textContent.trim() || "";
        const style = getComputedStyle(select);
        const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 28;
        if (selectTextMeasure) selectTextMeasure.font = style.font;
        const textWidth = selectTextMeasure ? selectTextMeasure.measureText(label).width : Infinity;
        note.hidden = !mobile || !label || available <= 0 || textWidth <= available;
        if (note.textContent !== label) note.textContent = label;
      });
    });
  }

  function initSelectNotes() {
    const changes = new MutationObserver(scheduleSelectNotes);
    const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(scheduleSelectNotes) : null;
    document.querySelectorAll("select.form-control").forEach((select) => {
      const note = document.createElement("p");
      note.className = "select-value-note";
      note.hidden = true;
      note.setAttribute("aria-hidden", "true");
      select.insertAdjacentElement("afterend", note);
      selectNotes.push({ select, note });
      changes.observe(select, { childList: true, characterData: true, subtree: true });
      if (sizes) sizes.observe(select);
      select.addEventListener("change", scheduleSelectNotes);
    });
    window.addEventListener("resize", scheduleSelectNotes);
    if (document.fonts) document.fonts.ready.then(scheduleSelectNotes);
    scheduleSelectNotes();
  }

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

  // Copy only published source data before any local or signed-in UI renders.
  // Announcement updates below never rebuild from user-modified runtime data.
  const publicSearchBase = SEARCH ? SEARCH.buildIndex(DATA) : [];
  let publicSearchIndex = publicSearchBase.concat(SEARCH ? SEARCH.buildIndex({}, fallbackAnnouncementsData) : []);

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
      // Only explicit choices use this key; the legacy key also stored automatic
      // system-dark detection and cannot reliably represent a user's preference.
      const saved = localStorage.getItem("anu_theme_preference");
      if (saved === "dark" || saved === "light") return saved;
    } catch (_) {}
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

  function loadLocalList(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveLocalList(storageKey, arr) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(arr.slice(0, 30)));
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
    "webcams",
    "my-anu"
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
  const sidebarCloseBtn = document.getElementById("sidebar-close");
  const mainStageEl = document.querySelector(".main-stage");
  const sidebarMedia = window.matchMedia("(max-width: 980px)");
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
  function applyTheme(theme, rememberChoice = true) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    try {
      if (rememberChoice) localStorage.setItem("anu_theme_preference", currentTheme);
    } catch (_) {}
    syncThemeButtons();
    updateCloudSecurityCheck();
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
  function syncSidebarAccessibility() {
    const open = sidebarMedia.matches && Boolean(sidebarEl && sidebarEl.classList.contains("open"));
    if (sidebarEl) {
      sidebarEl.inert = sidebarMedia.matches && !open;
      if (sidebarEl.inert) sidebarEl.setAttribute("aria-hidden", "true");
      else sidebarEl.removeAttribute("aria-hidden");
    }
    if (mainStageEl) mainStageEl.inert = open;
    document.body.classList.toggle("sidebar-open", open);
    if (mobileToggleBtn) mobileToggleBtn.setAttribute("aria-expanded", String(open));
  }

  function closeMobileSidebar(restoreFocus = false) {
    if (sidebarEl) sidebarEl.classList.remove("open");
    if (backdropEl) backdropEl.classList.remove("open");
    syncSidebarAccessibility();
    if (restoreFocus && sidebarMedia.matches && mobileToggleBtn) requestAnimationFrame(() => {
      if (sidebarMedia.matches && !sidebarEl.classList.contains("open")) mobileToggleBtn.focus();
    });
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
        const group = btn.closest("details");
        if (group) group.open = true;
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    if (updateHash) {
      history.replaceState(null, "", `#${target}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeMobileSidebar();
    updateCloudSecurityCheck();
    scheduleSelectNotes();
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-page-target");
      if (target) switchToPage(target, true);
    });
  });

  document.querySelectorAll("[data-page-link], .sidebar-quick-links a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("data-page-link") || link.hash.slice(1);
      if (!validPages.includes(target)) return;
      event.preventDefault();
      switchToPage(target, true);
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
      syncSidebarAccessibility();
      if (isOpen && sidebarEl) {
        sidebarEl.scrollTop = 0;
        if (sidebarCloseBtn) requestAnimationFrame(() => {
          if (sidebarMedia.matches && sidebarEl.classList.contains("open")) sidebarCloseBtn.focus();
        });
      }
    });
  }

  if (backdropEl) {
    backdropEl.addEventListener("click", () => closeMobileSidebar(true));
  }
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", () => closeMobileSidebar(true));
  sidebarMedia.addEventListener("change", () => closeMobileSidebar(false));
  syncSidebarAccessibility();

  document.addEventListener("keydown", (e) => {
    if (siteSearchDialog && siteSearchDialog.open) return;
    if (e.key === "Escape" && sidebarEl && sidebarEl.classList.contains("open")) {
      closeMobileSidebar(true);
    }
    if (e.key === "Tab" && sidebarMedia.matches && sidebarEl && sidebarEl.classList.contains("open")) {
      const controls = Array.from(sidebarEl.querySelectorAll("a[href], button:not([disabled]), summary, input")).filter((el) => el.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || !sidebarEl.contains(document.activeElement))) {
        e.preventDefault();
        if (last) last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !sidebarEl.contains(document.activeElement))) {
        e.preventDefault();
        if (first) first.focus();
      }
    }
  });

  // Public search UI: queries stay in memory, and result strings use text nodes.
  const siteSearchDialog = document.getElementById("site-search-dialog");
  const siteSearchInput = document.getElementById("site-search-input");
  const siteSearchResults = document.getElementById("site-search-results");
  const siteSearchStatus = document.getElementById("site-search-status");
  const siteSearchClear = document.getElementById("site-search-clear");
  let searchMatches = [];
  let searchReturnFocus = null;
  let searchRestoreFocus = true;
  let searchComposing = false;

  function searchPageLabel(page) {
    const key = page === "my-anu" ? "nav_my_anu" : "nav_" + page;
    return i18nDict[currentLang][key] || "ANU";
  }

  function renderSiteSearch() {
    if (!siteSearchResults || !siteSearchInput || !SEARCH) return;
    const query = siteSearchInput.value.trim();
    const dict = i18nDict[currentLang];
    searchMatches = query
      ? SEARCH.search(publicSearchIndex, query, currentLang, 24)
      : publicSearchBase.filter((record) => record.kind === "page");
    if (siteSearchClear) siteSearchClear.hidden = !siteSearchInput.value;
    if (siteSearchStatus) siteSearchStatus.textContent = query
      ? (searchMatches.length ? dict.search_count.replace("{count}", String(searchMatches.length)) : dict.search_none)
      : dict.search_suggested;
    siteSearchResults.replaceChildren();
    if (!searchMatches.length) {
      const empty = document.createElement("li");
      empty.className = "search-empty";
      empty.textContent = dict.search_empty;
      siteSearchResults.appendChild(empty);
      return;
    }
    searchMatches.forEach((record) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      const head = document.createElement("span");
      head.className = "search-result-head";
      const title = document.createElement("span");
      title.className = "search-result-title";
      title.textContent = record.title[currentLang] || record.title.zh || record.title.en;
      const page = document.createElement("span");
      page.className = "search-result-page";
      page.textContent = searchPageLabel(record.page);
      head.append(title, page);
      const snippet = document.createElement("span");
      snippet.className = "search-result-snippet";
      snippet.textContent = record.snippet || (record.body[currentLang] || "").slice(0, 130);
      button.append(head, snippet);
      button.addEventListener("click", () => activateSearchResult(record));
      row.appendChild(button);
      siteSearchResults.appendChild(row);
    });
  }

  function activateSearchResult(record) {
    if (!validPages.includes(record.page)) return;
    searchRestoreFocus = false;
    if (siteSearchDialog && siteSearchDialog.open) siteSearchDialog.close();
    switchToPage(record.page, true);
    let destination = document.getElementById(record.targetId || "page-" + record.page);
    if (record.kind === "course") {
      const course = coursesByLang[currentLang].find((item) => "course:" + item.code === record.id);
      if (course) {
        currentDeptFilter = "all";
        deptTabs.forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-dept") === "all"));
        renderInspector(course);
        renderCourseTable("all");
        destination = document.getElementById("syllabus-panel");
      }
    } else if (record.kind === "paper") {
      const index = papersByLang[currentLang].findIndex((paper) => "paper:" + paper.doi === record.id);
      if (index >= 0) {
        activePaperIdx = index;
        renderPaperList();
        destination = document.getElementById("paper-reader");
      }
    } else if (record.kind === "menu") {
      currentCafeFilter = "all";
      cafeFilterBtns.forEach((button) => button.classList.toggle("active", button.getAttribute("data-cafe-cat") === "all"));
      renderCafeteriaMenu();
      const dishIndex = cafeMenuByLang[currentLang].findIndex((_, index) => "menu:" + index === record.id);
      destination = cafeMenuListEl.children[dishIndex] || destination;
    } else if (record.kind === "faculty") {
      const facultyIndex = facultyByLang[currentLang].findIndex((_, index) => "faculty:" + index === record.id);
      destination = facultyGridEl.children[facultyIndex] || destination;
    } else if (record.kind === "club") {
      const clubIndex = clubsByLang[currentLang].findIndex((club) => "club:" + club.id === record.id);
      destination = clubsListEl.children[clubIndex] || destination;
    } else if (record.kind === "announcement") {
      currentAnnCategory = "all";
      highlightedAnnId = record.id.slice("announcement:".length);
      annFilterBtns.forEach((button) => button.classList.toggle("active", button.getAttribute("data-ann-cat") === "all"));
      renderChancellorAndAnnouncements();
      destination = Array.from(announcementsListEl.children).find((item) => item.getAttribute("data-ann-id") === highlightedAnnId) || destination;
    }
    if (destination) {
      destination.classList.add("search-destination");
      if (!destination.hasAttribute("tabindex")) destination.setAttribute("tabindex", "-1");
      requestAnimationFrame(() => {
        destination.scrollIntoView({ behavior: "instant", block: "start" });
        destination.focus({ preventScroll: true });
      });
    }
  }

  function openSiteSearch(opener) {
    if (!siteSearchDialog || !siteSearchInput) return;
    if (!siteSearchDialog.open) searchReturnFocus = sidebarMedia.matches && sidebarEl && sidebarEl.contains(opener) ? mobileToggleBtn : opener;
    closeMobileSidebar(false);
    renderSiteSearch();
    if (!siteSearchDialog.open) siteSearchDialog.showModal();
    document.body.classList.add("search-open");
    requestAnimationFrame(() => {
      if (siteSearchDialog.open) {
        siteSearchInput.focus();
        siteSearchInput.select();
      }
    });
  }

  ["site-search-open", "mobile-search-open"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", () => openSiteSearch(button));
  });
  const siteSearchClose = document.getElementById("site-search-close");
  if (siteSearchClose) siteSearchClose.addEventListener("click", () => siteSearchDialog.close());
  if (siteSearchClear) siteSearchClear.addEventListener("click", () => {
    siteSearchInput.value = "";
    renderSiteSearch();
    siteSearchInput.focus();
  });
  if (siteSearchInput) {
    siteSearchInput.addEventListener("input", (event) => { if (!event.isComposing) renderSiteSearch(); });
    siteSearchInput.addEventListener("compositionstart", () => { searchComposing = true; });
    siteSearchInput.addEventListener("compositionend", () => { searchComposing = false; renderSiteSearch(); });
    siteSearchInput.addEventListener("keydown", (event) => {
      if (event.isComposing || searchComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = siteSearchResults.querySelectorAll(".search-result");
        const target = event.key === "ArrowDown" ? buttons[0] : buttons[buttons.length - 1];
        if (target) target.focus();
      }
    });
  }
  const siteSearchForm = document.getElementById("site-search-form");
  if (siteSearchForm) siteSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!searchComposing && siteSearchInput.value.trim() && searchMatches[0]) activateSearchResult(searchMatches[0]);
  });
  if (siteSearchResults) siteSearchResults.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const buttons = Array.from(siteSearchResults.querySelectorAll(".search-result"));
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    if (event.key === "ArrowUp" && index === 0) siteSearchInput.focus();
    else buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
  });
  if (siteSearchDialog) {
    siteSearchDialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !event.isComposing && !searchComposing) {
        // Search inputs consume Esc to clear text before native dialog cancel.
        event.preventDefault();
        event.stopPropagation();
        siteSearchDialog.close();
      } else if (event.key === "Tab") {
        const controls = Array.from(siteSearchDialog.querySelectorAll("button:not([disabled]), input:not([disabled]), a[href]")).filter((el) => el.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !siteSearchDialog.contains(document.activeElement))) {
          event.preventDefault();
          if (last) last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !siteSearchDialog.contains(document.activeElement))) {
          event.preventDefault();
          if (first) first.focus();
        }
      }
    });
    siteSearchDialog.addEventListener("click", (event) => {
      const rect = siteSearchDialog.getBoundingClientRect();
      if (event.target === siteSearchDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) siteSearchDialog.close();
    });
    siteSearchDialog.addEventListener("close", () => {
      document.body.classList.remove("search-open");
      searchComposing = false;
      const restoreTarget = searchRestoreFocus ? searchReturnFocus : null;
      if (restoreTarget && restoreTarget.isConnected) requestAnimationFrame(() => {
        if (!siteSearchDialog.open && !restoreTarget.closest("[inert]")) restoreTarget.focus();
      });
      searchRestoreFocus = true;
    });
  }
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSiteSearch(document.activeElement);
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
          if (SEARCH) {
            publicSearchIndex = publicSearchBase.concat(SEARCH.buildIndex({}, json));
            if (siteSearchDialog && siteSearchDialog.open) renderSiteSearch();
          }
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
    scheduleSelectNotes();
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

      const answerScores = [];
      for (let i = 0; i < qCount; i++) {
        const checked = document.querySelector(`input[name="anu-exam-q-${i}"]:checked`);
        answerScores.push(checked ? parseInt(checked.value, 10) || 0 : 0);
      }

      const localExams = loadLocalList("anu_local_exams");
      localExams.unshift({
        courseCode: course.code,
        courseTitleZh: coursesByLang.zh.find((c) => c.code === course.code)?.title || course.title,
        courseTitleEn: coursesByLang.en.find((c) => c.code === course.code)?.title || course.title,
        score: totalScore,
        grade: totalScore >= 85 ? "A+" : totalScore >= 50 ? "B+" : "F",
        gradeLabelZh: letterGrade,
        gradeLabelEn: letterGrade,
        verdictZh: comment,
        verdictEn: comment,
        answers: answerScores,
        createdAt: new Date().toISOString().slice(0, 10)
      });
      saveLocalList("anu_local_exams", localExams);

      if (window.ANU_AUTH) {
        window.ANU_AUTH.submitExamToCloud(course.code, answerScores).then((res) => {
          if (res && res.graded) {
            const g = res.graded;
            if (examTranscriptGrade) {
              examTranscriptGrade.textContent = currentLang === "zh" ? g.gradeLabelZh : g.gradeLabelEn;
            }
            if (examTranscriptComment) {
              examTranscriptComment.textContent = currentLang === "zh" ? g.verdictZh : g.verdictEn;
            }
          }
          renderMyAnuPortal();
        }).catch(() => {});
      }
      renderMyAnuPortal();
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
            if (window.ANU_AUTH) {
              window.ANU_AUTH.syncHonorOrClubToCloud(club.id, "remove").then(renderMyAnuPortal).catch(() => {});
            }
            renderCampusLife();
            renderMyAnuPortal();
            if (clubJoinFeedbackEl) {
              clubJoinFeedbackEl.textContent = currentLang === "zh"
                ? `您已退出【${club.name}】（反正本来也没有群消息）。`
                : `You left [${club.name}] (not that anyone ever posted a message).`;
            }
          } else {
            joinedClubs.add(club.id);
            saveJoinedClubs(joinedClubs);
            if (window.ANU_AUTH) {
              window.ANU_AUTH.syncHonorOrClubToCloud(club.id, "add").then(renderMyAnuPortal).catch(() => {});
            }
            renderCampusLife();
            renderMyAnuPortal();
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

    ["placeholder", "aria-label"].forEach((attribute) => {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((el) => {
        const key = el.getAttribute(`data-i18n-${attribute}`);
        if (key && dict[key] !== undefined) el.setAttribute(attribute, dict[key]);
      });
    });
    renderSiteSearch();

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
    populateMyAnuSelects();
    renderMyAnuPortal();
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
      downloadPng(downloadBtn, () => CANVAS_EXPORT.downloadDiplomaPNG(certData));
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

    const localPapers = loadLocalList("anu_local_papers");
    localPapers.unshift({
      void_id: voidIdStr,
      title: currentLang === "zh" ? zhTitle : enTitle,
      author: rawAuthor || (currentLang === "zh" ? "匿名摸鱼学者" : "Anonymous Slacker"),
      journalIdx: jIdx,
      journal_zh: zhJournal,
      journal_en: enJournal,
      methodologyIdx: sIdx,
      created_at: new Date().toISOString().slice(0, 10)
    });
    saveLocalList("anu_local_papers", localPapers);

    if (window.ANU_AUTH && window.ANU_AUTH.getState().isRegistered) {
      const turnstileToken = window.ANU_AUTH.getTurnstileToken();
      window.ANU_AUTH.submitPaperToCloud(
        {
          title: currentLang === "zh" ? zhTitle : enTitle,
          author: rawAuthor || (currentLang === "zh" ? "匿名摸鱼学者" : "Anonymous Slacker"),
          journalIdx: jIdx,
          methodologyIdx: sIdx
        },
        turnstileToken
      ).then((res) => {
        renderMyAnuPortal();
        if (res && submitPaperStatusEl) {
          submitPaperStatusEl.textContent += currentLang === "zh" ? " ✓ 已同步至云端论文档案。" : " ✓ Saved to your cloud paper archive.";
        }
      }).catch((err) => {
        if (submitPaperStatusEl) {
          submitPaperStatusEl.textContent += currentLang === "zh"
            ? ` 已保存本机，云端未同步：${cloudErrorMessage(err)}。可稍后在 My ANU 导入。`
            : ` Saved locally; cloud sync failed: ${cloudErrorMessage(err)}. You can import it later in My ANU.`;
        }
      });
    }
    renderMyAnuPortal();

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
      downloadPng(downloadPaperCertBtn, () => CANVAS_EXPORT.downloadPaperAcceptancePNG(activePaper, currentLang));
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
    const badgeKey = mode === "konami" ? "easter_konami" : "easter_crest";
    joinedClubs.add(badgeKey);
    saveJoinedClubs(joinedClubs);
    if (window.ANU_AUTH) {
      window.ANU_AUTH.syncHonorOrClubToCloud(badgeKey, "add").then(renderMyAnuPortal).catch(() => {});
    }
    renderMyAnuPortal();

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

  // =========================================================================
  // PAGE 8: MY ANU · PERSONAL CAMPUS CENTER & CLOUD SYNC CONTROLLER
  // =========================================================================
  const saveDiplomaCloudBtn = document.getElementById("save-diploma-cloud-btn");
  const diplomaCloudStatusEl = document.getElementById("diploma-cloud-status");
  const sidebarAuthBadge = document.getElementById("sidebar-auth-badge");

  const myAnuStatusHeadline = document.getElementById("my-anu-status-headline");
  const myAnuStatusSub = document.getElementById("my-anu-status-sub");
  const myAnuAuthBanner = document.getElementById("my-anu-auth-banner");
  const myAnuAuthStatus = document.getElementById("my-anu-auth-state");
  const googleSigninBtn = document.getElementById("google-signin-btn");
  const googleSignoutBtn = document.getElementById("google-signout-btn");
  const syncCloudBtn = document.getElementById("sync-cloud-btn");
  const importLocalArchiveBtn = document.getElementById("import-local-archive-btn");
  const myAnuGlobalFeedback = document.getElementById("my-anu-global-feedback");

  const myAnuRegPanel = document.getElementById("my-anu-registration-panel");
  const regNicknameInput = document.getElementById("reg-nickname-input");
  const regCollegeSelect = document.getElementById("reg-college-select");
  const regMajorSelect = document.getElementById("reg-major-select");
  const regYearInput = document.getElementById("reg-year-input");
  const regHonorSelect = document.getElementById("reg-honor-select");
  const regAvatarSelect = document.getElementById("reg-avatar-select");
  const regUseGoogleAvatar = document.getElementById("reg-use-google-avatar");
  const regVisibilitySelect = document.getElementById("reg-visibility-select");
  const regPublicConsentWrap = document.getElementById("reg-public-consent-wrap");
  const regPublicConsentChk = document.getElementById("reg-public-consent-chk");
  const regLegalConsentChk = document.getElementById("reg-legal-consent-chk");
  const submitStudentRegBtn = document.getElementById("submit-student-reg-btn");

  const myAnuAvatarBox = document.getElementById("my-anu-avatar-box");
  const myAnuVisibilityPill = document.getElementById("my-anu-visibility-pill");
  const myAnuDisplayName = document.getElementById("my-anu-display-name");
  const myAnuStudentNumber = document.getElementById("my-anu-student-number");
  const myAnuCollegeVal = document.getElementById("my-anu-college-val");
  const myAnuMajorVal = document.getElementById("my-anu-major-val");
  const myAnuEnrollmentVal = document.getElementById("my-anu-enrollment-val");
  const myAnuHonorVal = document.getElementById("my-anu-honor-val");

  const myTabButtons = document.querySelectorAll("[data-my-tab]");
  const myTabPanes = document.querySelectorAll("[data-my-pane]");
  const myTranscriptsList = document.getElementById("my-transcripts-list");
  const myPapersList = document.getElementById("my-papers-list");
  const myDiplomasList = document.getElementById("my-diplomas-list");
  const myHonorsList = document.getElementById("my-honors-list");
  const archiveSourceSelect = document.getElementById("archive-source-select");
  const archiveSourceNote = document.getElementById("archive-source-note");
  const exportArchiveBtn = document.getElementById("export-archive-btn");
  let archiveSource = "cloud";
  let archiveAccount = null;
  let portalLanguage = null;
  let loginFailureFeedback = null;

  const setNicknameInput = document.getElementById("set-nickname-input");
  const setCollegeSelect = document.getElementById("set-college-select");
  const setAvatarSelect = document.getElementById("set-avatar-select");
  const setVisibilitySelect = document.getElementById("set-visibility-select");
  const setPublicConsentChk = document.getElementById("set-public-consent-chk");
  const saveProfileSettingsBtn = document.getElementById("save-profile-settings-btn");
  const deleteAccountConfirmInput = document.getElementById("delete-account-confirm-input");
  const deleteAccountBtn = document.getElementById("delete-account-btn");

  const publicStudentIdInput = document.getElementById("public-student-id-input");
  const lookupPublicStudentBtn = document.getElementById("lookup-public-student-btn");
  const publicLookupResult = document.getElementById("public-lookup-result");

  function populateMyAnuSelects() {
    if (regMajorSelect) {
      const prevIdx = Math.max(0, regMajorSelect.selectedIndex);
      regMajorSelect.textContent = "";
      majorOptionsByLang[currentLang].forEach((m, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = m;
        regMajorSelect.appendChild(opt);
      });
      regMajorSelect.selectedIndex = Math.min(prevIdx, majorOptionsByLang[currentLang].length - 1);
    }
    if (regHonorSelect) {
      const prevIdx = Math.max(0, regHonorSelect.selectedIndex);
      regHonorSelect.textContent = "";
      honorTitlesByLang[currentLang].forEach((h, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = h;
        regHonorSelect.appendChild(opt);
      });
      regHonorSelect.selectedIndex = Math.min(prevIdx, honorTitlesByLang[currentLang].length - 1);
    }
  }

  function createEmptyNoticeElement(text) {
    const p = document.createElement("p");
    p.style.fontSize = "0.88rem";
    p.style.color = "var(--ink-muted)";
    p.style.padding = "0.75rem 0";
    p.textContent = text;
    return p;
  }

  async function downloadPng(button, download) {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await download();
      if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = i18nDict[currentLang].my_export_started;
    } catch (err) {
      const message = currentLang === "zh" ? "PNG 导出失败，请重试或缩短过长内容：" : "PNG export failed. Retry or shorten very long content: ";
      if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = message + cloudErrorMessage(err);
      // Generator status remains visible outside My ANU.
      const status = currentPage === "admissions" ? diplomaCloudStatusEl : document.getElementById("submit-paper-status");
      if (status) status.textContent = message + cloudErrorMessage(err);
    } finally {
      button.disabled = false;
    }
  }

  function archivePngButton(download) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-secondary archive-png-btn";
    button.textContent = i18nDict[currentLang].my_export_png;
    button.addEventListener("click", () => downloadPng(button, download));
    return button;
  }

  function cloudErrorMessage(err) {
    const messages = {
      PNG_CONTENT_TOO_LARGE: ["内容过长，请减少单次导出的记录数量", "Too much content. Export fewer records at once"],
      PNG_CANVAS_UNAVAILABLE: ["浏览器无法创建导出画布，请更换浏览器重试", "Canvas export is unavailable. Try another browser"],
      PNG_ENCODING_FAILED: ["浏览器未能生成 PNG，请重试", "The browser could not encode this PNG. Please retry"],
      PNG_NO_TRANSCRIPTS: ["没有可导出的成绩记录", "No transcript records are available to export"],
      PNG_EXPORT_FAILED: ["PNG 导出失败，请重试或更换浏览器", "PNG export failed. Retry or use another browser"],
      FEATURE_PAUSED: ["此功能正在暂停维护，请稍后再试", "This feature is paused. Please try again later"],
      PROFILE_UPDATE_CONFLICT: ["档案已在其他窗口更新，请点击「立即同步」后重新修改", "Your profile changed in another window. Sync before editing again"],
      AUTH_SIGNOUT_IN_PROGRESS: ["正在退出登录，请完成后再切换账号", "Signing out. Wait before switching accounts"],
      INVALID_SERVER_RESPONSE: ["校园服务返回的数据不完整，请重新同步确认", "Campus service returned incomplete data. Sync to confirm"],
      AUTH_REQUIRES_RECENT_LOGIN: ["请重新 Google 登录后再执行此操作（需要最近 5 分钟内的验证）", "Sign in with Google again before this action (verification within 5 minutes required)"],
      AUTH_RETRY_REQUIRED: ["会话已更新，请重新安全验证并手动重试；上次写入不会自动重发", "Session refreshed. Complete a new security check and retry manually"],
      AUTH_INIT_TIMEOUT: ["登录服务初始化超时，请点击登录重试；游客功能仍可使用", "Sign-in setup timed out. Click Sign in to retry; guest features remain available"],
      AUTH_POPUP_TIMEOUT: ["登录窗口等待超时，请关闭旧窗口后重试", "Sign-in window timed out. Close the old window and retry"],
      AUTH_SIGNOUT_TIMEOUT: ["退出登录超时，请重试以确认退出", "Sign-out timed out. Retry to confirm you are signed out"],
      API_REQUEST_TIMEOUT: ["校园服务响应超时，可点击同步确认最新状态", "Campus service timed out. Sync to check the latest state"],
      NETWORK_ERROR: ["网络连接失败，请检查连接后重试", "Network request failed. Check your connection and retry"],
      INVALID_API_RESPONSE: ["校园服务返回的数据不完整，请稍后重新同步", "Campus service returned incomplete data. Retry syncing shortly"],
      TURNSTILE_ACTION_MISMATCH: ["安全验证与当前操作不符，请重新验证", "Security check does not match this action. Complete a new check"],
      FEATURE_DISABLED: ["此功能暂未开放，请稍后再试", "This feature is temporarily closed. Please try again later"],
      "auth/popup-closed-by-user": ["已取消 Google 登录，您可以继续使用游客功能", "Google sign-in cancelled. Guest features remain available"],
      "auth/cancelled-popup-request": ["登录窗口已被另一次操作替换，请重试", "Another sign-in replaced this window. Please retry"],
      TURNSTILE_REQUIRED: ["请先完成本页安全验证", "Complete this page's security check first"],
      CLOUD_WRITE_IN_PROGRESS: ["上一项云端登记仍在处理，请稍后再试", "A cloud save is still in progress. Try again shortly"],
      TURNSTILE_TOKEN_USED: ["安全验证已使用，请重新验证", "This security check has been used. Complete a fresh check"],
      "auth/popup-blocked": ["请允许本站弹窗后重试 Google 登录", "Allow popups for this site and retry Google sign-in"],
      AUTH_REDIRECT_UNAVAILABLE: ["请允许登录弹窗；内置浏览器请改用 Safari 或 Chrome", "Allow sign-in popups, or open this page in Safari or Chrome"],
      "auth/unauthorized-domain": ["本站尚未加入 Firebase 授权网域，请联系管理员", "This site needs to be added to the Firebase authorized domains"],
      "auth/operation-not-allowed": ["管理员尚未启用 Google 登录", "Google sign-in has not been enabled by the administrator"],
      AUTH_NOT_READY: ["登录组件正在准备，请稍后重试", "Sign-in is getting ready. Please retry shortly"],
      "auth/network-request-failed": ["无法连接 Google 登录服务，请检查网络后重试", "Cannot reach Google sign-in. Check your connection and retry"]
    };
    const message = messages[err && err.code];
    return message ? message[currentLang === "zh" ? 0 : 1] : (err && err.message) || (currentLang === "zh" ? "网络请求失败，请重试" : "Request failed. Please retry");
  }

  function updateCloudSecurityCheck() {
    const authState = window.ANU_AUTH ? window.ANU_AUTH.getState() : null;
    const selectors = {
      "my-anu": "#turnstile-reg-container",
      admissions: "#turnstile-diploma-container",
      research: "#turnstile-paper-container"
    };
    const selector = authState && authState.user && (currentPage === "my-anu" || authState.isRegistered)
      ? selectors[currentPage] : null;
    document.querySelectorAll(".cloud-security-check").forEach((panel) => {
      panel.style.display = selector && panel.querySelector(selector) ? "block" : "none";
    });
    const action = currentPage === "my-anu" ? (authState && authState.isRegistered ? "import" : "register")
      : currentPage === "admissions" ? "diploma" : "paper";
    if (selector) window.ANU_AUTH.mountTurnstileWidget(selector, action);
  }

  function renderMyAnuPortal() {
    const dict = i18nDict[currentLang];
    // Transient notices belong to the language in which the operation happened.
    // Persistent pending/error state below is rendered again in the new language.
    if (portalLanguage && portalLanguage !== currentLang && myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = "";
    portalLanguage = currentLang;
    const authState = window.ANU_AUTH ? window.ANU_AUTH.getState() : { user: null, isRegistered: false, bundle: null };
    if (myAnuAuthBanner) myAnuAuthBanner.dataset.authState = authState.user ? "signed-in" : "guest";
    if (myAnuAuthStatus) {
      myAnuAuthStatus.textContent = authState.authSigningIn || authState.authInitializing
        ? dict.my_auth_status_pending
        : authState.user ? dict.my_auth_status_signed_in : dict.my_auth_status_guest;
    }
    if (authState.user && !authState.authError && loginFailureFeedback !== null) {
      // Only replace a notice still owned by the failed sign-in. Other actions
      // may have posted useful feedback while Firebase finished in the background.
      if (myAnuGlobalFeedback && myAnuGlobalFeedback.textContent === loginFailureFeedback) {
        myAnuGlobalFeedback.textContent = currentLang === "zh" ? "✓ Google 账号登录成功！" : "✓ Signed in with Google!";
      }
      loginFailureFeedback = null;
    }
    const bundle = authState.bundle;
    const profile = bundle && bundle.profile;
    const account = authState.user && authState.user.uid;
    if (archiveAccount !== account) {
      archiveAccount = account;
      archiveSource = "cloud";
    }
    const showCloud = Boolean(authState.user && archiveSource === "cloud");
    if (archiveSourceSelect) {
      archiveSourceSelect.value = authState.user ? archiveSource : "local";
      archiveSourceSelect.disabled = !authState.user;
    }
    if (archiveSourceNote) archiveSourceNote.textContent = showCloud ? dict.my_source_cloud_note : dict.my_source_local_note;
    const busy = Boolean(authState.cloudSaving);
    [importLocalArchiveBtn, submitStudentRegBtn, saveProfileSettingsBtn, deleteAccountBtn].forEach((button) => {
      if (button) button.disabled = busy;
    });
    if (googleSignoutBtn) googleSignoutBtn.disabled = Boolean(authState.authSigningIn || authState.authSigningOut);

    if (sidebarAuthBadge) {
      sidebarAuthBadge.textContent = profile ? "SYNC" : authState.user ? (authState.bundleLoaded ? "NEW" : "…") : "ID";
    }

    // Update top auth banner
    if (authState.user) {
      if (googleSigninBtn) googleSigninBtn.style.display = "inline-flex";
      if (googleSignoutBtn) googleSignoutBtn.style.display = "inline-flex";
      if (syncCloudBtn) {
        syncCloudBtn.style.display = "inline-flex";
        syncCloudBtn.disabled = Boolean(authState.cloudLoading || busy);
        syncCloudBtn.setAttribute("aria-busy", String(Boolean(authState.cloudLoading)));
        syncCloudBtn.textContent = authState.cloudLoading ? dict.my_sync_loading : dict.my_btn_sync_now;
      }
      if (importLocalArchiveBtn) importLocalArchiveBtn.style.display = authState.isRegistered ? "inline-flex" : "none";
      if (myAnuRegPanel) myAnuRegPanel.style.display = authState.bundleLoaded && !authState.isRegistered ? "block" : "none";

      if (myAnuStatusHeadline) {
        myAnuStatusHeadline.textContent = profile
          ? (currentLang === "zh"
              ? `欢迎回到校园，${profile.nickname}（学号：${profile.studentNumber}）`
              : `Welcome back, ${profile.nickname} (ID: ${profile.studentNumber})`)
          : !authState.bundleLoaded
            ? (currentLang === "zh" ? "Google 已登录 · 校园档案尚未加载" : "Signed in with Google · Campus archive not loaded yet")
            : (currentLang === "zh"
              ? "Google 账号验证成功 · 请完成首次 ANU 校园学籍建立"
              : "Google Account Verified · Complete Your ANU Matriculation Below");
      }
      if (myAnuStatusSub) {
        myAnuStatusSub.textContent = authState.user.email
          ? (currentLang === "zh"
              ? `Google 账号：${authState.user.email}`
              : `Google account: ${authState.user.email}`)
          : "";
      }
      if (!authState.isRegistered && regNicknameInput && !regNicknameInput.value.trim()) {
        regNicknameInput.value = authState.user.displayName || dict.form_default_name;
      }
      if (authState.cloudError && myAnuGlobalFeedback) {
        myAnuGlobalFeedback.textContent = currentLang === "zh"
          ? `云端档案暂时无法同步：${cloudErrorMessage(authState.cloudError)}。请点击「立即同步」重试。`
          : `Cloud archive unavailable: ${cloudErrorMessage(authState.cloudError)}. Use Sync Now to retry.`;
      }
    } else {
      if (googleSigninBtn) googleSigninBtn.style.display = "inline-flex";
      if (googleSignoutBtn) googleSignoutBtn.style.display = "none";
      if (syncCloudBtn) syncCloudBtn.style.display = "none";
      if (importLocalArchiveBtn) importLocalArchiveBtn.style.display = "none";
      if (myAnuRegPanel) myAnuRegPanel.style.display = "none";
      if (myAnuStatusHeadline) myAnuStatusHeadline.textContent = dict.my_guest_banner_title;
      if (myAnuStatusSub) myAnuStatusSub.textContent = dict.my_guest_banner_desc;
    }
    if (googleSigninBtn) {
      googleSigninBtn.disabled = Boolean(authState.authSigningIn || authState.authSigningOut);
      googleSigninBtn.textContent = authState.user ? dict.my_btn_switch_account : dict.my_btn_google_signin;
      googleSigninBtn.setAttribute("aria-busy", String(Boolean(authState.authInitializing || authState.authSigningIn)));
    }
    if (busy && myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = dict.my_sync_saving;
    updateCloudSecurityCheck();

    // Update Student ID Card
    const localProfile = (function () {
      try {
        return JSON.parse(localStorage.getItem("anu_local_profile") || "null");
      } catch {
        return null;
      }
    })();

    const activeNickname = profile
      ? profile.nickname
      : authState.user ? (currentLang === "zh" ? "校园档案未加载" : "Campus profile not loaded")
        : (localProfile && localProfile.nickname) || (nameInput && nameInput.value.trim()) || dict.form_default_name;
    const activeStudentNumber = profile ? profile.studentNumber : "ANU-2026-GUEST0";
    const activeAvatarSeed = profile
      ? profile.avatarSeed
      : (localProfile && localProfile.avatarSeed) || "crest-oxford";
    const activeAvatarUrl = profile ? profile.avatarUrl : "";
    const activeVisibility = profile
      ? profile.visibility
      : "private";

    if (window.ANU_AUTH && myAnuAvatarBox) {
      window.ANU_AUTH.renderCrestAvatarSvg(myAnuAvatarBox, activeAvatarSeed, activeNickname, activeAvatarUrl);
    }

    if (myAnuVisibilityPill) {
      myAnuVisibilityPill.textContent =
        activeVisibility === "public"
          ? dict.my_lbl_visibility_badge_public
          : dict.my_lbl_visibility_badge_private;
    }
    if (myAnuDisplayName) myAnuDisplayName.textContent = activeNickname;
    if (myAnuStudentNumber) myAnuStudentNumber.textContent = activeStudentNumber;

    if (myAnuCollegeVal) {
      if (profile) {
        myAnuCollegeVal.textContent = currentLang === "zh" ? profile.collegeNameZh : profile.collegeNameEn;
      } else {
        myAnuCollegeVal.textContent = dict.dept_retreat;
      }
    }
    if (myAnuMajorVal) {
      myAnuMajorVal.textContent = profile
        ? profile.major
        : majorOptionsByLang[currentLang][0];
    }
    if (myAnuEnrollmentVal) {
      myAnuEnrollmentVal.textContent = profile
        ? `${profile.enrollmentYear} (${profile.enrollmentDate})`
        : "2026 (Guest)";
    }
    if (myAnuHonorVal) {
      myAnuHonorVal.textContent = profile
        ? profile.fictionalHonor
        : honorTitlesByLang[currentLang][0];
    }

    // Populate Settings inputs
    if (setNicknameInput && document.activeElement !== setNicknameInput) {
      setNicknameInput.value = activeNickname;
    }
    if (setCollegeSelect && profile) {
      setCollegeSelect.value = profile.college;
    }
    if (setAvatarSelect) {
      setAvatarSelect.value = activeAvatarSeed;
    }
    if (setVisibilitySelect) {
      setVisibilitySelect.value = activeVisibility;
    }
    if (setPublicConsentChk) {
      setPublicConsentChk.checked = Boolean(profile ? profile.publicConsent : false);
    }

    // 1. Render Transcripts Tab
    if (myTranscriptsList) {
      myTranscriptsList.textContent = "";
      const cloudTranscripts = (bundle && bundle.transcripts) || [];
      const localTranscripts = loadLocalList("anu_local_exams");
      const items = showCloud ? cloudTranscripts : localTranscripts;

      if (!items.length) {
        myTranscriptsList.appendChild(createEmptyNoticeElement(dict.my_empty_transcripts));
      } else {
        items.forEach((t) => {
          const card = document.createElement("article");
          card.className = "ann-item";
          const meta = document.createElement("div");
          meta.className = "ann-item-meta";
          const badge = document.createElement("span");
          badge.className = "ann-badge";
          badge.textContent = t.course_code || t.courseCode || "EXAM";
          const dateSpan = document.createElement("span");
          dateSpan.textContent = (t.created_at || t.createdAt || "").slice(0, 10);
          meta.appendChild(badge);
          meta.appendChild(dateSpan);

          const h4 = document.createElement("h4");
          h4.textContent =
            currentLang === "zh"
              ? (t.course_title_zh || t.courseTitleZh || "") + " · " + (t.grade_label_zh || t.gradeLabelZh || "")
              : (t.course_title_en || t.courseTitleEn || "") + " · " + (t.grade_label_en || t.gradeLabelEn || "");

          const p = document.createElement("p");
          p.textContent = currentLang === "zh" ? (t.verdict_zh || t.verdictZh || "") : (t.verdict_en || t.verdictEn || "");

          card.appendChild(meta);
          card.appendChild(h4);
          card.appendChild(p);
          card.appendChild(archivePngButton(() => CANVAS_EXPORT.downloadTranscriptPNG(t, currentLang, showCloud ? profile : localProfile)));
          myTranscriptsList.appendChild(card);
        });
      }
    }

    // 2. Render Papers Tab
    if (myPapersList) {
      myPapersList.textContent = "";
      const cloudPapers = (bundle && bundle.papers) || [];
      const localPapers = loadLocalList("anu_local_papers");
      const items = showCloud ? cloudPapers : localPapers;

      if (!items.length) {
        myPapersList.appendChild(createEmptyNoticeElement(dict.my_empty_papers));
      } else {
        items.forEach((p) => {
          const card = document.createElement("article");
          card.className = "ann-item";
          const meta = document.createElement("div");
          meta.className = "ann-item-meta";
          const badge = document.createElement("span");
          badge.className = "ann-badge";
          badge.textContent = p.void_id || "VOID-ID";
          const jSpan = document.createElement("span");
          jSpan.textContent = currentLang === "zh" ? (p.journal_zh || "") : (p.journal_en || "");
          meta.appendChild(badge);
          meta.appendChild(jSpan);

          const h4 = document.createElement("h4");
          h4.textContent = p.title || "";
          const authorP = document.createElement("p");
          authorP.textContent = p.author_display || p.author || "";

          card.appendChild(meta);
          card.appendChild(h4);
          card.appendChild(authorP);
          card.appendChild(archivePngButton(() => CANVAS_EXPORT.downloadPaperAcceptancePNG(p, currentLang)));
          myPapersList.appendChild(card);
        });
      }
    }

    // 3. Render Diplomas Tab
    if (myDiplomasList) {
      myDiplomasList.textContent = "";
      const cloudDiplomas = (bundle && bundle.diplomas) || [];
      const localDiplomas = loadLocalList("anu_local_diplomas");
      const items = showCloud ? cloudDiplomas : localDiplomas;

      if (!items.length) {
        myDiplomasList.appendChild(createEmptyNoticeElement(dict.my_empty_diplomas));
      } else {
        items.forEach((d) => {
          const card = document.createElement("article");
          card.className = "ann-item";
          const meta = document.createElement("div");
          meta.className = "ann-item-meta";
          const badge = document.createElement("span");
          badge.className = "ann-badge";
          badge.textContent = d.serial_number || d.serialNumber || "ANU-DIPLOMA";
          const dateSpan = document.createElement("span");
          dateSpan.textContent = d.issued_date || d.issuedDate || "";
          meta.appendChild(badge);
          meta.appendChild(dateSpan);

          const h4 = document.createElement("h4");
          h4.textContent =
            (d.recipient_name || d.recipientName || "") +
            " — " +
            (currentLang === "zh" ? (d.degree_zh || d.degreeZh || "") : (d.degree_en || d.degreeEn || ""));

          const p = document.createElement("p");
          p.textContent =
            (currentLang === "zh" ? (d.major_zh || d.majorZh || "") : (d.major_en || d.majorEn || "")) +
            " · " +
            (currentLang === "zh" ? (d.honor_zh || d.honorZh || "") : (d.honor_en || d.honorEn || ""));

          card.appendChild(meta);
          card.appendChild(h4);
          card.appendChild(p);
          card.appendChild(archivePngButton(() => {
            const language = d.cert_lang || d.certLang || "auto";
            return CANVAS_EXPORT.downloadDiplomaPNG(Object.assign({}, d, { certLang: language === "auto" ? currentLang : language }));
          }));
          myDiplomasList.appendChild(card);
        });
      }
    }

    // 4. Render Honors & Societies Tab
    if (myHonorsList) {
      myHonorsList.textContent = "";
      const cloudHonors = showCloud ? (bundle && bundle.honors) || [] : [];

      if (cloudHonors.length) {
        cloudHonors.forEach((h) => {
          const card = document.createElement("article");
          card.className = "ann-item";
          const h4 = document.createElement("h4");
          h4.textContent = "🏅 " + (currentLang === "zh" ? h.title_zh : h.title_en);
          const p = document.createElement("p");
          p.textContent = currentLang === "zh" ? h.desc_zh : h.desc_en;
          card.appendChild(h4);
          card.appendChild(p);
          myHonorsList.appendChild(card);
        });
      } else if (!showCloud && joinedClubs.size > 0) {
        Array.from(joinedClubs).forEach((key) => {
          const clubMatch = clubsByLang[currentLang].find((c) => c.id === key);
          const card = document.createElement("article");
          card.className = "ann-item";
          const h4 = document.createElement("h4");
          h4.textContent = "🏅 " + (clubMatch ? clubMatch.name : key);
          const p = document.createElement("p");
          p.textContent = clubMatch
            ? clubMatch.desc
            : currentLang === "zh"
            ? "已在本机解锁隐藏校园摸鱼荣誉勋章。"
            : "Unlocked hidden campus slacking medallion on this device.";
          card.appendChild(h4);
          card.appendChild(p);
          myHonorsList.appendChild(card);
        });
      } else {
        myHonorsList.appendChild(createEmptyNoticeElement(dict.my_empty_honors));
      }
    }
    scheduleSelectNotes();
  }

  if (archiveSourceSelect) archiveSourceSelect.addEventListener("change", () => {
    archiveSource = archiveSourceSelect.value === "local" ? "local" : "cloud";
    renderMyAnuPortal();
  });

  // Tab switching inside My ANU, including keyboard navigation.
  function selectMyTab(btn) {
    const targetTab = btn.getAttribute("data-my-tab");
    myTabButtons.forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", String(b === btn));
      b.tabIndex = b === btn ? 0 : -1;
    });
    myTabPanes.forEach((pane) => {
      const selected = pane.getAttribute("data-my-pane") === targetTab;
      pane.classList.toggle("active", selected);
      pane.hidden = !selected;
    });
    scheduleSelectNotes();
  }
  myTabButtons.forEach((btn) => {
    const name = btn.getAttribute("data-my-tab");
    btn.id = `my-tab-${name}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", `my-tab-pane-${name}`);
    btn.addEventListener("click", () => selectMyTab(btn));
    btn.addEventListener("keydown", (event) => {
      const buttons = Array.from(myTabButtons);
      let index = buttons.indexOf(btn);
      if (event.key === "ArrowRight") index = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft") index = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = buttons.length - 1;
      else return;
      event.preventDefault();
      selectMyTab(buttons[index]);
      buttons[index].focus();
    });
  });
  myTabPanes.forEach((pane) => {
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", `my-tab-${pane.getAttribute("data-my-pane")}`);
    pane.tabIndex = 0;
  });
  if (myTabButtons[0]) selectMyTab(myTabButtons[0]);

  if (regVisibilitySelect && regPublicConsentWrap) {
    regVisibilitySelect.addEventListener("change", () => {
      regPublicConsentWrap.style.display = regVisibilitySelect.value === "public" ? "block" : "none";
    });
  }

  // Save Diploma to Local + Cloud Archive
  if (saveDiplomaCloudBtn) {
    saveDiplomaCloudBtn.addEventListener("click", async () => {
      if (!isStamped && stampBtn) {
        stampBtn.click();
      }
      const degIdx = degreeSelect ? parseInt(degreeSelect.value, 10) || 0 : 0;
      const majIdx = majorSelect ? parseInt(majorSelect.value, 10) || 0 : 0;
      const honIdx = honorSelect ? parseInt(honorSelect.value, 10) || 0 : 0;
      const citIdx = achievementSelect ? parseInt(achievementSelect.value, 10) || 0 : 0;
      const tplId = (templateSelect && templateSelect.value) || "oxford";
      const certLangVal = (certLangSelect && certLangSelect.value) || "auto";
      const recName = (nameInput && nameInput.value.trim()) || i18nDict[currentLang].form_default_name;

      const localDip = {
        serialNumber: currentSerial,
        recipientName: recName,
        degreeIdx: degIdx,
        degreeZh: degreeOptionsByLang.zh[degIdx],
        degreeEn: degreeOptionsByLang.en[degIdx],
        majorIdx: majIdx,
        majorZh: majorOptionsByLang.zh[majIdx],
        majorEn: majorOptionsByLang.en[majIdx],
        honorIdx: honIdx,
        honorZh: honorTitlesByLang.zh[honIdx],
        honorEn: honorTitlesByLang.en[honIdx],
        citationIdx: citIdx,
        templateId: tplId,
        certLang: certLangVal,
        issuedDate: new Date().toISOString().slice(0, 10)
      };

      const list = loadLocalList("anu_local_diplomas");
      list.unshift(localDip);
      saveLocalList("anu_local_diplomas", list);

      const authState = window.ANU_AUTH ? window.ANU_AUTH.getState() : null;
      if (authState && authState.user && authState.isRegistered) {
        try {
          const turnstileToken = window.ANU_AUTH.getTurnstileToken();
          const res = await window.ANU_AUTH.submitDiplomaToCloud(localDip, turnstileToken);
          if (diplomaCloudStatusEl) {
            diplomaCloudStatusEl.textContent =
              currentLang === "zh"
                ? `✓ 已同步至您的 My ANU 云端证书档案（序列号：${res.serialNumber || currentSerial}）！`
                : `✓ Saved to your My ANU Cloud Diploma Archive (Serial: ${res.serialNumber || currentSerial})!`;
          }
        } catch (err) {
          if (diplomaCloudStatusEl) {
            diplomaCloudStatusEl.textContent =
              currentLang === "zh"
                ? `已存入本机档案（云端未同步：${cloudErrorMessage(err)}，稍后可在 My ANU 导入）`
                : `Saved to local archive (Cloud sync failed: ${cloudErrorMessage(err)}. You can import later in My ANU.)`;
          }
        }
      } else {
        if (diplomaCloudStatusEl) {
          diplomaCloudStatusEl.textContent =
            currentLang === "zh"
              ? "✓ 已存入本机「My ANU · 荣誉学位证书」档案！登录 Google 账号后可跨设备云端同步。"
              : "✓ Saved to your local My ANU Diploma Archive! Sign in with Google anytime to sync to the cloud.";
        }
      }
      renderMyAnuPortal();
    });
  }

  // Google Sign-In Button
  if (googleSigninBtn && window.ANU_AUTH) {
    googleSigninBtn.addEventListener("click", async () => {
      if (!window.ANU_AUTH.isFirebaseConfigured()) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "提示：当前环境尚未填入 Firebase Web 配置 (js/anu-config.js)。游客模式与本机档案功能已全部就绪，管理员按 README 完成 Firebase 与 Cloudflare 配置后即可启用云端 Google 登录。"
              : "Note: Firebase Web credentials are not yet populated in js/anu-config.js. Guest mode and local campus archives are fully active; follow README.md to enable live Google Cloud Sign-In.";
        }
        return;
      }
      try {
        googleSigninBtn.disabled = true;
        loginFailureFeedback = null;
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh" ? "正在启动 Google 安全登录..." : "Launching Google Sign-In...";
        }
        const result = await window.ANU_AUTH.signInWithGoogle();
        renderMyAnuPortal();
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent = result.mode === "redirect"
            ? (currentLang === "zh" ? "正在前往 Google 登录页面…" : "Opening Google sign-in…")
            : result.cloudError
              ? (currentLang === "zh" ? `Google 已登录，校园档案暂时无法同步：${cloudErrorMessage(result.cloudError)}` : `Signed in with Google; campus sync unavailable: ${cloudErrorMessage(result.cloudError)}`)
              : (currentLang === "zh" ? "✓ Google 账号登录成功！" : "✓ Signed in with Google!");
        }
      } catch (err) {
        if (myAnuGlobalFeedback) {
          loginFailureFeedback =
            currentLang === "zh"
              ? `登录未完成：${cloudErrorMessage(err)}`
              : `Sign-in incomplete: ${cloudErrorMessage(err)}`;
          myAnuGlobalFeedback.textContent = loginFailureFeedback;
        }
      } finally {
        googleSigninBtn.disabled = false;
      }
    });
  }

  if (googleSigninBtn && window.ANU_AUTH) {
    ["pointerdown", "focus", "touchstart"].forEach((event) => googleSigninBtn.addEventListener(event, () => {
      window.ANU_AUTH.prepareSignIn().catch(() => {});
    }, { passive: true }));
  }

  if (exportArchiveBtn) exportArchiveBtn.addEventListener("click", async () => {
    exportArchiveBtn.disabled = true;
    let objectUrl;
    try {
      const state = window.ANU_AUTH ? window.ANU_AUTH.getState() : {};
      const data = state.user && archiveSource === "cloud" ? (await window.ANU_AUTH.exportStudentArchive()).data
        : { profile: JSON.parse(localStorage.getItem("anu_local_profile") || "null"), transcripts: loadLocalList("anu_local_exams"), papers: loadLocalList("anu_local_papers"), diplomas: loadLocalList("anu_local_diplomas"), honors: Array.from(joinedClubs) };
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), source: state.user && archiveSource === "cloud" ? "cloud" : "device", data }, null, 2)], { type: "application/json" });
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "ANU-personal-archive.json";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.remove(); URL.revokeObjectURL(objectUrl); }, 60000);
      if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = i18nDict[currentLang].my_export_started;
    } catch (err) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = cloudErrorMessage(err);
    } finally { exportArchiveBtn.disabled = false; }
  });

  // Google Sign-Out Button
  if (googleSignoutBtn && window.ANU_AUTH) {
    googleSignoutBtn.addEventListener("click", async () => {
      try {
        await window.ANU_AUTH.signOutStudent();
        renderMyAnuPortal();
        if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent =
          currentLang === "zh"
            ? "您已安全退出 Google 账户，当前处于游客模式。"
            : "Signed out of Google account. You are now in Guest Mode.";
      } catch (err) {
        if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = cloudErrorMessage(err);
      }
    });
  }

  // First-Time Student Registration Submit
  if (submitStudentRegBtn && window.ANU_AUTH) {
    submitStudentRegBtn.addEventListener("click", async () => {
      if (regLegalConsentChk && !regLegalConsentChk.checked) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "请先勾选同意《隐私政策》与《使用条款》。"
              : "Please agree to the Privacy Policy and Terms of Use first.";
        }
        return;
      }
      const wantsPub = regVisibilitySelect && regVisibilitySelect.value === "public";
      if (wantsPub && regPublicConsentChk && !regPublicConsentChk.checked) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "公开档案必须单独勾选公开展示同意选项，否则请选择默认的「私有档案」。"
              : "Making your profile public requires checking the separate explicit consent box.";
        }
        return;
      }

      const majIdx = regMajorSelect ? parseInt(regMajorSelect.value, 10) || 0 : 0;
      const honIdx = regHonorSelect ? parseInt(regHonorSelect.value, 10) || 0 : 0;

      try {
        const turnstileToken = window.ANU_AUTH.getTurnstileToken();
        await window.ANU_AUTH.registerStudentProfile(
          {
            nickname: (regNicknameInput && regNicknameInput.value.trim()) || i18nDict[currentLang].form_default_name,
            college: (regCollegeSelect && regCollegeSelect.value) || "retreat",
            majorIdx: majIdx,
            major: majorOptionsByLang[currentLang][majIdx],
            honorIdx: honIdx,
            fictionalHonor: honorTitlesByLang[currentLang][honIdx],
            enrollmentYear: regYearInput ? parseInt(regYearInput.value, 10) || 2026 : 2026,
            avatarSeed: (regAvatarSelect && regAvatarSelect.value) || "crest-oxford",
            useGoogleAvatar: Boolean(regUseGoogleAvatar && regUseGoogleAvatar.checked),
            visibility: wantsPub ? "public" : "private",
            publicConsent: Boolean(wantsPub && regPublicConsentChk && regPublicConsentChk.checked),
            acceptTerms: true,
            acceptPrivacy: true
          },
          turnstileToken
        );
        renderMyAnuPortal();
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "🎉 恭喜！您的唯一 ANU 学生档案已成功建立！"
              : "🎉 Matriculation complete! Your unique ANU Student Profile is now active!";
        }
      } catch (err) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? `档案创建失败：${cloudErrorMessage(err)}`
              : `Registration failed: ${cloudErrorMessage(err)}`;
        }
      }
    });
  }

  // Sync Now Button
  if (syncCloudBtn && window.ANU_AUTH) {
    syncCloudBtn.addEventListener("click", async () => {
      try {
        await window.ANU_AUTH.refreshStudentBundle();
        renderMyAnuPortal();
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh" ? "✓ 已同步最新校园档案。" : "✓ Synced your latest campus archive.";
        }
      } catch (err) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent = currentLang === "zh"
            ? `同步失败：${cloudErrorMessage(err)}。请稍后重试。`
            : `Sync failed: ${cloudErrorMessage(err)}. Please retry.`;
        }
      }
    });
  }

  // Import Local Campus Archive Button (Idempotent)
  if (importLocalArchiveBtn && window.ANU_AUTH) {
    importLocalArchiveBtn.addEventListener("click", async () => {
      const localExams = loadLocalList("anu_local_exams");
      const localPapers = loadLocalList("anu_local_papers");
      const localDiplomas = loadLocalList("anu_local_diplomas");
      const badges = Array.from(joinedClubs);

      try {
        importLocalArchiveBtn.disabled = true;
        const res = await window.ANU_AUTH.importLocalArchiveToCloud(
          {
            badges,
            exams: localExams,
            papers: localPapers,
            diplomas: localDiplomas
          },
          window.ANU_AUTH.getTurnstileToken()
        );
        renderMyAnuPortal();
        const s = res.importedSummary || { clubsAndBadges: 0, exams: 0, papers: 0, diplomas: 0 };
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? `✓ 本机档案导入完成（新增社团/勋章 ${s.clubsAndBadges} 项、统考成绩 ${s.exams} 份、空白论文 ${s.papers} 篇、学位证书 ${s.diplomas} 份）！`
              : `✓ Local archive imported (Added ${s.clubsAndBadges} badges, ${s.exams} exams, ${s.papers} papers, ${s.diplomas} diplomas)!`;
        }
      } catch (err) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh" ? `导入失败：${cloudErrorMessage(err)}` : `Import failed: ${cloudErrorMessage(err)}`;
        }
      } finally {
        importLocalArchiveBtn.disabled = false;
      }
    });
  }

  // Save Profile & Privacy Settings
  if (saveProfileSettingsBtn) {
    saveProfileSettingsBtn.addEventListener("click", async () => {
      const newNick = (setNicknameInput && setNicknameInput.value.trim()) || i18nDict[currentLang].form_default_name;
      const newCol = (setCollegeSelect && setCollegeSelect.value) || "retreat";
      const newAva = (setAvatarSelect && setAvatarSelect.value) || "crest-oxford";
      const newVis = (setVisibilitySelect && setVisibilitySelect.value) || "private";
      const pubConsent = Boolean(setPublicConsentChk && setPublicConsentChk.checked);

      if (newVis === "public" && !pubConsent) {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "设为公开档案必须勾选单独的公开展示授权复选框。"
              : "Setting visibility to Public requires checking the explicit consent checkbox.";
        }
        return;
      }

      const authState = window.ANU_AUTH ? window.ANU_AUTH.getState() : null;
      if (authState && authState.user && authState.isRegistered) {
        try {
          await window.ANU_AUTH.updateStudentProfile({
            nickname: newNick,
            college: newCol,
            avatarSeed: newAva,
            visibility: newVis === "public" && pubConsent ? "public" : "private",
            publicConsent: Boolean(newVis === "public" && pubConsent)
          });
          if (myAnuGlobalFeedback) {
            myAnuGlobalFeedback.textContent =
              currentLang === "zh" ? "✓ 云端学生档案与隐私设置已更新！" : "✓ Cloud profile and privacy settings saved!";
          }
        } catch (err) {
          if (myAnuGlobalFeedback) {
            myAnuGlobalFeedback.textContent = cloudErrorMessage(err);
          }
        }
      } else if (!authState || !authState.user) {
        try {
          localStorage.setItem("anu_local_profile", JSON.stringify({
            nickname: newNick, college: newCol, avatarSeed: newAva,
            visibility: "private"
          }));
        } catch (err) {
          if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = currentLang === "zh" ? "本机存储不可用，设置未保存。" : "Device storage unavailable. Settings were not saved.";
          return;
        }

        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "✓ 本机校园偏好设置已保存（登录 Google 账号后可同步至云端）。"
              : "✓ Local profile preferences saved (Sign in with Google to sync to cloud).";
        }
      } else if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = currentLang === "zh" ? "请先同步或建立校园档案。" : "Sync or create a campus profile first.";
      renderMyAnuPortal();
    });
  }

  // Permanent Account Deletion
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async () => {
      const confirmVal = (deleteAccountConfirmInput && deleteAccountConfirmInput.value.trim()) || "";
      if (confirmVal !== "DELETE_MY_ANU_ARCHIVE") {
        if (myAnuGlobalFeedback) {
          myAnuGlobalFeedback.textContent =
            currentLang === "zh"
              ? "请输入准确的确认口令 DELETE_MY_ANU_ARCHIVE 以执行永久删除。"
              : "Please type DELETE_MY_ANU_ARCHIVE exactly to confirm permanent deletion.";
        }
        return;
      }

      const authState = window.ANU_AUTH ? window.ANU_AUTH.getState() : null;
      deleteAccountBtn.disabled = true;
      try {
        if (authState && authState.user) {
          await window.ANU_AUTH.deleteStudentAccount();
        } else {
          ["anu_local_profile", "anu_local_exams", "anu_local_papers", "anu_local_diplomas", "anu_joined_clubs"].forEach((key) => localStorage.removeItem(key));
          joinedClubs.clear();
        }
        if (deleteAccountConfirmInput) deleteAccountConfirmInput.value = "";
        renderCampusLife();
        renderMyAnuPortal();
        if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = authState && authState.user
          ? (currentLang === "zh" ? "✓ 本人 ANU 云端校园档案已删除。本机游客记录和 Google 账号保留。" : "✓ Your ANU cloud archive was deleted. Device guest records and your Google account are retained.")
          : (currentLang === "zh" ? "✓ 本机游客记录已删除。" : "✓ Device guest records were deleted.");
      } catch (err) {
        if (myAnuGlobalFeedback) myAnuGlobalFeedback.textContent = (currentLang === "zh" ? "删除未确认成功，记录已保留。" : "Deletion was not confirmed. Records have been retained. ") + cloudErrorMessage(err);
      } finally {
        deleteAccountBtn.disabled = false;
      }
    });
  }

  // Public Student ID Card Lookup
  if (lookupPublicStudentBtn && publicStudentIdInput && publicLookupResult) {
    lookupPublicStudentBtn.addEventListener("click", async () => {
      const rawId = publicStudentIdInput.value.trim().toUpperCase();
      if (!/^ANU-\d{4}-[A-Z0-9]{6}$/.test(rawId)) {
        publicLookupResult.textContent =
          currentLang === "zh"
            ? "学号格式无效，请输入标准格式（例如 ANU-2026-AB12CD）。注意：学号仅用于公开名片展示，绝不作为登录凭据。"
            : "Invalid ANU Student ID format (expected ANU-YYYY-XXXXXX). Student IDs are display-only and never used for authentication.";
        return;
      }
      try {
        const res = await window.ANU_AUTH.lookupPublicStudentProfile(rawId);
        const pub = res.publicProfile;
        publicLookupResult.textContent =
          currentLang === "zh"
            ? `[公开校友名片] 学号：${pub.studentNumber} · 昵称：${pub.nickname} · 学院：${pub.collegeNameZh} · 专业：${pub.major} · 荣誉：${pub.fictionalHonor}`
            : `[Public Alumni Card] ID: ${pub.studentNumber} · Nickname: ${pub.nickname} · College: ${pub.collegeNameEn} · Major: ${pub.major} · Honor: ${pub.fictionalHonor}`;
      } catch (err) {
        publicLookupResult.textContent =
          currentLang === "zh"
            ? `未找到公开记录（该学号不存在或学生保持了默认的私有档案保护）。`
            : `No public record found (Student ID does not exist or remains Private by default).`;
      }
    });
  }

  if (window.ANU_AUTH) {
    window.ANU_AUTH.onStateChange(() => {
      renderMyAnuPortal();
    });
    window.ANU_AUTH.initAuth();
  }

  // Initial Boot
  initSelectNotes();
  applyTheme(currentTheme, false);
  applyLanguage(currentLang, true);
  fetchAnnouncementsData();

  const initialHash = (window.location.hash || "").replace(/^#/, "");
  if (validPages.includes(initialHash)) {
    switchToPage(initialHash, false);
  } else {
    switchToPage("overview", false);
  }
})();
