# 登录界面与 Google 品牌更名

日期：2026-10-22（Asia/Shanghai）。用户已明确批准 PR #2 的前端提交 `739aaa2`，以及 Google 品牌资料保存、单条 DNS TXT、Search Console Domain 所有权验证和品牌验证/发布。前端已合并为 `5a0e64d3eeefb04305f3a586925b959fe37da064` 并上线；Google 控制台确认品牌已经验证并向用户显示，真实 Google 账号选择页已显示新名称。完整 OAuth 与已认证业务仍未通过；注册保持关闭。

## 已发布的修改

- 登录卡片改为白底牛津蓝校园通行证：区分游客、连接中、Google 已登录状态，精简重复说明；桌面左右布局，移动端单列，沿用中英文和手动深色。
- 保留现有登录、退出、账号切换、同步、导入及超时恢复接口；空反馈条隐藏，错误和其他操作反馈仍显示。
- 新增直接可访问的双语 `privacy.html`，首页页脚增加入口。说明现有 Google/Firebase 身份资料、校园记录、默认私有、导出删除、服务提供方及备份保留边界；不增加数据权限。

## Google 品牌与网域结果

已将 Google 品牌名称由自动生成的 `project-353403995690` 更新为 **Absolutely Nothing University (ANU)**。Google 控制台明确显示“您的品牌已经过验证，正在向用户显示。”从生产站点打开的真实 Google 账号选择页也显示同一名称及本站隐私政策入口；品牌展示验收通过，完整登录另行验收。

2026-10-22 已在控制台保存以下字段：

| 字段 | 新值 |
| --- | --- |
| 应用名称 | Absolutely Nothing University (ANU) |
| 首页 | https://freeze.edu.kg/ |
| 隐私政策 | https://freeze.edu.kg/privacy.html |
| 品牌网域列表 | 保留原 Firebase 网域，新增 freeze.edu.kg |
| 开发者联系信息 | 沿用该项目现有管理员/支持邮箱；私有地址不写入仓库 |

不修改 OAuth client ID、secret、授权 scopes、回调 URI、Firebase `authDomain` 或已认证用户。Worker、D1、Access/MFA、CORS、注册及其他功能开关保持原状态。

Google 要求验证品牌并发布后才显示应用名称；只保存名称不等于授权页已经改名。本次已按批准新增 Google 指定的 DNS TXT 并完成 Search Console **freeze.edu.kg Domain property** 所有权验证，随后完成品牌验证/发布。OAuth 网域验证使用 DNS 级 Domain property，未用 URL-prefix 或 HTML 文件替代。

DNS 操作前重新读取的 16 条记录与仓库外私有备份一致；仅新增一条验证 TXT 后为 17 条。结构对照确认原 16 条全部保留、缺失 0，且恰新增 1 条。独立 DoH 同时见到 Google 验证 TXT 和原 SPF；未改变网站或邮件解析。新增记录的类型、名称与内容、私人邮箱和浏览器证据只保存在仓库外。

