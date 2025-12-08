框架 基于最新的 Nextjs16，在编译性能方面有很大提升，本地开发更快、内存占用更小。

在框架设计层面，分为核心系统、核心模块、扩展模块、主题系统、配置系统、内容管理系统六大件。

1. 核心系统（app）

框架 内置 Landing、Admin、User Console 三套核心系统，对应三套独立的页面布局，用于实现网站着陆页、后台管理、用户中心三类常见业务功能。

- 着陆页系统（Landing）

通过 json 文件控制页面内容，方便 AI 修改，支持多语言；页面按区块（blocks）拆分，可自由组装，灵活度高；通过 theme.css 调整配色和字体，个性化程度高

- 后台管理系统

集成用户管理、订单管理、积分管理功能；集成配置中心，可视化开启/关闭各类功能；集成 CURD 操作，通过自定义的 PageBuilder 做到几行代码渲染数据管理页面（table、form）

- 用户控制台系统（User Console）

用户在 Settings 面板管理自己的账单、订阅、支付、积分流水，修改头像昵称；用户在 Activity 面板查看AI 生成任务和 AI 对话记录

三套核心系统在 src/app 目录实现，按功能划分文件夹，开发者很容易新增自己的功能。

2. 核心模块（core）

框架 把框架全局支持的功能归为核心模块，包括 db、auth、i18n、rbac 几类

- 数据库（db）

基于 drizzle orm 集成数据库功能，支持 postgres、mysql、sqlite 等数据库类型；通过 schema 定义数据表，支持增量迁移；CURD 数据操作层面用同一套 sql 语法，抹平各类数据库的差异

- 登录鉴权（auth）

基于 better-auth 实现登录鉴权功能，可以在管理后台一键开启常用的登录方式

- 权限控制（rbac）

基于权限的管理控制，通过自定义的角色和权限节点控制后台管理系统的访问

- 国际化（i18n）

基于 next-intl 实现国际化功能，通过 json 文件控制多语言显示

框架 的核心模块定义在 src/core 下面

3. 扩展模块（extensions）

框架 利用 extensions 支持可插拔架构，每一类扩展定义一个统一的 interface，每个扩展按接口实现具体的功能逻辑。目前支持的 extensions 包括

- ads

广告。集成 adsense

- affiliate

联盟营销。集成 affonso、promotekit

- ai

AI 供应商。集成 OpenRouter、Fal、Replicate、Kie

- analytics

数据统计。集成 ga、clarity、plausible、open-panel、vercel-analytics

- customer-service

客服。集成 crisp、tawk

- email

邮箱。集成 resend

- payment

支付。集成 Stripe、Creem、PayPal

- storage

存储。集成 aws s3，cloudflare r2

框架 的扩展模块定义在 src/extentions 目录下，每一类扩展要新增一个选项，只需要写很少的代码

4. 主题系统（themes）

框架 支持多主题系统，让开发者可以自定义主题实现个性化的页面展示。

包括三类自定义主题方式

- 自定义主题色 / 字体
- 切换亮色（light）/ 暗色（dark）
- 自定义主题文件夹

主题系统定义在 src/themes 下面

5. 配置系统（config）

框架 支持三类配置的定义

- 在 .env 文件通过环境变量定义配置
- 在 src/config 目录下通过文件定义配置
- 在 /admin/settings 可视化管理配置

组合管理配置项，实现低代码的功能，不是很懂代码的用户也能方便地使用 框架

6. 内容管理系统（cms）

框架 实现的内容管理系统包括三个层面的内容管理

- 博客（blog）

通过管理后台写入博客内容，也可以在 content/posts 目录用 markdown 写博客。博客可以给你的网站增加 SEO 权重，也能通过 guest post 接商单。

- 文档（docs）

基于 fumadocs 实现文档系统，在 content/docs 目录写内容，几分钟为你的网站渲染一个 /docs 文档

- 页面（pages）

在 content/pages 目录写内容动态创建页面，比如常用的网站协议页面 /privacy 和 /terms

---

除系统架构和功能设计外，框架 还支持多种部署方式，可以一键部署到 vercel/ cloudflare workers，也支持 docker 镜像构建，可以使用 k8s、dokploy+vps 等部署方案

7. SEO 技术基线（框架内置能力）

- 元信息统一：全局 `getMetadata` 封装 title/description/keywords/OG/Twitter/canonical/hreflang/jsonLd，可按 locale 与路由动态生成；分页/参数页 canonical 去重
- 渲染策略：公开页默认 SSR/SSG 输出完整正文和 schema，避免前端异步加载；404/500/实验页支持 noindex
- 资源与性能：`next/image` 占位+懒加载，首屏图指定宽高与 priority；`next/script` 默认 defer/afterInteractive，只有关键脚本允许 priority；静态资源压缩与缓存策略预设；Core Web Vitals 目标 LCP<2.5s、CLS<0.1、INP<200ms
- 多语言：内置 next-intl，自动输出 hreflang + x-default；多语言 sitemap 组合生成
- 数据资产：sitemap 自动更新新路由，robots.txt 包含 sitemap；可选 llms.txt 方便 AI 抓取
- 埋点：预置 GA/Clarity/Plausible/OpenPanel 等扩展接口，支持上传/CTA/滚动/停留等事件埋点，方便与 GSC 数据联动
