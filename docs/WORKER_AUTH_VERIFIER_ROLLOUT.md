# Worker 认证验证器运行时修复（2026-10-23）

状态：**本地修复与自动化验证完成，尚未发布。** 本文供单独的 Worker 版本发布评审使用，不是生产变更批准。新用户注册保持关闭；本次不包含任何 D1 迁移或生产学生写入。

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
4. 通过现有 `release-gate.mjs deploy` 发布获批提交；门禁要求批准标记与新备份。这些环境变量不能代替用户批准。**不执行迁移，不更新 Pages。**
5. 读回部署版本、100% 流量、原 D1、三个限流 binding、生产 vars、禁用的开发/预览 URL；health 正常且注册 false。
6. 低频只读验证：匿名/错误声明仍 401，使用当前公开 Google kid 的假签名应从 503 变为 `401 AUTH_BAD_SIGNATURE`。只生成合成 token，不获取或输出真实账户原始 token。
7. 在用户已授权的同一 Google 账号进行真实登录、会话恢复、退出和游客回归，检查 Worker 是否正常返回本人档案或未注册状态。**不为测试打开注册或向正式 D1 插入学籍**。注册关闭会限制档案写入/删除验收，未实际执行的项目保留待验收。
8. 本轮账户会话与测试产物清理后再次确认游客状态；不删除原学生记录、Firebase 身份、Google 账号或原有浏览器数据。

## 回滚

发布前记录的线上基线为 Worker `c22b3178-7872-4d77-a06a-ea2d7f9408ae`；执行前须重新读回确认。若发生新增认证/游客回归，回滚到该版本，保留 Access/MFA、secret、注册关闭、D1 结构和数据；本次没有数据迁移，无需恢复或覆盖数据库。

该回滚会恢复已知的验证器 503 与默认拒绝行为，属于有意识的服务降级，不是认证修复成功。禁止通过改用 follow、绕过签名、撤掉 Access/MFA、扩大 CORS、开放注册或删除账本来排障。回滚后重新检查 health、注册 false 与匿名拒绝，并记录实际版本和未解决问题。
