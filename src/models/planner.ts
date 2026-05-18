// planner

import { Timestamp } from 'firebase/firestore';

export type GoalKind = 'schedule' | 'deletable' | 'nonDeletable';

export type GoalReminder =
  | 'none'
  | 'atTime'
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | '1h'
  | '1d';

export type FirebaseWeeklyPlan = {
  id: string;
  weekStartDate: Timestamp;
  weekEndDate: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  weeklyGoals: FirebaseWeeklyGoal[];
  dailyGoals: FirebaseDailyGoal[];
};

export type FirebaseWeeklyGoal = {
  id: string;
  title: string;
  kind?: GoalKind;
  time?: string | null;
  reminder?: GoalReminder;
  order: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
};

export type FirebaseDailyGoal = {
  id: string;
  title: string;
  date: Timestamp;
  isCompleted: boolean;
  kind?: GoalKind;
  time?: string | null;
  reminder?: GoalReminder;
  order: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
};

export type FirebaseSomedayGoal = {
  id: string;
  title: string;
  order: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
};
