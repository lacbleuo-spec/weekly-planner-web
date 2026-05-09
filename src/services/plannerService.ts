import {
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirebaseSomedayGoal, FirebaseWeeklyPlan } from '@/models/planner';
import { weekKey } from '@/lib/date';

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

export async function fetchWeeklyPlans(
  userId: string,
): Promise<FirebaseWeeklyPlan[]> {
  const snapshot = await getDocs(
    collection(db, 'users', userId, 'weeklyPlans'),
  );

  return snapshot.docs.map((doc) => doc.data() as FirebaseWeeklyPlan);
}

export async function fetchSomedayGoals(
  userId: string,
): Promise<FirebaseSomedayGoal[]> {
  const snapshot = await getDocs(
    collection(db, 'users', userId, 'somedayGoals'),
  );

  return snapshot.docs.map((doc) => doc.data() as FirebaseSomedayGoal);
}

export async function saveWeeklyPlan(userId: string, plan: FirebaseWeeklyPlan) {
  const id = weekKey(plan.weekStartDate.toDate());

  await setDoc(
    doc(db, 'users', userId, 'weeklyPlans', id),
    cleanUndefined(plan),
  );
}

export async function saveSomedayGoal(
  userId: string,
  goal: FirebaseSomedayGoal,
) {
  await setDoc(
    doc(db, 'users', userId, 'somedayGoals', goal.id),
    cleanUndefined(goal),
  );
}

export function nowTimestamp() {
  return Timestamp.now();
}
