import { create } from 'zustand';

import { createId } from '../lib/id';
import type {
  CalendarEvent,
  CanvasWidget,
  DailyAssignment,
  LifeLineItem,
  PlanningSnapshot,
  RoadmapNode,
  RoutineBlock,
  TopGoal,
  WeeklyGoalItem,
  WidgetType,
} from '../types/planning';

const DEFAULT_SIZE: Record<WidgetType, { width: number; height: number }> = {
  lifeLine: { width: 300, height: 320 },
  topGoal: { width: 300, height: 320 },
  roadmap: { width: 320, height: 360 },
  weeklyGoal: { width: 300, height: 340 },
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

interface PlanningState {
  lifeLines: LifeLineItem[];
  topGoals: TopGoal[];
  roadmapNodes: RoadmapNode[];
  weeklyGoals: WeeklyGoalItem[];
  events: CalendarEvent[];
  routineBlocks: RoutineBlock[];
  dailyAssignments: DailyAssignment[];
  widgets: CanvasWidget[];

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

  addWeeklyGoal: (weekId: string, title: string, roadmapNodeId?: string | null) => void;
  updateWeeklyGoal: (id: string, title: string) => void;
  moveWeeklyGoal: (id: string, direction: MoveDirection) => void;
  toggleWeeklyGoalDone: (id: string) => void;
  deleteWeeklyGoal: (id: string) => void;

  addEvent: (event: Omit<CalendarEvent, 'id'>) => string;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;

  addRoutineBlock: (block: Omit<RoutineBlock, 'id'>) => string;
  updateRoutineBlock: (id: string, patch: Partial<Omit<RoutineBlock, 'id'>>) => void;
  deleteRoutineBlock: (id: string) => void;

  assignDailyGoal: (weeklyGoalId: string, date: string) => void;
  toggleDailyAssignmentDone: (id: string) => void;
  unassignDailyGoal: (id: string) => void;

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
  weeklyGoals: [],
  events: [],
  routineBlocks: [],
  dailyAssignments: [],
  widgets: [],
};

export const usePlanningStore = create<PlanningState>()((set, get) => ({
  ...emptyState,

      addLifeLine: (title) =>
        set((s) => ({
          lifeLines: [...s.lifeLines, { id: createId(), title, createdAt: Date.now() }],
        })),
      updateLifeLine: (id, title) =>
        set((s) => ({ lifeLines: s.lifeLines.map((l) => (l.id === id ? { ...l, title } : l)) })),
      moveLifeLine: (id, direction) =>
        set((s) => ({ lifeLines: moveById(s.lifeLines, id, direction) })),
      deleteLifeLine: (id) =>
        set((s) => ({ lifeLines: s.lifeLines.filter((l) => l.id !== id) })),

      addTopGoal: (title) =>
        set((s) => ({
          topGoals: [...s.topGoals, { id: createId(), title, createdAt: Date.now() }],
        })),
      updateTopGoal: (id, title) =>
        set((s) => ({ topGoals: s.topGoals.map((g) => (g.id === id ? { ...g, title } : g)) })),
      moveTopGoal: (id, direction) =>
        set((s) => ({ topGoals: moveById(s.topGoals, id, direction) })),
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
      // 같은 부모(형제) 안에서만 순서를 바꾼다. moveWeeklyGoal과 같은 방식으로
      // 형제끼리만 뽑아 순서를 바꾼 뒤 원래 있던 자리에 다시 끼워 넣는다.
      moveRoadmapNode: (id, direction) =>
        set((s) => {
          const node = s.roadmapNodes.find((n) => n.id === id);
          if (!node) return {};
          const siblings = s.roadmapNodes.filter(
            (n) => n.topGoalId === node.topGoalId && n.parentId === node.parentId
          );
          const reordered = moveById(siblings, id, direction);
          if (reordered === siblings) return {};
          let i = 0;
          return {
            roadmapNodes: s.roadmapNodes.map((n) =>
              n.topGoalId === node.topGoalId && n.parentId === node.parentId
                ? reordered[i++]
                : n
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

      addWeeklyGoal: (weekId, title, roadmapNodeId = null) =>
        set((s) => ({
          weeklyGoals: [
            ...s.weeklyGoals,
            { id: createId(), weekId, title, roadmapNodeId, done: false, createdAt: Date.now() },
          ],
        })),
      updateWeeklyGoal: (id, title) =>
        set((s) => ({
          weeklyGoals: s.weeklyGoals.map((g) => (g.id === id ? { ...g, title } : g)),
        })),
      // weeklyGoals는 모든 주의 항목을 한 배열에 같이 담고 있어서, 같은 주 항목끼리만
      // 뽑아 순서를 바꾼 뒤 원래 자리(그 주 항목이 있던 인덱스들)에 다시 끼워 넣는다.
      moveWeeklyGoal: (id, direction) =>
        set((s) => {
          const goal = s.weeklyGoals.find((g) => g.id === id);
          if (!goal) return {};
          const sameWeek = s.weeklyGoals.filter((g) => g.weekId === goal.weekId);
          const reordered = moveById(sameWeek, id, direction);
          if (reordered === sameWeek) return {};
          let i = 0;
          return {
            weeklyGoals: s.weeklyGoals.map((g) => (g.weekId === goal.weekId ? reordered[i++] : g)),
          };
        }),
      toggleWeeklyGoalDone: (id) =>
        set((s) => ({
          weeklyGoals: s.weeklyGoals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
        })),
      deleteWeeklyGoal: (id) =>
        set((s) => ({
          weeklyGoals: s.weeklyGoals.filter((g) => g.id !== id),
          dailyAssignments: s.dailyAssignments.filter((a) => a.weeklyGoalId !== id),
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
      deleteRoutineBlock: (id) =>
        set((s) => ({ routineBlocks: s.routineBlocks.filter((b) => b.id !== id) })),

      assignDailyGoal: (weeklyGoalId, date) =>
        set((s) => ({
          dailyAssignments: [
            ...s.dailyAssignments,
            { id: createId(), weeklyGoalId, date, done: false },
          ],
        })),
      toggleDailyAssignmentDone: (id) =>
        set((s) => ({
          dailyAssignments: s.dailyAssignments.map((a) =>
            a.id === id ? { ...a, done: !a.done } : a
          ),
        })),
      unassignDailyGoal: (id) =>
        set((s) => ({ dailyAssignments: s.dailyAssignments.filter((a) => a.id !== id) })),

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
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...config } } : w
          ),
        })),
      toggleWidgetGuideVisible: (id) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, guideVisible: !(w.guideVisible ?? true) } : w
          ),
        })),

      getSnapshot: () => {
        const s = get();
        return {
          lifeLines: s.lifeLines,
          topGoals: s.topGoals,
          roadmapNodes: s.roadmapNodes,
          weeklyGoals: s.weeklyGoals,
          events: s.events,
          routineBlocks: s.routineBlocks,
          dailyAssignments: s.dailyAssignments,
          widgets: s.widgets,
          updatedAt: Date.now(),
        };
      },
      loadSnapshot: (snapshot) =>
        set({
          lifeLines: snapshot.lifeLines ?? [],
          topGoals: snapshot.topGoals ?? [],
          roadmapNodes: snapshot.roadmapNodes ?? [],
          weeklyGoals: snapshot.weeklyGoals ?? [],
          events: snapshot.events ?? [],
          routineBlocks: snapshot.routineBlocks ?? [],
          dailyAssignments: snapshot.dailyAssignments ?? [],
          widgets: snapshot.widgets ?? [],
        }),
    })
);
