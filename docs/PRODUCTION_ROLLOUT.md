# ANU 生产发布影响、验收与回滚方案

日期：2026-10-19 制定，2026-10-20 更新实际发布与上线验收记录。保持 GitHub Pages + Firebase Authentication + Cloudflare Workers + D1。**用户已批准具体版本 `6eae1ce`，Pages、Worker 和 D1 `0003` 已按方案发布；新用户注册继续关闭，开放注册尚未授权。**

## 1. 发布结果与回滚基线

- 前端源版本：`6eae1cefe23ef5968bd3fdfd5d5155d256fe8d5e`，已推送 `main`，Pages 于 2026-10-20 00:29:36 UTC 报告 `built`。来源为 `main` 根目录，CNAME `freeze.edu.kg`、强制 HTTPS；独立 HTTPS 六文件的字节及 SHA-256 与批准源一致。发布前回滚提交为 `d02aceb509fbef8dc2ad5866f0d07731f3077451`；后续纯文档提交可能推进分支，不改变业务源版本。
- Worker 新版本：`c22b3178-7872-4d77-a06a-ea2d7f9408ae`，远程读回 100% 流量，正式域 `api.freeze.edu.kg`，`workers.dev` 及 preview 仍关闭；发布前回滚版本为 `4e829602-af8d-4c75-ab59-1cb09c1eea76`。三个 IP/UID/写入边缘限流 binding 已随新版上传并读回，限制分别为 120/30/10 次每 60 秒；不能以打包 dry-run 代替本次真实发布。
- 备份：2026-10-20 00:14:19 UTC 仓库外私有导出，10,906 bytes，文件 `0600`、目录 `0700`，SHA-256 `28a4734eeabb97bfeb4b1b7741369006f7e66011db0af444d73f16338490de33` 匹配。迁移与 Worker 发布分别通过一小时内备份门禁；历史备份保留。
- D1：`0003_security_hardening.sql` 于 2026-10-20 00:31:32 UTC 应用，8 条命令成功；`0001/0002` 保留。原六个学生业务表均 0→0，system_flags 4→4、rate_limits 9→9、security_audit_log 4→4，原 25 索引与 3 配额触发器保留；新增 revision、request_hash、token ledger 及索引存在，总索引 28。前后只读比较全部通过，没有新增或删除学生记录。
- 新 Worker 真实 API 11 项探测通过，health 为 `ok:true`、注册 `false`，论文、证书和公开目录仍为 `true`；D1 读回 `registration_enabled=0`。远程部署元数据 7 项核对通过，包含当前版本/流量、三个限流 binding、原 D1、正式 vars、域、旁路关闭及三个 secret 名称；没有读取 secret 值。
- 生产游客 Chrome 使用真实 Firebase SDK、字体及正式页面，无网络 mock，21 项检查通过；96 组校园布局、12 组 My ANU 布局无横向溢出，蓝白默认主题及手动深色保持正常，完成五张实际 PNG 和本机 JSON 导出。没有 OAuth 或生产学生写入。

本次没有删除生产记录或重建 D1；服务端密钥和 SQL 保持私有。真实 Google、Turnstile、生产学生流程与物理 iPhone Safari 的验收尚未完成，不能为测试放开注册或关闭安全措施。

## 2. 变更影响与依赖

