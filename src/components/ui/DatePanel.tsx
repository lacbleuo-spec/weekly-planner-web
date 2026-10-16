import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDict } from '../../i18n';
import {
  addMonths,
  buildMonthGrid,
  formatDate,
  formatDateLabel,
  formatMonthLabel,
  isSameDay,
  parseDate,
  startOfMonth,
} from '../../lib/date';

interface DatePanelProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

// 아이폰 일정 편집처럼, 날짜 칩을 누르면 그 아래에 펼쳐지는 작은 달력.
// 브라우저 기본 날짜 입력칸은 앱 언어가 아니라 OS 언어로 그려져서 직접 그린다.
export function DatePanel({ value, onChange }: DatePanelProps) {
  const dict = useDict();
  const selected = parseDate(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));
  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = new Date();

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">
          {formatMonthLabel(viewMonth, dict.date)}
        </span>
        <div className="flex items-center gap-2 text-subink">
          <button
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label={dict.date.prevMonth}
            className="hover:text-accent"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label={dict.date.nextMonth}
            className="hover:text-accent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mb-0.5 grid grid-cols-7 text-center">
        {dict.date.weekdaysMonFirst.map((w, i) => (
          <span key={i} className="text-[10px] text-faint">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              onClick={() => onChange(formatDate(d))}
              aria-label={formatDateLabel(d, dict.date)}
              className="flex items-center justify-center py-0.5"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] transition ${
                  isSelected
                    ? 'bg-accent font-semibold text-white'
                    : isToday
                      ? 'font-semibold text-accent'
                      : inMonth
                        ? 'text-ink'
                        : 'text-faint/50'
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
