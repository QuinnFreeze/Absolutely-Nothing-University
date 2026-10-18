# ANU 绝对虚无大学 · 学生账户系统安全检查报告

- **项目域名**：`https://freeze.edu.kg`
- **API 域名**：`https://api.freeze.edu.kg`
- **架构**：GitHub Pages 静态前端 + Firebase Authentication（Google Sign-In）+ Cloudflare Workers + D1 + Turnstile
- **检查日期**：2026-10-18

本报告区分代码实现、本地自动化检查和真实生产验收。它不是第三方渗透测试报告；本地通过不能作为真人 Google OAuth、远程 D1 并发行为或物理 iPhone 验证通过的证据。具体测试结果应以发布时对最终代码运行的输出为准。

## 一、当前生产配置与发布状态

| 项目 | 已核实状态 | 尚需验证或处理 |
| :--- | :--- | :--- |
| Firebase Web App | 项目为 `project-8995408b-d1b3-4571-83b`；`js/anu-config.js` 已有真实公开配置；`authDomain` 为该项目的 `firebaseapp.com` 域名；控制台提供方列表仅有 Google，状态已启用 | 从生产域名完成真人 Google OAuth |
| Firebase 授权域 | `freeze.edu.kg` 已保存为自定义授权域；控制台列表与独立公开 `getProjectConfig` 均确认正式域已加入，连同 `localhost`、项目 `firebaseapp.com` 和 `web.app` 共四域 | 授权域保存不等同完整用户登录验收 |
| Worker / D1 | 生产 `/api/v1/health` 返回 HTTP 200；`worker/wrangler.toml` 已有生产 D1 binding；Wrangler 已有账户授权 | 核对最终发布版本、迁移状态，以及真实认证写入 |
| Worker secrets | `wrangler secret list` 确认 `ADMIN_API_TOKEN`、`IP_HASH_SALT`、`TURNSTILE_SECRET_KEY` 三个名称均存在；未读取其值 | 名称存在不能证明值有效，需分别核验实际调用 |
| Safari / redirect | 本次使用 popup 主路径；GitHub Pages 没有 `/__/auth/*` 同源 helper 或反向代理 | 真人 OAuth 与物理 iPhone Safari 未验收；不得标记 ITP / redirect PASS |

本次后端版本 `4e829602-af8d-4c75-ab59-1cb09c1eea76` 已部署；生产 D1 已应用 `0002_archive_quota_triggers.sql`，并只读确认三个额度触发器存在。迁移前完成了仓库外私有 SQL 备份和 SHA-256 校验。前端以对应 GitHub Pages 部署为准，完整生产账户流程另行验收。

### 本次发布后的独立核验

- 功能提交 `9a065d4` 已推送到 `main`，GitHub Pages 部署成功。线上 HTTPS 下的 `index.html`、`app.js`、`js/anu-config.js`、`js/student-auth.js`、`js/i18n.js` 与本地文件逐字节一致。
- 修复验收时发现的自定义域证书缺失：按 GitHub 官方步骤重新绑定同一域名后，`freeze.edu.kg` 与 `www.freeze.edu.kg` 的证书状态为 `approved`，到期日 2027-01-16，并启用 `https_enforced=true`。HTTPS 返回 200，HTTP 自动跳转 HTTPS；未绕过证书验证。
- 生产 API 健康检查返回 200；未携带身份的私有接口返回 `401 AUTH_REQUIRED`；非白名单来源返回 `403 CORS_ORIGIN_FORBIDDEN`。
- 实际 Chrome 从正式 HTTPS 页面加载真实 Firebase SDK，游客初始化没有认证错误；论文及证书本机保存成功，页面运行异常为零。真人 Google OAuth、真实挑战后的档案注册与完整同步、物理 iPhone Safari 仍未验收。

## 二、代码实现与本地自动化覆盖

执行入口：`node --no-warnings tests/run-tests.mjs`（Node.js v24+）。Worker 测试运行实际处理器，并用内存 SQLite 适配 D1 接口；JWT 使用测试签名密钥，Turnstile 使用测试 verifier。客户端通过静态检查和模拟浏览器环境验证。所有结论均受这些环境边界限制。

本次完整自动化测试、Worker TypeScript 检查和 `git diff --check` 已通过。浏览器检查使用已安装的 Chrome：1440×1000、390×844，覆盖游客论文/证书本机保存、云端失败重试、返回用户验证框、受保护写入、导入、中英文及深色模式，页面运行异常为零。登录态 UI 测试使用隔离的 Firebase/API/Turnstile fixtures；另以真实 Firebase SDK 验证游客初始化。隔离 Wrangler D1 已验证两次迁移和原子 SQL 行为。

