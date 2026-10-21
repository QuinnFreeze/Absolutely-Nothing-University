# 登录界面与 Google 品牌更名

日期：2026-10-21。当前生产前端业务源为 `67347cb`，发布记录提交为 `0e8c008`。本文方案尚未批准执行；注册保持关闭。

## 可评审的修改

- 登录卡片改为白底牛津蓝校园通行证：区分游客、连接中、Google 已登录状态，精简重复说明；桌面左右布局，移动端单列，沿用中英文和手动深色。
- 保留现有登录、退出、账号切换、同步、导入及超时恢复接口；空反馈条隐藏，错误和其他操作反馈仍显示。
- 新增直接可访问的双语 `privacy.html`，首页页脚增加入口。说明现有 Google/Firebase 身份资料、校园记录、默认私有、导出删除、服务提供方及备份保留边界；不增加数据权限。

## Google 品牌草稿

目标是让 Google 显示网站名 **Absolutely Nothing University (ANU)**。现有应用名称为自动生成的 `project-353403995690`；Google 授权页当前显示默认 Firebase 认证域名。

已在控制台准备、尚未保存的字段：

| 字段 | 新值 |
| --- | --- |
| 应用名称 | Absolutely Nothing University (ANU) |
| 首页 | https://freeze.edu.kg/ |
| 隐私政策 | https://freeze.edu.kg/privacy.html |
| 品牌网域列表 | 保留原 Firebase 网域，新增 freeze.edu.kg |
| 开发者联系信息 | 沿用该项目现有管理员/支持邮箱；私有地址不写入仓库 |

不修改 OAuth client ID、secret、授权 scopes、回调 URI、Firebase `authDomain` 或已认证用户。Worker、D1、Access/MFA、CORS、注册及其他功能开关保持原状态。

Google 要求验证品牌并发布后才显示应用名称；只保存名称不等于授权页已经改名。当前管理员在 Search Console 中尚无该 Domain property 的访问权。OAuth 网域验证要求 DNS 级 Domain property，URL-prefix 或单独上传 HTML 文件不能替代。

官方依据：[品牌信息管理](https://support.google.com/cloud/answer/15549049?hl=en)、[品牌验证](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)、[网域验证要求](https://support.google.com/cloud/answer/13804266?hl=en)。若 Google 转人工审核，必须记录待审核，不能标为已生效。

## 影响与执行顺序

1. 获得对应具体提交的前端发布批准，以及当前管理员的 Search Console 网域所有权验证、品牌资料保存/验证/发布批准。
2. 只发布 Pages，验证线上文件与隐私页、首页入口，复查注册仍关闭。
3. 再导出 Cloudflare 当前网域配置；先前公开 DNS 基线已在仓库外私有保存，独立 DoH 显示现有 A、MX、TXT、NS 均须保留。系统解析器存在合成/不完整响应，不用它作为修改依据。
4. 在 Search Console 为 **freeze.edu.kg** 生成当前管理员的 DNS 验证要求。仅新增一条 Google 指定的 TXT 记录，使用普通 TXT/默认 TTL；不删除或覆盖旧 TXT，不改 A/AAAA、MX、NS、代理、路由或邮件服务。
5. 使用独立 DNS 查询核对新增记录和原有记录，再完成 Domain property 所有权验证。此步骤将使该 Google 管理员获得该网域的 Search Console 所有者权限，必须经明确批准。
6. 保存已准备的 Google 品牌资料，运行品牌验证。只有实际通过后才发布品牌；若出现需接受新条款或额外身份验证的步骤，按实际要求处理。
7. 重新打开真实 Google 登录页核对显示名称，不读取/保存登录凭据。名称显示与完整 OAuth 回跳分别验收，注册继续关闭。

本方案不自动创建自定义认证域。如果 Google 在某些界面仍要求显示实际认证域名，另行评审 Firebase 自定义认证域的 DNS、证书和回调配置；不直接把 `authDomain` 改成没有 helper 的网站域名。

## 回滚

- 前端：以新的 revert 提交恢复到本轮前的 `0e8c008` 内容；只回退本轮 UI、隐私页及入口，不回滚 Worker/D1。
- 品牌：在没有进行中的审核时，恢复此前应用名称和品牌字段；仅移除本次新增品牌网域，保留原 Firebase 网域。若已经公开发布，按 Google 的草稿/验证/发布流程处理，不能声称即时回退显示。
- DNS：只删除由本轮新建且已记录 ID/内容的 Google TXT，绝不删除已有 TXT 或更改邮件、网站解析。
- Search Console：若需要撤销此次所有权，删除仅本轮新增的验证记录，并按 Search Console 的所有者管理流程撤销当前管理员的新权限；不修改其他所有者。

## 本地验证与边界

- 全套本地测试、TypeScript、JS 语法和 diff 检查通过；外部身份/挑战/边缘服务在安全测试中为模拟。
- 现有 Chrome fixture 回归通过，含 390/768/1440 px 中英、浅/深色布局与四张实际 PNG。
- 针对登录卡片及隐私页的隔离 Chrome fixture 20 项通过，覆盖连接中禁用、超时恢复、其他反馈保留、云端错误及公开双语隐私页；无运行错误或意外外部请求。它不是真实 Google、生产数据或物理 Safari 验收。
- 当前 Google 更名资料只是浏览器草稿；未保存、未验证、未发布。Search Console/DNS 未变更，新前端也未上线。
