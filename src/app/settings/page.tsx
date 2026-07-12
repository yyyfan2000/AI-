import { redirect } from "next/navigation";
import { saveProfileAction } from "@/app/actions/profile";
import { AppShell } from "@/components/AppShell";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { MemoryTabs } from "@/components/MemoryTabs";
import { requireUser } from "@/lib/auth";
import { parseStringArray } from "@/lib/json";
import { getMemorySummary } from "@/lib/recommendation";
import {
  AI_LEVELS,
  GOALS,
  INDUSTRIES,
  INTEREST_TAGS,
  ROLES,
  USER_TYPES
} from "@/lib/options";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user.profile) redirect("/onboarding");

  const memory = await getMemorySummary(user.id);
  const goals = parseStringArray(user.profile.goals);
  const interestTags = parseStringArray(user.profile.interestTags);
  const toMemoryItem = (action: (typeof memory.saved)[number]) => ({
    id: action.id,
    title: action.newsItem.title,
    date: action.createdAt.toLocaleString("zh-CN"),
    href: `/advisor/${action.newsItemId}`
  });

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-sm font-medium text-lagoon">设置</p>
        <h1 className="mt-2 text-3xl font-semibold">画像、记忆与模型连接</h1>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">用户画像</h2>
          <form action={saveProfileAction} className="mt-5">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField label="身份" name="userType" values={USER_TYPES} defaultValue={user.profile.userType} />
              <SelectField label="职业" name="role" values={ROLES} defaultValue={user.profile.role} />
              <SelectField label="行业领域" name="industry" values={INDUSTRIES} defaultValue={user.profile.industry} />
              <SelectField label="AI 熟练度" name="aiLevel" values={AI_LEVELS} defaultValue={user.profile.aiLevel} />
            </div>
            <CheckboxGroup title="关注目标" name="goals" values={GOALS} defaultValues={goals} />
            <CheckboxGroup title="兴趣标签" name="interestTags" values={INTEREST_TAGS} defaultValues={interestTags} />
            <button className="focus-ring mt-6 rounded-md bg-ink px-5 py-3 font-medium text-white hover:bg-slate-700">
              保存画像
            </button>
          </form>
        </section>

        <div className="grid gap-5">
          <ApiKeyPanel />
          <MemoryTabs
            hidden={memory.hidden.map(toMemoryItem)}
            read={memory.read.map(toMemoryItem)}
            saved={memory.saved.map(toMemoryItem)}
          />
        </div>
      </div>
    </AppShell>
  );
}

function SelectField({
  label,
  name,
  values,
  defaultValue
}: {
  label: string;
  name: string;
  values: readonly string[];
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="focus-ring mt-2 w-full rounded-md border border-slate-200 px-3 py-3"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({
  title,
  name,
  values,
  defaultValues
}: {
  title: string;
  name: string;
  values: readonly string[];
  defaultValues: string[];
}) {
  return (
    <fieldset className="mt-7">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              name={name}
              value={value}
              defaultChecked={defaultValues.includes(value)}
              className="h-4 w-4 accent-lagoon"
            />
            {value}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