| 变更 | 正常影响 | 未就绪时的行为 |
| --- | --- | --- |
| 新前端 | 登录预热、同步状态、移动布局和导出；挑战携带四种明确 action；revision 随已知档案更新提交 | 保留游客功能；网络或认证失败提示重试，不伪装云端保存成功 |
| `0003` 增量迁移 | 新增 `turnstile_tokens` 及过期索引；`idempotency_keys.request_hash`、`students.revision` 默认值兼容旧行；保持注册关闭 | 新 Worker 依赖这些结构，不能先部署后端再补迁移 |
| Turnstile | 新后端要求 hostname/action/时效和一次性使用 | 旧前端未带 action 的写入将被拒绝，须协调发布及缓存刷新 |
| 边缘 Rate Limiting | IP/UID 减少 D1 访问，写入保留 D1 25/hour 硬限额 | 生产缺少/失效 binding 返回 503，不能降级放行；三个 namespace 发布前已与账户内三个 Worker 当前设置核对无复用，并随新版上传和读回；未检查历史未启用版本 |
| Access + 管理 secret | 管理接口同时要求有效 token 和 Access JWT；Access 策略必须配置 MFA | 真实 issuer/audience 已配置；2026-10-20 已确认 Biometrics 绑定、强制挑战和本人验证后新请求抵达 Worker，生产边缘 MFA 验收通过。未提交 secret，Worker 拒绝保留；带 secret 操作和新 Worker 独立验签仍待生产验收 |
| Firebase | 保留现有 Google 提供方、项目、授权域和 popup 路径 | 不切换到不存在的同源 helper，不新建替代项目 |
| 档案删除 | 显式确认且最近五分钟 Google 认证；只删除本人 ANU D1 档案及其关联记录 | 认证过旧返回 403，需重新 Google 登录；不删除 Google/Firebase 身份 |

本轮 schema 增量不移除数据或改变已有主键，旧 Worker 可继续读取原有表列；这不代表全部业务协议均向后兼容。新导入 receipt 只保存计数，响应时才附加当前本人档案；旧 Worker 直接返回 receipt，重放新 receipt 会缺少 `data`。回滚时须按第 7 节隔离导入或使用兼容回滚版本。D1 迁移仍属于生产变更，必须先备份并审查实际 SQL。

## 3. 发布前检查清单（后续发布仍须执行）

从仓库根运行最终全集，再在 Worker 目录运行检查：

```bash
node --no-warnings tests/run-tests.mjs
node --check app.js
node --check js/student-auth.js
git diff --check
cd worker
npm ci
npm run typecheck
npm run deploy:dry-run
```

1. 对照 `package-lock.json` 核对依赖。当前目标为 Wrangler `4.151.1` 和 Workers types `5.20261019.1`，以最终安装及 dry-run 输出确认兼容性；不把“已修改版本声明”当作安装完成。
2. 使用 `wrangler.dev.toml` 的独立本地数据库验证三次迁移与原数据保留，不向生产 ID 写入；开发配置只有 localhost 来源和非生产数据库标识。
3. 对照现有 Worker 版本、D1 migration list、Pages 发布记录，记录部署前基线；读取 secret 名称即可，不输出其值。
4. 核对 Rate Limiting namespace、正式域 CORS、Turnstile hostname/secret 配对和 action；生产不增加 localhost 白名单。
5. 读取并验证 Access 的管理路径应用、受限管理员规则、实际 MFA；填入正确 issuer/audience。2026-10-19 查询 Access 策略曾返回 403；用户已另行明确授权免费方案与管理员防护，已通过控制台创建限定管理子树的应用并重新读取 MFA 设置。后续应复核该应用，不能重复创建或绕过 MFA。
6. 完成真实浏览器回归，分别标注本地 fixtures、真实 SDK 初始化、真实 OAuth、物理设备。当前真人 OAuth、真实挑战和物理 Safari 均未验收。
7. 展示本方案、最终 diff、测试结果、数据库影响和回滚版本，交由用户评审；发布授权必须对应这一具体版本。

## 4. 备份与隔离恢复演练

已准备的脚本将 SQL 导出至仓库外私有目录，生成 SHA-256 校验文件，抑制可能含签名 URL 的提供商导出日志。

```bash
# 仓库根目录；此命令只导出，不改变数据库
./worker/scripts/backup-restore.sh backup

# 用实际私有备份路径替换占位符；只恢复到全新隔离本地模拟器
./worker/scripts/backup-restore.sh restore-local /absolute/private/backup.sql
```

`restore-local` 校验 `.sha256` 后使用新临时目录，不覆盖生产数据库。旧的 `restore` 子命令已禁用；不要将 dump 直接导入已有生产 D1。演练应核对 schema、记录计数和关键约束，报告只保留脱敏结果。

