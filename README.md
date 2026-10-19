# Absolutely Nothing University · 绝对虚无大学

> *Nihil Agere, Omnia Esse* — 什么都不做，即是一切。

ANU 是一所虚构的讽刺大学网站，提供校园互动、摸鱼统考、零字论文、荣誉证书及 My ANU 学生中心。保留牛津蓝白主题、手动深色模式与中英文界面；游客无需登录即可使用校园功能。

- 网站：[freeze.edu.kg](https://freeze.edu.kg)
- 学生 API：[api.freeze.edu.kg](https://api.freeze.edu.kg/api/v1/health)
- [安全审计与验收边界](docs/SECURITY_AUDIT_REPORT.md)
- [生产发布影响与回滚方案](docs/PRODUCTION_ROLLOUT.md)

## 当前状态（2026-10-19）

**本轮安全加固代码尚未推送或部署，`0003` 迁移尚未应用到生产。** 已在仓库外私有备份后关闭新用户注册，并从线上 health 确认关闭；其余现有功能开关保持原状态。通过安全验收并获得开放批准前，注册保持关闭。

GitHub Pages 已有站点仍正常构建，正式域启用 HTTPS。线上 Worker 仍为已有版本 `4e829602-af8d-4c75-ab59-1cb09c1eea76`，不代表本轮改动已上线。真人 Google OAuth、真实 Turnstile、生产账户写入和物理 iPhone Safari 尚未验收，不能以本地模拟代替。

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
# 从仓库根目录运行
node --no-warnings tests/run-tests.mjs
node tests/student-auth-tests.mjs
node tests/canvas-export-tests.mjs
node tests/browser-regression.cjs
git diff --check

# 在 worker/ 目录运行
npm run typecheck
npm run deploy:dry-run
```

覆盖 JWT 假签名/声明、跨账号权限、Turnstile action 和重放、并发注册、revision 冲突、导入原子性、限流故障、档案导出/删除、登录切换及超时恢复。静态检查同时核对双语绑定、公开配置和 secret 边界；PNG 使用 Canvas mocks，Safari 客户端包含 UA 模拟。

Worker 测试运行实际处理器、内存 SQLite 和 RSA 签名，外部 Firebase、Turnstile、Access 及边缘服务为模拟。客户端测试替换 SDK 和 API；因此测试通过不代表真人 OAuth、真实挑战、远程 D1 或物理 Safari 通过。本轮最终全集、TypeScript、dry-run 与 Chrome 390/768/1440 px 中英/深色回归已通过，包含 4 张实际 PNG 下载；浏览器身份及 API 为 fixtures，详见安全报告。

## 配置与隐私

沿用已有 Firebase 项目及 `js/anu-config.js` 中的公开标识，Google 提供方和正式授权域已在前次核对。GitHub Pages 未部署 Firebase 同源 `/__/auth/*` helper，登录使用 popup；不得只修改 authDomain 来尝试修复 Safari redirect。[Firebase 官方说明](https://firebase.google.com/docs/auth/web/redirect-best-practices)。

生产只允许正式 HTTPS 来源，Turnstile 校验 `register`、`paper`、`diploma`、`import` 四种 action。管理接口要求 Access JWT 与管理员 secret；真实 issuer/audience 已从本日创建的 ANU Admin API Access 应用填入；边缘限定指定管理员邮箱并要求 MFA。经用户单独确认，认证器自助门户已保存并刷新核验：仅允许精确单邮箱和 One-time PIN，门户应用及策略会话均为 30 分钟，只关联 App Launcher，不改变 Admin API 的 MFA 要求。真实 `/AddMfaDevice` 已显示认证器注册选项，先前 `NoAuth` 阻断已修复；本人第二因素注册及实际登录仍待验收，不能标为通过。三个边缘限流 namespace 已与账户内三个 Worker 当前设置核对，无复用；未检查历史未启用版本，发布前仍须复核。生产缺 binding 将返回 503。

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
