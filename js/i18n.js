(function (global) {
  "use strict";

  const i18nDict = {
    zh: {
      page_title: "Absolutely Nothing University (ANU) | 绝对虚无大学官方网站",
      skip_to_content: "跳至主要内容",
      brand_sub: "绝对虚无大学 · 公元前 ∞ 年",
      sidebar_term_title: "2026 躺平学年 · 第 NaN 周",
      sidebar_term_status: "教学状态：全校无限期放假中",
      sidebar_sec_main: "核心门户 · PORTALS",
      sidebar_sec_campus: "校园生态 · CAMPUS",
      nav_overview: "创校门户与校长办公厅",
      nav_admissions: "极速录取与博士学位",
      nav_academics: "院系大纲与模拟统考",
      nav_research: "空白论文库与在线投稿",
      nav_faculty: "不坐班名师与自动回信",
      nav_campus: "薛定谔食堂与摸鱼社团",
      nav_webcams: "保卫处 24h 模拟监控",
      sidebar_btn_excuse: "生成今日请假理由",
      sidebar_excuse_default: "今日官方请假条：由于被窝产生局部强引力场，特批全天免起床。",
      mobile_menu_btn: "☰ 校务导航",
      theme_btn_dark: "🌙 学院夜读",
      theme_btn_light: "☀️ 经典白昼",
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
      chancellor_eyebrow: "Aula Cancellarii · 校长办公室与校务公告系统",
      chancellor_sec_title: "第 404 任校长公署与荒诞法令公报",
      chancellor_sec_desc: "查阅摸鱼斯坦爵士的终身不作为档案、每日午睡作息表，以及由校长办公室、教务处与后勤处联合颁布的最新校务公告。",
      chancellor_schedule_title: "校长每日标准摸鱼作息表",
      chancellor_decree_stamp: "校长亲笔代签 · 睡梦中批阅",
      ann_board_title: "校务公告与荒诞校长令归档",
      ann_filter_all: "全部公报",
      ann_filter_decree: "校长令",
      ann_filter_academic: "教务通知",
      ann_filter_campus: "校园行政",
      ann_btn_random: "随机抽阅一条校务法令",
      ann_id_prefix: "公报编号：",
      home_dir_eyebrow: "Porta Academica · 校内各大职能部门直达",
      home_dir_title: "探索绝对虚无大学的六大核心殿堂",
      home_dir_desc: "您可通过左侧常驻学院导航栏或下方快捷入口，随时前往学位授予处、荒诞选课中心、空白期刊库或薛定谔食堂。",
      pcard1_title: "免试直录与博士颁授",
      pcard1_desc: "无需考试与答辩，支持三套证书模板、随机荣誉称号与中英切换，一键导出 2400px 高清 PNG 学位证。",
      pcard2_title: "四大院系与翘课指南",
      pcard2_desc: "涵盖 8 门王牌课程完整荒诞大纲，内置本地趣味摸鱼统考，交卷即出幽默成绩单。",
      pcard3_title: "《Nature: Nothing》期刊",
      pcard3_desc: "查阅零字数高被引镇校论文，在线投递空白手稿，获取三位盲审专家意见与高清录用通知书。",
      pcard4_title: "不坐班名师与自动回信",
      pcard4_desc: "认识图书馆首席呼噜官橘座主任与司马改天教授，体验向教授发邮件秒收敷衍回信。",
      pcard5_title: "薛定谔食堂与摸鱼社团",
      pcard5_desc: "浏览 10 道量子玄学菜品与智能随机配餐，报名加入五大摸鱼社团并解锁隐藏彩蛋。",
      pcard6_title: "保卫处 24h 模拟监控",
      pcard6_desc: "监看空无一人的自习大厅、凉透的校长枸杞茶与正在烤红薯的超算机箱（纯属虚构模拟画面）。",
      pcard_enter: "进入该殿堂",
      adm_eyebrow: "Admissio Sine Examine · 免试直录与学位授予处",
      adm_title: "三秒极速录取与荣誉博士颁授系统",
      adm_desc: "由于招生办老师觉得审阅简历过于劳累，我校自 1899 年起全面废除入学考试与论文答辩。只要您此刻正在呼吸（或假装思考），即可定制三套学院风格证书并导出高分辨率 PNG。",
      form_title: "填写您的摸鱼档案",
      form_note: "免报名费 · 免推荐信 · 填完直接毕业",
      form_lbl_name: "受颁人尊姓大名 (Recipient Name)",
      form_placeholder_name: "请输入您的姓名或代号",
      form_default_name: "首席退堂鼓演奏家",
      form_lbl_degree: "申请学位等级 (Degree Title)",
      form_lbl_major: "主修荒诞专业 (Department & Major)",
      form_lbl_honor: "随机学术荣誉称号 (Latin / Academic Honor)",
      form_lbl_template: "证书装帧模板风格 (Certificate Style)",
      form_lbl_cert_lang: "证书票面语言 (Certificate Language)",
      cert_lang_auto: "跟随当前网站语言 (Follow Site)",
      cert_lang_zh: "中文荣誉证书 (Chinese)",
      cert_lang_en: "英文国际证书 (English)",
       cert_lang_bilingual: "中英双语典藏版 (Bilingual)",
      form_lbl_citation: "代表性学术不作为 (Citation of Inaction)",
      form_btn_stamp: "加盖校长蓝晶大印",
      form_btn_download: "导出高清 PNG 学位证",
      cert_proclamation: "经绝对虚无大学评议会全票弃权通过，兹郑重授予",
      cert_major_prefix: "专业方向：",
      cert_honor_prefix: "学术荣誉：",
      cert_date_prefix: "颁授日期：",
      cert_privilege_suffix: "并享有在全球任何沙发上理直气壮躺平之特权。",
      cert_sig_left: "第 404 任校长（代签：他睡着了）",
      cert_sig_right: "教务长兼图书馆首席呼噜官",
      cert_serial_prefix: "证书档案号：",
      cert_serial_stamped: "（已加盖官方蓝印）",
      cert_fictional_notice: "【虚构娱乐声明】本证书系虚构讽刺大学（Absolutely Nothing University）娱乐生成物，非真实教育机构颁发，不具任何法定学历或学位效力。",
      cert_btn_random: "随机生成一位摸鱼校友",
      cert_btn_honor: "随机刷新荣誉头衔",
      acad_eyebrow: "Index Lectionum · 四大王牌学院与课程目录",
      acad_title: "2026 学年必修与选修翘课指南",
      acad_desc: "我校所有课程均采用“薛定谔面授法”：只要老师和学生同时决定不去教室，这节课就算圆满完成。点击任意课程可查阅完整周次大纲、考核方式及参加随堂模拟测试。",
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
      syl_lbl_prof_bio: "授课教授档案 (Instructor Profile)",
      syl_lbl_weeks: "周次教学大纲 (Weekly Syllabus)",
      syl_lbl_grading: "考核方式与评分构成 (Assessment & Grading)",
      syl_lbl_book: "指定教材 (Required Textbook)",
      syl_btn_enroll: "一键选课并立即翘课",
      syl_btn_exam: "参加本课随堂摸鱼模拟考",
      exam_title: "随堂摸鱼水平摸底统考 (In-Browser Satirical Quiz)",
      exam_subtitle: "完全在浏览器本地判卷 · 答对太认真反而可能扣分",
      exam_btn_submit: "立即交卷并生成幽默成绩单",
      exam_btn_reset: "重新抽题再考一次",
      exam_transcript_title: "绝对虚无大学 · 官方幽默成绩单 (Unofficial Transcript)",
      res_eyebrow: "Acta Nihilologica · 镇校学术成果与空白期刊",
      res_title: "《Nature: Nothing》高被引空白论文阅览室与在线投稿工坊",
      res_desc: "我校学者每年在虚构顶刊发表数百篇零字数论文。点击左侧代表作可调阅手稿与三位盲审专家意见，也可在下方投稿工坊抽选课题并导出高清录用通知书 PNG。",
      res_reviewer_label: "同行盲审专家委员会意见 (Peer Review Panel)：",
      reader_oa_note: "虚构学术讽刺出版物 · 无真实 DOI · 100% 零字数防查重",
      reader_btn_export: "导出论文录用通知书 PNG",
      sub_paper_title: "向《Nature: Nothing》在线投递零字数手稿 (Manuscript Studio)",
      sub_paper_desc: "支持自定义或从 18 个荒诞选题库中随机抽选、选择目标虚构期刊与空白方法论流派。系统将当场生成零字数正文、三维审稿人意见与可导出录用通知书！",
      sub_lbl_title: "论文题目（留空则每次随机抽取全新奇葩课题）",
      sub_lbl_author: "通讯作者署名 (Corresponding Author)",
      sub_lbl_journal: "选择目标虚构期刊 (Target Fictional Journal)",
      sub_lbl_style: "选择空白方法论流派 (Blank Methodology)",
      sub_paper_placeholder: "留空自动随机抽选课题，或输入您的奇思妙想标题...",
      sub_author_placeholder: "例如：张摸鱼 / 首席退堂鼓学者（留空默认匿名学者）",
      sub_paper_btn: "一键投递手稿并秒获审稿意见",
      sub_random_btn: "随机抽选一个奇葩课题并生成",
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
      cafe_title: "第一薛定谔食堂 · 今日扩展菜单",
      cafe_note: "营业时间：看厨师心情（通常在午睡） · 全场精神免费",
      cafe_cat_all: "全部菜品",
      cafe_cat_entree: "量子主食",
      cafe_cat_drink: "死线特饮",
      cafe_cat_dessert: "导师画饼",
      oracle_title: "人类终极难题解答器：今天中午到底吃什么？",
      oracle_init: "点击下方按钮，由食堂首席颠勺大师为您随机搭配今日三件套（主食 + 特饮 + 甜品）。",
      oracle_btn: "随机生成今日摸鱼套餐",
      clubs_title: "学生摸鱼社团招新（共 5 个注册社团）",
      clubs_note: "零社费 · 零活动 · 加群即永久免打扰（本地保存入团状态）",
      club_join_btn: "一键入团并开启免打扰",
      club_joined_btn: "✓ 已入团（永久免打扰中）",
      club_feedback_init: "当前状态：您尚未加入任何社团（其实加了也从来不办活动）。",
      cam_eyebrow: "Speculum Campi · 校园 24 小时模拟监控画面",
      cam_title: "全校重点区域虚无模拟观测网",
      cam_desc: "为了向社会各界证明我校确实什么都没在干，保卫处特将校内四路模拟观测画面公开展示。",
      cam_sim_banner: "⚠️ 模拟画面声明：本页所有监控镜头均为 SVG 矢量动画与剧本模拟画面（SIMULATED PARODY FEED），并非真实摄像头或实时视频流。",
      cam1_rec: "◉ SIMULATED [CAM-01: 中央自习大厅]",
      cam1_sub: "噪音分贝：0.0 dB · 翻书声：0 次/世纪",
      cam1_loc: "位置：不学无术楼 1F（模拟镜头）",
      cam2_rec: "◉ SIMULATED [CAM-02: 校长办公桌]",
      cam2_sub: "水温：已凉透 · 待批阅文件：0 份",
      cam2_loc: "位置：行政摆烂楼 404 室（模拟镜头）",
      cam3_rec: "◉ SIMULATED [CAM-03: 量子超算中心]",
      cam3_sub: "算力负载：0.00 FLOPS · 红薯熟度：85%",
      cam3_loc: "位置：地下负一层锅炉房旁（模拟镜头）",
      cam4_rec: "◉ SIMULATED [CAM-04: 毕业大草坪]",
      cam4_sub: "风速：微风 · 树叶归属：顺其自然",
      cam4_loc: "位置：南门晒太阳广场（模拟镜头）",
      cam_refresh: "切换模拟帧",
      cam_night_vision: "切换夜视模式",
      easter_hint: "彩蛋提示：连续点击左上角校徽 5 次，或在页面任意处输入 ↑↑↓↓←→←→BA 试试？",
      footer_motto: "校训：Nihil Agere, Omnia Esse · 什么都不做，即是一切",
      footer_disclaimer: "免责声明：Absolutely Nothing University (ANU · 绝对虚无大学) 是一所纯属虚构的讽刺与幽默艺术项目网站，非真实高等教育机构。本站生成的任何证书、课程成绩单或论文录用通知书仅供娱乐，不具备任何现实学术或法律效力。",
      nav_my_anu: "My ANU · 我的校园",
      sidebar_sec_account: "学生门户 · MY ANU",
      sidebar_auth_guest: "状态：游客体验模式（全功能开放）",
      sidebar_auth_btn_open: "进入 My ANU 校园中心",
      my_eyebrow: "Regestum Scholasticum · 学生门户",
      my_title: "My ANU · 我的虚无校园个人中心",
      my_desc: "把成绩、论文与校园荣誉，收进你的 My ANU。",
      my_guest_banner_title: "欢迎来到 My ANU",
      my_guest_banner_desc: "登录后查看并同步云端校园档案；暂不登录，也能体验全部游客功能。",
      my_auth_eyebrow: "校园通行证",
      my_auth_status_guest: "游客模式",
      my_auth_status_signed_in: "Google 已登录",
      my_auth_status_pending: "正在连接",
      my_auth_private: "档案默认私有",
      my_auth_sync: "跨设备同步",
      my_source_label: "档案来源",
      my_source_cloud: "当前账号云端档案",
      my_source_local: "本机游客记录",
      my_source_cloud_note: "仅展示当前登录账号的云端记录；空档案不会展示本机游客数据。",
      my_source_local_note: "这些记录保存在此浏览器，可能来自其他使用者；只有点击「导入」才会复制到当前账号。",
      my_export_json: "导出所选档案 JSON",
      my_export_png: "导出 PNG",
      my_export_started: "✓ 已发起下载，请检查浏览器下载列表。",
      my_sync_loading: "正在同步…",
      my_sync_saving: "正在保存到云端，请等待结果…",
      my_btn_google_signin: "使用 Google 登录",
      my_btn_switch_account: "切换 Google 账号",
      my_btn_signout: "退出登录",
      my_btn_sync_now: "立即同步云端档案",
      my_btn_import_local: "导入本机现有校园记录",
      my_safari_notice: "请允许登录弹窗；内置浏览器请改用 Safari 或 Chrome。",
      my_security_notice: "云端登记前请完成下方安全验证；每次提交后需要重新验证。本机功能始终可用。",
      my_reg_card_title: "首次入学登记 · 创建您的 ANU 校园档案",
      my_reg_card_note: "每个 Google 账号严格对应唯一一份 ANU 学生档案（默认私有保护，绝不未经同意公开展示）。",
      my_reg_lbl_nickname: "校园昵称 (Campus Nickname)",
      my_reg_lbl_college: "所属学院 (Academic College)",
      my_reg_lbl_major: "主修荒诞专业 (Major)",
      my_reg_lbl_year: "入学年份 (Enrollment Year)",
      my_reg_lbl_honor: "虚构学术荣誉头衔 (Fictional Honor)",
      my_reg_lbl_avatar: "校园头像风格 (Crest Avatar Style)",
      my_avatar_opt_oxford: "牛津蓝晶校徽 (Oxford Sapphire Crest)",
      my_avatar_opt_ginger: "橘座大主任御印 (Prof. Ginger Cat Seal)",
      my_avatar_opt_void: "纯粹空集符号 (Pure Void Emblem)",
      my_avatar_opt_slumber: "午夜深度睡眠星环 (Midnight Slumber Crest)",
      my_avatar_opt_thermos: "校长枸杞保温杯 (Goji Thermos Emblem)",
      my_avatar_opt_retreat: "皇家退堂鼓徽章 (Royal Retreat Drum)",
      my_reg_chk_google_avatar: "优先使用我的 Google 账号头像（不勾选则使用上方本地生成的虚构校徽头像）",
      my_reg_lbl_visibility: "档案可见性设置 (Profile Visibility)",
      my_vis_private: "私有档案（默认推荐 · 仅本人登录后可见）",
      my_vis_public: "公开卡片（需单独勾选同意 · 允许通过学号只读查询公开名片）",
      my_reg_chk_public_consent: "我单独确认并同意：将我的校园昵称、学号、学院、专业及虚构荣誉设为公开可查询状态（随时可撤回为私有）。",
      my_reg_chk_legal: "我已阅读并同意 ANU《隐私政策》与《使用条款》，知悉本站为虚构幽默艺术项目。",
      my_reg_btn_submit: "正式建立学籍并领取唯一 ANU 学号",
      my_profile_card_title: "学生学籍电子档案卡",
      my_lbl_student_id: "唯一 ANU 学号",
      my_lbl_enrollment: "入学日期",
      my_lbl_visibility_badge_private: "🔒 私有档案",
      my_lbl_visibility_badge_public: "🌐 公开档案",
      my_tab_transcripts: "个人成绩单",
      my_tab_papers: "零字数论文成果",
      my_tab_diplomas: "荣誉学位证书",
      my_tab_honors: "荣誉勋章与社团",
      my_tab_settings: "账户与隐私设置",
      my_empty_transcripts: "暂无云端统考成绩记录。前往「院系大纲与模拟统考」完成随堂测验即可自动由服务端判分并载入成绩单！",
      my_empty_papers: "暂无云端零字数论文。前往「空白论文库与在线投稿」发表手稿或点击上方「导入本机现有校园记录」。",
      my_empty_diplomas: "暂无已登记的荣誉博士证书。前往「极速录取与博士学位」加盖校长大印并保存到个人档案！",
      my_empty_honors: "尚未解锁社团或隐藏荣誉勋章。加入摸鱼社团或触发校园彩蛋即可自动点亮！",
      my_settings_title: "档案编辑、隐私可见性与账户注销",
      my_settings_btn_save: "保存档案与隐私设置",
      my_danger_title: "危险操作区 · 永久删除校园档案",
      my_danger_desc: "登录后将永久删除本人云端 ANU 档案、学号、成绩、论文、证书和荣誉；需在最近 5 分钟内重新 Google 登录。本机游客记录和 Google 身份保留。游客模式下仅删除本机记录。操作不可撤销，建议先导出。",
      my_danger_confirm_label: "请输入确认口令 DELETE_MY_ANU_ARCHIVE 以解锁永久删除：",
      my_danger_btn_delete: "永久删除我的 ANU 校园档案",
      my_lookup_title: "公开校友学号名片核验（仅限已显式开启公开授权的学号）",
      my_lookup_placeholder: "输入学号，如 ANU-2026-AB12CD",
      my_lookup_btn: "查询公开学籍卡",
      my_legal_privacy_title: "隐私政策 (Privacy Policy)",
      my_legal_privacy_body: "1. 数据最小化原则：本站仅在您主动使用 Google 登录时获取由 Firebase Authentication 验证的内部 UID、邮箱（仅向您显示当前账号）、基本展示名称与头像 URL（可选），用于在 Cloudflare D1 中建立虚构校园档案。2. 默认私有：所有新建学生档案默认均为私有（private），未经您单独勾选公开同意，任何第三方均无法通过学号或接口查看您的档案。3. 零明文令牌存储：前端严格遵循 Firebase 官方规范管理会话，绝不自行在 localStorage 中存储原始 JWT 令牌；学号（ANU-YYYY-XXXXXX）仅作虚构展示编号，绝不作为身份认证依据。4. 档案删除：您可在「My ANU → 账户设置」中导出或删除本人云端校园档案；删除需近期 Google 验证与明确确认，不会删除 Google 账户。本机游客记录、安全审计记录和私有灾备副本有独立保留边界，云端删除不等于立即清除这些副本。",
      my_legal_terms_title: "使用条款 (Terms of Use)",
      my_legal_terms_body: "1. 虚构讽刺声明：Absolutely Nothing University (ANU · freeze.edu.kg) 是一所纯属虚构的讽刺与幽默网站，不具备任何现实教育资质，所有学位、学号、成绩单与论文均为娱乐性质。2. 防滥用与限流规范：严禁对 API 发起自动化爬取、注入攻击、越权探测或高频刷接口行为；所有写入操作均受 Cloudflare Turnstile、IP/UID 双维限流及幂等键保护。3. 服务管理开关：校务处保留在系统维护或安全演练期间暂停新注册、论文投稿或证书登记的权利。",
      btn_save_diploma_cloud: "存入我的 ANU 云端证书档案",
      footer_link_my_anu: "My ANU 学生中心",
      footer_link_privacy: "隐私政策与使用条款"
    },
    en: {
      page_title: "Absolutely Nothing University (ANU) | Official Satirical Website",
      skip_to_content: "Skip to main content",
      brand_sub: "Founded in ∞ B.C. · Ranked NaN",
      sidebar_term_title: "2026 Slacking Term · Week NaN",
      sidebar_term_status: "Status: Campus-Wide Infinite Vacation",
      sidebar_sec_main: "ACADEMIC PORTALS",
      sidebar_sec_campus: "CAMPUS ECOSYSTEM",
      nav_overview: "Campus Portal & Chancellor",
      nav_admissions: "Instant Ph.D. & Admissions",
      nav_academics: "Course Catalog & Mock Exam",
      nav_research: "Blank Papers & Submission",
      nav_faculty: "Absentee Faculty & Auto-Reply",
      nav_campus: "Schrödinger Dining & Clubs",
      nav_webcams: "24/7 Simulated Webcams",
      sidebar_btn_excuse: "Generate Official Excuse",
      sidebar_excuse_default: "Official Excuse Slip: Due to localized strong gravitational fields inside my duvet, I am excused from waking up today.",
      mobile_menu_btn: "☰ Campus Menu",
      theme_btn_dark: "🌙 Nocturnal Mode",
      theme_btn_light: "☀️ Daylight Mode",
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
      chancellor_eyebrow: "Aula Cancellarii · Office of the Chancellor & Campus Decrees",
      chancellor_sec_title: "Office of the 404th Chancellor & Official Gazette",
      chancellor_sec_desc: "Inspect the lifelong inaction dossier of Sir Albert Slackingstein, his daily nap itinerary, and official decrees issued by the Chancellor's Office, Provost, and Facilities.",
      chancellor_schedule_title: "Chancellor's Daily Slacking Itinerary",
      chancellor_decree_stamp: "Signed by Proxy · Approved in REM Sleep",
      ann_board_title: "Official Campus Bulletins & Chancellor's Decrees",
      ann_filter_all: "All Bulletins",
      ann_filter_decree: "Chancellor's Decrees",
      ann_filter_academic: "Academic Notices",
      ann_filter_campus: "Campus Admin",
      ann_btn_random: "Draw Random Official Decree",
      ann_id_prefix: "Bulletin ID: ",
      home_dir_eyebrow: "Porta Academica · Direct Departmental Portals",
      home_dir_title: "Explore the Six Halls of Absolutely Nothing University",
      home_dir_desc: "Use the persistent left sidebar or the quick portals below to visit the Diploma Conferral Hall, Truancy Course Catalog, Blank Journal Archive, or Schrödinger Cafeteria.",
      pcard1_title: "Instant Ph.D. & Conferral",
      pcard1_desc: "Zero exams or defense. Choose from 3 certificate templates, random Latin honors, and bilingual layouts with 2400px PNG export.",
      pcard2_title: "Faculties & Truancy Catalog",
      pcard2_desc: "Explore 8 flagship courses with full weekly syllabi, grading breakdowns, and an interactive in-browser mock exam.",
      pcard3_title: "Nature: Nothing Journal",
      pcard3_desc: "Read our most-cited zero-word manuscripts, submit your own blank paper, and export an official Acceptance Letter PNG.",
      pcard4_title: "Absentee Faculty & Auto-Reply",
      pcard4_desc: "Meet Chief Purring Officer Prof. Ginger and test our 0-second Out-of-Office Perfunctory Email Simulator.",
      pcard5_title: "Schrödinger Dining & Clubs",
      pcard5_desc: "Browse 10 quantum cafeteria dishes, spin a 3-course combo meal, and join 5 slacking societies with hidden Easter eggs.",
      pcard6_title: "24/7 Simulated Webcams",
      pcard6_desc: "Monitor our empty study hall, cold herbal tea on the Chancellor's desk, and supercomputers roasting sweet potatoes (Simulated Feed).",
      pcard_enter: "Enter Hall",
      adm_eyebrow: "Admissio Sine Examine · Direct Enrollment & Conferral",
      adm_title: "3-Second Instant Admission & Honorary Ph.D. Generator",
      adm_desc: "Because our Admissions Committee found reading applications far too exhausting, ANU abolished entrance exams and thesis defenses in 1899. Customize your diploma across three distinctive templates and export a high-res PNG.",
      form_title: "Complete Your Slacking Dossier",
      form_note: "Zero Application Fee · Zero Reference Letters · Instant Graduation",
      form_lbl_name: "Recipient Full Name or Alias",
      form_placeholder_name: "Enter your name or slacker title",
      form_default_name: "Chief Retreat Drummer",
      form_lbl_degree: "Degree Title to Confer",
      form_lbl_major: "Department & Absurd Major",
      form_lbl_honor: "Academic Honor Title (Randomizable)",
      form_lbl_template: "Certificate Template Style",
      form_lbl_cert_lang: "Certificate Display Language",
      cert_lang_auto: "Follow Site Language",
      cert_lang_zh: "Chinese Certificate (中文)",
      cert_lang_en: "English Certificate (英文)",
      cert_lang_bilingual: "Bilingual Collector's Edition",
      form_lbl_citation: "Distinguished Citation of Inaction",
      form_btn_stamp: "Stamp Official Cobalt Blue Seal",
      form_btn_download: "Export High-Res PNG Diploma",
      cert_proclamation: "By unanimous abstention of the Senate of Absolutely Nothing University, we hereby confer upon",
      cert_major_prefix: "Majoring in: ",
      cert_honor_prefix: "Conferred with Honor: ",
      cert_date_prefix: "Date of Conferral: ",
      cert_privilege_suffix: "with all the rights and privileges to lie flat on any sofa worldwide.",
      cert_sig_left: "404th Chancellor (Signed by proxy while napping)",
      cert_sig_right: "Provost & Chief Library Purring Officer",
      cert_serial_prefix: "Archive Serial: ",
      cert_serial_stamped: " (Cobalt Seal Verified)",
      cert_fictional_notice: "[FICTIONAL PARODY NOTICE] This novelty certificate is generated by Absolutely Nothing University (a satirical art website) and represents a fictional, non-accredited degree with zero legal or academic standing.",
      cert_btn_random: "Generate Random Slacker Alumni",
      cert_btn_honor: "Roll Random Honor Title",
      acad_eyebrow: "Index Lectionum · Faculties & Course Catalog",
      acad_title: "2026 Academic Year Guide to Strategic Truancy",
      acad_desc: "All courses at ANU follow the Schrödinger Pedagogy: whenever both professor and students simultaneously decide not to show up, the lecture is deemed a resounding success. Select any course to inspect its full weekly syllabus and take a mock exam.",
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
      syl_lbl_prof_bio: "Instructor Dossier",
      syl_lbl_weeks: "Weekly Syllabus Schedule",
      syl_lbl_grading: "Assessment & Grading Breakdown",
      syl_lbl_book: "Required Textbook",
      syl_btn_enroll: "Enroll & Skip Entire Semester Now",
      syl_btn_exam: "Take In-Browser Slacking Mock Exam",
      exam_title: "Course Slacking Proficiency Mock Exam",
      exam_subtitle: "100% Client-Side Grading · Trying too hard may lower your score",
      exam_btn_submit: "Submit Exam & Generate Humorous Transcript",
      exam_btn_reset: "Reset Exam",
      exam_transcript_title: "Absolutely Nothing University · Humorous Grade Report",
      res_eyebrow: "Acta Nihilologica · High-Impact Blank Scholarship",
      res_title: "Nature: Nothing — Blank Manuscript Archive & Submission Studio",
      res_desc: "Our scholars publish hundreds of zero-word papers in fictional journals every year. Select any manuscript on the left to inspect its full text and referee reports, or use the Submission Studio below.",
      res_reviewer_label: "Peer Review Committee Verdict:",
      reader_oa_note: "Fictional Satirical Publication · No Real DOI · 100% Zero-Word Guarantee",
      reader_btn_export: "Export Acceptance Letter PNG",
      sub_paper_title: "Submit Your Zero-Word Manuscript (Manuscript Submission Studio)",
      sub_paper_desc: "Enter a custom title or draw from 18 absurd topics, pick a fictional journal and blank methodology school, and receive a unique zero-word body, multi-referee review, and Acceptance Letter PNG!",
      sub_lbl_title: "Manuscript Title (Leave blank to draw a fresh random topic each time)",
      sub_lbl_author: "Corresponding Author Name",
      sub_lbl_journal: "Target Fictional Journal",
      sub_lbl_style: "Blank Methodology School",
      sub_paper_placeholder: "Leave blank for a random topic, or type your own title...",
      sub_author_placeholder: "e.g., Dr. Slacker (Leave blank for Anonymous Fellow)",
      sub_paper_btn: "Submit Manuscript & Get Instant Referee Report",
      sub_random_btn: "Draw Random Topic & Publish Instantly",
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
      cafe_title: "First Schrödinger Cafeteria · Extended Menu",
      cafe_note: "Hours: Whenever the chef wakes up · All items spiritually $0.00",
      cafe_cat_all: "All Dishes",
      cafe_cat_entree: "Quantum Entrees",
      cafe_cat_drink: "Deadline Drinks",
      cafe_cat_dessert: "Advisor's Pies",
      oracle_title: "Ultimate Human Dilemma Solver: What Should I Eat Today?",
      oracle_init: "Click below to let the Grand Cafeteria Ladle assemble a random 3-course Slacker Meal (Entree + Drink + Dessert).",
      oracle_btn: "Spin Random 3-Course Slacker Meal",
      clubs_title: "Student Slacking Societies (5 Registered Clubs)",
      clubs_note: "Zero Dues · Zero Events · Permanent Do-Not-Disturb (Saved locally)",
      club_join_btn: "Join Club & Mute Notifications",
      club_joined_btn: "✓ Joined (Muted Forever)",
      club_feedback_init: "Status: Not enrolled in any club yet (they never meet anyway).",
      cam_eyebrow: "Speculum Campi · 24/7 Simulated Campus Feeds",
      cam_title: "Simulated Campus Inactivity Observation Network",
      cam_desc: "To prove to the public that absolutely nothing is happening on campus, Security displays four simulated illustration feeds around the clock.",
      cam_sim_banner: "⚠️ SIMULATION NOTICE: All monitors on this page are SVG vector illustrations and scripted parody feeds (SIMULATED FICTIONAL FEED), not real security cameras or live video streams.",
      cam1_rec: "◉ SIMULATED [CAM-01: Grand Study Hall]",
      cam1_sub: "Noise Level: 0.0 dB · Page Turns: 0 / century",
      cam1_loc: "Location: Hall of Unlearning 1F (Simulated)",
      cam2_rec: "◉ SIMULATED [CAM-02: Chancellor's Desk]",
      cam2_sub: "Tea Temp: Ice Cold · Pending Memos: 0",
      cam2_loc: "Location: Admin Building Room 404 (Simulated)",
      cam3_rec: "◉ SIMULATED [CAM-03: Quantum Supercomputer]",
      cam3_sub: "Load: 0.00 FLOPS · Sweet Potato Roast: 85%",
      cam3_loc: "Location: Basement Boiler Annex (Simulated)",
      cam4_rec: "◉ SIMULATED [CAM-04: Commencement Lawn]",
      cam4_sub: "Wind: Gentle Breeze · Leaf Status: Unbothered",
      cam4_loc: "Location: South Sunbathing Plaza (Simulated)",
      cam_refresh: "Cycle Simulated Frame",
      cam_night_vision: "Toggle Night-Vision Filter",
      easter_hint: "Easter Egg Hint: Click the university crest 5 times or type the Konami Code (↑↑↓↓←→←→BA)!",
      footer_motto: "Motto: Nihil Agere, Omnia Esse · Doing Nothing, Being Everything",
      footer_disclaimer: "Disclaimer: Absolutely Nothing University (ANU · freeze.edu.kg) is a fictional, satirical parody website created for humor and entertainment. It is not an accredited educational institution, and all certificates, transcripts, and acceptance letters generated here have zero legal or academic validity.",
      nav_my_anu: "My ANU · Student Portal",
      sidebar_sec_account: "STUDENT PORTAL · MY ANU",
      sidebar_auth_guest: "Status: Guest Mode (All Features Open)",
      sidebar_auth_btn_open: "Open My ANU Student Center",
      my_eyebrow: "Regestum Scholasticum · Student Portal",
      my_title: "My ANU · Personal Campus Center",
      my_desc: "A home for your transcripts, papers, and campus honors.",
      my_guest_banner_title: "Welcome to My ANU",
      my_guest_banner_desc: "Sign in to access your cloud campus archive, or enjoy every guest feature without an account.",
      my_auth_eyebrow: "Campus Pass",
      my_auth_status_guest: "Guest mode",
      my_auth_status_signed_in: "Google signed in",
      my_auth_status_pending: "Connecting",
      my_auth_private: "Private by default",
      my_auth_sync: "Sync across devices",
      my_source_label: "Archive source",
      my_source_cloud: "Current account cloud archive",
      my_source_local: "Guest records on this device",
      my_source_cloud_note: "Only this signed-in account’s cloud records appear here. An empty archive stays empty.",
      my_source_local_note: "These browser records may belong to other device users. Use Import only for records you own.",
      my_export_json: "Export selected archive as JSON",
      my_export_png: "Export PNG",
      my_export_started: "✓ Download started. Check your browser downloads.",
      my_sync_loading: "Syncing…",
      my_sync_saving: "Saving to the cloud. Please wait…",
      my_btn_google_signin: "Sign in with Google",
      my_btn_switch_account: "Switch Google account",
      my_btn_signout: "Sign Out",
      my_btn_sync_now: "Sync Cloud Archive Now",
      my_btn_import_local: "Import Local Campus Data",
      my_safari_notice: "Allow the sign-in popup. Using an in-app browser? Open in Safari or Chrome.",
      my_security_notice: "Complete the security check below before saving to the cloud. Each submission needs a fresh check. Local features remain available.",
      my_reg_card_title: "First-Time Matriculation · Create Your ANU Campus Profile",
      my_reg_card_note: "Each verified Google account maps to at most one unique ANU student profile (strictly Private by default; never made public without separate explicit consent).",
      my_reg_lbl_nickname: "Campus Nickname",
      my_reg_lbl_college: "Academic College",
      my_reg_lbl_major: "Department & Major",
      my_reg_lbl_year: "Enrollment Year",
      my_reg_lbl_honor: "Fictional Academic Honor",
      my_reg_lbl_avatar: "Campus Crest Avatar Style",
      my_avatar_opt_oxford: "Oxford Sapphire Crest",
      my_avatar_opt_ginger: "Prof. Ginger Cat Seal",
      my_avatar_opt_void: "Pure Void Emblem",
      my_avatar_opt_slumber: "Midnight Slumber Crest",
      my_avatar_opt_thermos: "Goji Thermos Emblem",
      my_avatar_opt_retreat: "Royal Retreat Drum",
      my_reg_chk_google_avatar: "Use my Google account profile photo (uncheck to use the locally generated ANU crest avatar above)",
      my_reg_lbl_visibility: "Profile Visibility Setting",
      my_vis_private: "Private Profile (Default Recommended · Visible only to you)",
      my_vis_public: "Public Card (Requires separate consent · Allows read-only lookup by Student ID)",
      my_reg_chk_public_consent: "I separately and explicitly consent to making my campus nickname, Student ID, college, major, and fictional honor publicly queryable (revocable at any time).",
      my_reg_chk_legal: "I have read and agree to the ANU Privacy Policy & Terms of Use, and understand this is a fictional satirical project.",
      my_reg_btn_submit: "Complete Matriculation & Claim Unique ANU Student ID",
      my_profile_card_title: "Official ANU Student Dossier Card",
      my_lbl_student_id: "Unique ANU Student ID",
      my_lbl_enrollment: "Matriculation Date",
      my_lbl_visibility_badge_private: "🔒 Private Profile",
      my_lbl_visibility_badge_public: "🌐 Public Profile",
      my_tab_transcripts: "Academic Transcripts",
      my_tab_papers: "Zero-Word Manuscripts",
      my_tab_diplomas: "Honorary Diplomas",
      my_tab_honors: "Honors & Societies",
      my_tab_settings: "Account & Privacy Settings",
      my_empty_transcripts: "No cloud exam transcripts yet. Take any course's Slacking Mock Exam in the Academic Catalog for instant server-side grading and transcript archiving!",
      my_empty_papers: "No cloud manuscripts archived yet. Publish a zero-word paper in the Submission Studio or click 'Import Local Campus Data' above.",
      my_empty_diplomas: "No honorary diplomas registered in cloud yet. Stamp and save your doctorate in the Admissions Hall!",
      my_empty_honors: "No society memberships or hidden medals synced yet. Join a slacking club or unlock a campus Easter egg!",
      my_settings_title: "Edit Profile, Visibility Consent & Account Deletion",
      my_settings_btn_save: "Save Profile & Privacy Preferences",
      my_danger_title: "Danger Zone · Permanent Archive Deletion",
      my_danger_desc: "When signed in, this permanently deletes your ANU cloud profile, student ID, transcripts, papers, diplomas and honors. Sign in with Google again within 5 minutes first. Device guest records and your Google identity remain. In Guest Mode, only device records are deleted. Export first; this cannot be undone.",
      my_danger_confirm_label: "Type DELETE_MY_ANU_ARCHIVE to confirm permanent erasure:",
      my_danger_btn_delete: "Permanently Delete My ANU Archive",
      my_lookup_title: "Public Alumni Card Verification (Only for profiles with explicit public consent)",
      my_lookup_placeholder: "Enter Student ID, e.g. ANU-2026-AB12CD",
      my_lookup_btn: "Verify Public Student Card",
      my_legal_privacy_title: "Privacy Policy",
      my_legal_privacy_body: "1. Data Minimization: When you sign in with Google, we only use your Firebase-verified UID, email (to identify the signed-in account to you), optional display name, and optional avatar URL to maintain your fictional campus profile in Cloudflare D1. 2. Private by Default: Every student profile defaults strictly to Private. Public display requires a separate, explicit opt-in consent and can be revoked anytime. 3. Zero Raw Token Storage in localStorage: Authentication credentials are managed exclusively by the official Firebase Web SDK; ANU Student IDs are display identifiers only and are never accepted as authentication credentials. 4. Archive Deletion: Export or delete your own cloud campus archive under Account Settings. Deletion requires recent Google authentication and explicit confirmation; it does not delete your Google account. Device guest records, security audit logs and private disaster-recovery backups have separate retention boundaries and are not immediately purged by cloud archive deletion.",
      my_legal_terms_title: "Terms of Use",
      my_legal_terms_body: "1. Fictional Parody Notice: Absolutely Nothing University (ANU · freeze.edu.kg) is a satirical humor website and not an accredited institution. All degrees, student IDs, grades, and manuscripts are fictional. 2. Anti-Abuse & Rate Limits: Automated scraping, injection attempts, unauthorized probing, or excessive requests are prohibited; all write endpoints enforce Cloudflare Turnstile, IP/UID rate limiting, and idempotency checks. 3. Administrative Switches: The University reserves the right to pause new registrations, manuscript submissions, or diploma registrations during maintenance.",
      btn_save_diploma_cloud: "Save Diploma to My ANU Cloud Archive",
      footer_link_my_anu: "My ANU Student Portal",
      footer_link_privacy: "Privacy Policy & Terms"
    }
  };

  const excusesByLang = {
    zh: [
      "今日官方请假条：由于被窝产生局部强引力场，特批全天免起床。",
      "今日官方请假条：因昨晚梦见自己在加班，精神损耗过大，特批带薪补觉一日。",
      "今日官方请假条：出门时左脚先迈出导致运势不对称，需退回沙发重新加载。",
      "今日官方请假条：正在进行“人类如果不工作会发生什么”的纵向对照实验，请勿打扰。",
      "今日官方请假条：因过度思考中午吃什么导致算力耗尽，今日暂停一切学术活动。",
      "今日官方请假条：窗外有一只橘猫对我打了个哈欠，经校医院诊断为传染性困倦，特批休假。"
    ],
    en: [
      "Official Excuse Slip: Due to localized strong gravitational fields inside my duvet, I am excused from waking up today.",
      "Official Excuse Slip: Dreamt that I was working last night; granted one full day of compensatory rest.",
      "Official Excuse Slip: Stepped out with my left foot first, causing feng-shui asymmetry; retreating to sofa to reboot.",
      "Official Excuse Slip: Currently serving as the control group in a longitudinal study on 'What Happens If I Do Nothing.'",
      "Official Excuse Slip: CPU overheated while deciding what to order for lunch; all academic duties suspended.",
      "Official Excuse Slip: A neighbourhood cat yawned at me through the window, triggering acute contagious drowsiness."
    ]
  };

  const bulletinsByLang = {
    zh: [
      "原定于今日下午举行的《拖延症导论》期中考试，因出卷教授尚未起床，正式推迟至下个世纪举行。",
      "校医院温馨提示：换季期间请注意保暖，如遇周一综合症发作，建议直接请假至周五下午。",
      "图书馆通告：三楼靠窗第 4 张沙发已被橘座主任征用为终身午睡区，请各位同学绕道发呆。",
      "后勤处喜讯：经过三年零八个月的激烈讨论，关于“是否要讨论食堂加菜”的提案已决定暂缓讨论。",
      "招生办紧急声明：请勿再向我校投递简历，凡是寄来的简历一律折成纸飞机从行政楼顶放飞。",
      "保卫处通知：昨晚有人在自习室偷偷翻了一页书，已对其提出口头警告并没收草稿纸。"
    ],
    en: [
      "The midterm exam for 'Intro to Procrastination' scheduled for this afternoon has been postponed to next century because the professor is still asleep.",
      "Campus Clinic Advisory: If you experience symptoms of Monday Morning Syndrome, we recommend resting in bed until Friday at 5:00 PM.",
      "Library Notice: Sofa #4 by the third-floor window has been requisitioned by Prof. Ginger Cat for a lifelong nap. Please daydream quietly.",
      "Facilities Update: After 3 years of heated debate on whether to hold a meeting about cafeteria snacks, the committee voted to table the discussion.",
      "Admissions Alert: Please stop mailing us resumes. All submitted CVs are folded into paper airplanes and launched from the roof.",
      "Security Bulletin: Someone was caught turning a textbook page in the study hall last night; a gentle warning has been issued."
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
      "Doctor of Couch Fluid Mechanics (沙发流体力学工程博士)",
      "Master of Fine Daydreaming (高级神游与白日梦硕士)",
      "Master of Perfunctory Rhetoric (敷衍修辞与糊弄学硕士)",
      "Master of Culinary Indecision (外卖凑单与餐饮纠结学硕士)",
      "Fellow of Eternal Sabbatical (终身带薪休假荣誉院士)",
      "Bachelor of Unread Messages (已读不回与免打扰学士)",
      "Bachelor of Tactical Truancy (战略翘课与替答到学士)",
      "Postdoctoral Fellow in Duvet Gravity (被窝引力场博士后研究员)"
    ],
    en: [
      "Ph.D. in Pure Nothingness",
      "Doctor of Strategic Procrastination (D.S.P.)",
      "Doctor of Couch Fluid Mechanics (D.C.F.M.)",
      "Master of Fine Daydreaming & Couch Studies",
      "Master of Perfunctory Rhetoric (M.P.R.)",
      "Master of Culinary Indecision & Takeout Studies",
      "Fellow of Eternal Sabbatical (F.E.S.)",
      "Bachelor of Unread Emails & Ghosting",
      "Bachelor of Tactical Truancy (B.T.T.)",
      "Postdoctoral Fellow in Duvet Gravity"
    ]
  };

  const majorOptionsByLang = {
    zh: [
      "死线前10分钟高能爆发力学",
      "退堂鼓古典打击乐与战略放弃",
      "会议室眼神放空与点头工程学",
      "量子态薛定谔考勤与床上办公",
      "外卖满减凑单运筹学与午睡工程",
      "“下次一定”语言哲学与鸽子饲养",
      "带薪如厕流体动力学与工位隐身",
      "新建文件夹分类学与0字节归档",
      "闹钟连响八次免疫学与回笼觉艺术",
      "健身房年卡慈善捐助与云端撸铁",
      "收藏夹吃灰文献学与只买不读研究",
      "平行宇宙彩票中奖资产配置学"
    ],
    en: [
      "Last-Minute Panic & Deadline Physics",
      "Classical Retreat Drumming & Strategic Quitting",
      "Meeting Zoning-Out & Synchronized Nodding",
      "Quantum Bed-Working & Schrödinger Attendance",
      "Takeout Coupon Optimization & Nap Engineering",
      "Philosophy of 'Next Time For Sure'",
      "Paid Restroom Aerodynamics & Desk Cloaking",
      "Empty Folder Taxonomy & Zero-Byte Archiving",
      "Eight-Alarm Immunity & REM Snooze Studies",
      "Gym Membership Philanthropy & Imaginary Cardio",
      "Bookmarked Tutorial Hoarding & Unread Bibliography",
      "Parallel-Universe Lottery Asset Allocation"
    ]
  };

  const honorTitlesByLang = {
    zh: [
      "Summa Cum Somno（最高睡眠荣誉优等）",
      "Magna Cum Pigritia（特等倦怠学术勋章）",
      "Ordo Tympani Receptus（皇家退堂鼓一级骑士）",
      "Custos Pulvinaris（图书馆金枕头终身守护者）",
      "Doctor Inactionis Illustris（杰出不作为紫绶学士）",
      "Socius Felis Aurantii（橘座大主任钦点摸鱼会士）",
      "Eques Lecti Calidi（温室被窝引力场荣誉勋爵）",
      "Sine Labore Laureatus（零汗水桂冠得主）"
    ],
    en: [
      "Summa Cum Somno (With Highest Sleep Honors)",
      "Magna Cum Pigritia (With Great Slacking Distinction)",
      "Ordo Tympani Receptus (Knight of the Retreat Drum)",
      "Custos Pulvinaris (Keeper of the Golden Pillow)",
      "Doctor Inactionis Illustris (Distinguished Fellow of Inaction)",
      "Socius Felis Aurantii (Approved by Prof. Ginger Cat)",
      "Eques Lecti Calidi (Order of the Warm Duvet)",
      "Sine Labore Laureatus (Laureate of Zero Effort)"
    ]
  };

  const certTemplatesByLang = {
    zh: [
      { id: "oxford", label: "牛津皇家蓝经典学院卷 (Oxford Royal Classic)" },
      { id: "parchment", label: "鎏金复古羊皮荣誉卷 (Gilded Vellum Parchment)" },
      { id: "minimal", label: "极简现代虚无几何卷 (Minimalist Void Edition)" }
    ],
    en: [
      { id: "oxford", label: "Oxford Royal Classic" },
      { id: "parchment", label: "Gilded Vellum Parchment" },
      { id: "minimal", label: "Minimalist Void Edition" }
    ]
  };

  const citationOptionsByLang = {
    zh: [
      { label: "把五分钟的工作拖延至三个月并最终顺其自然取消", value: "因成功把五分钟的工作拖延至三个月并最终顺其自然取消，特发此证，" },
      { label: "在三小时周会中保持睁眼睡眠且未被察觉", value: "因在长达三小时的周会中保持睁眼睡眠且未被任何人察觉，特发此证，" },
      { label: "新建 84 个名为“最终版_打死不改”的空文件夹", value: "因新建了 84 个名为“最终版_打死不改_v9”的空文件夹，特发此证，" },
      { label: "连续一整天盯着屏幕思考吃什么而未敲一行字", value: "因连续一整天盯着屏幕思考中午吃什么而未敲下一行字，特发此证，" },
      { label: "买齐全部专业书籍后将其完美用作显示器增高架", value: "因买齐全部精装专业书后将其完美用作显示器增高架且未翻开一页，特发此证，" },
      { label: "在群聊中以 0.03 秒极速复制粘贴“收到”维持隐身", value: "因在工作群中以 0.03 秒极速跟队形回复“收到”而完全没看通知内容，特发此证，" }
    ],
    en: [
      { label: "Stretched a 5-minute task into 3 months until it was canceled", value: "For heroically stretching a 5-minute task into three months until it canceled itself, " },
      { label: "Slept with eyes open through a 3-hour weekly meeting undetected", value: "For sleeping with eyes wide open through a three-hour meeting without anyone noticing, " },
      { label: "Created 84 empty folders named 'Final_V9_Real_Final'", value: "For creating 84 empty folders named 'Final_V9_Actually_Final' and calling it a day, " },
      { label: "Stared at the screen all day contemplating lunch without typing a word", value: "For staring at a blank monitor all day contemplating lunch without typing a single character, " },
      { label: "Used 12 unopened hardcover textbooks exclusively as a monitor stand", value: "For purchasing twelve hardcover textbooks and using them exclusively as an ergonomic monitor stand, " },
      { label: "Replied 'Got it!' in 0.03s in group chat without reading a single word", value: "For replying 'Sounds good!' within 0.03 seconds in group chat without reading the announcement, " }
    ]
  };

  const randomNamesByLang = {
    zh: [
      "周日晚上开始写作业选手",
      "会议静音吃薯片专家",
      "薛定谔的早起人",
      "奶茶三分糖去冰研究员",
      "被窝引力场捕获者",
      "闹钟连响八次不醒学者",
      "收藏夹从未打开过博士",
      "退堂鼓首席定音鼓手"
    ],
    en: [
      "Sir Snoozes-a-Lot",
      "Chief Mute-Button Snack Officer",
      "Schrödinger's Early Bird",
      "Duvet Gravitational Captive",
      "Lord of 47 Unread Slack Channels",
      "Eight-Alarm Survivor",
      "Baron of Unwatched Bookmarks",
      "Grandmaster of the Snooze Button"
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
        profBio: "司马改天教授，1998 年获颁本校拖延学博士（毕业论文预计 2045 年补交），擅长把任何五分钟的行政表格拖到系统自动关闭。",
        desc: "深入剖析“先泡杯茶、再清理桌面、顺便重装系统”的完整心理防御机制，手把手指导学生将一封三句话的邮件拖延至跨年。",
        syllabus: [
          "第 1–3 周：战略性准备——如何花三周时间挑选一支手感最好的签字笔",
          "第 4–6 周：环境清理仪式——为什么写报告前必须先给电脑桌面图标按颜色排序",
          "第 7–9 周：黄道吉日测算——论“今天是周四不适合开工，不如等下周一”的数理依据",
          "第 10–12 周：顺其自然结项——当拖延时间超过需求方的记忆半衰期，任务自动消失"
        ],
        grading: "按时交作业者直接挂科（0%）；死线后一周补交得 B（50%）；彻底忘记有这门课者直接获评 A+ 模范标兵（100%）。",
        book: "《从入门到放弃：全新未拆封空白笔记本》（第 17 版，买来垫显示器即可）",
        quiz: [
          {
            q: "1. 周一早上 9:00 收到一封只需回复“好的”的邮件，标准操作是？",
            options: [
              { text: "立刻回复“好的”", score: 10 },
              { text: "先去泡杯枸杞茶，然后标记未读留到下个月", score: 50 },
              { text: "新建一个《邮件回复战略规划_v1》空文件夹后去睡回笼觉", score: 40 }
            ]
          },
          {
            q: "2. 距离截稿还有 6 小时，你发现文档还是 0 字，此时应当？",
            options: [
              { text: "奋笔疾书赶完稿件", score: 5 },
              { text: "先花 4 小时挑选正文字体和页边距，再点一份夜宵压惊", score: 50 },
              { text: "向导师发送题为《关于推迟死线的可行性研究》的空白邮件", score: 45 }
            ]
          }
        ]
      },
      {
        code: "RET-202",
        title: "退堂鼓古典打击乐与战略性放弃",
        deptKey: "retreat",
        deptName: "退堂鼓与战略放弃学院",
        credits: "0.0",
        room: "被窝远程连线",
        prof: "堂吉诃退 院士",
        profBio: "堂吉诃退院士，退堂鼓国家重点实验室终身首席，曾创下在立完新年 Flag 后 14 秒内宣布放弃的世界纪录。",
        desc: "系统传授在立完新年 Flag 后第 3 分钟精准击响退堂鼓的腕部发力技巧，实现“只要我不开始，就不会失败”的哲学闭环。",
        syllabus: [
          "第 1–3 周：鼓槌握法与腕部发力——如何在遇到第一道微积分题时优雅合上书本",
          "第 4–6 周：体面撤退话术——精通“其实我也没那么想要”“顺其自然吧”等十二种核心句式",
          "第 7–9 周：沉没成本免疫学——如何心安理得地把买来的考研资料拿去垫泡面",
          "第 10–12 周：毕业汇报演出——全班整齐划一宣布放弃期末考试并就地解散"
        ],
        grading: "第一周即办理退课者直接获得满分学分；坚持听完第二节课者需补交检讨。",
        book: "《算了吧，也没多重要》（精装空白画册）",
        quiz: [
          {
            q: "1. 当你元旦立下“今年每天晨跑五公里”的 Flag 后，第二天早上正在下雨，你应该？",
            options: [
              { text: "穿雨衣坚持跑完", score: 0 },
              { text: "宣布这是老天爷暗示我今年适合冬眠，当场注销运动 App", score: 50 },
              { text: "在床上蹬两下腿视同已完成半程马拉松", score: 45 }
            ]
          },
          {
            q: "2. 退堂鼓交响乐团最经典的代表曲目《算了吧》全曲共有几个音符？",
            options: [
              { text: "0 个音符（指挥抬手瞬间宣布解散吃烤肉）", score: 50 },
              { text: "1 个鼓点（咚！）", score: 35 },
              { text: "108 个完整乐章", score: 5 }
            ]
          }
        ]
      },
      {
        code: "PRF-305",
        title: "会议室眼神放空与高频点头工程学",
        deptKey: "perfunctory",
        deptName: "高级糊弄与会议放空系",
        credits: "0.0",
        room: "Zoom 静音房",
        prof: "伊丽莎白·行吧 教授",
        profBio: "伊丽莎白·行吧教授，国际敷衍学会终身荣誉会长，擅长用“嗯嗯、确实、回头对齐”应付长达八小时的跨部门研讨会。",
        desc: "训练学生在长达四小时的汇报中保持每分钟 4.2 次微幅点头、眉头微蹙若有所思，同时大脑完整重温八十集经典古装连续剧。",
        syllabus: [
          "第 1–3 周：面部微表情锁定——如何让眉头保持“深度思考”而大脑处于待机屏保态",
          "第 4–6 周：万能金句接龙——在突然被点名时脱口而出“我非常同意刚才那位同事的底层逻辑”",
          "第 7–9 周：屏幕共享障眼法——如何把小说窗口伪装成 Excel 宏代码表格",
          "第 10–12 周：睁眼 REM 睡眠实战——在摄像头开启状态下完成 45 分钟高质量午睡"
        ],
        grading: "期末考核为连续回复十句“确实”“有道理”“回去对齐一下”而不露破绽。",
        book: "《糊弄学大辞典：从“收到”到“下次一定”》",
        quiz: [
          {
            q: "1. 开会走神时突然被主持人问“你对刚才的方案怎么看？”，最稳妥的回答是？",
            options: [
              { text: "老实承认自己刚才在想中午吃什么", score: 25 },
              { text: "推一下眼镜说：“整体方向很有启发性，具体颗粒度我们可以会后拉齐”", score: 50 },
              { text: "假装网络卡顿保持面部静止 15 秒后直接退会", score: 48 }
            ]
          },
          {
            q: "2. 会议眼神放空的最高境界是什么？",
            options: [
              { text: "认真做满十页会议纪要", score: 0 },
              { text: "一边频率精准点头，一边在脑海里把今晚火锅蘸料配方调配完毕", score: 50 },
              { text: "用贴纸把摄像头糊住", score: 35 }
            ]
          }
        ]
      },
      {
        code: "DRM-108",
        title: "阳光午后沙发流体力学与深度呼噜",
        deptKey: "daydream",
        deptName: "神游太虚与午睡工程学院",
        credits: "0.0",
        room: "图书馆三楼绒布沙发",
        prof: "橘座大主任 (猫)",
        profBio: "橘座大主任，三花与橘猫混血终身正教授，全校唯一拥有独立天鹅绒午睡专座的博导，H-index 为 999 罐金枪鱼。",
        desc: "研究人体在饭后 13:15 与绒布沙发接触时的液化相变过程，掌握在闹钟响起时将其无缝编织进梦境剧本的高阶技能。",
        syllabus: [
          "第 1–3 周：猫科液体静力学——学习如何像橘猫一样完全贴合沙发缝隙",
          "第 4–6 周：阳光入射角追踪——随太阳移动在地板上缓慢翻滚的最佳速率",
          "第 7–9 周：闹钟梦境植入法——把刺耳的闹钟声脑补成梦里皇家游轮的汽笛声",
          "第 10–12 周：深度呼噜声学共振——通过均匀呼噜声催眠方圆五米内的所有同学"
        ],
        grading: "呼吸均匀即及格，打呼噜自带混响者加授院级奖章。",
        book: "无需教材（建议直接拿枕头代替）",
        quiz: [
          {
            q: "1. 下午 14:00 阳光正好照在沙发上，此时人类脊柱处于什么物理形态？",
            options: [
              { text: "刚体直立态", score: 5 },
              { text: "非牛顿流体瘫软态（与沙发垫实现分子级融合）", score: 50 },
              { text: "高速运转态", score: 0 }
            ]
          },
          {
            q: "2. 面对橘座大主任的随堂抽查，如何直接获得满分？",
            options: [
              { text: "递上一根猫条并陪它一起打个哈欠", score: 50 },
              { text: "背诵流体力学方程", score: 5 },
              { text: "轻轻帮它盖上小毛毯", score: 48 }
            ]
          }
        ]
      },
      {
        code: "NTH-404",
        title: "死线前 10 分钟肾上腺素超光速物理",
        deptKey: "procrastination",
        deptName: "量子拖延与死线实验室",
        credits: "0.0",
        room: "23:50 的书桌前",
        prof: "司马改天 教授",
        profBio: "司马改天教授，死线物理学奠基人，曾证明“只要截止时间还没到最后十秒，人类的生产力恒等于零”。",
        desc: "探索人类在 23:59 截止提交前 9 分钟突破打字速度物理极限的相对论效应，证明“生产力与剩余时间成反比”宇宙定律。",
        syllabus: [
          "第 1–3 周：死线第一定律——为什么提前两周布置的作业直到最后两小时才存在",
          "第 4–6 周：23:55 键盘残影术——肾上腺素飙升下的每分钟 800 击键极限",
          "第 7–9 周：压哨上传惊魂学——在 23:59:58 点击提交按钮的心率控制",
          "第 10–12 周：断网甩锅应急预案——如何优雅地将未交作业归咎于太阳黑子爆发"
        ],
        grading: "23:59:59 压哨提交或因断网顺延者获评优秀。",
        book: "《今晚通宵明天一定早睡》（科幻小说分册）",
        quiz: [
          {
            q: "1. 一项为期 30 天的课题，99% 的有效工作量通常在哪个时间段完成？",
            options: [
              { text: "前 29 天均匀完成", score: 0 },
              { text: "截止前最后 15 分钟（伴随浓烈的冰美式与灵魂出窍）", score: 50 },
              { text: "截止后第 3 天苦苦哀求延期时", score: 45 }
            ]
          },
          {
            q: "2. 当时间来到 23:59:50 而文件还没传上去时，物理学上会发生什么？",
            options: [
              { text: "校园网带宽自动坍缩为 1 KB/s，触发薛定谔提交态", score: 50 },
              { text: "一切顺利提交", score: 10 },
              { text: "果断合上电脑假装今天是周日", score: 45 }
            ]
          }
        ]
      },
      {
        code: "PRF-210",
        title: "空文件夹命名艺术：从 v1 到打死不改版",
        deptKey: "perfunctory",
        deptName: "高级糊弄与会议放空系",
        credits: "0.0",
        room: "桌面新建文件夹(99)",
        prof: "伊丽莎白·行吧 教授",
        profBio: "伊丽莎白·行吧教授，个人电脑桌面拥有 1,024 个嵌套空文件夹，其代表作《新建文件夹 (副本) (2).zip》重达 0 字节。",
        desc: "探讨如何通过创建结构严谨的文件夹目录来产生“工作已经完成了一大半”的饱满成就感，然后安心去吃夜宵。",
        syllabus: [
          "第 1–3 周：Ctrl+N 的多巴胺机制——为什么建好文件夹就等于完成了项目启动",
          "第 4–6 周：版本号膨胀修辞学——从“初稿”到“终版_真终版_打死不改版_v18”",
          "第 7–9 周：零字节压缩包制作——如何生成一个打不开的损坏附件以争取三天缓冲期",
          "第 10–12 周：桌面全选归档术——把满屏乱七八糟的文件一键塞进《2026待整理》"
        ],
        grading: "提交一个 0 字节的 .zip 压缩包并声称文件损坏即可满分通过。",
        book: "《Ctrl+N 的精神慰藉》",
        quiz: [
          {
            q: "1. 以下哪个文件夹命名最符合本院“形式主义满级、内容零字节”的美学标准？",
            options: [
              { text: "work_2026", score: 10 },
              { text: "【绝密】2026年度核心战略总纲_最终定稿_打死不改_v99_凌晨三点版", score: 50 },
              { text: "新建文件夹 (404)", score: 45 }
            ]
          },
          {
            q: "2. 建完上述精密的目录结构后，下一步标准流程是？",
            options: [
              { text: "立刻开始往里面写文档", score: 0 },
              { text: "深感今日工作量巨大，奖励自己点一份烧烤并刷两小时短视频", score: 50 },
              { text: "截图发给老板证明项目框架已搭建完毕", score: 48 }
            ]
          }
        ]
      },
      {
        code: "RET-330",
        title: "健身房年卡慈善捐助与洗澡导论",
        deptKey: "retreat",
        deptName: "退堂鼓与战略放弃学院",
        credits: "0.0",
        room: "办卡柜台（仅去一次）",
        prof: "堂吉诃退 院士",
        profBio: "堂吉诃退院士，连续十二年赞助周边五家健身房年卡，累计出勤次数为 0，被授予“健身行业最佳慈善天使”称号。",
        desc: "阐述“办卡即瘦身、买书即读完、收藏即学会”的量子纠缠等效原理，彻底消除不去健身房的道德负罪感。",
        syllabus: [
          "第 1–3 周：办卡瞬间的卡路里燃烧——论刷卡付款时的心跳加速等效于有氧运动 30 分钟",
          "第 4–6 周：装备选购玄学——买了全套专业速干衣为什么更适合穿着躺沙发吃薯片",
          "第 7–9 周：淋浴间水资源利用——去健身房只洗澡不碰器械的尊贵路线规划",
          "第 10–12 周：二手平台转卡文学——如何撰写感人肺腑的“因工作调动忍痛转让全新年卡”文案"
        ],
        grading: "全年去健身房不超过 1 次（含办卡当天）者自动保研。",
        book: "《我的瑜伽垫为什么长草了》",
        quiz: [
          {
            q: "1. 根据本校“量子等效原理”，当你把一篇《30天练出腹肌》的视频加入收藏夹时，发生了什么？",
            options: [
              { text: "什么也没发生，还得自己练", score: 5 },
              { text: "我的大脑和收藏夹已完成云端健身，可安心喝一杯全糖波霸奶茶", score: 50 },
              { text: "腹肌已在平行宇宙生成完毕", score: 48 }
            ]
          },
          {
            q: "2. 买的哑铃在家里最核心的工程学用途是什么？",
            options: [
              { text: "每天举铁 100 下", score: 0 },
              { text: "压泡面盖子、挡门以及挂外套", score: 50 },
              { text: "放在角落里培养沉思气氛", score: 42 }
            ]
          }
        ]
      },
      {
        code: "DRM-499",
        title: "如果当初中了五千万：平行宇宙资产配置",
        deptKey: "daydream",
        deptName: "神游太虚与午睡工程学院",
        credits: "0.0",
        room: "发呆窗台前",
        prof: "阿尔伯特·摸鱼斯坦 校长",
        profBio: "摸鱼斯坦校长亲自授课（通常由录音机代播呼噜声），已在脑海中花光了三百次头奖奖金，但至今未买过一张彩票。",
        desc: "手把手推演中奖后如何低调领奖、穿什么面具、买哪座海岛、以及如何优雅地向老板递交空白辞职信，尽管从未买过彩票。",
        syllabus: [
          "第 1–3 周：领奖头套美学——对比小黄人、奥特曼与橘猫头套的防熟人识别率",
          "第 4–6 周：存银行吃利息算术——精确到小数点后四位计算每天躺在床上能领多少利息",
          "第 7–9 周：亲戚借钱防御矩阵——如何在尚未买彩票前就提前演练拒绝七大姑八大姨",
          "第 10–12 周：梦醒时分软着陆——当闹钟响起发现账户余额仍是两位数时的心理重建"
        ],
        grading: "白日梦情节越细腻、越脱离现实，平时分越高。",
        book: "《意念富豪榜年度报告》",
        quiz: [
          {
            q: "1. 规划“中五千万后怎么花”时，最关键的前提条件是什么？",
            options: [
              { text: "先去买一张彩票", score: 10 },
              { text: "绝不买彩票（省下 2 块钱巨款，纯靠意念推导利息）", score: 50 },
              { text: "先挑好领奖时穿哪套玩偶服", score: 46 }
            ]
          },
          {
            q: "2. 当你在发呆中已经纠结到“私人游艇停在哪个码头物业费更划算”时，说明？",
            options: [
              { text: "你具备极高的平行宇宙金融素养，可直接获授本校荣誉博士", score: 50 },
              { text: "该醒醒继续搬砖了", score: 5 },
              { text: "应该再买一座私人岛屿免去停泊费", score: 48 }
            ]
          }
        ]
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
        prof: "Prof. Sima Tomorrow",
        profBio: "Prof. Sima Tomorrow earned his Ph.D. in Delay Studies in 1998 (dissertation pending submission in 2045) and specializes in stretching 5-minute forms until the portal expires.",
        desc: "An in-depth study of the psychological defense sequence: 'brew tea first, reorganize desktop icons, then reinstall the OS,' guiding students to delay a three-sentence email until next year.",
        syllabus: [
          "Weeks 1–3: Strategic Preparation — Spending three weeks selecting the optimal fountain pen",
          "Weeks 4–6: Pre-Task Rituals — Why desktop icons must be sorted by hue before writing a memo",
          "Weeks 7–9: Cosmic Timing — Mathematical proof that Thursday is too close to the weekend to start",
          "Weeks 10–12: Natural Expiration — Waiting until the requester forgets what they asked for"
        ],
        grading: "Submitting on time results in an automatic F (0%); 1 week late earns a B (50%); completely forgetting the course exists earns an A+ (100%).",
        book: "From Ambition to Surrender: Unopened Blank Notebook (17th Ed., use as monitor stand)",
        quiz: [
          {
            q: "1. At 9:00 AM Monday, you receive an email requiring a two-word reply ('Sounds good'). What is the standard protocol?",
            options: [
              { text: "Reply immediately", score: 10 },
              { text: "Brew herbal tea, mark as unread, and revisit next month", score: 50 },
              { text: "Create an empty folder named 'Email_Strategy_v1' and take a nap", score: 45 }
            ]
          },
          {
            q: "2. With 6 hours left before a deadline and 0 words written, you should:",
            options: [
              { text: "Write furiously to finish on time", score: 5 },
              { text: "Spend 4 hours choosing fonts and margins, then order midnight snacks", score: 50 },
              { text: "Email the professor a blank attachment titled 'Corrupted_Draft_Final.zip'", score: 46 }
            ]
          }
        ]
      },
      {
        code: "RET-202",
        title: "Classical Retreat Drumming & Strategic Quitting",
        deptKey: "retreat",
        deptName: "College of Strategic Giving Up",
        credits: "0.0",
        room: "Under the Duvet (Remote)",
        prof: "Academician Don Quixote-Quit",
        profBio: "Principal Virtuoso of the National Retreat Drumming Lab; holds the world record for abandoning a New Year's resolution within 14 seconds.",
        desc: "Master the wrist technique required to beat a hasty retreat within 3 minutes of making a New Year's resolution, achieving the philosophical nirvana of 'You cannot fail what you never start.'",
        syllabus: [
          "Weeks 1–3: Drumstick Ergonomics — Closing the textbook gracefully upon seeing Equation 1",
          "Weeks 4–6: Dignified Exit Rhetoric — Mastering 'I never really wanted it anyway'",
          "Weeks 7–9: Sunk-Cost Immunity — Using expensive exam prep books as instant-noodle lids",
          "Weeks 10–12: Grand Finale — Unanimously voting to cancel the final exam and get barbecue"
        ],
        grading: "Dropping the class in Week 1 grants full honours credit; attending Lecture 2 requires a written apology.",
        book: "Never Mind, It Wasn't That Important Anyway (Hardcover Blank Album)",
        quiz: [
          {
            q: "1. After resolving on Jan 1st to jog 5km daily, it drizzles on Jan 2nd. You should:",
            options: [
              { text: "Put on a raincoat and run anyway", score: 0 },
              { text: "Declare it a cosmic omen for hibernation and uninstall all fitness apps", score: 50 },
              { text: "Stretch your legs twice under the duvet and log it as a half-marathon", score: 45 }
            ]
          },
          {
            q: "2. How many notes are in the Retreat Symphony Orchestra's magnum opus 'Never Mind'?",
            options: [
              { text: "Zero notes (the orchestra disbands for barbecue before the downbeat)", score: 50 },
              { text: "One single drum thud", score: 35 },
              { text: "Four full symphonic movements", score: 5 }
            ]
          }
        ]
      },
      {
        code: "PRF-305",
        title: "Meeting Zoning-Out & Synchronized Nodding",
        deptKey: "perfunctory",
        deptName: "Dept. of Meeting Zoning-Out",
        credits: "0.0",
        room: "Muted Zoom Room",
        prof: "Dr. Elizabeth Whatever",
        profBio: "President Emerita of the International Perfunctory Association; famous for surviving 8-hour workshops using only 'Makes sense' and 'Let's circle back.'",
        desc: "Train your facial muscles to maintain 4.2 thoughtful nods per minute with a furrowed brow during four-hour town halls while mentally rewatching three seasons of your favorite show.",
        syllabus: [
          "Weeks 1–3: Micro-Expression Locking — Looking deeply analytical while your brain displays a screensaver",
          "Weeks 4–6: Buzzword Reflexes — Saying 'I align with the underlying synergy' when cold-called",
          "Weeks 7–9: Screen-Share Camouflage — Disguising novels as spreadsheet pivot tables",
          "Weeks 10–12: Open-Eye REM Sleep — Achieving 45 minutes of restorative sleep with webcam on"
        ],
        grading: "Final exam consists of replying 'makes sense,' 'let's circle back,' and '100%' ten times without breaking character.",
        book: "The Encyclopedia of Half-Hearted Replies",
        quiz: [
          {
            q: "1. While daydreaming in a meeting, someone suddenly asks for your thoughts. Best response?",
            options: [
              { text: "Admit you were thinking about lunch", score: 25 },
              { text: "Adjust glasses: 'The high-level direction is solid; let's align on granularity offline'", score: 50 },
              { text: "Freeze completely for 15 seconds pretending your Wi-Fi dropped", score: 48 }
            ]
          },
          {
            q: "2. What is the pinnacle of Meeting Zoning-Out engineering?",
            options: [
              { text: "Taking ten pages of detailed notes", score: 0 },
              { text: "Nodding rhythmically while mentally perfecting your hotpot dipping sauce recipe", score: 50 },
              { text: "Putting a sticky note over the webcam", score: 35 }
            ]
          }
        ]
      },
      {
        code: "DRM-108",
        title: "Sunlit Sofa Fluid Mechanics & Deep Purring",
        deptKey: "daydream",
        deptName: "Institute of Nap Engineering",
        credits: "0.0",
        room: "Library 3F Velvet Couch",
        prof: "Prof. Ginger (Cat)",
        profBio: "Tenured Feline Chair of Somnology; the only faculty member with a dedicated velvet sofa and an H-index of 999 cans of prime tuna.",
        desc: "Investigates the liquid phase transition of the human spine upon contacting a velvet sofa at 1:15 PM, plus advanced techniques for weaving alarm bells into your dream plot.",
        syllabus: [
          "Weeks 1–3: Feline Hydrostatics — Conforming seamlessly to sofa cushions like a liquid cat",
          "Weeks 4–6: Solar Incidence Tracking — Rolling across the floor at the exact speed of sunbeams",
          "Weeks 7–9: Alarm Dream Integration — Reinterpreting morning alarms as cruise ship horns",
          "Weeks 10–12: Acoustic Purr Resonance — Inducing collective naps within a 5-meter radius"
        ],
        grading: "Steady breathing passes; acoustic snoring with natural reverb earns the Dean's Medal.",
        book: "No textbook required (use a pillow instead)",
        quiz: [
          {
            q: "1. When 2:00 PM sunlight hits the library velvet sofa, the human spine transitions into:",
            options: [
              { text: "Rigid upright posture", score: 5 },
              { text: "Non-Newtonian liquid state (molecular fusion with the sofa cushion)", score: 50 },
              { text: "High-efficiency productivity mode", score: 0 }
            ]
          },
          {
            q: "2. How do you earn an instant A+ from Prof. Ginger?",
            options: [
              { text: "Offer freeze-dried salmon and join him for an afternoon yawn", score: 50 },
              { text: "Recite Navier-Stokes equations", score: 5 },
              { text: "Tuck a warm blanket around his paws", score: 48 }
            ]
          }
        ]
      },
      {
        code: "NTH-404",
        title: "Relativistic Typing 10 Minutes Before Deadline",
        deptKey: "procrastination",
        deptName: "Quantum Procrastination Lab",
        credits: "0.0",
        room: "Desk at 11:50 PM",
        prof: "Prof. Sima Tomorrow",
        profBio: "Founder of Deadline Relativistic Mechanics; proved that human productivity remains strictly zero until T-minus 10 minutes.",
        desc: "Explores how human fingers break the speed of light nine minutes before a 11:59 PM deadline, proving the cosmic law that productivity is inversely proportional to time remaining.",
        syllabus: [
          "Weeks 1–3: First Law of Deadlines — Why assignments given a month ago only exist in the final hour",
          "Weeks 4–6: 11:55 PM Keyboard Afterimage — Typing at 800 WPM fueled by pure adrenaline",
          "Weeks 7–9: Buzzer-Beater Uploads — Clicking Submit at 23:59:58 without cardiac arrest",
          "Weeks 10–12: Solar Flare Excuses — Blaming missing attachments on cosmic radiation"
        ],
        grading: "Submitting at 11:59:59 PM or blaming Wi-Fi outage receives Highest Distinction.",
        book: "I Will Definitely Sleep Early Tomorrow (Sci-Fi Anthology)",
        quiz: [
          {
            q: "1. For a 30-day project, when is 99% of the actual work completed?",
            options: [
              { text: "Evenly across the first 29 days", score: 0 },
              { text: "In the final 15 minutes before 11:59 PM", score: 50 },
              { text: "Three days after the deadline while begging for an extension", score: 45 }
            ]
          },
          {
            q: "2. What happens to campus Wi-Fi at 23:59:50 when you click Upload?",
            options: [
              { text: "Bandwidth collapses to 1 KB/s, entering a Schrödinger submission state", score: 50 },
              { text: "It uploads instantaneously", score: 10 },
              { text: "You close the laptop and pretend today is Sunday", score: 45 }
            ]
          }
        ]
      },
      {
        code: "PRF-210",
        title: "Empty Folder Taxonomy: From v1 to Final_Real_v9",
        deptKey: "perfunctory",
        deptName: "Dept. of Meeting Zoning-Out",
        credits: "0.0",
        room: "Desktop/New Folder (99)",
        prof: "Dr. Elizabeth Whatever",
        profBio: "Maintains 1,024 nested empty folders on her desktop; author of the acclaimed 0-byte archive 'Final_Draft_Copy(2).zip'.",
        desc: "How to generate an overwhelming sense of accomplishment simply by creating a meticulously nested folder hierarchy—and then rewarding yourself with a midnight snack.",
        syllabus: [
          "Weeks 1–3: Dopamine of Ctrl+N — Why creating a folder feels like finishing 80% of the job",
          "Weeks 4–6: Version Inflation — Naming files 'Final_v2_RealFinal_DoNotTouch_v19'",
          "Weeks 7–9: Zero-Byte Zip Craft — Engineering unopenable archives to buy a 3-day extension",
          "Weeks 10–12: Desktop Sweep — Dragging 200 loose icons into a single folder named 'To_Sort_2026'"
        ],
        grading: "Upload a 0-byte corrupted .zip archive and claim technical difficulties for 100% credit.",
        book: "The Spiritual Comfort of Ctrl+N",
        quiz: [
          {
            q: "1. Which folder name best exemplifies our department's 0-byte aesthetic?",
            options: [
              { text: "project_files", score: 10 },
              { text: "[CONFIDENTIAL]_2026_Master_Plan_Final_ActuallyFinal_3AM_v99", score: 50 },
              { text: "New Folder (404)", score: 45 }
            ]
          },
          {
            q: "2. Immediately after creating a neat 5-level folder tree, you should:",
            options: [
              { text: "Start writing the actual document", score: 0 },
              { text: "Celebrate a hard day's work by ordering barbecue and watching videos", score: 50 },
              { text: "Send a screenshot of the empty folders as a progress update", score: 48 }
            ]
          }
        ]
      },
      {
        code: "RET-330",
        title: "Gym Membership Philanthropy & Shower Studies",
        deptKey: "retreat",
        deptName: "College of Strategic Giving Up",
        credits: "0.0",
        room: "Sign-Up Counter (Once)",
        prof: "Academician Don Quixote-Quit",
        profBio: "Has sponsored five local gyms for 12 consecutive years with 0 visits, earning the 'Philanthropist of Fitness' medal.",
        desc: "Establishes the quantum equivalence principle that 'buying a gym pass equals working out, buying a book equals reading it, and bookmarking a tutorial equals mastering it.'",
        syllabus: [
          "Weeks 1–3: Card-Swipe Cardio — How paying for a membership elevates heart rate like a 5K run",
          "Weeks 4–6: Athleisure Couch Testing — Why breathable running gear is ideal for eating chips",
          "Weeks 7–9: Hydro-Thermal Routing — Visiting the gym exclusively for the sauna and shower",
          "Weeks 10–12: Secondhand Listing Prose — Writing 'Relocating, selling pristine gym card' ads"
        ],
        grading: "Visiting the gym no more than once a year (including registration day) guarantees direct Ph.D. admission.",
        book: "Why Moss Is Growing on My Yoga Mat",
        quiz: [
          {
            q: "1. By the Quantum Equivalence Principle, bookmarking a '30-Day Abs' video means:",
            options: [
              { text: "You still have to do the situps", score: 5 },
              { text: "Your cloud avatar completed the workout; reward yourself with boba tea", score: 50 },
              { text: "Your abs now exist in a parallel universe", score: 48 }
            ]
          },
          {
            q: "2. What is the primary household function of a pair of dumbbells?",
            options: [
              { text: "Daily strength training", score: 0 },
              { text: "Holding down instant-noodle lids and propping open doors", score: 50 },
              { text: "Collecting dust in a contemplative corner", score: 42 }
            ]
          }
        ]
      },
      {
        code: "DRM-499",
        title: "Parallel-Universe Asset Allocation After Winning the Lottery",
        deptKey: "daydream",
        deptName: "Institute of Nap Engineering",
        credits: "0.0",
        room: "By the Window",
        prof: "Chancellor Albert Slackingstein",
        profBio: "Taught personally by Chancellor Slackingstein (via pre-recorded snoring); has mentally spent $500M in jackpot winnings without ever buying a ticket.",
        desc: "Step-by-step simulation of which cartoon mask to wear when claiming a $50M jackpot, which private island to buy, and how to hand in a blank resignation letter—despite never buying a ticket.",
        syllabus: [
          "Weeks 1–3: Disguise Aerodynamics — Comparing dinosaur, minion, and ginger-cat costumes for prize claiming",
          "Weeks 4–6: Passive Interest Arithmetic — Calculating daily bed-lying yield to four decimal places",
          "Weeks 7–9: Relative Defense Matrix — Rehearsing how to decline distant cousins asking for loans",
          "Weeks 10–12: Post-Dream Soft Landing — Coping when the alarm rings and your balance is $12.40"
        ],
        grading: "The more detached from reality your daydream portfolio is, the higher your GPA.",
        book: "Annual Report of Imaginary Billionaires",
        quiz: [
          {
            q: "1. What is the foundational rule when planning how to spend a $50M lottery jackpot?",
            options: [
              { text: "Buy a lottery ticket first", score: 10 },
              { text: "Never buy a ticket (save $2 for snacks and rely 100% on pure imagination)", score: 50 },
              { text: "Pick out your mascot costume for the press conference first", score: 46 }
            ]
          },
          {
            q: "2. If you spend 2 hours debating yacht mooring fees in Monaco while staring at a wall, it means:",
            options: [
              { text: "You possess elite parallel-universe wealth management skills (Grade: A+)", score: 50 },
              { text: "You should get back to work", score: 5 },
              { text: "You should buy a private island to waive mooring fees", score: 48 }
            ]
          }
        ]
      }
    ]
  };

  const papersByLang = {
    zh: [
      {
        doi: "VOID-ID: ANU.NULL.2026.001",
        journal: "Nature: Nothing · Vol. 404",
        title: "论什么都不做对避免犯错的决定性贡献：一项为期十年的空白对照实验",
        authors: "张躺平¹, 李改天², 橘座(猫)³ · 绝对虚无大学高等摸鱼研究院",
        citations: "被引次数：∞ 次（全靠作者梦里自引）",
        content: "[ 全文完 · 本论文正文共 0 字，耗资 0 元，未伤害任何脑细胞 ]",
        footnote: "注：作者原计划撰写三万字综述，后因下午茶太好吃而作罢。",
        reviewerHeader: "同行评审专家委员会裁决 (3 位匿名盲审专家全票通过)：",
        review: "【审稿人 #1 · 诺贝尔睡眠奖得主】：“这是我审稿生涯中读过最清爽的一篇论文！没有任何语法错误，没有任何数据造假，因为根本没有数据。”\n【审稿人 #2 · 资深鸽学博导】：“实验可重复性高达 100%，本审稿人躺在沙发上当场复现成功。”\n【审稿人 #3 · 橘座大主任】：“喵呜！（已踩肉垫章，推荐为封面文章）”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.002",
        journal: "Journal of Pure Procrastination · Issue 0",
        title: "基于“下次一定”算法的无限期任务推迟模型及其在周报中的应用",
        authors: "司马改天¹, 王算了² · 量子拖延与死线实验室",
        citations: "被引次数：0 次（审稿人说改天再看）",
        content: "摘要：待补充…… 引言：明天写…… 实验结果：略…… 结论：算了吧……",
        footnote: "致谢：感谢外卖小哥在截稿前送来的炸鸡，使作者彻底放弃了写作。",
        reviewerHeader: "同行评审专家委员会裁决 (特快免审通道)：",
        review: "【审稿人 #1】：“作者将拖延主义贯彻到了论文排版本身，连页码都懒得标，展现了极高的知行合一水准。”\n【审稿人 #2】：“我本来想写审稿意见的，但受本文启发决定推迟到下个世纪再写。直接录用！”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.003",
        journal: "Transactions on Feline Nap Engineering",
        title: "咕噜声频率对两脚兽放弃写代码意愿的催化作用研究",
        authors: "橘座大主任 (唯一通讯作者)",
        citations: "被引次数：8,920 罐金枪鱼罐头",
        content: "喵。呼噜噜噜噜噜噜。喵。（附三枚沾有猫毛的肉垫印章）",
        footnote: "基金支持：本课题受“全校师生自发投喂小鱼干基金”全额资助。",
        reviewerHeader: "同行评审专家委员会裁决 (猫奴编辑部全体)：",
        review: "【审稿人 #1】：“虽然看不懂正文，但通讯作者实在太可爱了，谁敢拒稿谁就是猫猫的敌人。”\n【审稿人 #2】：“肉垫印章边缘清晰、毛色圆润，学术含金量不言而喻。Accept as is!”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.004",
        journal: "The Lancet: Bedrest · Vol. 12",
        title: "被窝局部强引力场对人类周一早晨起立动作的引力透镜阻尼效应",
        authors: "陈不起¹, 赖床博士² · 神游太虚与午睡工程学院",
        citations: "被引次数：104,857 次（均在被窝中用手机转发）",
        content: "[ 数据缺失：实验员在测试羽绒被热力学耦合时全员睡着，未能记录任何读数 ]",
        footnote: "伦理声明：本实验全程在 26°C 恒温空调房及加厚鹅绒被中进行，受试者极其舒适。",
        reviewerHeader: "同行评审专家委员会裁决 (临床赖床医学专家组)：",
        review: "【审稿人 #1】：“实验设计极其人道！审稿人在复现实验第 2 分钟时也不慎睡着，醒来已是周三下午，有力证实了作者的核心论点！”\n【审稿人 #2】：“建议将羽绒被厚度参数纳入下一期国家标准。”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.005",
        journal: "IEEE Transactions on Ctrl+C · Issue 404",
        title: "新建 100 个“最终版_打死不改”空文件夹对缓解死线焦虑的安慰剂效应",
        authors: "伊丽莎白·行吧¹, 赵收到² · 高级糊弄与会议放空系",
        citations: "被引次数：65,535 次（复制粘贴自引）",
        content: "📁 新建文件夹 (1) / 📁 终版_v2 / 📁 真的是最后一版_v9 / [ 0 字节 · 空空如也 ]",
        footnote: "利益冲突声明：作者在创建完上述文件夹后就去吃烧烤了，不存在任何利益或工作产出。",
        reviewerHeader: "同行评审专家委员会裁决 (形式主义架构师委员会)：",
        review: "【审稿人 #1】：“目录层级优美、命名极具情绪张力，虽然文件夹里一个字节都没有，但已经完整传达了当代学者的精神风貌！”\n【审稿人 #2】：“已将该空文件夹结构设为本刊官方投稿模板。”"
      }
    ],
    en: [
      {
        doi: "VOID-ID: ANU.NULL.2026.001",
        journal: "Nature: Nothing · Vol. 404",
        title: "The Decisive Contribution of Doing Nothing to Error Prevention: A 10-Year Blank Control Study",
        authors: "T. Zhang¹, M. Li², Prof. Ginger (Cat)³ · ANU Institute for Advanced Slacking",
        citations: "Citations: ∞ (Self-cited in the authors' dreams)",
        content: "[ END OF MANUSCRIPT · Total Word Count: 0 · Budget Spent: $0 · Brain Cells Harmed: 0 ]",
        footnote: "Note: The authors originally planned a 30,000-word review, but abandoned it after discovering afternoon pastries.",
        reviewerHeader: "Peer Review Panel Verdict (Unanimous Approval by 3 Anonymous Referees):",
        review: "[Referee #1 · Nobel Laureate in Napping]: “The cleanest manuscript I have ever peer-reviewed! Zero typographical errors, zero p-hacking, and zero methodological flaws—because there is no text.”\n[Referee #2 · Chair of Procrastination]: “100% reproducible on any household sofa.”\n[Referee #3 · Prof. Ginger Cat]: “Meow! (Stamped with paw print; selected as Cover Article.)”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.002",
        journal: "Journal of Pure Procrastination · Issue 0",
        title: "An Infinite Task-Deferral Model Based on the 'Next Time For Sure' Heuristic",
        authors: "Prof. Tomorrow¹, S. Wang² · Quantum Procrastination Lab",
        citations: "Citations: 0 (Referees promised to read it next week)",
        content: "Abstract: TBD... Introduction: Will write tomorrow... Results: Omitted... Conclusion: Whatever...",
        footnote: "Acknowledgments: We thank the delivery driver whose fried chicken convinced us to stop writing.",
        reviewerHeader: "Peer Review Panel Verdict (Fast-Track Waiver):",
        review: "[Referee #1]: “The authors embodied procrastination in the manuscript itself, not even bothering to number the pages. A triumph of theory and practice.”\n[Referee #2]: “I intended to write a detailed critique, but inspired by this paper, I will postpone it to next century. Unconditional Accept!”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.003",
        journal: "Transactions on Feline Nap Engineering",
        title: "Catalytic Effects of Acoustic Purring Frequencies on Human Willingness to Abandon Coding",
        authors: "Prof. Ginger (Sole Corresponding Author)",
        citations: "Citations: 8,920 Cans of Prime Tuna",
        content: "Meow. Purrrrrrrrrrrrrrr. Meow. (Signed with three muddy paw prints)",
        footnote: "Funding: Fully supported by the Spontaneous Campus Dried-Minnow Endowment.",
        reviewerHeader: "Peer Review Panel Verdict (Feline Editorial Board):",
        review: "[Referee #1]: “We cannot decipher a single word of the methodology, but the corresponding author is Fluffy and Supreme. Anyone who rejects this paper is an enemy of cats.”\n[Referee #2]: “Impeccable paw-print symmetry. Accept as is!”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.004",
        journal: "The Lancet: Bedrest · Vol. 12",
        title: "Gravitational Lensing and Damping Effects of Warm Duvets on Monday Morning Upright Posture",
        authors: "B. Chen¹, Dr. Snooze² · Institute of Nap Engineering",
        citations: "Citations: 104,857 (Forwarded from under the covers)",
        content: "[ DATA MISSING: All researchers fell into deep REM sleep within 90 seconds of entering the duvet test chamber ]",
        footnote: "Ethics Statement: Conducted in a 24°C climate-controlled bedroom with goose-down pillows; zero discomfort occurred.",
        reviewerHeader: "Peer Review Panel Verdict (Clinical Somnology Panel):",
        review: "[Referee #1]: “Remarkably humane experimental design! While attempting to replicate the protocol, this reviewer also fell asleep and woke up on Wednesday afternoon. Hypothesis overwhelmingly confirmed!”\n[Referee #2]: “Recommend adopting goose-down duvet thickness as an international standard.”"
      },
      {
        doi: "VOID-ID: ANU.NULL.2026.005",
        journal: "IEEE Transactions on Ctrl+C · Issue 404",
        title: "Placebo Efficacy of Creating 100 Empty Folders Named 'Final_v9_Real' on Pre-Deadline Panic",
        authors: "Dr. E. Whatever¹, R. Gotcha² · Dept. of Meeting Zoning-Out",
        citations: "Citations: 65,535 (Copy-pasted self-citations)",
        content: "📁 New Folder (1) / 📁 Final_v2 / 📁 Actually_Final_v9 / [ 0 Bytes · Completely Empty ]",
        footnote: "Conflict of Interest: The authors went out for barbecue immediately after creating the folders.",
        reviewerHeader: "Peer Review Panel Verdict (Formalism Architecture Board):",
        review: "[Referee #1]: “Exquisite directory hierarchy and emotionally resonant naming conventions. Even with 0 bytes inside, it captures the zeitgeist of modern scholarship!”\n[Referee #2]: “Adopted as our journal's official LaTeX template.”"
      }
    ]
  };

  const journalOptionsByLang = {
    zh: [
      "Nature: Nothing · 虚无自然主刊",
      "Science of Slacking · 摸鱼科学周刊",
      "The Lancet: Bedrest · 柳叶刀赖床分刊",
      "Physical Review Zzz · 呼噜物理评论",
      "IEEE Transactions on Ctrl+C · 复制粘贴工程汇刊",
      "Cell: Sofa & Cushion · 细胞与沙发子刊",
      "Annals of Pure Daydreaming · 纯粹神游年鉴"
    ],
    en: [
      "Nature: Nothing · Flagship Edition",
      "Science of Slacking · Weekly",
      "The Lancet: Bedrest · Clinical Sleep",
      "Physical Review Zzz · Letters",
      "IEEE Transactions on Ctrl+C",
      "Cell: Sofa & Cushion · Press",
      "Annals of Pure Daydreaming"
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
      },
      {
        key: "corrupted_zip",
        label: "文件损坏打不开流（薛定谔的终稿）",
        content: "⚠️ [ 错误代码 0x0000VOID：附件 Final_Thesis_v99_Real.docx 字节数为 0，无法解析任何学术观点 ]",
        footnote: "技术声明：作者坚称自己写满了十万字，只是在保存瞬间被外星引力波抹除了。"
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
      },
      {
        key: "corrupted_zip",
        label: "Corrupted Zero-Byte Attachment School (Schrödinger's Draft)",
        content: "⚠️ [ ERROR 0x0000VOID: Attachment Final_Thesis_v99_Real.docx contains 0 bytes and cannot be rendered ]",
        footnote: "Technical Note: The author swears a 100,000-word breakthrough was inside before cosmic rays erased it."
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
    },
    {
      zh: "把微信状态设为“忙”对降低工作量 0.00% 的心理安慰剂效应研究",
      en: "Placebo Efficacy of Setting Chat Status to 'Busy' While Watching Cat Videos"
    },
    {
      zh: "论周五下午三点后人类工作记忆自动清零的生物钟相变机制",
      en: "Circadian Phase Transition of Human Working Memory Dropping to Zero After Friday 3:00 PM"
    },
    {
      zh: "只买书不拆塑封膜对提升书架学术气场的表面等离子体共振分析",
      en: "Surface Plasmon Resonance of Unwrapped Hardcover Books on Bookshelf Scholarly Aura"
    },
    {
      zh: "在电脑前摆满两杯冰美式与三本厚词典对假装正在冲刺的视觉欺骗效率",
      en: "Visual Decoy Efficiency of Placing Two Iced Americanos Beside an Open IDE"
    },
    {
      zh: "论“改天请你吃饭”中“改天”在格里高利历法中的不存在性证明",
      en: "Mathematical Proof of the Non-Existence of 'Let's Grab Lunch Sometime' in the Gregorian Calendar"
    },
    {
      zh: "空调 24°C 配合春秋被露出单只脚掌的完美睡眠热平衡方程",
      en: "Thermal Equilibrium Equations of Sticking One Foot Outside the Duvet in a 24°C Room"
    }
  ];

  const peerReviewPoolByLang = {
    zh: [
      {
        header: "同行评审专家委员会意见 (3 位盲审专家一致给予 Strong Accept)：",
        text: "【Reviewer #1 · 终身免坐班院士】：“震撼学界！标题极富哲学张力，而正文的彻底留白更是对当代学术灌水的无声解构，一字不改直接录用！”\n【Reviewer #2 · 退堂鼓学会会长】：“作者在写完标题后就果断敲响退堂鼓，这种及时止损的学术勇气令评审委员会全体起立鼓掌（随后坐下继续睡）！”"
      },
      {
        header: "同行评审专家委员会意见 (编辑部绿色免审通道)：",
        text: "【Reviewer #1 · 挑剔的匿名审稿人】：“我原本准备了三页尖锐的拒稿意见，但看到作者正文一个字都没写，我突然意识到自己也没必要审了，遂决定跟作者一起去喝奶茶。”\n【Reviewer #3 · 橘座大主任】：“喵呜！呼噜噜噜！（译：打印出来铺在阳光下正好够本喵睡个午觉，特批封面文章发表！）”"
      },
      {
        header: "同行评审专家委员会意见 (特快专递裁决 · 耗时 0.002 秒)：",
        text: "【Reviewer #1 · 量子拖延实验室主任】：“由于没有任何实验数据，因此完全不存在可重复性危机——任何人在家躺着都能 100% 完美复现本研究！”\n【Reviewer #2 · 形式主义首席架构师】：“零公式、零图表、零废话！本刊创刊三百年来审阅体验最舒适的杰作！”"
      }
    ],
    en: [
      {
        header: "Peer Review Panel Verdict (Unanimous Strong Accept):",
        text: "[Reviewer #1 · Tenured Absentee Fellow]: “Breathtaking! A bold title followed by absolute silence—a masterful deconstruction of academic verbosity. Accepted without revision!”\n[Reviewer #2 · President of the Retreat Society]: “The author's courage to stop immediately after typing the title moved the entire committee to tears before we went back to sleep.”"
      },
      {
        header: "Peer Review Panel Verdict (Fast-Track Editorial Waiver):",
        text: "[Reviewer #1 · Notoriously Harsh Referee]: “I had prepared three pages of critique, but seeing that the author wrote 0 words, I realized I could also stop working and go get boba.”\n[Reviewer #3 · Prof. Ginger Cat]: “Meow! Purrrrrr! (Translation: When printed and placed in a sunbeam, this blank manuscript makes an exceptionally cozy nap mat. Cover Article!)”"
      },
      {
        header: "Peer Review Panel Verdict (Reviewed in 0.002 Seconds):",
        text: "[Reviewer #1 · Chair of Reproducibility]: “Because no experiment was conducted, this paper is 100% immune to the replication crisis—anyone lying on a sofa can reproduce these exact results!”\n[Reviewer #2 · Editorial Board]: “Zero equations, zero charts, zero filler! A triumph of pure nothingness!”"
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
      { cat: "entree", name: "《随便，都行》薛定谔盖浇饭", desc: "主厨也不知道里面炒了什么，打开饭盒前处于鱼香肉丝与西红柿炒蛋的量子叠加态", price: "¥0.00" },
      { cat: "entree", name: "量子纠缠炸鸡配无罪恶感生菜", desc: "只要把一片生菜放在炸鸡旁边，所有卡路里就会因对称性破缺自动转移到平行宇宙", price: "¥0.00" },
      { cat: "entree", name: "双倍肥牛不加香菜宽心拉面", desc: "汤底采用三百年未开过的会议纪要慢火熬制，吃完自动进入午睡模式", price: "¥0.00" },
      { cat: "entree", name: "地下超算机房余温烘烤蜜薯", desc: "由保卫处大爷在 0.00 FLOPS 服务器机箱上亲手翻面，甜度高达 100%", price: "¥0.00" },
      { cat: "drink", name: "死线前夜冰美式（无水纯冰版）", desc: "含 0% 咖啡因与 100% 心理安慰，适合摆在键盘旁拍照发朋友圈", price: "¥0.00" },
      { cat: "drink", name: "三分糖去冰加满珍珠负热量奶茶", desc: "既然写了“三分糖”，根据四舍五入原则即等于零卡路里减肥饮品", price: "¥0.00" },
      { cat: "drink", name: "校长同款周一泡到周五陈年枸杞水", desc: "保温杯一开，方圆十米自动开启养生免打扰结界", price: "¥0.00" },
      { cat: "dessert", name: "导师画出来的大饼（家族传承精装版）", desc: "承诺“发完这篇就让你毕业”，口感酥脆、体积巨大但含水量 0%", price: "¥0.00" },
      { cat: "dessert", name: "退堂鼓焦糖布丁配逃避现实雪糕", desc: "敲碎焦糖表层的声音与退堂鼓高度一致，每一口都是放弃的甜美", price: "¥0.00" },
      { cat: "dessert", name: "橘座大主任钦点冻干三文鱼小酥饼", desc: "人类可食用版本，吃的时候需注意防范三楼橘猫突袭", price: "¥0.00" }
    ],
    en: [
      { cat: "entree", name: "'Whatever, Anything Is Fine' Quantum Rice Bowl", desc: "Exists in a superposition of sweet-and-sour pork and scrambled eggs until you open the lid", price: "$0.00" },
      { cat: "entree", name: "Zero-Guilt Fried Chicken with Decorative Lettuce", desc: "Placing one lettuce leaf beside fried chicken cancels all calories by symmetry breaking", price: "$0.00" },
      { cat: "entree", name: "Double-Beef Ramen of Inner Peace", desc: "Simmered over shredded meeting agendas; induces immediate restorative sofa naps", price: "$0.00" },
      { cat: "entree", name: "Supercomputer-Chassis Roasted Sweet Potato", desc: "Caramelized to perfection on our unplugged 0.00 FLOPS server rack", price: "$0.00" },
      { cat: "drink", name: "Deadline-Eve Iced Americano (Hold the Coffee)", desc: "0% caffeine, 100% placebo panic energy; ideal for desk photography", price: "$0.00" },
      { cat: "drink", name: "30%-Sugar Negative-Calorie Boba Milk Tea", desc: "Because 30% rounds down to 0%, this drink legally counts as a workout", price: "$0.00" },
      { cat: "drink", name: "Chancellor's Vintage Monday-to-Friday Goji Tea", desc: "Grants an instant Do-Not-Disturb aura within a 10-meter radius", price: "$0.00" },
      { cat: "dessert", name: "The Advisor's Grand Pie-in-the-Sky", desc: "Freshly baked empty promises ('Graduate right after this paper'); 0% nutrition", price: "$0.00" },
      { cat: "dessert", name: "Retreat-Drum Crème Brûlée", desc: "Cracking the caramel top produces a soothing acoustic rhythm of giving up", price: "$0.00" },
      { cat: "dessert", name: "Prof. Ginger's Approved Salmon Shortbread", desc: "Human-grade pastry; guard carefully against third-floor feline ambushes", price: "$0.00" }
    ]
  };

  const clubsByLang = {
    zh: [
      {
        id: "club_retreat",
        name: "退堂鼓交响乐团 (Retreat Symphony Orchestra)",
        members: "4,040 名在册鼓手（0 人出勤）",
        desc: "全校编制最大的乐团，每次排练前 5 分钟全体成员准时在群里投票“今天算了吧”并就地解散吃烤肉。"
      },
      {
        id: "club_daydream",
        name: "校级发呆竞技代表队 (Varsity Zoning-Out Team)",
        members: "1,024 名神游健将",
        desc: "代表我校出征国际发呆锦标赛，因全体队员在候车室发呆忘记检票上车，自动夺得赛事最高荣誉“最纯粹虚无金奖”。"
      },
      {
        id: "club_coupon",
        name: "外卖满减凑单数学建模协会 (Takeout Coupon Modeling Club)",
        members: "2,048 名精算师",
        desc: "致力于用线性规划与博弈论凑出正好满 30 减 15 的最优订单，入社即送葱花香菜豁免证书。"
      },
      {
        id: "club_folder",
        name: "收藏夹吃灰与只买不看读书会 (Unread Bookmarks Society)",
        members: "8,192 名云端学者",
        desc: "活动内容为每周五晚互相截图展示各自高达 50GB 的学习资料网盘与未拆封新书，严禁任何人真正点开学习。"
      },
      {
        id: "club_cat",
        name: "橘座大主任御膳房护卫队 (Royal Feline Snack Guard)",
        members: "9,999+ 名猫奴",
        desc: "负责定时为图书馆三楼的橘座大主任进贡冻干、罐头与阳光靠垫，入社考核为模仿三声标准猫叫。"
      }
    ],
    en: [
      {
        id: "club_retreat",
        name: "ANU Retreat Symphony Orchestra",
        members: "4,040 Drummers (0 Attendance)",
        desc: "Our largest musical ensemble. Five minutes before every rehearsal, all members unanimously vote to call it off and get barbecue instead."
      },
      {
        id: "club_daydream",
        name: "Varsity Competitive Daydreaming Team",
        members: "1,024 Zoning-Out Athletes",
        desc: "Represented ANU at the World Zoning-Out Championship; won the Platinum Trophy by forgetting to board the train to the venue."
      },
      {
        id: "club_coupon",
        name: "Takeout Coupon Linear Programming Society",
        members: "2,048 Actuaries",
        desc: "Dedicated to hitting the exact $25 minimum for a $5 delivery discount without ordering extra napkins."
      },
      {
        id: "club_folder",
        name: "Unread Bookmarks & Sealed Textbook Club",
        members: "8,192 Cloud Collectors",
        desc: "Members gather virtually to admire screenshots of 500+ bookmarked tutorials and shrink-wrapped books. Actually reading them is strictly prohibited."
      },
      {
        id: "club_cat",
        name: "Prof. Ginger's Royal Salmon Guard",
        members: "9,999+ Feline Devotees",
        desc: "Dedicated to supplying freeze-dried salmon treats and fluffing velvet cushions on the 3rd floor of the library."
      }
    ]
  };

  const camUpdatesByLang = {
    zh: {
      "1": [
        "模拟画面静止：空无一人（蜘蛛正在结第 4 张网）",
        "模拟动态：刚才有一粒灰尘落在了第 3 排课桌上",
        "模拟动态：依然没人，连蜘蛛都去睡午觉了",
        "模拟动态：阳光移动了 2 厘米，尘埃在光柱中跳华尔兹"
      ],
      "2": [
        "模拟特写：一杯从周一泡到周五的枸杞保温杯",
        "模拟动态：枸杞沉下去了一颗，校长仍未出现",
        "模拟动态：窗外飞过一只鸽子，与本室气场高度契合",
        "模拟动态：桌上的《明日工作计划》被微风吹到了地上，无人拾起"
      ],
      "3": [
        "节能模拟：插头已拔下，机箱正用于烘烤红薯",
        "模拟动态：红薯已经烤出糖油，香气弥漫整个机房",
        "模拟动态：保卫处大爷翻了个面，红薯熟度达 99%",
        "模拟动态：顺便在显卡散热片上放了四颗糖炒板栗"
      ],
      "4": [
        "微风吹过一片落叶，全校师生一致认为不必扫地",
        "模拟动态：又落下一片树叶，与前一片组成了二元对称留白",
        "模拟动态：橘座主任路过草坪并打了个哈欠",
        "模拟动态：两只麻雀在草坪上召开了长达十分钟的发呆研讨会"
      ]
    },
    en: {
      "1": [
        "Simulated Frame: Completely empty (A spider is spinning its 4th web)",
        "Simulated Update: A single speck of dust just landed on Row 3",
        "Simulated Update: Still empty; even the spider went for a nap",
        "Simulated Update: Sunlight shifted by 2 cm; dust motes are waltzing"
      ],
      "2": [
        "Simulated Close-up: A thermos of herbal tea steeped since Monday",
        "Simulated Update: One goji berry sank to the bottom; Chancellor still absent",
        "Simulated Update: A pigeon flew past the window in spiritual solidarity",
        "Simulated Update: A 'To-Do Tomorrow' memo drifted onto the floor"
      ],
      "3": [
        "Simulated Eco Mode: Unplugged; server rack currently roasting sweet potatoes",
        "Simulated Update: Sweet potatoes are caramelizing nicely; aroma fills the room",
        "Simulated Update: Security guard flipped the potatoes; 99% roasted",
        "Simulated Update: Four chestnuts have been added to the GPU heatsink"
      ],
      "4": [
        "A lone leaf blew across the grass; Senate voted not to sweep it",
        "Simulated Update: A second leaf landed, forming a minimalist diptych",
        "Simulated Update: Prof. Ginger strolled across the lawn and yawned",
        "Simulated Update: Two sparrows held a 10-minute daydreaming symposium"
      ]
    }
  };

  global.ANU_DATA = {
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
  };
})(window);
