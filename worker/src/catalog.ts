/**
 * Server-side authoritative academic catalog & grading matrix for ANU.
 * All exam scores, degree labels, paper journals, and badge definitions are
 * validated and computed strictly on the server so clients cannot forge grades
 * or inject arbitrary HTML/data.
 */

export const VALID_COLLEGES = ["retreat", "procrastination", "perfunctory", "daydream"] as const;
export type CollegeKey = (typeof VALID_COLLEGES)[number];

export const COLLEGE_NAMES: Record<CollegeKey, { zh: string; en: string }> = {
  retreat: {
    zh: "退堂鼓与战略性放弃学院",
    en: "School of Strategic Retreat"
  },
  procrastination: {
    zh: "死线物理与量子拖延学院",
    en: "Faculty of Deadline Physics"
  },
  perfunctory: {
    zh: "高级糊弄学与废话文学系",
    en: "Dept. of Perfunctory Rhetoric"
  },
  daydream: {
    zh: "深度睡眠与带薪发呆研究院",
    en: "Institute of Paid Daydreaming"
  }
};

export const DEGREE_OPTIONS = {
  zh: [
    "纯粹虚无哲学荣誉博士 (Ph.D. in Pure Nothingness)",
    "战略性退堂鼓演奏学博士 (Doctor of Strategic Retreat)",
    "死线量子隧穿工程学博士 (Sc.D. in Deadline Tunneling)",
    "应用发呆与白日梦科学博士 (D.Phil. in Applied Daydreaming)",
    "已读不回与社交隐身学博士 (Ph.D. in Digital Ghosting)",
    "带薪午睡与深度睡眠医学博士 (M.D. in Compensated Hibernation)",
    "全自动糊弄学与废话文学博士 (Litt.D. in Perfunctory Rhetoric)",
    "无效会议免疫与眼神放空博士 (D.B.A. in Meeting Immunity)",
    "收藏夹吃灰与买书不读学博士 (Ph.D. in Unread Hoarding)",
    "宇宙热力学反内卷首席荣誉院士 (Grand Fellow of Anti-Involution)"
  ],
  en: [
    "Ph.D. in Pure & Applied Nothingness (Honoris Causa)",
    "Doctor of Strategic Retreat & Graceful Quitting (D.S.R.)",
    "Sc.D. in Last-Minute Quantum Deadline Tunneling",
    "D.Phil. in Advanced Daydreaming & Sofa Gravitation",
    "Ph.D. in Digital Ghosting & Read-Receipt Evasion",
    "M.D. in Clinical Hibernation & Paid Afternoon Naps",
    "Litt.D. in Perfunctory Rhetoric & Redundant Literature",
    "D.B.A. in Corporate Meeting Immunity & Blank Staring",
    "Ph.D. in Unopened Tabs & Shrink-Wrapped Bibliomania",
    "Grand Fellow of Cosmic Anti-Hustle Thermodynamics"
  ]
};

export const MAJOR_OPTIONS = {
  zh: [
    "退堂鼓非物质文化遗产表演系",
    "死线前一小时超光速赶工物理系",
    "群消息已读不回与撤回心理学系",
    "会议室眼神放空与灵魂出窍工程系",
    "收藏夹吃灰与网课囤积生态学系",
    "外卖满减凑单运筹学与午休工程系",
    "闹钟静音反射弧与回笼觉神经科学系",
    "周五下午三点精神提前下班管理系",
    "耳机降噪隔绝世界与假装很忙艺术系",
    "下周一再开始减肥与健身口号学系",
    "办公桌枸杞保温杯凝视冥想系",
    "带薪如厕时间管理与流体力学系"
  ],
  en: [
    "Dept. of Tactical Retreat Percussion",
    "Last-Hour Superluminal Panic Physics",
    "Psychology of Seen-Zone & Unsent Drafts",
    "Boardroom Astral Projection & Nodding Engineering",
    "Digital Hoarding & Unwatched Lecture Ecology",
    "Takeout Discount Optimization & Siesta Science",
    "Snooze-Button Reflex & Second-Sleep Neuroscience",
    "Friday 3 PM Mental Checkout Administration",
    "Noise-Canceling Isolation & Looking Busy Fine Arts",
    "“Starting My Diet Next Monday” Studies",
    "Herbal Thermos Contemplation & Desk Meditation",
    "Compensated Restroom Choreography & Fluid Dynamics"
  ]
};

