"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  AI_LEVELS,
  GOALS,
  INDUSTRIES,
  INTEREST_TAGS,
  ROLES,
  USER_TYPES
} from "@/lib/options";

const profileSchema = z.object({
  userType: z.enum(USER_TYPES),
  role: z.enum(ROLES),
  industry: z.enum(INDUSTRIES),
  aiLevel: z.enum(AI_LEVELS),
  goals: z.array(z.enum(GOALS)).min(1),
  interestTags: z.array(z.enum(INTEREST_TAGS)).min(1)
});

export async function saveProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.parse({
    userType: formData.get("userType"),
    role: formData.get("role"),
    industry: formData.get("industry"),
    aiLevel: formData.get("aiLevel"),
    goals: formData.getAll("goals"),
    interestTags: formData.getAll("interestTags")
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      ...parsed,
      goals: JSON.stringify(parsed.goals),
      interestTags: JSON.stringify(parsed.interestTags)
    },
    create: {
      userId: user.id,
      ...parsed,
      goals: JSON.stringify(parsed.goals),
      interestTags: JSON.stringify(parsed.interestTags)
    }
  });

  redirect("/");
}
