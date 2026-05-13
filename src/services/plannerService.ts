// plannerService

import {
  collection,
  deleteDoc,
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

export async function replaceCloudWeeklyPlans(
  userId: string,
  plans: FirebaseWeeklyPlan[],
) {
  const collectionRef = collection(db, 'users', userId, 'weeklyPlans');
  const snapshot = await getDocs(collectionRef);

  await Promise.all(
    snapshot.docs.map((document) =>
      deleteDoc(doc(db, 'users', userId, 'weeklyPlans', document.id)),
    ),
  );

  await Promise.all(
    plans.map((plan) => {
      const id = weekKey(plan.weekStartDate.toDate());

      return setDoc(
        doc(db, 'users', userId, 'weeklyPlans', id),
        cleanUndefined(plan),
      );
    }),
  );
}

export async function replaceCloudSomedayGoals(
  userId: string,
  goals: FirebaseSomedayGoal[],
) {
  const collectionRef = collection(db, 'users', userId, 'somedayGoals');
  const snapshot = await getDocs(collectionRef);

  await Promise.all(
    snapshot.docs.map((document) =>
      deleteDoc(doc(db, 'users', userId, 'somedayGoals', document.id)),
    ),
  );

  await Promise.all(
    goals.map((goal) =>
      setDoc(
        doc(db, 'users', userId, 'somedayGoals', goal.id),
        cleanUndefined(goal),
      ),
    ),
  );
}

export async function deleteCloudUserData(userId: string) {
  const weeklyPlansSnapshot = await getDocs(
    collection(db, 'users', userId, 'weeklyPlans'),
  );

  await Promise.all(
    weeklyPlansSnapshot.docs.map((document) => deleteDoc(document.ref)),
  );

  const somedayGoalsSnapshot = await getDocs(
    collection(db, 'users', userId, 'somedayGoals'),
  );

  await Promise.all(
    somedayGoalsSnapshot.docs.map((document) => deleteDoc(document.ref)),
  );

  await deleteDoc(doc(db, 'users', userId));
}

export function nowTimestamp() {
  return Timestamp.now();
}
