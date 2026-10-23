# Google 身份 observer 与弹窗关闭竞态（2026-10-23）

状态：**本地修复与验证完成，尚未发布。** 该补丁修复“SDK 已确认新身份但仍显示取消”的反馈竞态，不宣称解决真实 Google 回跳始终停在游客态的问题。生产 Worker 保持已获批的 `293c660d-f8f6-488c-81b5-d0ec3690a4be`，新用户注册继续关闭。

## 已复现的问题及最小修复

Firebase 官方 SDK 的身份 observer 可以先接纳新用户，弹窗 Promise 随后以 `auth/popup-closed-by-user` 拒绝。原代码仅对 `AUTH_POPUP_TIMEOUT` 恢复 observer 结果，因而出现身份及档案已加载、`authError` 仍为取消的矛盾状态。

新增测试先在原代码上失败，观察到 `hasUser:true`、`bundleLoaded:true` 与取消错误并存。修复只将弹窗关闭码纳入原恢复条件，保留全部限制：

- 登录意图仍为同一次，身份 session 确实发生变化，当前存在 SDK 接纳的用户，且未显式退出。
- 同一旧账号不能证明切换成功；旧 Promise 不能覆盖新登录意图或退出结果。
- 已完成的云端读取复用；503 错误继续显示，不伪装同步成功或自动重复请求。
- 返回 `mode: "observer"`，不宣称完成新的 Google 认证；Worker 的签名、所有权及近期 `auth_time` 要求不变。

唯一生产文件为 `js/student-auth.js`；不改 SDK 版本、弹窗/请求时限、authDomain、提供方、scopes、权限、样式、Worker 或数据库。

Firebase 11.1.0 的官方 popup 源码在观察到窗口关闭后等待八秒再报错，helper 本身也会关闭窗口；该错误不能证明用户主动取消。[对应版本源码](https://raw.githubusercontent.com/firebase/firebase-js-sdk/firebase@11.1.0/packages/auth/src/platform_browser/strategies/popup.ts)

## 本地验证

2026-10-23：

- 原代码的新 observer-first 取消场景退出 1，修复后退出 0。
- 30 组认证模拟通过，新增新身份恢复、云端 503 保留/不重试、旧账号取消、退出隔离及新意图隔离场景。
- 全套前端/Worker/SQLite/导出/发布门禁/公开搜索回归及 145 项真实 workerd 本地用例通过。
- Worker TypeScript、`node --check js/student-auth.js` 和 `git diff --check` 通过；独立源码复核未发现阻断项。

上述认证测试替换了 SDK 与网络，不等于真实 OAuth、真实档案操作或物理 Safari 验收。测试入口为 `node --no-warnings tests/student-auth-tests.mjs` 和 `node --no-warnings tests/run-tests.mjs`；先在 worker/ 安装锁定依赖。

## 真实回跳诊断与工具边界

本轮重新检查无参数公开 handler、iframe、experiments.js、handler.js、iframe.js 和 CDN Firebase 11.1.0 Auth，均返回 200。裸 handler 的 missing initial state 符合无参数访问条件，不能作为真实回跳丢失 state 的证据。没有据此修改认证配置或盲升 SDK。

用户实际 Chrome、真实 SDK/Google/Worker 下，以同一已授权账号进行一次追加诊断。只在测试主标签开启受支持的网络观察，保留路径、状态、耗时；没有读取请求头、正文、授权码或 token 内容，也未采集其值：

- 项目配置 GET 两次返回 200，约 0.8 秒及 1.5 秒。
- 在取得的有限主标签记录中，未观察到 `accounts:signInWithIdp` 或 Worker `/api/v1/me`；这不是全浏览器抓包，子目标未被观察，不能据此断言请求从未发生。
- 账号选择后回调页 DOM 读取出现执行超时；随后工具明确报告 Browser Use 正在处理暂停的文档响应，拒绝继续 raw CDP 观察。没有通过其他 CDP、进程操作、浏览器重启或降低安全措施绕过。
- 最终页面显示登录窗口超时，没有确认身份或档案读取成功。该工具阻塞不能单独证明站点或 Firebase 的根因；完整真人 OAuth 仍未通过。

诊断弹窗已关闭，主站刷新后核实游客模式、登录按钮可用、退出按钮隐藏、反馈为空，截图后关闭测试页。临时网络观察随测试标签销毁结束。没有生产学生写入、记录删除、账号删除、授权撤销或浏览器数据清空。脱敏记录和截图保存在仓库外，不提交邮箱、原始网络事件或回调参数。

## 发布影响与回滚

本次只建议发布 GitHub Pages 的客户端补丁，须对具体提交另行批准；既有 Worker 发布批准不覆盖本次前端变更。合并可能触发 Pages 自动构建，不部署 Worker，不迁移或写入 D1，不更改认证/Access/MFA 配置，不开放注册。

发布后核对 `js/student-auth.js` 的普通 HTTPS 摘要、游客界面、未变的生产 health 与注册 false。真实 Google 验收仍需独立完成，失败时保留明确错误和游客功能。

回滚用新的提交将 `js/student-auth.js` 恢复至前端基线 `62b499ecc88a1f231dd41cf71538420e024e4605`；保留本次审计记录，不回退 main 历史、不回滚已修复的 Worker、不恢复或覆盖 D1。回滚仅恢复原反馈竞态，不能视为解决 OAuth 回跳。
