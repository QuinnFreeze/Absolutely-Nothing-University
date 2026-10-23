# ANU 网站安全审计与验收记录

2026-10-23 已定位真实账号云端验证 503 的运行时根因：共享验证请求使用 Workers 不支持的 `redirect: "error"`，尚未发出请求即抛错。本地改为 `manual` 并显式拒绝全部 3xx，保留不跟随重定向、3.5 秒完整响应截止、64 KiB 限额及所有验签要求。新增真实 workerd + 临时 D1 的 145 项回归、Node 清理/超时模拟、全套测试及 TypeScript 通过，打包 dry-run 完成。**此 Worker 修复尚未发布，完整真实登录仍未通过；注册保持关闭。** 具体影响、测试边界、备份门禁及回滚见 [WORKER_AUTH_VERIFIER_ROLLOUT.md](WORKER_AUTH_VERIFIER_ROLLOUT.md)。

侧边栏、登录布局与公开搜索版本 `efcb4b5` 已获明确批准，经 PR #3 合并为 `1272310` 并发布；Pages 于 2026-10-22 12:37:33 UTC 构建成功。搜索使用公开源数据的显式字段快照，排除身份、云端/本机档案、用户生成记录及测验答案；查询不发送、持久化或插入 HTML。本地全套测试、Worker 类型检查及 94/94 隔离 Chrome 搜索检查通过；发布后的真实 SDK/字体、无 mock 游客与文件联合验收 50/50 通过，11 份普通 HTTPS 文件摘要匹配。真实 OAuth、已认证业务和物理 Safari 的未验收边界保留。范围与回滚见 [SEARCH_NAVIGATION_ROLLOUT.md](SEARCH_NAVIGATION_ROLLOUT.md)，注册仍关闭。

2026-10-22 登录界面版本 `739aaa2` 已经单独批准并通过 PR #2 发布；Google 品牌资料、单条 DNS TXT、Search Console Domain 所有权验证及品牌验证/发布也已按明确批准完成。Google 控制台确认品牌已经验证并向用户显示，真实 Google 账号选择页已核实新名称。身份会话恢复已观察到，Worker 认证验证仍暂不可用，完整 OAuth 与已认证业务未通过。影响、执行结果和回滚见 [LOGIN_BRANDING_ROLLOUT.md](LOGIN_BRANDING_ROLLOUT.md)。本项未增加登录 scopes，未修改认证回调、Firebase `authDomain` 或注册开关。

