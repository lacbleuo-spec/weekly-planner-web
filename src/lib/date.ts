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
