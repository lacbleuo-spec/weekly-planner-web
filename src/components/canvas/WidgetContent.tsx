import type { CanvasWidget } from '../../types/planning';
import { DailyGoalWidget } from '../widgets/DailyGoalWidget';
import { LifeLineWidget } from '../widgets/LifeLineWidget';
import { RoadmapWidget } from '../widgets/RoadmapWidget';
import { TimetableWidget } from '../widgets/TimetableWidget';
import { TopGoalWidget } from '../widgets/TopGoalWidget';
import { WeeklyTimelineWidget } from '../widgets/WeeklyTimelineWidget';

export function WidgetContent({ widget }: { widget: CanvasWidget }) {
  switch (widget.type) {
    case 'lifeLine':
      return <LifeLineWidget />;
    case 'topGoal':
      return <TopGoalWidget />;
    case 'roadmap':
      return <RoadmapWidget widgetId={widget.id} topGoalId={widget.config?.topGoalId} />;
    case 'dailyGoal':
      return <DailyGoalWidget />;
    case 'timetable':
      return <TimetableWidget />;
    case 'weeklyTimeline':
      return <WeeklyTimelineWidget />;
    default:
      return null;
  }
}
