// PlannerResponsiveLayout

'use client';

import { dayKey } from '@/lib/date';

export function PlannerResponsiveLayout({
  globalSidebar,
  weekSidebar,
  weekDates,
  renderDay,
}: {
  globalSidebar: React.ReactNode;
  weekSidebar: React.ReactNode;
  weekDates: Date[];
  renderDay: (date: Date) => React.ReactNode;
}) {
  const columns = [
    [weekDates[0], weekDates[1]],
    [weekDates[2], weekDates[3]],
    [weekDates[4], weekDates[5]],
    [weekDates[6]],
  ];

  return (
    <div className='scrollbar-hide mx-auto max-w-2xl overflow-hidden p-5 xl:max-w-none xl:overflow-x-auto xl:p-6'>
      <div className='w-[111.111%] origin-top-left scale-90 xl:w-[1728px] xl:scale-85'>
        <div className='space-y-5 xl:grid xl:w-[1920px] xl:grid-cols-[280px_320px_320px_320px_320px_320px] xl:items-start xl:gap-5 xl:space-y-0'>
          <div className='space-y-5'>{globalSidebar}</div>

          <div className='space-y-5'>{weekSidebar}</div>

          {columns.map((dates, columnIndex) => (
            <div key={columnIndex} className='space-y-3.5'>
              {dates.map((date) => (
                <div key={dayKey(date)}>{renderDay(date)}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