export const HONOR_TITLES = {
  zh: [
    "Summa Cum Somno · 睡神最高荣誉毕业",
    "Magna Cum Pigrus · 极度懒散优异毕业",
    "Ordo Equitum Lecti · 皇家被窝骑士团勋章",
    "Custos Silentii · 已读不回最高守护者",
    "Praefectus Quietis · 终身免早八特权学者",
    "Doctor Nihilissimus · 万物皆空特级大师",
    "Laureatus Remissionis · 退堂鼓首席桂冠学人",
    "Socius Felis Aurantii · 橘座大主任钦点摸鱼院士"
  ],
  en: [
    "Summa Cum Somno (With Highest Sleepiness)",
    "Magna Cum Pigrus (With Great Laziness)",
    "Knight Commander of the Warm Duvet Order",
    "Grand Guardian of Unread Notifications",
    "Perpetual Immunity from 8:00 AM Lectures",
    "Doctor Nihilissimus (Supreme Master of Void)",
    "Poet Laureate of Last-Minute Cancellations",
    "Distinguished Fellow of Prof. Ginger's Nap Circle"
  ]
};

export const JOURNAL_OPTIONS = {
  zh: [
    "Nature: Nothing（《自然·虚无》正刊 · IF = 0.000）",
    "Science of Slacking（《摸鱼科学》旗舰刊 · IF = NaN）",
    "The Lancet: Hibernation（《柳叶刀·冬眠医学》）",
    "Cell: Couch Potato（《细胞·沙发土豆子刊》）",
    "Physical Review Void（《物理评论·纯粹发呆》）",
    "Transactions on Tactical Retreat（《IEEE 退堂鼓汇刊》）",
    "Annals of Unread Literature（《已买未读年鉴》）"
  ],
  en: [
    "Nature: Nothing (Flagship Edition · IF = 0.000)",
    "Science of Slacking (AAAS Parody · IF = NaN)",
    "The Lancet: Hibernation & Horizontal Medicine",
    "Cell: Couch Potato & Metabolic Stillness",
    "Physical Review Void (Letters on Doing Nothing)",
    "IEEE Transactions on Tactical Retreat",
    "Annals of Unread Bookmarks & Shrink-Wrapped Books"
  ]
};

