# ANU 绝对虚无大学 · 学生账户系统安全检查报告 (Security Audit Report)

- **项目域名**：`https://freeze.edu.kg`
- **API 域名**：`https://api.freeze.edu.kg`
- **架构**：GitHub Pages 静态前端 + Firebase Authentication (Google Sign-In) + Cloudflare Workers (TypeScript) + Cloudflare D1 + Cloudflare Turnstile
- **审计日期**：2026-10-18

---

## 一、安全基线与检查结论汇总

| 检查维度 | 检查项 | 实现位置 | 验证方式 | 结果 |
| :--- | :--- | :--- | :--- | :--- |
| **身份认证 (Phase 1 & 2)** | 仅启用 Google 登录，拒绝密码认证与其他 Provider | `js/student-auth.js`, `worker/src/middleware/firebaseAuth.ts` | 自动化测试注入 `sign_in_provider: "password"` 验证返回 `401 AUTH_UNSUPPORTED_PROVIDER` | **PASS** |
| **JWT 签名与声明校验** | 严格校验 RS256 签名、`kid`、`aud`、`iss`、`exp`、`iat`、`sub` | `worker/src/middleware/firebaseAuth.ts` | 自动化测试覆盖伪造私钥签名、错误 `aud`、错误 `iss`、过期令牌，均返回 `401` | **PASS** |
| **凭据安全存储** | 前端使用 Firebase SDK 托管凭据，零 `localStorage` 明文存储 Token | `js/student-auth.js`, `tests/run-tests.mjs` | 静态扫描与断言确认 `js/student-auth.js` 不含任何 `localStorage.setItem` | **PASS** |
| **iPhone Safari 与移动端** | 弹窗受阻自动回退 `signInWithRedirect`，自定义 `authDomain: "freeze.edu.kg"` 规避 ITP 跨站拦截 | `js/student-auth.js` | 代码静态验证与 Safari 响应式视图验证 | **PASS** |
| **防越权与身份伪造** | 严禁接受客户端传入的 `uid` / `firebase_uid`；学号绝不作为认证依据 | `worker/src/middleware/security.ts`, `worker/src/index.ts` | 测试请求体与 Query 携带 `uid` 均返回 `400 IDENTITY_OVERRIDE_FORBIDDEN`；跨账户访问测试通过 | **PASS** |
| **数据库唯一性约束** | 每个 Firebase UID 最多对应 1 个学生档案；学号全局唯一 | `worker/migrations/0001_initial_schema.sql` (`PRIMARY KEY`, `UNIQUE`) | 同一 UID 重复注册返回 `409 PROFILE_ALREADY_EXISTS` | **PASS** |
| **隐私默认保护** | 默认 `visibility = 'private'`；公开展示必须单独勾选 `publicConsent = true` 且随时可撤回 | `worker/migrations/0001_initial_schema.sql` (`CHECK` 约束), `worker/src/index.ts` | 测试未同意公开时查询返回 `404`，撤回后立即返回 `404`，且脱敏不含内部 `firebase_uid` | **PASS** |
| **服务端防篡改判分** | 模拟统考成绩由 Worker 服务端权威计算，忽略客户端传入分数 | `worker/src/index.ts` (`gradeCourseExamServerSide`) | 客户端注入 `score: 999999` 仍按真实答案数组判定为 `100 / A+` | **PASS** |
| **幂等导入与防并发重复** | `idempotency_keys` 表与业务记录 `dedupe_hash` 唯一索引防止重复导入 | `worker/migrations/0001_initial_schema.sql`, `worker/src/index.ts` | 相同 `X-Idempotency-Key` 重复调用导入接口，记录数保持不变 | **PASS** |
| **防注入与防 XSS** | 全部 SQL 使用 D1 参数化预编译 `.prepare().bind()`；前端零用户输入 `innerHTML`；服务端剥离 `<>` 与控制字符 | `worker/src/index.ts`, `worker/src/utils/crypto.ts`, `app.js` | 注入 `<script>alert(1)</script> '; DROP TABLE students;--` 均被安全清洗且表结构完好 | **PASS** |
| **防滥用与双维限流** | 按 IP 哈希与 Firebase UID 双维度滑动窗口限流 + 写入接口 Turnstile 服务端校验 | `worker/src/middleware/security.ts` | 连续请求超限触发 `429 RATE_LIMIT_UID_EXCEEDED`；缺失或错误 Turnstile 返回 `403` | **PASS** |
| **紧急管理开关** | 支持一键暂停新注册、论文投稿、学位证登记、公开名片查询；管理员令牌采用常量时间比对 | `worker/src/middleware/security.ts` (`timingSafeEqualStr`), `worker/src/index.ts` | 关闭 `registration_enabled` 后新注册立即返回 `503 REGISTRATION_PAUSED` | **PASS** |
| **零敏感信息泄漏** | 全局异常捕获返回标准化错误码与 `requestId`，绝不回显 SQL 语句、密钥或堆栈 | `worker/src/utils/http.ts`, `worker/src/index.ts` | 模拟底层数据库抛出含密钥与 SQL 的异常，响应体仅返回安全通用信息 | **PASS** |
| **账户删除权 (Right to Erasure)** | 支持用户确认口令后一键级联删除 D1 中全部学生档案、成绩单、论文、证书与勋章 | `worker/src/index.ts` (`DELETE /api/v1/me`) | 删除后再次查询 `/api/v1/me` 确认 `registered: false, data: null` | **PASS** |

---

## 二、云端凭据与权限边界声明

在本次本地开发与自动化测试环境中：
1. 本机未预置开发者的 Google Cloud / Firebase 控制台私钥、Cloudflare 账户 API Token 或生产 D1 `database_id`。
2. 遵循“任何云端权限或凭据问题都必须明确报告，不得通过降低安全要求绕过”之铁律：
   - Worker 端对 `TURNSTILE_SECRET_KEY`、`ADMIN_API_TOKEN`、`FIREBASE_PROJECT_ID` 均采用 **Fail-Closed（默认拒绝）** 策略，未配置生产密钥时绝不放行未验证写入或管理员请求。
   - 所有需开发者在各自云控制台手动配置并注入的公有参数（`js/anu-config.js`）与服务端机密（`wrangler secret put`）均已在 `README.md` 中逐条列出。
