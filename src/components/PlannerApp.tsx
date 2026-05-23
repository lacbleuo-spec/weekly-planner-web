// PlannerApp

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlannerResponsiveLayout } from '@/components/PlannerResponsiveLayout';
import { Timestamp } from 'firebase/firestore';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Cloud,
  CloudIcon,
  Copy,
  Lock,
  LockOpen,
  LogOut,
  MoreHorizontal,
  Plus,
  Smartphone,
  Trash,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  addingDays,
  dayKey,
  endOfWeek,
  englishWeekdayText,
  isSameDay,
  monthDayText,
  startOfWeek,
  weekdayShort,
} from '@/lib/date';
import {
  deleteCloudUserData,
  saveDailyGoal,
  saveDailyGoals,
  saveSomedayGoal,
  saveSomedayGoals,
  saveWeeklyGoal,
  saveWeeklyGoals,
  subscribePlannerData,
} from '@/services/plannerService';
import {
  FirebaseDailyGoal,
  FirebaseSomedayGoal,
  FirebaseWeeklyGoal,
  FirebaseWeeklyPlan,
  GoalKind,
  GoalReminder,
} from '@/models/planner';

const REORDER_THRESHOLD = 42;
const LOCAL_STORAGE_KEY = 'weekly-planner-local-data-v1';
const IOS_APP_STORE_URL =
  'https://apps.apple.com/kr/app/weekly-goal-based-planner/id6764600765';

type LegacyGoalKind = 'flexible' | 'strong';

type StoredTimestamp = {
  seconds: number;
  nanoseconds: number;
};

type StoredWeeklyGoal = Omit<
  FirebaseWeeklyGoal,
  'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  createdAt: StoredTimestamp;
  updatedAt?: StoredTimestamp | null;
  deletedAt?: StoredTimestamp | null;
};

type StoredDailyGoal = Omit<
  FirebaseDailyGoal,
  'date' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  date: StoredTimestamp;
  createdAt: StoredTimestamp;
  updatedAt?: StoredTimestamp | null;
  deletedAt?: StoredTimestamp | null;
};

type StoredSomedayGoal = Omit<
  FirebaseSomedayGoal,
  'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  createdAt: StoredTimestamp;
  updatedAt?: StoredTimestamp | null;
  deletedAt?: StoredTimestamp | null;
};

type StoredWeeklyPlan = Omit<
  FirebaseWeeklyPlan,
  | 'weekStartDate'
  | 'weekEndDate'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'weeklyGoals'
  | 'dailyGoals'
> & {
  weekStartDate: StoredTimestamp;
  weekEndDate: StoredTimestamp;
  createdAt: StoredTimestamp;
  updatedAt?: StoredTimestamp | null;
  deletedAt?: StoredTimestamp | null;
  weeklyGoals: StoredWeeklyGoal[];
  dailyGoals: StoredDailyGoal[];
};

type StoredPlannerData = {
  weeklyPlans: StoredWeeklyPlan[];
  somedayGoals: StoredSomedayGoal[];
};

type GoalProgressStats = {
  completedCount: number;
  totalCount: number;
  progress: number;
};

type GoalProgressFilter = 'overall' | 'deletable' | 'nonDeletable';

function makeId() {
  return crypto.randomUUID();
}

function now() {
  return Timestamp.now();
}

function isPastDay(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate < today;
}

function goalKind(goal: { kind?: GoalKind | LegacyGoalKind }) {
  if (goal.kind === 'flexible') return 'deletable';
  if (goal.kind === 'strong') return 'nonDeletable';

  return goal.kind ?? 'deletable';
}

function sortGoalsByKindAndOrder<T extends { order: number }>(goals: T[]) {
  return [...goals].sort((a, b) => a.order - b.order);
}

function storeTimestamp(timestamp?: Timestamp | null): StoredTimestamp | null {
  if (!timestamp) return null;

  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds,
  };
}

function restoreTimestamp(
  timestamp?: StoredTimestamp | null,
): Timestamp | null {
  if (!timestamp) return null;

  return new Timestamp(timestamp.seconds, timestamp.nanoseconds);
}

function storePlannerData(
  weeklyPlans: FirebaseWeeklyPlan[],
  somedayGoals: FirebaseSomedayGoal[],
): StoredPlannerData {
  return {
    weeklyPlans: weeklyPlans.map((plan) => ({
      ...plan,
      weekStartDate: storeTimestamp(plan.weekStartDate)!,
      weekEndDate: storeTimestamp(plan.weekEndDate)!,
      createdAt: storeTimestamp(plan.createdAt)!,
      updatedAt: storeTimestamp(plan.updatedAt),
      deletedAt: storeTimestamp(plan.deletedAt),
      weeklyGoals: plan.weeklyGoals.map((goal) => ({
        ...goal,
        createdAt: storeTimestamp(goal.createdAt)!,
        updatedAt: storeTimestamp(goal.updatedAt),
        deletedAt: storeTimestamp(goal.deletedAt),
      })),
      dailyGoals: plan.dailyGoals.map((goal) => ({
        ...goal,
        date: storeTimestamp(goal.date)!,
        createdAt: storeTimestamp(goal.createdAt)!,
        updatedAt: storeTimestamp(goal.updatedAt),
        deletedAt: storeTimestamp(goal.deletedAt),
      })),
    })),
    somedayGoals: somedayGoals.map((goal) => ({
      ...goal,
      createdAt: storeTimestamp(goal.createdAt)!,
      updatedAt: storeTimestamp(goal.updatedAt),
      deletedAt: storeTimestamp(goal.deletedAt),
    })),
  };
}

function restorePlannerData(data: StoredPlannerData): {
  weeklyPlans: FirebaseWeeklyPlan[];
  somedayGoals: FirebaseSomedayGoal[];
} {
  return {
    weeklyPlans: (data.weeklyPlans ?? []).map((plan) => ({
      ...plan,
      weekStartDate: restoreTimestamp(plan.weekStartDate)!,
      weekEndDate: restoreTimestamp(plan.weekEndDate)!,
      createdAt: restoreTimestamp(plan.createdAt)!,
      updatedAt: restoreTimestamp(plan.updatedAt),
      deletedAt: restoreTimestamp(plan.deletedAt),
      weeklyGoals: (plan.weeklyGoals ?? []).map((goal) => ({
        ...goal,
        createdAt: restoreTimestamp(goal.createdAt)!,
        updatedAt: restoreTimestamp(goal.updatedAt),
        deletedAt: restoreTimestamp(goal.deletedAt),
      })),
      dailyGoals: (plan.dailyGoals ?? []).map((goal) => ({
        ...goal,
        date: restoreTimestamp(goal.date)!,
        createdAt: restoreTimestamp(goal.createdAt)!,
        updatedAt: restoreTimestamp(goal.updatedAt),
        deletedAt: restoreTimestamp(goal.deletedAt),
      })),
    })),
    somedayGoals: (data.somedayGoals ?? []).map((goal) => ({
      ...goal,
      createdAt: restoreTimestamp(goal.createdAt)!,
      updatedAt: restoreTimestamp(goal.updatedAt),
      deletedAt: restoreTimestamp(goal.deletedAt),
    })),
  };
}

function upsertPlan(
  plans: FirebaseWeeklyPlan[],
  updatedPlan: FirebaseWeeklyPlan,
) {
  const exists = plans.some((plan) => plan.id === updatedPlan.id);

  if (!exists) {
    return [...plans, updatedPlan];
  }

  return plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan));
}

