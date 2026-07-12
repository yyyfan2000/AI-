import { redirect } from "next/navigation";
import { requestCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.profile ? "/" : "/onboarding");

  const params = await searchParams;
  const sentEmail = params.sent
    ? decodeURIComponent(params.sent)
    : params.email
      ? decodeURIComponent(params.email)
      : "";

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-black/5 bg-white p-6 shadow-soft">
        <div className="mb-8">
          <p className="text-sm font-medium text-lagoon">AI热译</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            登录后开启你的 AI 热点降噪流
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            验证码将发送到你的邮箱，10 分钟内有效。
            {process.env.NODE_ENV === "development" ? " 本地开发时可在服务端控制台查看验证码。" : null}
          </p>
        </div>

        <form action={requestCodeAction} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={sentEmail}
            placeholder="you@example.com"
            className="focus-ring w-full rounded-md border border-slate-200 px-3 py-3"
          />
          <button className="focus-ring w-full rounded-md bg-ink px-4 py-3 font-medium text-white hover:bg-slate-700">
            获取验证码
          </button>
        </form>

        {params.error === "send" ? (
          <p className="mt-3 text-sm text-coral">验证码发送失败或请求过于频繁，请稍后重试。</p>
        ) : null}

        {sentEmail ? (
          <form action={verifyCodeAction} className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            <input name="email" type="hidden" value={sentEmail} />
            <label className="block text-sm font-medium" htmlFor="code">
              验证码
            </label>
            <input
              id="code"
              name="code"
              required
              placeholder="6 位验证码"
              className="focus-ring w-full rounded-md border border-slate-200 px-3 py-3"
            />
            {params.error === "code" ? (
              <p className="text-sm text-coral">验证码无效或已过期，请重新获取。</p>
            ) : null}
            <button className="focus-ring w-full rounded-md bg-lagoon px-4 py-3 font-medium text-white hover:bg-teal-700">
              登录
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
