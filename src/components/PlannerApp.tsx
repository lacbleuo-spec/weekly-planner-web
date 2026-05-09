'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Cloud,
  CloudIcon,
  Copy,
  GripHorizontal,
  LogOut,
  Plus,
  Trash2,
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
import { mergePlans, mergeSomedayGoals } from '@/lib/merge';
import {
  fetchSomedayGoals,
  fetchWeeklyPlans,
  saveSomedayGoal,
  saveWeeklyPlan,
} from '@/services/plannerService';
import {
  FirebaseDailyGoal,
  FirebaseSomedayGoal,
  FirebaseWeeklyGoal,
  FirebaseWeeklyPlan,
} from '@/models/planner';

const REORDER_THRESHOLD = 42;

function makeId() {
  return crypto.randomUUID();
}

function now() {
  return Timestamp.now();
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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(
    startOfWeek(new Date()),
  );

  const [weeklyPlans, setWeeklyPlans] = useState<FirebaseWeeklyPlan[]>([]);
  const [somedayGoals, setSomedayGoals] = useState<FirebaseSomedayGoal[]>([]);

  const [newWeeklyGoalText, setNewWeeklyGoalText] = useState('');
  const [newSomedayGoalText, setNewSomedayGoalText] = useState('');
  const [newGoalTexts, setNewGoalTexts] = useState<Record<string, string>>({});

  const [isSomedayExpanded, setIsSomedayExpanded] = useState(false);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(
    new Set([dayKey(new Date())]),
  );

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
    return (
      currentPlan?.weeklyGoals
        .filter((goal) => !goal.deletedAt)
        .sort((a, b) => a.order - b.order) ?? []
    );
  }, [currentPlan]);

  const allGoals = useMemo(() => {
    return currentPlan?.dailyGoals.filter((goal) => !goal.deletedAt) ?? [];
  }, [currentPlan]);

  const completedCount = allGoals.filter((goal) => goal.isCompleted).length;
  const progress = allGoals.length === 0 ? 0 : completedCount / allGoals.length;

  const visibleSomedayGoals = useMemo(() => {
    return somedayGoals
      .filter((goal) => !goal.deletedAt)
      .sort((a, b) => a.order - b.order);
  }, [somedayGoals]);

  useEffect(() => {
    if (!auth.user) {
      setWeeklyPlans([]);
      setSomedayGoals([]);
      setLastSyncedAt(null);
      return;
    }

    void refreshFromCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.uid]);

  async function refreshFromCloud() {
    if (!auth.user) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const [cloudPlans, cloudSomedayGoals] = await Promise.all([
        fetchWeeklyPlans(auth.user.uid),
        fetchSomedayGoals(auth.user.uid),
      ]);

      setWeeklyPlans(cloudPlans);
      setSomedayGoals(cloudSomedayGoals);
      setLastSyncedAt(new Date());
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to load cloud data.',
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function syncWithCloud() {
    if (!auth.user) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const [cloudPlans, cloudSomedayGoals] = await Promise.all([
        fetchWeeklyPlans(auth.user.uid),
        fetchSomedayGoals(auth.user.uid),
      ]);

      const mergedPlans = mergePlans(weeklyPlans, cloudPlans);
      const mergedSomedayGoals = mergeSomedayGoals(
        somedayGoals,
        cloudSomedayGoals,
      );

      setWeeklyPlans(mergedPlans);
      setSomedayGoals(mergedSomedayGoals);

      await Promise.all([
        ...mergedPlans.map((plan) => saveWeeklyPlan(auth.user!.uid, plan)),
        ...mergedSomedayGoals.map((goal) =>
          saveSomedayGoal(auth.user!.uid, goal),
        ),
      ]);

      setLastSyncedAt(new Date());
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to sync cloud data.',
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function makeCurrentWeekPlan(): FirebaseWeeklyPlan {
    return {
      id: makeId(),
      weekStartDate: Timestamp.fromDate(selectedWeekStartDate),
      weekEndDate: Timestamp.fromDate(selectedWeekEndDate),
      createdAt: now(),
      updatedAt: now(),
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

  function moveWeek(days: number) {
    const next = addingDays(selectedWeekStartDate, days);
    setSelectedWeekStartDate(next);

    const dates = Array.from({ length: 7 }, (_, i) => addingDays(next, i));

    if (dates.some((date) => isSameDay(date, new Date()))) {
      setExpandedDayKeys(new Set([dayKey(new Date())]));
    } else {
      setExpandedDayKeys(new Set());
    }
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
    saveSomedayGoalsChange([...somedayGoals, goal]);
  }

  function deleteSomedayGoal(goalId: string) {
    const target = somedayGoals.find((goal) => goal.id === goalId);
    if (!target) return;

    const deletedGoal = { ...target, deletedAt: now(), updatedAt: now() };

    saveSomedayGoalsChange(
      somedayGoals.map((goal) => (goal.id === goalId ? deletedGoal : goal)),
    );
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

    saveSomedayGoalsChange(nextGoals);
  }

  function addWeeklyGoal() {
    const text = newWeeklyGoalText.trim();
    if (!text) return;

    const plan = currentPlan ?? makeCurrentWeekPlan();

    const goal: FirebaseWeeklyGoal = {
      id: makeId(),
      title: text,
      order: weeklyGoals.length,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };

    const updatedPlan = {
      ...plan,
      updatedAt: now(),
      weeklyGoals: [...plan.weeklyGoals, goal],
    };

    setNewWeeklyGoalText('');
    savePlanChange(updatedPlan);
  }

  function deleteWeeklyGoal(goalId: string) {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      weeklyGoals: currentPlan.weeklyGoals.map((goal) =>
        goal.id === goalId
          ? { ...goal, deletedAt: now(), updatedAt: now() }
          : goal,
      ),
    };

    savePlanChange(updatedPlan);
  }

  function moveWeeklyGoal(goalId: string, direction: number) {
    if (!currentPlan) return;

    const goals = [...weeklyGoals];
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

    savePlanChange(updatedPlan);
  }

  function goalsForDate(date: Date) {
    return allGoals
      .filter((goal) => isSameDay(goal.date.toDate(), date))
      .sort((a, b) => a.order - b.order);
  }

  function addDailyGoal(date: Date) {
    const key = dayKey(date);
    const text = (newGoalTexts[key] ?? '').trim();
    if (!text) return;

    const plan = currentPlan ?? makeCurrentWeekPlan();

    const goal: FirebaseDailyGoal = {
      id: makeId(),
      title: text,
      date: Timestamp.fromDate(date),
      isCompleted: false,
      order: goalsForDate(date).length,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };

    const updatedPlan = {
      ...plan,
      updatedAt: now(),
      dailyGoals: [...plan.dailyGoals, goal],
    };

    setNewGoalTexts((prev) => ({ ...prev, [key]: '' }));
    savePlanChange(updatedPlan);
  }

  function toggleDailyGoal(goalId: string) {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === goalId
          ? { ...goal, isCompleted: !goal.isCompleted, updatedAt: now() }
          : goal,
      ),
    };

    savePlanChange(updatedPlan);
  }

  function deleteDailyGoal(goalId: string) {
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      updatedAt: now(),
      dailyGoals: currentPlan.dailyGoals.map((goal) =>
        goal.id === goalId
          ? { ...goal, deletedAt: now(), updatedAt: now() }
          : goal,
      ),
    };

    savePlanChange(updatedPlan);
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

    savePlanChange(updatedPlan);
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
      <div className='mx-auto max-w-2xl space-y-5 p-5'>
        <Card>
          <div className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
              <h2 className='text-[17px] font-semibold'>
                {auth.isLoggedIn ? 'Cloud connected' : 'Not synced'}
              </h2>

              <p className='mt-0.5 truncate text-[12px] text-gray-500'>
                {auth.user?.email ?? 'Log in to use cloud sync'}
              </p>
            </div>

            <button
              onClick={() => setShowAuthModal(true)}
              disabled={isSyncing}
              className='flex items-center gap-1.5 text-[15px] font-semibold text-blue-500 disabled:opacity-50'
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
            <EmptyText>
              Write down things you'd like to do someday, even if not right now
            </EmptyText>
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

        <div className='flex items-center justify-between'>
          <button
            onClick={() => moveWeek(-7)}
            className='flex h-10 w-10 items-center justify-center rounded-full bg-white'
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>

          <p className='text-center text-[14px] text-gray-500'>
            {monthDayText(selectedWeekStartDate)} (
            {weekdayShort(selectedWeekStartDate)}) -{' '}
            {monthDayText(selectedWeekEndDate)} (
            {weekdayShort(selectedWeekEndDate)})
          </p>

          <button
            onClick={() => moveWeek(7)}
            className='flex h-10 w-10 items-center justify-center rounded-full bg-white'
          >
            <ChevronRight size={22} strokeWidth={2.4} />
          </button>
        </div>

        <Card>
          <div className='flex items-end justify-between'>
            <div>
              <h2 className='text-[17px] font-semibold'>Overall Progress</h2>
              <p className='mt-1 text-[15px] text-gray-500'>
                {completedCount} / {allGoals.length} completed
              </p>
            </div>

            <p className='text-[34px] font-bold leading-none text-blue-500'>
              {Math.round(progress * 100)}%
            </p>
          </div>

          <div className='mt-4 h-3 overflow-hidden rounded-full bg-gray-200'>
            <div
              className='h-full rounded-full bg-blue-500 transition-all'
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </Card>

        <ExpandableCard
          title='Weekly Goals'
          subtitle={`${weeklyGoals.length} goals`}
          expanded={isWeeklyExpanded}
          onToggle={() => setIsWeeklyExpanded((prev) => !prev)}
        >
          {weeklyGoals.length === 0 && (
            <EmptyText>Add your goals for this week</EmptyText>
          )}

          {weeklyGoals.map((goal) => (
            <GoalRow
              key={goal.id}
              title={goal.title}
              showCopy
              onMove={(direction) => moveWeeklyGoal(goal.id, direction)}
              onDelete={() => deleteWeeklyGoal(goal.id)}
            />
          ))}

          <AddInput
            value={newWeeklyGoalText}
            onChange={setNewWeeklyGoalText}
            placeholder='+ Add weekly goal'
            onSubmit={addWeeklyGoal}
          />
        </ExpandableCard>

        <div className='space-y-3.5'>
          {weekDates.map((date) => {
            const key = dayKey(date);
            const goals = goalsForDate(date);
            const isExpanded = expandedDayKeys.has(key);
            const done = goals.filter((goal) => goal.isCompleted).length;

            return (
              <Card key={key}>
                <button
                  onClick={() => toggleDay(date)}
                  className='flex w-full items-center justify-between'
                >
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

                    {isExpanded ? (
                      <ChevronUp size={18} className='text-gray-500' />
                    ) : (
                      <ChevronDown size={18} className='text-gray-500' />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className='mt-4 space-y-2.5'>
                    {goals.length === 0 && (
                      <EmptyText>Add goals for this day</EmptyText>
                    )}

                    {goals.map((goal) => (
                      <DailyGoalRow
                        key={goal.id}
                        goal={goal}
                        onToggle={() => toggleDailyGoal(goal.id)}
                        onMove={(direction) =>
                          moveDailyGoal(goal.id, date, direction)
                        }
                        onDelete={() => deleteDailyGoal(goal.id)}
                      />
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
          })}
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          auth={auth}
          isSyncing={isSyncing}
          syncError={syncError}
          lastSyncedAt={lastSyncedAt}
          onSync={syncWithCloud}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className='rounded-[24px] bg-white p-5'>{children}</section>;
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
      <button
        onClick={onToggle}
        className='flex w-full items-center justify-between'
      >
        <div className='text-left'>
          <h2 className='text-[17px] font-semibold'>{title}</h2>
          <p className='mt-1 text-[12px] text-gray-500'>{subtitle}</p>
        </div>

        {expanded ? (
          <ChevronUp size={18} className='text-gray-500' />
        ) : (
          <ChevronDown size={18} className='text-gray-500' />
        )}
      </button>

      {expanded && <div className='mt-4 space-y-2.5'>{children}</div>}
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
      className={`touch-none cursor-grab p-1 ${
        isDragging ? 'scale-110 text-gray-500' : 'text-gray-300'
      }`}
      aria-label='Drag to reorder'
    >
      <GripHorizontal size={22} />
    </button>
  );
}

function GoalRow({
  title,
  showCopy = false,
  onMove,
  onDelete,
}: {
  title: string;
  showCopy?: boolean;
  onMove: (direction: number) => void;
  onDelete: () => void;
}) {
  const [didCopy, setDidCopy] = useState(false);

  function copyTitle() {
    navigator.clipboard.writeText(title);
    setDidCopy(true);
    setTimeout(() => setDidCopy(false), 1000);
  }

  return (
    <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
      <p className='min-w-0 flex-1 text-[16px] text-black'>{title}</p>

      {showCopy && (
        <button onClick={copyTitle} className='p-1 text-gray-500'>
          {didCopy ? (
            <CheckCircle2 size={18} className='text-green-500' />
          ) : (
            <Copy size={18} />
          )}
        </button>
      )}

      <DragHandle onMove={onMove} />

      <button onClick={onDelete} className='p-1 text-red-500'>
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function DailyGoalRow({
  goal,
  onToggle,
  onMove,
  onDelete,
}: {
  goal: FirebaseDailyGoal;
  onToggle: () => void;
  onMove: (direction: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className='flex items-center gap-2 rounded-[14px] bg-white px-1 py-2.5'>
      <button onClick={onToggle} className='text-blue-500'>
        {goal.isCompleted ? (
          <span className='flex h-[23px] w-[23px] items-center justify-center rounded-full bg-blue-500 text-white'>
            <Check size={15} strokeWidth={3} />
          </span>
        ) : (
          <Circle size={23} className='text-gray-400' />
        )}
      </button>

      <p
        className={`min-w-0 flex-1 text-[16px] ${
          goal.isCompleted ? 'text-gray-500 line-through' : 'text-black'
        }`}
      >
        {goal.title}
      </p>

      <DragHandle onMove={onMove} />

      <button onClick={onDelete} className='p-1 text-red-500'>
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function AuthModal({
  auth,
  isSyncing,
  syncError,
  lastSyncedAt,
  onSync,
  onClose,
}: {
  auth: ReturnType<typeof useAuth>;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: Date | null;
  onSync: () => Promise<void>;
  onClose: () => void;
}) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function submit() {
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
  }

  if (auth.isLoggedIn) {
    return (
      <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4'>
        <div className='w-full max-w-md rounded-[24px] bg-white p-6'>
          <div className='space-y-4 text-center'>
            <Cloud
              size={48}
              fill='currentColor'
              className='mx-auto text-blue-500'
            />

            <h2 className='text-[22px] font-bold'>Signed in</h2>
            <p className='text-[14px] text-gray-500'>{auth.user?.email}</p>

            <button
              onClick={async () => {
                await onSync();
              }}
              disabled={isSyncing}
              className='w-full rounded-[16px] bg-blue-500 p-4 font-semibold text-white disabled:opacity-50'
            >
              {isSyncing ? 'Syncing...' : 'Sync with Cloud'}
            </button>

            {syncError && (
              <p className='text-[13px] text-red-500'>{syncError}</p>
            )}

            {lastSyncedAt && (
              <p className='text-[12px] text-gray-500'>
                Last synced:{' '}
                {lastSyncedAt.toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}

            <button
              onClick={async () => {
                await auth.signOut();
                onClose();
              }}
              className='inline-flex items-center justify-center gap-1 text-red-500'
            >
              <LogOut size={16} />
              Sign Out
            </button>

            <button
              onClick={onClose}
              className='block w-full text-[14px] text-gray-400'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4'>
      <div className='w-full max-w-md rounded-[24px] bg-white p-6'>
        <div className='space-y-4'>
          <h2 className='text-center text-[22px] font-bold'>
            {isCreatingAccount ? 'Create Account' : 'Login'}
          </h2>

          <p className='text-center text-[14px] text-gray-500'>
            {isCreatingAccount
              ? 'Create an account to sync your planner.'
              : 'Log in to sync your planner.'}
          </p>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

          <button
            onClick={() => {
              setIsCreatingAccount((prev) => !prev);
              auth.setErrorMessage(null);
            }}
            className='w-full text-[14px] text-blue-500'
          >
            {isCreatingAccount
              ? 'Already have an account? Log in'
              : 'New here? Create account'}
          </button>

          <button
            onClick={onClose}
            className='w-full text-[14px] text-gray-400'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
