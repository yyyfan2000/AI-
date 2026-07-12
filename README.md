# AI热译

基于 AI HOT 资讯、用户画像和轻量记忆生成每日个性化推荐与业务晨报的 Next.js 应用。

## 本地开发

项目已使用 PostgreSQL。先复制环境变量并填写本地 PostgreSQL 连接：

```bash
cp .env.example .env.local
npm install
npm run db:push
npm run dev
```

开发环境的登录验证码会打印在服务端控制台；生产环境只通过 Resend 发送。

## 部署到 Vercel

1. 将项目提交到 GitHub，并在 Vercel 导入仓库。
2. 在 Vercel Marketplace 安装 Neon（推荐）或其他 PostgreSQL 服务，并连接到项目。使用服务提供的连接池地址作为 `DATABASE_URL`，数据库区域尽量与 Vercel Functions 接近。
3. 在 Vercel 项目的 Production 环境配置以下变量：

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

`API_KEY_ENCRYPTION_SECRET` 和 `CRON_SECRET` 建议分别使用至少 32 字节的随机值。已经保存用户 DeepSeek Key 后，不要更换 `API_KEY_ENCRYPTION_SECRET`，否则历史密文无法解密。

4. 在 Resend 验证发件域名，并将 `EMAIL_FROM` 配置为该域名下的地址。
5. 部署。Vercel 会执行 `npm run vercel-build`，自动运行 PostgreSQL 迁移。
6. 部署后访问 `/api/health`，返回 `{"status":"ok"}` 表示数据库连接正常。

## 每日任务

`vercel.json` 配置了每天 `00:00 UTC`（北京时间 08:00）调用 `/api/cron/daily`。Vercel 会使用 `CRON_SECRET` 进行鉴权。任务以每批 5 个用户并发的方式，为所有已完成画像的用户生成当天 20 条推荐和晨报，单个用户失败不会中断其他用户。用户量明显增长后，应将该批处理迁移到独立任务队列，避免单次函数超过平台执行时限。

## 常用命令

```bash
npm run typecheck
npm run build
npm run db:migrate
```

## 数据迁移说明

早期本地 SQLite 数据库不会自动迁移到 PostgreSQL。当前初始迁移位于 `prisma/migrations/20260712000000_init_postgresql`。如果需要保留本地测试账号和行为数据，应在正式开放注册前单独执行一次数据导入。