export const METHODOLOGY_OPTIONS = {
  zh: [
    {
      content: "[ 本页系高纯度无墨留白 —— 撰稿人在打开 Word 文档后深感宇宙浩瀚，遂决定去睡午觉，全篇共计 0.00 字 ]",
      footnote: "注：本手稿在创作过程中未消耗任何脑细胞、咖啡因或键盘寿命。"
    },
    {
      content: "【实验数据空缺说明：课题组原计划于周一上午采集样本，但因全员闹钟被按掉，实验自动顺延至热寂之后。】",
      footnote: "经费声明：本研究获教务处 0.00 元全额资助，结余经费已全部用于购买食堂烤红薯。"
    },
    {
      content: "（此处原本有一段长达三万字的文献综述，作者在保存前不小心合上了电脑并顺势下班，故保留原生态空白。）",
      footnote: "伦理审查：本文未打扰任何一名研究对象的午休，符合 ANU 最高学术道德标准。"
    },
    {
      content: "⌈ 量子叠加态正文：只要审稿人不往下滚动页面，本论文就同时处于“已写完”与“压根没动笔”的完美叠加态 ⌋",
      footnote: "通信作者邮箱已设置永久自动回复：“收到，下辈子一定改。”"
    },
    {
      content: "[ 全文仅含一个战略性句号：。—— 象征学术思考在诞生的第一秒即宣告圆满结束 ]",
      footnote: "致谢：感谢外卖小哥、被窝引力场以及图书馆三楼的橘猫对本文不产出所做的贡献。"
    },
    {
      content: "【系统提示：作者将参考文献拖进 Zotero 后即获得了巨大成就感，认为无需再撰写正文。】",
      footnote: "利益冲突：作者声明与任何形式的加班或早起存在不可调和的利益冲突。"
    }
  ],
  en: [
    {
      content: "[ Pure Unblemished Void — The author opened a blank document, felt the vastness of the cosmos, and went for a nap. Total word count: 0.00 ]",
      footnote: "Note: Zero neurons, coffee beans, or keystrokes were harmed during the non-preparation of this manuscript."
    },
    {
      content: "[ Data Omitted: Sampling was scheduled for Monday at 9:00 AM, but the entire lab hit snooze; collection postponed until after cosmic heat death. ]",
      footnote: "Funding: Supported by Grant #0000 ($0.00). Remaining budget was spent on roasted sweet potatoes."
    },
    {
      content: "(A 30,000-word literature review was envisioned here, but the author closed the laptop at 4:59 PM and went home instead.)",
      footnote: "Ethics Statement: No graduate students were awakened during this study."
    },
    {
      content: "⌈ Quantum Superposition Text: As long as the referee does not look closely, this manuscript is simultaneously groundbreaking and unwritten. ⌋",
      footnote: "Correspondence: Author's inbox is permanently set to 'Will revise in my next reincarnation.'"
    },
    {
      content: "[ Complete Manuscript: . — A single period symbolizing that inquiry ended the exact millisecond it began. ]",
      footnote: "Acknowledgments: We thank duvet gravity and Prof. Ginger for inspiring our complete lack of output."
    },
    {
      content: "[ Methodology Note: After importing 84 PDFs into a reference manager, the author felt sufficiently accomplished and ceased writing. ]",
      footnote: "Conflict of Interest: The authors declare an irreconcilable conflict with morning alarms."
    }
  ]
};

export const PEER_REVIEW_POOL = {
  zh: [
    {
      header: "同行评审意见（3 位匿名审稿人全票通过 · 耗时 0.02 秒）：",
      text: "“审稿人 1：我没读，但看空白排版觉得非常有深度。审稿人 2：全文找不到任何一个错别字或逻辑漏洞，建议直接免审发表。审稿人 3：好的收到，我也在睡午觉。”"
    },
    {
      header: "编辑部终审裁决（《Nature: Nothing》主编亲签）：",
      text: "“本文深刻践行了我刊‘多写一个字都是对纸张的不尊重’之办刊宗旨。三位审稿人在打开附件的瞬间便获得了内心的宁静，特批荣登本期封面空白。”"
    },
    {
      header: "双盲同行评审委员会纪要（全票 Accept As Is）：",
      text: "“审稿人 A 表示本文的留白张力堪比宋代山水画；审稿人 B 试图挑刺但因找不到任何文字而宣布放弃；橘座大主任在稿件上踩了一个梅花印，视为最高等级学术背书。”"
    },
    {
      header: "快速通道审稿结论（Fast-Track Zero-Word Verdict）：",
      text: "“鉴于作者在投稿信中诚恳表示‘实在不想写’，编委会深受感动，一致同意免除一切大修小修，直接录入人类虚无学术遗产名录。”"
    }
  ],
  en: [
    {
      header: "Peer Review Consensus (Unanimous Accept in 0.02s):",
      text: "“Referee #1: Didn't read, spiritually moved by the margins. Referee #2: Zero typos or methodological flaws found. Referee #3: Sounds good, I am also napping.”"
    },
    {
      header: "Editorial Board Final Verdict (Cover Blank Feature):",
      text: "“This manuscript exemplifies our journal's ethos that every written word is unnecessary clutter. All three referees achieved instant inner peace upon opening the empty PDF.”"
    },
    {
      header: "Double-Blind Review Panel Minutes (Accept Without Revision):",
      text: "“Reviewer A praised the negative space; Reviewer B tried to critique the statistics but found no numbers to attack; Prof. Ginger stamped a paw print on page 1, sealing acceptance.”"
    },
    {
      header: "Fast-Track Slacker Track Decision:",
      text: "“Moved by the author's candid cover letter stating 'I really didn't feel like typing,' the editors unanimously waive all revisions.”"
    }
  ]
};

