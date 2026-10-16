import { Bell, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useDict } from '../../i18n';
import type { Dictionary } from '../../i18n/ko';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  formatDate,
  formatDateLabel,
  formatDatePill,
  formatMonthLabel,
  formatTime12,
  parseDate,
  isSameDay,
  startOfDay,
  startOfMonth,
} from '../../lib/date';
import { PALETTE } from '../../lib/palette';
import { DatePanel } from '../ui/DatePanel';
import { TimePanel } from '../ui/TimePanel';
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
function timeLabelFor(
  e: CalendarEvent,
  day: Date,
  allDayText: string,
  strings: Dictionary['date']
): string {
  if (e.allDay) return allDayText;
  const dayStartMs = startOfDay(day).getTime();
  const dayEndMs = addDays(startOfDay(day), 1).getTime();
  const startsToday = e.startAt >= dayStartMs && e.startAt < dayEndMs;
  const endsToday = e.endAt > dayStartMs && e.endAt <= dayEndMs;
  if (startsToday && endsToday) {
    return `${formatTime12(new Date(e.startAt), strings)} - ${formatTime12(new Date(e.endAt), strings)}`;
  }
  if (startsToday) return `${formatTime12(new Date(e.startAt), strings)} →`;
  if (endsToday) return `→ ${formatTime12(new Date(e.endAt), strings)}`;
  return allDayText;
}

type PickerKey = 'startDate' | 'startTime' | 'endDate' | 'endTime';

// 아이폰 일정 편집의 날짜/시간 칩. 눌러서 아래 선택 패널을 펼치면 강조색으로 보인다.
function Pill({
  active,
  invalid = false,
  onClick,
  children,
}: {
  active: boolean;
  invalid?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={active}
      className={`rounded-control px-2.5 py-1 text-[12.5px] transition ${
        active
          ? 'bg-accent-soft font-medium text-accent'
          : invalid
            ? 'bg-canvas text-danger'
            : 'bg-canvas text-ink hover:bg-line'
      }`}
    >
      {children}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
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
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 아이폰 일정처럼, 시작을 바꾸면 종료도 같은 간격만큼 같이 옮겨서 "종료가 시작보다 빠름"이 생기지 않게 한다.
  const changeStart = (nextDate: string, nextTime: string) => {
    const toMs = (d: string, t: string) => new Date(`${d}T${t}:00`).getTime();
    const delta = toMs(nextDate, nextTime) - toMs(startDate, startTime);
    const end = new Date(toMs(endDate, endTime) + delta);
    setEndDate(formatDate(end));
    setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    setStartDate(nextDate);
    setStartTime(nextTime);
    setRangeError(false);
  };
  const togglePicker = (key: PickerKey) => setPicker((p) => (p === key ? null : key));
  const timeText = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return formatTime12(new Date(2000, 0, 1, h, m), dict.date);
  };

  // 패널이 펼쳐지면 스크롤 영역 안에서 보이는 위치로 옮긴다.
  useEffect(() => {
    if (picker) panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [picker]);

  const openForm = () => {
    setTitle('');
    setAllDay(false);
    setStartDate(formatDate(selectedDate));
    setStartTime('09:00');
    setEndDate(formatDate(selectedDate));
    setEndTime('10:00');
    setAlarmKey('none');
    setRangeError(false);
    setPicker(null);
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
      {/* 일정 폼이 열려 있을 때는 폼이 날짜를 고르므로, 위쪽 달력은 접어서 자리를 비운다. */}
      {!showForm && (
        <>
          <div className="mb-1.5 flex shrink-0 items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label={dict.date.prevMonth}
              className="text-subink hover:text-accent"
            >
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="text-[13px] font-semibold text-ink">
              {formatMonthLabel(viewMonth, dict.date)}
            </button>
            <button
              onClick={() => shiftMonth(1)}
              aria-label={dict.date.nextMonth}
              className="text-subink hover:text-accent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid shrink-0 grid-cols-7 text-center">
            {dict.date.weekdaysMonFirst.map((w, i) => (
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
                <button
                  key={i}
                  onClick={() => selectDay(d)}
                  aria-label={formatDateLabel(d, dict.date)}
                  className="flex flex-col items-center gap-0.5 py-0.5"
                >
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
        </>
      )}

      {showForm ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto pt-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitlePlaceholder}
              className="w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <div className="flex items-center justify-between pt-3">
              <span className="text-[12.5px] text-subink">{t.allDayLabel}</span>
              <Switch
                checked={allDay}
                label={t.allDayLabel}
                onChange={(v) => {
                  setAllDay(v);
                  setPicker((p) => (v && (p === 'startTime' || p === 'endTime') ? null : p));
                }}
              />
            </div>
            <div className="pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-subink">{t.startsLabel}</span>
                <div className="flex items-center gap-1.5">
                  <Pill active={picker === 'startDate'} onClick={() => togglePicker('startDate')}>
                    {formatDatePill(parseDate(startDate), dict.date)}
                  </Pill>
                  {!allDay && (
                    <Pill active={picker === 'startTime'} onClick={() => togglePicker('startTime')}>
                      {timeText(startTime)}
                    </Pill>
                  )}
                </div>
              </div>
              {picker === 'startDate' && (
                <div ref={panelRef}>
                  <DatePanel
                    value={startDate}
                    onChange={(v) => changeStart(v, startTime)}
                  />
                </div>
              )}
              {picker === 'startTime' && !allDay && (
                <div ref={panelRef}>
                  <TimePanel
                    value={startTime}
                    onChange={(v) => changeStart(startDate, v)}
                  />
                </div>
              )}
            </div>
            <div className="pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-subink">{t.endsLabel}</span>
                <div className="flex items-center gap-1.5">
                  <Pill
                    active={picker === 'endDate'}
                    invalid={rangeError}
                    onClick={() => togglePicker('endDate')}
                  >
                    {formatDatePill(parseDate(endDate), dict.date)}
                  </Pill>
                  {!allDay && (
                    <Pill
                      active={picker === 'endTime'}
                      invalid={rangeError}
                      onClick={() => togglePicker('endTime')}
                    >
                      {timeText(endTime)}
                    </Pill>
                  )}
                </div>
              </div>
              {picker === 'endDate' && (
                <div ref={panelRef}>
                  <DatePanel
                    value={endDate}
                    onChange={(v) => {
                      setEndDate(v);
                      setRangeError(false);
                    }}
                  />
                </div>
              )}
              {picker === 'endTime' && !allDay && (
                <div ref={panelRef}>
                  <TimePanel
                    value={endTime}
                    onChange={(v) => {
                      setEndTime(v);
                      setRangeError(false);
                    }}
                  />
                </div>
              )}
            </div>
            {rangeError && <p className="pt-1 text-[11.5px] text-danger">{t.rangeError}</p>}
            <label className="flex items-center justify-between pt-3 text-[12.5px] text-subink">
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
              {formatDateLabel(selectedDate, dict.date)}
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
                      <span className="truncate">{timeLabelFor(e, selectedDate, t.allDay, dict.date)}</span>
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
