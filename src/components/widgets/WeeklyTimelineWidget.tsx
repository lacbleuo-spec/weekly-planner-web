import { Bell, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDict } from '../../i18n';
import type { Dictionary } from '../../i18n/ko';
import {
  addDays,
  addMonths,
  formatDate,
  formatDateLabel,
  formatTime12,
  isSameDay,
  startOfDay,
  startOfMonth,
} from '../../lib/date';
import { PALETTE } from '../../lib/palette';
import { usePlanningStore } from '../../store/usePlanningStore';
import type { CalendarEvent } from '../../types/planning';

// 아이폰 캘린더의 미리 알림 프리셋
const ALARM_OPTIONS: { key: string; minutes: number | null }[] = [
  { key: 'none', minutes: null },
  { key: 'atTime', minutes: 0 },
  { key: 'min5', minutes: 5 },
  { key: 'min10', minutes: 10 },
  { key: 'min15', minutes: 15 },
  { key: 'min30', minutes: 30 },
  { key: 'hour1', minutes: 60 },
  { key: 'hour2', minutes: 120 },
  { key: 'day1', minutes: 1440 },
  { key: 'day2', minutes: 2880 },
  { key: 'week1', minutes: 10080 },
];

function alarmLabel(t: Dictionary['widgets']['weeklyTimeline'], key: string): string {
  switch (key) {
    case 'atTime':
      return t.alarmAtTime;
    case 'min5':
      return t.alarmMin5;
    case 'min10':
      return t.alarmMin10;
    case 'min15':
      return t.alarmMin15;
    case 'min30':
      return t.alarmMin30;
    case 'hour1':
      return t.alarmHour1;
    case 'hour2':
      return t.alarmHour2;
    case 'day1':
      return t.alarmDay1;
    case 'day2':
      return t.alarmDay2;
    case 'week1':
      return t.alarmWeek1;
    default:
      return t.alarmNone;
  }
}

function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStartMs = startOfDay(day).getTime();
  const dayEndMs = addDays(startOfDay(day), 1).getTime();
  return events
    .filter((e) => e.startAt < dayEndMs && e.endAt > dayStartMs)
    .sort((a, b) => (a.allDay === b.allDay ? a.startAt - b.startAt : a.allDay ? -1 : 1));
}

// 시작일과 종료일이 다른 이벤트는, 보고 있는 날짜가 시작일인지 종료일인지에 따라
// 그날 해당하는 시각만 보여준다 (시작일엔 시작 시각, 종료일엔 종료 시각).
function timeLabelFor(e: CalendarEvent, day: Date, allDayText: string): string {
  if (e.allDay) return allDayText;
  const dayStartMs = startOfDay(day).getTime();
  const dayEndMs = addDays(startOfDay(day), 1).getTime();
  const startsToday = e.startAt >= dayStartMs && e.startAt < dayEndMs;
  const endsToday = e.endAt > dayStartMs && e.endAt <= dayEndMs;
  if (startsToday && endsToday) {
    return `${formatTime12(new Date(e.startAt))} - ${formatTime12(new Date(e.endAt))}`;
  }
  if (startsToday) return `${formatTime12(new Date(e.startAt))} →`;
  if (endsToday) return `→ ${formatTime12(new Date(e.endAt))}`;
  return allDayText;
}

// 아이폰 캘린더처럼 항상 6주(42칸)를 채우되, 마지막 줄이 전부 다음 달이면 생략한다.
function buildMonthGrid(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  const gridStart = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const lastRow = days.slice(35, 42);
  if (lastRow.every((d) => d.getMonth() !== viewMonth.getMonth())) {
    return days.slice(0, 35);
  }
  return days;
}