如需修改 `ANU_BACKUP_DIR`，必须选择仓库之外、仅操作者可访问的位置。备份脚本在创建目录或修改权限之前核对目录的真实路径，并复核 SQL 与校验文件的符号链接目标；仓库根目录、子目录或经符号链接指向仓库的路径均拒绝。发布门禁独立复核备份及校验文件的真实路径，不能只依赖导出脚本；与仓库名称共享前缀的相邻目录可正常使用。正式发布需要一小时内、非空、无组/其它用户访问权限、SHA-256 匹配的备份。

## 5. 已批准发布的执行顺序与复用模板

本次已按“备份 → Pages → 核验文件 → D1 `0003` → Worker → 上线检查”的顺序执行。以下命令保留为后续发布模板，不应无条件重复已应用的迁移。`ANU_PRODUCTION_APPROVED=1` 只是一道本地操作防误触门禁，不代替用户批准、访问权限或测试结果。`ANU_VERIFIED_BACKUP` 指向实际私有绝对路径，不能把该路径写回公开报告。

1. 重新导出并验证备份，确认注册仍为关闭；保存旧 Worker 版本、Pages 提交和 D1 当前迁移记录。
2. 先发布包含明确 Turnstile action 的前端并验证线上文件；旧后端忽略新增 action，因而可先兼容运行。保持注册关闭，检查游客及已有账号错误反馈。
3. 对仍打开旧页面的用户提供刷新提示；在新后端上线后旧无 action 挑战会失败，需刷新页面并重新验证，不得临时放宽服务端检查。
4. 在授权窗口应用 `0003`，检查列/索引、原记录计数及注册关闭状态；若失败，停止后端发布并读取迁移状态，不重复盲跑 `ALTER TABLE`。
5. 确认 Rate Limiting、已创建的 Access 应用、真人 MFA 验收、secrets 与正式路由已就绪，再发布新 Worker，记录新 version ID。

```bash
# 仅在以上检查、私有备份和用户批准齐备后；从 worker/ 目录执行
ANU_PRODUCTION_APPROVED=1 ANU_VERIFIED_BACKUP=/absolute/private/backup.sql npm run db:migrate:prod
ANU_PRODUCTION_APPROVED=1 ANU_VERIFIED_BACKUP=/absolute/private/backup.sql npm run deploy
```

脚本默认拒绝生产操作，并检查备份是否在一小时内、权限私有且 hash 匹配。数据库变更与 Worker 部署分别检查门禁；即使第一步成功，也不能跳过下一步的检查。

## 6. 上线验收与注册开放

| 范围 | 必须验证的行为 |
| --- | --- |
| 基础设施 | 正常 HTTPS、Pages 线上文件、Worker version、三次迁移和限流 binding；缺配置/服务异常拒绝，管理接口不可绕过 Access |
| 登录 | 正式域真人 Google 登录、取消/受阻、网络异常、过期凭据、退出及切账号、刷新恢复；Worker 故障时游客仍可用 |
| 本人档案 | 已有账号数据不丢失，修改/导出/删除权限正确；真实成绩由后端计算；论文/证书/徽章和导入同步明确反馈 |
| 安全隔离 | 两账号无法访问/修改对方；一次性 Turnstile 重放失败；公开需明确同意且撤回立即生效；服务端异常不泄漏细节 |
| 移动与导出 | 物理 iPhone Safari 登录及保存 PNG；桌面与移动中英文/深色模式；长文本、中文字体、成绩单和证书导出可读 |

注册验收先在隔离非生产资源进行。当前实现没有仅验收 UID 的注册白名单；若要求在正式 D1 建立新验收档案，需先评审受限验收通道，不能为测试将全局注册开关提前打开。

全部安全验收完成后，先取得开放注册批准，再通过受 Access + MFA 保护的管理接口开启 `registration_enabled`，读回 health 并记录操作结果。不能因有管理员 secret 就绕过 Access。整个验收期间注册保持关闭；任何未通过项均列为阻断，而不是标为“默认可用”。

