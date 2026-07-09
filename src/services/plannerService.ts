// plannerService.ts

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FirebaseDailyGoal,
  FirebaseSomedayGoal,
  FirebaseWeeklyGoal,
  FirebaseWeeklyPlan,
} from '@/models/planner';
import { addingDays, endOfWeek, startOfWeek, weekKey } from '@/lib/date';

type FirebaseWeeklyGoalDocument = FirebaseWeeklyGoal & {
  weekKey: string;
};

type FirebaseDailyGoalDocument = FirebaseDailyGoal & {
  weekKey: string;
};

type FirebaseWeeklyPlanMeta = Omit<
  FirebaseWeeklyPlan,
  'weeklyGoals' | 'dailyGoals'
>;

function cleanUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(cleanUndefined) as T;
  }

  if (value instanceof Timestamp) {
    return value;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, childValue] of Object.entries(value)) {
      result[key] =
        childValue === undefined ? null : cleanUndefined(childValue);
    }

    return result as T;
  }

  return value;
}

function weeklyPlansCollection(userId: string) {
  return collection(db, 'users', userId, 'weeklyPlans');
}

function weeklyPlanDoc(userId: string, key: string) {
  return doc(db, 'users', userId, 'weeklyPlans', key);
}

function weeklyGoalsCollection(userId: string) {
  return collection(db, 'users', userId, 'weeklyGoals');
}

function weeklyGoalDoc(userId: string, goalId: string) {
  return doc(db, 'users', userId, 'weeklyGoals', goalId);
}

function dailyGoalsCollection(userId: string) {
  return collection(db, 'users', userId, 'dailyGoals');
}

function dailyGoalDoc(userId: string, goalId: string) {
  return doc(db, 'users', userId, 'dailyGoals', goalId);
}

function somedayGoalsCollection(userId: string) {
  return collection(db, 'users', userId, 'somedayGoals');
}

function somedayGoalDoc(userId: string, goalId: string) {
  return doc(db, 'users', userId, 'somedayGoals', goalId);
}

function dateFromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function canonicalWeekKey(key: string): string {
  return weekKey(dateFromDayKey(key));
}

// The live listeners only cover last/this/next week. weekKey() always
// anchors to Sunday regardless of the user's display preference, so a
// Monday-start display's "next week" view runs one day into the week after
// next (its trailing Sunday belongs to that later week) — extend the
// forward bound by one extra week so that day is still covered.
const WEEKS_BACK = 1;
const WEEKS_FORWARD = 2;

export function liveRangeKeys(): { start: string; end: string } {
  const thisWeekStart = startOfWeek(new Date());

  return {
    start: weekKey(addingDays(thisWeekStart, -WEEKS_BACK * 7)),
    end: weekKey(addingDays(thisWeekStart, WEEKS_FORWARD * 7)),
  };
}

export function isDateInLiveRange(date: Date): boolean {
  const { start, end } = liveRangeKeys();
  const key = weekKey(date);

  return key >= start && key <= end;
}

