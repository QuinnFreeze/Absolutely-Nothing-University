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
      form_btn_stamp: "加盖校长蓝晶大印",
      form_btn_download: "导出高清 PNG 学位证",
      cert_proclamation: "经绝对虚无大学评议会全票弃权通过，兹郑重授予",
      cert_major_prefix: "专业方向：",
      cert_privilege_suffix: "并享有在全球任何沙发上理直气壮躺平之特权。",
      cert_sig_left: "第 404 任校长（代签：他睡着了）",
      cert_sig_right: "教务长兼图书馆首席呼噜官",
      cert_serial_prefix: "证书档案号：",
      cert_serial_stamped: "（已加盖官方蓝印）",
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
      res_title: "《Nature: Nothing》高被引空白论文阅览室与在线投稿工坊",
      res_desc: "我校学者每年在国际顶刊发表数百篇零字数论文。点击左侧代表作可在线调阅手稿与盲审意见，也可在下方投稿工坊定制或随机抽选全新课题并一键导出录用通知书。",
      res_reviewer_label: "同行评审专家委员会意见 (Peer Review Verdict)：",
      reader_oa_note: "Open Access · 100% 零字数防查重保障",
      reader_btn_export: "导出论文录用证明 PNG",
      sub_paper_title: "向顶刊在线投递您的零字数手稿 (Manuscript Submission Studio)",
      sub_paper_desc: "支持自定义或随机抽选奇葩课题、选择目标顶刊与空白方法论流派。系统将根据您的选择生成独一无二的零字数正文、奇葩致谢词与盲审专家评语！",
      sub_lbl_title: "论文题目（留空则每次随机抽取全新奇葩课题）",
      sub_lbl_author: "通讯作者署名 (Corresponding Author)",
      sub_lbl_journal: "选择目标顶刊 (Target Journal)",
      sub_lbl_style: "选择空白方法论流派 (Blank Methodology)",
      sub_paper_placeholder: "留空自动随机抽选课题，或输入您的奇思妙想标题...",
      sub_author_placeholder: "例如：张摸鱼 / 首席退堂鼓学者（留空默认匿名学者）",
      sub_paper_btn: "一键投递手稿并秒获审稿意见",
      sub_random_btn: "随机抽选一个奇葩课题并生成",
      footer_disclaimer: "【虚构娱乐与合规声明】本网站（Absolutely Nothing University · 绝对虚无大学）系纯幽默讽刺创意项目（Satire & Parody Website），并非真实高等教育机构，亦与澳大利亚国立大学（Australian National University）或任何现实院校毫无关联。本站不收取任何费用、不收集任何个人隐私数据，站内生成的“学位证书”与“论文录用证明”仅供娱乐纪念，不具备任何现实学术或法律效力。",
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
      form_btn_stamp: "Stamp Official Cobalt Blue Seal",
      form_btn_download: "Export High-Res PNG Diploma",
      cert_proclamation: "By unanimous abstention of the Senate of Absolutely Nothing University, we hereby confer upon",
      cert_major_prefix: "Majoring in: ",
      cert_privilege_suffix: "with all the rights and privileges to lie flat on any sofa worldwide.",
      cert_sig_left: "404th Chancellor (Signed by proxy while napping)",
      cert_sig_right: "Provost & Chief Library Purring Officer",
      cert_serial_prefix: "Archive Serial: ",
      cert_serial_stamped: " (Cobalt Seal Verified)",
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
      res_title: "Nature: Nothing — Blank Manuscript Archive & Submission Studio",
      res_desc: "Our scholars publish hundreds of zero-word papers in top journals every year. Select any manuscript on the left to inspect its full text, or use the Submission Studio below to customize and generate unique blank papers.",
      res_reviewer_label: "Peer Review Committee Verdict:",
      reader_oa_note: "Open Access · 100% Zero-Word Plagiarism-Free Guarantee",
      reader_btn_export: "Export Acceptance Letter PNG",
      sub_paper_title: "Submit Your Zero-Word Manuscript (Manuscript Submission Studio)",
      sub_paper_desc: "Enter a custom title or draw a random absurd topic, pick a target journal and blank methodology school, and receive a unique zero-word body, acknowledgments, and referee report!",
      sub_lbl_title: "Manuscript Title (Leave blank to draw a fresh random topic each time)",
      sub_lbl_author: "Corresponding Author Name",
      sub_lbl_journal: "Target Top-Tier Journal",
      sub_lbl_style: "Blank Methodology School",
      sub_paper_placeholder: "Leave blank for a random topic, or type your own title...",
      sub_author_placeholder: "e.g., Dr. Slacker (Leave blank for Anonymous Fellow)",
      sub_paper_btn: "Submit Manuscript & Get Instant Referee Report",
      sub_random_btn: "Draw Random Topic & Publish Instantly",
      footer_disclaimer: "[Satire & Parody Disclaimer] Absolutely Nothing University (freeze.edu.kg) is a fictional humor and satire creative project. It is NOT a real higher-education institution and has no affiliation with The Australian National University or any accredited university. Zero fees are charged, zero personal data is collected, and all generated diplomas or certificates are strictly for entertainment.", 
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
        desc: "训练学生在长达四小时的汇报中保持每分钟 4.2 次微幅点头、眉头微蹙若有所思，同时大脑完整重温八十集经典古装连续剧。",
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
        reviewerHeader: "同行评审专家意见 (Reviewer #1 · 诺贝尔睡眠奖得主)：",
        review: "“这是我审稿生涯中读过最清爽的一篇论文！没有任何语法错误，没有任何数据造假，因为根本没有数据。建议直接颁发诺贝尔和平奖与最佳睡眠奖。”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.002",
        journal: "Journal of Pure Procrastination · Issue 0",
        title: "基于“下次一定”算法的无限期任务推迟模型及其在周报中的应用",
        authors: "司马改天¹, 王算了² · 量子拖延与死线实验室",
        citations: "被引次数：0 次（审稿人说改天再看）",
        content: "摘要：待补充…… 引言：明天写…… 实验结果：略…… 结论：算了吧……",
        footnote: "致谢：感谢外卖小哥在截稿前送来的炸鸡，使作者彻底放弃了写作。",
        reviewerHeader: "同行评审专家意见 (Reviewer #2 · 资深鸽学博导)：",
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
        reviewerHeader: "同行评审专家意见 (Reviewer #3 · 猫奴编辑部全体)：",
        review: "“虽然看不懂正文，但通讯作者实在太可爱了，谁敢拒稿谁就是猫猫的敌人。Accept as is!”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.004",
        journal: "The Lancet: Bedrest · Vol. 12",
        title: "被窝局部强引力场对人类周一早晨起立动作的引力透镜阻尼效应",
        authors: "陈不起¹, 赖床博士² · 神游太虚与午睡工程学院",
        citations: "被引次数：104,857 次（均在被窝中用手机转发）",
        content: "[ 数据缺失：实验员在测试羽绒被热力学耦合时全员睡着，未能记录任何读数 ]",
        footnote: "伦理声明：本实验全程在 26°C 恒温空调房及加厚鹅绒被中进行，受试者极其舒适。",
        reviewerHeader: "同行评审专家意见 (Reviewer #1 · 临床赖床医学专家)：",
        review: "“实验设计极其人道！审稿人在复现实验第 2 分钟时也不慎睡着，醒来已是周三下午，有力证实了作者的核心论点！”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.005",
        journal: "IEEE Transactions on Ctrl+C · Issue 404",
        title: "新建 100 个“最终版_打死不改”空文件夹对缓解死线焦虑的安慰剂效应",
        authors: "伊丽莎白·行吧¹, 赵收到² · 高级糊弄与会议放空系",
        citations: "被引次数：65,535 次（复制粘贴自引）",
        content: "📁 新建文件夹 (1) / 📁 终版_v2 / 📁 真的是最后一版_v9 / [ 0 字节 · 空空如也 ]",
        footnote: "利益冲突声明：作者在创建完上述文件夹后就去吃烧烤了，不存在任何利益或工作产出。",
        reviewerHeader: "同行评审专家意见 (Reviewer #2 · 形式主义架构师)：",
        review: "“目录层级优美、命名极具情绪张力，虽然文件夹里一个字节都没有，但已经完整传达了当代学者的精神风貌！”"
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
        reviewerHeader: "Peer Review Verdict (Reviewer #1 · Nobel Laureate in Napping):",
        review: "“The cleanest manuscript I have ever peer-reviewed! Zero typographical errors, zero p-hacking, and zero methodological flaws—because there is no text. Nominate immediately for the Nobel Peace Prize.”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.002",
        journal: "Journal of Pure Procrastination · Issue 0",
        title: "An Infinite Task-Deferral Model Based on the 'Next Time For Sure' Heuristic",
        authors: "Prof. Tomorrow¹, S. Wang² · Quantum Procrastination Lab",
        citations: "Citations: 0 (Referees promised to read it next week)",
        content: "Abstract: TBD... Introduction: Will write tomorrow... Results: Omitted... Conclusion: Whatever...",
        footnote: "Acknowledgments: We thank the delivery driver whose fried chicken convinced us to stop writing.",
        reviewerHeader: "Peer Review Verdict (Reviewer #2 · Senior Chair of Procrastination):",
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
        reviewerHeader: "Peer Review Verdict (Reviewer #3 · Feline Editorial Board):",
        review: "“We cannot decipher a single word of the methodology, but the corresponding author is Fluffy and Supreme. Anyone who rejects this paper is an enemy of cats. Accept as is!”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.004",
        journal: "The Lancet: Bedrest · Vol. 12",
        title: "Gravitational Lensing and Damping Effects of Warm Duvets on Monday Morning Upright Posture",
        authors: "B. Chen¹, Dr. Snooze² · Institute of Nap Engineering",
        citations: "Citations: 104,857 (Forwarded from under the covers)",
        content: "[ DATA MISSING: All researchers fell into deep REM sleep within 90 seconds of entering the duvet test chamber ]",
        footnote: "Ethics Statement: Conducted in a 24°C climate-controlled bedroom with goose-down pillows; zero discomfort occurred.",
        reviewerHeader: "Peer Review Verdict (Reviewer #1 · Clinical Somnology Chair):",
        review: "“Remarkably humane experimental design! While attempting to replicate the protocol, this reviewer also fell asleep and woke up on Wednesday afternoon. Hypothesis overwhelmingly confirmed!”"
      },
      {
        doi: "DOI: 10.0000/anu.void.2026.005",
        journal: "IEEE Transactions on Ctrl+C · Issue 404",
        title: "Placebo Efficacy of Creating 100 Empty Folders Named 'Final_v9_Real' on Pre-Deadline Panic",
        authors: "Dr. E. Whatever¹, R. Gotcha² · Dept. of Meeting Zoning-Out",
        citations: "Citations: 65,535 (Copy-pasted self-citations)",
        content: "📁 New Folder (1) / 📁 Final_v2 / 📁 Actually_Final_v9 / [ 0 Bytes · Completely Empty ]",
        footnote: "Conflict of Interest: The authors went out for barbecue immediately after creating the folders.",
        reviewerHeader: "Peer Review Verdict (Reviewer #2 · Chief Folder Architect):",
        review: "“Exquisite directory hierarchy and emotionally resonant naming conventions. Even with 0 bytes inside, it captures the zeitgeist of modern scholarship!”"
      }
    ]
  };

  // Multi-Dimensional Blank Paper Generator Pools (12 topics, 5 journals, 5 methodologies, 10 reviews)
  let randomTopicCursor = 0;

  const journalOptionsByLang = {
    zh: [
      "Nature: Nothing · 虚无自然主刊",
      "Science of Slacking · 摸鱼科学周刊",
      "The Lancet: Bedrest · 柳叶刀赖床分刊",
      "Physical Review Zzz · 呼噜物理评论",
      "IEEE Transactions on Ctrl+C · 复制粘贴工程汇刊"
    ],
    en: [
      "Nature: Nothing · Flagship Edition",
      "Science of Slacking · Weekly",
      "The Lancet: Bedrest · Clinical Sleep",
      "Physical Review Zzz · Letters",
      "IEEE Transactions on Ctrl+C"
    ]
  };

  const methodologyOptionsByLang = {
    zh: [
      {
        key: "pure_void",
        label: "纯零字留白流（0字正文 · 极致禅意）",
        content: "[ 全文完 · 本手稿采用绝对虚无主义留白法，正文精确保持 0.00 字，查重率 0.00% ]",
        footnote: "方法论说明：作者盯着空白文档发呆了四十五分钟后认为此时无声胜有声，遂直接点击投稿。"
      },
      {
        key: "ellipsis",
        label: "无限省略号拖延流（下次一定写完）",
        content: "1. 引言：略……  2. 文献综述：改天补……  3. 实验设计与数据：算了吧……  4. 结论：下次一定……",
        footnote: "致谢：感谢截稿死线本身的仁慈顺延，以及作者在放弃写作瞬间获得的巨大内心平静。"
      },
      {
        key: "coffee_stain",
        label: "下午茶咖啡渍手稿流（物理留痕）",
        content: "☕ [ 此处仅有一圈冰美式咖啡杯底水渍与两粒薯片碎屑，未发现任何文字字符 ] 🥐",
        footnote: "实验记录：手稿原本可能打算写点什么，但下午三点的牛角包配冰美式实在太香了。"
      },
      {
        key: "cat_paws",
        label: "橘猫踩键盘乱码流（神圣猫语加密）",
        content: "🐾 mmmmnnnnnnnnnjjjjkkkkk;;;;;;;  呼噜噜噜  🐾 [ 橘座主任认证肉垫印章 × 3 ]",
        footnote: "通讯作者声明：本段乱码系橘座大主任在午睡翻身时亲自踩出，蕴含深邃的宇宙热力学真理。"
      },
      {
        key: "budget_gone",
        label: "经费吃光了结题流（烧烤摊田野调查）",
        content: "[ 结题报告：本课题全部预算已用于课题组深夜烧烤与奶茶团建，因吃得太饱无法开展后续实验，特此结题 ]",
        footnote: "基金致谢：特别鸣谢学校后勤处报销了三串烤面筋与两杯杨枝甘露。"
      }
    ],
    en: [
      {
        key: "pure_void",
        label: "Pure Zero-Word Zen School (0 Words · Minimalist Void)",
        content: "[ END OF PAPER · Composed via Absolute Minimalist Blankness: 0.00 Words, 0.00% Similarity Index ]",
        footnote: "Methodology Note: After staring at the blinking cursor for 45 minutes, the author realized silence speaks louder than words."
      },
      {
        key: "ellipsis",
        label: "Infinite Ellipsis Deferral School (Will Finish Next Century)",
        content: "1. Intro: Omitted...  2. Literature Review: Next week...  3. Data & Results: Meh...  4. Conclusion: Whatever...",
        footnote: "Acknowledgments: We thank the deadline for passing peacefully while we ordered takeout."
      },
      {
        key: "coffee_stain",
        label: "Afternoon Pastry & Coffee Ring Artifact School",
        content: "☕ [ Only a circular iced-latte condensation ring and two potato chip crumbs appear on this page ] 🥐",
        footnote: "Lab Log: A hypothesis was briefly considered at 3:15 PM, then superseded by freshly baked croissants."
      },
      {
        key: "cat_paws",
        label: "Feline Keyboard-Walk Cipher School (Peer-Purred)",
        content: "🐾 mmmmnnnnnnnnnjjjjkkkkk;;;;;;;  purrrrrr  🐾 [ Authenticated by 3 Ginger Paw Prints ]",
        footnote: "Author Contribution: Typed entirely by Prof. Ginger rolling across the mechanical keyboard during a sunbeam nap."
      },
      {
        key: "budget_gone",
        label: "Grant Spent on Barbecue Fieldwork School",
        content: "[ FINAL REPORT: 100% of grant funding was allocated to late-night barbecue and boba tea; researchers too full to proceed ]",
        footnote: "Funding Note: Supported by the Campus Midnight Skewer & Milk Tea Fellowship."
      }
    ]
  };

  const randomPaperTopicsPool = [
    {
      zh: "论把闹钟按掉后那五分钟的相对论时间膨胀与多重宇宙坍缩效应",
      en: "Relativistic Time Dilation and Multiverse Collapse During the 5 Minutes After Hitting Snooze"
    },
    {
      zh: "周日下午四点半的宇宙级绝望感与外卖配送延误的非线性耦合模型",
      en: "Non-Linear Coupling Between Sunday 4:30 PM Existential Dread and Takeout Delivery Delays"
    },
    {
      zh: "当老板在群里发“收到请回复”时保持量子隐身态的流体力学边界条件",
      en: "Hydrodynamic Boundary Conditions for Remaining Quantum-Invisible When Tagged in Group Chats"
    },
    {
      zh: "“在做了（进度0%）”话术在跨部门周会中的热力学稳定性与抗催促极限",
      en: "Thermodynamic Stability of Saying 'Almost Done (0% Progress)' Across Cross-Functional Syncs"
    },
    {
      zh: "为什么一打开专业文献就会立刻产生困意：基于纸张催眠波长的实证研究",
      en: "Why Opening a PDF Textbook Induces Immediate Narcolepsy: A Wavelength Hypnosis Analysis"
    },
    {
      zh: "耳机戴上但没放音乐：构建个人工位结界对阻断同事闲聊的声学屏蔽效率",
      en: "Wearing Unplugged Headphones as an Acoustic Force-Field Against Office Small Talk"
    },
    {
      zh: "从“今晚一定早睡”到“怎么又凌晨三点了”的时空曲率跃迁机制研究",
      en: "Spacetime Curvature Warping Between 'I Will Sleep Early Tonight' and 'How Is It 3 AM Again'"
    },
    {
      zh: "将收藏夹命名为“深度学习必看”后永不点开的知识渗透压守恒定律",
      en: "Osmotic Knowledge Conservation in Bookmarking 500 Tutorials Without Ever Watching One"
    },
    {
      zh: "会议室最后一排靠门座位的光学隐身特性与提前溜走轨迹最优化",
      en: "Optical Cloaking Properties of the Back-Row Seat Closest to the Exit Door in Town Halls"
    },
    {
      zh: "论洗完澡后躺在床上刷手机时手机砸脸概率与仰角的函数关系",
      en: "Gravitational Trajectory Modeling of Dropping Your Phone on Your Face While Lying in Bed"
    },
    {
      zh: "外卖满 30 减 15 凑单过程中多买三包纸巾的博弈论纳什均衡解",
      en: "Nash Equilibrium of Adding Three Packs of Napkins to Hit the Delivery Discount Threshold"
    },
    {
      zh: "带薪如厕时长与灵感迸发率（想通今晚吃什么）的量子纠缠实证分析",
      en: "Empirical Quantum Entanglement Between Paid Restroom Breaks and Deciding What to Eat for Dinner"
    }
  ];

  const peerReviewPoolByLang = {
    zh: [
      {
        header: "同行评审专家意见 (Reviewer #1 · 终身免坐班院士)：",
        text: "“震撼学界！标题极富哲学张力，而正文的彻底留白更是对当代学术灌水的无声解构，一字不改直接录用！”"
      },
      {
        header: "同行评审专家意见 (Reviewer #2 · 挑剔的匿名审稿人)：",
        text: "“我原本准备了三页尖锐的拒稿意见，但看到作者正文一个字都没写，我突然意识到自己也没必要审了，遂决定跟作者一起去喝奶茶。Strong Accept！”"
      },
      {
        header: "同行评审专家意见 (Reviewer #3 · 橘座大主任)：",
        text: "“喵呜！呼噜噜噜！（译：这篇论文排版极其舒适，打印出来铺在阳光下正好够本喵睡个午觉，特批封面文章发表！）”"
      },
      {
        header: "同行评审专家意见 (编辑部特快专递裁决)：",
        text: "“零公式、零图表、零废话！本刊创刊三百年来审阅速度最快的一篇杰作，从投稿到录用耗时 0.002 秒！”"
      },
      {
        header: "同行评审专家意见 (Reviewer #2 · 退堂鼓学会会长)：",
        text: "“作者在写完标题后就果断敲响退堂鼓，这种及时止损的学术勇气令评审委员会全体起立鼓掌（随后坐下继续睡）！”"
      },
      {
        header: "同行评审专家意见 (Reviewer #1 · 量子拖延实验室主任)：",
        text: "“由于没有任何实验数据，因此完全不存在可重复性危机——任何人在家躺着都能 100% 完美复现本研究！”"
      }
    ],
    en: [
      {
        header: "Peer Review Verdict (Reviewer #1 · Tenured Absentee Fellow):",
        text: "“Breathtaking! A bold title followed by absolute silence—a masterful deconstruction of academic verbosity. Accepted without a single revision!”"
      },
      {
        header: "Peer Review Verdict (Reviewer #2 · Notoriously Harsh Referee):",
        text: "“I had prepared three pages of ruthless critique, but seeing that the author wrote 0 words, I realized I could also stop working and go get boba. Strong Accept!”"
      },
      {
        header: "Peer Review Verdict (Reviewer #3 · Prof. Ginger Cat):",
        text: "“Meow! Purrrrrr! (Translation: When printed on A4 paper and placed in a sunbeam, this blank manuscript makes an exceptionally cozy nap mat. Featured Cover Article!)”"
      },
      {
        header: "Peer Review Verdict (Editorial Board Fast-Track):",
        text: "“Zero equations, zero charts, zero filler! The fastest peer review in our journal's 300-year history—accepted in 0.002 seconds!”"
      },
      {
        header: "Peer Review Verdict (Reviewer #2 · President of the Retreat Society):",
        text: "“The author's courage to stop immediately after typing the title moved the entire committee to tears of joy before we went back to sleep.”"
      },
      {
        header: "Peer Review Verdict (Reviewer #1 · Chair of Reproducibility):",
        text: "“Because no experiment was conducted, this paper is 100% immune to the replication crisis—anyone lying on a sofa can reproduce these exact results!”"
      }
    ]
  };

  const citationsPoolByLang = {
    zh: [
      "被引次数：9,999+ 次（发表即被全校师生梦境索引）",
      "被引次数：∞ 次（已入选《摸鱼大典》镇馆馆藏）",
      "被引次数：404 次（审稿人纷纷在周报中悄悄引用）",
      "被引次数：88,888 次（连续霸榜睡眠科学热搜榜首）",
      "被引次数：1,024 盒小鱼干（获橘座主任特别嘉奖）"
    ],
    en: [
      "Citations: 9,999+ (Indexed immediately in campus-wide REM sleep)",
      "Citations: ∞ (Inducted into the Hall of Eternal Slacking)",
      "Citations: 404 (Quietly cited in weekly status reports worldwide)",
      "Citations: 88,888 (Top trending manuscript in Somnology)",
      "Citations: 1,024 Salmon Treats (Endorsed by Prof. Ginger)"
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
      { name: "The Advisor's Grand Pie-in-the-Sky", desc: "Freshly baked empty promises; extremely filling yet zero nutrition", price: "$0.00" }
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

  function renderCourseTable(filterDept) {
    if (!courseTbody) return;
    courseTbody.textContent = "";
    const list = coursesByLang[currentLang];
    const filtered = filterDept === "all"
      ? list
      : list.filter((c) => c.deptKey === filterDept);

    const profLabel = currentLang === "zh" ? "主讲：" : "Instructor: ";
    filtered.forEach((course) => {
      const tr = document.createElement("tr");
      tr.className = "course-row" + (course.code === selectedCourseCode ? " selected" : "");

      const tdCode = document.createElement("td");
      tdCode.className = "course-code";
      tdCode.textContent = course.code;

      const tdTitle = document.createElement("td");
      tdTitle.className = "course-title-cell";
      const strongEl = document.createElement("strong");
      strongEl.textContent = course.title;
      const spanEl = document.createElement("span");
      spanEl.textContent = `${course.deptName} · ${profLabel}${course.prof}`;
      tdTitle.appendChild(strongEl);
      tdTitle.appendChild(spanEl);

      const tdCredits = document.createElement("td");
      tdCredits.textContent = course.credits;

      const tdRoom = document.createElement("td");
      tdRoom.textContent = course.room;

      tr.appendChild(tdCode);
      tr.appendChild(tdTitle);
      tr.appendChild(tdCredits);
      tr.appendChild(tdRoom);

      tr.addEventListener("click", () => {
        renderInspector(course);
        renderCourseTable(filterDept);
      });
      courseTbody.appendChild(tr);
    });
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

      card.addEventListener("click", () => {
        activePaperIdx = idx;
        renderPaperList();
      });
      paperListEl.appendChild(card);
    });
  }

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
    if (newPaperAuthorInput) {
      newPaperAuthorInput.placeholder = dict.sub_author_placeholder;
    }
    populatePaperStudioSelects(!isInitial);

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

    const doiStr = `DOI: 10.0000/anu.void.2026.${submissionCounter}`;
    submissionCounter += 1;

    const zhEntry = {
      doi: doiStr,
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
      doi: doiStr,
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
        ? `🎉 秒录用成功！已刊发于《${zhJournal}》（${doiStr}），请查看上方阅览室！`
        : `🎉 Instant Accept! Published in "${enJournal}" (${doiStr}) — see reading room above!`;
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

  // Export Official Blank Paper Acceptance Certificate PNG
  if (downloadPaperCertBtn) {
    downloadPaperCertBtn.addEventListener("click", () => {
      const list = papersByLang[currentLang];
      const activePaper = list[activePaperIdx] || list[0];
      if (!activePaper) return;

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 840;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#F7FAFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#0B2E59";
      ctx.lineWidth = 10;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      ctx.textAlign = "center";
      ctx.fillStyle = "#0B2E59";
      ctx.font = "bold 34px Georgia, serif";
      ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY PRESS", 600, 120);

      ctx.fillStyle = "#1D4ED8";
      ctx.font = "bold 22px Georgia, 'PingFang SC', serif";
      ctx.fillText(
        currentLang === "zh"
          ? "零字数顶刊论文无条件录用通知书 · CERTIFICATE OF PUBLICATION"
          : "OFFICIAL CERTIFICATE OF ZERO-WORD MANUSCRIPT ACCEPTANCE",
        600,
        162
      );

      ctx.fillStyle = "#4A6583";
      ctx.font = "16px monospace";
      ctx.fillText(`${activePaper.journal}   |   ${activePaper.doi}`, 600, 200);

      ctx.strokeStyle = "#BFDBFE";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(120, 224);
      ctx.lineTo(1080, 224);
      ctx.stroke();

      ctx.fillStyle = "#0F2540";
      const titleStr = `《${activePaper.title}》`;
      ctx.font = titleStr.length > 28
        ? "bold 24px Georgia, 'Songti SC', serif"
        : "bold 30px Georgia, 'Songti SC', serif";
      ctx.fillText(titleStr.slice(0, 46), 600, 285);
      if (titleStr.length > 46) {
        ctx.fillText(titleStr.slice(46, 92), 600, 322);
      }

      ctx.fillStyle = "#1D4ED8";
      ctx.font = "19px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(activePaper.authors, 600, 365);

      ctx.fillStyle = "#EFF6FF";
      ctx.fillRect(110, 400, 980, 130);
      ctx.strokeStyle = "#93C5FD";
      ctx.strokeRect(110, 400, 980, 130);

      ctx.fillStyle = "#0B2E59";
      ctx.font = "italic 18px Georgia, 'PingFang SC', serif";
      ctx.fillText(activePaper.content.slice(0, 62), 600, 455);
      ctx.fillStyle = "#4A6583";
      ctx.font = "15px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(activePaper.footnote.slice(0, 70), 600, 495);

      ctx.fillStyle = "#0F2540";
      ctx.font = "bold 17px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(activePaper.reviewerHeader || "Peer Review Verdict:", 600, 578);

      ctx.fillStyle = "#1E3A5F";
      ctx.font = "italic 16px Georgia, 'PingFang SC', serif";
      const revClean = activePaper.review;
      ctx.fillText(revClean.slice(0, 64), 600, 612);
      if (revClean.length > 64) {
        ctx.fillText(revClean.slice(64, 128), 600, 640);
      }

      ctx.save();
      ctx.translate(600, 718);
      ctx.rotate(-0.1);
      ctx.fillStyle = "#1D4ED8";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px Georgia, serif";
      ctx.fillText("ACCEPTED", 0, -6);
      ctx.fillText("0 WORDS", 0, 12);
      ctx.restore();

      ctx.fillStyle = "#64748B";
      ctx.font = "13px monospace";
      ctx.fillText(
        "PARODY & HUMOR CERTIFICATE ONLY · NOT A REAL ACADEMIC PUBLICATION · FREEZE.EDU.KG",
        600,
        785
      );

      const link = document.createElement("a");
      link.download = `ANU-Blank-Paper-${activePaper.doi.replace(/[^a-zA-Z0-9.-]/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }

  // Send Email to Absentee Professor (Multi-Reply + Context-Aware)
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

      ctx.fillStyle = "#F7FAFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#0B2E59";
      ctx.lineWidth = 10;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      ctx.save();
      ctx.translate(600, 125);
      ctx.fillStyle = "#0B2E59";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = "#93C5FD";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-16, 16);
      ctx.lineTo(16, -16);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = "center";
      ctx.fillStyle = "#0B2E59";
      ctx.font = "bold 38px Georgia, serif";
      ctx.fillText("ABSOLUTELY NOTHING UNIVERSITY", 600, 215);

      ctx.fillStyle = "#4A6583";
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillText("Universitas Rerum Nullarum · Sigillum Magnum", 600, 248);

      ctx.fillStyle = "#4A6583";
      ctx.font = "20px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_proclamation, 600, 305);

      const recipient = (nameInput && nameInput.value.trim()) || dict.form_default_name;
      ctx.fillStyle = "#1D4ED8";
      ctx.font = "bold 46px Georgia, 'Songti SC', serif";
      ctx.fillText(recipient, 600, 375);

      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(300, 392);
      ctx.lineTo(900, 392);
      ctx.stroke();

      const degree = (degreeSelect && degreeSelect.value) || "";
      const major = (majorSelect && majorSelect.value) || "";
      const citation = (achievementSelect && achievementSelect.value) || "";

      ctx.fillStyle = "#0B2E59";
      ctx.font = "bold 28px Georgia, 'PingFang SC', serif";
      ctx.fillText(degree, 600, 448);

      ctx.fillStyle = "#0F2540";
      ctx.font = "bold 22px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_major_prefix + major, 600, 492);

      ctx.fillStyle = "#4A6583";
      ctx.font = "italic 18px Georgia, 'PingFang SC', serif";
      ctx.fillText("“" + citation + "”", 600, 545);
      ctx.fillText(dict.cert_privilege_suffix, 600, 576);

      ctx.strokeStyle = "#0B2E59";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(120, 700);
      ctx.lineTo(420, 700);
      ctx.moveTo(780, 700);
      ctx.lineTo(1080, 700);
      ctx.stroke();

      ctx.fillStyle = "#0B2E59";
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillText("Albert Slackingstein", 270, 685);
      ctx.fillText("Prof. Ginger (Meow)", 930, 685);

      ctx.fillStyle = "#4A6583";
      ctx.font = "15px Georgia, 'PingFang SC', sans-serif";
      ctx.fillText(dict.cert_sig_left, 270, 728);
      ctx.fillText(dict.cert_sig_right, 930, 728);

      ctx.save();
      ctx.translate(600, 688);
      ctx.rotate(-0.12);
      ctx.fillStyle = "#1D4ED8";
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#93C5FD";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Georgia, serif";
      ctx.fillText("OFFICIAL SEAL", 0, -14);
      ctx.fillText("NIHIL AGERE", 0, 5);
      ctx.fillText("100% VOID", 0, 24);
      ctx.restore();

      ctx.fillStyle = "#4A6583";
      ctx.font = "15px monospace";
      ctx.fillText(`Serial: ${currentSerial}  |  Issued by Absolutely Nothing University`, 600, 764);

      ctx.fillStyle = "#64748B";
      ctx.font = "12px monospace";
      ctx.fillText("FOR HUMOR & ENTERTAINMENT ONLY · PARODY DIPLOMA · NOT AN ACCREDITED INSTITUTION", 600, 788);

      const safeFileRecipient = recipient.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_").slice(0, 30) || "Alumni";
      const link = document.createElement("a");
      link.download = `ANU-Diploma-${safeFileRecipient}.png`;
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
