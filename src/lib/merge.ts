// merge

import {
  FirebaseDailyGoal,
  FirebaseSomedayGoal,
  FirebaseWeeklyGoal,
  FirebaseWeeklyPlan,
} from '@/models/planner';
import { weekKey } from '@/lib/date';

function timeValue(date: { toMillis: () => number } | null | undefined) {
  return date?.toMillis() ?? 0;
}

export function effectiveUpdatedAtPlan(plan: FirebaseWeeklyPlan) {
  return Math.max(
    timeValue(plan.deletedAt),
    timeValue(plan.updatedAt),
    timeValue(plan.createdAt),
  );
}

export function effectiveUpdatedAtWeeklyGoal(goal: FirebaseWeeklyGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
}

export function effectiveUpdatedAtDailyGoal(goal: FirebaseDailyGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
}

export function effectiveUpdatedAtSomedayGoal(goal: FirebaseSomedayGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
}

export function cloudWatermark(
  plans: FirebaseWeeklyPlan[],
  somedayGoals: FirebaseSomedayGoal[],
) {
  let latest = 0;

  for (const plan of plans) {
    latest = Math.max(latest, effectiveUpdatedAtPlan(plan));

    for (const goal of plan.weeklyGoals) {
      latest = Math.max(latest, effectiveUpdatedAtWeeklyGoal(goal));
    }

    for (const goal of plan.dailyGoals) {
      latest = Math.max(latest, effectiveUpdatedAtDailyGoal(goal));
    }
  }

  for (const goal of somedayGoals) {
    latest = Math.max(latest, effectiveUpdatedAtSomedayGoal(goal));
  }

  return latest;
}

function newerWeeklyGoal(
  lhs: FirebaseWeeklyGoal,
  rhs: FirebaseWeeklyGoal,
): FirebaseWeeklyGoal {
  return effectiveUpdatedAtWeeklyGoal(lhs) >= effectiveUpdatedAtWeeklyGoal(rhs)
    ? lhs
    : rhs;
}

function newerDailyGoal(
  lhs: FirebaseDailyGoal,
  rhs: FirebaseDailyGoal,
): FirebaseDailyGoal {
  return effectiveUpdatedAtDailyGoal(lhs) >= effectiveUpdatedAtDailyGoal(rhs)
    ? lhs
    : rhs;
}

function newerSomedayGoal(
  lhs: FirebaseSomedayGoal,
  rhs: FirebaseSomedayGoal,
): FirebaseSomedayGoal {
  return effectiveUpdatedAtSomedayGoal(lhs) >=
    effectiveUpdatedAtSomedayGoal(rhs)
    ? lhs
    : rhs;
}

function mergePlansForSameWeek(
  plans: FirebaseWeeklyPlan[],
): FirebaseWeeklyPlan {
  const basePlan = [...plans].sort(
    (a, b) => effectiveUpdatedAtPlan(b) - effectiveUpdatedAtPlan(a),
  )[0];

  const weeklyGoalMap = new Map<string, FirebaseWeeklyGoal>();

  for (const plan of plans) {
    for (const goal of plan.weeklyGoals) {
      const existing = weeklyGoalMap.get(goal.id);
      weeklyGoalMap.set(
        goal.id,
        existing ? newerWeeklyGoal(existing, goal) : goal,
      );
    }
  }

  const dailyGoalMap = new Map<string, FirebaseDailyGoal>();

  for (const plan of plans) {
    for (const goal of plan.dailyGoals) {
      const existing = dailyGoalMap.get(goal.id);
      dailyGoalMap.set(
        goal.id,
        existing ? newerDailyGoal(existing, goal) : goal,
      );
    }
  }

  return {
    id: basePlan.id,
    weekStartDate: basePlan.weekStartDate,
    weekEndDate: basePlan.weekEndDate,
    createdAt: basePlan.createdAt,
    updatedAt: basePlan.updatedAt,
    deletedAt: basePlan.deletedAt,
    weeklyGoals: Array.from(weeklyGoalMap.values()).sort(
      (a, b) => a.order - b.order,
    ),
    dailyGoals: Array.from(dailyGoalMap.values()).sort((a, b) => {
      const dateDiff = a.date.toMillis() - b.date.toMillis();
      return dateDiff !== 0 ? dateDiff : a.order - b.order;
    }),
  };
}

export function mergePlans(
  localPlans: FirebaseWeeklyPlan[],
  cloudPlans: FirebaseWeeklyPlan[],
): FirebaseWeeklyPlan[] {
  const groupedPlans = new Map<string, FirebaseWeeklyPlan[]>();

  for (const plan of [...cloudPlans, ...localPlans]) {
    const key = weekKey(plan.weekStartDate.toDate());
    groupedPlans.set(key, [...(groupedPlans.get(key) ?? []), plan]);
  }

  return Array.from(groupedPlans.values())
    .map(mergePlansForSameWeek)
    .sort((a, b) => a.weekStartDate.toMillis() - b.weekStartDate.toMillis());
}

export function mergeSomedayGoals(
  localGoals: FirebaseSomedayGoal[],
  cloudGoals: FirebaseSomedayGoal[],
): FirebaseSomedayGoal[] {
  const goalMap = new Map<string, FirebaseSomedayGoal>();

  for (const goal of [...cloudGoals, ...localGoals]) {
    const existing = goalMap.get(goal.id);
    goalMap.set(goal.id, existing ? newerSomedayGoal(existing, goal) : goal);
  }

  return Array.from(goalMap.values()).sort((a, b) => a.order - b.order);
}

export function filterLocalPlansNewerThanCloud(
  localPlans: FirebaseWeeklyPlan[],
  watermark: number,
): FirebaseWeeklyPlan[] {
  return localPlans.flatMap((plan) => {
    const weeklyGoals = plan.weeklyGoals.filter(
      (goal) => effectiveUpdatedAtWeeklyGoal(goal) > watermark,
    );

    const dailyGoals = plan.dailyGoals.filter(
      (goal) => effectiveUpdatedAtDailyGoal(goal) > watermark,
    );

    const planIsNewer = effectiveUpdatedAtPlan(plan) > watermark;

    if (!planIsNewer && weeklyGoals.length === 0 && dailyGoals.length === 0) {
      return [];
    }

    return [
      {
        ...plan,
        weeklyGoals,
        dailyGoals,
      },
    ];
  });
}

export function filterLocalSomedayGoalsNewerThanCloud(
  localGoals: FirebaseSomedayGoal[],
  watermark: number,
): FirebaseSomedayGoal[] {
  return localGoals.filter(
    (goal) => effectiveUpdatedAtSomedayGoal(goal) > watermark,
  );
}
