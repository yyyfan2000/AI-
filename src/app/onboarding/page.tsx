import { redirect } from "next/navigation";
import { saveProfileAction } from "@/app/actions/profile";
import { requireUser } from "@/lib/auth";
import {
  AI_LEVELS,
  GOALS,
  INDUSTRIES,
  INTEREST_TAGS,
  ROLES,
  USER_TYPES
} from "@/lib/options";

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.profile) redirect("/");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-lagoon">1 分钟画像</p>
        <h1 className="mt-2 text-3xl font-semibold">让 AI 热点先懂你一点</h1>
        <p className="mt-3 text-slate-600">
          这些选择会用于首页排序、推荐理由和灵感建议。
        </p>
      </div>
      <form action={saveProfileAction} className="rounded-lg border border-black/5 bg-white p-6 shadow-soft">
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField label="身份" name="userType" values={USER_TYPES} />
          <SelectField label="职业" name="role" values={ROLES} />
          <SelectField label="行业领域" name="industry" values={INDUSTRIES} />
          <SelectField label="AI 熟练度" name="aiLevel" values={AI_LEVELS} />
        </div>
        <CheckboxGroup title="关注目标" name="goals" values={GOALS} defaultValues={["提效", "产品机会"]} />
        <CheckboxGroup
          title="兴趣标签"
          name="interestTags"
          values={INTEREST_TAGS}
          defaultValues={["产品", "行业", "智能体"]}
        />
        <div className="mt-8 flex justify-end">
          <button className="focus-ring rounded-md bg-ink px-5 py-3 font-medium text-white hover:bg-slate-700">
            进入 AI 热译
          </button>
        </div>
      </form>
    </main>
  );
}

function SelectField({
  label,
  name,
  values
}: {
  label: string;
  name: string;
  values: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} className="focus-ring mt-2 w-full rounded-md border border-slate-200 px-3 py-3">
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
