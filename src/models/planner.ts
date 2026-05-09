// planner

import { Timestamp } from 'firebase/firestore';

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
