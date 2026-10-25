# Google OAuth 追加诊断（2026-10-25）

状态：**真实 Google 登录仍未通过；新用户注册保持关闭。** 本轮只读生产核验及使用已授权账号登录，没有修改或发布业务代码、修改认证配置或操作 D1。未找到能够证明回跳根因的站点代码缺陷，没有据此盲升 SDK、修改 authDomain 或放宽安全措施。

## 本轮实际结果

| 检查 | 结果与边界 |
| --- | --- |
| 线上版本 | GitHub Pages 最新构建为 `87c34cdadc107251dd09e77369ea80f17c30f94a`，状态 `built`；该提交是手机布局发布后的文档更新，获批业务源仍为 `0e06a41` |
| 公开健康接口 | `ok:true`，`registrationEnabled:false`，其余三项现有功能开关为 true |
| Google 账号选择 | 实际显示 `Absolutely Nothing University (ANU)`，选择用户已授权的同一账号，没有增加 scopes 或重新索取基本资料授权 |
| 主站登录结果 | 回跳弹窗 DOM 读取出现 3 秒执行超时；主站最终显示“已取消 Google 登录”并保持游客态，没有确认新的 Firebase 身份或云端档案读取 |
| 单账号辅助记录 | 用户另行明确授权后，仅通过精确邮箱过滤读取该账号的存在状态、提供方和日期；提供方为 Google，创建及上次登录日期均显示 2026-10-21。本次失败后刷新控制台并重新过滤，日期没有变化。日级记录仅为辅助证据，不能证明请求没有到达 Firebase 服务端；邮箱、UID 及其他账号信息不进入本记录 |
| 公开响应与页面结构 | 主站 HTTP 200，未发现 COOP/CSP 响应头；主站文档已加载完成，Firebase helper iframe 已创建，未设置 sandbox/referrerpolicy 属性。这些检查未发现对应配置阻断，不能证明回调文档、helper 通信或存储访问正常 |
| 有限请求追踪 | 主标签项目配置请求及预检返回 200，观察到 helper iframe 请求。取得的主标签记录未观察到 `accounts:signInWithIdp` 或 `/api/v1/me`；没有覆盖弹窗子目标，不能据此断言这些请求从未发生 |

没有采集授权码、token、请求头或正文；网络记录仅保留公开 origin/path、状态与阶段。回跳页读取超时可能涉及工具处理，当前仍无法区分站点、Firebase、浏览器或 Browser Use 的根因。此前工具报告的暂停文档响应限制继续遵守，没有通过其它协议、进程操作、浏览器重启或降低安全要求绕过。

## 源码复核结论

- Firebase observer 先接纳身份，再读取 Worker；Worker 失败只留下云端错误，不会清除已接纳的身份。因此注册关闭或 Worker 503 不能解释“始终没有身份”的现象。
- 现有 observer-first 关闭恢复已经保留本次 intent、新身份 session 和显式退出保护，无需再次吞掉取消错误。
- 初始化在注册 observer 前等待 persistence 和 `getRedirectResult`，这些阶段的时长和错误码仍值得单独取证；目前没有证据证明它们导致账号选择后的回跳失败。
- 非 Firebase Hosting 站点可使用 popup；直接把 authDomain 改成 GitHub Pages 域名而没有同源 helper 不成立，302 也不能替代透明代理。[Firebase 官方方案](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- SDK 11.1.0 发现窗口关闭后仍等待八秒才拒绝，helper 也可能自行关闭窗口；取消码不能证明用户主动取消。[对应版本源码](https://raw.githubusercontent.com/firebase/firebase-js-sdk/firebase@11.1.0/packages/auth/src/platform_browser/strategies/popup.ts)

## 清理与剩余验收

本轮控制台查询页和登录测试页均已关闭，回跳弹窗自行结束；原有用户标签保留。关闭前刷新主站并确认游客模式、登录按钮可用、退出按钮隐藏、反馈为空；搜索“拖延症”返回 2 项公开结果，关闭搜索后仍为游客。仓库外保留游客界面截图与脱敏摘要。

没有新增、导入、修改或删除学生记录，没有删除 Firebase/Google 账号、撤销授权或清空浏览器数据。本轮没有已认证会话，不能将真实退出、账号切换、会话恢复或学生业务验收记为通过。

下一步应补齐 helper 回传、IdP 交换和 SDK 身份 observer 各阶段的脱敏证据，且必须避开工具暂停造成的取证盲区。业务源未变，本轮未重复运行既有模拟测试或类型检查；历史通过结果不计为本次真人 OAuth 通过。注册开放仍需完整生产验收和单独批准。
