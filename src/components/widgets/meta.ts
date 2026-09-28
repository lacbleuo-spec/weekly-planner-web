import {
  Calendar,
  CheckSquare,
  Compass,
  Map,
  Sun,
  Table2,
  Target,
  type LucideIcon,
} from 'lucide-react';

import type { WidgetType } from '../../types/planning';

export const WIDGET_ORDER: WidgetType[] = [
  'lifeLine',
  'topGoal',
  'roadmap',
  'weeklyGoal',
  'dailyGoal',
  'timetable',
  'weeklyTimeline',
];

export const WIDGET_ICONS: Record<WidgetType, LucideIcon> = {
  lifeLine: Compass,
  topGoal: Target,
  roadmap: Map,
  weeklyGoal: CheckSquare,
  dailyGoal: Sun,
  timetable: Table2,
  weeklyTimeline: Calendar,
};
