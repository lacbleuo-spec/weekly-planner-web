import { create } from 'zustand';

import { mondayOfWeekId } from '../lib/date';
import { COLLECTIONS, type CollectionKey } from '../lib/merge';
import { createId } from '../lib/id';
import type {
  CalendarEvent,
  CanvasWidget,
  DailyGoalItem,
  LifeLineItem,
  PlanningSnapshot,
  RoadmapNode,
  RoutineBlock,
  TopGoal,
  WidgetType,
} from '../types/planning';

const DEFAULT_SIZE: Record<WidgetType, { width: number; height: number }> = {
  lifeLine: { width: 300, height: 320 },
  topGoal: { width: 300, height: 320 },
  roadmap: { width: 320, height: 360 },
  dailyGoal: { width: 300, height: 340 },
  timetable: { width: 340, height: 540 },
  weeklyTimeline: { width: 320, height: 540 },
};

let placementCounter = 0;
function nextPlacement() {
  placementCounter = (placementCounter + 1) % 8;
  return { x: 40 + placementCounter * 32, y: 40 + placementCounter * 32 };
}

type MoveDirection = 'up' | 'down';

// 예전 버전은 "이번 주 할 일"을 주 단위(weekId)로 저장했다. 그런 파일을 열면
// 각 항목을 그 주 월요일 날짜의 "오늘 할 일"로 옮긴다.
interface LegacyWeeklyGoal extends Omit<DailyGoalItem, 'date'> {
  weekId: string;
}

function migrateDailyGoals(snapshot: PlanningSnapshot): DailyGoalItem[] {
  if (snapshot.dailyGoals) return snapshot.dailyGoals;
  const legacy = (snapshot as unknown as { weeklyGoals?: LegacyWeeklyGoal[] }).weeklyGoals ?? [];
  return legacy.map(({ weekId, ...rest }) => ({ ...rest, date: mondayOfWeekId(weekId) }));
}