export const CITATIONS_POOL = {
  zh: ["被引：99,999+ 次", "被引：404,000 次", "被引：∞ 次（全校必不读）", "被引：1,024,000 次"],
  en: ["Citations: 99,999+", "Citations: 404,000", "Citations: ∞ (Universal Unread)", "Citations: 1,024,000"]
};

export interface CourseExamSpec {
  code: string;
  titleZh: string;
  titleEn: string;
  profZh: string;
  profEn: string;
  /** Valid option scores per question index: [q0Scores, q1Scores] */
  validOptionScores: number[][];
}

export const COURSE_EXAMS: Record<string, CourseExamSpec> = {
  "NTH-101": {
    code: "NTH-101",
    titleZh: "退堂鼓演奏艺术导论",
    titleEn: "Introduction to Tactical Retreat",
    profZh: "林退之 教授",
    profEn: "Prof. Lin Tuizhi",
    validOptionScores: [
      [0, 50, 30],
      [0, 50, 35]
    ]
  },
  "NTH-104": {
    code: "NTH-104",
    titleZh: "高级电话静音与花式拒接",
    titleEn: "Advanced Call Screening & Ghosting",
    profZh: "莫联联 副教授",
    profEn: "Assoc. Prof. Mo Lianlian",
    validOptionScores: [
      [0, 50, 40],
      [0, 50, 30]
    ]
  },
  "PRC-202": {
    code: "PRC-202",
    titleZh: "死线前一晚的量子奇迹",
    titleEn: "Quantum Miracles at 11:59 PM",
    profZh: "薛定谔的猫（客座）",
    profEn: "Schrödinger's Cat",
    validOptionScores: [
      [0, 50, 40],
      [0, 50, 35]
    ]
  },
  "PRC-208": {
    code: "PRC-208",
    titleZh: "收藏夹吃灰与买书如山倒学",
    titleEn: "Unread Bookmarks & Bibliomania",
    profZh: "屯书客 教授",
    profEn: "Prof. Hoarder",
    validOptionScores: [
      [0, 50, 35],
      [0, 50, 40]
    ]
  },
  "PRF-305": {
    code: "PRF-305",
    titleZh: "“好的收到”在职场的108种微妙变体",
    titleEn: "108 Shades of 'Noted with Thanks'",
    profZh: "敷衍明 终身教授",
    profEn: "Prof. Perfunctory",
    validOptionScores: [
      [0, 50, 40],
      [0, 50, 35]
    ]
  },
  "PRF-309": {
    code: "PRF-309",
    titleZh: "正确的废话文学与周报膨胀术",
    titleEn: "Tautological Rhetoric & Report Inflation",
    profZh: "水字数 客座教授",
    profEn: "Prof. Wordcount",
    validOptionScores: [
      [0, 50, 35],
      [0, 50, 40]
    ]
  },
  "DRM-404": {
    code: "DRM-404",
    titleZh: "会议室眼神放空与微睡眠实训",
    titleEn: "Open-Eyed Micro-Sleep in Meetings",
    profZh: "橘座大主任（特聘猫教授）",
    profEn: "Prof. Ginger (Feline Chair)",
    validOptionScores: [
      [0, 50, 40],
      [0, 50, 35]
    ]
  },
  "DRM-499": {
    code: "DRM-499",
    titleZh: "毕业设计：如何优雅地什么都不做",
    titleEn: "Capstone: The Art of Doing Nothing",
    profZh: "摸鱼斯坦 校长",
    profEn: "Chancellor Slackingstein",
    validOptionScores: [
      [0, 50, 40],
      [0, 50, 45]
    ]
  }
};

export interface BadgeSpec {
  key: string;
  category: "honor" | "club" | "easter_egg" | "milestone";
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
}

