import type { Dictionary } from '../i18n/ko';
import { interpolate } from '../i18n/interpolate';

type DateStrings = Dictionary['date'];

// ISO 주차 계산 (월요일 시작)

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = d.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

export function getWeekId(date: Date = new Date()): string {
  const monday = startOfWeek(date);
  const thursday = addDays(monday, 3);
  const week = isoWeekNumber(thursday);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// getWeekId의 역방향: "2026-W41" -> 그 주 월요일의 "YYYY-MM-DD".
// 1월 4일은 항상 ISO 1주차에 속한다는 점을 이용한다.
export function mondayOfWeekId(weekId: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) return formatDate(new Date());
  const firstMonday = startOfWeek(new Date(Number(m[1]), 0, 4));
  return formatDate(addWeeks(firstMonday, Number(m[2]) - 1));
}

export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateVars(date: Date, strings: DateStrings) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    monthName: strings.monthsShort[date.getMonth()],
    day: date.getDate(),
    weekday: strings.weekdaysShort[date.getDay()],
  };
}

export function formatDateLabel(date: Date, strings: DateStrings): string {
  return interpolate(strings.dateLabel, dateVars(date, strings));
}

// "10월 16일" 대신 아이폰 일정 편집처럼 짧은 칩에 넣는 날짜 문구 ("2026. 10. 16.", "Oct 16, 2026").
export function formatDatePill(date: Date, strings: DateStrings): string {
  return interpolate(strings.datePill, dateVars(date, strings));
}

// "YYYY-MM-DD" -> 그 날 0시의 Date (시간대 변환 없이 로컬 기준).
export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatMonthLabel(date: Date, strings: DateStrings): string {
  return interpolate(strings.monthLabel, dateVars(date, strings));
}

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// 오전/오후 12시간제 (아이폰 캘린더 스타일)
export function formatTime12(date: Date, strings: DateStrings): string {
  const h = date.getHours();
  return interpolate(strings.time12, {
    period: h < 12 ? strings.am : strings.pm,
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: String(date.getMinutes()).padStart(2, '0'),
  });
}

// 아이폰 캘린더처럼 항상 6주(42칸)를 채우되, 마지막 줄이 전부 다음 달이면 생략한다.
// 위크보드의 한 주는 월요일에 시작한다.
export function buildMonthGrid(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const lastRow = days.slice(35, 42);
  if (lastRow.every((d) => d.getMonth() !== viewMonth.getMonth())) {
    return days.slice(0, 35);
  }
  return days;
}
