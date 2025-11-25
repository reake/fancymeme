# 框架开发说明

## 项目概览

框架是一个基于 Next.js App Router 的多租户 AI SaaS 模板，提供从营销官网、文档、演示到后台管理的全套功能。项目内置国际化、主题系统、角色权限、支付结算、积分消费以及多种 AI 能力集成，帮助团队快速启动和迭代商业化的 AI 产品。

## 核心能力

- **多语言与本地化**：通过 `next-intl` 与 `src/config/locale/` 的消息配置，实现英语、中文等多语言站点结构与内容。
- **主题化着陆页**：`src/core/theme/` 动态加载 `src/themes/` 目录下的主题页面与区块，可根据配置快速切换风格并渲染营销页面数据。
- **AI 功能集成**：`src/extensions/ai/` 封装 KIE、Replicate 等大模型提供商，`src/app/api/ai/` 提供统一的生成与查询接口，结合积分系统控制调用成本。
- **后台运营中心**：`src/app/[locale]/(admin)/` 构建完整的后台管理界面，涵盖用户、权限、支付、订阅、AI 任务等模块，使用通用仪表盘区块 `src/shared/blocks/dashboard/`。
- **权限与 RBAC**：`src/core/rbac/permission.ts` 与 `src/shared/services/rbac.ts` 提供角色、权限、路由守卫工具，保障后台访问安全。
- **支付与订阅**：`src/extensions/payment/` 管理 Stripe、PayPal、Creem 等支付渠道，`src/shared/services/payment.ts` 处理订单、订阅生命周期及积分发放。
- **内容与知识库**：`content/` 目录承载文档、博客、展示案例等内容，结合 `fumadocs` 系列包生成文档站点。

## 技术栈

- 前端框架：Next.js 16、React 19、TypeScript
- UI 与样式：Tailwind CSS 4、Radix UI、Framer Motion
- 国际化：next-intl
- 数据层：Drizzle ORM、PostgreSQL（支持 LibSQL）
- 身份认证：better-auth
- AI SDK：`ai`、`ai-sdk`、`@openrouter/ai-sdk-provider`
- 支付集成：Stripe、PayPal、Creem

## 目录速览

- `src/app/`：基于 App Router 的多语言页面与 API 路由，含着陆页、AI Demo、后台、用户中心等模块。
- `src/core/`：项目级核心能力，如主题加载、国际化配置、数据库初始化、RBAC、文档集成。
- `src/shared/`：跨页面复用的区块、组件、hooks、服务和模型，支撑 UI 与业务逻辑复用。
- `src/extensions/`：对接外部服务的可插拔扩展（AI、支付、广告等）。
- `content/`：Markdown/MDX 内容资源。
- `scripts/`：初始化角色、权限等运维脚本。

## 数据与配置

- `.env` 与 `.env.development` 管理环境变量，`src/config/index.ts` 统一读取。
- 数据库 schema 位于 `src/config/db/schema/`，通过 `pnpm db:generate`、`pnpm db:migrate` 驱动 Drizzle 迁移。
- 项目启动时使用 `src/shared/models/config.ts` 汇总环境与数据库配置，供 AI、支付、外部服务动态加载。

## 开发流程

1. 安装依赖：`pnpm install`
2. 配置环境变量：`cp .env.example .env` 并补充数据库、认证、支付等密钥
3. 生成并执行数据库迁移：`pnpm db:generate && pnpm db:migrate`
4. 运行开发服务器：`pnpm dev`
5. 可选命令：
   - `pnpm lint`、`pnpm format` 保持代码质量
   - `pnpm auth:generate` 同步 better-auth 配置
   - `pnpm rbac:init` / `pnpm rbac:assign` 初始化与分配角色权限

## 部署建议

- 默认支持部署到 Vercel (`vercel.json`)；
- `scripts/` 与 `wrangler.toml.example` 提供 Cloudflare 相关配置；
- 构建命令：`pnpm build`
- 生产环境需配置数据库、认证、支付、AI 服务等敏感信息。

## 扩展指南

- **新增主题**：在 `src/themes/` 下创建新主题目录并实现页面、布局、区块，与 `NEXT_PUBLIC_THEME` 环境变量联动。
- **拓展语言**：在 `src/config/locale/messages/` 新增语言文件并更新 `src/config/locale/index.ts` 中的 `locales` 与 `localeNames`。
- **接入新 AI 服务**：实现 `AIProvider` 接口并在 `src/extensions/ai/` 注册，更新配置读取逻辑。
- **支付渠道扩展**：遵循 `PaymentManager` 接口新增 Provider，或调整默认支付渠道。

## 维护建议

- 优先通过共享区块和服务复用业务逻辑，避免重复实现。
- 使用 `src/shared/lib/` 中的工具函数保持标准化响应、日志与错误处理。
- 定期更新依赖并关注 `pnpm-lock.yaml`，保障 React、Next.js、Tailwind 等主依赖版本兼容性。
