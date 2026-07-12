# AI热译

> 不只是告诉你 AI 世界发生了什么，更告诉你：这和你的工作有什么关系，下一步可以怎么做。

AI 资讯每天都在爆发，但真正稀缺的不是更多新闻，而是判断力：哪些变化与你有关、哪些值得投入时间、哪些能力可以进入现有业务。

**AI热译** 是一个面向职场人与业务团队的个性化 AI 资讯平台。它基于用户的身份、职业、行业、关注目标和阅读反馈，从 AI HOT 资讯中筛选每天最相关的内容，再将热点翻译成工作启发、业务机会和可以立即验证的行动。

## 为什么做 AI热译

传统资讯产品解决的是“发生了什么”，但用户看完后经常仍然面临三个问题：

- 信息太多，不知道哪些真正与自己相关。
- 看懂了技术，却不知道如何与岗位、产品或业务结合。
- 收藏了很多资讯，却很少转化成实验、方案和决策。

AI热译希望缩短从“看到热点”到“采取行动”的距离，让 AI 资讯不再停留在阅读层。

## 核心体验

### 每日个性化推荐

用户完成职业、行业、AI 熟练度、关注目标和兴趣标签画像后，系统每天生成并固化 20 条个性化推荐。

每条推荐不仅包括资讯摘要，还会说明：

- 为什么推荐给你
- 对当前工作有什么启发
- 今天可以尝试什么
- 与你的职业、行业和目标有多相关

推荐会按天归档。不断向下滚动，就能连续查看过去每天的推荐，而不是只能看到当天内容。

### 越用越懂你的轻量记忆

系统会根据收藏、已读和不感兴趣等行为调整后续排序：

- 收藏某类内容后，相近主题会获得更高权重。
- 标记不感兴趣后，相近内容会降低推荐权重。
- 已读资讯会自动识别并弱化展示，减少重复干扰。

轻量记忆保持透明，用户可以在设置页查看自己的历史行为。

### 从热点到业务决策的每日晨报

晨报不是新闻摘要，而是一份围绕用户业务生成的决策报告。它会基于当天高度相关的资讯，分析：

- 资讯为什么重要，与当前业务有什么关系
- 背后的技术与行业趋势
- 可以结合到哪个产品或业务环节
- 能解决什么用户痛点、提升什么指标
- 当前阶段是否值得做
- 3-5 个可执行动作及其 MVP、指标、风险与优先级

报告保留引用来源，并按日期长期归档，方便复盘过去的判断与机会。

### 围绕单条资讯继续追问

在资讯详情页，用户可以进入多轮 AI 顾问对话，继续追问：

- 这项能力适合我的什么业务场景？
- 它会影响哪个产品环节？
- MVP 应该如何设计？
- 需要哪些数据、技术和运营配合？

用户可以绑定自己的 DeepSeek API Key。Key 仅在服务端使用，并通过 AES-256-GCM 加密保存，不会在前端完整回显。

## 产品流程

```text
邮箱登录
   ↓
选择身份、职业、行业和目标
   ↓
每天获得 20 条高度相关的 AI 资讯
   ↓
收藏 / 自动已读 / 不感兴趣
   ↓
推荐逐渐适应你的关注方向
   ↓
生成业务晨报，或进入 AI 顾问深挖机会
```

## 已实现功能

- 邮箱验证码账号体系与 30 天登录会话
- 用户画像与兴趣配置
- AI HOT 资讯拉取与 PostgreSQL 缓存
- 每用户每日 20 条推荐及历史无限滚动
- 收藏、自动已读、不感兴趣和轻量记忆
- 推荐理由、工作启发与行动建议
- AI HOT 正文展示与原始来源跳转
- DeepSeek 多轮 AI 顾问
- 结构化业务晨报与历史归档
- 用户 DeepSeek API Key 保存、测试、替换和删除
- 每日 Vercel Cron 自动生成
- 健康检查、安全响应头和生产环境密钥保护

## 技术栈

- Next.js App Router + TypeScript
- React + Tailwind CSS
- Prisma + PostgreSQL
- DeepSeek Chat API
- Resend 邮箱服务
- Vercel Functions + Vercel Cron
- AI HOT 公开资讯数据

## 本地开发

本地需要 PostgreSQL。复制环境变量并填写数据库连接：

```bash
cp .env.example .env.local
npm install
npm run db:push
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。开发环境的登录验证码会打印在服务端控制台；生产环境只通过 Resend 发送。

## 部署到 Vercel

1. 在 Vercel 中导入本仓库。
2. 从 Vercel Marketplace 安装 Neon（推荐）或其他 PostgreSQL 服务，并连接项目。
3. 使用服务提供的连接池地址作为 `DATABASE_URL`，数据库区域尽量与 Vercel Functions 接近。
4. 在 Resend 验证发件域名。
5. 配置以下 Production 环境变量：

```text
DATABASE_URL
API_KEY_ENCRYPTION_SECRET
RESEND_API_KEY
EMAIL_FROM
CRON_SECRET
DEEPSEEK_API_KEY（可选）
DEEPSEEK_MODEL（可选）
AIHOT_ITEMS_URL（可选）
```

`API_KEY_ENCRYPTION_SECRET` 和 `CRON_SECRET` 建议分别使用至少 32 字节的随机值。保存用户 DeepSeek Key 后，不要更换 `API_KEY_ENCRYPTION_SECRET`，否则历史密文将无法解密。

Vercel 会执行 `npm run vercel-build` 并自动运行 PostgreSQL 迁移。部署完成后访问 `/api/health`，返回 `{"status":"ok"}` 表示数据库连接正常。

## 每日任务

`vercel.json` 配置了每天 `00:00 UTC`（北京时间 08:00）调用 `/api/cron/daily`。Vercel 使用 `CRON_SECRET` 自动鉴权。

任务以每批 5 个用户并发的方式，为已完成画像的用户生成当天推荐和晨报。单个用户失败不会中断其他用户。用户量明显增长后，应将批处理迁移到独立任务队列。

## 常用命令

```bash
npm run dev          # 启动开发环境
npm run typecheck    # TypeScript 检查
npm run build        # 生产构建
npm run db:push      # 同步本地数据库结构
npm run db:migrate   # 执行生产迁移
```

## 数据说明

当前 PostgreSQL 初始迁移位于 `prisma/migrations/20260712000000_init_postgresql`。早期本地 SQLite 测试数据不会自动迁移到 PostgreSQL，如需保留，应在正式开放注册前单独执行一次数据导入。

## 项目状态

当前版本已经覆盖从注册、画像、推荐、反馈、历史浏览到晨报与 AI 顾问的完整 MVP 流程，适合继续进行真实用户测试、推荐质量评估和业务场景验证。