## 7. 回滚方案

- **前端异常**：回退到发布前 Pages 提交 `d02aceb509fbef8dc2ad5866f0d07731f3077451`，验证正式 HTTPS 内容及游客功能。若后端已升级，旧前端缺 action 的受保护写入会被拒绝；需要同时回滚 Worker，或保留兼容的新前端修复版，不能放松 Turnstile。
- **Worker 异常**：回滚到部署前确认的版本；当前记录为 `4e829602-af8d-4c75-ab59-1cb09c1eea76`，执行前再次核对。新增列/ledger 和用户档案均保留，不能逆删列或删除 receipt 以换取兼容。旧版重放新导入 receipt 会返回缺少 `data` 的响应；生产没有单独的 import 功能开关，不能声称切换一个不存在的开关即可恢复。若使用该旧版，应先通过受审查的精确路由规则暂停 `POST /api/v1/me/import`，返回明确维护错误；或者准备保留本轮安全校验、支持新 receipt 补全本人档案的兼容回滚版本，再验收导入恢复。本方案不自动执行这些生产变更。保持注册关闭及独立边缘 Access/MFA；旧 Worker 不含新 JWT/挑战/默认拒绝加固，回滚仅用于隔离故障，不能移除认证、所有权、挑战或管理保护来恢复写入。
- **迁移异常**：停止后续发布、检查应用记录；不要删除生产表、逆删列或用 dump 覆盖现库。加法迁移已完成时，优先回滚应用并保留新增结构。
- **数据异常**：冻结受影响写入，先备份异常后的现状；评审 D1 Time Travel 恢复点或新数据库切换方案，并说明可能影响恢复点之后的写入。生产恢复需要单独授权及核验，不能由通用 restore 命令自动执行。
- **Access/边缘配置异常**：停止部署；若已影响生产，回滚应用版本或修复受审查的配置。不得删除 Access 要求、放宽管理员权限或缺 binding 时放行。

