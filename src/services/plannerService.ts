import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FirebaseDailyGoal,
  FirebaseSomedayGoal,
  FirebaseWeeklyGoal,
  FirebaseWeeklyPlan,
} from '@/models/planner';
import { endOfWeek, startOfWeek, weekKey } from '@/lib/date';

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

function assemblePlans(
  metas: FirebaseWeeklyPlanMeta[],
  weeklyGoals: FirebaseWeeklyGoalDocument[],
  dailyGoals: FirebaseDailyGoalDocument[],
): FirebaseWeeklyPlan[] {
  const metaMap = new Map<string, FirebaseWeeklyPlanMeta>();

  for (const meta of metas) {
    metaMap.set(weekKey(meta.weekStartDate.toDate()), meta);
  }

  for (const goal of weeklyGoals) {
    if (!metaMap.has(goal.weekKey)) {
      metaMap.set(goal.weekKey, makePlanMetaFromDate(goal.createdAt.toDate()));
    }
  }

  for (const goal of dailyGoals) {
    if (!metaMap.has(goal.weekKey)) {
      metaMap.set(goal.weekKey, makePlanMetaFromDate(goal.date.toDate()));
    }
  }

  return Array.from(metaMap.entries())
    .map(([key, meta]) => ({
      ...meta,
      weeklyGoals: weeklyGoals
        .filter((goal) => goal.weekKey === key)
        .map(({ weekKey: _weekKey, ...goal }) => goal)
        .sort((a, b) => a.order - b.order),
      dailyGoals: dailyGoals
        .filter((goal) => goal.weekKey === key)
        .map(({ weekKey: _weekKey, ...goal }) => goal)
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

  const unsubscribes = [
    onSnapshot(
      query(weeklyPlansCollection(userId)),
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
      query(weeklyGoalsCollection(userId)),
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
      query(dailyGoalsCollection(userId)),
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

export async function saveWeeklyPlanMeta(
  userId: string,
  plan: FirebaseWeeklyPlan,
) {
  const key = weekKey(plan.weekStartDate.toDate());

  const meta: FirebaseWeeklyPlanMeta = {
    id: key,
    weekStartDate: plan.weekStartDate,
    weekEndDate: plan.weekEndDate,
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
) {
  const key = weekKey(plan.weekStartDate.toDate());

  await saveWeeklyPlanMeta(userId, plan);

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
) {
  const key = weekKey(plan.weekStartDate.toDate());
  const batch = writeBatch(db);

  batch.set(
    weeklyPlanDoc(userId, key),
    cleanUndefined({
      id: key,
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt ?? Timestamp.now(),
      deletedAt: plan.deletedAt ?? null,
    }),
    { merge: true },
  );

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
) {
  const key = weekKey(plan.weekStartDate.toDate());

  await saveWeeklyPlanMeta(userId, plan);

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
) {
  const key = weekKey(plan.weekStartDate.toDate());
  const batch = writeBatch(db);

  batch.set(
    weeklyPlanDoc(userId, key),
    cleanUndefined({
      id: key,
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt ?? Timestamp.now(),
      deletedAt: plan.deletedAt ?? null,
    }),
    { merge: true },
  );

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