// 목록 안에서 id로 항목을 찾아 바로 앞/뒤 항목과 자리를 바꾼다.
// 이미 맨 위/아래라 바꿀 수 없으면 원래 배열을 그대로 돌려준다(참조 비교로 변경 여부 판단 가능).
function moveById<T extends { id: string }>(list: T[], id: string, direction: MoveDirection): T[] {
  const idx = list.findIndex((item) => item.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return list;
  const next = [...list];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return next;
}

// 어떤 동작이든 상태가 바뀔 때, 바뀐 항목에는 수정 시각을, 사라진 항목에는 삭제 기록을 자동으로 남긴다.
// (항목마다 코드를 고치지 않아도 되고, 병합이 "누가 더 최근에 바꿨는지"를 알 수 있게 된다.)
let tracking = true; // 파일에서 불러오거나 병합한 결과를 넣을 때는 끈다

type TrackedFields = Pick<
  PlanningState,
  | 'lifeLines'
  | 'topGoals'
  | 'roadmapNodes'
  | 'dailyGoals'
  | 'events'
  | 'routineBlocks'
  | 'widgets'
  | 'tombstones'
>;

function stampChanges(state: TrackedFields, patch: Partial<TrackedFields>): Partial<TrackedFields> {
  const now = Date.now();
  const out: Partial<TrackedFields> = { ...patch };
  let tombstones = state.tombstones;
  for (const key of COLLECTIONS as readonly CollectionKey[]) {
    const next = patch[key] as { id: string; updatedAt?: number }[] | undefined;
    if (!next) continue;
    const prev = state[key] as { id: string; updatedAt?: number }[];
    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set<string>();
    let changed = false;
    const stamped = next.map((item) => {
      nextIds.add(item.id);
      if (prevById.get(item.id) === item) return item;
      changed = true;
      return { ...item, updatedAt: now };
    });
    for (const old of prev) {
      if (nextIds.has(old.id)) continue;
      if (tombstones === state.tombstones) tombstones = { ...tombstones };
      tombstones[`${key}:${old.id}`] = now;
    }
    (out as Record<string, unknown>)[key] = changed ? stamped : next;
  }
  if (tombstones !== state.tombstones) out.tombstones = tombstones;
  return out;
}

interface PlanningState {
  lifeLines: LifeLineItem[];
  topGoals: TopGoal[];
  roadmapNodes: RoadmapNode[];
  dailyGoals: DailyGoalItem[];
  events: CalendarEvent[];
  routineBlocks: RoutineBlock[];
  widgets: CanvasWidget[];
  tombstones: Record<string, number>; // 지운 항목 기록('컬렉션:id' -> 지운 시각)

  addLifeLine: (title: string) => void;
  updateLifeLine: (id: string, title: string) => void;
  moveLifeLine: (id: string, direction: MoveDirection) => void;
  deleteLifeLine: (id: string) => void;

  addTopGoal: (title: string) => void;
  updateTopGoal: (id: string, title: string) => void;
  moveTopGoal: (id: string, direction: MoveDirection) => void;
  deleteTopGoal: (id: string) => void;

  addRoadmapNode: (topGoalId: string, parentId: string | null, title: string) => void;
  updateRoadmapNode: (id: string, title: string) => void;
  moveRoadmapNode: (id: string, direction: MoveDirection) => void;
  deleteRoadmapNode: (id: string) => void;

  addDailyGoal: (date: string, title: string, roadmapNodeId?: string | null) => void;
  updateDailyGoal: (id: string, title: string) => void;
  moveDailyGoal: (id: string, direction: MoveDirection) => void;
  toggleDailyGoalDone: (id: string) => void;
  deleteDailyGoal: (id: string) => void;

  addEvent: (event: Omit<CalendarEvent, 'id'>) => string;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;

  addRoutineBlock: (block: Omit<RoutineBlock, 'id'>) => string;
  updateRoutineBlock: (id: string, patch: Partial<Omit<RoutineBlock, 'id'>>) => void;
  deleteRoutineBlock: (id: string) => void;

  addWidget: (type: WidgetType, config?: Record<string, string>) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  removeWidget: (id: string) => void;
  bringToFront: (id: string) => void;
  setWidgetConfig: (id: string, config: Record<string, string>) => void;
  toggleWidgetGuideVisible: (id: string) => void;

  getSnapshot: () => PlanningSnapshot;
  loadSnapshot: (snapshot: PlanningSnapshot) => void;
}

const emptyState = {
  lifeLines: [],
  topGoals: [],
  roadmapNodes: [],
  dailyGoals: [],
  events: [],
  routineBlocks: [],
  widgets: [],
  tombstones: {},
};

export const usePlanningStore = create<PlanningState>()((rawSet, get) => {
  const set: typeof rawSet = (partial, replace) =>
    rawSet(
      (state) => {
        const patch = typeof partial === 'function' ? partial(state) : partial;
        return tracking ? stampChanges(state, patch as Partial<TrackedFields>) : patch;
      },
      replace as false | undefined,
    );
  return {
    ...emptyState,

    addLifeLine: (title) =>
      set((s) => ({
        lifeLines: [...s.lifeLines, { id: createId(), title, createdAt: Date.now() }],
      })),
    updateLifeLine: (id, title) =>
      set((s) => ({ lifeLines: s.lifeLines.map((l) => (l.id === id ? { ...l, title } : l)) })),
    moveLifeLine: (id, direction) => set((s) => ({ lifeLines: moveById(s.lifeLines, id, direction) })),
    deleteLifeLine: (id) => set((s) => ({ lifeLines: s.lifeLines.filter((l) => l.id !== id) })),

    addTopGoal: (title) =>
      set((s) => ({
        topGoals: [...s.topGoals, { id: createId(), title, createdAt: Date.now() }],
      })),
    updateTopGoal: (id, title) =>
      set((s) => ({ topGoals: s.topGoals.map((g) => (g.id === id ? { ...g, title } : g)) })),
    moveTopGoal: (id, direction) => set((s) => ({ topGoals: moveById(s.topGoals, id, direction) })),
    deleteTopGoal: (id) =>
      set((s) => ({
        topGoals: s.topGoals.filter((g) => g.id !== id),
        roadmapNodes: s.roadmapNodes.filter((n) => n.topGoalId !== id),
      })),

    addRoadmapNode: (topGoalId, parentId, title) =>
      set((s) => ({
        roadmapNodes: [
          ...s.roadmapNodes,
          { id: createId(), topGoalId, parentId, title, createdAt: Date.now() },
        ],
      })),
    updateRoadmapNode: (id, title) =>
      set((s) => ({
        roadmapNodes: s.roadmapNodes.map((n) => (n.id === id ? { ...n, title } : n)),
      })),
    // 같은 부모(형제) 안에서만 순서를 바꾼다. moveDailyGoal과 같은 방식으로
    // 형제끼리만 뽑아 순서를 바꾼 뒤 원래 있던 자리에 다시 끼워 넣는다.
    moveRoadmapNode: (id, direction) =>
      set((s) => {
        const node = s.roadmapNodes.find((n) => n.id === id);
        if (!node) return {};
        const siblings = s.roadmapNodes.filter(
          (n) => n.topGoalId === node.topGoalId && n.parentId === node.parentId,
        );
        const reordered = moveById(siblings, id, direction);
        if (reordered === siblings) return {};
        let i = 0;
        return {
          roadmapNodes: s.roadmapNodes.map((n) =>
            n.topGoalId === node.topGoalId && n.parentId === node.parentId ? reordered[i++] : n,
          ),
        };
      }),
    deleteRoadmapNode: (id) =>
      set((s) => {
        const toDelete = new Set([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of s.roadmapNodes) {
            if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
              toDelete.add(n.id);
              changed = true;
            }
          }
        }
        return { roadmapNodes: s.roadmapNodes.filter((n) => !toDelete.has(n.id)) };
      }),

    addDailyGoal: (date, title, roadmapNodeId = null) =>
      set((s) => ({
        dailyGoals: [
          ...s.dailyGoals,
          { id: createId(), date, title, roadmapNodeId, done: false, createdAt: Date.now() },
        ],
      })),
    updateDailyGoal: (id, title) =>
      set((s) => ({
        dailyGoals: s.dailyGoals.map((g) => (g.id === id ? { ...g, title } : g)),
      })),
    // dailyGoals는 모든 날의 항목을 한 배열에 같이 담고 있어서, 같은 날 항목끼리만
    // 뽑아 순서를 바꾼 뒤 원래 자리(그 날 항목이 있던 인덱스들)에 다시 끼워 넣는다.
    moveDailyGoal: (id, direction) =>
      set((s) => {
        const goal = s.dailyGoals.find((g) => g.id === id);
        if (!goal) return {};
        const sameDay = s.dailyGoals.filter((g) => g.date === goal.date);
        const reordered = moveById(sameDay, id, direction);
        if (reordered === sameDay) return {};
        let i = 0;
        return {
          dailyGoals: s.dailyGoals.map((g) => (g.date === goal.date ? reordered[i++] : g)),
        };
      }),
    toggleDailyGoalDone: (id) =>
      set((s) => ({
        dailyGoals: s.dailyGoals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
      })),
    deleteDailyGoal: (id) =>
      set((s) => ({
        dailyGoals: s.dailyGoals.filter((g) => g.id !== id),
      })),

    addEvent: (event) => {
      const id = createId();
      set((s) => ({ events: [...s.events, { ...event, id }] }));
      return id;
    },
    updateEvent: (id, patch) =>
      set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

    addRoutineBlock: (block) => {
      const id = createId();
      set((s) => ({ routineBlocks: [...s.routineBlocks, { ...block, id }] }));
      return id;
    },
    updateRoutineBlock: (id, patch) =>
      set((s) => ({
        routineBlocks: s.routineBlocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),
    deleteRoutineBlock: (id) => set((s) => ({ routineBlocks: s.routineBlocks.filter((b) => b.id !== id) })),

    addWidget: (type, config) =>
      set((s) => {
        const { width, height } = DEFAULT_SIZE[type];
        const { x, y } = nextPlacement();
        const maxZ = s.widgets.reduce((m, w) => Math.max(m, w.zIndex), 0);
        const widget: CanvasWidget = {
          id: createId(),
          type,
          x,
          y,
          width,
          height,
          zIndex: maxZ + 1,
          config,
        };
        return { widgets: [...s.widgets, widget] };
      }),
    moveWidget: (id, x, y) =>
      set((s) => ({ widgets: s.widgets.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
    removeWidget: (id) => set((s) => ({ widgets: s.widgets.filter((w) => w.id !== id) })),
    bringToFront: (id) =>
      set((s) => {
        const maxZ = s.widgets.reduce((m, w) => Math.max(m, w.zIndex), 0);
        return {
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w)),
        };
      }),
    setWidgetConfig: (id, config) =>
      set((s) => ({
        widgets: s.widgets.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...config } } : w)),
      })),
    toggleWidgetGuideVisible: (id) =>
      set((s) => ({
        widgets: s.widgets.map((w) => (w.id === id ? { ...w, guideVisible: !(w.guideVisible ?? true) } : w)),
      })),

    getSnapshot: () => {
      const s = get();
      return {
        lifeLines: s.lifeLines,
        topGoals: s.topGoals,
        roadmapNodes: s.roadmapNodes,
        dailyGoals: s.dailyGoals,
        events: s.events,
        routineBlocks: s.routineBlocks,
        widgets: s.widgets,
        tombstones: s.tombstones,
        updatedAt: Date.now(),
      };
    },
    loadSnapshot: (snapshot) => {
      tracking = false; // 불러온 내용은 "내가 방금 바꾼 것"이 아니므로 수정 시각을 새로 찍지 않는다
      try {
        set({
          lifeLines: snapshot.lifeLines ?? [],
          topGoals: snapshot.topGoals ?? [],
          roadmapNodes: snapshot.roadmapNodes ?? [],
          dailyGoals: migrateDailyGoals(snapshot),
          events: snapshot.events ?? [],
          routineBlocks: snapshot.routineBlocks ?? [],
          // 이전 버전 파일에는 지금은 없는 위젯 종류가 들어있을 수 있어 걸러낸다.
          widgets: (snapshot.widgets ?? [])
            .map((w) => ((w.type as string) === 'weeklyGoal' ? { ...w, type: 'dailyGoal' as const } : w))
            .filter((w) => w.type in DEFAULT_SIZE),
          tombstones: snapshot.tombstones ?? {},
        });
      } finally {
        tracking = true;
      }
    },
  };
});