function makePlanMetaFromDate(date: Date): FirebaseWeeklyPlanMeta {
  const weekStartDate = startOfWeek(date);
  const weekEndDate = endOfWeek(date);
  const now = Timestamp.now();

  return {
    id: weekKey(weekStartDate),
    weekStartDate: Timestamp.fromDate(weekStartDate),
    weekEndDate: Timestamp.fromDate(weekEndDate),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function removeWeekKeyFromWeeklyGoal({
  weekKey,
  ...goal
}: FirebaseWeeklyGoalDocument): FirebaseWeeklyGoal {
  void weekKey;
  return goal;
}

function removeWeekKeyFromDailyGoal({
  weekKey,
  ...goal
}: FirebaseDailyGoalDocument): FirebaseDailyGoal {
  void weekKey;
  return goal;
}

function assemblePlans(
  metas: FirebaseWeeklyPlanMeta[],
  weeklyGoals: FirebaseWeeklyGoalDocument[],
  dailyGoals: FirebaseDailyGoalDocument[],
): FirebaseWeeklyPlan[] {
  const metaMap = new Map<string, FirebaseWeeklyPlanMeta>();

  for (const meta of metas) {
    const key = weekKey(meta.weekStartDate.toDate());

    metaMap.set(key, {
      ...meta,
      id: key,
      weekStartDate: Timestamp.fromDate(
        startOfWeek(meta.weekStartDate.toDate()),
      ),
      weekEndDate: Timestamp.fromDate(endOfWeek(meta.weekStartDate.toDate())),
    });
  }

  for (const goal of weeklyGoals) {
    const key = canonicalWeekKey(goal.weekKey);

    if (!metaMap.has(key)) {
      metaMap.set(key, makePlanMetaFromDate(dateFromDayKey(goal.weekKey)));
    }
  }

  for (const goal of dailyGoals) {
    const key = canonicalWeekKey(goal.weekKey);

    if (!metaMap.has(key)) {
      metaMap.set(key, makePlanMetaFromDate(goal.date.toDate()));
    }
  }

  return Array.from(metaMap.entries())
    .map(([key, meta]) => ({
      ...meta,
      id: key,
      weeklyGoals: weeklyGoals
        .filter((goal) => canonicalWeekKey(goal.weekKey) === key)
        .map(removeWeekKeyFromWeeklyGoal)
        .sort((a, b) => a.order - b.order),
      dailyGoals: dailyGoals
        .filter((goal) => canonicalWeekKey(goal.weekKey) === key)
        .map(removeWeekKeyFromDailyGoal)
        .sort((a, b) => {
          const dateDiff = a.date.toMillis() - b.date.toMillis();
          return dateDiff !== 0 ? dateDiff : a.order - b.order;
        }),
    }))
    .sort((a, b) => a.weekStartDate.toMillis() - b.weekStartDate.toMillis());
}

export function subscribePlannerData(
  userId: string,
  onChange: (data: {
    weeklyPlans: FirebaseWeeklyPlan[];
    somedayGoals: FirebaseSomedayGoal[];
  }) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let metas: FirebaseWeeklyPlanMeta[] = [];
  let weeklyGoals: FirebaseWeeklyGoalDocument[] = [];
  let dailyGoals: FirebaseDailyGoalDocument[] = [];
  let somedayGoals: FirebaseSomedayGoal[] = [];

  let hasLoadedMetas = false;
  let hasLoadedWeeklyGoals = false;
  let hasLoadedDailyGoals = false;
  let hasLoadedSomedayGoals = false;

  function hasLoadedInitialData() {
    return (
      hasLoadedMetas &&
      hasLoadedWeeklyGoals &&
      hasLoadedDailyGoals &&
      hasLoadedSomedayGoals
    );
  }

  function emit() {
    if (!hasLoadedInitialData()) return;

    onChange({
      weeklyPlans: assemblePlans(metas, weeklyGoals, dailyGoals),
      somedayGoals: [...somedayGoals].sort((a, b) => a.order - b.order),
    });
  }

  const { start: liveRangeStart, end: liveRangeEnd } = liveRangeKeys();

  const unsubscribes = [
    onSnapshot(
      query(
        weeklyPlansCollection(userId),
        where('id', '>=', liveRangeStart),
        where('id', '<=', liveRangeEnd),
      ),
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        metas = snapshot.docs.map(
          (doc) => doc.data() as FirebaseWeeklyPlanMeta,
        );
        hasLoadedMetas = true;
        emit();
      },
      onError,
    ),

    onSnapshot(
      query(
        weeklyGoalsCollection(userId),
        where('weekKey', '>=', liveRangeStart),
        where('weekKey', '<=', liveRangeEnd),
      ),
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        weeklyGoals = snapshot.docs.map(
          (doc) => doc.data() as FirebaseWeeklyGoalDocument,
        );
        hasLoadedWeeklyGoals = true;
        emit();
      },
      onError,
    ),

    onSnapshot(
      query(
        dailyGoalsCollection(userId),
        where('weekKey', '>=', liveRangeStart),
        where('weekKey', '<=', liveRangeEnd),
      ),
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        dailyGoals = snapshot.docs.map(
          (doc) => doc.data() as FirebaseDailyGoalDocument,
        );
        hasLoadedDailyGoals = true;
        emit();
      },
      onError,
    ),

    onSnapshot(
      query(somedayGoalsCollection(userId)),
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        somedayGoals = snapshot.docs.map(
          (doc) => doc.data() as FirebaseSomedayGoal,
        );
        hasLoadedSomedayGoals = true;
        emit();
      },
      onError,
    ),
  ];

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * One-time (non-live) fetch for a week outside the live listener range, e.g.
 * when the user navigates far in the past/future. Returns null if the week
 * has no data at all.
 */
