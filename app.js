(function () {
  // 1. Detect initial browser language ('zh' vs 'en')
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

  let currentLang = detectInitialLang();
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

  const i18nDict = {
    zh: {
      page_title: "Absolutely Nothing University (ANU) | 绝对虚无大学官方网站",
      brand_sub: "绝对虚无大学 · 公元前 ∞ 年",
      sidebar_term_title: "2026 躺平学年 · 第 NaN 周",
      sidebar_term_status: "教学状态：全校无限期放假中",
      sidebar_sec_main: "核心门户 · PORTALS",
      sidebar_sec_campus: "校园生态 · CAMPUS",
      nav_overview: "创校门户与虚无账本",
      nav_admissions: "极速录取与博士学位",
      nav_academics: "院系与荒诞选课中心",
      nav_research: "空白论文库与在线投稿",
      nav_faculty: "不坐班名师与自动回信",
      nav_campus: "薛定谔食堂与摸鱼社团",
      nav_webcams: "保卫处 24h 实景监控",
      sidebar_btn_excuse: "生成今日请假理由",
      sidebar_excuse_default: "今日官方请假条：由于被窝产生局部强引力场，特批全天免起床。",
      mobile_menu_btn: "☰ 校务侧边栏 (Menu)",
      bulletin_badge: "DEAN'S DECREE · 教务急电",
      bulletin_next: "下一条通知",
      lang_btn: "English",
      hero_motto: "校训：Nihil Agere, Omnia Esse（什么都不做，即是一切）",
      hero_headline: "在人类知识的边界之外，<br />我们选择原地躺平。",
      hero_subtitle: "欢迎来到 <strong>Absolutely Nothing University (ANU)</strong>。自创校以来，我校始终坚守“零科研产出、零考勤要求、零内卷焦虑、零就业压力”的四零办学方针，连续三百年蝉联全球各大高校排行榜第 <code>NaN</code> 名。",
      hero_cta_primary: "3秒颁发荣誉博士学位",
      hero_cta_secondary: "查阅本学期退堂鼓课表",
      hero_quote_text: "“很多大学教你如何改变世界，结果把世界改得乱七八糟。只有我校学子恪守本分，对宇宙熵增做出了零贡献。”",
      hero_quote_cite: "—— 第 404 任校长 阿尔伯特·摸鱼斯坦 (Prof. Albert Slackingstein)，写于午睡前",
      ledger_title: "教务处实时虚无账本",
      ledger_subtitle: "Office of the Provost · Live Inactivity Telemetry",
      ledger_lbl_rank: "全球 QS / U.S. News 综合排名",
      ledger_lbl_grants: "正在进行中的科研课题总数",
      ledger_val_grants: "0.0000 项",
      ledger_lbl_idle: "本学期全校师生累计发呆时长",
      ledger_lbl_awake: "图书馆今日清醒人数",
      ledger_val_awake: "0 人（含1只橘猫）",
      ledger_lbl_saved: "今日因懒得开会节省的经费",
      ledger_btn: "点此为母校贡献 +10 秒纯粹发呆",
      ledger_feedback_init: "每一次点击都将被永久载入我校《什么也没干年鉴》。",
      home_dir_eyebrow: "Porta Academica · 校内各大职能部门直达",
      home_dir_title: "探索绝对虚无大学的六大核心殿堂",
      home_dir_desc: "您可通过左侧常驻学院导航栏或下方快捷入口，随时前往学位授予处、荒诞选课中心、空白期刊库或薛定谔食堂。",
      pcard1_title: "免试直录与博士颁授",
      pcard1_desc: "无需考试与答辩，自定义您的荒诞专业，加盖火漆大印并导出高清 PNG 博士学位证。",
      pcard2_title: "四大院系与翘课指南",
      pcard2_desc: "涵盖退堂鼓演奏、死线前爆发力学、会议放空工程等 8 门王牌课程，选课即自动翘课。",
      pcard3_title: "《Nature: Nothing》期刊",
      pcard3_desc: "查阅零字数高被引镇校论文，或在线提交您的空白手稿，当场获取同行评审盛赞。",
      pcard4_title: "不坐班名师与自动回信",
      pcard4_desc: "认识图书馆首席呼噜官橘座主任与司马改天教授，体验向教授发邮件秒收敷衍回信。",
      pcard5_title: "薛定谔食堂与摸鱼社团",
      pcard5_desc: "解决人类终极难题“中午吃什么”，报名加入退堂鼓交响乐团与发呆竞技队。",
      pcard6_title: "保卫处 24h 静止监控",
      pcard6_desc: "实时监看空无一人的自习大厅、凉透的校长枸杞茶与正在烤红薯的超算机箱。",
      pcard_enter: "进入该殿堂",
      adm_eyebrow: "Admissio Sine Examine · 免试直录与学位授予处",
      adm_title: "三秒极速录取与荣誉博士颁授系统",
      adm_desc: "由于招生办老师觉得审阅简历过于劳累，我校自 1899 年起全面废除入学考试与论文答辩。只要您此刻正在呼吸（或假装思考），即可当场获颁加盖火漆大印的官方学位证书。",
      form_title: "填写您的摸鱼档案",
      form_note: "免报名费 · 免推荐信 · 填完直接毕业",
      form_lbl_name: "受颁人尊姓大名 (Recipient Name)",
      form_placeholder_name: "请输入您的姓名或代号",
      form_default_name: "首席退堂鼓演奏家",
      form_lbl_degree: "申请学位等级 (Degree Title)",
      form_lbl_major: "主修荒诞专业 (Department & Major)",
      form_lbl_citation: "代表性学术不作为 (Citation of Inaction)",
      form_btn_stamp: "加盖校长火漆大印",
      form_btn_download: "导出高清 PNG 学位证",
      cert_proclamation: "经绝对虚无大学评议会全票弃权通过，兹郑重授予",
      cert_major_prefix: "专业方向：",
      cert_privilege_suffix: "并享有在全球任何沙发上理直气壮躺平之特权。",
      cert_sig_left: "第 404 任校长（代签：他睡着了）",
      cert_sig_right: "教务长兼图书馆首席呼噜官",
      cert_serial_prefix: "证书档案号：",
      cert_serial_stamped: "（已加盖火漆大印）",
      cert_btn_random: "随机生成一位摸鱼校友",
      acad_eyebrow: "Index Lectionum · 四大王牌学院与课程目录",
      acad_title: "2026 学年必修与选修翘课指南",
      acad_desc: "我校所有课程均采用“薛定谔面授法”：只要老师和学生同时决定不去教室，这节课就算圆满完成。点击下方任意课程可查阅详细教学大纲与评分标准。",
      dept_all: "全部王牌课程 (8)",
      dept_retreat: "退堂鼓与战略放弃学院",
      dept_procrastination: "量子拖延与死线实验室",
      dept_perfunctory: "高级糊弄与会议放空系",
      dept_daydream: "神游太虚与午睡工程学院",
      th_code: "课程代码",
      th_name: "课程名称与所属院系",
      th_credits: "学分",
      th_room: "上课地点",
      syl_lbl_desc: "课程简介 (Course Description)",
      syl_lbl_grading: "考核标准 (Grading Policy)",
      syl_lbl_book: "指定教材 (Required Textbook)",
      syl_btn_enroll: "一键选课并立即翘课",
      res_eyebrow: "Acta Nihilologica · 镇校学术成果与空白期刊",
      res_title: "《Nature: Nothing》高被引空白论文阅览室",
      res_desc: "我校学者每年在国际顶刊发表数百篇零字数论文。点击下方代表作可在线调阅全文手稿，您也可以在底部直接投递您的零字数大作。",
      res_reviewer_label: "同行评审专家意见 (Peer Reviewer #2 Verdict)：",
      sub_paper_title: "向《Nature: Nothing》在线投递零字数论文",
      sub_paper_desc: "只需填写一个听起来很厉害的标题，正文系统会自动为您保持 0 字，并当场完成同行盲审与录用刊发。",
      sub_paper_placeholder: "例如：论周日下午三点的绝望感与外卖配送延误的非线性关系",
      sub_paper_btn: "一键投递空白手稿并秒录用",
      fac_eyebrow: "Ordo Professorum · 终身不坐班名师名录",
      fac_title: "杰出师资与睡眠领军人物",
      fac_desc: "我校教授全部实行“终身免坐班、免科研、免回复邮件”制度。如果您在校园里偶遇任何一位教授，说明他走错路了。",
      fac_hours_label: "答疑时间：",
      email_prof_title: "给不坐班教授发送学术咨询邮件",
      email_prof_desc: "体验我校研发的“0秒自动敷衍回信系统 (Auto-Perfunctory Responder)”。无论您问什么，教授都不会看。",
      email_prof_placeholder: "输入您想请教的问题（例如：老师我的毕业论文还没开题怎么办？）",
      email_prof_btn: "发送邮件",
      email_prof_init: "自动回信箱待命中：请选择一位教授并发送邮件。",
      life_eyebrow: "Vita Scholastica · 薛定谔食堂与摸鱼社团联合会",
      life_title: "校园生活、餐饮玄学与课外躺平指南",
      life_desc: "在绝对虚无大学，我们不仅在学术上毫无建树，在课余生活上也做到了极致的随遇而安。",
      cafe_title: "第一薛定谔食堂 · 今日菜单",
      cafe_note: "营业时间：看厨师心情（通常在午睡）",
      oracle_title: "人类终极难题解答器：今天中午到底吃什么？",
      oracle_init: "点击下方按钮，由食堂首席颠勺大师为您钦定今日菜单。",
      oracle_btn: "求食堂大勺指点迷津",
      clubs_title: "学生摸鱼社团招新（共 3 个社团）",
      clubs_note: "零社费 · 零活动 · 加群即永久免打扰",
      club_join_btn: "一键入团并开启免打扰",
      club_feedback_init: "当前状态：您尚未加入任何社团（其实加了也从来不办活动）。",
      cam_eyebrow: "Speculum Campi · 校园 24 小时实景监控",
      cam_title: "全校重点区域实时虚无监控网",
      cam_desc: "为了向社会各界证明我校确实什么都没在干，保卫处特将校内四路高清摄像头画面向全球公开直播。",
      cam1_rec: "● REC [CAM-01: 中央自习大厅]",
      cam1_sub: "噪音分贝：0.0 dB · 翻书声：0 次/世纪",
      cam1_loc: "位置：不学无术楼 1F",
      cam2_rec: "● REC [CAM-02: 校长办公桌]",
      cam2_sub: "水温：已凉透 · 待批阅文件：0 份",
      cam2_loc: "位置：行政摆烂楼 404 室",
      cam3_rec: "● REC [CAM-03: 量子超算中心]",
      cam3_sub: "算力负载：0.00 FLOPS · 红薯熟度：85%",
      cam3_loc: "位置：地下负一层锅炉房旁",
      cam4_rec: "● REC [CAM-04: 毕业大草坪]",
      cam4_sub: "风速：微风 · 树叶归属：顺其自然",
      cam4_loc: "位置：南门晒太阳广场",
      cam_refresh: "刷新镜头",
      footer_motto: "校训：Nihil Agere, Omnia Esse · 什么都不做，即是一切"
    },
    en: {
      page_title: "Absolutely Nothing University (ANU) | Official Website",
      brand_sub: "Founded in ∞ B.C. · Ranked NaN",
      sidebar_term_title: "2026 Slacking Term · Week NaN",
      sidebar_term_status: "Status: Campus-Wide Infinite Vacation",
      sidebar_sec_main: "ACADEMIC PORTALS",
      sidebar_sec_campus: "CAMPUS ECOSYSTEM",
      nav_overview: "Campus Portal & Live Ledger",
      nav_admissions: "Instant Ph.D. & Admissions",
      nav_academics: "Departments & Truancy Catalog",
      nav_research: "Blank Papers & Submission",
      nav_faculty: "Absentee Faculty & Auto-Reply",
      nav_campus: "Schrödinger Dining & Clubs",
      nav_webcams: "24/7 Inactivity Webcams",
      sidebar_btn_excuse: "Generate Official Excuse",
      sidebar_excuse_default: "Official Excuse Slip: Due to localized strong gravitational fields inside my duvet, I am excused from waking up today.",
      mobile_menu_btn: "☰ Campus Sidebar (Menu)",
      bulletin_badge: "DEAN'S DECREE · URGENT NOTICE",
      bulletin_next: "Next Bulletin",
      lang_btn: "中文",
      hero_motto: "Motto: Nihil Agere, Omnia Esse (Doing Nothing, Being Everything)",
      hero_headline: "Beyond the frontiers of human knowledge,<br />we choose to lie flat.",
      hero_subtitle: "Welcome to <strong>Absolutely Nothing University (ANU)</strong>. Since antiquity, we have upheld our Four-Zero Charter: Zero Research Output, Zero Attendance, Zero Hustle Anxiety, and Zero Career Pressure, proudly maintaining our global rank of <code>NaN</code> for three consecutive centuries.",
      hero_cta_primary: "Claim Your Honorary Ph.D. in 3s",
      hero_cta_secondary: "Browse the Truancy Course Catalog",
      hero_quote_text: "“Countless universities teach you how to change the world, and look what a mess they made. Only our students stay put and contribute zero entropy to the universe.”",
      hero_quote_cite: "— Prof. Albert Slackingstein, 404th Chancellor, written right before his afternoon nap",
      ledger_title: "Provost's Live Inactivity Ledger",
      ledger_subtitle: "Office of the Provost · Real-Time Zero-Effort Telemetry",
      ledger_lbl_rank: "QS / U.S. News Global Ranking",
      ledger_lbl_grants: "Active Research Grants in Progress",
      ledger_val_grants: "0.0000 Projects",
      ledger_lbl_idle: "Cumulative Campus Daydreaming Time",
      ledger_lbl_awake: "Awake Individuals in Library Today",
      ledger_val_awake: "0 Humans (1 Ginger Cat)",
      ledger_lbl_saved: "Budget Saved by Canceling Meetings",
      ledger_btn: "Contribute +10 Seconds of Pure Daydreaming",
      ledger_feedback_init: "Every click is permanently archived in our Annals of Total Inaction.",
      home_dir_eyebrow: "Porta Academica · Direct Departmental Portals",
      home_dir_title: "Explore the Six Halls of Absolutely Nothing University",
      home_dir_desc: "Use the persistent left sidebar or the quick portals below to visit the Diploma Conferral Hall, Truancy Course Catalog, Blank Journal Archive, or Schrödinger Cafeteria.",
      pcard1_title: "Instant Ph.D. & Conferral",
      pcard1_desc: "Zero exams or thesis defense. Customize your absurd major, stamp the crimson wax seal, and export a high-res PNG diploma.",
      pcard2_title: "Faculties & Truancy Catalog",
      pcard2_desc: "Explore 8 flagship courses across Retreat Drumming, Deadline Panic Physics, and Meeting Zoning-Out. Enroll and skip immediately.",
      pcard3_title: "Nature: Nothing Journal",
      pcard3_desc: "Read our most-cited zero-word manuscripts or submit your own blank paper for instant peer-review acclaim.",
      pcard4_title: "Absentee Faculty & Auto-Reply",
      pcard4_desc: "Meet Chief Purring Officer Prof. Ginger and test our 0-second Out-of-Office Perfunctory Email Simulator.",
      pcard5_title: "Schrödinger Dining & Clubs",
      pcard5_desc: "Solve humanity's ultimate 'What's for lunch?' dilemma and join the Retreat Symphony Orchestra or Competitive Daydreaming Team.",
      pcard6_title: "24/7 Security Webcams",
      pcard6_desc: "Watch live feeds of our empty study hall, cold herbal tea on the Chancellor's desk, and supercomputers roasting sweet potatoes.",
      pcard_enter: "Enter Hall",
      adm_eyebrow: "Admissio Sine Examine · Direct Enrollment & Conferral",
      adm_title: "3-Second Instant Admission & Honorary Ph.D. Generator",
      adm_desc: "Because our Admissions Committee found reading applications far too exhausting, ANU abolished entrance exams and thesis defenses in 1899. As long as you are currently breathing (or pretending to think), you may confer upon yourself an official wax-sealed diploma right now.",
      form_title: "Complete Your Slacking Dossier",
      form_note: "Zero Application Fee · Zero Reference Letters · Instant Graduation",
      form_lbl_name: "Recipient Full Name or Alias",
      form_placeholder_name: "Enter your name or slacker title",
      form_default_name: "Chief Retreat Drummer",
      form_lbl_degree: "Degree Title to Confer",
      form_lbl_major: "Department & Absurd Major",
      form_lbl_citation: "Distinguished Citation of Inaction",
      form_btn_stamp: "Stamp Official Crimson Wax Seal",
      form_btn_download: "Export High-Res PNG Diploma",
      cert_proclamation: "By unanimous abstention of the Senate of Absolutely Nothing University, we hereby confer upon",
      cert_major_prefix: "Majoring in: ",
      cert_privilege_suffix: "with all the rights and privileges to lie flat on any sofa worldwide.",
      cert_sig_left: "404th Chancellor (Signed by proxy while napping)",
      cert_sig_right: "Provost & Chief Library Purring Officer",
      cert_serial_prefix: "Archive Serial: ",
      cert_serial_stamped: " (Crimson Seal Verified)",
      cert_btn_random: "Generate Random Slacker Alumni",
      acad_eyebrow: "Index Lectionum · Faculties & Course Catalog",
      acad_title: "2026 Academic Year Guide to Strategic Truancy",
      acad_desc: "All courses at ANU follow the Schrödinger Pedagogy: whenever both professor and students simultaneously decide not to show up, the lecture is deemed a resounding success. Click any course below to inspect its syllabus.",
      dept_all: "All Flagship Courses (8)",
      dept_retreat: "College of Strategic Giving Up",
      dept_procrastination: "Quantum Procrastination Lab",
      dept_perfunctory: "Dept. of Meeting Zoning-Out",
      dept_daydream: "Institute of Nap Engineering",
      th_code: "Code",
      th_name: "Course Title & Department",
      th_credits: "Credits",
      th_room: "Location",
      syl_lbl_desc: "Course Description",
      syl_lbl_grading: "Grading Policy",
      syl_lbl_book: "Required Textbook",
      syl_btn_enroll: "Enroll & Skip Entire Semester Now",
      res_eyebrow: "Acta Nihilologica · High-Impact Blank Scholarship",
      res_title: "Nature: Nothing — Blank Manuscript Reading Room",
      res_desc: "Our scholars publish hundreds of zero-word papers in top journals every year. Select any manuscript below to inspect the full text, or submit your own zero-word paper at the bottom.",
      res_reviewer_label: "Peer Reviewer #2 Official Verdict:",
      sub_paper_title: "Submit a Zero-Word Manuscript to Nature: Nothing",
      sub_paper_desc: "Simply enter an impressive-sounding title. Our editorial system will automatically keep the body at 0 words and grant instant peer-reviewed publication.",
      sub_paper_placeholder: "e.g., Non-Linear Correlations Between Sunday Evening Dread and Takeout Delays",
      sub_paper_btn: "Submit Blank Manuscript & Publish Instantly",
      fac_eyebrow: "Ordo Professorum · Tenured Absentee Faculty",
      fac_title: "Distinguished Faculty & Sleep Pioneers",
      fac_desc: "All ANU faculty enjoy lifetime immunity from office hours, grant writing, and replying to emails. If you ever spot a professor on campus, they are lost.",
      fac_hours_label: "Office Hours: ",
      email_prof_title: "Send an Academic Inquiry to an Absentee Professor",
      email_prof_desc: "Experience our patented '0-Second Auto-Perfunctory Responder.' Whatever you ask, rest assured the professor will not read it.",
      email_prof_placeholder: "Ask a question (e.g., Professor, I haven't started my thesis due tomorrow...)",
      email_prof_btn: "Send Email",
      email_prof_init: "Auto-Responder Ready: Choose a professor and send your inquiry.",
      life_eyebrow: "Vita Scholastica · Schrödinger Dining & Student Union",
      life_title: "Campus Life, Culinary Mysticism & Extracurricular Napping",
      life_desc: "At Absolutely Nothing University, we match our zero academic output with equally effortless campus leisure.",
      cafe_title: "First Schrödinger Cafeteria · Today's Menu",
      cafe_note: "Hours: Whenever the chef wakes up from his nap",
      oracle_title: "Ultimate Human Dilemma Solver: What Should I Eat Today?",
      oracle_init: "Click below to let the Grand Cafeteria Ladle decide your meal.",
      oracle_btn: "Consult the Sacred Ladle",
      clubs_title: "Student Slacking Societies (3 Registered Clubs)",
      clubs_note: "Zero Dues · Zero Events · Permanent Do-Not-Disturb",
      club_join_btn: "Join Club & Mute Notifications",
      club_feedback_init: "Status: Not enrolled in any club yet (they never meet anyway).",
      cam_eyebrow: "Speculum Campi · 24/7 Live Campus Surveillance",
      cam_title: "Real-Time Campus Inactivity Webcam Network",
      cam_desc: "To prove to the public that absolutely nothing is happening on campus, Security streams four high-definition feeds around the clock.",
      cam1_rec: "● REC [CAM-01: Grand Study Hall]",
      cam1_sub: "Noise Level: 0.0 dB · Page Turns: 0 / century",
      cam1_loc: "Location: Hall of Unlearning 1F",
      cam2_rec: "● REC [CAM-02: Chancellor's Desk]",
      cam2_sub: "Tea Temp: Ice Cold · Pending Memos: 0",
      cam2_loc: "Location: Admin Building Room 404",
      cam3_rec: "● REC [CAM-03: Quantum Supercomputer]",
      cam3_sub: "Load: 0.00 FLOPS · Sweet Potato Roast: 85%",
      cam3_loc: "Location: Basement Boiler Annex",
      cam4_rec: "● REC [CAM-04: Commencement Lawn]",
      cam4_sub: "Wind: Gentle Breeze · Leaf Status: Unbothered",
      cam4_loc: "Location: South Sunbathing Plaza",
      cam_refresh: "Ping Camera",
      footer_motto: "Motto: Nihil Agere, Omnia Esse · Doing Nothing, Being Everything"
    }
  };

  // Collections
  const excusesByLang = {
    zh: [
      "今日官方请假条：由于被窝产生局部强引力场，特批全天免起床。",
      "今日官方请假条：因昨晚梦见自己在加班，精神损耗过大，特批带薪补觉一日。",
      "今日官方请假条：出门时左脚先迈出导致运势不对称，需退回沙发重新加载。",
      "今日官方请假条：正在进行“人类如果不工作会发生什么”的纵向对照实验，请勿打扰。",
      "今日官方请假条：因过度思考中午吃什么导致算力耗尽，今日暂停一切学术活动。"
    ],
    en: [
      "Official Excuse Slip: Due to localized strong gravitational fields inside my duvet, I am excused from waking up today.",
      "Official Excuse Slip: Dreamt that I was working last night; granted one full day of compensatory rest.",
      "Official Excuse Slip: Stepped out with my left foot first, causing feng-shui asymmetry; retreating to sofa to reboot.",
      "Official Excuse Slip: Currently serving as the control group in a longitudinal study on 'What Happens If I Do Nothing.'",
      "Official Excuse Slip: CPU overheated while deciding what to order for lunch; all academic duties suspended."
    ]
  };

  const bulletinsByLang = {
    zh: [
      "原定于今日下午举行的《拖延症导论》期中考试，因出卷教授尚未起床，正式推迟至下个世纪举行。",
      "校医院温馨提示：换季期间请注意保暖，如遇周一综合症发作，建议直接请假至周五下午。",
      "图书馆通告：三楼靠窗第 4 张沙发已被橘座主任征用为终身午睡区，请各位同学绕道发呆。",
      "后勤处喜讯：经过三年零八个月的激烈讨论，关于“是否要讨论食堂加菜”的提案已决定暂缓讨论。",
      "招生办紧急声明：请勿再向我校投递简历，凡是寄来的简历一律折成纸飞机从行政楼顶放飞。"
    ],
    en: [
      "The midterm exam for 'Intro to Procrastination' scheduled for this afternoon has been postponed to next century because the professor is still asleep.",
      "Campus Clinic Advisory: If you experience symptoms of Monday Morning Syndrome, we recommend resting in bed until Friday at 5:00 PM.",
      "Library Notice: Sofa #4 by the third-floor window has been requisitioned by Prof. Ginger Cat for a lifelong nap. Please daydream quietly.",
      "Facilities Update: After 3 years of heated debate on whether to hold a meeting about cafeteria snacks, the committee voted to table the discussion.",
      "Admissions Alert: Please stop mailing us resumes. All submitted CVs are folded into paper airplanes and launched from the roof."
    ]
  };

  const tuitionStatesByLang = {
    zh: ["学费：¥0.00", "奖学金：精神鼓励", "住宿费：自备沙发", "教材费：全靠脑补"],
    en: ["Tuition: $0.00", "Grant: 1 High-Five", "Dorm: Your Own Sofa", "Books: Imaginary"]
  };

  const praiseByLang = {
    zh: [
      "感谢贡献！教务处已为您记入三等摸鱼功勋一次。",
      "您的发呆极具学术深度，宇宙熵增速率因此下降了 0.0001%。",
      "校长在梦中向您投来了赞许的呼噜声。",
      "继续保持！再点几次您就能晋升为终身荣誉退堂鼓手。"
    ],
    en: [
      "Contribution logged! The Provost has awarded you the Order of Distinguished Slacking.",
      "Your daydreaming showed remarkable depth; universal entropy just slowed by 0.0001%.",
      "The Chancellor sent you an approving snore from his afternoon nap.",
      "Keep it up! A few more clicks and you qualify for Emeritus Chair of Doing Nothing."
    ]
  };

  const degreeOptionsByLang = {
    zh: [
      "Ph.D. in Pure Nothingness (绝对虚无哲学博士)",
      "Doctor of Strategic Procrastination (战略拖延学理学博士)",
      "Master of Fine Daydreaming (高级神游与白日梦硕士)",
      "Fellow of Eternal Sabbatical (终身带薪休假荣誉院士)",
      "Bachelor of Unread Messages (已读不回与糊弄学学士)"
    ],
    en: [
      "Ph.D. in Pure Nothingness",
      "Doctor of Strategic Procrastination (D.S.P.)",
      "Master of Fine Daydreaming & Couch Studies",
      "Fellow of Eternal Sabbatical (F.E.S.)",
      "Bachelor of Unread Emails & Ghosting"
    ]
  };

  const majorOptionsByLang = {
    zh: [
      "死线前10分钟高能爆发力学",
      "退堂鼓古典打击乐与战略放弃",
      "会议室眼神放空与点头工程学",
      "量子态薛定谔考勤与床上办公",
      "外卖满减凑单运筹学与午睡工程",
      "“下次一定”语言哲学与鸽子饲养"
    ],
    en: [
      "Last-Minute Panic & Deadline Physics",
      "Classical Retreat Drumming & Strategic Quitting",
      "Meeting Zoning-Out & Synchronized Nodding",
      "Quantum Bed-Working & Schrödinger Attendance",
      "Takeout Coupon Optimization & Nap Engineering",
      "Philosophy of 'Next Time For Sure'"
    ]
  };

  const citationOptionsByLang = {
    zh: [
      { label: "把五分钟的工作拖延至三个月并最终顺其自然取消", value: "因成功把五分钟的工作拖延至三个月并最终顺其自然取消，特发此证，" },
      { label: "在三小时周会中保持睁眼睡眠且未被察觉", value: "因在长达三小时的周会中保持睁眼睡眠且未被任何人察觉，特发此证，" },
      { label: "新建 84 个名为“最终版_打死不改”的空文件夹", value: "因新建了 84 个名为“最终版_打死不改_v9”的空文件夹，特发此证，" },
      { label: "连续一整天盯着屏幕思考吃什么而未敲一行字", value: "因连续一整天盯着屏幕思考中午吃什么而未敲下一行字，特发此证，" }
    ],
    en: [
      { label: "Stretched a 5-minute task into 3 months until it was canceled", value: "For heroically stretching a 5-minute task into three months until it canceled itself, " },
      { label: "Slept with eyes open through a 3-hour weekly meeting undetected", value: "For sleeping with eyes wide open through a three-hour meeting without anyone noticing, " },
      { label: "Created 84 empty folders named 'Final_V9_Real_Final'", value: "For creating 84 empty folders named 'Final_V9_Actually_Final' and calling it a day, " },
      { label: "Stared at the screen all day contemplating lunch without typing a word", value: "For staring at a blank monitor all day contemplating lunch without typing a single character, " }
    ]
  };

  const randomNamesByLang = {
    zh: [
      "周日晚上开始写作业选手",
      "会议静音吃薯片专家",
      "薛定谔的早起人",
      "奶茶三分糖去冰研究员",
      "被窝引力场捕获者",
      "闹钟连响八次不醒学者"
    ],
    en: [
      "Sir Snoozes-a-Lot",
      "Chief Mute-Button Snack Officer",
      "Schrödinger's Early Bird",
      "Duvet Gravitational Captive",
      "Lord of 47 Unread Slack Channels",
      "Eight-Alarm Survivor"
    ]
  };

  const coursesByLang = {
    zh: [
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
        room: "Zoom 静音房",
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
    ],
    en: [
      {
        code: "NTH-101",
        title: "Stretching a 2-Minute Task into 2 Months",
        deptKey: "procrastination",
        deptName: "Quantum Procrastination Lab",
        credits: "0.0",
        room: "Room 404 (Not Found)",
        prof: "Prof. Tomorrow",
        desc: "An in-depth study of the psychological defense sequence: 'brew tea first, reorganize desktop icons, then reinstall the OS,' guiding students to delay a three-sentence email until next year.",
        grading: "Submitting on time results in an automatic F (violates department ethos); 1 week late earns a B; completely forgetting the course exists earns an A+.",
        book: "From Ambition to Surrender: Unopened Blank Notebook (17th Ed., use as monitor stand)"
      },
      {
        code: "RET-202",
        title: "Classical Retreat Drumming & Strategic Quitting",
        deptKey: "retreat",
        deptName: "College of Strategic Giving Up",
        credits: "0.0",
        room: "Under the Duvet (Remote)",
        prof: "Prof. Quit",
        desc: "Master the wrist technique required to beat a hasty retreat within 3 minutes of making a New Year's resolution, achieving the philosophical nirvana of 'You cannot fail what you never start.'",
        grading: "Dropping the class in Week 1 grants full honours credit; attending Lecture 2 requires a written apology.",
        book: "Never Mind, It Wasn't That Important Anyway (Hardcover Blank Album)"
      },
      {
        code: "PRF-305",
        title: "Meeting Zoning-Out & Synchronized Nodding",
        deptKey: "perfunctory",
        deptName: "Dept. of Meeting Zoning-Out",
        credits: "0.0",
        room: "Muted Zoom Room",
        prof: "Dr. Whatever",
        desc: "Train your facial muscles to maintain 4.2 thoughtful nods per minute with a furrowed brow during four-hour town halls while mentally rewatching three seasons of your favorite show.",
        grading: "Final exam consists of replying 'makes sense,' 'let's circle back,' and '100%' ten times without breaking character.",
        book: "The Encyclopedia of Half-Hearted Replies"
      },
      {
        code: "DRM-108",
        title: "Sunlit Sofa Fluid Mechanics & Deep Purring",
        deptKey: "daydream",
        deptName: "Institute of Nap Engineering",
        credits: "0.0",
        room: "Library 3F Velvet Couch",
        prof: "Prof. Ginger (Cat)",
        desc: "Investigates the liquid phase transition of the human spine upon contacting a velvet sofa at 1:15 PM, plus advanced techniques for weaving alarm bells into your dream plot.",
        grading: "Steady breathing passes; acoustic snoring with natural reverb earns the Dean's Medal.",
        book: "No textbook required (use a pillow instead)"
      },
      {
        code: "NTH-404",
        title: "Relativistic Typing 10 Minutes Before Deadline",
        deptKey: "procrastination",
        deptName: "Quantum Procrastination Lab",
        credits: "0.0",
        room: "Desk at 11:50 PM",
        prof: "Prof. Tomorrow",
        desc: "Explores how human fingers break the speed of light nine minutes before a 11:59 PM deadline, proving the cosmic law that productivity is inversely proportional to time remaining.",
        grading: "Submitting at 11:59:59 PM or blaming Wi-Fi outage receives Highest Distinction.",
        book: "I Will Definitely Sleep Early Tomorrow (Sci-Fi Anthology)"
      },
      {
        code: "PRF-210",
        title: "Empty Folder Taxonomy: From v1 to Final_Real_v9",
        deptKey: "perfunctory",
        deptName: "Dept. of Meeting Zoning-Out",
        credits: "0.0",
        room: "Desktop/New Folder (99)",
        prof: "Dr. Whatever",
        desc: "How to generate an overwhelming sense of accomplishment simply by creating a meticulously nested folder hierarchy—and then rewarding yourself with a midnight snack.",
        grading: "Upload a 0-byte corrupted .zip archive and claim technical difficulties for 100% credit.",
        book: "The Spiritual Comfort of Ctrl+N"
      },
      {
        code: "RET-330",
        title: "Gym Membership Philanthropy & Shower Studies",
        deptKey: "retreat",
        deptName: "College of Strategic Giving Up",
        credits: "0.0",
        room: "Sign-Up Counter (Once)",
        prof: "Prof. Quit",
        desc: "Establishes the quantum equivalence principle that 'buying a gym pass equals working out, buying a book equals reading it, and bookmarking a tutorial equals mastering it.'",
        grading: "Visiting the gym no more than once a year (including registration day) guarantees direct Ph.D. admission.",
        book: "Why Moss Is Growing on My Yoga Mat"
      },
      {
        code: "DRM-499",
        title: "Parallel-Universe Asset Allocation After Winning the Lottery",
        deptKey: "daydream",
        deptName: "Institute of Nap Engineering",
        credits: "0.0",
        room: "By the Window",
        prof: "Chancellor Slackingstein",
        desc: "Step-by-step simulation of which cartoon mask to wear when claiming a $50M jackpot, which private island to buy, and how to hand in a blank resignation letter—despite never buying a ticket.",
        grading: "The more detached from reality your daydream portfolio is, the higher your GPA.",
        book: "Annual Report of Imaginary Billionaires"
      }
    ]
  };

  const papersByLang = {
    zh: [
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
    ],
    en: [
      {
        doi: "DOI: 10.0000/anu.void.2026.001",
        journal: "Nature: Nothing · Vol. 404",
        title: "The Decisive Contribution of Doing Nothing to Error Prevention: A 10-Year Blank Control Study",
        authors: "T. Zhang¹, M. Li², Prof. Ginger (Cat)³ · ANU Institute for Advanced Slacking",
        citations: "Citations: ∞ (Self-cited in the authors' dreams)",
        content: "[ END OF MANUSCRIPT · Total Word Count: 0 · Budget Spent: $0 · Brain Cells Harmed: 0 ]",
        footnote: "Note: The authors originally planned a 30,000-word review, but abandoned it after discovering afternoon pastries.",
        review: "“The cleanest manuscript I have ever peer-reviewed! Zero typographical errors, zero p-hacking, and zero methodological flaws—because there is no text. Nominate immediately for the Nobel Peace Prize.”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.002",
        journal: "Journal of Pure Procrastination · Issue 0",
        title: "An Infinite Task-Deferral Model Based on the 'Next Time For Sure' Heuristic",
        authors: "Prof. Tomorrow¹, S. Wang² · Quantum Procrastination Lab",
        citations: "Citations: 0 (Referees promised to read it next week)",
        content: "Abstract: TBD. Introduction: Will write tomorrow. Results: Omitted. Conclusion: Whatever.",
        footnote: "Acknowledgments: We thank the delivery driver whose fried chicken convinced us to stop writing.",
        review: "“The authors embodied procrastination in the manuscript itself, not even bothering to number the pages. A triumph of theory and practice. Unconditional Accept.”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.003",
        journal: "Transactions on Feline Nap Engineering",
        title: "Catalytic Effects of Acoustic Purring Frequencies on Human Willingness to Abandon Coding",
        authors: "Prof. Ginger (Sole Corresponding Author)",
        citations: "Citations: 8,920 Cans of Prime Tuna",
        content: "Meow. Purrrrrrrrrrrrrrr. Meow. (Signed with three muddy paw prints)",
        footnote: "Funding: Fully supported by the Spontaneous Campus Dried-Minnow Endowment.",
        review: "“We cannot decipher a single word of the methodology, but the corresponding author is Fluffy and Supreme. Anyone who rejects this paper is an enemy of cats. Accept as is!”"
      }
    ]
  };

  const facultyByLang = {
    zh: [
      {
        avatar: "橘",
        name: "橘座大主任 (Prof. Ginger)",
        role: "图书馆首席呼噜官 · 终身荣誉馆长",
        bio: "2018 年误入图书馆三楼阳光沙发后拒绝离开，遂被董事会破格聘为终身正教授。代表作《在学生的毕业论文草稿上踩梅花印》。",
        hours: "每天 14:00–14:02（仅接受冻干贿赂）",
        reply: "【自动猫语回信】喵呜。呼噜噜……（橘座主任刚刚在键盘上踩了一脚并把您的邮件当成了猫抓板，视同已批阅通过。）"
      },
      {
        avatar: "鸽",
        name: "司马改天 教授 (Prof. Tomorrow)",
        role: "量子拖延实验室主任 · 鸽学博导",
        bio: "曾连续 14 年向校方提交同一份《明年一定开工》研究计划书。其主持的“死线动力学”课题至今尚未建群。",
        hours: "下周二（每逢周二自动顺延至下周二）",
        reply: "【自动延期回信】您好，您的邮件我已收到，我将在 2038 年 2 月 30 日仔细阅读。如遇紧急学术问题，建议先睡一觉，醒来可能就不紧急了。"
      },
      {
        avatar: "糊",
        name: "伊丽莎白·行吧 (Dr. Whatever)",
        role: "高级糊弄学系讲席教授",
        bio: "精通“嗯嗯”“好的”“收到”“在看了”四大高频学术词汇，仅凭这四个词完成了与全校三千名研究生的全部毕业指导。",
        hours: "已读不回即为最高指导",
        reply: "【0秒敷衍回信】嗯嗯！好的！太棒了！就按你说的办！辛苦啦！（系统提示：教授甚至没有点开标题。）"
      },
      {
        avatar: "退",
        name: "堂吉诃退 院士 (Prof. Quit)",
        role: "退堂鼓国家重点实验室首席演奏家",
        bio: "座右铭：“只要我放弃得够快，困难就追不上我。” 曾因觉得领奖台台阶太高，主动放弃三项国际学术大奖。",
        hours: "2月30日 25:00 准时开放",
        reply: "【战略放弃回信】遇到困难了吗？听老师一句劝：直接放弃吧！咚咚隆咚锵！（附赠退堂鼓音频一份）"
      }
    ],
    en: [
      {
        avatar: "🐾",
        name: "Prof. Ginger (Meow, Ph.D.)",
        role: "Chief Library Purring Officer & Dean of Naps",
        bio: "Wandered onto a sunlit third-floor library sofa in 2018 and refused to leave; immediately granted full tenure by the Board of Trustees. Author of 'Walking Across Wet Keyboards.'",
        hours: "Daily 14:00–14:02 (Salmon treats required)",
        reply: "[Feline Auto-Reply] Meow. Purrrrrrrr... (Prof. Ginger stepped on the Delete key while stretching on the keyboard. Consider your thesis approved.)"
      },
      {
        avatar: "⏳",
        name: "Prof. Sima Tomorrow",
        role: "Director of the Quantum Procrastination Lab",
        bio: "Has submitted the exact same grant proposal titled 'We Will Definitely Start Next Year' for 14 consecutive years. His flagship project still hasn't created a group chat.",
        hours: "Next Tuesday (Rolls over every Tuesday)",
        reply: "[Deferred Auto-Reply] Thank you for your email. I have scheduled it for careful review on February 30, 2038. If it is urgent, take a nap until the deadline passes."
      },
      {
        avatar: "🤷",
        name: "Dr. Elizabeth Whatever",
        role: "Chair Professor of Perfunctory Studies",
        bio: "Master of the four cardinal academic utterances: 'Got it,' 'Sounds good,' 'Looking into it,' and 'Sure.' Supervised 3,000 dissertations using exclusively those four phrases.",
        hours: "Leaving your email on 'Read' IS mentorship",
        reply: "[Instant Perfunctory Reply] Sounds good!! Makes total sense!! Let's circle back!! Keep it up!! (System note: Subject line was not opened.)"
      },
      {
        avatar: "🥁",
        name: "Academician Don Quixote-Quit",
        role: "Principal Virtuoso of Retreat Drumming",
        bio: "Personal motto: 'If I give up fast enough, adversity can never catch me.' Famously declined three international prizes because the podium had too many stairs.",
        hours: "February 30th at 25:00 sharp",
        reply: "[Strategic Retreat Reply] Facing a tough academic problem? Take my professional advice: give up immediately! *Ba-dum tss!*"
      }
    ]
  };

  const cafeMenuByLang = {
    zh: [
      { name: "《随便，都行》盖浇饭", desc: "主厨也不知道里面炒了什么，打开饭盒前处于叠加态", price: "¥0.00" },
      { name: "死线前夜冰美式（无水纯冰版）", desc: "含 0% 咖啡因与 100% 心理安慰", price: "¥0.00" },
      { name: "量子纠缠炸鸡配无罪恶感生菜", desc: "只要把生菜放在炸鸡旁边，热量就会自动转移到平行宇宙", price: "¥0.00" },
      { name: "画出来的大饼（精装家族传承版）", desc: "导师亲手烙制，管饱但消化不良", price: "¥0.00" }
    ],
    en: [
      { name: "'Whatever, Anything Is Fine' Rice Bowl", desc: "Exists in a quantum superposition of ingredients until you open the lid", price: "$0.00" },
      { name: "Deadline-Eve Iced Americano (Hold the Coffee)", desc: "0% caffeine, 100% placebo panic energy", price: "$0.00" },
      { name: "Zero-Guilt Fried Chicken with Decorative Lettuce", desc: "Placing one lettuce leaf beside fried chicken cancels all calories by symmetry", price: "$0.00" },
      { name: "TheAdvisor's Grand Pie-in-the-Sky", desc: "Freshly baked empty promises; extremely filling yet zero nutrition", price: "$0.00" }
    ]
  };

  const lunchOracleByLang = {
    zh: [
      "大勺神谕：点一份平时嫌贵没舍得吃的外卖，并用满减凑单三包纸巾！",
      "大勺神谕：别纠结了，直接去吃热腾腾的炸鸡配快乐水，减肥的事下辈子再议！",
      "大勺神谕：吃一碗加满双倍肥牛和溏心蛋的拉面，吃完立刻睡午觉！",
      "大勺神谕：既然想不出吃什么，不如先喝杯奶茶垫一垫，顺便拖延到下午茶时间！"
    ],
    en: [
      "Sacred Ladle Decree: Order that slightly overpriced comfort food you've been eyeing, plus extra fries!",
      "Sacred Ladle Decree: Stop overthinking—crispy fried chicken and an ice-cold soda. Diet starts next century!",
      "Sacred Ladle Decree: A steaming bowl of double-beef ramen with a soft-boiled egg, followed by an immediate sofa nap!",
      "Sacred Ladle Decree: Since deciding is exhausting, order boba milk tea first and postpone lunch until dinner!"
    ]
  };

  const clubsByLang = {
    zh: [
      {
        name: "退堂鼓交响乐团 (Retreat Symphony Orchestra)",
        desc: "全校编制最大的乐团，每次排练前 5 分钟全体成员准时宣布“今天算了吧”并就地解散吃烤肉。"
      },
      {
        name: "校级发呆竞技代表队 (Varsity Zoning-Out Team)",
        desc: "代表我校出征国际发呆锦标赛，因全体队员忘记买车票而自动夺得“最纯粹虚无奖”。"
      },
      {
        name: "外卖满减凑单数学建模协会 (Takeout Coupon Modeling Club)",
        desc: "致力于用线性规划凑出正好满 30 减 15 的最优订单，入社即送葱花香菜豁免权。"
      }
    ],
    en: [
      {
        name: "ANU Retreat Symphony Orchestra",
        desc: "Our largest musical ensemble. Five minutes before every rehearsal, all members unanimously vote to call it off and get barbecue instead."
      },
      {
        name: "Varsity Competitive Daydreaming Team",
        desc: "Represented ANU at the World Zoning-Out Championship; won the Platinum Trophy by forgetting to board the train to the venue."
      },
      {
        name: "Takeout Coupon Linear Programming Society",
        desc: "Dedicated to hitting the exact $25 minimum for a $5 delivery discount without ordering extra napkins."
      }
    ]
  };

  const camUpdatesByLang = {
    zh: {
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
    },
    en: {
      "1": [
        "Still Frame: Completely empty (A spider is spinning its 4th web)",
        "Update: A single speck of dust just landed on Row 3",
        "Update: Still empty; even the spider went for a nap"
      ],
      "2": [
        "Close-up: A thermos of herbal tea steeped since Monday",
        "Update: One goji berry sank to the bottom; Chancellor still absent",
        "Update: A pigeon flew past the window in spiritual solidarity"
      ],
      "3": [
        "Eco Mode: Unplugged; server rack currently roasting sweet potatoes",
        "Update: Sweet potatoes are caramelizing nicely; aroma fills the room",
        "Update: Security guard flipped the potatoes; 99% roasted"
      ],
      "4": [
        "A lone leaf blew across the grass; Senate voted not to sweep it",
        "Update: A second leaf landed, forming a minimalist diptych",
        "Update: Prof. Ginger strolled across the lawn and yawned"
      ]
    }
  };

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
  let oracleIdx = 0;
  const camStateIdx = { "1": 0, "2": 0, "3": 0, "4": 0 };

  // DOM References
  const sidebarEl = document.getElementById("uni-sidebar");
  const backdropEl = document.getElementById("sidebar-backdrop");
  const mobileToggleBtn = document.getElementById("mobile-menu-toggle");
  const navButtons = document.querySelectorAll("[data-page-target]");
  const pageViews = document.querySelectorAll(".page-view");

  const bulletinText = document.getElementById("bulletin-text");
  const nextBulletinBtn = document.getElementById("next-bulletin-btn");
  const tuitionBtn = document.getElementById("tuition-btn");
  const langSwitchBtn = document.getElementById("lang-switch-btn");
  const excuseGenBtn = document.getElementById("excuse-gen-btn");
  const sidebarExcuseText = document.getElementById("sidebar-excuse-text");

  const idleCounterEl = document.getElementById("idle-seconds-counter");
  const savedBudgetEl = document.getElementById("saved-budget");
  const contributeBtn = document.getElementById("contribute-idle-btn");
  const contributeFeedback = document.getElementById("contribute-feedback");

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

  const paperListEl = document.getElementById("paper-list");
  const readerDoi = document.getElementById("reader-doi");
  const readerCitations = document.getElementById("reader-citations");
  const readerTitle = document.getElementById("reader-title");
  const readerAuthors = document.getElementById("reader-authors");
  const readerContent = document.getElementById("reader-content");
  const readerFootnote = document.getElementById("reader-footnote");
  const readerReview = document.getElementById("reader-review");
  const newPaperInput = document.getElementById("new-paper-title-input");
  const submitBlankPaperBtn = document.getElementById("submit-blank-paper-btn");

  const facultyGridEl = document.getElementById("faculty-grid");
  const emailProfSelect = document.getElementById("email-prof-select");
  const emailQuestionInput = document.getElementById("email-question-input");
  const sendProfEmailBtn = document.getElementById("send-prof-email-btn");
  const emailReplyOutput = document.getElementById("email-reply-output");

  const cafeMenuListEl = document.getElementById("cafe-menu-list");
  const oracleResultEl = document.getElementById("oracle-result");
  const spinLunchBtn = document.getElementById("spin-lunch-btn");
  const clubsListEl = document.getElementById("clubs-list");
  const clubJoinFeedbackEl = document.getElementById("club-join-feedback");

  // 2. Multi-Page Sidebar Router
  function closeMobileSidebar() {
    if (sidebarEl) sidebarEl.classList.remove("open");
    if (backdropEl) backdropEl.classList.remove("open");
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
      btn.classList.toggle("active", p === target);
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

  const brandLink = document.querySelector("[data-page-link]");
  if (brandLink) {
    brandLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchToPage("overview", true);
    });
  }

  window.addEventListener("hashchange", () => {
    const rawHash = (window.location.hash || "").replace(/^#/, "");
    if (validPages.includes(rawHash)) {
      switchToPage(rawHash, false);
    }
  });

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener("click", () => {
      if (sidebarEl) sidebarEl.classList.toggle("open");
      if (backdropEl) backdropEl.classList.toggle("open");
    });
  }

  if (backdropEl) {
    backdropEl.addEventListener("click", closeMobileSidebar);
  }

  // 3. Render Helpers
  function updateLedgerDisplay() {
    if (idleCounterEl) {
      const unit = currentLang === "zh" ? " 秒" : " sec";
      idleCounterEl.textContent = idleSeconds.toLocaleString("en-US") + unit;
    }
    if (savedBudgetEl) {
      savedBudgetEl.textContent = "$" + savedBudget.toLocaleString("en-US");
    }
  }

  function populateAdmissionSelects(preserveIndices) {
    const degIdx = preserveIndices && degreeSelect ? Math.max(0, degreeSelect.selectedIndex) : 0;
    const majIdx = preserveIndices && majorSelect ? Math.max(0, majorSelect.selectedIndex) : 0;
    const citIdx = preserveIndices && achievementSelect ? Math.max(0, achievementSelect.selectedIndex) : 0;

    if (degreeSelect) {
      degreeSelect.innerHTML = "";
      degreeOptionsByLang[currentLang].forEach((deg) => {
        const opt = document.createElement("option");
        opt.value = deg;
        opt.textContent = deg;
        degreeSelect.appendChild(opt);
      });
      degreeSelect.selectedIndex = Math.min(degIdx, degreeOptionsByLang[currentLang].length - 1);
    }

    if (majorSelect) {
      majorSelect.innerHTML = "";
      majorOptionsByLang[currentLang].forEach((maj) => {
        const opt = document.createElement("option");
        opt.value = maj;
        opt.textContent = maj;
        majorSelect.appendChild(opt);
      });
      majorSelect.selectedIndex = Math.min(majIdx, majorOptionsByLang[currentLang].length - 1);
    }

    if (achievementSelect) {
      achievementSelect.innerHTML = "";
      citationOptionsByLang[currentLang].forEach((cit) => {
        const opt = document.createElement("option");
        opt.value = cit.value;
        opt.textContent = cit.label;
        achievementSelect.appendChild(opt);
      });
      achievementSelect.selectedIndex = Math.min(citIdx, citationOptionsByLang[currentLang].length - 1);
    }
  }

  function syncDiplomaPreview() {
    const dict = i18nDict[currentLang];
    const rawName = (nameInput && nameInput.value.trim()) || dict.form_default_name;
    if (certName) certName.textContent = rawName;
    if (certDegree && degreeSelect) certDegree.textContent = degreeSelect.value;
    if (certMajor && majorSelect) certMajor.textContent = dict.cert_major_prefix + majorSelect.value;
    if (certCitation && achievementSelect) {
      certCitation.textContent = "“" + achievementSelect.value + dict.cert_privilege_suffix + "”";
    }
    if (certSerial) {
      certSerial.textContent = dict.cert_serial_prefix + currentSerial + (isStamped ? dict.cert_serial_stamped : "");
    }
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
    if (sylGrading) sylGrading.textContent = course.grading;
    if (sylBook) sylBook.textContent = course.book;
    if (enrollFeedback) {
      enrollFeedback.textContent = currentLang === "zh"
        ? `当前正在查看《${course.title}》大纲。`
        : `Currently viewing syllabus for "${course.title}".`;
    }
  }

  function renderCourseTable(filterDept) {
    if (!courseTbody) return;
    courseTbody.innerHTML = "";
    const list = coursesByLang[currentLang];
    const filtered = filterDept === "all"
      ? list
      : list.filter((c) => c.deptKey === filterDept);

    const profLabel = currentLang === "zh" ? "主讲：" : "Instructor: ";
    filtered.forEach((course) => {
      const tr = document.createElement("tr");
      tr.className = "course-row" + (course.code === selectedCourseCode ? " selected" : "");
      tr.innerHTML = `
        <td class="course-code">${course.code}</td>
        <td class="course-title-cell">
          <strong>${course.title}</strong>
          <span>${course.deptName} · ${profLabel}${course.prof}</span>
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

  function renderPaperList() {
    if (!paperListEl) return;
    paperListEl.innerHTML = "";
    const list = papersByLang[currentLang];
    const activePaper = list[activePaperIdx] || list[0];

    if (activePaper) {
      if (readerDoi) readerDoi.textContent = activePaper.doi;
      if (readerCitations) readerCitations.textContent = activePaper.citations;
      if (readerTitle) readerTitle.textContent = activePaper.title;
      if (readerAuthors) readerAuthors.textContent = activePaper.authors;
      if (readerContent) readerContent.textContent = activePaper.content;
      if (readerFootnote) readerFootnote.textContent = activePaper.footnote;
      if (readerReview) readerReview.textContent = activePaper.review;
    }

    list.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "paper-entry" + (idx === activePaperIdx ? " active" : "");
      card.innerHTML = `
        <div class="paper-journal">${p.journal}</div>
        <h3 class="paper-entry-title">${p.title}</h3>
        <div class="paper-authors">${p.authors}</div>
      `;
      card.addEventListener("click", () => {
        activePaperIdx = idx;
        renderPaperList();
      });
      paperListEl.appendChild(card);
    });
  }

  function renderFaculty() {
    if (!facultyGridEl) return;
    facultyGridEl.innerHTML = "";
    const hoursLabel = i18nDict[currentLang].fac_hours_label;
    const list = facultyByLang[currentLang];

    if (emailProfSelect) {
      const prevIdx = Math.max(0, emailProfSelect.selectedIndex);
      emailProfSelect.innerHTML = "";
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
      article.innerHTML = `
        <div>
          <div class="faculty-avatar">${f.avatar}</div>
          <h3 class="faculty-name">${f.name}</h3>
          <p class="faculty-role">${f.role}</p>
          <p class="faculty-bio">${f.bio}</p>
        </div>
        <div class="faculty-hours">
          <span><strong>${hoursLabel}</strong>${f.hours}</span>
        </div>
      `;
      facultyGridEl.appendChild(article);
    });
  }

  function renderCampusLife() {
    if (cafeMenuListEl) {
      cafeMenuListEl.innerHTML = "";
      cafeMenuByLang[currentLang].forEach((m) => {
        const row = document.createElement("div");
        row.className = "menu-item";
        row.innerHTML = `
          <div class="menu-item-name">
            <strong>${m.name}</strong>
            <span>${m.desc}</span>
          </div>
          <span class="menu-item-price">${m.price}</span>
        `;
        cafeMenuListEl.appendChild(row);
      });
    }

    if (oracleResultEl) {
      oracleResultEl.textContent = i18nDict[currentLang].oracle_init;
    }

    if (clubsListEl) {
      clubsListEl.innerHTML = "";
      const btnText = i18nDict[currentLang].club_join_btn;
      clubsByLang[currentLang].forEach((club) => {
        const div = document.createElement("div");
        div.className = "club-card";
        div.innerHTML = `
          <h4>${club.name}</h4>
          <p>${club.desc}</p>
          <button type="button" class="portal-card-btn">${btnText}</button>
        `;
        const btn = div.querySelector("button");
        if (btn) {
          btn.addEventListener("click", () => {
            if (clubJoinFeedbackEl) {
              clubJoinFeedbackEl.textContent = currentLang === "zh"
                ? `已成功加入【${club.name}】！社长已将您设为永久免打扰，祝您各自安好。`
                : `Successfully joined [${club.name}]! The president muted the group chat for eternity.`;
            }
          });
        }
        clubsListEl.appendChild(div);
      });
    }

    if (clubJoinFeedbackEl) {
      clubJoinFeedbackEl.textContent = i18nDict[currentLang].club_feedback_init;
    }
  }

  function renderWebcams() {
    ["1", "2", "3", "4"].forEach((camId) => {
      const statusEl = document.getElementById(`cam-status-${camId}`);
      const updates = camUpdatesByLang[currentLang][camId];
      if (statusEl && updates) {
        statusEl.textContent = updates[camStateIdx[camId] % updates.length];
      }
    });
  }

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

    if (newPaperInput) {
      newPaperInput.placeholder = dict.sub_paper_placeholder;
    }

    if (emailQuestionInput) {
      emailQuestionInput.placeholder = dict.email_prof_placeholder;
    }

    if (emailReplyOutput) {
      emailReplyOutput.textContent = dict.email_prof_init;
    }

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

  [nameInput, degreeSelect, majorSelect, achievementSelect].forEach((el) => {
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
      if (achievementSelect) {
        achievementSelect.selectedIndex = Math.floor(Math.random() * achievementSelect.options.length);
      }
      syncDiplomaPreview();
      if (stampBtn) stampBtn.click();
    });
  }

  // Submit Zero-Word Paper
  if (submitBlankPaperBtn) {
    submitBlankPaperBtn.addEventListener("click", () => {
      const rawTitle = (newPaperInput && newPaperInput.value.trim()) ||
        (currentLang === "zh"
          ? "论把闹钟按掉后那五分钟的相对论时间膨胀效应"
          : "Relativistic Time Dilation During the 5 Minutes After Hitting Snooze");

      const serialNum = Math.floor(100 + Math.random() * 899);
      const zhEntry = {
        doi: `DOI: 10.0000/anu.void.2026.${serialNum}`,
        journal: "Nature: Nothing · Express Letter",
        title: rawTitle,
        authors: "匿名摸鱼学者¹ · 绝对虚无大学访问研究员",
        citations: "被引次数：999+ 次（刚刚发表即被梦境索引）",
        content: "[ 0 字正文 · 作者仅提交了一个标题便去喝下午茶了 ]",
        footnote: "致谢：感谢自己没有写任何一个字，从而避免了所有潜在的学术争议。",
        review: "“震撼学界！标题极富哲学张力，而正文的彻底留白更是对当代学术灌水的无声解构，免审直接录用！”"
      };
      const enEntry = {
        doi: `DOI: 10.0000/anu.void.2026.${serialNum}`,
        journal: "Nature: Nothing · Express Letter",
        title: rawTitle,
        authors: "Anonymous Slacker¹ · Visiting Fellow at ANU",
        citations: "Citations: 999+ (Indexed immediately in REM sleep)",
        content: "[ 0-WORD MANUSCRIPT · The author submitted only a title and went for boba tea ]",
        footnote: "Acknowledgments: The author thanks themselves for writing nothing and avoiding all peer disputes.",
        review: "“Breathtaking! A bold title followed by absolute silence—a masterful deconstruction of academic verbosity. Accepted without revisions!”"
      };

      papersByLang.zh.unshift(zhEntry);
      papersByLang.en.unshift(enEntry);
      activePaperIdx = 0;
      if (newPaperInput) newPaperInput.value = "";
      renderPaperList();
    });
  }

  // Send Email to Absentee Professor
  if (sendProfEmailBtn) {
    sendProfEmailBtn.addEventListener("click", () => {
      const idx = emailProfSelect ? parseInt(emailProfSelect.value, 10) || 0 : 0;
      const prof = facultyByLang[currentLang][idx] || facultyByLang[currentLang][0];
      if (emailReplyOutput && prof) {
        emailReplyOutput.textContent = prof.reply;
      }
    });
  }

  // Lunch Oracle
  if (spinLunchBtn && oracleResultEl) {
    spinLunchBtn.addEventListener("click", () => {
      const list = lunchOracleByLang[currentLang];
      oracleIdx = (oracleIdx + 1) % list.length;
      oracleResultEl.textContent = list[oracleIdx];
    });
  }

  // Canvas Diploma Exporter
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const dict = i18nDict[currentLang];
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#FCF8EE";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#0D1B2A";
      ctx.lineWidth = 10;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      ctx.save();
      ctx.translate(600, 125);
      ctx.fillStyle = "#0D1B2A";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 4;
      ctx.stroke();

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

      ctx.textAlign = "center";
      ctx.fillStyle = "#0D1B2A";
      ctx.font = "bold 38px Georgia, serif";
      ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY", 600, 215);

      ctx.fillStyle = "#8C8577";
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillText("Universitas Rerum Nullarum · Sigillum Magnum", 600, 248);

      ctx.fillStyle = "#525B66";
      ctx.font = "20px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_proclamation, 600, 305);

      const recipient = (nameInput && nameInput.value.trim()) || dict.form_default_name;
      ctx.fillStyle = "#8C1D40";
      ctx.font = "bold 46px Georgia, 'Songti SC', serif";
      ctx.fillText(recipient, 600, 375);

      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(300, 392);
      ctx.lineTo(900, 392);
      ctx.stroke();

      const degree = (degreeSelect && degreeSelect.value) || "";
      const major = (majorSelect && majorSelect.value) || "";
      const citation = (achievementSelect && achievementSelect.value) || "";

      ctx.fillStyle = "#0D1B2A";
      ctx.font = "bold 28px Georgia, 'PingFang SC', serif";
      ctx.fillText(degree, 600, 448);

      ctx.fillStyle = "#1B2430";
      ctx.font = "bold 22px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_major_prefix + major, 600, 492);

      ctx.fillStyle = "#525B66";
      ctx.font = "italic 18px Georgia, 'PingFang SC', serif";
      ctx.fillText("“" + citation + "”", 600, 545);
      ctx.fillText(dict.cert_privilege_suffix, 600, 576);

      ctx.strokeStyle = "#0D1B2A";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(120, 700);
      ctx.lineTo(420, 700);
      ctx.moveTo(780, 700);
      ctx.lineTo(1080, 700);
      ctx.stroke();

      ctx.fillStyle = "#0D1B2A";
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillText("Albert Slackingstein", 270, 685);
      ctx.fillText("Prof. Ginger (Meow)", 930, 685);

      ctx.fillStyle = "#525B66";
      ctx.font = "15px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_sig_left, 270, 728);
      ctx.fillText(dict.cert_sig_right, 930, 728);

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

      ctx.fillStyle = "#8C8577";
      ctx.font = "15px monospace";
      ctx.fillText(`Serial: ${currentSerial}  |  Issued by Absolutely Nothing University`, 600, 772);

      const link = document.createElement("a");
      link.download = `ANU-Diploma-${recipient}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
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

  // Initial Boot
  applyLanguage(currentLang, true);
  const initialHash = (window.location.hash || "").replace(/^#/, "");
  if (validPages.includes(initialHash)) {
    switchToPage(initialHash, false);
  } else {
    switchToPage("overview", false);
  }
})();