export function WeeklyTimelineWidget() {
  const dict = useDict();
  const t = dict.widgets.weeklyTimeline;

  const events = usePlanningStore((s) => s.events);
  const addEvent = usePlanningStore((s) => s.addEvent);
  const deleteEvent = usePlanningStore((s) => s.deleteEvent);

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));

  const gridDays = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const dayEvents = useMemo(() => eventsOnDay(events, selectedDate), [events, selectedDate]);

  const goToday = () => {
    const today = startOfDay(new Date());
    setViewMonth(startOfMonth(today));
    setSelectedDate(today);
  };
  const shiftMonth = (delta: number) => {
    const next = addMonths(viewMonth, delta);
    setViewMonth(next);
    setSelectedDate(next);
  };
  const selectDay = (d: Date) => {
    setSelectedDate(d);
    if (d.getMonth() !== viewMonth.getMonth()) setViewMonth(startOfMonth(d));
  };

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(formatDate(selectedDate));
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(formatDate(selectedDate));
  const [endTime, setEndTime] = useState('10:00');
  const [alarmKey, setAlarmKey] = useState('none');
  const [rangeError, setRangeError] = useState(false);

  const openForm = () => {
    setTitle('');
    setAllDay(false);
    setStartDate(formatDate(selectedDate));
    setStartTime('09:00');
    setEndDate(formatDate(selectedDate));
    setEndTime('10:00');
    setAlarmKey('none');
    setRangeError(false);
    setShowForm(true);
  };

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const start = allDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}:00`);
    const end = allDay ? new Date(`${endDate}T23:59:59`) : new Date(`${endDate}T${endTime}:00`);
    if (end.getTime() <= start.getTime()) {
      setRangeError(true);
      return;
    }
    setRangeError(false);
    const alarmMinutesBefore = ALARM_OPTIONS.find((o) => o.key === alarmKey)?.minutes ?? null;
    addEvent({
      title: trimmed,
      startAt: start.getTime(),
      endAt: end.getTime(),
      allDay,
      alarmMinutesBefore,
      color: PALETTE[0],
    });
    setShowForm(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex shrink-0 items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="text-subink hover:text-accent">
          <ChevronLeft size={16} />
        </button>
        <button onClick={goToday} className="text-[13px] font-semibold text-ink">
          {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
        </button>
        <button onClick={() => shiftMonth(1)} className="text-subink hover:text-accent">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid shrink-0 grid-cols-7 text-center">
        {dict.date.weekdaysShort.map((w, i) => (
          <span key={i} className="text-[10px] text-faint">
            {w}
          </span>
        ))}
      </div>

      <div className="mb-1.5 grid shrink-0 grid-cols-7 gap-y-0.5">
        {gridDays.map((d, i) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isSelected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, new Date());
          const dots = eventsOnDay(events, d).slice(0, 3);
          return (
            <button key={i} onClick={() => selectDay(d)} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] transition ${
                  isSelected
                    ? 'bg-ink font-semibold text-white'
                    : isToday
                      ? 'font-semibold text-danger'
                      : inMonth
                        ? 'text-ink'
                        : 'text-faint/50'
                }`}
              >
                {d.getDate()}
              </span>
              <span className="flex h-1 gap-0.5">
                {dots.map((e) => (
                  <span key={e.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: e.color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {showForm ? (
        <>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-line pt-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitlePlaceholder}
              className="w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <label className="flex items-center justify-between text-[12.5px] text-subink">
              {t.allDayLabel}
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <div className="flex items-center gap-1.5 text-[12px] text-subink">
              <span className="w-9 shrink-0">{t.startsLabel}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangeError(false);
                }}
                className={`shrink-0 rounded-control border border-line bg-canvas px-1.5 py-1 text-[12px] text-ink ${allDay ? 'flex-1' : 'w-[128px]'}`}
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setRangeError(false);
                  }}
                  className="min-w-0 flex-1 rounded-control border border-line bg-canvas px-1.5 py-1 text-[12px] text-ink"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-subink">
              <span className="w-9 shrink-0">{t.endsLabel}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangeError(false);
                }}
                className={`shrink-0 rounded-control border bg-canvas px-1.5 py-1 text-[12px] text-ink ${rangeError ? 'border-danger' : 'border-line'} ${allDay ? 'flex-1' : 'w-[128px]'}`}
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setRangeError(false);
                  }}
                  className={`min-w-0 flex-1 rounded-control border bg-canvas px-1.5 py-1 text-[12px] text-ink ${rangeError ? 'border-danger' : 'border-line'}`}
                />
              )}
            </div>
            {rangeError && <p className="text-[11.5px] text-danger">{t.rangeError}</p>}
            <label className="flex items-center justify-between text-[12.5px] text-subink">
              {t.alarmLabel}
              <select
                value={alarmKey}
                onChange={(e) => setAlarmKey(e.target.value)}
                className="rounded-control border border-line bg-canvas px-1.5 py-1 text-[12px] text-ink"
              >
                {ALARM_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {alarmLabel(t, o.key)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex shrink-0 gap-1.5 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-control py-1.5 text-[12.5px] font-medium text-subink transition hover:bg-canvas"
            >
              {t.cancel}
            </button>
            <button
              onClick={save}
              className="flex-1 rounded-control bg-accent py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-strong"
            >
              {t.save}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line pt-2">
            <p className="mb-1 text-[11px] font-medium text-faint">
              {formatDateLabel(selectedDate, dict.date.weekdaysShort)}
            </p>
            {dayEvents.length === 0 ? (
              <p className="text-[12.5px] text-faint">{t.noEvents}</p>
            ) : (
              dayEvents.map((e) => (
                <div key={e.id} className="group flex items-center gap-2 py-1.5">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{e.title}</p>
                    <p className="flex items-center gap-1 text-[11px] text-faint">
                      <span className="truncate">{timeLabelFor(e, selectedDate, t.allDay)}</span>
                      {e.alarmMinutesBefore !== null && <Bell size={10} className="shrink-0" />}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="shrink-0 text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={openForm}
            className="mt-2 flex shrink-0 items-center justify-center gap-1 border-t border-line pt-2 text-[12.5px] font-medium text-accent transition hover:text-accent-strong"
          >
            <Plus size={13} />
            {t.addEvent}
          </button>
        </>
      )}
    </div>
  );
}