export async function fetchWeekPlan(
  userId: string,
  weekStartDate: Date,
): Promise<FirebaseWeeklyPlan | null> {
  const key = weekKey(weekStartDate);

  const [metaSnap, weeklyGoalsSnap, dailyGoalsSnap] = await Promise.all([
    getDoc(weeklyPlanDoc(userId, key)),
    getDocs(query(weeklyGoalsCollection(userId), where('weekKey', '==', key))),
    getDocs(query(dailyGoalsCollection(userId), where('weekKey', '==', key))),
  ]);

  const weeklyGoals = weeklyGoalsSnap.docs
    .map((doc) => doc.data() as FirebaseWeeklyGoalDocument)
    .map(removeWeekKeyFromWeeklyGoal)
    .sort((a, b) => a.order - b.order);

  const dailyGoals = dailyGoalsSnap.docs
    .map((doc) => doc.data() as FirebaseDailyGoalDocument)
    .map(removeWeekKeyFromDailyGoal)
    .sort((a, b) => {
      const dateDiff = a.date.toMillis() - b.date.toMillis();
      return dateDiff !== 0 ? dateDiff : a.order - b.order;
    });

  if (!metaSnap.exists() && weeklyGoals.length === 0 && dailyGoals.length === 0) {
    return null;
  }

  const meta = metaSnap.exists()
    ? (metaSnap.data() as FirebaseWeeklyPlanMeta)
    : makePlanMetaFromDate(weekStartDate);

  return {
    ...meta,
    id: key,
    weeklyGoals,
    dailyGoals,
  };
}

export async function saveWeeklyPlanMeta(
  userId: string,
  plan: FirebaseWeeklyPlan,
) {
  const key = weekKey(plan.weekStartDate.toDate());
  const weekStartDate = startOfWeek(plan.weekStartDate.toDate());
  const weekEndDate = endOfWeek(plan.weekStartDate.toDate());

  const meta: FirebaseWeeklyPlanMeta = {
    id: key,
    weekStartDate: Timestamp.fromDate(weekStartDate),
    weekEndDate: Timestamp.fromDate(weekEndDate),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt ?? Timestamp.now(),
    deletedAt: plan.deletedAt ?? null,
  };

  await setDoc(weeklyPlanDoc(userId, key), cleanUndefined(meta), {
    merge: true,
  });
}

export async function saveWeeklyGoal(
  userId: string,
  plan: FirebaseWeeklyPlan,
  goal: FirebaseWeeklyGoal,
  syncPlanMeta = false,
) {
  const key = weekKey(plan.weekStartDate.toDate());

  if (syncPlanMeta) {
    await saveWeeklyPlanMeta(userId, plan);
  }

  await setDoc(
    weeklyGoalDoc(userId, goal.id),
    cleanUndefined({
      ...goal,
      weekKey: key,
    } satisfies FirebaseWeeklyGoalDocument),
    { merge: true },
  );
}