备份回滚与代码回滚是不同动作。恢复旧代码通常不需要恢复旧数据库；无理由执行数据库恢复可能覆盖本轮之后的合法数据。[D1 Time Travel 官方说明](https://developers.cloudflare.com/d1/reference/time-travel/)。

## 8. 已获单独授权的边缘配置

2026-10-19 用户明确批准免费 Zero Trust 与管理员防护，并指定唯一管理员邮箱。本日已创建 ANU Admin API 应用（`b4e5841c-4e8c-41db-b248-de8595cf850d`），保护 `/api/v1/admin` 及其继承子路径；应用和唯一策略要求独立 MFA，应用会话 1h。邮箱保存在控制台，不进入公开仓库。这些边缘配置授权与发布授权独立；后续已另行取得 `6eae1ce` 的 Pages、Worker 和 `0003` 发布批准，仍未获得开放注册授权。

管理员应用使用精确邮箱 OTP 身份验证，并继续要求独立 MFA。一次性邮箱码不代替第二因素，也不取消 Worker 管理 secret。管理员完成邮箱验证后，初次入口曾显示 `No authentication methods set up`；后续经单独授权启用自助门户，2026-10-20 已从设备表确认一个 Biometrics 设备，创建和最近使用日期均为当天。同日实际管理入口强制挑战、本人验证后的新请求抵达 Worker，生产边缘 MFA 验收通过，最终证据见下文；不将这一结果扩大为管理操作或新 Worker 独立 JWT 验签已通过。

`Setup MFA` 和官方 `/AddMfaDevice` 先前因 App Launcher 未启用而落到 `#/NoAuth`；该阻断现已修复。用户本轮明确确认启用，浏览器保存后刷新重新读取，唯一 Allow 策略为 `ANU administrator MFA enrollment`（ID `f419fc5a-9592-4508-ab52-9db39d344e0e`），只允许精确单个管理员邮箱、仅 One-time PIN，`acceptAllIdPs=false`，门户应用与策略会话均为 30 分钟。策略只关联一个 App Launcher 应用，不修改 Admin API 原策略、独立 MFA、1h 应用会话或 Worker 管理 secret 要求；不将管理员邮箱写入 Git。

真实 `/AddMfaDevice` 已显示 `Secure your account with MFA` 及 `Biometrics`、`Security key`、`Authenticator application` 选项。2026-10-20 管理 flags 入口实际显示 `Authenticate your identity` 和 `Use your device's biometrics to continue`；早先用户报告完成时，旧页面仍停在挑战，当时没有计为通过。随后从 Cancel 返回方法选择并手动选择 `Unnamed Authenticator`，交由本人重试。

用户最终报告已跳回 API 后，同一 Chrome 会话发起新请求 `https://api.freeze.edu.kg/api/v1/admin/flags`，实际显示 Worker JSON `{"ok":false,"error":{"code":"ADMIN_FORBIDDEN","message":"Administrative authorization required."}}`；浏览器状态再次核对最终主机/路径确为 `api.freeze.edu.kg/api/v1/admin/flags`。这证明已绑定的 Biometrics 经过强制挑战和本人验证后，Access/MFA 实际放行至 Worker；该项生产边缘 MFA 验收通过。未提交管理员 secret，所以 Worker 仍拒绝管理授权。未读取 cookie、token、二维码、OTP 或设备凭据，也不将请求 ID、设备 ID、邮箱或私有证据路径写入 Git。

MFA 登录验收这一项阻断已解除，该证据发生在新 Worker 发布前。新版本和 `0003` 已按具体批准上线；带 secret 的管理操作和新 Worker 的 Access JWT 独立验签仍未进行生产验收。注册保持关闭，开放注册尚未授权；真人 Google OAuth、真实 Turnstile 成功与重放、生产账户流程和物理 iPhone Safari 的既定验收要求不变。

## 9. 本次上线后的真实 API 验证（2026-10-20）

| 检查 | 真实结果 |
| --- | --- |
| health + 正式来源 | 200，`ok:true`，注册 false，精确 Allow-Origin，HSTS/CSP 存在 |
| 匿名 `/me`、伪造 UID 头、畸形 Bearer | 均 401，未返回学生数据 |
| 非法来源、生产 localhost | 均 403，无 Allow-Origin |
| 正式来源 PATCH 预检 | 204，精确 Allow-Origin |
| 匿名管理入口、伪造 Access 头 | 均 302 至团队 Access 登录域 |
| 管理 PUT 预检 | 正式来源 204；非法来源 403、无 Allow-Origin |

共 11 项实际请求全部符合预期。没有发送生产学生写请求，没有读取 cookie、原始 JWT 或密钥。匿名防护结果不代替真实身份的签名链、资源所有权、Turnstile 或 UID/写入边缘限流验收。生产 health 200 只表明本次请求的 IP 限流及盐配置检查通过。

## 10. 后续前端登录恢复补丁（2026-10-21，待批准）

修复详情见安全审计第 8 节。拟发布范围仅 GitHub Pages 的 `app.js`、`js/student-auth.js` 及随附测试/文档：登录超时与 SDK 身份到达顺序不再留下过时错误，后续操作反馈和云端失败保留。没有 Worker、D1、Firebase、Access 或权限配置变更，不执行数据库迁移或学生数据写入；注册保持关闭。原 90 秒 UI 等待上限及服务端近期认证要求不变。

发布前核对具体补丁提交、测试结果及远程基线；该补丁不在原 `6eae1ce` 授权内，须先获得新的前端发布批准，再将批准提交发布至 Pages。发布后核对 Pages 构建、两份线上 JS 的 SHA-256、游客和认证错误界面及 health 注册状态。真实 OAuth 仍需独立完成，不能由 fixture 通过替代。

若此补丁造成回归，使用新的 Git revert 提交将业务 JS 恢复为补丁前版本（`63cb865`，业务内容与 `6eae1ce` 相同），核对 Pages 与正式 HTTPS 内容；不回退 Worker，不改动 D1、不删数据或认证记录，不放宽现有安全校验。