检查日期：2026-10-19；2026-10-20 更新首次发布，2026-10-21 更新登录恢复补丁，2026-10-22 更新登录界面、品牌验证和生产复核（Asia/Shanghai）。前端：[freeze.edu.kg](https://freeze.edu.kg)；API：[api.freeze.edu.kg](https://api.freeze.edu.kg/api/v1/health)。架构保持 GitHub Pages + Firebase Authentication + Cloudflare Workers + D1 + Turnstile，保留牛津蓝白主题、校园内容和游客功能。

**初次加固已按用户批准的 `6eae1ce` 发布前端和 Worker，在私有备份后完成生产 `0003` 增量迁移；2026-10-21 又按单独批准发布前端登录恢复补丁 `67347cb`；随后获批的登录界面版本 `739aaa2` 已通过 PR #2 发布，侧栏与公开搜索版本 `efcb4b5` 也已按单独批准通过 PR #3 发布，Worker/D1 未变。新用户注册仍关闭；真实账户与物理设备验收尚未完成，不得开放注册。** 发布影响、操作顺序与回滚见 [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md) 及各后续前端发布记录。

## 1. 真实生产状态

| 对象 | 已核实事实（日期逐项注明） | 边界或剩余工作 |
| --- | --- | --- |
| GitHub Pages | 初次源为 `6eae1ce`；登录恢复补丁 `67347cb` 经 PR #1、登录界面 `739aaa2` 经 PR #2 发布。最新获批前端 `efcb4b5` 经 PR #3 合并为 `1272310e500fdccccabc7899d365c048eca3949f`，Pages 于 2026-10-22 12:37:33 UTC 构建成功；11 份普通 HTTPS 资产 SHA-256 与批准源一致。`main` 根目录、CNAME 及 HTTPS 保留 | 后续纯文档提交可能推进 `main`，前端业务源为 `efcb4b5`；真人 OAuth 未通过 |
| Firebase | 沿用已有项目及公开 Web App 配置；2026-10-18 已确认 Google 提供方启用；2026-10-19 再通过公开项目配置确认正式域在授权域列表中；生产游客 Chrome 真实 SDK 初始化无认证错误 | SDK 初始化不等于真人 Google OAuth 联调 |
| Google 品牌与网域 | 2026-10-22 按明确批准保存名称 `Absolutely Nothing University (ANU)`、首页、隐私政策及开发者联系信息；保留原 Firebase 品牌网域并新增 `freeze.edu.kg`。仅新增一条 Google TXT，原 16 条 DNS 全保留；独立 DoH 核对 TXT 和原 SPF。Search Console Domain 所有权验证成功，Google 控制台明确确认品牌已经验证并向用户显示 | 真实 Google 账号选择页已核实新名称；身份会话恢复不代表新的 OAuth 回跳、Worker 验证或学生写入成功；私人邮箱、TXT 挑战值及私有证据不进入 Git |
| Worker | 2026-10-20 已发布新版本 `c22b3178-7872-4d77-a06a-ea2d7f9408ae` 至 `api.freeze.edu.kg`，远程读回 100% 流量、三个 Rate Limiting binding、原 D1、正式 vars 及域；`workers.dev` 和 preview 仍关闭。部署元数据 7 项、health 与匿名防护检查通过 | 旧版回滚标识为 `4e829602-af8d-4c75-ab59-1cb09c1eea76`；匿名检查不代替已认证业务验收 |
| D1 | 先备份，再于 2026-10-20 00:31:32 UTC 应用 `0003_security_hardening.sql`，8 条命令成功；`0001/0002` 保留。新增 revision、request_hash、token ledger 及索引存在；六个学生业务表计数均为 0→0，原 25 个索引和 3 个配额触发器保留，总索引 28 | 没有新建或删除生产学生记录；只读迁移前后检查 `rows_written=0`，不代表真实账户写入验收 |
| 注册开关 | 发布后真实 health：`ok:true`、注册 `false`，论文、证书和公开目录均为 `true`；D1 读回 `registration_enabled=0` | 注册须保持关闭，直至安全验收和另行开放批准 |
| 备份 | 初次发布使用 2026-10-20 00:14:19 UTC 仓库外私有导出，10,906 bytes，文件 `0600`、目录 `0700`，SHA-256 `28a4734eeabb97bfeb4b1b7741369006f7e66011db0af444d73f16338490de33` 已匹配；该次 D1 迁移与 Worker 部署分别通过一小时内备份门禁。后续前端补丁不操作 D1；历史备份保留 | 不公开 SQL、私有路径或凭据；未来迁移或 Worker 发布重新检查备份时效，过期须重新导出 |
| 管理保护 | ANU Admin API Access 应用保护 `/api/v1/admin` 及其子路径，限定单个管理员邮箱、每次登录独立 MFA、1h 会话；新 Worker 已配置真实 issuer/AUD。另经授权启用仅该邮箱、OTP、30 分钟的 App Launcher 注册门户。2026-10-20 Biometrics 绑定、强制挑战及本人验证后抵达旧 Worker 的边缘 MFA 验收通过 | CLI token 读取 Access 策略曾为 403，控制台保存并刷新核验；门户不改变 API 权限。未提交管理员 secret，旧 Worker 返回 `ADMIN_FORBIDDEN`；新 Worker 的独立 Access JWT 验签和带 secret 操作仍待真实生产验收 |
| 真实游客 UI | 初次正式站点回归 21 项通过，26 张截图、5 张 2400 px 宽 PNG；96 组校园布局和 12 组 My ANU 布局无溢出。`739aaa2` 的真实游客检查 9/9 通过，含实际 PNG；最新 `efcb4b5` 的真实 SDK/字体、无网络 mock 游客与文件联合检查 50/50 通过，18 张截图，含 390/1440 px 双语蓝白/深色刷新、登录入口、侧栏、搜索课程定位与隐私页；页面运行错误、失败请求与学生 API 操作均为 0 | 不执行 Google OAuth 或生产学生写入，不能代替真实账户或物理 iPhone Safari |
| 真实账户流程 | 真人 Google OAuth、真实 Turnstile 成功与重放、生产账户写入及物理 iPhone Safari 尚未完成 | 不计为通过；响应式尺寸、UA 模拟和本地 fixtures 均不能替代 |

公开 Firebase Web `apiKey`、项目标识和 Turnstile site key 用于客户端配置，不是管理员凭据。服务端 secret、Cloudflare API token、私钥、原始用户令牌和备份 SQL 不应进入 Git、公开文档或浏览器日志。[Firebase API key 指南](https://firebase.google.com/docs/projects/api-keys)。

## 2. 代码审查与本轮修改

| 风险与问题 | 本轮实现 | 验收重点 |
| --- | --- | --- |
| 挑战结果缺少上下文检查及持久重放记录 | 服务端校验 `success === true`、明确 hostname 白名单、`register/paper/diploma/import` action、挑战时间；完整响应超时；只保存 token 的 SHA-256，D1 唯一写入拒绝并发重放 | 无效、过期、错域、错 action、重复 token；真实 site key/secret 配对仍待验收 |
| 缺配置或读取失败时功能仍可能开放 | 缺少开关或 D1 读取失败均关闭；health 降级时四功能均返回关闭 | 不把读取失败解释为“新用户未注册”或服务可用 |
| 高频 API 请求消耗 D1 配额 | IP/UID 优先使用边缘 Rate Limiting binding；写入先过边缘，再由 D1 原子占位限制每 UID 每小时 25 次；生产缺 binding 或服务异常返回 503 | 发布前已核对账户内三个 Worker 当前设置，namespace 无复用；三个 binding 已随新版上传并远程读回。未检查历史未启用版本，不能将边缘计数当作精确全局配额 |
| 身份伪造、时间声明和密钥轮换处理不足 | RS256、固定 JWKS 来源、`kid/aud/iss/sub/user_id/iat/exp/auth_time/nbf` 校验，Google provider 限制；有界缓存、轮换刷新及外部响应超时 | 假签名、错误声明、未知 key、外部不可用；仅签名校验不承诺撤销令牌即时失效 |
| 管理接口仅依赖共享 secret | 生产要求高熵管理员 token 与独立验签的 Access JWT；校验 issuer、audience、有效期 | 已核对唯一邮箱 Allow 策略及每次登录 MFA，保护管理子树；2026-10-20 生产边缘 MFA 放行已实测。带管理员 secret 的授权操作及新 Worker 的独立 JWT 验签仍待生产验收 |
| 生产/开发混用 | 独立 `wrangler.dev.toml` 使用本地数据库标识及 localhost 来源；生产仅允许正式 HTTPS 来源，额外拒绝 loopback；生产缺少有效 IP hash salt 时返回 503 | dry-run、真实 binding/路由及 secrets 名称核对；不替换已有 D1 |
| 越权和隐私泄漏 | 所有私有查询从已验签 UID 派生身份；拒绝前端身份覆盖；默认 private；公开必须明确同意，可撤回；导出仅本人档案 | 两账号交叉测试、公开撤回和导出不可含内部 UID |
| 并发注册、旧表单覆盖和导入部分提交 | UID 主键防一号多档；注册冲突明确返回 409；档案 revision 预条件；导入 receipt、归档和徽章放在同一 batch，payload fingerprint 防同 key 异内容 | 同 UID 并发、跨标签旧 revision、并发重复导入、故障整批回滚；保留原生产数据。新 receipt 响应补全协议与旧 Worker 不完全兼容，回滚必须隔离导入或使用兼容版本 |
| 档案删除语义和凭据时效 | 明确确认口令；注册/删除要求五分钟内真实 Google 认证；删除 D1 档案及关联记录，保留 Google 账户和 Firebase 身份 | recent-auth 使用 403，刷新 ID token 不等于重新 Google 认证；导出/删除均需真实账户验收 |
| 登录和同步竞争 | 意图预热；SDK 就绪后在点击同一调用栈开启 popup；失败可重试；阻止跨域盲目 redirect；退出/切账号隔离迟到 token、请求和挑战 | 弹窗取消/受阻、网络失败、退出等待、恢复会话；登录失败不能影响游客 |
| 无界请求、重复写和不完整响应 | 所有 API 请求有 Abort 超时；明确 401 GET 强刷后最多重试一次；写入不自动重放；严格检查 profile 和四类集合；旧 GET 不覆盖新 mutation，同业务双击复用请求 | Worker 不可用仍保留已知档案，显示同步错误和手动重试 |
| 前端反馈与 PNG 导出 | My ANU 移动端布局、双语错误与同步状态；成绩单、论文、证书导出处理字体、长文本、Canvas/Blob 和失败反馈 | 本地 Canvas mock 验证代码路径；生产 Chrome 已下载并检查五张实际 PNG，物理 iPhone 保存仍待验收 |

SQL 参数使用预编译绑定，动态表名只来自固定列表；用户内容经长度限制并通过安全 DOM 输出。Bearer token 使用显式 Authorization，API 不依赖跨站自动附带的登录 cookie；CORS 与权限检查仍保留。静态扫描及输入用例并不是穷尽的 XSS、SQL 注入或 CSRF 安全证明。

Cloudflare 边缘限流按位置计数、最终一致，适合削峰，不承担精确账本；本轮保留 D1 写配额。[Rate Limiting 官方限制](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。Firebase 手动验签要求及令牌撤销检查是不同边界，本项目尚未接入管理员侧实时撤销查询。[Firebase ID token 验证](https://firebase.google.com/docs/auth/admin/verify-id-tokens)。

## 3. 测试入口与证据分类

```bash
# 先在 worker/ 执行 npm ci；仓库根目录，Node.js 24+
node --no-warnings tests/run-tests.mjs
node --no-warnings tests/workerd-verifier-tests.mjs
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
| 生产发布与只读验证 | 按具体版本批准更新 Pages/Worker，备份后应用 `0003`；前端文件 hash、D1 结构/记录计数、11 项真实 API 防护检查通过 | 没有生产测试学生写入；未验证真实 Turnstile 或已认证业务的完整权限链 |
| 生产 Chrome 游客 | 真实 SDK/字体、无网络 mock；21 项检查、96 组校园布局、12 组 My ANU 布局、五张实际 PNG、游客 JSON 导出通过 | 不执行 OAuth；不证明物理 Safari、跨账号权限或云端写入成功 |

**最终本地验收：通过。** 2026-10-19 对最终代码运行 `node --no-warnings tests/run-tests.mjs`、Worker TypeScript 和 `git diff --check`，退出码均为 0；Wrangler 4.151.1 已实际安装，部署 dry-run 成功（未上传）。`npm install` 审计 38 个包，报告 0 个已知漏洞；这不是完整依赖安全保证。

2026-10-20 发布前再次执行全套本地测试、`npm run typecheck` 和 `npm run deploy:dry-run`，退出码均为 0。最终 bundle 为 104.41 KiB（gzip 26.88 KiB），三个边缘限流 binding 均被识别，未上传 Worker。随后按批准执行实际发布；下述本地 fixtures 与生产游客回归分别记录，均不扩大为 Google、Turnstile 或物理 Safari 验收。

- 20 组认证客户端模拟测试、23 组 Worker 本地测试；Worker 测试使用真实 SQLite/RSA 与模拟外部网络，覆盖随机编号固定、全局唯一冲突整批回滚、归档读失败不伪装空数据，以及注册/记录/徽章同批提交。
- Canvas 5 组模拟用例；备份导出和发布门禁使用隔离仓库布局、真实文件系统及临时 Wrangler stub。验证无批准、备份过期/权限不私有/hash 不符、仓库根目录/子目录、符号链接及父级遍历均拒绝；拒绝发生在目录创建、chmod 或 CLI 之前，相邻同名前缀目录与含空格路径可正常使用。SQL 与校验文件的链接目标均复核；这些门禁用例没有运行真实生产发布或导出真实用户数据，后续获准的实际发布另行记录。
- `node tests/browser-regression.cjs`：真实 Chrome 渲染、本地静态站点、Firebase/API/Turnstile fixtures、系统字体。390/768/1440 px × 中英文 × 手动浅/深色均无横向溢出；20 张截图，4 张实际 PNG，覆盖成绩单/论文/证书及 2400×3058 长内容。验证来源切换、账号切换、删除失败/未确认不清本机、成功仅删云端保留 Google 身份、JSON 导出、ARIA 键盘、错误语言切换和同步重试。
- 2026-10-20 对已发布正式站点进行隔离 Chrome 游客检查，使用真实 Firebase SDK 和远程字体，无网络 mock 或 route interception：21 项通过、26 张截图，五张实际 PNG 均宽 2400 px。校园 8 页面 × 3 宽度 × 中英 × 浅/深色共 96 组无文档溢出，My ANU 对应 12 组正常；系统深色下仍默认蓝白，手动深色刷新后保留。本机论文/证书、考试成绩、JSON 导出及 PNG 下载正常；console error、pageerror、requestfailed 均为 0，游客流程未请求学生 API，未执行 OAuth 或生产学生写入。
- 3 次隔离 Wrangler 本地迁移成功；2026-10-19 私有备份已恢复至全新临时本地数据库，验证导出可恢复，未覆盖生产。发布使用的 2026-10-20 新备份另行核验了权限、时效与 SHA-256，不将旧备份恢复演练误记为新备份恢复演练。
- 新 Worker 上线后 11 项真实 API 检查通过：health 200 且注册 false；匿名、伪造 UID、畸形 Bearer 的 `/me` 均 401；非法 Origin 和 localhost 均 403 且无 Allow-Origin；合法 PATCH 预检 204；匿名及伪造 Access 请求管理入口均 302 至团队登录域；管理 PUT 合法预检 204、非法预检 403。未发送学生写请求，也未以伪造请求的拒绝证明完整 JWT 验签链通过。

浏览器脚本在缺少 8088 服务时会自行启动并关闭本地服务器；需要已安装 Chrome 与 Playwright（可用 `PLAYWRIGHT_MODULE` 指定）。测试证据为本机私有产物，不将截图、备份或用户数据加入公开仓库。Safari 场景仍使用 Chromium，仅改变 UA/视口，**不是物理 iPhone 或 WebKit 验收**。

## 4. Google 登录与 MFA 的剩余边界

2026-10-20 使用真实 Chrome 发起桌面 Google 登录，已进入账号选择及基本资料授权页，操作者明确批准姓名、头像和邮箱授权。最终尚未观察到 Firebase 登录完成或有效身份访问 Worker；多次尝试触发 90 秒超时，主站显示明确提示且重试按钮恢复。当前无法区分外部回跳与浏览器自动化延迟，不能断言根因或将 OAuth 标记通过；手动对照验收仍待完成。没有建立学生档案或开放注册。

GitHub Pages 当前没有同源 `/__/auth/*` helper。保留既有 `firebaseapp.com` authDomain，先使用 popup；只有部署并验证同源 helper、OAuth redirect URI 后才允许 redirect 回退。单独修改 authDomain 或增加 302 跳转不能提供该 helper。[Firebase redirect 最佳实践](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

Access JWT 验签不能证明 MFA 策略已开启。需核对管理应用及其 Allow 规则，使用受支持的 IdP MFA 或独立 MFA，并检查更具体的策略是否覆盖上级要求；实际登录也必须验证第二因素。策略 API 在 2026-10-19 返回 403，已通过控制台完成独立 MFA 方法开启及应用/策略的强制要求配置；保存后重新读取确认。用户另行确认后，30 分钟会话的自助注册门户已启用，先前 `NoAuth` 阻断已修复。2026-10-20 已确认 Biometrics 设备绑定、强制挑战及本人验证后的实际放行：同一浏览器新请求管理 flags 到达 Worker，因未提交管理员 secret 返回 `ADMIN_FORBIDDEN`，详见第 7 节。这项生产边缘 MFA 验收通过；带 secret 的管理操作和新 Worker 的 Access JWT 独立验签尚未进行生产验收。Admin API 应用会话仍为 1h；“每次登录 MFA”不是每个 API 请求再次验证。[Cloudflare MFA 配置](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)。

## 5. 开放注册前必须解决的事项

1. 本地自动化、TypeScript、dry-run 已通过，批准版本已发布；11 项生产 API 防护和生产游客 Chrome 回归已通过。后续业务代码变更需要重新执行受影响检查。
2. Access 应用、issuer/audience 及生产边缘 MFA 已分别核验。带管理员 secret 的授权操作和新 Worker 的 Access JWT 独立验签仍需真实验收，不能由旧 Worker 前的边缘 MFA 放行替代。
3. 在隔离环境完成新注册，并用明确授权的验收账号完成真实 Google、Turnstile 成功与重放、档案同步/导出/删除、两账号隔离、隐私公开及撤回。当前没有仅验收账号注册通道，不得为测试全局开放注册或直接向正式 D1 插入测试档案。
4. 使用物理 iPhone Safari 验证登录、取消/受阻提示、退出切换、刷新恢复及 PNG 保存。通过安全验收后，仍须另行取得开放注册批准。
5. Firebase 规范允许 1–128 字符 UID，但遗留生产 `students` 表要求至少 6 字符。本轮保留原表，短 UID 注册明确返回 `400 UID_NOT_SUPPORTED`，不将有效身份误判为假 token；完整支持短 UID 需要另行审查保留数据和关联表的安全迁移。通常自动生成的 Google UID 不受此遗留限制影响，仍需记录兼容边界。

## 6. 数据保留边界

云端删除会级联删除本人学生档案及业务记录；安全审计仅保留哈希身份，私有备份是独立灾备副本，不由该接口立即清除。保留期限与备份到期清理规则仍需运营者确定，本轮未擅自删除历史备份。前端隐私说明已明确这一边界。

备份导出在创建目录前核对真实路径，发布门禁独立核对 SQL、父目录及校验文件；仓库内路径及指向仓库的符号链接均不能作为生产备份。旧 Worker 回滚可保留新增表列和数据，但不能直接兼容本轮仅保存计数的新导入 receipt。生产没有独立 import 开关；需另行评审精确导入路由维护规则，或准备保留本轮安全校验的兼容回滚版本。不得删账本、覆盖生产数据库或关闭认证/Access 来换取兼容，具体步骤见发布方案第 7 节。

## 7. Access 边缘验证（2026-10-19—20）

- 应用 `ANU Admin API`（ID `b4e5841c-4e8c-41db-b248-de8595cf850d`），关联唯一邮箱白名单策略，未允许整个邮箱域、Everyone、Bypass 或 Service Auth 业务通行。管理员邮箱只保存在 Cloudflare，未写入公开源码或报告。
- `https://quiet-water-b981.cloudflareaccess.com` 的公开 JWKS 返回 200、两把 RSA 公钥；应用 AUD 已从保存后的应用页面复制，未使用策略 ID 代替。
- 独立 curl 检查：公共 health 200 且注册 false，未登录 `/me` 401，管理 flags 302 到团队登录域。Python urllib 的一轮请求全部出现 403，未计入通过；独立 curl 能正常读取，因此没有按该客户端现象扩大来源或移除保护。
- 仅 OPTIONS 转发给 Worker 原有严格 CORS；合法来源 PUT 预检 204 且精确 Allow-Origin，非白名单来源 403。HttpOnly 和管理路径 Cookie 属性开启；裸管理路径与 flags 匿名访问均 302，实际管理方法仍由 Access 验证。
- 当前生产 `workers.dev` 和 preview URLs 均为关闭；本地配置显式 `workers_dev=false`、`preview_urls=false`，避免后续发布意外恢复旁路。
- 新 Worker 已上线，增加 Worker 对 Access JWT 的独立验签；对应真实有效 JWT 和管理员 secret 的完整链路尚未验收。回滚必须保留边缘 Access/MFA，不能因回滚删除该应用。

- 2026-10-19 管理员首次 Cloudflare SSO 返回拒绝，未扩宽白名单；已添加 One-time PIN 作为该应用的指定邮箱验证方式，仍保留应用及唯一策略的独立 MFA 要求。一次性邮箱码本身不计为第二因素；该阶段尚待本人注册，后续设备绑定结果见 2026-10-20 复核。[官方 OTP 说明](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)。

- 2026-10-19 管理员报告完成邮箱验证码后，使用同一 Chrome 会话访问管理 flags，实际进入独立 MFA 页面，显示 `No authentication methods set up` 与 `Setup MFA`。当时第二因素注册和成功登录尚未完成；已交由管理员本人处理，未读取验证码、登录令牌或 MFA 密钥。
- 后续排查曾确认 `Setup MFA` 和官方 `/AddMfaDevice` 入口被未启用的 App Launcher 阻断至 `#/NoAuth`。用户本轮已明确确认启用自助入口；浏览器保存后刷新重新读取，唯一 Allow 策略为 `ANU administrator MFA enrollment`（ID `f419fc5a-9592-4508-ab52-9db39d344e0e`），限制精确单邮箱、仅 One-time PIN，`acceptAllIdPs=false`，门户应用与策略会话均为 30 分钟。该策略只关联一个 App Launcher 应用，不修改 ANU Admin API 原策略、独立 MFA 或管理 secret 要求；管理员邮箱不写入 Git。门户规则不授予所保护应用的新权限。[门户设置](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/app-launcher/)、[独立 MFA 注册](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/)。
- 保存并刷新核验后，真实 `/AddMfaDevice` 已显示 `Secure your account with MFA`，提供 `Biometrics`、`Security key`、`Authenticator application` 三种选项，先前 `NoAuth` 阻断已修复；未读取二维码、OTP、登录令牌或 MFA 密钥。2026-10-20 门户设备表已确认一个 Biometrics 设备，创建与最近使用日期均为当天，不记录设备 ID。
- 2026-10-20 管理 flags 入口实际强制显示 `Authenticate your identity` 和 `Use your device's biometrics to continue`。早先用户报告已验证时，旧页面仍停在第二因素挑战，当时没有计为通过；随后从 Cancel 返回方法选择，手动选择 `Unnamed Authenticator` 重试并交由本人确认生物识别。
- 用户最终报告已跳回 API 后，同一 Chrome 会话新请求 `https://api.freeze.edu.kg/api/v1/admin/flags`，页面实际返回 Worker JSON：`{"ok":false,"error":{"code":"ADMIN_FORBIDDEN","message":"Administrative authorization required."}}`；浏览器状态再次确认最终主机/路径确为 `api.freeze.edu.kg/api/v1/admin/flags`。因此 Biometrics 绑定、强制挑战及本人验证后请求抵达 Worker 这一项生产边缘 MFA 验收通过。未提交管理员 secret，Worker 拒绝保持有效；没有读取 cookie/token，不记录请求 ID、邮箱、设备 ID 或私有证据路径。该证据发生在新 Worker 发布前，不能证明带 secret 管理操作或新 Worker 的 Access JWT 独立验签通过。
- 2026-10-19 及 2026-10-20 发布前的只读账户 API 检查三个 Worker 当时上传设置，拟用 `353403995691`、`353403995692`、`353403995693` 无复用。新 Worker 已上传并读回 IP/UID/写入三个 binding，限制分别为 120/30/10 次每 60 秒；未修改其它 Worker，未检查历史未启用版本。
- 2026-10-20 发布前只读预检确认正式路由为 `api.freeze.edu.kg` → `anu-student-api / production`，无额外 zone route，`workers.dev=false`、`preview=false`；保存旧版本作回滚基线。只核对 `ADMIN_API_TOKEN`、`IP_HASH_SALT`、`TURNSTILE_SECRET_KEY` 名称，不读取值。随后按批准先迁移再发布；新 Worker 的生产 health 200 表明本次请求的 IP 限流及盐配置检查通过，不证明 Turnstile key/secret 配对或 UID/写入限流实测。

## 8. 后续登录恢复补丁（2026-10-21，已发布）

Worker 业务代码仍为获批的 `6eae1ce`；前端补丁 `67347cb` 已获独立批准并通过 PR #1 发布。本节单独记录后续修复，不将检查混为初次加固的验收。补丁发布前真实 Chrome 在账号选择、已获授权的基本资料确认之后，出现超时或弹窗关闭后取消的反馈，刷新后仍为游客；键盘操作对照也未完成回跳。浏览器自动化曾报告页面响应处理暂停，当前不能据此确定站点、Google 或工具的根因，真实 OAuth 仍未通过。

代码审查另行确认了可复现的状态问题：SDK observer 晚于超时时会保留旧认证错误；observer 先成功而 popup Promise 后超时，也可能覆盖成功状态。补丁在合法 SDK 身份恢复后清除过期错误，仅对本次意图中新出现的身份会话处理后者；既有账号未变化的切换超时继续报错，取消/网络失败不吞掉，等待云端读取期间退出或切换账号会拒绝旧结果。恢复返回 `observer`，不代表重新完成近期 Google 认证；服务端 `auth_time` 要求保持不变。已失败的云端读取不会被恢复分支自动重试。

界面只替换仍属于此次登录失败的提示，保留 JSON 导出等后续操作反馈；云端不可用仍明确显示错误。没有改变 90 秒 UI 等待上限、JWT、Turnstile、Access/MFA、CORS、权限、注册开关或数据结构。

验证结果：

- 26 组认证客户端模拟通过，含 observer 先/后超时、旧账号不变、云端失败、恢复等待期间退出与换账号。SDK、API 与加速时钟均为模拟；不证明真实 OAuth 通过。
- 全套本地测试及 Worker TypeScript 检查退出码 0；两份业务 JS 语法检查及 `git diff --check` 通过。
- `node tests/auth-recovery-browser.cjs`：隔离 Chrome、本地页面和公开 `ANU_AUTH` 接口 fixture；中英 × 390/1440 px × 三类状态共 12 项通过，12 张截图。超时后成功提示恢复、真实游客 JSON 下载反馈保留、云端错误优先均验证；蓝白默认且无横向溢出，无 console/pageerror 或意外外部请求。没有真实 SDK/Google/Turnstile/生产写入。

补丁已获独立发布批准，合并提交 `61080c8` 的 Pages 构建和两份 JS 正式 HTTPS 摘要已核对。发布后独立 Chrome 使用真实 SDK/字体、无网络 mock 的游客检查 7/7 通过：390/1440 px 蓝白默认、语言/手动主题/刷新、登录预热和游客导航正常，实际论文 PNG 为 2400×1728、797,555 bytes；console/page/request failure 均为 0，学生 API 请求为 0。该检查不执行 Google OAuth 或生产写入。

2026-10-21 生产只读复核 4/4 通过：Worker 仍为原版本且承接 100% 流量、D1 原绑定保留、开发/预览旁路关闭、health 正常且注册 false。影响与回滚见发布文档第 10 节。注册继续关闭，原有真实 Turnstile、生产学生流程、管理员完整链路和物理 iPhone Safari 的验收边界不变。

## 9. 登录界面与 Google 品牌发布（2026-10-22）

用户明确批准 PR #2 对应前端提交 `739aaa2`，以及 Google 品牌资料保存、DNS TXT、Search Console 所有权验证和品牌验证/发布。前端已合并为 `5a0e64d3eeefb04305f3a586925b959fe37da064`，Pages 于 2026-10-21 12:11:03 UTC 构建成功。登录卡片保留现有认证、退出、账号切换、同步、导入与超时恢复接口；双语 `privacy.html` 及页脚入口已上线。`index.html`、`styles.css`、`app.js`、`js/i18n.js`、`js/student-auth.js` 和隐私页的线上摘要与获批源一致。

- 本地全套测试、Worker TypeScript、JS 语法及 diff 检查此前通过；登录卡片/隐私页的隔离 Chrome fixture 20 项通过。身份、API 等外部服务在该 fixture 中为模拟。
- 真实生产游客检查 9/9 通过：390/1440 px、中英文、默认蓝白与手动深色及刷新、登录入口、隐私页和 2400×1728 PNG 下载正常；console/page/request failure 均为 0，学生 API 请求为 0。该检查不执行真人 OAuth 或生产学生写入。
- 2026-10-22 已保存 Google 应用名称 `Absolutely Nothing University (ANU)`、首页、隐私政策及开发者联系信息。品牌网域只新增 `freeze.edu.kg`，原 Firebase 网域保留；OAuth client、scopes、回调、Firebase `authDomain` 未变。
- DNS 操作前重新读取的 16 条记录与仓库外私有备份一致；只新增一条 Google TXT 后为 17 条，结构对照确认原记录缺失 0、恰新增 1。独立 DoH 同时见到 Google 验证 TXT 与原 SPF，未修改网站或邮件解析。
- Search Console Domain 所有权验证已成功。Google 控制台明确显示“您的品牌已经过验证，正在向用户显示。”品牌已发布，真实 Google 账号选择页已显示新名称及本站隐私入口。完成名称核验后关闭选择弹窗；本轮未完成新的 OAuth 回跳，不将品牌验证等同于账号流程验收。
- 同日只读生产复核 4/4 通过：Worker 仍为 `c22b3178-7872-4d77-a06a-ea2d7f9408ae`、100% 流量，D1 原绑定不变，`workers.dev` 和 preview 均关闭；正式 Origin 的 health 为 200、`ok:true`、注册 `false`。本次未部署 Worker、执行迁移、查询学生记录或修改 Access。

同一 Chrome 会话在页面初始化后恢复了 Firebase 登录身份，但云端同步仍提示“Authentication verification is temporarily unavailable. Please retry.”，并提供重试入口。此为真实可见状态，不代表 Worker 已成功验证该身份。关闭账号选择弹窗后，原 Firebase 身份保留，切换/退出按钮恢复可用并显示取消提示。未建立学生档案或执行生产学生写入；认证验证不可用的根因仍待排查。

DNS/品牌操作记录与浏览器证据保存在仓库外，不提交私人邮箱、TXT 挑战值、凭据或私有证据目录。注册继续关闭，真实 Google OAuth、Turnstile 成功/重放、生产档案操作、管理员完整链路及物理 iPhone Safari 的验收要求不变。回滚保留原方案，详见登录品牌发布记录。
