import {
  Calendar,
  CheckSquare,
  Compass,
  Map,
  Table2,
  Target,
  type LucideIcon,
} from 'lucide-react';

import type { WidgetType } from '../../types/planning';

export const WIDGET_ORDER: WidgetType[] = [
  'timetable',
  'weeklyTimeline',
  'lifeLine',
  'topGoal',
  'roadmap',
  'dailyGoal',
];

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  lifeLine: Compass,
  topGoal: Target,
  roadmap: Map,
  dailyGoal: CheckSquare,
  timetable: Table2,
  weeklyTimeline: Calendar,
};