官方依据：[品牌信息管理](https://support.google.com/cloud/answer/15549049?hl=en)、[品牌验证](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)、[网域验证要求](https://support.google.com/cloud/answer/13804266?hl=en)。品牌验证与真实 OAuth 是不同验收项；若后续资料变更转入人工审核，应重新记录其状态。

## 执行结果与影响

1. 用户已批准具体前端提交 `739aaa2` 及上述 Google/DNS/所有权操作。PR #2 合并提交为 `5a0e64d3eeefb04305f3a586925b959fe37da064`；Pages 于 2026-10-21 12:11:03 UTC 构建成功。
2. 正式 HTTPS 的 `index.html`、`styles.css`、`app.js`、`js/i18n.js`、`js/student-auth.js` 和 `privacy.html` 摘要与批准源一致，隐私页及入口已上线。
3. 重新读取 DNS 基线并在私有备份后只新增一条 Google TXT，原 16 条记录保留。独立 DoH 核对新增记录与原 SPF；未删除或覆盖旧 TXT，未改变 A/AAAA、MX、NS、代理、路由或邮件服务。
4. Search Console Domain 所有权验证成功。当前管理员因此获得该 Domain property 的所有者权限；本项已包含在用户明确批准中，未修改其他所有者。
5. 已保存应用名称、首页、隐私政策、品牌网域和开发者联系信息，并完成品牌验证/发布。只新增 `freeze.edu.kg` 品牌网域，原 Firebase 网域保留。
6. 发布后的真实生产游客检查 9/9 通过；2026-10-22 只读后端复核 4/4 通过。Worker 仍为 `c22b3178-7872-4d77-a06a-ea2d7f9408ae`、100% 流量，D1 原绑定保留，`workers.dev`/preview 均关闭；正式 Origin 的 health 为 200、`ok:true`、注册 `false`。未部署 Worker、迁移数据库、查询学生记录或修改 Access。
7. 2026-10-22 真实 Google 账号选择页已显示新名称，完成展示核验后关闭选择弹窗。同一 Chrome 会话已恢复 Firebase 登录身份，但云端同步提示“Authentication verification is temporarily unavailable. Please retry.”；本轮未完成新的 OAuth 回跳或学生档案写入。名称展示、完整 OAuth 与已认证业务分别验收。新用户注册继续关闭，不由品牌验证自动开放。

本方案不自动创建自定义认证域。如果 Google 在某些界面仍要求显示实际认证域名，另行评审 Firebase 自定义认证域的 DNS、证书和回调配置；不直接把 `authDomain` 改成没有 helper 的网站域名。

## 回滚

- 前端：以新的 revert 提交恢复到本轮前的 `0e8c008` 内容；只回退本轮 UI、隐私页及入口，不回滚 Worker/D1。
- 品牌：在没有进行中的审核时，恢复此前应用名称和品牌字段；仅移除本次新增品牌网域，保留原 Firebase 网域。若已经公开发布，按 Google 的草稿/验证/发布流程处理，不能声称即时回退显示。
- DNS：只删除由本轮新建且已记录类型、名称与内容的 Google TXT，绝不删除已有 TXT 或更改邮件、网站解析。
- Search Console：若需要撤销此次所有权，删除仅本轮新增的验证记录，并按 Search Console 的所有者管理流程撤销当前管理员的新权限；不修改其他所有者。

## 验证结果与边界

- 全套本地测试、TypeScript、JS 语法和 diff 检查通过；外部身份/挑战/边缘服务在安全测试中为模拟。
- 现有 Chrome fixture 回归通过，含 390/768/1440 px 中英、浅/深色布局与四张实际 PNG。
- 针对登录卡片及隐私页的隔离 Chrome fixture 20 项通过，覆盖连接中禁用、超时恢复、其他反馈保留、云端错误及公开双语隐私页；无运行错误或意外外部请求。它不是真实 Google、生产数据或物理 Safari 验收。
- 获批前端发布后，真实生产游客检查 9/9 通过：390/1440 px 双语、默认蓝白/手动深色及刷新、登录入口、公开隐私页、2400×1728 PNG 均正常；console/page/request failure 为 0，学生 API 请求为 0。使用真实 SDK 和字体，无网络 mock；没有执行真人 OAuth 或生产学生写入。
- Google 品牌资料已保存、Domain 所有权验证成功，控制台确认品牌已经验证并向用户显示；真实 Google 账号选择页的新名称已核实。身份会话恢复已观察到，但 Worker 认证验证暂不可用；完整 OAuth 与已认证业务仍未通过。Google 客户端、scopes、回调、Firebase `authDomain`、Worker、D1、Access 和功能开关均未改动。
- 操作与验收证据保存在仓库外，不提交私人邮箱、TXT 挑战值或私有目录。真实 Turnstile、生产学生流程、管理员完整链路及物理 iPhone Safari 仍待完成，注册保持关闭。
