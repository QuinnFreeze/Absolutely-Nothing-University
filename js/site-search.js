(function (global) {
  "use strict";

  const LANGUAGES = ["zh", "en"];
  const MAX_QUERY_LENGTH = 256;
  const MAX_QUERY_TERMS = 16;
  const MAX_RESULTS = 50;

  // Search is an explicit projection of published content. Never enumerate DATA,
  // inspect the DOM, or read auth, storage, form values, or generated records here.
  const PAGES = [
    ["overview", "nav_overview", ["hero_motto", "hero_headline", "hero_subtitle", "hero_quote_text"]],
    ["admissions", "adm_title", ["adm_eyebrow", "adm_desc", "cert_fictional_notice"]],
    ["academics", "acad_title", ["acad_eyebrow", "acad_desc"]],
    ["research", "res_title", ["res_eyebrow", "res_desc", "reader_oa_note"]],
    ["faculty", "fac_title", ["fac_eyebrow", "fac_desc"]],
    ["campus", "life_title", ["life_eyebrow", "life_desc"]],
    ["webcams", "cam_title", ["cam_eyebrow", "cam_desc", "cam_sim_banner"]],
    ["my-anu", "my_title", ["my_eyebrow", "my_desc", "my_guest_banner_desc"]]
  ];

  // Targets are persistent, public elements in index.html, including containers
  // for dynamic public lists. No target points at a student's private records.
  const FEATURES = [
    ["chancellor", "overview", "chancellor-office-section", "chancellor_sec_title", ["chancellor_sec_desc", "chancellor_schedule_title"]],
    ["announcements", "overview", "announcements-list", "ann_board_title", ["ann_filter_decree", "ann_filter_academic", "ann_filter_campus"]],
    ["diploma", "admissions", "page-admissions", "pcard1_title", ["pcard1_desc", "form_btn_download", "cert_lang_bilingual"]],
    ["courses", "academics", "course-tbody", "pcard2_title", ["pcard2_desc", "dept_retreat", "dept_procrastination", "dept_perfunctory", "dept_daydream"]],
    ["exam", "academics", "mock-exam-section", "exam_title", ["exam_subtitle", "exam_transcript_title"]],
    ["paper-library", "research", "paper-list", "pcard3_title", ["pcard3_desc", "reader_btn_export"]],
    ["submission", "research", "page-research", "sub_paper_title", ["sub_paper_desc", "sub_lbl_journal", "sub_lbl_style"]],
    ["professor-email", "faculty", "page-faculty", "email_prof_title", ["email_prof_desc"]],
    ["cafeteria", "campus", "cafe-menu-list", "cafe_title", ["cafe_note", "cafe_cat_entree", "cafe_cat_drink", "cafe_cat_dessert"]],
    ["lunch", "campus", "spin-lunch-btn", "oracle_title", ["oracle_init", "oracle_btn"]],
    ["clubs", "campus", "clubs-list", "clubs_title", ["clubs_note"]],
    ["campus-account", "my-anu", "page-my-anu", "my_auth_eyebrow", ["my_guest_banner_title", "my_btn_google_signin", "my_auth_private", "my_auth_sync"]],
    ["privacy-policy", "my-anu", "privacy-terms-section", "my_legal_privacy_title", ["my_legal_privacy_body"]],
    ["terms-of-use", "my-anu", "privacy-terms-section", "my_legal_terms_title", ["my_legal_terms_body"]]
  ];

  function plainText(value) {
    if (typeof value !== "string") return "";
    // Some public translations contain formatting markup. Copy only text, using
    // fixed patterns; neither queries nor content ever become executable markup.
    return value.replace(/<[^>]*>/g, " ")
      .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi, function (entity) {
        return { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'" }[entity.toLowerCase()];
      })
      .replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return plainText(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function join(values) {
    return values.map(plainText).filter(Boolean).join(" · ");
  }

  function fields(item, names) {
    return item && typeof item === "object" ? join(names.map(function (name) { return item[name]; })) : "";
  }

  function localized(makeText) {
    return { zh: plainText(makeText("zh")), en: plainText(makeText("en")) };
  }

  function buildIndex(data, announcements) {
    data = data && typeof data === "object" ? data : {};
    const index = [];
    const ids = new Set();
    const dictionary = data.i18nDict || {};
    const translate = function (lang, key) { return plainText((dictionary[lang] || {})[key]); };
    const translations = function (keys) {
      return localized(function (lang) { return join(keys.map(function (key) { return translate(lang, key); })); });
    };

    function add(id, page, targetId, kind, title, body, keywords) {
      if (ids.has(id) || !(title.zh || title.en)) return;
      ids.add(id);
      index.push({
        id: id,
        page: page,
        targetId: targetId,
        kind: kind,
        title: { zh: plainText(title.zh), en: plainText(title.en) },
        body: { zh: plainText(body.zh), en: plainText(body.en) },
        keywords: list(keywords).map(plainText).filter(Boolean)
      });
    }

    PAGES.forEach(function (entry) {
      add("page:" + entry[0], entry[0], "page-" + entry[0], "page", translations([entry[1]]), translations(entry[2]), [entry[0]]);
    });
    FEATURES.forEach(function (entry) {
      add("feature:" + entry[0], entry[1], entry[2], "feature", translations([entry[3]]), translations(entry[4]), []);
    });

    // Parallel bilingual arrays use the same published ordering. Course/paper/
    // club identities are also copied as searchable metadata, never as selectors.
    function addBilingual(items, kind, page, targetId, titleField, bodyFields, extraBody, identityField) {
      items = items || {};
      const zh = list(items.zh);
      const en = list(items.en);
      for (let i = 0; i < Math.max(zh.length, en.length); i += 1) {
        const pair = { zh: zh[i], en: en[i] };
        const identity = identityField ? plainText((pair.zh || pair.en || {})[identityField]) : "";
        const title = localized(function (lang) {
          const item = pair[lang];
          return titleField ? fields(item, [titleField]) : plainText(item);
        });
        const body = localized(function (lang) {
          const item = pair[lang];
          return join([fields(item, bodyFields), extraBody ? extraBody(item, lang) : ""]);
        });
        add(kind + ":" + (identity || i), page, targetId, kind, title, body, [identity]);
      }
    }

    addBilingual(data.coursesByLang, "course", "academics", "course-tbody", "title",
      ["code", "deptName", "credits", "room", "prof", "profBio", "desc", "grading", "book"], function (item) {
        if (!item) return "";
        return join(list(item.syllabus));
      }, "code");
    addBilingual(data.papersByLang, "paper", "research", "paper-list", "title",
      ["doi", "journal", "authors", "citations", "content", "footnote", "reviewerHeader", "review"], null, "doi");
    addBilingual(data.facultyByLang, "faculty", "faculty", "faculty-grid", "name", ["role", "bio", "hours", "reply"]);
    addBilingual(data.cafeMenuByLang, "menu", "campus", "cafe-menu-list", "name", ["desc", "price"], function (item, lang) {
      const categoryKeys = { entree: "cafe_cat_entree", drink: "cafe_cat_drink", dessert: "cafe_cat_dessert" };
      return item ? translate(lang, categoryKeys[item.cat]) : "";
    });
    addBilingual(data.clubsByLang, "club", "campus", "clubs-list", "name", ["desc", "members"], null, "id");
    addBilingual(data.degreeOptionsByLang, "degree", "admissions", "page-admissions", null, []);
    addBilingual(data.majorOptionsByLang, "major", "admissions", "page-admissions", null, []);
    addBilingual(data.honorTitlesByLang, "honor", "admissions", "page-admissions", null, []);
    addBilingual(data.certTemplatesByLang, "template", "admissions", "page-admissions", "label", [], null, "id");
    addBilingual(data.citationOptionsByLang, "citation", "admissions", "page-admissions", "label", ["value"]);
    addBilingual(data.journalOptionsByLang, "journal", "research", "page-research", null, []);
    addBilingual(data.methodologyOptionsByLang, "methodology", "research", "page-research", "label", ["content", "footnote"], null, "key");
    addBilingual(data.bulletinsByLang, "bulletin", "overview", "page-overview", null, []);
    addBilingual(data.excusesByLang, "excuse", "overview", "page-overview", null, []);

    list(data.randomPaperTopicsPool).forEach(function (topic, i) {
      if (!topic) return;
      add("topic:" + i, "research", "page-research", "topic", localized(function (lang) { return topic[lang]; }), { zh: "", en: "" }, []);
    });

    ["1", "2", "3", "4"].forEach(function (camera) {
      const title = translations(["cam" + camera + "_rec"]);
      const body = localized(function (lang) {
        const frames = data.camUpdatesByLang && data.camUpdatesByLang[lang];
        return join([translate(lang, "cam" + camera + "_sub"), translate(lang, "cam" + camera + "_loc"), join(list(frames && frames[camera]))]);
      });
      add("webcam:" + camera, "webcams", "webcam-grid", "webcam", title, body, ["CAM-0" + camera]);
    });

    const published = announcements && typeof announcements === "object" ? announcements : {};
    const chancellor = published.chancellor;
    if (chancellor && typeof chancellor === "object") {
      add("chancellor:profile", "overview", "chancellor-office-section", "chancellor",
        localized(function (lang) { return fields(chancellor[lang], ["name"]); }),
        localized(function (lang) {
          const profile = chancellor[lang] || {};
          const schedule = list(profile.schedule).map(function (slot) { return fields(slot, ["time", "activity"]); });
          return join([fields(chancellor, ["term", "officeRoom"]), fields(profile, ["title", "degrees", "motto", "bio"]), join(schedule)]);
        }), [plainText(chancellor.id)]);
    }
    list(Array.isArray(published) ? published : published.announcements).forEach(function (announcement, i) {
      if (!announcement || typeof announcement !== "object") return;
      const identity = plainText(announcement.id);
      add("announcement:" + (identity || i), "overview", "announcements-list", "announcement",
        localized(function (lang) { return fields(announcement[lang], ["title"]); }),
        localized(function (lang) {
          return join([fields(announcement, ["date"]), fields(announcement[lang], ["categoryLabel", "dept", "summary"])]);
        }), [identity]);
    });
    return index;
  }

  function snippetFor(body, terms) {
    if (!body) return "";
    if (body.length <= 150) return body;
    const normalizedBody = normalize(body);
    const positions = terms.map(function (term) { return normalizedBody.indexOf(term); }).filter(function (position) { return position >= 0; });
    // NFKC may change character positions, so this only chooses an approximate
    // excerpt window. Highlighting is deliberately left to safe DOM text nodes.
    const start = Math.max(0, (positions.length ? Math.min.apply(null, positions) : 0) - 36);
    return (start ? "…" : "") + body.slice(start, start + 150) + (start + 150 < body.length ? "…" : "");
  }

  function search(index, query, lang, limit) {
    if (!Array.isArray(index) || typeof query !== "string" || query.length > MAX_QUERY_LENGTH) return [];
    const normalizedQuery = query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedQuery) return [];
    const terms = Array.from(new Set(normalizedQuery.split(" ")));
    if (terms.length > MAX_QUERY_TERMS) return [];
    lang = lang === "en" ? "en" : "zh";
    const count = typeof limit === "number" && Number.isFinite(limit) ? Math.min(MAX_RESULTS, Math.max(0, Math.floor(limit))) : 24;
    if (!count) return [];
    const seen = new Set();
    const results = [];

    index.forEach(function (record, position) {
      if (!record || typeof record.id !== "string" || seen.has(record.id)) return;
      seen.add(record.id);
      const title = { zh: plainText(record.title && record.title.zh), en: plainText(record.title && record.title.en) };
      const body = { zh: plainText(record.body && record.body.zh), en: plainText(record.body && record.body.en) };
      const normalizedTitles = LANGUAGES.map(function (language) { return normalize(title[language]); });
      const normalizedBodies = LANGUAGES.map(function (language) { return normalize(body[language]); });
      const keywords = list(record.keywords).map(plainText);
      const normalizedKeywords = keywords.map(normalize);
      const haystacks = normalizedTitles.concat(normalizedBodies, normalizedKeywords);
      if (!terms.every(function (term) { return haystacks.some(function (value) { return value.includes(term); }); })) return;

      let score = record.kind === "page" ? 4 : 0;
      if (normalizedTitles.includes(normalizedQuery)) score += 140;
      else if (normalizedTitles.some(function (value) { return value.includes(normalizedQuery); })) score += 65;
      if (normalizedKeywords.includes(normalizedQuery)) score += 180;
      terms.forEach(function (term) {
        if (normalizedTitles.some(function (value) { return value.includes(term); })) score += 24;
        else if (normalizedKeywords.some(function (value) { return value.includes(term); })) score += 20;
        else score += 4;
      });
      results.push({ record: record, title: title, body: body, keywords: keywords, score: score, position: position });
    });

    results.sort(function (a, b) { return b.score - a.score || a.position - b.position; });
    return results.slice(0, count).map(function (result) {
      return Object.assign({}, result.record, {
        title: result.title,
        body: result.body,
        keywords: result.keywords,
        score: result.score,
        snippet: snippetFor(result.body[lang] || result.body[lang === "zh" ? "en" : "zh"], terms)
      });
    });
  }

  global.ANU_SEARCH = { buildIndex: buildIndex, search: search };
})(window);
