# ANU 生产发布影响、验收与回滚方案

日期：2026-10-19。适用于本轮安全加固，保持 GitHub Pages + Firebase Authentication + Cloudflare Workers + D1。**这是待评审的方案，本轮新代码尚未部署、未推送，`0003` 尚未应用到生产。**

## 1. 当前基线

- 生产 Worker：`4e829602-af8d-4c75-ab59-1cb09c1eea76`，为本轮修改前的版本。
- GitHub Pages：已有 `main` 构建 `built`，CNAME `freeze.edu.kg`，强制 HTTPS，证书批准且到期日为 2027-01-16。
- 生产注册已在 2026-10-19 私有备份后关闭；health 显示注册 `false`，论文、证书、公开目录三个开关仍为 `true`。
- 备份为 10,901 bytes、`0600`、仓库外保存；SHA-256 为 `573a67f54852d52ddfd46d0a878ee4cb97e2fdff4aa1a89cffe33384dfebb376`。正式发布时必须重新导出一小时内备份并核验，不能沿用过期备份通过门禁。

不删除生产记录，不重建现有 D1，不打印/提交服务端密钥或备份 SQL。不通过关闭挑战、JWT、Access、限流或所有权校验来修复异常。

## 2. 变更影响与依赖

| 变更 | 正常影响 | 未就绪时的行为 |
| --- | --- | --- |
| 新前端 | 登录预热、同步状态、移动布局和导出；挑战携带四种明确 action；revision 随已知档案更新提交 | 保留游客功能；网络或认证失败提示重试，不伪装云端保存成功 |
| `0003` 增量迁移 | 新增 `turnstile_tokens` 及过期索引；`idempotency_keys.request_hash`、`students.revision` 默认值兼容旧行；保持注册关闭 | 新 Worker 依赖这些结构，不能先部署后端再补迁移 |
| Turnstile | 新后端要求 hostname/action/时效和一次性使用 | 旧前端未带 action 的写入将被拒绝，须协调发布及缓存刷新 |
| 边缘 Rate Limiting | IP/UID 减少 D1 访问，写入保留 D1 25/hour 硬限额 | 生产缺少/失效 binding 返回 503，不能降级放行；三个 namespace 仍需核对账户内未被其它 Worker 复用 |
| Access + 管理 secret | 管理接口同时要求有效 token 和 Access JWT；Access 策略必须配置 MFA | 当前 issuer/audience 为空，新后端会锁住管理接口；部署前必须完成配置或保持本轮待发布 |
| Firebase | 保留现有 Google 提供方、项目、授权域和 popup 路径 | 不切换到不存在的同源 helper，不新建替代项目 |
| 档案删除 | 显式确认且最近五分钟 Google 认证；只删除本人 ANU D1 档案及其关联记录 | 认证过旧返回 403，需重新 Google 登录；不删除 Google/Firebase 身份 |

本轮 schema 增量不移除数据或改变已有主键；`0003` 的目标是兼容旧 Worker 回滚。D1 迁移仍属于生产变更，必须先备份并审查实际 SQL。

## 3. 发布前检查（不修改生产）

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
5. 读取并验证 Access 的管理路径应用、受限管理员规则、实际 MFA；填入正确 issuer/audience。当前 token 对 Access 策略读取返回 403；已登录控制台显示首次启用 Zero Trust 向导，免费计划订阅及相关服务条款尚未确认。需先由用户确认该服务启用，再配置管理应用与 MFA。
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

如需修改 `ANU_BACKUP_DIR`，必须选择仓库之外、仅操作者可访问的位置。正式发布需要一小时内、非空、无组/其它用户访问权限、SHA-256 匹配的备份。

## 5. 取得具体发布批准后的执行顺序

以下是操作模板，**现在不执行**。`ANU_PRODUCTION_APPROVED=1` 只是一道本地操作防误触门禁，不代替用户批准、访问权限或测试结果。`ANU_VERIFIED_BACKUP` 指向实际私有绝对路径，不能把该路径写回公开报告。

1. 重新导出并验证备份，确认注册仍为关闭；保存旧 Worker 版本、Pages 提交和 D1 当前迁移记录。
2. 先发布包含明确 Turnstile action 的前端并验证线上文件；旧后端忽略新增 action，因而可先兼容运行。保持注册关闭，检查游客及已有账号错误反馈。
3. 对仍打开旧页面的用户提供刷新提示；在新后端上线后旧无 action 挑战会失败，需刷新页面并重新验证，不得临时放宽服务端检查。
4. 在授权窗口应用 `0003`，检查列/索引、原记录计数及注册关闭状态；若失败，停止后端发布并读取迁移状态，不重复盲跑 `ALTER TABLE`。
5. 确认 Rate Limiting、Access/MFA、secrets 与正式路由已就绪，再发布新 Worker，记录新 version ID。

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

- **前端异常**：回退到记录的上一 Pages 提交，验证正式 HTTPS 内容及游客功能。若后端已升级，旧前端缺 action 的受保护写入会被拒绝；需要同时回滚 Worker，或保留兼容的新前端修复版，不能放松 Turnstile。
- **Worker 异常**：回滚到部署前确认的旧版本；现记录为 `4e829602-af8d-4c75-ab59-1cb09c1eea76`，执行前再次核对。新增列/ledger 可保留，旧代码无需逆删列。保持注册关闭。
- **迁移异常**：停止后续发布、检查应用记录；不要删除生产表、逆删列或用 dump 覆盖现库。加法迁移已完成时，优先回滚应用并保留新增结构。
- **数据异常**：冻结受影响写入，先备份异常后的现状；评审 D1 Time Travel 恢复点或新数据库切换方案，并说明可能影响恢复点之后的写入。生产恢复需要单独授权及核验，不能由通用 restore 命令自动执行。
- **Access/边缘配置异常**：停止部署；若已影响生产，回滚应用版本或修复受审查的配置。不得删除 Access 要求、放宽管理员权限或缺 binding 时放行。

备份回滚与代码回滚是不同动作。恢复旧代码通常不需要恢复旧数据库；无理由执行数据库恢复可能覆盖本轮之后的合法数据。[D1 Time Travel 官方说明](https://developers.cloudflare.com/d1/reference/time-travel/)。
