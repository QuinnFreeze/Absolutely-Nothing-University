# Worker 认证验证器运行时修复（2026-10-23）

状态：**用户已明确批准具体提交 `68c6e827d874d1dd3a45b0f32fc5d6312e8545e8`，PR #4 已合并为 `200bea360c3ef35c6237111e762cf42284053e37`，备份后已发布 Worker `293c660d-f8f6-488c-81b5-d0ec3690a4be`。** 新用户注册保持关闭；本次没有 D1 迁移或生产学生写入。真实 Google OAuth 仍未通过，不能将验证器修复等同于完整登录验收。

## 实际问题与根因

真实账号恢复 Firebase 身份后，Worker 返回 `503 AUTH_VERIFIER_UNAVAILABLE`。只读合成探测中，错误 audience 返回 `401 AUTH_INVALID_AUD`；使用公开 Google `kid`、声明结构有效但签名伪造的 token 也返回 503，说明失败位于公钥读取/验签阶段，不能将其误记为已完成签名校验。

已在真实 workerd 中复现直接原因：共享 `fetchWithTimeout()` 设置 `redirect: "error"`。Node fetch 支持该值，但 Cloudflare Workers 在创建请求时立即抛出 `TypeError: Invalid redirect value, must be one of "follow" or "manual"`，请求尚未发送。这同时阻断 Firebase 公钥、Turnstile Siteverify 与 Worker 内的 Access 公钥请求。既有 Node 模拟测试没有覆盖这一运行时差异。[Cloudflare Request 官方说明](https://developers.cloudflare.com/workers/runtime-apis/request/#options)

这解释了 Worker 验证器 503；**不证明此前 Google 弹窗超时与回跳问题也只有这一原因**。完整真人登录仍需发布后单独验收。

## 修复与影响范围

唯一生产代码改动为 `worker/src/utils/jwt.ts`：

- 强制使用 Workers 支持的 `redirect: "manual"`，覆盖调用方的重定向选项。
- 在读取正文前拒绝全部 300–399 及 `opaqueredirect`；取消正文，清理失败仍拒绝。不会读取 Location 后发起第二个请求，防止转发 Turnstile secret、挑战 token 或客户端 IP。
- 保留 3.5 秒完整响应截止、64 KiB 正文上限、公钥缓存、固定来源、签名和全部声明校验；保留上游 4xx/5xx 状态，由验证调用方拒绝。

修复预期恢复三个验证器的正常网络请求。它不改变 JWT 信任来源、管理员 secret 与 Access/MFA 双重要求、所有权检查、限流、CORS、功能开关或档案默认私有设置。前端文件、Google/Firebase 配置、DNS、D1 结构和数据均不在变更范围。

## 本地验证与边界

先在 `worker/` 执行 `npm ci`（Node.js 24+），再从根目录执行：

```bash
node --no-warnings tests/run-tests.mjs
node --no-warnings tests/workerd-verifier-tests.mjs
# worker/ 目录下
npm run typecheck
npm run deploy:dry-run
```

2026-10-23 验证结果：

| 检查 | 结果及准确范围 |
| --- | --- |
| 原始问题复现 | 真实 workerd 下原 `redirect:error` 在发送请求前抛出 TypeError；改为 manual 后同一合成 RSA 身份通过，伪造签名返回 `AUTH_BAD_SIGNATURE` |
| 真实公开公钥读取 | 修复后的本地 workerd 直接读取 Google 固定公开 JWKS：HTTP 200、4 把公钥；无身份 token。未找到合成 fixture kid 符合预期，不代表真实用户已验签 |
| 新增 workerd 回归 | 145 项通过。使用 Wrangler 锁定的 Miniflare/workerd、生产环境验证代码路径、内存合成 RSA 密钥及临时本地 D1；无 test-only 验签绕过 |
| 重定向与故障 | 300–399 全覆盖，调用方要求 follow 也被拒绝，重定向目标收到零请求；Firebase、Access、Turnstile 各自拒绝 301/302/303/304/307/308 和 401/429/500；超出 64 KiB 拒绝 |
| 正常验证与防伪造 | Firebase 有效签名通过，错签名/audience/issuer/过期拒绝；公钥缓存正常。Access 同时需要有效签名与正确管理员 secret |
| 挑战与 D1 | 合成 Siteverify success/hostname/action/时效校验，3 个并发相同 token 仅一次成功；真实本地 D1 仅存哈希，失败不写账本 |
| Node 模拟补测 | 重定向取消回调、取消失败、opaque redirect、取消卡住和完整正文卡住的超时均通过 |
| 全套/构建 | 全套回归、TypeScript 和 Worker 打包 dry-run 通过；dry-run 未上传或部署 |

Miniflare 在本机启动真实 workerd；测试的出站请求全部被隔离 fixture 接管，本地 D1 为临时数据库，结束后销毁。[Miniflare 官方说明](https://developers.cloudflare.com/workers/testing/miniflare/)

上述结果**不是**真实 Google OAuth、真实 Turnstile、生产 Access/MFA、远程 D1、真实账户业务或物理 iPhone Safari 的验收。旧的真实账号测试已退出本站并确认游客态，未建立或删除学生档案；Google 账号、授权及原本数据保留。

## 发布前评审与执行顺序

1. 对具体提交取得单独的 **Worker 发布批准**。原批准的 `efcb4b5` 仅覆盖 Pages，不能用于本次后端发布。
2. 只读核对当前 Worker 版本、D1 绑定与注册关闭状态，记录变更前 health 和无认证拒绝响应；确认注册仍为 false。
3. 使用现有备份脚本重新导出仓库外私有 D1 备份。校验非空、0600、SHA-256 与一小时内时效；保留历史备份，不打印 SQL 或签名下载 URL。
4. 通过现有 `release-gate.mjs deploy` 发布获批提交；门禁要求批准标记与新备份。这些环境变量不能代替用户批准。**不执行迁移，不修改前端业务文件。** 合并 main 可能触发 Pages 自动重建，相同前端仍须核对文件摘要。
5. 读回部署版本、100% 流量、原 D1、三个限流 binding、生产 vars、禁用的开发/预览 URL；health 正常且注册 false。
6. 低频只读验证：匿名/错误声明仍 401，使用当前公开 Google kid 的假签名应从 503 变为 `401 AUTH_BAD_SIGNATURE`。只生成合成 token，不获取或输出真实账户原始 token。
7. 在用户已授权的同一 Google 账号进行真实登录、会话恢复、退出和游客回归，检查 Worker 是否正常返回本人档案或未注册状态。**不为测试打开注册或向正式 D1 插入学籍**。注册关闭会限制档案写入/删除验收，未实际执行的项目保留待验收。
8. 本轮账户会话与测试产物清理后再次确认游客状态；不删除原学生记录、Firebase 身份、Google 账号或原有浏览器数据。

## 回滚

发布前记录的线上基线为 Worker `c22b3178-7872-4d77-a06a-ea2d7f9408ae`；执行前须重新读回确认。若发生新增认证/游客回归，回滚到该版本，保留 Access/MFA、secret、注册关闭、D1 结构和数据；本次没有数据迁移，无需恢复或覆盖数据库。

该回滚会恢复已知的验证器 503 与默认拒绝行为，属于有意识的服务降级，不是认证修复成功。禁止通过改用 follow、绕过签名、撤掉 Access/MFA、扩大 CORS、开放注册或删除账本来排障。回滚后重新检查 health、注册 false 与匿名拒绝，并记录实际版本和未解决问题。

## 实际发布与生产验收

2026-10-23（UTC）按用户单独批准执行：

| 项目 | 实际结果 |
| --- | --- |
| 精确版本 | PR #4 以 match-head 检查获批完整 SHA 后合并；部署前本机 HEAD 为 `68c6e82`、工作区干净，唯一生产代码差异仍为验证请求 helper |
| 备份门禁 | 重新导出仓库外私有 D1，12,530 bytes、0600、SHA-256 `02447e288cb42ac51b93fbc9fffe688d13790704d12fa18a475cf780b4a4af68` 匹配；部署时不到一小时，通过现有 release gate。SQL、私有路径及供应商签名 URL 未进入 Git |
| Worker | 部署成功，读回 `293c660d-f8f6-488c-81b5-d0ec3690a4be`、100% 流量；新旧版本全部 bindings/vars 与运行时设置一致，原 D1、三个限流 binding 和三个 secret 名称保留，没有读取 secret 值 |
| D1 | `students/transcripts/papers/diplomas/honors_achievements/idempotency_keys` 六类计数均为 0→0；迁移仍为 0001/0002/0003，注册 flag 为 0。只读查询均 `rows_written=0`，没有执行迁移或创建/删除学生记录 |
| 真实 API | 9/9 只读检查通过：health 200、注册 false；匿名 401；错 audience 401；当前公开 Google kid＋假签名两次均为 **401 AUTH_BAD_SIGNATURE**，不再是 503；非法/localhost Origin 403 且不放行 CORS；正式 Origin 预检 204；匿名管理路径仍 302 到原 Access 团队域。私有错误响应保持 no-store |
| 前端保留 | 合并 main 触发 Pages 自动构建，但没有前端业务变更；11 份普通正式 HTTPS 文件与既有批准前端 `efcb4b5` SHA-256 全部一致 |
| 浏览器游客 | 用户实际 Chrome、真实 SDK/字体/API，无网络 mock。页面正常、有意义内容、无框架错误覆盖，观察到的 console warn/error 为 0；登录失败后 NTH-101 搜索得到 1 项，关闭搜索正常；刷新后游客态、登录按钮可用、退出按钮隐藏、反馈为空，保存截图后关闭测试页 |

数据库预检最初的六项 UNION 被 D1 的复合 SELECT 限制拒绝，改为聚合子查询后只读核验通过；未因此修改数据库。验收脚本也修正了对合法 204 空正文的 JSON 解析，最终 9/9 结果不包含失败的脚本轮次。

### 真实 Google 流程与清理

在用户已授权的同一 Google 账号上实际进行两次登录，未增加 scopes、改变提供方设置或选择其他账号：

1. 显示已验证的 `Absolutely Nothing University (ANU)` 品牌并选择授权账号，观察到回到 Firebase handler；主站最终显示“已取消 Google 登录”。该 UI 按现有代码映射到 `auth/popup-closed-by-user`，不等于本站 90 秒超时。
2. 刷新页面后重试，同样选择授权账号；主站最终显示“登录窗口等待超时，请关闭旧窗口后重试”。没有观察到已登录/退出/同步控件或本人档案读取成功。

中途一次截图自动审批等待超时，重试截图成功。该工具现象可能影响操作时序，但**不能据此确定 OAuth 失败根因**。本站及公开 Firebase helper 的只读响应均为 200，本站没有 Cross-Origin-Opener-Policy 响应头；这仍不足以排除 SDK 消息交接、浏览器策略或网络交换问题。

测试弹窗全部关闭，主站刷新后核实游客状态及可用登录按钮，公开搜索仍可操作；最终测试页已关闭。没有创建学籍、提交考试/论文/证书、导入或删除任何学生记录，没有删除 Google/Firebase 身份、撤销原授权或清空原浏览器数据。截图、脱敏检查结果与备份留在仓库外，不提交邮箱、OAuth 回调参数或真实凭据。

### 未解决的验收边界

- 完整真人 Google 回跳、登录后的刷新恢复/账号切换/退出仍未通过；不能因假签名返回 401 就声称真人有效 token 已成功访问 Worker。
- 注册仍关闭，没有测试学籍通道；生产档案写入、导入、导出成功、删除、两账号隔离和隐私授权/撤回尚待安全验收，禁止为测试全局开放注册或直写 D1。
- 真实 Turnstile 成功/重放、有效 Access JWT 与管理员 secret 的完整链路、物理 iPhone Safari 和 PNG 保存仍待验收。

新 Worker 的只读防护、配置和数据保留检查通过，未发现需回滚的新回归；保留已发布修复及上述已知登录阻塞，注册继续关闭。
