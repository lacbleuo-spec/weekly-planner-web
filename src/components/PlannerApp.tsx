// PlannerApp.tsx

'use client';

import type { Locale } from '@/i18n/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlannerResponsiveLayout } from '@/components/PlannerResponsiveLayout';
import { Timestamp } from 'firebase/firestore';
import {
  Bot,
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
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Send,
  Smartphone,
  Sun,
  Trash,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  addingDays,
  dayKey,
  endOfWeek,
  isSameDay,
  startOfWeek,
  weekKey,
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
import { AiPlannerChat } from '@/components/AiPlannerChat';
import { LanguageSelect } from '@/components/LanguageSelect';
import { dictionaries } from '@/i18n/dictionaries';

import {
  WeekStartSelect,
  type WeekStartType,
} from '@/components/WeekStartSelect';

const REORDER_THRESHOLD = 42;
const LOCAL_STORAGE_KEY = 'weekly-planner-local-data-v1';
const LIFE_LINE_LABEL = '__LIFE_LINE__';
let dict = dictionaries.en;

function formatText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function localizedWeekdayText(date: Date) {
  return dict.calendar.weekdayNames[date.getDay()];
}

function localizedWeekdayShortText(date: Date) {
  return dict.calendar.weekdayShortNames[date.getDay()];
}

function localizedMonthDayText(date: Date) {
  return formatText(dict.calendar.monthDay, {
    month: dict.calendar.monthNames[date.getMonth()],
    day: date.getDate(),
  });
}

function localizedWeekRangeText(startDate: Date, endDate: Date) {
  return formatText(dict.calendar.weekRange, {
    start: localizedMonthDayText(startDate),
    end: localizedMonthDayText(endDate),
  });
}

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

function goalLabel(goal: { label?: string | null }) {
  return goal.label?.trim().toUpperCase() || 'A';
}

function normalizeGoalLabel(label: string | null) {
  const normalized = label?.trim().toUpperCase() ?? '';

  return /^[A-Z]$/.test(normalized) ? normalized : null;
}

function sortGoalsByLabelAndOrder<
  T extends {
    label?: string | null;
    order: number;
  },
>(goals: T[]) {
  return [...goals].sort((a, b) => {
    const labelDiff = goalLabel(a).localeCompare(goalLabel(b));

    if (labelDiff !== 0) return labelDiff;

    return a.order - b.order;
  });
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

export default function PlannerApp({ locale }: { locale: Locale }) {
  dict = dictionaries[locale];

  const auth = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

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
  const [newLifeLineText, setNewLifeLineText] = useState('');
  const [newGoalTexts, setNewGoalTexts] = useState<Record<string, string>>({});

  const [goalToLock, setGoalToLock] = useState<FirebaseDailyGoal | null>(null);

  const [isLifeLineExpanded, setIsLifeLineExpanded] = useState(true);
  const [isSomedayExpanded, setIsSomedayExpanded] = useState(false);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(
    new Set([dayKey(new Date())]),
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAIAnalysisNotice, setShowAIAnalysisNotice] = useState(false);
  const [showResetWeekModal, setShowResetWeekModal] = useState(false);

  const [weekDisplayStart, setWeekDisplayStart] =
    useState<WeekStartType>('sunday');

  useEffect(() => {
    const weekStart = document.cookie
      .split('; ')
      .find((row) => row.startsWith('weekboard-week-start='))
      ?.split('=')[1];

    if (weekStart === 'sunday' || weekStart === 'monday') {
      setWeekDisplayStart(weekStart);

      const next = weekStartDateFor(new Date(), weekStart);
      setSelectedWeekStartDate(next);
      syncExpandedDays(next);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (raw) {
      try {
        const restoredData = restorePlannerData(
          JSON.parse(raw) as StoredPlannerData,
        );

        queueMicrotask(() => {
          setWeeklyPlans(restoredData.weeklyPlans);
          setSomedayGoals(restoredData.somedayGoals);
        });
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }

    queueMicrotask(() => {
      setHasLoadedLocalData(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalData) return;
    if (auth.isLoading) return;
    if (auth.user) return;

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
      queueMicrotask(() => {
        setWeeklyPlans([]);
        setSomedayGoals([]);
        setLastSyncedAt(null);
        setSyncError(null);
      });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);

    queueMicrotask(() => {
      setSyncError(null);
    });

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
  }, [auth.isLoading, auth.user]);

  const selectedWeekEndDate = useMemo(
    () => endOfWeek(selectedWeekStartDate),
    [selectedWeekStartDate],
  );

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addingDays(selectedWeekStartDate, i)),
    [selectedWeekStartDate],
  );

  const visibleWeekDates = useMemo(() => {
    if (weekDisplayStart === 'sunday') return weekDates;

    return Array.from({ length: 7 }, (_, i) =>
      addingDays(selectedWeekStartDate, i + 1),
    );
  }, [weekDates, selectedWeekStartDate, weekDisplayStart]);

  const visibleWeekStartDate = visibleWeekDates[0];
  const visibleWeekEndDate = visibleWeekDates[visibleWeekDates.length - 1];

  const currentPlan = useMemo(() => {
    const selectedKey = weekKey(selectedWeekStartDate);

    return (
      weeklyPlans.find(
        (plan) =>
          !plan.deletedAt &&
          weekKey(plan.weekStartDate.toDate()) === selectedKey,
      ) ?? null
    );
  }, [weeklyPlans, selectedWeekStartDate]);

  const weeklyGoals = useMemo(() => {
    return sortGoalsByLabelAndOrder(
      currentPlan?.weeklyGoals.filter((goal) => !goal.deletedAt) ?? [],
    );
  }, [currentPlan]);

  const allVisibleDailyGoals = useMemo(() => {
    return weeklyPlans.flatMap((plan) =>
      plan.dailyGoals.filter((goal) => !goal.deletedAt),
    );
  }, [weeklyPlans]);

  const allGoals = useMemo(() => {
    return visibleWeekDates.flatMap((date) =>
      sortGoalsByLabelAndOrder(
        allVisibleDailyGoals.filter((goal) =>
          isSameDay(goal.date.toDate(), date),
        ),
      ),
    );
  }, [visibleWeekDates, allVisibleDailyGoals]);

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

  const lifeLineGoal = useMemo(() => {
    return (
      somedayGoals.find(
        (goal) => !goal.deletedAt && goal.label === LIFE_LINE_LABEL,
      ) ?? null
    );
  }, [somedayGoals]);

  const visibleSomedayGoals = useMemo(() => {
    return sortGoalsByLabelAndOrder(
      somedayGoals.filter(
        (goal) => !goal.deletedAt && goal.label !== LIFE_LINE_LABEL,
      ),
    );
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

  function markSynced() {
    setSyncError(null);
    setLastSyncedAt(new Date());
  }

  async function syncWeeklyGoalChange(
    updatedPlan: FirebaseWeeklyPlan,
    goal: FirebaseWeeklyGoal,
  ) {
    savePlanChange(updatedPlan);

    if (!auth.user) return;

    try {
      await saveWeeklyGoal(auth.user.uid, updatedPlan, goal);
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncWeeklyGoal,
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
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncWeeklyGoals,
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
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncDailyGoal,
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
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncDailyGoals,
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
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncSomedayGoal,
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
      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.syncSomedayGoals,
      );
    }
  }

  function weekStartDateFor(date: Date, weekDisplayStart: WeekStartType) {
    return weekDisplayStart === 'monday'
      ? addingDays(date, -((date.getDay() + 6) % 7) - 1)
      : startOfWeek(date);
  }

  function syncExpandedDays(nextWeekStartDate: Date) {
    const dates = Array.from({ length: 7 }, (_, i) =>
      addingDays(nextWeekStartDate, i),
    );

    if (dates.some((date) => isSameDay(date, new Date()))) {
      setExpandedDayKeys(new Set([dayKey(new Date())]));
    } else {
      setExpandedDayKeys(new Set());
    }
  }

  function moveToWeekContaining(date: Date) {
    const next = weekStartDateFor(date, weekDisplayStart);

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
      label: 'Z',
      order: visibleSomedayGoals.length,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };

    setNewSomedayGoalText('');
    syncSomedayGoalChange([...somedayGoals, goal], goal);
  }

  function addLifeLineGoal() {
    const text = newLifeLineText.trim();
    if (!text || lifeLineGoal) return;

    const createdAt = now();
    const goal: FirebaseSomedayGoal = {
      id: makeId(),
      title: text,
      label: LIFE_LINE_LABEL,
      order: 0,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    };

    setNewLifeLineText('');
    syncSomedayGoalChange([...somedayGoals, goal], goal);
  }

  function deleteLifeLineGoal() {
    if (!lifeLineGoal) return;

    const deletedGoal = { ...lifeLineGoal, deletedAt: now(), updatedAt: now() };
    const nextGoals = somedayGoals.map((goal) =>
      goal.id === lifeLineGoal.id ? deletedGoal : goal,
    );

    syncSomedayGoalChange(nextGoals, deletedGoal);
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
    const target = visibleSomedayGoals.find((goal) => goal.id === goalId);

    if (!target) return;

    const sameLabelGoals = visibleSomedayGoals.filter(
      (goal) => goalLabel(goal) === goalLabel(target),
    );

    const currentIndex = sameLabelGoals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= sameLabelGoals.length) {
      return;
    }

    sameLabelGoals.splice(
      newIndex,
      0,
      sameLabelGoals.splice(currentIndex, 1)[0],
    );

    const reorderedGoals = sameLabelGoals.map((goal, index) => ({
      ...goal,
      order: index,
      updatedAt: now(),
    }));

    const nextGoals = somedayGoals.map(
      (goal) => reorderedGoals.find((g) => g.id === goal.id) ?? goal,
    );

    syncSomedayGoalsChange(nextGoals, reorderedGoals);
  }

  function updateSomedayGoalLabel(goalId: string, label: string | null) {
    const target = somedayGoals.find((goal) => goal.id === goalId);

    if (!target) return;

    const updatedGoal = {
      ...target,
      label: normalizeGoalLabel(label),
      updatedAt: now(),
    };

    const nextGoals = somedayGoals.map((goal) =>
      goal.id === goalId ? updatedGoal : goal,
    );

    syncSomedayGoalChange(nextGoals, updatedGoal);
  }

  function addWeeklyGoal(title?: string) {
    const text = (title ?? newWeeklyGoalText).trim();
    if (!text) return;

    const plan = currentPlan ?? makeCurrentWeekPlan();
    const createdAt = now();

    const goal: FirebaseWeeklyGoal = {
      id: makeId(),
      title: text,
      label: 'Z',
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

    if (!title) {
      setNewWeeklyGoalText('');
    }

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

    const target = weeklyGoals.find((goal) => goal.id === goalId);

    if (!target) return;

    const sameLabelGoals = weeklyGoals.filter(
      (goal) => goalLabel(goal) === goalLabel(target),
    );

    const currentIndex = sameLabelGoals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= sameLabelGoals.length) {
      return;
    }

    sameLabelGoals.splice(
      newIndex,
      0,
      sameLabelGoals.splice(currentIndex, 1)[0],
    );

    const reorderedGoals = sameLabelGoals.map((goal, index) => ({
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

  function updateWeeklyGoalLabel(goalId: string, label: string | null) {
    if (!currentPlan) return;

    const target = currentPlan.weeklyGoals.find((goal) => goal.id === goalId);

    if (!target) return;

    const updatedGoal = {
      ...target,
      label: normalizeGoalLabel(label),
      updatedAt: now(),
    };

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      weeklyGoals: currentPlan.weeklyGoals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal,
      ),
    };

    syncWeeklyGoalChange(updatedPlan, updatedGoal);
  }

  function goalsForDate(date: Date) {
    return sortGoalsByLabelAndOrder(
      allVisibleDailyGoals.filter((goal) =>
        isSameDay(goal.date.toDate(), date),
      ),
    );
  }
  function copyWeeklyGoalToDailyGoal(goal: FirebaseWeeklyGoal, dates: Date[]) {
    const plan = currentPlan ?? makeCurrentWeekPlan();
    const createdAt = now();

    const newGoals: FirebaseDailyGoal[] = dates.map((date) => ({
      id: makeId(),
      title: goal.title,
      label: goal.label ?? 'A',
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
          weekKey(plan.weekStartDate.toDate()) === weekKey(nextWeekStartDate),
      ) ?? makePlanForWeek(nextWeekStartDate);

    const visibleNextWeekGoals = nextWeekPlan.weeklyGoals.filter(
      (goal) => !goal.deletedAt,
    );

    const goal: FirebaseWeeklyGoal = {
      id: makeId(),
      title: goalToCopy.title,
      label: goalToCopy.label ?? 'A',
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
      label: 'Z',
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

    const target = goalsForDate(date).find((goal) => goal.id === goalId);

    if (!target) return;

    const sameLabelGoals = goalsForDate(date).filter(
      (goal) => goalLabel(goal) === goalLabel(target),
    );

    const currentIndex = sameLabelGoals.findIndex((goal) => goal.id === goalId);
    const newIndex = currentIndex + direction;

    if (currentIndex < 0 || newIndex < 0 || newIndex >= sameLabelGoals.length) {
      return;
    }

    sameLabelGoals.splice(
      newIndex,
      0,
      sameLabelGoals.splice(currentIndex, 1)[0],
    );

    const reorderedGoals = sameLabelGoals.map((goal, index) => ({
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

  function updateDailyGoalLabel(goalId: string, label: string | null) {
    if (!currentPlan) return;

    const targetGoal = currentPlan.dailyGoals.find(
      (goal) => goal.id === goalId,
    );

    if (!targetGoal) return;

    const updatedGoal = {
      ...targetGoal,
      label: normalizeGoalLabel(label),
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

  function toggleDay(date: Date) {
    const key = dayKey(date);

    setExpandedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function resetCurrentWeek() {
    if (!currentPlan) return;

    const deletedAt = now();

    const deletedWeeklyGoals = currentPlan.weeklyGoals.map((goal) => ({
      ...goal,
      deletedAt,
      updatedAt: deletedAt,
    }));

    const deletedDailyGoals = currentPlan.dailyGoals.map((goal) => ({
      ...goal,
      deletedAt,
      updatedAt: deletedAt,
    }));

    const updatedPlan: FirebaseWeeklyPlan = {
      ...currentPlan,
      updatedAt: deletedAt,
      deletedAt,
      weeklyGoals: deletedWeeklyGoals,
      dailyGoals: deletedDailyGoals,
    };

    savePlanChange(updatedPlan);
    setShowResetWeekModal(false);

    if (!auth.user) return;

    try {
      await Promise.all([
        saveWeeklyGoals(auth.user.uid, updatedPlan, deletedWeeklyGoals),
        saveDailyGoals(auth.user.uid, updatedPlan, deletedDailyGoals),
      ]);

      markSynced();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : dict.errors.resetWeek,
      );
    }
  }

  return (
    <main data-planner-theme={theme} className='min-h-screen transition-colors'>
      <PlannerResponsiveLayout
        weekDates={visibleWeekDates}
        globalSidebar={
          <>
            <div className='flex items-center justify-end'>
              <div className='flex items-center gap-2'>
                <LanguageSelect locale={locale} />

                <WeekStartSelect
                  locale={locale}
                  value={weekDisplayStart}
                  onChange={setWeekDisplayStart}
                />

                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                <MobileAppCard />
              </div>
            </div>

            <Card>
              <div className='flex items-center justify-between gap-4'>
                <div className='min-w-0'>
                  <h2 className='text-[17px] font-semibold'>
                    {auth.isLoggedIn
                      ? dict.auth.cloudConnected
                      : dict.auth.notSynced}
                  </h2>

                  <p className='mt-0.5 truncate text-[12px] text-gray-500'>
                    {auth.user?.email ?? dict.auth.loginToSync}
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
                  {auth.isLoggedIn ? dict.auth.sync : dict.auth.login}
                </button>
              </div>
            </Card>

            <ExpandableCard
              title={dict.planner.lifeLine}
              subtitle={`${lifeLineGoal ? 1 : 0} / 1`}
              expanded={isLifeLineExpanded}
              onToggle={() => setIsLifeLineExpanded((prev) => !prev)}
            >
              {!lifeLineGoal && (
                <>
                  <EmptyText>{dict.planner.addLifeLine}</EmptyText>

                  <AddInput
                    value={newLifeLineText}
                    onChange={setNewLifeLineText}
                    placeholder={dict.planner.addLifeLineInput}
                    onSubmit={addLifeLineGoal}
                  />
                </>
              )}

              {lifeLineGoal && (
                <SimpleGoalRow
                  title={lifeLineGoal.title}
                  onDelete={deleteLifeLineGoal}
                />
              )}
            </ExpandableCard>

            <ExpandableCard
              title={dict.planner.somedayGoals}
              subtitle={`${visibleSomedayGoals.length} ${dict.planner.goals}`}
              expanded={isSomedayExpanded}
              onToggle={() => setIsSomedayExpanded((prev) => !prev)}
            >
              {visibleSomedayGoals.length === 0 && (
                <EmptyText>{dict.planner.addSomedayGoals}</EmptyText>
              )}

              {visibleSomedayGoals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  title={goal.title}
                  label={goal.label}
                  onLabelChange={(label) =>
                    updateSomedayGoalLabel(goal.id, label)
                  }
                  onMove={(direction) => moveSomedayGoal(goal.id, direction)}
                  onDelete={() => deleteSomedayGoal(goal.id)}
                />
              ))}

              <AddInput
                value={newSomedayGoalText}
                onChange={setNewSomedayGoalText}
                placeholder={dict.planner.addSomedayGoalInput}
                onSubmit={addSomedayGoal}
              />
            </ExpandableCard>
          </>
        }
        weekSidebar={
          <>
            <WeekProgressCard
              selectedWeekStartDate={visibleWeekStartDate}
              selectedWeekEndDate={visibleWeekEndDate}
              weekDates={visibleWeekDates}
              weekDisplayStart={weekDisplayStart}
              overallProgressStats={overallProgressStats}
              deletableProgressStats={deletableProgressStats}
              nonDeletableProgressStats={nonDeletableProgressStats}
              goalsForDate={goalsForDate}
              showDatePicker={showDatePicker}
              onToggleDatePicker={() => setShowDatePicker((prev) => !prev)}
              onPickDate={moveToWeekContaining}
              onAIAnalysis={() => setShowAIAnalysisNotice(true)}
              onResetWeek={() => setShowResetWeekModal(true)}
            />

            <ExpandableCard
              title={dict.planner.weeklyGoals}
              subtitle={`${weeklyGoals.length} ${dict.planner.goals}`}
              expanded={isWeeklyExpanded}
              onToggle={() => setIsWeeklyExpanded((prev) => !prev)}
            >
              {weeklyGoals.length === 0 && (
                <EmptyText>{dict.planner.addGoalsForThisWeek}</EmptyText>
              )}

              {weeklyGoals.map((goal, index) => (
                <div key={goal.id}>
                  {shouldShowGoalDivider(weeklyGoals, index) && <GoalDivider />}
                  <GoalRow
                    title={goal.title}
                    label={goal.label}
                    showCopy
                    weekDates={visibleWeekDates}
                    onCopyToDays={(dates) =>
                      copyWeeklyGoalToDailyGoal(goal, dates)
                    }
                    onCopyToAllDays={() =>
                      copyWeeklyGoalToDailyGoal(goal, visibleWeekDates)
                    }
                    onCopyToNextWeek={() => copyWeeklyGoalToNextWeek(goal)}
                    onMove={(direction) => moveWeeklyGoal(goal.id, direction)}
                    onLabelChange={(label) =>
                      updateWeeklyGoalLabel(goal.id, label)
                    }
                    onDelete={() => deleteWeeklyGoal(goal.id)}
                  />
                </div>
              ))}

              <AddInput
                value={newWeeklyGoalText}
                onChange={setNewWeeklyGoalText}
                placeholder={dict.planner.addWeeklyGoalInput}
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
                    {localizedWeekdayText(date)}
                  </h2>
                  <p className='mt-1 text-[12px] text-gray-500'>
                    {localizedMonthDayText(date)}
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
                    aria-label={
                      isExpanded
                        ? dict.accessibility.collapseDay
                        : dict.accessibility.expandDay
                    }
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
                    <EmptyText>{dict.planner.addGoalsForThisDay}</EmptyText>
                  )}

                  {goals.map((goal, index) => (
                    <div key={goal.id}>
                      {shouldShowDailyGoalDivider(goals, index) && (
                        <GoalDivider />
                      )}
                      <DailyGoalRow
                        goal={goal}
                        canMove={true}
                        canToggle={true}
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
                        onUpdateLabel={(label) =>
                          updateDailyGoalLabel(goal.id, label)
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
                    placeholder={formatText(dict.planner.addDayGoalInput, {
                      day: localizedWeekdayText(date),
                    })}
                    onSubmit={() => addDailyGoal(date)}
                  />
                </div>
              )}
            </Card>
          );
        }}
      />

      <AiPlannerChat
        isLoggedIn={auth.isLoggedIn}
        onRequireLogin={() => setShowAuthModal(true)}
        locale={locale}
        onAddWeeklyGoal={(title) => addWeeklyGoal(title)}
      />

      <style jsx global>{`
        :root,
        [data-planner-theme='light'] {
          --planner-bg: #f2f2f7;
          --planner-card: #ffffff;
          --planner-card-raised: #ffffff;
          --planner-surface: #f2f2f7;
          --planner-surface-hover: #e5e7eb;
          --planner-text: #111827;
          --planner-muted: #6b7280;
          --planner-subtle: #9ca3af;
          --planner-border: rgba(17, 24, 39, 0.08);
          --planner-shadow: rgba(0, 0, 0, 0.16);
          --planner-blue: #3b82f6;
          --planner-blue-soft: #eff6ff;
          --planner-blue-track: #dbeafe;
          --planner-red: #ef4444;
          --planner-red-soft: #fef2f2;
          --planner-overlay: rgba(0, 0, 0, 0.3);
        }

        :root.dark,
        [data-planner-theme='dark'] {
          --planner-bg: #111113;
          --planner-card: #1c1c1f;
          --planner-card-raised: #242428;
          --planner-surface: #2c2c31;
          --planner-surface-hover: #35353b;
          --planner-text: #f4f4f5;
          --planner-muted: #a1a1aa;
          --planner-subtle: #71717a;
          --planner-border: rgba(255, 255, 255, 0.09);
          --planner-shadow: rgba(0, 0, 0, 0.52);
          --planner-blue: #60a5fa;
          --planner-blue-soft: rgba(96, 165, 250, 0.16);
          --planner-blue-track: rgba(96, 165, 250, 0.22);
          --planner-red: #fb7185;
          --planner-red-soft: rgba(251, 113, 133, 0.16);
          --planner-overlay: rgba(0, 0, 0, 0.62);
        }

        html,
        body {
          background: var(--planner-bg);
        }

        [data-planner-theme] {
          background: var(--planner-bg);
          color: var(--planner-text);
        }

        [data-planner-theme] .bg-white,
        [data-planner-theme] .bg-white\/95,
        html.dark .bg-white,
        html.dark .bg-white\/95 {
          background-color: var(--planner-card) !important;
        }

        [data-planner-theme] .bg-\[\#f2f2f7\],
        [data-planner-theme] input.bg-\[\#f2f2f7\],
        html.dark .bg-\[\#f2f2f7\],
        html.dark input.bg-\[\#f2f2f7\] {
          background-color: var(--planner-surface) !important;
        }

        [data-planner-theme] .text-black,
        html.dark .text-black {
          color: var(--planner-text) !important;
        }

        [data-planner-theme] input,
        [data-planner-theme] select,
        html.dark input,
        html.dark select {
          color: var(--planner-text);
        }

        [data-planner-theme] input::placeholder,
        html.dark input::placeholder {
          color: var(--planner-muted);
          opacity: 1;
        }

        [data-planner-theme] .text-gray-500,
        [data-planner-theme] .text-gray-600,
        html.dark .text-gray-500,
        html.dark .text-gray-600 {
          color: var(--planner-muted) !important;
        }

        [data-planner-theme] .text-gray-300,
        [data-planner-theme] .text-gray-400,
        html.dark .text-gray-300,
        html.dark .text-gray-400 {
          color: var(--planner-subtle) !important;
        }

        [data-planner-theme] .bg-gray-100,
        [data-planner-theme] .active\:bg-gray-100:active,
        html.dark .bg-gray-100,
        html.dark .active\:bg-gray-100:active {
          background-color: var(--planner-surface-hover) !important;
        }

        [data-planner-theme] .bg-gray-200,
        html.dark .bg-gray-200 {
          background-color: var(--planner-surface-hover) !important;
        }

        [data-planner-theme] .border-gray-100,
        [data-planner-theme] .border-white\/70,
        html.dark .border-gray-100,
        html.dark .border-white\/70 {
          border-color: var(--planner-border) !important;
        }

        [data-planner-theme] .bg-blue-50,
        [data-planner-theme] .bg-blue-100,
        [data-planner-theme] .active\:bg-blue-50:active,
        html.dark .bg-blue-50,
        html.dark .bg-blue-100,
        html.dark .active\:bg-blue-50:active {
          background-color: var(--planner-blue-soft) !important;
        }

        [data-planner-theme] .text-blue-500,
        [data-planner-theme] .text-blue-300,
        html.dark .text-blue-500,
        html.dark .text-blue-300 {
          color: var(--planner-blue) !important;
        }

        [data-planner-theme] .bg-blue-500,
        html.dark .bg-blue-500 {
          background-color: var(--planner-blue) !important;
        }

        [data-planner-theme] .bg-red-50,
        [data-planner-theme] .active\:bg-red-50:active,
        html.dark .bg-red-50,
        html.dark .active\:bg-red-50:active {
          background-color: var(--planner-red-soft) !important;
        }

        [data-planner-theme] .text-red-500,
        html.dark .text-red-500 {
          color: var(--planner-red) !important;
        }

        [data-planner-theme] .bg-red-500,
        html.dark .bg-red-500 {
          background-color: var(--planner-red) !important;
        }

        [data-planner-theme] .bg-black\/30,
        html.dark .bg-black\/30 {
          background-color: var(--planner-overlay) !important;
        }

        [data-planner-theme] section.rounded-\[24px\],
        [data-planner-theme] div.rounded-\[24px\].bg-white,
        [data-planner-theme] div.rounded-\[18px\].bg-white,
        html.dark section.rounded-\[24px\],
        html.dark div.rounded-\[24px\].bg-white,
        html.dark div.rounded-\[18px\].bg-white {
          border: 1px solid var(--planner-border);
        }

        [data-planner-theme] .shadow-\[0_14px_40px_rgba\(0\,0\,0\,0\.16\)\],
        [data-planner-theme] .shadow-\[0_18px_50px_rgba\(0\,0\,0\,0\.18\)\],
        html.dark .shadow-\[0_14px_40px_rgba\(0\,0\,0\,0\.16\)\],
        html.dark .shadow-\[0_18px_50px_rgba\(0\,0\,0\,0\.18\)\] {
          box-shadow: 0 18px 50px var(--planner-shadow) !important;
        }

        html.dark svg circle[stroke='rgb(219 234 254)'],
        [data-planner-theme='dark'] svg circle[stroke='rgb(219 234 254)'] {
          stroke: var(--planner-blue-track);
        }

        html.dark svg circle[stroke='rgb(59 130 246)'],
        [data-planner-theme='dark'] svg circle[stroke='rgb(59 130 246)'] {
          stroke: var(--planner-blue);
        }

        html.dark span.bg-gray-400,
        [data-planner-theme='dark'] span.bg-gray-400 {
          background-color: var(--planner-subtle) !important;
        }
      `}</style>

      {goalToLock && (
        <LockGoalModal
          onCancel={() => setGoalToLock(null)}
          onConfirm={confirmLockDailyGoal}
        />
      )}

      {showResetWeekModal && (
        <ConfirmResetWeekModal
          onCancel={() => setShowResetWeekModal(false)}
          onConfirm={resetCurrentWeek}
        />
      )}

      {showAIAnalysisNotice && (
        <NoticeModal
          title={dict.planner.aiAnalysis}
          message={dict.planner.aiAnalysisComingSoon}
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

function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onToggle}
      className='flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 transition active:scale-[0.98] active:bg-gray-100'
      aria-label={
        isDark
          ? dict.accessibility.switchToLightMode
          : dict.accessibility.switchToDarkMode
      }
      title={isDark ? dict.theme.lightMode : dict.theme.darkMode}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className='rounded-[24px] bg-white p-5 transition-colors'>
      {children}
    </section>
  );
}

function WeekProgressCard({
  selectedWeekStartDate,
  selectedWeekEndDate,
  weekDates,
  weekDisplayStart,
  overallProgressStats,
  deletableProgressStats,
  nonDeletableProgressStats,
  goalsForDate,
  showDatePicker,
  onToggleDatePicker,
  onPickDate,
  onAIAnalysis,
  onResetWeek,
}: {
  selectedWeekStartDate: Date;
  selectedWeekEndDate: Date;
  weekDates: Date[];
  weekDisplayStart: WeekStartType;
  overallProgressStats: GoalProgressStats;
  deletableProgressStats: GoalProgressStats;
  nonDeletableProgressStats: GoalProgressStats;
  goalsForDate: (date: Date) => FirebaseDailyGoal[];
  showDatePicker: boolean;
  onToggleDatePicker: () => void;
  onPickDate: (date: Date) => void;
  onAIAnalysis: () => void;
  onResetWeek: () => void;
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
      ? dict.planner.flexibleGoals
      : progressFilter === 'nonDeletable'
        ? dict.planner.lockedGoals
        : dict.planner.overallProgress;

  const [isWeekMenuOpen, setIsWeekMenuOpen] = useState(false);

  function closeWeekMenu() {
    setIsWeekMenuOpen(false);
  }

  return (
    <Card>
      <div className='flex items-center justify-between gap-3'>
        <div className='relative'>
          <button
            onClick={onToggleDatePicker}
            className='flex items-center gap-1.5 text-[17px] font-semibold text-black'
          >
            <span>
              {localizedWeekRangeText(
                selectedWeekStartDate,
                selectedWeekEndDate,
              )}
            </span>

            <ChevronDown size={15} strokeWidth={3} className='text-gray-500' />
          </button>

          {showDatePicker && (
            <CalendarPopover
              selectedDate={selectedWeekStartDate}
              weekDisplayStart={weekDisplayStart}
              onPickDate={onPickDate}
              onClose={onToggleDatePicker}
            />
          )}
        </div>

        <div className='relative'>
          <button
            type='button'
            onClick={() => setIsWeekMenuOpen((prev) => !prev)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label={dict.accessibility.weekMenu}
          >
            <MoreHorizontal size={20} strokeWidth={2.5} />
          </button>

          {isWeekMenuOpen && (
            <WeekOptionsMenu
              onAIAnalysis={() => {
                closeWeekMenu();
                onAIAnalysis();
              }}
              onResetWeek={() => {
                closeWeekMenu();
                onResetWeek();
              }}
            />
          )}
        </div>
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
              aria-label={dict.accessibility.progressType}
            >
              <option value='overall'>{dict.planner.overallProgress}</option>
              <option value='deletable'>{dict.planner.flexibleGoals}</option>
              <option value='nonDeletable'>{dict.planner.lockedGoals}</option>
            </select>

            <ChevronDown
              size={16}
              strokeWidth={3}
              className='pointer-events-none absolute right-0 text-gray-500'
            />
          </div>

          <p className='mt-1 text-[12px] text-gray-500'>
            {selectedProgressStats.completedCount} /{' '}
            {selectedProgressStats.totalCount} {dict.planner.completed}
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
  weekDisplayStart,
  onPickDate,
  onClose,
}: {
  selectedDate: Date;
  weekDisplayStart: WeekStartType;
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

  const startOffset =
    weekDisplayStart === 'monday'
      ? (monthStart.getDay() + 6) % 7
      : monthStart.getDay();

  const calendarStart = addingDays(monthStart, -startOffset);

  const weekdayHeaders =
    weekDisplayStart === 'monday'
      ? [
          ...dict.calendar.weekdayHeaders.slice(1),
          dict.calendar.weekdayHeaders[0],
        ]
      : dict.calendar.weekdayHeaders;

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
        aria-label={dict.calendar.closeCalendar}
        onClick={onClose}
        className='fixed inset-0 z-40 cursor-default'
      />

      <div className='absolute left-0 top-8 z-50 w-[300px] overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl'>
        <div className='flex items-center justify-between px-1 pb-3'>
          <button
            type='button'
            onClick={() => moveMonth(-1)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label={dict.calendar.previousMonth}
          >
            <ChevronUp size={18} className='-rotate-90' />
          </button>

          <p className='text-[17px] font-semibold text-black'>
            {formatText(dict.calendar.monthYear, {
              month: dict.calendar.monthNames[visibleMonth.getMonth()],
              year: visibleMonth.getFullYear(),
            })}
          </p>

          <button
            type='button'
            onClick={() => moveMonth(1)}
            className='flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:bg-gray-100'
            aria-label={dict.calendar.nextMonth}
          >
            <ChevronUp size={18} className='rotate-90' />
          </button>
        </div>

        <div className='grid grid-cols-7 pb-1 text-center'>
          {weekdayHeaders.map((day, index) => (
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
            {dict.common.today}
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

            <p className='text-[12px] text-gray-500'>
              {localizedWeekdayShortText(date)}
            </p>
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

            <h2 className='mt-4 text-[22px] font-bold'>
              {dict.planner.lockThisGoal}
            </h2>

            <p className='mt-3 text-[15px] leading-6 text-gray-500'>
              {dict.planner.lockedGoalsCannotBeDeleted}
              <br />
              {dict.planner.lockGoalAfterPlanning}
              <br />
              {dict.planner.lockGoalCommitment}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              onClick={onCancel}
              className='rounded-[16px] bg-[#f2f2f7] p-4 font-semibold text-gray-600 active:scale-[0.98]'
            >
              {dict.common.cancel}
            </button>

            <button
              type='button'
              onClick={onConfirm}
              className='rounded-[16px] bg-blue-500 p-4 font-semibold text-white active:scale-[0.98]'
            >
              {dict.planner.lockGoal}
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
          {dict.common.ok}
        </button>
      </div>
    </div>
  );
}

function WeekOptionsMenu({
  onAIAnalysis,
  onResetWeek,
}: {
  onAIAnalysis: () => void;
  onResetWeek: () => void;
}) {
  return (
    <div className='absolute right-0 top-10 z-50 w-[210px] overflow-hidden rounded-[18px] border border-gray-100 bg-white p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.16)]'>
      <button
        type='button'
        onClick={onAIAnalysis}
        className='flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-blue-500 active:bg-blue-50'
      >
        <span className='text-[15px] font-semibold'>
          {dict.planner.aiAnalysis}
        </span>
      </button>

      <button
        type='button'
        onClick={onResetWeek}
        className='flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-red-500 active:bg-red-50'
      >
        <span className='text-[15px] font-semibold'>
          {dict.planner.resetThisWeek}
        </span>
      </button>
    </div>
  );
}

function ConfirmResetWeekModal({
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
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500'>
              <Trash size={22} />
            </div>

            <h2 className='mt-4 text-[22px] font-bold'>
              {dict.planner.resetThisWeekQuestion}
            </h2>

            <p className='mt-3 text-[15px] leading-6 text-gray-500'>
              {dict.planner.resetThisWeekDescription}
              <br />
              {dict.planner.cannotBeUndone}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              onClick={onCancel}
              className='rounded-[16px] bg-[#f2f2f7] p-4 font-semibold text-gray-600 active:scale-[0.98]'
            >
              {dict.common.cancel}
            </button>

            <button
              type='button'
              onClick={onConfirm}
              className='rounded-[16px] bg-red-500 p-4 font-semibold text-white active:scale-[0.98]'
            >
              {dict.planner.resetWeek}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id6775522975';

function MobileAppCard() {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  // iOS + Web 허용, Android만 차단
  const canDownloadApp = isIOS || !isAndroid;

  function installApp() {
    if (!canDownloadApp) return;

    window.open(IOS_APP_STORE_URL, '_blank');
  }

  return (
    <button
      type='button'
      onClick={installApp}
      disabled={!canDownloadApp}
      className='flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 transition active:scale-[0.98] active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50'
      aria-label={dict.mobile.installApp}
      title={dict.mobile.installApp}
    >
      <Smartphone size={17} />
    </button>
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
          aria-label={
            expanded
              ? dict.accessibility.collapseSection
              : dict.accessibility.expandSection
          }
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

      <button
        type='button'
        onClick={() => onSubmit()}
        className='text-blue-500'
      >
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
      aria-label={dict.accessibility.dragToReorder}
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

function shouldShowGoalDivider<T extends { label?: string | null }>(
  goals: T[],
  index: number,
) {
  if (index === 0) return false;

  return goalLabel(goals[index - 1]) !== goalLabel(goals[index]);
}

function shouldShowDailyGoalDivider<T extends { label?: string | null }>(
  goals: T[],
  index: number,
) {
  return shouldShowGoalDivider(goals, index);
}

function GoalDivider() {
  return <div className='my-2 h-px bg-gray-100' aria-hidden='true' />;
}

function goalTitleClassName(isCompleted = false, isDisabled = false) {
  if (isCompleted) return 'text-gray-400 line-through';
  if (isDisabled) return 'text-gray-400';
  return 'text-black';
}

function GoalLabelSelect({
  label,
  onChange,
}: {
  label?: string | null;
  onChange?: (label: string | null) => void;
}) {
  const value = normalizeGoalLabel(label ?? null) ?? 'A';

  return (
    <div className='relative shrink-0'>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value ?? null)}
        className='h-7 min-w-7 appearance-none rounded-full bg-blue-50 px-2 text-center text-[12px] font-bold text-blue-500 outline-none'
        aria-label={dict.accessibility.goalLabel}
      >
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
          <option key={letter} value={letter}>
            {letter}
          </option>
        ))}
      </select>
    </div>
  );
}

function SimpleGoalRow({
  title,
  onDelete,
}: {
  title: string;
  onDelete: () => void;
}) {
  return (
    <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
      <p className='min-w-0 flex-1 text-[16px] font-normal text-black'>
        {title}
      </p>

      <button onClick={onDelete} className='p-1 text-red-500'>
        <Trash size={18} />
      </button>
    </div>
  );
}

function GoalRow({
  title,
  label,
  showCopy = false,
  weekDates = [],
  onCopyToDays,
  onCopyToAllDays,
  onCopyToNextWeek,
  onMove,
  onLabelChange,
  onDelete,
}: {
  title: string;
  label?: string | null;
  showCopy?: boolean;
  weekDates?: Date[];
  onCopyToDays?: (dates: Date[]) => void;
  onCopyToAllDays?: () => void;
  onCopyToNextWeek?: () => void;
  onMove: (direction: number) => void;
  onLabelChange?: (label: string | null) => void;
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
              aria-label={dict.accessibility.closeCopyMenu}
              onClick={closeCopyMenu}
              className='absolute inset-0 z-0 cursor-default'
            />

            <div className='relative z-10 w-full max-w-md animate-in slide-in-from-bottom-3 duration-200 rounded-[24px] bg-white p-6'>
              <div className='space-y-4'>
                <div className='text-center'>
                  <h2 className='text-[22px] font-bold text-[var(--planner-text)]'>
                    {dict.planner.copyWeeklyGoal}
                  </h2>
                  <p className='mt-2 text-[14px] text-gray-500'>
                    {dict.planner.copyWeeklyGoalDescription}
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
                            {localizedWeekdayText(date)}
                          </p>
                          <p
                            className={`mt-0.5 text-[12px] ${
                              selected ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {localizedMonthDayText(date)}
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
                      {dict.planner.copyToAllDays}
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
                      {formatText(dict.planner.copyToSelectedDays, {
                        count: selectedCopyDayKeys.size,
                      })}
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
                    {dict.planner.copyToNextWeek}
                  </span>
                  <span className='text-[13px] font-semibold text-blue-300'>
                    {dict.planner.weeklyGoal}
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
      <GoalLabelSelect label={label} onChange={onLabelChange} />

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
            aria-label={dict.accessibility.copyGoal}
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
  onUpdateLabel,
  onLock,
  onDelete,
}: {
  goal: FirebaseDailyGoal;
  canMove: boolean;
  canToggle: boolean;
  onToggle: () => void;
  onMove: (direction: number) => void;
  onUpdateTimeReminder: (time: string | null, reminder: GoalReminder) => void;
  onUpdateLabel: (label: string | null) => void;
  onLock: () => void;
  onDelete: () => void;
}) {
  const [showTimeModal, setShowTimeModal] = useState(false);

  return (
    <>
      <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
        <GoalLabelSelect label={goal.label} onChange={onUpdateLabel} />

        <button
          type='button'
          onClick={onToggle}
          disabled={!canToggle}
          className={`text-blue-500 ${
            !canToggle ? 'cursor-not-allowed opacity-40' : ''
          }`}
          aria-label={
            canToggle
              ? dict.accessibility.toggleGoal
              : dict.accessibility.pastGoalsCannotBeChecked
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
            goalKind(goal) === 'nonDeletable'
              ? dict.accessibility.goalIsLocked
              : dict.accessibility.lockGoal
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
          aria-label={
            goal.time
              ? dict.accessibility.timeIsSet
              : dict.accessibility.setTimeAndReminder
          }
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
            aria-label={dict.accessibility.timedGoalsSortedByTime}
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
            aria-label={dict.accessibility.nonDeletableGoalsCannotBeDeleted}
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
          <h2
            className='text-center text-[22px] font-bold'
            style={{ color: 'var(--planner-text)' }}
          >
            {dict.planner.timeAndReminder}
          </h2>

          <p
            className='text-center mt-2 text-[15px]'
            style={{ color: 'var(--planner-muted)' }}
          >
            {dict.planner.timeAndReminderDescription}
          </p>

          <div className='grid grid-cols-2 gap-2'>
            <div className='relative'>
              <select
                value={selectedHour ?? ''}
                onChange={(event) => {
                  const nextHour = event.target.value || null;
                  setSelectedHour(nextHour);
                  if (!nextHour || !selectedMinute) setReminder('none');
                }}
                className='w-full appearance-none rounded-[14px] bg-[#f2f2f7] py-4 pl-4 pr-10 text-[16px] font-semibold outline-none'
              >
                <option value=''>{dict.planner.hour}</option>
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
                onChange={(event) => {
                  const nextMinute = event.target.value || null;
                  setSelectedMinute(nextMinute);
                  if (!selectedHour || !nextMinute) setReminder('none');
                }}
                className='w-full appearance-none rounded-[14px] bg-[#f2f2f7] py-4 pl-4 pr-10 text-[16px] font-semibold outline-none'
              >
                <option value=''>{dict.planner.minute}</option>
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
              <option value='none'>{dict.planner.noReminder}</option>
              <option value='atTime'>{dict.planner.atEventTime}</option>
              <option value='5m'>5 {dict.planner.minutesBefore}</option>
              <option value='10m'>10 {dict.planner.minutesBefore}</option>
              <option value='15m'>15 {dict.planner.minutesBefore}</option>
              <option value='30m'>30 {dict.planner.minutesBefore}</option>
              <option value='1h'>1 {dict.planner.hourBefore}</option>
              <option value='1d'>1 {dict.planner.dayBefore}</option>
              <option value='1h'>{dict.planner.hourBefore}</option>
              <option value='1d'>{dict.planner.dayBefore}</option>
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
            {selectedTime
              ? formatText(dict.planner.timeSelected, { time: selectedTime })
              : dict.planner.noTimeSelected}
          </p>

          <button
            onClick={() =>
              onConfirm(selectedTime, selectedTime ? reminder : 'none')
            }
            className='w-full rounded-[16px] bg-blue-500 p-4 font-semibold text-white'
          >
            {dict.common.save}
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
            {dict.common.clearTime}
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
          auth.setErrorMessage(dict.auth.passwordsDoNotMatch);
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
      auth.setErrorMessage(dict.auth.pleaseEnterEmailFirst);
      return;
    }

    try {
      await auth.resetPassword(trimmedEmail);
      setSuccessMessage(dict.auth.passwordResetSent);
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
    const confirmed = window.confirm(dict.auth.deleteAccountDescription);

    if (!confirmed) return;

    const reauthPassword = window.prompt(dict.auth.reenterPasswordDescription);

    if (reauthPassword === null) return;

    if (!reauthPassword.trim()) {
      auth.setErrorMessage(dict.auth.pleaseEnterPassword);
      return;
    }

    if (!auth.user) {
      auth.setErrorMessage(dict.auth.noSignedInUser);
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
          className='w-full max-w-md rounded-[24px] p-6'
          style={{
            backgroundColor: 'var(--planner-card)',
            color: 'var(--planner-text)',
            border: '1px solid var(--planner-border)',
          }}
        >
          <div className='space-y-4 text-center'>
            <Cloud
              size={48}
              fill='currentColor'
              className='mx-auto text-blue-500'
            />

            <h2 className='text-[22px] font-bold'>{dict.auth.signedIn}</h2>
            <p className='text-[14px] text-gray-500'>{auth.user?.email}</p>
            <p className='text-[14px] text-gray-500'>
              {dict.auth.syncsAutomatically}
            </p>

            {(syncError || auth.errorMessage) && (
              <p className='text-[13px] text-red-500'>
                {syncError ?? auth.errorMessage}
              </p>
            )}

            {lastSyncedAt && (
              <p className='text-[12px] text-gray-500'>
                {dict.auth.lastUpdated}:{' '}
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
              {dict.auth.signOut}
            </button>

            <button
              onClick={confirmDeleteAccount}
              disabled={isDeletingAccount}
              className='block w-full py-2 text-[13px] text-gray-300 disabled:opacity-50'
            >
              {isDeletingAccount
                ? dict.auth.deletingAccount
                : dict.auth.deleteAccount}
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
            {isCreatingAccount ? dict.auth.createAccount : dict.auth.login}
          </h2>

          <p className='text-center text-[14px] text-gray-500'>
            {isCreatingAccount
              ? dict.auth.createAccountDescription
              : dict.auth.loginTitle}
          </p>

          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSuccessMessage(null);
            }}
            placeholder={dict.auth.email}
            className='w-full rounded-[14px] bg-[#f2f2f7] p-4 outline-none'
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={dict.auth.password}
            type='password'
            className='w-full rounded-[14px] bg-[#f2f2f7] p-4 outline-none'
          />

          {isCreatingAccount && (
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={dict.auth.confirmPassword}
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
              ? dict.auth.pleaseWait
              : isCreatingAccount
                ? dict.auth.createAccount
                : dict.auth.logIn}
          </button>

          {!isCreatingAccount && (
            <button
              type='button'
              onClick={sendPasswordReset}
              disabled={auth.isLoading}
              className='w-full text-[14px] font-medium text-gray-500 disabled:opacity-50'
            >
              {dict.auth.forgotPassword}
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
              ? dict.auth.alreadyHaveAccount
              : dict.auth.newHere}
          </button>
        </div>
      </div>
    </div>
  );
}