export const OFFICIAL_BADGES: Record<string, BadgeSpec> = {
  club_retreat: {
    key: "club_retreat",
    category: "club",
    titleZh: "皇家退堂鼓交响乐团成员",
    titleEn: "ANU Retreat Symphony Member",
    descZh: "每次排练前五分钟全票通过“今天算了吧”决议的荣誉鼓手。",
    descEn: "Honorary percussionist who votes to cancel rehearsal 5 minutes before start."
  },
  club_daydream: {
    key: "club_daydream",
    category: "club",
    titleZh: "校级竞技发呆代表队队员",
    titleEn: "Varsity Competitive Daydreaming Athlete",
    descZh: "因忘记买去赛场的高铁票而荣膺世界发呆锦标赛白金奖杯。",
    descEn: "Won the Platinum Trophy at the World Zoning-Out Championship by missing the train."
  },
  club_coupon: {
    key: "club_coupon",
    category: "club",
    titleZh: "外卖满减凑单运筹学研究会会员",
    titleEn: "Takeout Coupon Linear Programming Fellow",
    descZh: "精准凑出满 30 减 5 最优解且绝不多点一包纸巾的精算学者。",
    descEn: "Dedicated to hitting the exact delivery discount threshold with zero waste."
  },
  club_folder: {
    key: "club_folder",
    category: "club",
    titleZh: "收藏夹吃灰与买书不拆封联谊会会员",
    titleEn: "Unread Bookmarks & Sealed Textbook Fellow",
    descZh: "坚守“买过等于读过、收藏等于学会”的纯粹精神信仰。",
    descEn: "Committed to collecting 500+ tutorials without ever opening a single one."
  },
  club_cat: {
    key: "club_cat",
    category: "club",
    titleZh: "橘座大主任御膳房护卫队成员",
    titleEn: "Prof. Ginger's Royal Salmon Guard",
    descZh: "负责为图书馆三楼的橘座大主任进贡冻干与阳光靠垫。",
    descEn: "Dedicated to supplying freeze-dried salmon treats to the 3rd-floor library cat."
  },
  easter_crest: {
    key: "easter_crest",
    category: "easter_egg",
    titleZh: "校徽摸鱼狂魔勋章",
    titleEn: "Crest Daydreamer Medallion",
    descZh: "连续点击 5 次校徽唤醒摸鱼斯坦校长的终身免早八特权赐福。",
    descEn: "Unlocked by clicking the ANU crest 5 times in a row."
  },
  easter_konami: {
    key: "easter_konami",
    category: "easter_egg",
    titleZh: "橘座大主任午夜呼噜秘技勋章",
    titleEn: "Prof. Ginger's Konami Purr Medallion",
    descZh: "输入上上下下左右左右BA秘籍解锁的绝对虚无终极赐福。",
    descEn: "Unlocked via the ancient Konami Code slacking sequence."
  },
  milestone_enrolled: {
    key: "milestone_enrolled",
    category: "milestone",
    titleZh: "ANU 正式注册虚无学籍",
    titleEn: "Matriculated ANU Scholar of Nothingness",
    descZh: "完成校园档案建立并获得唯一 ANU 学号。",
    descEn: "Officially matriculated with a unique ANU Student ID."
  },
  milestone_first_exam: {
    key: "milestone_first_exam",
    category: "milestone",
    titleZh: "随堂摸鱼统考亲历者",
    titleEn: "Slacking Proficiency Exam Laureate",
    descZh: "完成首场院系模拟统考并录入个人成绩单。",
    descEn: "Completed an official Slacking Proficiency Mock Exam."
  },
  milestone_first_paper: {
    key: "milestone_first_paper",
    category: "milestone",
    titleZh: "《Nature: Nothing》零字数通讯作者",
    titleEn: "Nature: Nothing Zero-Word Author",
    descZh: "成功在空白期刊发表一篇 0.00 字学术手稿。",
    descEn: "Published a 0.00-word manuscript in the ANU Blank Paper Archive."
  },
  milestone_first_diploma: {
    key: "milestone_first_diploma",
    category: "milestone",
    titleZh: "荣誉博士蓝晶大印持有者",
    titleEn: "Holder of the Grand Sapphire Seal",
    descZh: "获颁绝对虚无大学荣誉博士学位证书并存入个人档案。",
    descEn: "Conferred an Honorary Doctorate in Pure Nothingness."
  }
};