export default function PlannerApp() {
  const auth = useAuth();
  const wasDesktopRef = useRef<boolean | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);

  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(
    startOfWeek(new Date()),
  );

  const [weeklyPlans, setWeeklyPlans] = useState<FirebaseWeeklyPlan[]>([]);
  const [somedayGoals, setSomedayGoals] = useState<FirebaseSomedayGoal[]>([]);

  const [newWeeklyGoalText, setNewWeeklyGoalText] = useState('');
  const [newSomedayGoalText, setNewSomedayGoalText] = useState('');
  const [newGoalTexts, setNewGoalTexts] = useState<Record<string, string>>({});

  const [goalToLock, setGoalToLock] = useState<FirebaseDailyGoal | null>(null);

  const [isSomedayExpanded, setIsSomedayExpanded] = useState(false);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(
    new Set([dayKey(new Date())]),
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAIAnalysisNotice, setShowAIAnalysisNotice] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (raw) {
      try {
        const restoredData = restorePlannerData(
          JSON.parse(raw) as StoredPlannerData,
        );

        setWeeklyPlans(restoredData.weeklyPlans);
        setSomedayGoals(restoredData.somedayGoals);
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }

    setHasLoadedLocalData(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    if (auth.isLoading) return;
    if (!auth.user) return;

    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(storePlannerData(weeklyPlans, somedayGoals)),
    );
  }, [
    hasLoadedLocalData,
    auth.isLoading,
    auth.user,
    weeklyPlans,
    somedayGoals,
  ]);

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.user) {
      setWeeklyPlans([]);
      setSomedayGoals([]);
      setLastSyncedAt(null);
      setSyncError(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    setSyncError(null);

    const unsubscribe = subscribePlannerData(
      auth.user.uid,
      (data) => {
        setWeeklyPlans(data.weeklyPlans);
        setSomedayGoals(data.somedayGoals);
        setLastSyncedAt(new Date());
      },
      (error) => {
        setSyncError(error.message);
      },
    );

    return () => unsubscribe();
  }, [auth.isLoading, auth.user?.uid]);

  const selectedWeekEndDate = useMemo(
    () => endOfWeek(selectedWeekStartDate),
    [selectedWeekStartDate],
  );

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addingDays(selectedWeekStartDate, i)),
    [selectedWeekStartDate],
  );

  const currentPlan = useMemo(() => {
    return (
      weeklyPlans.find(
        (plan) =>
          !plan.deletedAt &&
          isSameDay(plan.weekStartDate.toDate(), selectedWeekStartDate),
      ) ?? null
    );
  }, [weeklyPlans, selectedWeekStartDate]);

  const weeklyGoals = useMemo(() => {
    return sortGoalsByKindAndOrder(
      currentPlan?.weeklyGoals.filter((goal) => !goal.deletedAt) ?? [],
    );
  }, [currentPlan]);

  const allGoals = useMemo(() => {
    return currentPlan?.dailyGoals.filter((goal) => !goal.deletedAt) ?? [];
  }, [currentPlan]);

  const overallProgressStats = useMemo(
    () => progressStatsForGoals(allGoals),
    [allGoals],
  );

  const deletableProgressStats = useMemo(
    () =>
      progressStatsForGoals(
        allGoals.filter((goal) => goalKind(goal) === 'deletable'),
      ),
    [allGoals],
  );

  const nonDeletableProgressStats = useMemo(
    () =>
      progressStatsForGoals(
        allGoals.filter((goal) => goalKind(goal) === 'nonDeletable'),
      ),
    [allGoals],
  );

  const visibleSomedayGoals = useMemo(() => {
    return somedayGoals
      .filter((goal) => !goal.deletedAt)
      .sort((a, b) => a.order - b.order);
  }, [somedayGoals]);

  useEffect(() => {
    function syncExpandedDaysForScreenSize() {
      if (weekDates.some((date) => isSameDay(date, new Date()))) {
        setExpandedDayKeys(new Set([dayKey(new Date())]));
      } else {
        setExpandedDayKeys(new Set());
      }
    }

    syncExpandedDaysForScreenSize();

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    mediaQuery.addEventListener('change', syncExpandedDaysForScreenSize);

    return () => {
      mediaQuery.removeEventListener('change', syncExpandedDaysForScreenSize);
    };
  }, [weekDates]);

  function makeCurrentWeekPlan(): FirebaseWeeklyPlan {
    const createdAt = now();

    return {
      id: dayKey(selectedWeekStartDate),
      weekStartDate: Timestamp.fromDate(selectedWeekStartDate),
      weekEndDate: Timestamp.fromDate(selectedWeekEndDate),
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      weeklyGoals: [],
      dailyGoals: [],
    };
  }

  function makePlanForWeek(weekStartDate: Date): FirebaseWeeklyPlan {
    const createdAt = now();
    const weekEndDate = endOfWeek(weekStartDate);

    return {
      id: dayKey(weekStartDate),
      weekStartDate: Timestamp.fromDate(weekStartDate),
      weekEndDate: Timestamp.fromDate(weekEndDate),
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      weeklyGoals: [],
      dailyGoals: [],
    };
  }

  function savePlanChange(updatedPlan: FirebaseWeeklyPlan) {
    setWeeklyPlans((prev) => upsertPlan(prev, updatedPlan));
  }

  function saveSomedayGoalsChange(updatedGoals: FirebaseSomedayGoal[]) {
    setSomedayGoals(updatedGoals);
  }

  async function syncWeeklyGoalChange(
    updatedPlan: FirebaseWeeklyPlan,
    goal: FirebaseWeeklyGoal,
  ) {
    savePlanChange(updatedPlan);

    if (!auth.user) return;

    try {
      await saveWeeklyGoal(auth.user.uid, updatedPlan, goal);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync weekly goal.',
      );
    }
  }

  async function syncWeeklyGoalsChange(
    updatedPlan: FirebaseWeeklyPlan,
    goals: FirebaseWeeklyGoal[],
  ) {
    savePlanChange(updatedPlan);

    if (!auth.user) return;

    try {
      await saveWeeklyGoals(auth.user.uid, updatedPlan, goals);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync weekly goals.',
      );
    }
  }

  async function syncDailyGoalChange(
    updatedPlan: FirebaseWeeklyPlan,
    goal: FirebaseDailyGoal,
  ) {
    savePlanChange(updatedPlan);

    if (!auth.user) return;

    try {
      await saveDailyGoal(auth.user.uid, updatedPlan, goal);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync daily goal.',
      );
    }
  }

  async function syncDailyGoalsChange(
    updatedPlan: FirebaseWeeklyPlan,
    goals: FirebaseDailyGoal[],
  ) {
    savePlanChange(updatedPlan);

    if (!auth.user) return;

    try {
      await saveDailyGoals(auth.user.uid, updatedPlan, goals);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync daily goals.',
      );
    }
  }

  async function syncSomedayGoalChange(
    updatedGoals: FirebaseSomedayGoal[],
    goal: FirebaseSomedayGoal,
  ) {
    saveSomedayGoalsChange(updatedGoals);

    if (!auth.user) return;

    try {
      await saveSomedayGoal(auth.user.uid, goal);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync someday goal.',
      );
    }
  }

  async function syncSomedayGoalsChange(
    updatedGoals: FirebaseSomedayGoal[],
    changedGoals: FirebaseSomedayGoal[],
  ) {
    saveSomedayGoalsChange(updatedGoals);

    if (!auth.user) return;

    try {
      await saveSomedayGoals(auth.user.uid, changedGoals);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'Failed to sync someday goals.',
      );
    }
  }

  function syncExpandedDays(nextWeekStartDate: Date) {
    const dates = Array.from({ length: 7 }, (_, i) =>
      addingDays(nextWeekStartDate, i),
    );

    const isDesktop = window.matchMedia('(min-width: 1280px)').matches;

    if (isDesktop) {
      setExpandedDayKeys(new Set(dates.map(dayKey)));
      return;
    }

    if (dates.some((date) => isSameDay(date, new Date()))) {
      setExpandedDayKeys(new Set([dayKey(new Date())]));
    } else {
      setExpandedDayKeys(new Set());
    }
  }

  function moveToWeekContaining(date: Date) {
    const next = startOfWeek(date);

    setSelectedWeekStartDate(next);
    syncExpandedDays(next);
    setShowDatePicker(false);
  }

  function addSomedayGoal() {
    const text = newSomedayGoalText.trim();
    if (!text) return;

    const goal: FirebaseSomedayGoal = {
      id: makeId(),
      title: text,
      order: visibleSomedayGoals.length,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };

    setNewSomedayGoalText('');
    syncSomedayGoalChange([...somedayGoals, goal], goal);
  }

  function deleteSomedayGoal(goalId: string) {
    const target = somedayGoals.find((goal) => goal.id === goalId);
    if (!target) return;

    const deletedGoal = { ...target, deletedAt: now(), updatedAt: now() };
    const nextGoals = somedayGoals.map((goal) =>
      goal.id === goalId ? deletedGoal : goal,
    );

    syncSomedayGoalChange(nextGoals, deletedGoal);
  }

  function moveSomedayGoal(goalId: string, direction: number) {
    const goals = [...visibleSomedayGoals];
    const currentIndex = goals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= goals.length) return;

    goals.splice(newIndex, 0, goals.splice(currentIndex, 1)[0]);

    const reorderedGoals = goals.map((goal, index) => ({
      ...goal,
      order: index,
      updatedAt: now(),
    }));

    const nextGoals = somedayGoals.map(
      (goal) => reorderedGoals.find((g) => g.id === goal.id) ?? goal,
    );

    syncSomedayGoalsChange(nextGoals, reorderedGoals);
  }

  function addWeeklyGoal() {
    const text = newWeeklyGoalText.trim();
    if (!text) return;

    const plan = currentPlan ?? makeCurrentWeekPlan();
    const createdAt = now();

    const goal: FirebaseWeeklyGoal = {
      id: makeId(),
      title: text,
      time: null,
      reminder: 'none',
      order: weeklyGoals.length,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };

    const updatedPlan = {
      ...plan,
      updatedAt: now(),
      weeklyGoals: [...plan.weeklyGoals, goal],
    };

    setNewWeeklyGoalText('');
    syncWeeklyGoalChange(updatedPlan, goal);
  }

  function deleteWeeklyGoal(goalId: string) {
    if (!currentPlan) return;

    const deletedGoal = currentPlan.weeklyGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!deletedGoal) return;

    const updatedGoal = { ...deletedGoal, deletedAt: now(), updatedAt: now() };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      weeklyGoals: currentPlan.weeklyGoals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal,
      ),
    };

    syncWeeklyGoalChange(updatedPlan, updatedGoal);
  }

  function moveWeeklyGoal(goalId: string, direction: number) {
    if (!currentPlan) return;

    const goals = weeklyGoals;
    const currentIndex = goals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= goals.length) return;

    goals.splice(newIndex, 0, goals.splice(currentIndex, 1)[0]);

    const reorderedGoals = goals.map((goal, index) => ({
      ...goal,
      order: index,
      updatedAt: now(),
    }));

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      weeklyGoals: currentPlan.weeklyGoals.map(
        (goal) => reorderedGoals.find((g) => g.id === goal.id) ?? goal,
      ),
    };

    syncWeeklyGoalsChange(updatedPlan, reorderedGoals);
  }

  function goalsForDate(date: Date) {
    return allGoals
      .filter((goal) => isSameDay(goal.date.toDate(), date))
      .sort((a, b) => a.order - b.order);
  }

  function copyWeeklyGoalToDailyGoal(goal: FirebaseWeeklyGoal, dates: Date[]) {
    const plan = currentPlan ?? makeCurrentWeekPlan();
    const createdAt = now();

    const newGoals: FirebaseDailyGoal[] = dates.map((date) => ({
      id: makeId(),
      title: goal.title,
      date: Timestamp.fromDate(date),
      isCompleted: false,
      kind: 'deletable',
      time: null,
      reminder: 'none',
      order: goalsForDate(date).length,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    }));

    const updatedPlan = {
      ...plan,
      updatedAt: now(),
      dailyGoals: [...plan.dailyGoals, ...newGoals],
    };

    syncDailyGoalsChange(updatedPlan, newGoals);
  }

  function copyWeeklyGoalToNextWeek(goalToCopy: FirebaseWeeklyGoal) {
    const nextWeekStartDate = addingDays(selectedWeekStartDate, 7);

    const nextWeekPlan =
      weeklyPlans.find(
        (plan) =>
          !plan.deletedAt &&
          isSameDay(plan.weekStartDate.toDate(), nextWeekStartDate),
      ) ?? makePlanForWeek(nextWeekStartDate);

    const visibleNextWeekGoals = nextWeekPlan.weeklyGoals.filter(
      (goal) => !goal.deletedAt,
    );

    const goal: FirebaseWeeklyGoal = {
      id: makeId(),
      title: goalToCopy.title,
      time: null,
      reminder: 'none',
      order: visibleNextWeekGoals.length,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };

    const updatedPlan = {
      ...nextWeekPlan,
      updatedAt: now(),
      weeklyGoals: [...nextWeekPlan.weeklyGoals, goal],
    };

    syncWeeklyGoalChange(updatedPlan, goal);
  }

  function addDailyGoal(date: Date) {
    const key = dayKey(date);
    const text = (newGoalTexts[key] ?? '').trim();
    if (!text) return;

    const plan = currentPlan ?? makeCurrentWeekPlan();
    const createdAt = now();

    const goal: FirebaseDailyGoal = {
      id: makeId(),
      title: text,
      date: Timestamp.fromDate(date),
      isCompleted: false,
      kind: 'deletable',
      time: null,
      reminder: 'none',
      order: goalsForDate(date).length,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };

    const updatedPlan = {
      ...plan,
      updatedAt: now(),
      dailyGoals: [...plan.dailyGoals, goal],
    };

    setNewGoalTexts((prev) => ({ ...prev, [key]: '' }));
    syncDailyGoalChange(updatedPlan, goal);
  }

  function toggleDailyGoal(goalId: string) {
    if (!currentPlan) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!targetGoal) return;
    if (isPastDay(targetGoal.date.toDate())) return;

    const updatedGoal = {
      ...targetGoal,
      isCompleted: !targetGoal.isCompleted,
      updatedAt: now(),
    };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal,
      ),
    };

    syncDailyGoalChange(updatedPlan, updatedGoal);
  }

  function deleteDailyGoal(goalId: string) {
    if (!currentPlan) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!targetGoal) return;

    const deletedGoal = { ...targetGoal, deletedAt: now(), updatedAt: now() };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === goalId ? deletedGoal : goal,
      ),
    };

    syncDailyGoalChange(updatedPlan, deletedGoal);
  }

  function lockDailyGoal(goalId: string) {
    if (!currentPlan) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!targetGoal) return;
    if (goalKind(targetGoal) === 'nonDeletable') return;

    setGoalToLock(targetGoal);
  }

  function confirmLockDailyGoal() {
    if (!currentPlan || !goalToLock) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalToLock.id,
    );
    if (!targetGoal) {
      setGoalToLock(null);
      return;
    }

    if (goalKind(targetGoal) === 'nonDeletable') {
      setGoalToLock(null);
      return;
    }

    const updatedGoal: FirebaseDailyGoal = {
      ...targetGoal,
      kind: 'nonDeletable',
      updatedAt: now(),
    };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === targetGoal.id ? updatedGoal : goal,
      ),
    };

    setGoalToLock(null);
    syncDailyGoalChange(updatedPlan, updatedGoal);
  }

  function updateDailyGoalTimeAndReminder(
    goalId: string,
    time: string | null,
    reminder: GoalReminder,
  ) {
    if (!currentPlan) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalId,
    );
    if (!targetGoal) return;

    const updatedGoal = {
      ...targetGoal,
      time,
      reminder: time ? reminder : 'none',
      updatedAt: now(),
    };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal,
      ),
    };

    syncDailyGoalChange(updatedPlan, updatedGoal);
  }

  function moveDailyGoal(goalId: string, date: Date, direction: number) {
    if (!currentPlan) return;

    const goals = goalsForDate(date);
    const currentIndex = goals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= goals.length) return;

    goals.splice(newIndex, 0, goals.splice(currentIndex, 1)[0]);

    const reorderedGoals = goals.map((goal, index) => ({
      ...goal,
      order: index,
      updatedAt: now(),
    }));

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map(
        (goal) => reorderedGoals.find((g) => g.id === goal.id) ?? goal,
      ),
    };

    syncDailyGoalsChange(updatedPlan, reorderedGoals);
  }

  function toggleDay(date: Date) {
    const key = dayKey(date);

    setExpandedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <main className='min-h-screen bg-[#f2f2f7] text-black'>
      <PlannerResponsiveLayout
        weekDates={weekDates}
        globalSidebar={
          <>
            <MobileAppCard />

            <Card>
              <div className='flex items-center justify-between gap-4'>
                <div className='min-w-0'>
                  <h2 className='text-[17px] font-semibold'>
                    {auth.isLoggedIn ? 'Cloud connected' : 'Not synced'}
                  </h2>

                  <p className='mt-0.5 truncate text-[12px] text-gray-500'>
                    {auth.user?.email ?? 'Log in to sync across devices'}
                  </p>
                </div>

                <button
                  onClick={() => setShowAuthModal(true)}
                  className='flex items-center gap-1.5 text-[15px] font-semibold text-blue-500'
                >
                  <CloudIcon
                    size={18}
                    fill={auth.isLoggedIn ? 'currentColor' : 'none'}
                  />
                  {auth.isLoggedIn ? 'Sync' : 'Login'}
                </button>
              </div>
            </Card>

            <ExpandableCard
              title='Someday Goals'
              subtitle={`${visibleSomedayGoals.length} goals`}
              expanded={isSomedayExpanded}
              onToggle={() => setIsSomedayExpanded((prev) => !prev)}
            >
              {visibleSomedayGoals.length === 0 && (
                <EmptyText>Add someday goals</EmptyText>
              )}

              {visibleSomedayGoals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  title={goal.title}
                  onMove={(direction) => moveSomedayGoal(goal.id, direction)}
                  onDelete={() => deleteSomedayGoal(goal.id)}
                />
              ))}

              <AddInput
                value={newSomedayGoalText}
                onChange={setNewSomedayGoalText}
                placeholder='+ Add someday goal'
                onSubmit={addSomedayGoal}
              />
            </ExpandableCard>
          </>
        }
        weekSidebar={
          <>
            <WeekProgressCard
              selectedWeekStartDate={selectedWeekStartDate}
              selectedWeekEndDate={selectedWeekEndDate}
              weekDates={weekDates}
              overallProgressStats={overallProgressStats}
              deletableProgressStats={deletableProgressStats}
              nonDeletableProgressStats={nonDeletableProgressStats}
              goalsForDate={goalsForDate}
              showDatePicker={showDatePicker}
              onToggleDatePicker={() => setShowDatePicker((prev) => !prev)}
              onPickDate={moveToWeekContaining}
              onShowAIAnalysisNotice={() => setShowAIAnalysisNotice(true)}
            />

            <ExpandableCard
              title='Weekly Goals'
              subtitle={`${weeklyGoals.length} goals`}
              expanded={isWeeklyExpanded}
              onToggle={() => setIsWeeklyExpanded((prev) => !prev)}
            >
              {weeklyGoals.length === 0 && (
                <EmptyText>Add goals for this week</EmptyText>
              )}

              {weeklyGoals.map((goal, index) => (
                <div key={goal.id}>
                  {shouldShowGoalDivider(weeklyGoals, index) && <GoalDivider />}
                  <GoalRow
                    title={goal.title}
                    showCopy
                    weekDates={weekDates}
                    onCopyToDays={(dates) =>
                      copyWeeklyGoalToDailyGoal(goal, dates)
                    }
                    onCopyToAllDays={() =>
                      copyWeeklyGoalToDailyGoal(goal, weekDates)
                    }
                    onCopyToNextWeek={() => copyWeeklyGoalToNextWeek(goal)}
                    onMove={(direction) => moveWeeklyGoal(goal.id, direction)}
                    onDelete={() => deleteWeeklyGoal(goal.id)}
                  />
                </div>
              ))}

              <AddInput
                value={newWeeklyGoalText}
                onChange={setNewWeeklyGoalText}
                placeholder='+ Add weekly goal'
                onSubmit={addWeeklyGoal}
              />
            </ExpandableCard>
          </>
        }
        renderDay={(date) => {
          const key = dayKey(date);
          const goals = goalsForDate(date);
          const isExpanded = expandedDayKeys.has(key);
          const done = goals.filter((goal) => goal.isCompleted).length;

          return (
            <Card>
              <div className='flex w-full items-center justify-between'>
                <div className='text-left'>
                  <h2 className='text-[17px] font-semibold'>
                    {englishWeekdayText(date)}
                  </h2>
                  <p className='mt-1 text-[12px] text-gray-500'>
                    {monthDayText(date)}
                  </p>
                </div>

                <div className='flex items-center gap-3'>
                  <p className='text-[15px] font-semibold text-gray-500'>
                    {done}/{goals.length}
                  </p>

                  <button
                    type='button'
                    onClick={() => toggleDay(date)}
                    className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
                    aria-label={isExpanded ? 'Collapse day' : 'Expand day'}
                  >
                    {isExpanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className='mt-4 space-y-1.5'>
                  {goals.length === 0 && (
                    <EmptyText>Add goals for this day</EmptyText>
                  )}

                  {goals.map((goal, index) => (
                    <div key={goal.id}>
                      {shouldShowDailyGoalDivider(goals, index) && (
                        <GoalDivider />
                      )}
                      <DailyGoalRow
                        goal={goal}
                        canMove={true}
                        canToggle={!isPastDay(goal.date.toDate())}
                        onToggle={() => toggleDailyGoal(goal.id)}
                        onMove={(direction) =>
                          moveDailyGoal(goal.id, date, direction)
                        }
                        onUpdateTimeReminder={(time, reminder) =>
                          updateDailyGoalTimeAndReminder(
                            goal.id,
                            time,
                            reminder,
                          )
                        }
                        onLock={() => lockDailyGoal(goal.id)}
                        onDelete={() => deleteDailyGoal(goal.id)}
                      />
                    </div>
                  ))}

                  <AddInput
                    value={newGoalTexts[key] ?? ''}
                    onChange={(value) =>
                      setNewGoalTexts((prev) => ({ ...prev, [key]: value }))
                    }
                    placeholder={`+ Add ${englishWeekdayText(date)} goal`}
                    onSubmit={() => addDailyGoal(date)}
                  />
                </div>
              )}
            </Card>
          );
        }}
      />

      {goalToLock && (
        <LockGoalModal
          onCancel={() => setGoalToLock(null)}
          onConfirm={confirmLockDailyGoal}
        />
      )}

      {showAIAnalysisNotice && (
        <NoticeModal
          title='AI Analysis'
          message='Your AI weekly analysis report is coming soon.'
          onClose={() => setShowAIAnalysisNotice(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          auth={auth}
          syncError={syncError}
          lastSyncedAt={lastSyncedAt}
          onDeleteLocalData={() => {
            setWeeklyPlans([]);
            setSomedayGoals([]);
            setLastSyncedAt(null);
            setSyncError(null);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className='rounded-[24px] bg-white p-5'>{children}</section>;
}

function WeekProgressCard({
  selectedWeekStartDate,
  selectedWeekEndDate,
  weekDates,
  overallProgressStats,
  deletableProgressStats,
  nonDeletableProgressStats,
  goalsForDate,
  showDatePicker,
  onToggleDatePicker,
  onPickDate,
  onShowAIAnalysisNotice,
}: {
  selectedWeekStartDate: Date;
  selectedWeekEndDate: Date;
  weekDates: Date[];
  overallProgressStats: GoalProgressStats;
  deletableProgressStats: GoalProgressStats;
  nonDeletableProgressStats: GoalProgressStats;
  goalsForDate: (date: Date) => FirebaseDailyGoal[];
  showDatePicker: boolean;
  onToggleDatePicker: () => void;
  onPickDate: (date: Date) => void;
  onShowAIAnalysisNotice: () => void;
}) {
  const [progressFilter, setProgressFilter] =
    useState<GoalProgressFilter>('overall');

  const selectedProgressStats =
    progressFilter === 'deletable'
      ? deletableProgressStats
      : progressFilter === 'nonDeletable'
        ? nonDeletableProgressStats
        : overallProgressStats;

  const progressTitle =
    progressFilter === 'deletable'
      ? 'Flexible Goals'
      : progressFilter === 'nonDeletable'
        ? 'Locked Goals'
        : 'Overall Progress';

  return (
    <Card>
      <div className='flex items-center justify-between gap-3'>
        <div className='relative'>
          <button
            onClick={onToggleDatePicker}
            className='flex items-center gap-1.5 text-[17px] font-semibold text-black'
          >
            <span>
              {monthDayText(selectedWeekStartDate)} -{' '}
              {monthDayText(selectedWeekEndDate)}
            </span>

            <ChevronDown size={15} strokeWidth={3} className='text-gray-500' />
          </button>

          {showDatePicker && (
            <CalendarPopover
              selectedDate={selectedWeekStartDate}
              onPickDate={onPickDate}
              onClose={onToggleDatePicker}
            />
          )}
        </div>

        <button
          onClick={onShowAIAnalysisNotice}
          className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500'
          aria-label='AI Analysis'
        >
          <MoreHorizontal size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className='mt-5 flex items-center justify-between gap-4'>
        <div className='min-w-0'>
          <div className='relative inline-flex items-center'>
            <h2 className='pr-7 text-[17px] font-semibold'>{progressTitle}</h2>

            <select
              value={progressFilter}
              onChange={(event) =>
                setProgressFilter(event.target.value as GoalProgressFilter)
              }
              className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
              aria-label='Progress type'
            >
              <option value='overall'>Overall Progress</option>
              <option value='deletable'>Flexible Goals</option>
              <option value='nonDeletable'>Locked Goals</option>
            </select>

            <ChevronDown
              size={16}
              strokeWidth={3}
              className='pointer-events-none absolute right-0 text-gray-500'
            />
          </div>

          <p className='mt-1 text-[12px] text-gray-500'>
            {selectedProgressStats.completedCount} /{' '}
            {selectedProgressStats.totalCount} completed
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <p className='text-[34px] font-bold leading-none text-blue-500'>
            {Math.round(selectedProgressStats.progress * 100)}%
          </p>

          <CircularProgressRing progress={selectedProgressStats.progress} />
        </div>
      </div>

      <WeeklyProgressBars
        weekDates={weekDates}
        goalsForDate={goalsForDate}
        progressFilter={progressFilter}
      />
    </Card>
  );
}

function CalendarPopover({
  selectedDate,
  onPickDate,
  onClose,
}: {
  selectedDate: Date;
  onPickDate: (date: Date) => void;
  onClose: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const monthStart = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );

  const startOffset = (monthStart.getDay() + 6) % 7;
  const calendarStart = addingDays(monthStart, -startOffset);

  const dates = Array.from({ length: 42 }, (_, index) =>
    addingDays(calendarStart, index),
  );

  function moveMonth(direction: number) {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + direction,
        1,
      ),
    );
  }

  return (
    <>
      <button
        type='button'
        aria-label='Close calendar'
        onClick={onClose}
        className='fixed inset-0 z-40 cursor-default'
      />

      <div className='absolute left-0 top-8 z-50 w-[300px] overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl'>
        <div className='flex items-center justify-between px-1 pb-3'>
          <button
            type='button'
            onClick={() => moveMonth(-1)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label='Previous month'
          >
            <ChevronUp size={18} className='-rotate-90' />
          </button>

          <p className='text-[17px] font-semibold text-black'>
            {visibleMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <button
            type='button'
            onClick={() => moveMonth(1)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label='Next month'
          >
            <ChevronUp size={18} className='rotate-90' />
          </button>
        </div>

        <div className='grid grid-cols-7 pb-1 text-center'>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <p
              key={`${day}-${index}`}
              className='py-1 text-[12px] font-semibold text-gray-400'
            >
              {day}
            </p>
          ))}
        </div>

        <div className='grid grid-cols-7 gap-1'>
          {dates.map((date) => {
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
            const isSelectedDate = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={dayKey(date)}
                type='button'
                onClick={() => onPickDate(date)}
                className={`flex h-9 items-center justify-center rounded-full text-[14px] font-semibold active:scale-95 ${
                  isSelectedDate
                    ? 'bg-blue-500 text-white'
                    : isToday
                      ? 'bg-blue-50 text-blue-500'
                      : isCurrentMonth
                        ? 'text-black active:bg-gray-100'
                        : 'text-gray-300 active:bg-gray-100'
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className='mt-3 flex justify-end border-t border-gray-100 pt-3'>
          <button
            type='button'
            onClick={() => onPickDate(new Date())}
            className='rounded-full bg-blue-50 px-4 py-2 text-[15px] font-semibold text-blue-500 active:scale-[0.98]'
          >
            Today
          </button>
        </div>
      </div>
    </>
  );
}

function CircularProgressRing({ progress }: { progress: number }) {
  const radius = 22;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <svg width='52' height='52' viewBox='0 0 52 52'>
      <circle
        cx='26'
        cy='26'
        r={radius}
        fill='none'
        stroke='rgb(219 234 254)'
        strokeWidth={strokeWidth}
      />

      <circle
        cx='26'
        cy='26'
        r={radius}
        fill='none'
        stroke='rgb(59 130 246)'
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clampedProgress)}
        transform='rotate(-90 26 26)'
        className='transition-all duration-300'
      />
    </svg>
  );
}

function WeeklyProgressBars({
  weekDates,
  goalsForDate,
  progressFilter,
}: {
  weekDates: Date[];
  goalsForDate: (date: Date) => FirebaseDailyGoal[];
  progressFilter: GoalProgressFilter;
}) {
  function filteredGoalsForDate(date: Date) {
    const goals = goalsForDate(date);

    if (progressFilter === 'deletable') {
      return goals.filter((goal) => goalKind(goal) === 'deletable');
    }

    if (progressFilter === 'nonDeletable') {
      return goals.filter((goal) => goalKind(goal) === 'nonDeletable');
    }

    return goals;
  }

  const maxGoalCount = Math.max(
    ...weekDates.map((date) => filteredGoalsForDate(date).length),
    1,
  );

  const maxBarHeight = 82;
  const minBarHeight = 28;

  return (
    <div className='mt-5 flex items-end'>
      {weekDates.map((date) => {
        const goals = filteredGoalsForDate(date);
        const total = goals.length;
        const completed = goals.filter((goal) => goal.isCompleted).length;

        const backgroundHeight =
          total === 0
            ? 0
            : Math.max(minBarHeight, (total / maxGoalCount) * maxBarHeight);

        const completedHeight =
          total === 0 ? 0 : backgroundHeight * (completed / total);

        return (
          <div
            key={dayKey(date)}
            className='flex flex-1 flex-col items-center gap-2'
          >
            <div
              className='flex items-end justify-center'
              style={{ height: maxBarHeight }}
            >
              {total > 0 && (
                <div
                  className='relative w-[14px] overflow-hidden rounded-full bg-blue-100'
                  style={{ height: backgroundHeight }}
                >
                  {completed > 0 && (
                    <div
                      className='absolute bottom-0 left-0 w-full rounded-full bg-blue-500 transition-all'
                      style={{ height: Math.max(8, completedHeight) }}
                    />
                  )}
                </div>
              )}
            </div>

            <p className='text-[12px] text-gray-500'>{weekdayShort(date)}</p>
          </div>
        );
      })}
    </div>
  );
}

function LockGoalModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 p-4'
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-md rounded-[24px] bg-white p-6'
      >
        <div className='space-y-5 text-center'>
          <div>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500'>
              <Lock size={22} />
            </div>

            <h2 className='mt-4 text-[22px] font-bold'>Lock this goal?</h2>

            <p className='mt-3 text-[15px] leading-6 text-gray-500'>
              Locked goals cannot be deleted.
              <br />
              Use this after you&apos;ve finished planning.
              <br />
              Locked goals can help you stay committed and follow through.
            </p>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              onClick={onCancel}
              className='rounded-[16px] bg-[#f2f2f7] p-4 font-semibold text-gray-600 active:scale-[0.98]'
            >
              Cancel
            </button>

            <button
              type='button'
              onClick={onConfirm}
              className='rounded-[16px] bg-blue-500 p-4 font-semibold text-white active:scale-[0.98]'
            >
              Lock Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6'
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-sm rounded-[24px] bg-white p-6 text-center'
      >
        <h2 className='text-[18px] font-bold'>{title}</h2>

        <p className='mt-3 text-[15px] text-gray-500'>{message}</p>

        <button
          onClick={onClose}
          className='mt-5 rounded-[16px] bg-blue-500 px-6 py-3 font-semibold text-white'
        >
          OK
        </button>
      </div>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

function MobileAppCard() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [showInstallNotice, setShowInstallNotice] = useState(false);

  const isStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches;

  const isMobile =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  async function installApp() {
    if (!isMobile || isStandalone) return;

    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      return;
    }

    if (isIOS) {
      setShowInstallNotice(true);
    }
  }

  return (
    <>
      <button
        type='button'
        onClick={installApp}
        disabled={!isMobile || isStandalone}
        className={`flex items-center gap-2 text-[17px] font-semibold ${
          !isMobile || isStandalone
            ? 'cursor-default text-gray-400'
            : 'text-black active:scale-[0.98]'
        }`}
      >
        <Smartphone size={19} strokeWidth={2.2} className='w-5' />
        Install App
      </button>

      {showInstallNotice && (
        <NoticeModal
          title='Add to Home Screen'
          message='Open this page in Safari, tap the Share button, then choose Add to Home Screen.'
          onClose={() => setShowInstallNotice(false)}
        />
      )}
    </>
  );
}

function ExpandableCard({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className='flex w-full items-center justify-between'>
        <div className='text-left'>
          <h2 className='text-[17px] font-semibold'>{title}</h2>
          <p className='mt-1 text-[12px] text-gray-500'>{subtitle}</p>
        </div>

        <button
          type='button'
          onClick={onToggle}
          className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
          aria-label={expanded ? 'Collapse section' : 'Expand section'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && <div className='mt-4 space-y-1.5'>{children}</div>}
    </Card>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className='py-2 text-[15px] text-gray-500'>{children}</p>;
}

function AddInput({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit: () => void;
}) {
  return (
    <div className='flex items-center gap-2 rounded-[14px] bg-[#f2f2f7] px-3.5 py-3'>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') onSubmit();
        }}
        placeholder={placeholder}
        className='min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-500'
      />

      <button onClick={onSubmit} className='text-blue-500'>
        <span className='flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-500 text-white'>
          <Plus size={15} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

function DragHandle({ onMove }: { onMove: (direction: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const lastY = useRef(0);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    lastY.current = event.clientY;
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isDragging) return;

    const delta = event.clientY - lastY.current;

    if (delta > REORDER_THRESHOLD) {
      onMove(1);
      lastY.current = event.clientY;
    }

    if (delta < -REORDER_THRESHOLD) {
      onMove(-1);
      lastY.current = event.clientY;
    }
  }

  function stopDragging() {
    setIsDragging(false);
  }

  return (
    <button
      type='button'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className={`flex h-8 w-8 touch-none cursor-grab items-center justify-center rounded-full transition-transform ${
        isDragging ? 'scale-110' : ''
      }`}
      aria-label='Drag to reorder'
    >
      <span className='flex flex-col items-center justify-center gap-[3px]'>
        <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
        <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
        <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
      </span>
    </button>
  );
}

function progressStatsForGoals(goals: FirebaseDailyGoal[]): GoalProgressStats {
  const completedCount = goals.filter((goal) => goal.isCompleted).length;
  const totalCount = goals.length;

  return {
    completedCount,
    totalCount,
    progress: totalCount === 0 ? 0 : completedCount / totalCount,
  };
}

function shouldShowGoalDivider<T>(_goals: T[], _index: number) {
  return false;
}

function shouldShowDailyGoalDivider<T>(_goals: T[], _index: number) {
  return false;
}

function GoalDivider() {
  return <div className='my-2 h-px bg-gray-100' aria-hidden='true' />;
}

function goalTitleClassName(isCompleted = false, isDisabled = false) {
  if (isCompleted) return 'text-gray-400 line-through';
  if (isDisabled) return 'text-gray-400';
  return 'text-black';
}

function GoalRow({
  title,
  showCopy = false,
  weekDates = [],
  onCopyToDays,
  onCopyToAllDays,
  onCopyToNextWeek,
  onMove,
  onDelete,
}: {
  title: string;
  showCopy?: boolean;
  weekDates?: Date[];
  onCopyToDays?: (dates: Date[]) => void;
  onCopyToAllDays?: () => void;
  onCopyToNextWeek?: () => void;
  onMove: (direction: number) => void;
  onDelete: () => void;
}) {
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [selectedCopyDayKeys, setSelectedCopyDayKeys] = useState<Set<string>>(
    new Set(),
  );

  function closeCopyMenu() {
    setSelectedCopyDayKeys(new Set());
    setIsCopyMenuOpen(false);
  }

  function handleCopy(action: () => void) {
    action();
    closeCopyMenu();
  }

  function toggleCopyDate(date: Date) {
    const key = dayKey(date);

    setSelectedCopyDayKeys((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function confirmCopyToSelectedDays() {
    if (!onCopyToDays || selectedCopyDayKeys.size === 0) return;

    const selectedDates = weekDates.filter((date) =>
      selectedCopyDayKeys.has(dayKey(date)),
    );

    onCopyToDays(selectedDates);
    closeCopyMenu();
  }

  const copyMenu =
    typeof document !== 'undefined'
      ? createPortal(
          <div className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 p-4'>
            <button
              type='button'
              aria-label='Close copy menu'
              onClick={closeCopyMenu}
              className='absolute inset-0 z-0 cursor-default'
            />

            <div className='relative z-10 w-full max-w-md animate-in slide-in-from-bottom-3 duration-200 rounded-[24px] bg-white p-6'>
              <div className='space-y-4'>
                <div className='text-center'>
                  <h2 className='text-[22px] font-bold'>Copy Weekly Goal</h2>
                  <p className='mt-2 text-[14px] text-gray-500'>
                    Choose where to copy this weekly goal.
                  </p>
                </div>

                <div className='space-y-3'>
                  <div className='grid grid-cols-2 gap-2'>
                    {weekDates.map((date) => {
                      const selected = selectedCopyDayKeys.has(dayKey(date));

                      return (
                        <button
                          key={dayKey(date)}
                          type='button'
                          onClick={() => toggleCopyDate(date)}
                          className={`rounded-[16px] px-4 py-3 text-left active:scale-[0.98] ${
                            selected
                              ? 'bg-blue-500 text-white'
                              : 'bg-[#f2f2f7] text-black'
                          }`}
                        >
                          <p className='text-[15px] font-semibold'>
                            {englishWeekdayText(date)}
                          </p>
                          <p
                            className={`mt-0.5 text-[12px] ${
                              selected ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {monthDayText(date)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <button
                    type='button'
                    onClick={() =>
                      onCopyToAllDays && handleCopy(onCopyToAllDays)
                    }
                    className='rounded-[16px] bg-blue-50 p-4 text-left text-blue-500 active:scale-[0.99]'
                  >
                    <span className='block font-semibold'>
                      Copy to all days
                    </span>
                  </button>

                  <button
                    type='button'
                    onClick={confirmCopyToSelectedDays}
                    disabled={selectedCopyDayKeys.size === 0}
                    className={`rounded-[16px] p-4 text-left active:scale-[0.99] ${
                      selectedCopyDayKeys.size === 0
                        ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    <span className='block font-semibold'>
                      Copy to {selectedCopyDayKeys.size} day
                      {selectedCopyDayKeys.size === 1 ? '' : 's'}
                    </span>
                  </button>
                </div>

                <button
                  type='button'
                  onClick={() =>
                    onCopyToNextWeek && handleCopy(onCopyToNextWeek)
                  }
                  className='flex w-full items-center justify-between rounded-[16px] bg-blue-50 p-4 text-left active:scale-[0.99]'
                >
                  <span className='font-semibold text-blue-500'>
                    Copy to next week
                  </span>
                  <span className='text-[13px] font-semibold text-blue-300'>
                    Weekly Goal
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
      <p
        className={`min-w-0 flex-1 text-[16px] font-normal ${goalTitleClassName()}`}
      >
        {title}
      </p>

      {showCopy && (
        <>
          <button
            type='button'
            onClick={() => setIsCopyMenuOpen(true)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label='Copy goal'
          >
            <Copy size={17} />
          </button>

          {isCopyMenuOpen && copyMenu}
        </>
      )}

      <DragHandle onMove={onMove} />

      <button onClick={onDelete} className='p-1 text-red-500'>
        <Trash size={18} />
      </button>
    </div>
  );
}

function DailyGoalRow({
  goal,
  canMove,
  canToggle,
  onToggle,
  onMove,
  onUpdateTimeReminder,
  onLock,
  onDelete,
}: {
  goal: FirebaseDailyGoal;
  canMove: boolean;
  canToggle: boolean;
  onToggle: () => void;
  onMove: (direction: number) => void;
  onUpdateTimeReminder: (time: string | null, reminder: GoalReminder) => void;
  onLock: () => void;
  onDelete: () => void;
}) {
  const [showTimeModal, setShowTimeModal] = useState(false);

  return (
    <>
      <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
        <button
          type='button'
          onClick={onToggle}
          disabled={!canToggle}
          className={`text-blue-500 ${
            !canToggle ? 'cursor-not-allowed opacity-40' : ''
          }`}
          aria-label={
            canToggle ? 'Toggle goal' : 'Past goals cannot be checked'
          }
        >
          {goal.isCompleted ? (
            <span className='flex h-[23px] w-[23px] items-center justify-center rounded-full bg-blue-500 text-white'>
              <Check size={15} strokeWidth={3} />
            </span>
          ) : (
            <Circle size={23} className='text-gray-400' />
          )}
        </button>

        <p
          className={`min-w-0 flex-1 text-[16px] font-normal ${goalTitleClassName(
            goal.isCompleted,
            !canToggle,
          )}`}
        >
          {goal.time && (
            <span className='mr-1.5 tabular-nums'>{goal.time}</span>
          )}
          {goal.title}
        </p>

        <button
          type='button'
          onClick={onLock}
          disabled={goalKind(goal) === 'nonDeletable'}
          className={`flex h-8 w-8 items-center justify-center rounded-full active:bg-gray-100 ${
            goalKind(goal) === 'nonDeletable'
              ? 'cursor-not-allowed text-blue-500'
              : 'text-gray-400'
          }`}
          aria-label={
            goalKind(goal) === 'nonDeletable' ? 'Goal is locked' : 'Lock goal'
          }
        >
          {goalKind(goal) === 'nonDeletable' ? (
            <Lock size={17} />
          ) : (
            <LockOpen size={17} />
          )}
        </button>

        <button
          type='button'
          onClick={() => setShowTimeModal(true)}
          className={`flex h-8 w-8 items-center justify-center rounded-full active:bg-gray-100 ${
            goal.time ? 'text-blue-500' : 'text-gray-400'
          }`}
          aria-label={goal.time ? 'Time is set' : 'Set time and reminder'}
        >
          <Clock size={17} />
        </button>

        {canMove ? (
          <DragHandle onMove={onMove} />
        ) : (
          <button
            type='button'
            disabled
            className='flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full opacity-30'
            aria-label='Timed goals are sorted by time'
          >
            <span className='flex flex-col items-center justify-center gap-[3px]'>
              <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
              <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
              <span className='h-[1.5px] w-[17px] rounded-full bg-gray-400' />
            </span>
          </button>
        )}

        {goalKind(goal) === 'nonDeletable' ? (
          <button
            type='button'
            disabled
            className='cursor-not-allowed p-1 text-gray-300'
            aria-label='Non-deletable goals cannot be deleted'
          >
            <Trash size={18} />
          </button>
        ) : (
          <button onClick={onDelete} className='p-1 text-red-500'>
            <Trash size={18} />
          </button>
        )}
      </div>

      {showTimeModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <TimeReminderModal
            initialTime={goal.time ?? null}
            initialReminder={goal.reminder ?? 'none'}
            onClose={() => setShowTimeModal(false)}
            onConfirm={(time, reminder) => {
              onUpdateTimeReminder(time, reminder);
              setShowTimeModal(false);
            }}
          />,
          document.body,
        )}
    </>
  );
}

function TimeReminderModal({
  initialTime,
  initialReminder,
  onClose,
  onConfirm,
}: {
  initialTime: string | null;
  initialReminder: GoalReminder;
  onClose: () => void;
  onConfirm: (time: string | null, reminder: GoalReminder) => void;
}) {
  const [selectedHour, setSelectedHour] = useState<string | null>(
    initialTime?.split(':')[0] ?? null,
  );
  const [selectedMinute, setSelectedMinute] = useState<string | null>(
    initialTime?.split(':')[1] ?? null,
  );
  const [reminder, setReminder] = useState<GoalReminder>(initialReminder);

  const selectedTime =
    selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : null;

  useEffect(() => {
    if (!selectedTime) {
      setReminder('none');
    }
  }, [selectedTime]);

  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 p-4'
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-md rounded-[24px] bg-white p-6'
      >
        <div className='space-y-4'>
          <h2 className='text-center text-[22px] font-bold'>Time & Reminder</h2>

          <p className='text-center text-[14px] text-gray-500'>
            Set a time and reminder for this daily goal.
          </p>

          <div className='grid grid-cols-2 gap-2'>
            <div className='relative'>
              <select
                value={selectedHour ?? ''}
                onChange={(event) =>
                  setSelectedHour(event.target.value || null)
                }
                className='w-full appearance-none rounded-[14px] bg-[#f2f2f7] py-4 pl-4 pr-10 text-[16px] font-semibold outline-none'
              >
                <option value=''>Hour</option>
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = `${hour}`.padStart(2, '0');

                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>

              <ChevronDown
                size={16}
                strokeWidth={3}
                className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400'
              />
            </div>

            <div className='relative'>
              <select
                value={selectedMinute ?? ''}
                onChange={(event) =>
                  setSelectedMinute(event.target.value || null)
                }
                className='w-full appearance-none rounded-[14px] bg-[#f2f2f7] py-4 pl-4 pr-10 text-[16px] font-semibold outline-none'
              >
                <option value=''>Minute</option>
                {Array.from({ length: 60 }, (_, minute) => {
                  const value = `${minute}`.padStart(2, '0');

                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>

              <ChevronDown
                size={16}
                strokeWidth={3}
                className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400'
              />
            </div>
          </div>

          <div className='relative'>
            <select
              value={reminder}
              disabled={!selectedTime}
              onChange={(event) =>
                setReminder(event.target.value as GoalReminder)
              }
              className={`w-full appearance-none rounded-[14px] bg-[#f2f2f7] py-4 pl-4 pr-10 text-[16px] outline-none ${
                !selectedTime ? 'cursor-not-allowed text-gray-300' : ''
              }`}
            >
              <option value='none'>No reminder</option>
              <option value='atTime'>At event time</option>
              <option value='5m'>5 minutes before</option>
              <option value='10m'>10 minutes before</option>
              <option value='15m'>15 minutes before</option>
              <option value='30m'>30 minutes before</option>
              <option value='1h'>1 hour before</option>
              <option value='1d'>1 day before</option>
            </select>

            <ChevronDown
              size={16}
              strokeWidth={3}
              className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 ${
                !selectedTime ? 'text-gray-300' : 'text-gray-400'
              }`}
            />
          </div>

          <p className='text-center text-[13px] text-gray-400'>
            {selectedTime ? `${selectedTime} selected` : 'No time selected'}
          </p>

          <button
            onClick={() =>
              onConfirm(selectedTime, selectedTime ? reminder : 'none')
            }
            className='w-full rounded-[16px] bg-blue-500 p-4 font-semibold text-white'
          >
            Save
          </button>

          <button
            type='button'
            onClick={() => {
              setSelectedHour(null);
              setSelectedMinute(null);
              setReminder('none');
            }}
            className='w-full text-[14px] font-medium text-gray-500'
          >
            Clear time
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({
  auth,
  syncError,
  lastSyncedAt,
  onDeleteLocalData,
  onClose,
}: {
  auth: ReturnType<typeof useAuth>;
  syncError: string | null;
  lastSyncedAt: Date | null;
  onDeleteLocalData: () => void;
  onClose: () => void;
}) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function submit() {
    setSuccessMessage(null);

    try {
      if (isCreatingAccount) {
        if (password !== confirmPassword) {
          auth.setErrorMessage('Passwords do not match.');
          return;
        }

        await auth.signUp(email, password);
      } else {
        await auth.signIn(email, password);
      }

      onClose();
    } catch {
      // useAuth handles errorMessage.
    }
  }

  async function sendPasswordReset() {
    const trimmedEmail = email.trim();

    setSuccessMessage(null);

    if (!trimmedEmail) {
      auth.setErrorMessage('Please enter your email first.');
      return;
    }

    try {
      await auth.resetPassword(trimmedEmail);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch {
      // useAuth handles errorMessage.
    }
  }

  async function signOutAndClearLocalData() {
    onDeleteLocalData();
    await auth.signOut();
    onClose();
  }

  async function confirmDeleteAccount() {
    const confirmed = window.confirm(
      'This permanently deletes your account and cloud data. This action cannot be undone.',
    );

    if (!confirmed) return;

    const reauthPassword = window.prompt(
      'For security, please re-enter your password.',
    );

    if (reauthPassword === null) return;

    if (!reauthPassword.trim()) {
      auth.setErrorMessage('Please enter your password.');
      return;
    }

    if (!auth.user) {
      auth.setErrorMessage('No signed-in user found.');
      return;
    }

    setIsDeletingAccount(true);
    auth.setErrorMessage(null);

    try {
      await deleteCloudUserData(auth.user.uid);
      onDeleteLocalData();
      await auth.reauthenticateAndDelete(reauthPassword);
      onClose();
    } catch {
      // useAuth handles errorMessage.
    } finally {
      setIsDeletingAccount(false);
    }
  }

  if (auth.isLoggedIn) {
    return (
      <div
        onClick={() => {
          if (!isDeletingAccount) onClose();
        }}
        className='fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4'
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className='w-full max-w-md rounded-[24px] bg-white p-6'
        >
          <div className='space-y-4 text-center'>
            <Cloud
              size={48}
              fill='currentColor'
              className='mx-auto text-blue-500'
            />

            <h2 className='text-[22px] font-bold'>Signed in</h2>
            <p className='text-[14px] text-gray-500'>{auth.user?.email}</p>
            <p className='text-[14px] text-gray-500'>
              Your planner syncs automatically across devices.
            </p>

            {(syncError || auth.errorMessage) && (
              <p className='text-[13px] text-red-500'>
                {syncError ?? auth.errorMessage}
              </p>
            )}

            {lastSyncedAt && (
              <p className='text-[12px] text-gray-500'>
                Last updated:{' '}
                {lastSyncedAt.toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}

            <button
              onClick={signOutAndClearLocalData}
              disabled={isDeletingAccount}
              className='inline-flex items-center justify-center gap-1 text-red-500 disabled:opacity-50'
            >
              <LogOut size={16} />
              Sign Out
            </button>

            <button
              onClick={confirmDeleteAccount}
              disabled={isDeletingAccount}
              className='block w-full py-2 text-[13px] text-gray-300 disabled:opacity-50'
            >
              {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4'
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-md rounded-[24px] bg-white p-6'
      >
        <div className='space-y-4'>
          <h2 className='text-center text-[22px] font-bold'>
            {isCreatingAccount ? 'Create Account' : 'Login'}
          </h2>

          <p className='text-center text-[14px] text-gray-500'>
            {isCreatingAccount
              ? 'Create an account to sync your planner.'
              : 'Log in to sync your planner across devices.'}
          </p>

          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSuccessMessage(null);
            }}
            placeholder='Email'
            className='w-full rounded-[14px] bg-[#f2f2f7] p-4 outline-none'
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Password'
            type='password'
            className='w-full rounded-[14px] bg-[#f2f2f7] p-4 outline-none'
          />

          {isCreatingAccount && (
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Confirm Password'
              type='password'
              className='w-full rounded-[14px] bg-[#f2f2f7] p-4 outline-none'
            />
          )}

          {auth.errorMessage && (
            <p className='text-[13px] text-red-500'>{auth.errorMessage}</p>
          )}

          {successMessage && (
            <p className='text-[13px] text-green-600'>{successMessage}</p>
          )}

          <button
            onClick={submit}
            disabled={auth.isLoading}
            className='w-full rounded-[16px] bg-blue-500 p-4 font-semibold text-white disabled:opacity-50'
          >
            {auth.isLoading
              ? 'Please wait...'
              : isCreatingAccount
                ? 'Create Account'
                : 'Log In'}
          </button>

          {!isCreatingAccount && (
            <button
              type='button'
              onClick={sendPasswordReset}
              disabled={auth.isLoading}
              className='w-full text-[14px] font-medium text-gray-500 disabled:opacity-50'
            >
              Forgot password?
            </button>
          )}

          <button
            onClick={() => {
              setIsCreatingAccount((prev) => !prev);
              setSuccessMessage(null);
              auth.setErrorMessage(null);
            }}
            className='w-full text-[14px] text-blue-500'
          >
            {isCreatingAccount
              ? 'Already have an account? Log in'
              : 'New here? Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