export async function saveWeeklyGoals(
  userId: string,
  plan: FirebaseWeeklyPlan,
  goals: FirebaseWeeklyGoal[],
  syncPlanMeta = false,
) {
  const key = weekKey(plan.weekStartDate.toDate());
  const weekStartDate = startOfWeek(plan.weekStartDate.toDate());
  const weekEndDate = endOfWeek(plan.weekStartDate.toDate());
  const batch = writeBatch(db);

  if (syncPlanMeta) {
    batch.set(
      weeklyPlanDoc(userId, key),
      cleanUndefined({
        id: key,
        weekStartDate: Timestamp.fromDate(weekStartDate),
        weekEndDate: Timestamp.fromDate(weekEndDate),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt ?? Timestamp.now(),
        deletedAt: plan.deletedAt ?? null,
      }),
      { merge: true },
    );
  }

  for (const goal of goals) {
    batch.set(
      weeklyGoalDoc(userId, goal.id),
      cleanUndefined({
        ...goal,
        weekKey: key,
      } satisfies FirebaseWeeklyGoalDocument),
      { merge: true },
    );
  }

  await batch.commit();
}

export async function saveDailyGoal(
  userId: string,
  plan: FirebaseWeeklyPlan,
  goal: FirebaseDailyGoal,
  syncPlanMeta = false,
) {
  const key = weekKey(plan.weekStartDate.toDate());

  if (syncPlanMeta) {
    await saveWeeklyPlanMeta(userId, plan);
  }

  await setDoc(
    dailyGoalDoc(userId, goal.id),
    cleanUndefined({
      ...goal,
      weekKey: key,
    } satisfies FirebaseDailyGoalDocument),
    { merge: true },
  );
}

export async function saveDailyGoals(
  userId: string,
  plan: FirebaseWeeklyPlan,
  goals: FirebaseDailyGoal[],
  syncPlanMeta = false,
) {
  const key = weekKey(plan.weekStartDate.toDate());
  const weekStartDate = startOfWeek(plan.weekStartDate.toDate());
  const weekEndDate = endOfWeek(plan.weekStartDate.toDate());
  const batch = writeBatch(db);

  if (syncPlanMeta) {
    batch.set(
      weeklyPlanDoc(userId, key),
      cleanUndefined({
        id: key,
        weekStartDate: Timestamp.fromDate(weekStartDate),
        weekEndDate: Timestamp.fromDate(weekEndDate),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt ?? Timestamp.now(),
        deletedAt: plan.deletedAt ?? null,
      }),
      { merge: true },
    );
  }

  for (const goal of goals) {
    batch.set(
      dailyGoalDoc(userId, goal.id),
      cleanUndefined({
        ...goal,
        weekKey: key,
      } satisfies FirebaseDailyGoalDocument),
      { merge: true },
    );
  }

  await batch.commit();
}

export async function saveSomedayGoal(
  userId: string,
  goal: FirebaseSomedayGoal,
) {
  await setDoc(somedayGoalDoc(userId, goal.id), cleanUndefined(goal), {
    merge: true,
  });
}

export async function saveSomedayGoals(
  userId: string,
  goals: FirebaseSomedayGoal[],
) {
  const batch = writeBatch(db);

  for (const goal of goals) {
    batch.set(somedayGoalDoc(userId, goal.id), cleanUndefined(goal), {
      merge: true,
    });
  }

  await batch.commit();
}

export async function deleteCloudUserData(userId: string) {
  const collections = [
    weeklyPlansCollection(userId),
    weeklyGoalsCollection(userId),
    dailyGoalsCollection(userId),
    somedayGoalsCollection(userId),
  ];

  for (const collectionRef of collections) {
    const snapshot = await getDocs(collectionRef);

    await Promise.all(snapshot.docs.map((document) => deleteDoc(document.ref)));
  }

  await deleteDoc(doc(db, 'users', userId));
}

export function nowTimestamp() {
  return Timestamp.now();
}
