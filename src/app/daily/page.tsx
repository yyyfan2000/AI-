import { redirect } from "next/navigation";
import Link from "next/link";
import { ArchiveDateNav } from "@/components/ArchiveDateNav";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { requireUser } from "@/lib/auth";
import { getDailyReportDates, getOrCreateDailyReport } from "@/lib/daily-report";
import { getDailyRecommendations } from "@/lib/recommendation";

export default async function DailyPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  if (!user.profile) redirect("/onboarding");

  const { date: requestedDate } = await searchParams;
  const { date, items, refreshError } = await getDailyRecommendations(user.id, requestedDate);
  const report = await getOrCreateDailyReport(user.id, date, user.profile, items.slice(0, 5));
  const reportDates = await getDailyReportDates(user.id);

  return (
    <AppShell>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-lagoon">每日业务决策报告</p>
          <h1 className="mt-2 text-3xl font-semibold">{report?.title ?? `${date} 暂无晨报`}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            基于与你高度相关的 AI 资讯，分析后续业务可以怎么做，以及为什么这些资讯能和业务结合。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="good">{date}</StatusPill>
          {report ? <StatusPill tone="good">引用 {report.sources.length} 条</StatusPill> : null}
          {report ? <StatusPill>{report.generatedBy === "deepseek" ? "DeepSeek 生成" : "规则报告"}</StatusPill> : null}
        </div>
      </section>

      <ArchiveDateNav dates={reportDates} path="/daily" selectedDate={date} />

      {refreshError ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          AI HOT 当前不可用，已使用缓存或样例数据继续生成报告：{refreshError}
        </div>
      ) : null}

      {report?.generatedBy === "rule" ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          当前未配置可用的 DeepSeek API Key，已生成结构化规则版报告。绑定 Key 后，晨报会按业务分析提示词生成更完整的 AI 报告。
          <Link href="/settings" className="ml-2 font-semibold underline">
            去设置
          </Link>
        </div>
      ) : null}

      {!report ? (
        <div className="rounded-md border border-slate-200 bg-white px-5 py-10 text-center text-slate-500">
          该日期还没有推荐资讯，因此无法生成晨报。生成过的每日晨报会长期保留在这里。
        </div>
      ) : null}

      {report ? <article className="space-y-6 rounded-lg border border-black/5 bg-white p-6 shadow-soft">
        <section>
          <h2 className="text-xl font-semibold">一、决策摘要</h2>
          <p className="mt-3 leading-8 text-slate-700">{report.executiveSummary}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">二、相关资讯解读</h2>
          <div className="mt-4 grid gap-4">
            {report.relevanceAnalyses.map((analysis) => (
              <div key={analysis.title} className="rounded-md bg-slate-50 p-4">
                <h3 className="font-semibold">{analysis.title}</h3>
                <dl className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
                  <InfoTerm label="讲了什么" value={analysis.what} />
                  <InfoTerm label="为什么重要" value={analysis.importance} />
                  <InfoTerm label="和业务关系" value={analysis.businessRelation} />
                  <InfoTerm label="背后趋势" value={analysis.trend} />
                  <div className="md:col-span-2">
                    <InfoTerm label="机会或风险" value={analysis.opportunityOrRisk} />
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">三、结合业务怎么做</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {report.businessAnalyses.map((analysis) => (
              <div key={analysis.area} className="rounded-md border border-slate-100 p-4">
                <h3 className="font-semibold">{analysis.area}</h3>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  <InfoTerm label="用户痛点" value={analysis.painPoint} />
                  <InfoTerm label="可提升指标" value={analysis.metric} />
                  <InfoTerm label="所需能力" value={analysis.requiredCapabilities} />
                  <InfoTerm label="阶段判断" value={analysis.fitJudgement} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">四、3-5 个可执行业务动作</h2>
          <div className="mt-4 grid gap-4">
            {report.actions.map((action) => (
              <div key={action.name} className="rounded-md bg-slate-50 p-4">
                <h3 className="font-semibold">{action.name}</h3>
                <dl className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
                  <InfoTerm label="适用场景" value={action.scenario} />
                  <InfoTerm label="目标用户" value={action.targetUser} />
                  <InfoTerm label="解决问题" value={action.problem} />
                  <InfoTerm label="产品方案" value={action.productPlan} />
                  <InfoTerm label="预期收益" value={action.expectedBenefit} />
                  <InfoTerm label="关键指标" value={action.keyMetric} />
                  <InfoTerm label="MVP 怎么做" value={action.mvp} />
                  <InfoTerm label="可能风险" value={action.risk} />
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">五、优先级排序</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <TableHead>动作</TableHead>
                  <TableHead>业务价值</TableHead>
                  <TableHead>实现难度</TableHead>
                  <TableHead>资源要求</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>推荐理由</TableHead>
                </tr>
              </thead>
              <tbody>
                {report.priorities.map((row) => (
                  <tr key={row.action} className="border-b border-slate-100">
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.businessValue}</TableCell>
                    <TableCell>{row.difficulty}</TableCell>
                    <TableCell>{row.resources}</TableCell>
                    <TableCell>{row.risk}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {row.priority}
                      </span>
                    </TableCell>
                    <TableCell>{row.reason}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">六、参考资讯与来源</h2>
          <div className="mt-4 grid gap-3">
            {report.sources.map((source) => (
              <div key={`${source.title}-${source.url}`} className="rounded-md border border-slate-100 p-4 text-sm">
                <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-lagoon hover:underline">
                  {source.title}
                </a>
                <p className="mt-2 text-slate-600">
                  {source.source} · {source.publishedAt}
                </p>
                <p className="mt-2 leading-6 text-slate-700">{source.supports}</p>
              </div>
            ))}
          </div>
        </section>
      </article> : null}
    </AppShell>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-semibold text-slate-700">{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-top text-slate-700">{children}</td>;
}
