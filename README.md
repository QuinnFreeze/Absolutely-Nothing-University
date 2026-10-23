# Absolutely Nothing University · 绝对虚无大学

> *Nihil Agere, Omnia Esse* — 什么都不做，即是一切。

ANU 是一所虚构的讽刺大学网站，提供校园互动、摸鱼统考、零字论文、荣誉证书及 My ANU 学生中心。保留牛津蓝白主题、手动深色模式与中英文界面；游客无需登录即可使用校园功能。

- 网站：[freeze.edu.kg](https://freeze.edu.kg)
- 学生 API：[api.freeze.edu.kg](https://api.freeze.edu.kg/api/v1/health)
- [安全审计与验收边界](docs/SECURITY_AUDIT_REPORT.md)
- [生产发布影响与回滚方案](docs/PRODUCTION_ROLLOUT.md)
- [登录界面与 Google 品牌更名方案](docs/LOGIN_BRANDING_ROLLOUT.md)
- [Worker 认证验证器修复与发布评审](docs/WORKER_AUTH_VERIFIER_ROLLOUT.md)

## 当前状态（2026-10-23）

Worker 认证验证 503 已在本地定位并修复：Workers 不支持共享请求中的 `redirect:error`，现改用 manual 并显式拒绝所有 3xx。新增 145 项真实 workerd 回归与全套、类型检查通过；外部身份服务为隔离 fixtures，**该后端修复尚未发布，也未完成完整真人登录验收**。注册继续关闭。具体发布范围、备份要求与回滚见[修复评审记录](docs/WORKER_AUTH_VERIFIER_ROLLOUT.md)。

**已按批准版本 `6eae1ce` 发布前端和 Worker，并在私有备份后完成 D1 `0003` 增量迁移。新用户注册保持关闭，尚未获准开放。** 上线后 health 为 `ok:true`、注册 `false`，论文、证书和公开目录开关均为 `true`。

初次加固版本 `6eae1ce` 的前端六文件已核对；2026-10-21 又按单独批准发布登录恢复补丁 `67347cb`（合并提交 `61080c8`），Pages 构建成功，两份修改后的线上 JS 与批准源 SHA-256 一致。Worker 仍为 `c22b3178-7872-4d77-a06a-ea2d7f9408ae`、100% 流量；D1 迁移保留检查不变。初次发布的 11 项 API 防护、21 项游客回归通过；后续补丁的 7 项真实游客检查也通过，默认蓝白、移动布局、双语、深浅切换及实际 PNG 下载正常。真人 Google OAuth、真实 Turnstile 成功与重放、生产账户写入和物理 iPhone Safari 尚未完成；这些项目仍阻止开放注册。

登录恢复补丁修复超时与 Firebase observer 先后到达时的错误提示，保留账号切换、退出和云端错误边界；26 组认证模拟及 12 项本地 Chrome UI fixture 检查通过。随后经单独批准，登录卡片、双语隐私页及入口的前端版本 `739aaa2` 通过 PR #2 合并为 `5a0e64d`，Pages 于 2026-10-21 12:11:03 UTC 构建成功。五份前端资产和隐私页的正式 HTTPS 摘要均与批准源一致；9 项真实生产游客检查通过，含 390/1440 px 双语、蓝白与手动深色刷新、登录入口、隐私页及 2400×1728 PNG，运行错误和学生 API 请求均为 0。本地全套、TypeScript 和 20 项登录界面 fixture 检查此前通过。

2026-10-22 已按明确批准保存 Google 品牌名称 **Absolutely Nothing University (ANU)**、首页、隐私政策和开发者联系信息，保留原 Firebase 品牌网域并新增 `freeze.edu.kg`。新增一条 Google TXT 后，DNS 原 16 条记录全部保留；独立 DoH 可见验证 TXT 与原 SPF。Search Console Domain 所有权验证成功，Google 控制台确认品牌已经验证并向用户显示；真实 Google 账号选择页也已显示新名称。同一 Chrome 会话恢复了 Firebase 登录身份，但云端同步仍提示认证验证暂不可用，完整真人 OAuth 与已认证业务仍未通过。Worker、D1、Access、scopes、回调和 Firebase `authDomain` 均未改动；最新只读复核 health 正常且注册继续关闭。详见[登录界面与品牌发布记录](docs/LOGIN_BRANDING_ROLLOUT.md)及安全审计。

侧边栏、登录布局和公开站内搜索已按明确批准的 `efcb4b5` 经 PR #3 发布（合并提交 `1272310`）；Pages 于 2026-10-22 12:37:33 UTC 构建成功。11 份普通 HTTPS 文件摘要与批准源一致，真实 SDK/字体、无 mock 的生产游客与文件联合检查 50/50 通过，覆盖手机/桌面、双语、浅深色、菜单、搜索定位和隐私页，页面错误、失败请求与学生 API 操作均为 0。本地搜索回归 94/94、全套测试及类型检查此前通过。后端和认证配置未改，health 正常且注册仍关闭；真实账户和物理 Safari 的未验收边界保留。范围、隐私边界和回滚见[搜索与导航发布记录](docs/SEARCH_NAVIGATION_ROLLOUT.md)。

## 技术架构

| 层 | 实现与责任 |
| --- | --- |
| 前端 | GitHub Pages；`index.html`、`styles.css`、`app.js` 和 `js/`；校园内容、游客模式与 My ANU |
| 身份 | Firebase Authentication 官方 Web SDK；仅 Google；SDK 管理持久化，应用不自行保存原始 token |
| API | Cloudflare Workers TypeScript；Firebase JWT 验签、CORS、本人资源权限、后端判分与云端归档 |
| 数据 | Cloudflare D1；UID 一人一档、学号唯一、默认私有、成绩/论文/证书额度和导入去重 |
| 防护 | Turnstile success/hostname/action/时效及一次性校验；边缘限流与 D1 写配额；Access + 管理 secret 和功能开关 |

## 本地运行

前端预览：

```bash
python3 -m http.server 8088
```

打开 [localhost:8088](http://localhost:8088)。游客功能可独立预览；生产 API 拒绝 localhost 来源，本地开发应使用独立 Worker 配置及本地数据库，不向生产扩大 CORS。

Worker 需要 Node.js 24+：

```bash
cd worker
npm ci
npm run db:migrate:local
npm run dev
```

`npm run dev` 使用 `wrangler.dev.toml` 的本地模拟器和伪数据库标识；生产配置独立保存在 `wrangler.toml`。如需联调，将前端公开 runtime config 指向本地 API，并使用合适的本地 Firebase/Turnstile 测试配置；不得把服务端 secret 写入前端。

## 自动化检查

```bash
# 先在 worker/ 执行 npm ci，再从仓库根目录运行
node --no-warnings tests/run-tests.mjs
node --no-warnings tests/workerd-verifier-tests.mjs
node tests/student-auth-tests.mjs
node tests/canvas-export-tests.mjs
node tests/browser-regression.cjs
node tests/auth-recovery-browser.cjs
git diff --check

# 在 worker/ 目录运行
npm run typecheck
npm run deploy:dry-run
```

覆盖 JWT 假签名/声明、跨账号权限、Turnstile action 和重放、并发注册、revision 冲突、导入原子性、限流故障、档案导出/删除、登录切换及超时恢复。静态检查同时核对双语绑定、公开配置和 secret 边界；PNG 使用 Canvas mocks，Safari 客户端包含 UA 模拟。

Worker 测试运行实际处理器、内存 SQLite 和 RSA 签名，外部 Firebase、Turnstile、Access 及边缘服务为模拟。客户端测试替换 SDK 和 API；因此测试通过不代表真人 OAuth、真实挑战、远程 D1 或物理 Safari 通过。本轮最终全集、TypeScript 和 dry-run 已通过。本地 Chrome 390/768/1440 px 中英/深色回归使用身份/API fixtures，下载四张实际 PNG；另外，已发布正式站点的独立 Chrome 游客回归使用真实 Firebase SDK 和字体、无网络 mock，完成 21 项检查及五张实际 PNG，不进行 OAuth 或生产学生写入。两类结果分别记录于安全报告。

## 配置与隐私

沿用已有 Firebase 项目及 `js/anu-config.js` 中的公开标识，Google 提供方和正式授权域已在前次核对。GitHub Pages 未部署 Firebase 同源 `/__/auth/*` helper，登录使用 popup；不得只修改 authDomain 来尝试修复 Safari redirect。[Firebase 官方说明](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

生产只允许正式 HTTPS 来源，Turnstile 校验 `register`、`paper`、`diploma`、`import` 四种 action。管理接口要求 Access JWT 与管理员 secret；真实 issuer/audience 已从 2026-10-19 创建的 ANU Admin API Access 应用填入；边缘限定指定管理员邮箱并要求 MFA。经用户单独确认，认证器自助门户已保存并刷新核验：仅允许精确单邮箱和 One-time PIN，门户应用及策略会话均为 30 分钟，只关联 App Launcher，不改变 Admin API 的 MFA 要求。2026-10-20 在新 Worker 发布前已确认 Biometrics 设备绑定、强制挑战及本人验证后的实际放行；同一浏览器新请求管理 flags 已抵达当时的 Worker，因未提交管理员 secret 返回 `ADMIN_FORBIDDEN`。这项生产边缘 MFA 验收通过，保留 Worker 拒绝；不代表带 secret 的管理操作或新 Worker 的 Access JWT 独立验签已完成生产验收。三个边缘限流 namespace 已在发布前与账户内三个 Worker 当前设置核对无复用，并随新 Worker 上传及远程读回；未检查历史未启用版本。生产缺 binding 将返回 503。

遗留数据库学籍表要求 UID 至少 6 字符；JWT 验证遵守 Firebase 的 1–128 字符规则，短 UID 新建学籍明确返回 `UID_NOT_SUPPORTED`，完整兼容需后续安全迁移。

学生档案默认 private，公开需明确同意，可撤回。所有私有操作由服务端验签 UID 定位资源。档案删除需要明确确认和最近五分钟 Google 认证，只删除 ANU D1 档案及关联记录，保留 Google 账户与 Firebase 身份。

Firebase Web `apiKey`、app/project IDs、authDomain 和 Turnstile site key 为客户端公开参数。`TURNSTILE_SECRET_KEY`、`ADMIN_API_TOKEN`、`IP_HASH_SALT`、Cloudflare token、私钥及 SQL 备份必须保持私有，不提交到 Git。[Firebase API key 指南](https://firebase.google.com/docs/projects/api-keys)。

## 备份与发布

```bash
# 从仓库根目录运行：私有导出，生成 SHA-256
./worker/scripts/backup-restore.sh backup

# 仅恢复到新的隔离本地模拟器，不覆盖生产
./worker/scripts/backup-restore.sh restore-local /absolute/private/backup.sql
```

旧的远程原地 `restore` 已禁用。`npm run deploy` 和 `npm run db:migrate:prod` 默认阻止生产变更，要求明确批准标记及一小时内经过权限/hash 校验的备份；这些标记不能代替用户批准和验收。发布前先评审 [PRODUCTION_ROLLOUT.md](docs/PRODUCTION_ROLLOUT.md)，核对 frontend action、Access、边缘限流及迁移依赖，再按批准的顺序操作。