| 检查维度 | 代码实现 / 测试范围 | 证据边界 |
| :--- | :--- | :--- |
| Google provider 限制 | 客户端使用 `GoogleAuthProvider`；Worker 拒绝非 `google.com` 的已签名令牌；本次也已独立核对 Firebase Console 仅配置并启用 Google | 本地拒绝用例与控制台配置均不等同真人 OAuth 完整流程验收 |
| JWT 校验 | `worker/src/middleware/firebaseAuth.ts` 校验 RS256、`kid`、`aud`、`iss`、时间声明及 `sub`；测试包含伪造签名和错误声明 | 使用测试密钥，不是向真实 Google 获取用户令牌的联调 |
| 凭据管理 | Firebase SDK 管理持久化；应用代码不自行将原始令牌写入 `localStorage` | 静态检查不意味着 Firebase SDK 永远不用其管理的浏览器存储；不得宣称浏览器完全不存在令牌 |
| 客户端身份伪造与数据隔离 | 客户端 `uid` / `firebase_uid` 等身份字段被拒绝；业务查询使用经过验证的 UID；测试包含跨账户隔离 | 本地处理器验证；生产账户流程另测 |
| 数据库唯一性与额度 | UID 主键、学号和业务去重唯一约束；`0002_archive_quota_triggers.sql` 在写入边界限制成绩/论文/证书 50/30/20 项 | 本地并发直接提交、导入竞争和批量回滚均有回归；生产负载压力测试另测 |
| 默认隐私与公开撤回 | 默认 `private`；公开需单独同意；公开查询隐藏内部 UID；包含公开、撤回与查询用例 | 生产缓存、浏览器展示和真实账户回归需另行检查 |
| 服务端判分 | Worker 根据答案计算统考成绩；本地用例包含客户端伪造分数 | 覆盖本地判分与导入代码路径 |
| 论文、证书与导入防滥用 | 新导入要求 Turnstile；成功幂等重放免重复验证；统一检查开关/额度，完整处理请求记录；客户端每次发送后重置挑战 | 本地覆盖无效挑战、一次性令牌、导入超过10项、去重、并发额度与失败整批回滚；真实挑战与生产账户写入另测 |
| SQL 与 DOM 输入处理 | SQL 参数通过预编译绑定；文本经长度/内容检查；用户输入使用安全 DOM 更新 | 部分静态和输入用例覆盖，不是全站 XSS 或注入形式的穷尽证明 |
| 请求限流 | IP 哈希、UID 及写入维度的固定窗口计数；单条条件 UPSERT 原子占位 | 本地覆盖三维并发请求和窗口重置；隔离 Wrangler D1 实测返回计数1、2及超额空结果；生产压力另测 |
| 管理开关 | 支持暂停注册、论文投稿、证书登记和公开查询；管理令牌常量时间比较 | 必须核对测试实际覆盖的开关；生产开关状态单独读取。初始迁移将开关设为启用，不应假定新注册已经暂停 |
| 错误信息 | 通用错误响应和 `requestId`；本地模拟数据库异常检查 SQL 与内部错误未回显 | 不代表所有日志、错误路径和外部服务响应均已审计 |
| 档案删除 | `DELETE /api/v1/me` 要求确认口令，删除应用 D1 中的学生档案及关联归档；本地用例检查删除后不再注册 | 不删除用户的 Google 账户或 Firebase Authentication 用户身份；安全审计日志有独立保留边界 |

## 三、Safari 与 Firebase authDomain 边界

Firebase 官方说明，redirect 流程依赖跨域 iframe；阻止第三方存储的浏览器需要额外配置。官方列出的方案包含直接使用 `signInWithPopup`；若选择同源反向代理，必须透明转发 `/__/auth/*`，302 跳转不符合要求。[Firebase redirect 最佳实践](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

当前前端由 GitHub Pages 提供，尚未部署同源 auth helper，因此保留项目 `firebaseapp.com` 的 `authDomain` 并以 popup 登录。仅修改 `authDomain: "freeze.edu.kg"` 不会创建 helper，也不能规避 ITP。只有同源 helper 已部署、OAuth redirect URI 配置正确并经过验证，才可开启 redirect 回退。响应式视图和 User-Agent 模拟不能替代物理 iPhone 的真实登录测试。

## 四、公开参数与秘密边界

Firebase Web `apiKey`、`projectId`、`appId`、`authDomain` 和 Turnstile site key 是客户端公开参数。Firebase 的 API key 用于识别项目；它不是管理员权限凭据。应检查 API restrictions，避免将同一个公开 key 授权给不相关 API。[Firebase API key 指南](https://firebase.google.com/docs/projects/api-keys)。

Cloudflare API token、服务账号私钥、`TURNSTILE_SECRET_KEY`、`ADMIN_API_TOKEN` 和 `IP_HASH_SALT` 属于秘密，不应写入公开前端、Git 或报告。生产资源与部分凭据已经存在，不能笼统声称“云端参数均未配置”。缺少有效 Turnstile 配置时受保护写入应拒绝，缺少有效管理员令牌时管理接口应拒绝；这些拒绝路径和生产配置有效性需分别验证。

## 五、正式完成前的验收项

1. Google provider 与 `freeze.edu.kg` 授权域配置已完成；下一步从生产页面完成真人登录。
2. 对最终代码运行本地测试和 Worker 类型检查；记录实际输出，核对发布后的前端文件与 Worker 版本。
3. 使用专门测试账户完成真实 Turnstile、注册、成绩/论文/证书同步、导入重放、公开同意/撤回及档案删除；分别检查错误反馈。
4. 单独验证物理 iPhone Safari 的 popup 登录与受阻提示；当前不能以 redirect fallback 作为已验证的兼容性保证。
5. 生产负载与真实多设备场景另行验收；本地固定窗口并发/重置、归档额度竞争及回滚测试已经通过。
6. 核对生产管理开关、备份与恢复安排，再按实际授权执行发布或开放注册。
