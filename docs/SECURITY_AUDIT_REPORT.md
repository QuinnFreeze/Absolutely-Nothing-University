# ANU 网站安全审计与验收记录

检查日期：2026-10-19（Asia/Shanghai）。前端：[freeze.edu.kg](https://freeze.edu.kg)；API：[api.freeze.edu.kg](https://api.freeze.edu.kg/api/v1/health)。架构保持 GitHub Pages + Firebase Authentication + Cloudflare Workers + D1 + Turnstile，保留牛津蓝白主题、校园内容和游客功能。

**本轮加固代码尚未部署或推送，生产 `0003` 迁移尚未执行。新用户注册已在备份后关闭，不能将本地测试描述为生产验收。** 发布影响、操作顺序与回滚见 [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md)。

## 1. 真实生产状态

| 对象 | 2026-10-19 已核实事实 | 边界或剩余工作 |
| --- | --- | --- |
| GitHub Pages | `main` 构建状态为 `built`，CNAME 为 `freeze.edu.kg`，`https_enforced=true`；证书 `approved`，到期日 2027-01-16 | 这是已有发布；本轮前端改动尚未上线 |
| Firebase | 沿用已有项目及公开 Web App 配置；2026-10-18 已确认 Google 提供方启用；本日再次通过公开项目配置确认正式域在授权域列表中 | 历史控制台记录不是本日真人 OAuth 联调；不得宣称完整登录通过 |
| Worker | 线上仍为已有版本 `4e829602-af8d-4c75-ab59-1cb09c1eea76` | 该版本不包含本轮加固 |
| D1 | 保留既有数据；`0003_security_hardening.sql` 尚未应用到生产 | 新列和 token ledger 仍是待发布结构 |
| 注册开关 | 完成私有备份后，只将 `registration_enabled` 关闭；线上 health 已读回 `false`，其余三个开关为 `true` | 注册须保持关闭，直至安全验收和开放批准 |
| 备份 | 2026-10-19 02:07:40 UTC 导出到仓库外私有位置；10,901 bytes，权限 `0600`；SHA-256 为 `573a67f54852d52ddfd46d0a878ee4cb97e2fdff4aa1a89cffe33384dfebb376` | 不公开 SQL 内容、私有路径或任何凭据；正式变更前须另取一小时内的新备份 |
| 管理保护 | 新配置要求管理员 secret 与已签名的 Access JWT；当前配置的 Access issuer/audience 为空，会拒绝管理操作 | 当前 Cloudflare API token 读取 Access 策略返回 403；已登录控制台进入首次 Zero Trust 启用向导，尚未完成免费计划订阅或 MFA 配置。不能通过去掉 Access 要求恢复管理接口 |
| 真实账户流程 | 尚未完成真人 Google OAuth、真实 Turnstile、生产账户写入及物理 iPhone Safari 验收 | 不计为通过；响应式尺寸、UA 模拟和本地 fixtures 均不能替代 |

公开 Firebase Web `apiKey`、项目标识和 Turnstile site key 用于客户端配置，不是管理员凭据。服务端 secret、Cloudflare API token、私钥、原始用户令牌和备份 SQL 不应进入 Git、公开文档或浏览器日志。[Firebase API key 指南](https://firebase.google.com/docs/projects/api-keys)。

## 2. 代码审查与本轮修改

| 风险与问题 | 本轮实现 | 验收重点 |
| --- | --- | --- |
| 挑战结果缺少上下文检查及持久重放记录 | 服务端校验 `success === true`、明确 hostname 白名单、`register/paper/diploma/import` action、挑战时间；完整响应超时；只保存 token 的 SHA-256，D1 唯一写入拒绝并发重放 | 无效、过期、错域、错 action、重复 token；真实 site key/secret 配对仍待验收 |
| 缺配置或读取失败时功能仍可能开放 | 缺少开关或 D1 读取失败均关闭；health 降级时四功能均返回关闭 | 不把读取失败解释为“新用户未注册”或服务可用 |
| 高频 API 请求消耗 D1 配额 | IP/UID 优先使用边缘 Rate Limiting binding；写入先过边缘，再由 D1 原子占位限制每 UID 每小时 25 次；生产缺 binding 或服务异常返回 503 | namespace 必须核对账户内唯一性；不能将边缘计数当作精确全局配额 |
| 身份伪造、时间声明和密钥轮换处理不足 | RS256、固定 JWKS 来源、`kid/aud/iss/sub/user_id/iat/exp/auth_time/nbf` 校验，Google provider 限制；有界缓存、轮换刷新及外部响应超时 | 假签名、错误声明、未知 key、外部不可用；仅签名校验不承诺撤销令牌即时失效 |
| 管理接口仅依赖共享 secret | 生产要求高熵管理员 token 与独立验签的 Access JWT；校验 issuer、audience、有效期 | Access 应仅覆盖管理路径并强制 MFA；实际策略未核实，issuer/audience 不得猜填 |
| 生产/开发混用 | 独立 `wrangler.dev.toml` 使用本地数据库标识及 localhost 来源；生产仅允许正式 HTTPS 来源，额外拒绝 loopback；生产缺少有效 IP hash salt 时返回 503 | dry-run、真实 binding/路由及 secrets 名称核对；不替换已有 D1 |
| 越权和隐私泄漏 | 所有私有查询从已验签 UID 派生身份；拒绝前端身份覆盖；默认 private；公开必须明确同意，可撤回；导出仅本人档案 | 两账号交叉测试、公开撤回和导出不可含内部 UID |
| 并发注册、旧表单覆盖和导入部分提交 | UID 主键防一号多档；注册冲突明确返回 409；档案 revision 预条件；导入 receipt、归档和徽章放在同一 batch，payload fingerprint 防同 key 异内容 | 同 UID 并发、跨标签旧 revision、并发重复导入、故障整批回滚；保留原生产数据 |
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
| 生产只读/防护动作 | 本日 Pages/Worker 状态读取；私有备份后关闭注册并读回结果 | 未执行新版本生产发布、`0003` 迁移或测试用户写入 |

**最终本地验收：通过。** 2026-10-19 对最终代码运行 `node --no-warnings tests/run-tests.mjs`、Worker TypeScript 和 `git diff --check`，退出码均为 0；Wrangler 4.151.1 已实际安装，部署 dry-run 成功（未上传）。`npm install` 审计 38 个包，报告 0 个已知漏洞；这不是完整依赖安全保证。

- 20 组认证客户端模拟测试、23 组 Worker 本地测试；Worker 测试使用真实 SQLite/RSA 与模拟外部网络，覆盖随机编号固定、全局唯一冲突整批回滚、归档读失败不伪装空数据，以及注册/记录/徽章同批提交。
- Canvas 5 组模拟用例；发布门禁以临时 Wrangler stub 验证无批准、备份过期/权限不私有/hash 不符均拒绝，未运行真实生产发布。
- `node tests/browser-regression.cjs`：真实 Chrome 渲染、本地静态站点、Firebase/API/Turnstile fixtures、系统字体。390/768/1440 px × 中英文 × 手动浅/深色均无横向溢出；20 张截图，4 张实际 PNG，覆盖成绩单/论文/证书及 2400×3058 长内容。验证来源切换、账号切换、删除失败/未确认不清本机、成功仅删云端保留 Google 身份、JSON 导出、ARIA 键盘、错误语言切换和同步重试。
- 使用真实 Firebase SDK 的独立 Chrome 游客检查通过：初始化无认证错误，本机论文/证书功能正常，无页面运行异常；没有执行 Google OAuth 或生产账户写入。
- 3 次隔离 Wrangler 本地迁移成功；今日备份已恢复至全新私有临时本地数据库，验证导出可恢复，未覆盖生产。

浏览器脚本在缺少 8088 服务时会自行启动并关闭本地服务器；需要已安装 Chrome 与 Playwright（可用 `PLAYWRIGHT_MODULE` 指定）。测试证据为本机私有产物，不将截图、备份或用户数据加入公开仓库。Safari 场景仍使用 Chromium，仅改变 UA/视口，**不是物理 iPhone 或 WebKit 验收**。

## 4. Google 登录与 MFA 的剩余边界

GitHub Pages 当前没有同源 `/__/auth/*` helper。保留既有 `firebaseapp.com` authDomain，先使用 popup；只有部署并验证同源 helper、OAuth redirect URI 后才允许 redirect 回退。单独修改 authDomain 或增加 302 跳转不能提供该 helper。[Firebase redirect 最佳实践](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

Access JWT 验签不能证明 MFA 策略已开启。需核对管理应用及其 Allow 规则，使用受支持的 IdP MFA 或独立 MFA，并检查更具体的策略是否覆盖上级要求；实际登录也必须验证第二因素。当前策略 API 403，控制台要求先启用 Zero Trust 免费方案，因此本轮只完成代码能力及评估，没有确认生产 MFA。[Cloudflare MFA 配置](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)。

## 5. 开放注册前必须解决的事项

1. 本地自动化、TypeScript、dry-run 和 Chrome 桌面/移动布局回归已通过；正式发布时仍需对批准的最终提交重新运行。
2. 核对三个边缘限流 namespace；完成 Access 应用、issuer/audience 和 MFA 验收，避免新 Worker 上线后无法管理开关。
3. 按发布方案重新备份、评审影响和回滚，再协调前端 action 与后端版本，执行必要的 `0003` 增量迁移；本轮尚未执行。
4. 在隔离环境完成新注册，并用明确授权的验收账号完成真实 Google、Turnstile、档案同步/导出/删除、隐私公开及撤回。当前没有仅验收账号注册通道，不得为测试自行全局开放注册。
5. 使用物理 iPhone Safari 验证登录、取消/受阻提示、退出切换、刷新恢复及 PNG 保存。确认生产错误恢复和已有用户数据后，再取得开放注册批准。
6. Firebase 规范允许 1–128 字符 UID，但遗留生产 `students` 表要求至少 6 字符。本轮保留原表，短 UID 注册明确返回 `400 UID_NOT_SUPPORTED`，不将有效身份误判为假 token；完整支持短 UID 需要另行审查保留数据和关联表的安全迁移。通常自动生成的 Google UID 不受此遗留限制影响，仍需记录兼容边界。

## 6. 数据保留边界

云端删除会级联删除本人学生档案及业务记录；安全审计仅保留哈希身份，私有备份是独立灾备副本，不由该接口立即清除。保留期限与备份到期清理规则仍需运营者确定，本轮未擅自删除历史备份。前端隐私说明已明确这一边界。
