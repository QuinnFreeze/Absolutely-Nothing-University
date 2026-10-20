# ANU 网站安全审计与验收记录

检查日期：2026-10-19；2026-10-20 更新生产只读预检、备份及 MFA 进展（Asia/Shanghai）。前端：[freeze.edu.kg](https://freeze.edu.kg)；API：[api.freeze.edu.kg](https://api.freeze.edu.kg/api/v1/health)。架构保持 GitHub Pages + Firebase Authentication + Cloudflare Workers + D1 + Turnstile，保留牛津蓝白主题、校园内容和游客功能。

**本轮加固代码尚未部署或推送，生产 `0003` 迁移尚未执行。新用户注册已在备份后关闭，不能将本地测试描述为生产验收。** 发布影响、操作顺序与回滚见 [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md)。

## 1. 真实生产状态

| 对象 | 已核实事实（日期逐项注明） | 边界或剩余工作 |
| --- | --- | --- |
| GitHub Pages | 2026-10-20 通过 GitHub CLI 复核：`built`、来源 `main` 根目录、CNAME `freeze.edu.kg`、`https_enforced=true`；远程 `main` 仍为 `d02aceb509fbef8dc2ad5866f0d07731f3077451`。证书在 2026-10-19 已核实 `approved`，到期日 2027-01-16 | 这是已有发布；本轮前端改动尚未上线 |
| Firebase | 沿用已有项目及公开 Web App 配置；2026-10-18 已确认 Google 提供方启用；2026-10-19 再通过公开项目配置确认正式域在授权域列表中 | 历史控制台记录不是本轮真人 OAuth 联调；不得宣称完整登录通过 |
| Worker | 2026-10-20 只读 API 复核仍为版本 `4e829602-af8d-4c75-ab59-1cb09c1eea76`、100% 流量；正式自定义域 `api.freeze.edu.kg`，`workers.dev` 及 preview 均为关闭 | 该版本不包含本轮加固；未部署新的限流 binding |
| D1 | 2026-10-20 仅 SELECT 迁移账本：`0001`、`0002` 已应用，`0003_security_hardening.sql` 待应用，`rows_written=0` | 新列和 token ledger 仍是待发布结构；未查询学生记录 |
| 注册开关 | 2026-10-19 私有备份后只关闭 `registration_enabled`；2026-10-20 再次公开读取 health：`ok:true`、注册 `false`，论文、证书和公开目录均为 `true`，本次未改开关 | 注册须保持关闭，直至安全验收和开放批准 |
| 备份 | 最新导出为 2026-10-20 00:14:19 UTC；10,906 bytes，文件 `0600`、目录 `0700`，仓库外保存；SHA-256 `28a4734eeabb97bfeb4b1b7741369006f7e66011db0af444d73f16338490de33` 已匹配。历史 2026-10-19 02:07:40 UTC 备份为 10,901 bytes、`0600`，hash `573a67f54852d52ddfd46d0a878ee4cb97e2fdff4aa1a89cffe33384dfebb376` | 不公开 SQL 内容、私有路径或任何凭据；实际发布时仍须使用一小时内的有效备份，过期须重新导出 |
| 管理保护 | 已按用户授权创建 ANU Admin API Access 应用，保护 `/api/v1/admin` 及其子路径；限定指定邮箱、每次登录独立 MFA、1h 应用会话；真实 issuer/AUD 已填入待发布配置。经另行确认启用单邮箱、仅 OTP、30 分钟的 App Launcher 自助注册门户；2026-10-20 已确认一个 Biometrics 设备，创建及最近使用日期均为当天 | CLI token 读取 Access 策略在 2026-10-19 为 403；控制台已保存并刷新核验。门户仅关联 App Launcher，未改变 Admin API 原策略/MFA；管理入口仍停在真实生物识别挑战，未成功返回 API，真人 MFA 登录未验收 |
| 真实账户流程 | 尚未完成真人 Google OAuth、真实 Turnstile、生产账户写入及物理 iPhone Safari 验收 | 不计为通过；响应式尺寸、UA 模拟和本地 fixtures 均不能替代 |

公开 Firebase Web `apiKey`、项目标识和 Turnstile site key 用于客户端配置，不是管理员凭据。服务端 secret、Cloudflare API token、私钥、原始用户令牌和备份 SQL 不应进入 Git、公开文档或浏览器日志。[Firebase API key 指南](https://firebase.google.com/docs/projects/api-keys)。

## 2. 代码审查与本轮修改

| 风险与问题 | 本轮实现 | 验收重点 |
| --- | --- | --- |
| 挑战结果缺少上下文检查及持久重放记录 | 服务端校验 `success === true`、明确 hostname 白名单、`register/paper/diploma/import` action、挑战时间；完整响应超时；只保存 token 的 SHA-256，D1 唯一写入拒绝并发重放 | 无效、过期、错域、错 action、重复 token；真实 site key/secret 配对仍待验收 |
| 缺配置或读取失败时功能仍可能开放 | 缺少开关或 D1 读取失败均关闭；health 降级时四功能均返回关闭 | 不把读取失败解释为“新用户未注册”或服务可用 |
| 高频 API 请求消耗 D1 配额 | IP/UID 优先使用边缘 Rate Limiting binding；写入先过边缘，再由 D1 原子占位限制每 UID 每小时 25 次；生产缺 binding 或服务异常返回 503 | 已核对账户内三个 Worker 当前设置，拟用 namespace 无复用；未检查历史未启用版本，发布前复核。不能将边缘计数当作精确全局配额 |
| 身份伪造、时间声明和密钥轮换处理不足 | RS256、固定 JWKS 来源、`kid/aud/iss/sub/user_id/iat/exp/auth_time/nbf` 校验，Google provider 限制；有界缓存、轮换刷新及外部响应超时 | 假签名、错误声明、未知 key、外部不可用；仅签名校验不承诺撤销令牌即时失效 |
| 管理接口仅依赖共享 secret | 生产要求高熵管理员 token 与独立验签的 Access JWT；校验 issuer、audience、有效期 | 已核对唯一邮箱 Allow 策略及每次登录 MFA，保护管理子树；真实 issuer/audience 已填入，真人第二因素仍待验收 |
| 生产/开发混用 | 独立 `wrangler.dev.toml` 使用本地数据库标识及 localhost 来源；生产仅允许正式 HTTPS 来源，额外拒绝 loopback；生产缺少有效 IP hash salt 时返回 503 | dry-run、真实 binding/路由及 secrets 名称核对；不替换已有 D1 |
| 越权和隐私泄漏 | 所有私有查询从已验签 UID 派生身份；拒绝前端身份覆盖；默认 private；公开必须明确同意，可撤回；导出仅本人档案 | 两账号交叉测试、公开撤回和导出不可含内部 UID |
| 并发注册、旧表单覆盖和导入部分提交 | UID 主键防一号多档；注册冲突明确返回 409；档案 revision 预条件；导入 receipt、归档和徽章放在同一 batch，payload fingerprint 防同 key 异内容 | 同 UID 并发、跨标签旧 revision、并发重复导入、故障整批回滚；保留原生产数据。新 receipt 响应补全协议与旧 Worker 不完全兼容，回滚必须隔离导入或使用兼容版本 |
| 档案删除语义和凭据时效 | 明确确认口令；注册/删除要求五分钟内真实 Google 认证；删除 D1 档案及关联记录，保留 Google 账户和 Firebase 身份 | recent-auth 使用 403，刷新 ID token 不等于重新 Google 认证；导出/删除均需真实账户验收 |
| 登录和同步竞争 | 意图预热；SDK 就绪后在点击同一调用栈开启 popup；失败可重试；阻止跨域盲目 redirect；退出/切账号隔离迟到 token、请求和挑战 | 弹窗取消/受阻、网络失败、退出等待、恢复会话；登录失败不能影响游客 |
| 无界请求、重复写和不完整响应 | 所有 API 请求有 Abort 超时；明确 401 GET 强刷后最多重试一次；写入不自动重放；严格检查 profile 和四类集合；旧 GET 不覆盖新 mutation，同业务双击复用请求 | Worker 不可用仍保留已知档案，显示同步错误和手动重试 |
| 前端反馈与 PNG 导出 | My ANU 移动端布局、双语错误与同步状态；成绩单、论文、证书导出处理字体、长文本、Canvas/Blob 和失败反馈 | 本地 Canvas mock 仅验证代码路径；浏览器实际成图、可读性与设备保存单独验收 |

SQL 参数使用预编译绑定，动态表名只来自固定列表；用户内容经长度限制并通过安全 DOM 输出。Bearer token 使用显式 Authorization，API 不依赖跨站自动附带的登录 cookie；CORS 与权限检查仍保留。静态扫描及输入用例并不是穷尽的 XSS、SQL 注入或 CSRF 安全证明。

Cloudflare 边缘限流按位置计数、最终一致，适合削峰，不承担精确账本；本轮保留 D1 写配额。[Rate Limiting 官方限制](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。Firebase 手动验签要求及令牌撤销检查是不同边界，本项目尚未接入管理员侧实时撤销查询。[Firebase ID token 验证](https://firebase.google.com/docs/auth/admin/verify-id-tokens)。

## 3. 测试入口与证据分类

```bash
# 仓库根目录，Node.js 24+
node --no-warnings tests/run-tests.mjs
node tests/student-auth-tests.mjs
node tests/canvas-export-tests.mjs

# Worker 的依赖安装及检查
cd worker
npm ci
npm run typecheck
npm run deploy:dry-run
```

| 层级 | 已编写的覆盖 | 不能据此认定的内容 |
| --- | --- | --- |
| 静态/单元 | 双语 HTML 绑定、游客功能相关数据、公开配置与 secret 扫描；PNG 异常及输入边界 | 线上样式、最终 PNG 视觉和物理设备保存 |
| 认证客户端模拟 | 20 组测试覆盖初始化重试、点击同步 popup、会话恢复/切换/退出、GET 401、写入不重放、超时、错误 shape、revision 409、竞态、导出/删除；Safari 为 UA 模拟 | Google 真登录、弹窗策略的实机行为、物理 iPhone Safari |
| Worker 本地集成 | 实际 TypeScript 处理器、实际内存 SQLite 和 Web Crypto RSA 签名；覆盖所有权、声明伪造、重放、限流、Access、并发注册/更新、导入及删除 | 外部 Firebase/Google/Turnstile/Access/边缘 binding 使用模拟；不是远程 D1 或生产 E2E |
| Wrangler 本地/dry-run | 隔离本地 D1 三次迁移完成；最终打包 dry-run、TypeScript 通过，三个 Rate Limiting binding 被正确识别 | 本地成功不说明生产 binding 已创建、Access 配置完成或新版本已发布 |
| 生产只读/防护动作 | 本日 Pages/Worker 状态读取；私有备份后关闭注册；按后续明确授权配置边缘 Access/MFA 并检查公共接口 | 未执行新版本生产发布、`0003` 迁移或测试用户写入 |

**最终本地验收：通过。** 2026-10-19 对最终代码运行 `node --no-warnings tests/run-tests.mjs`、Worker TypeScript 和 `git diff --check`，退出码均为 0；Wrangler 4.151.1 已实际安装，部署 dry-run 成功（未上传）。`npm install` 审计 38 个包，报告 0 个已知漏洞；这不是完整依赖安全保证。

- 20 组认证客户端模拟测试、23 组 Worker 本地测试；Worker 测试使用真实 SQLite/RSA 与模拟外部网络，覆盖随机编号固定、全局唯一冲突整批回滚、归档读失败不伪装空数据，以及注册/记录/徽章同批提交。
- Canvas 5 组模拟用例；备份导出和发布门禁使用隔离仓库布局、真实文件系统及临时 Wrangler stub。验证无批准、备份过期/权限不私有/hash 不符、仓库根目录/子目录、符号链接及父级遍历均拒绝；拒绝发生在目录创建、chmod 或 CLI 之前，相邻同名前缀目录与含空格路径可正常使用。SQL 与校验文件的链接目标均复核；没有运行真实生产发布或导出真实用户数据。
- `node tests/browser-regression.cjs`：真实 Chrome 渲染、本地静态站点、Firebase/API/Turnstile fixtures、系统字体。390/768/1440 px × 中英文 × 手动浅/深色均无横向溢出；20 张截图，4 张实际 PNG，覆盖成绩单/论文/证书及 2400×3058 长内容。验证来源切换、账号切换、删除失败/未确认不清本机、成功仅删云端保留 Google 身份、JSON 导出、ARIA 键盘、错误语言切换和同步重试。
- 使用真实 Firebase SDK 的独立 Chrome 游客检查通过：初始化无认证错误，本机论文/证书功能正常，无页面运行异常；没有执行 Google OAuth 或生产账户写入。
- 3 次隔离 Wrangler 本地迁移成功；今日备份已恢复至全新私有临时本地数据库，验证导出可恢复，未覆盖生产。

浏览器脚本在缺少 8088 服务时会自行启动并关闭本地服务器；需要已安装 Chrome 与 Playwright（可用 `PLAYWRIGHT_MODULE` 指定）。测试证据为本机私有产物，不将截图、备份或用户数据加入公开仓库。Safari 场景仍使用 Chromium，仅改变 UA/视口，**不是物理 iPhone 或 WebKit 验收**。

## 4. Google 登录与 MFA 的剩余边界

GitHub Pages 当前没有同源 `/__/auth/*` helper。保留既有 `firebaseapp.com` authDomain，先使用 popup；只有部署并验证同源 helper、OAuth redirect URI 后才允许 redirect 回退。单独修改 authDomain 或增加 302 跳转不能提供该 helper。[Firebase redirect 最佳实践](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

Access JWT 验签不能证明 MFA 策略已开启。需核对管理应用及其 Allow 规则，使用受支持的 IdP MFA 或独立 MFA，并检查更具体的策略是否覆盖上级要求；实际登录也必须验证第二因素。策略 API 在 2026-10-19 返回 403，已通过控制台完成独立 MFA 方法开启及应用/策略的强制要求配置；保存后重新读取确认。用户另行确认后，30 分钟会话的自助注册门户已启用，先前 `NoAuth` 阻断已修复；2026-10-20 已从设备表确认一个 Biometrics 设备及当天的创建/最近使用日期。设备绑定不等于管理登录成功：管理 flags 入口仍显示生物识别挑战，未成功返回 API，见第 7 节。Admin API 应用会话仍为 1h；“每次登录 MFA”不是每个 API 请求再次验证。[Cloudflare MFA 配置](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)。

## 5. 开放注册前必须解决的事项

1. 本地自动化、TypeScript、dry-run 和 Chrome 桌面/移动布局回归已通过；正式发布时仍需对批准的最终提交重新运行。
2. 三个边缘限流 namespace 在 2026-10-20 再次与账户内当前 Worker 配置核对无复用，发布前复核；Access 应用与 issuer/audience 已配置，Biometrics 设备绑定已确认，仍需管理员在管理入口实际完成第二因素挑战并成功返回 API，才能记为 MFA 登录通过。
3. 2026-10-20 已再次私有备份；按发布方案评审影响和回滚，执行时核对备份仍在一小时内，再协调前端 action 与后端版本，执行必要的 `0003` 增量迁移。新代码和迁移仍未发布，开放注册尚未授权。
4. 在隔离环境完成新注册，并用明确授权的验收账号完成真实 Google、Turnstile、档案同步/导出/删除、隐私公开及撤回。当前没有仅验收账号注册通道，不得为测试自行全局开放注册。
5. 使用物理 iPhone Safari 验证登录、取消/受阻提示、退出切换、刷新恢复及 PNG 保存。确认生产错误恢复和已有用户数据后，再取得开放注册批准。
6. Firebase 规范允许 1–128 字符 UID，但遗留生产 `students` 表要求至少 6 字符。本轮保留原表，短 UID 注册明确返回 `400 UID_NOT_SUPPORTED`，不将有效身份误判为假 token；完整支持短 UID 需要另行审查保留数据和关联表的安全迁移。通常自动生成的 Google UID 不受此遗留限制影响，仍需记录兼容边界。

## 6. 数据保留边界

云端删除会级联删除本人学生档案及业务记录；安全审计仅保留哈希身份，私有备份是独立灾备副本，不由该接口立即清除。保留期限与备份到期清理规则仍需运营者确定，本轮未擅自删除历史备份。前端隐私说明已明确这一边界。

备份导出在创建目录前核对真实路径，发布门禁独立核对 SQL、父目录及校验文件；仓库内路径及指向仓库的符号链接均不能作为生产备份。旧 Worker 回滚可保留新增表列和数据，但不能直接兼容本轮仅保存计数的新导入 receipt。生产没有独立 import 开关；需另行评审精确导入路由维护规则，或准备保留本轮安全校验的兼容回滚版本。不得删账本、覆盖生产数据库或关闭认证/Access 来换取兼容，具体步骤见发布方案第 7 节。

## 7. Access 边缘验证（2026-10-19—20）

- 应用 `ANU Admin API`（ID `b4e5841c-4e8c-41db-b248-de8595cf850d`），关联唯一邮箱白名单策略，未允许整个邮箱域、Everyone、Bypass 或 Service Auth 业务通行。管理员邮箱只保存在 Cloudflare，未写入公开源码或报告。
- `https://quiet-water-b981.cloudflareaccess.com` 的公开 JWKS 返回 200、两把 RSA 公钥；应用 AUD 已从保存后的应用页面复制，未使用策略 ID 代替。
- 独立 curl 检查：公共 health 200 且注册 false，未登录 `/me` 401，管理 flags 302 到团队登录域。Python urllib 的一轮请求全部出现 403，未计入通过；独立 curl 能正常读取，因此没有按该客户端现象扩大来源或移除保护。
- 仅 OPTIONS 转发给 Worker 原有严格 CORS；合法来源 PUT 预检 204 且精确 Allow-Origin，非白名单来源 403。HttpOnly 和管理路径 Cookie 属性开启；裸管理路径与 flags 匿名访问均 302，实际管理方法仍由 Access 验证。
- 当前生产 `workers.dev` 和 preview URLs 均为关闭；本地配置显式 `workers_dev=false`、`preview_urls=false`，避免后续发布意外恢复旁路。
- 新 Worker 尚未部署，因此当前是边缘 Access 加已有 Worker 管理 secret。新版本上线后才增加 Worker 对 Access JWT 的独立验签。回滚必须保留边缘 Access/MFA，不能因回滚删除该应用。

- 2026-10-19 管理员首次 Cloudflare SSO 返回拒绝，未扩宽白名单；已添加 One-time PIN 作为该应用的指定邮箱验证方式，仍保留应用及唯一策略的独立 MFA 要求。一次性邮箱码本身不计为第二因素；该阶段尚待本人注册，后续设备绑定结果见 2026-10-20 复核。[官方 OTP 说明](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)。

- 2026-10-19 管理员报告完成邮箱验证码后，使用同一 Chrome 会话访问管理 flags，实际进入独立 MFA 页面，显示 `No authentication methods set up` 与 `Setup MFA`。当时第二因素注册和成功登录尚未完成；已交由管理员本人处理，未读取验证码、登录令牌或 MFA 密钥。
- 后续排查曾确认 `Setup MFA` 和官方 `/AddMfaDevice` 入口被未启用的 App Launcher 阻断至 `#/NoAuth`。用户本轮已明确确认启用自助入口；浏览器保存后刷新重新读取，唯一 Allow 策略为 `ANU administrator MFA enrollment`（ID `f419fc5a-9592-4508-ab52-9db39d344e0e`），限制精确单邮箱、仅 One-time PIN，`acceptAllIdPs=false`，门户应用与策略会话均为 30 分钟。该策略只关联一个 App Launcher 应用，不修改 ANU Admin API 原策略、独立 MFA 或管理 secret 要求；管理员邮箱不写入 Git。门户规则不授予所保护应用的新权限。[门户设置](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/app-launcher/)、[独立 MFA 注册](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/)。
- 保存并刷新核验后，真实 `/AddMfaDevice` 已显示 `Secure your account with MFA`，提供 `Biometrics`、`Security key`、`Authenticator application` 三种选项，先前 `NoAuth` 阻断已修复；未读取二维码、OTP、登录令牌或 MFA 密钥。2026-10-20 门户设备表已确认一个 Biometrics 设备，创建与最近使用日期均为当天，不记录设备 ID。
- 2026-10-20 管理 flags 入口实际强制显示 `Authenticate your identity` 和 `Use your device's biometrics to continue`。用户曾报告已验证，但页面仍停在第二因素挑战，不能据此记为 MFA 登录通过。从 Cancel 返回方法选择后，已手动选择 `Unnamed Authenticator` 重试，当前交由本人确认生物识别；尚未成功返回 API。
- 2026-10-19 及 2026-10-20 的只读账户 API 均检查三个 Worker 当前上传设置，均无 Rate Limiting binding；拟用 `353403995691`、`353403995692`、`353403995693` 无匹配。此结论不涵盖历史未启用版本，不表示新 binding 已部署，也未修改其它 Worker。
- 2026-10-20 生产只读预检确认正式路由为 `api.freeze.edu.kg` → `anu-student-api / production`，无额外 zone route，`workers.dev=false`、`preview=false`；部署仍为上述旧版本、100% 流量。仅核对三个 secret 名称 `ADMIN_API_TOKEN`、`IP_HASH_SALT`、`TURNSTILE_SECRET_KEY` 存在，不读取值，不证明盐长度或 key 配对。D1 使用固定 SELECT 读取迁移账本，`0001/0002` 已应用、`0003` 待应用、`rows_written=0`；未初始化表或查询学生记录。
