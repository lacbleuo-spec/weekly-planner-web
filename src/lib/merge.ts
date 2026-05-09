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

function effectiveUpdatedAtPlan(plan: FirebaseWeeklyPlan) {
  return Math.max(
    timeValue(plan.deletedAt),
    timeValue(plan.updatedAt),
    timeValue(plan.createdAt),
  );
}

function effectiveUpdatedAtWeeklyGoal(goal: FirebaseWeeklyGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
}

function effectiveUpdatedAtDailyGoal(goal: FirebaseDailyGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
}

function effectiveUpdatedAtSomedayGoal(goal: FirebaseSomedayGoal) {
  return Math.max(
    timeValue(goal.deletedAt),
    timeValue(goal.updatedAt),
    timeValue(goal.createdAt),
  );
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

  const weeklyGoals = Array.from(weeklyGoalMap.values()).sort(
    (a, b) => a.order - b.order,
  );

  const dailyGoals = Array.from(dailyGoalMap.values()).sort((a, b) => {
    const dateDiff = a.date.toMillis() - b.date.toMillis();

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return a.order - b.order;
  });

  return {
    id: basePlan.id,
    weekStartDate: basePlan.weekStartDate,
    weekEndDate: basePlan.weekEndDate,
    createdAt: basePlan.createdAt,
    updatedAt: basePlan.updatedAt,
    deletedAt: basePlan.deletedAt,
    weeklyGoals,
    dailyGoals,
  };
}

export function mergePlans(
  localPlans: FirebaseWeeklyPlan[],
  cloudPlans: FirebaseWeeklyPlan[],
): FirebaseWeeklyPlan[] {
  const groupedPlans = new Map<string, FirebaseWeeklyPlan[]>();

  for (const plan of [...localPlans, ...cloudPlans]) {
    const key = weekKey(plan.weekStartDate.toDate());
    const existing = groupedPlans.get(key) ?? [];
    groupedPlans.set(key, [...existing, plan]);
  }

  return Array.from(groupedPlans.values())
    .map((plans) => mergePlansForSameWeek(plans))
    .sort((a, b) => a.weekStartDate.toMillis() - b.weekStartDate.toMillis());
}

export function mergeSomedayGoals(
  localGoals: FirebaseSomedayGoal[],
  cloudGoals: FirebaseSomedayGoal[],
): FirebaseSomedayGoal[] {
  const goalMap = new Map<string, FirebaseSomedayGoal>();

  for (const goal of [...localGoals, ...cloudGoals]) {
    const existing = goalMap.get(goal.id);
    goalMap.set(goal.id, existing ? newerSomedayGoal(existing, goal) : goal);
  }

  return Array.from(goalMap.values()).sort((a, b) => a.order - b.order);
}
