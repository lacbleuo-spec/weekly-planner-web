// 위크보드 6단계 플래닝 구조:
// 인생 한 줄 -> 최상위 목표 -> 로드맵 -> 주간 목표 -> 주간 타임라인 -> 일간 목표

export type WidgetType =
  | 'lifeLine'
  | 'topGoal'
  | 'roadmap'
  | 'weeklyGoal'
  | 'dailyGoal'
  | 'timetable'
  | 'weeklyTimeline';

export interface LifeLineItem {
  id: string;
  title: string;
  createdAt: number;
}

export interface TopGoal {
  id: string;
  title: string;
  createdAt: number;
}

export interface RoadmapNode {
  id: string;
  topGoalId: string;
  parentId: string | null;
  title: string;
  createdAt: number;
}

export interface WeeklyGoalItem {
  id: string;
  weekId: string; // e.g. 2026-W34
  roadmapNodeId: string | null;
  title: string;
  done: boolean;
  createdAt: number;
}

// 아이폰 캘린더처럼 실제 날짜/시각을 갖는 일정. 여러 날에 걸칠 수도 있다.
export interface CalendarEvent {
  id: string;
  title: string;
  startAt: number; // epoch ms
  endAt: number; // epoch ms
  allDay: boolean;
  alarmMinutesBefore: number | null; // null = 알림 없음, 0 = 이벤트 시간에, 그 외 = 시작 전 분(分)
  color: string;
}

export interface DailyAssignment {
  id: string;
  weeklyGoalId: string;
  date: string; // YYYY-MM-DD
  done: boolean;
}

// 대학교 시간표처럼 특정 날짜가 아니라 요일마다 매주 반복되는 루틴.
export interface RoutineBlock {
  id: string;
  dayOfWeek: number; // 0 = Mon ... 6 = Sun
  startHour: number; // 0-24, 30분 단위는 소수점(.5)로 표현
  endHour: number;
  title: string;
  color: string;
}

// 자유배치 캔버스 위의 위젯 인스턴스.
// config는 위젯별로 다른 참조값을 담는다 (예: roadmap의 topGoalId).
export interface CanvasWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  config?: Record<string, string>;
  // 위젯 헤더의 눈 아이콘으로 가이드 말풍선을 따로 껐다 켤 수 있게 한다. 기본값(undefined)은 켜짐이다.
  guideVisible?: boolean;
}

export interface PlanningSnapshot {
  lifeLines: LifeLineItem[];
  topGoals: TopGoal[];
  roadmapNodes: RoadmapNode[];
  weeklyGoals: WeeklyGoalItem[];
  events: CalendarEvent[];
  routineBlocks: RoutineBlock[];
  dailyAssignments: DailyAssignment[];
  widgets: CanvasWidget[];
  updatedAt: number;
}
