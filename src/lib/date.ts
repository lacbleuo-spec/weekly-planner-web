export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // Sunday 0, Monday 1
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

export function endOfWeek(date: Date): Date {
  return addingDays(startOfWeek(date), 6);
}

export function addingDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function englishWeekdayText(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function monthDayText(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function weekdayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function weekKey(date: Date): string {
  return dayKey(startOfWeek(date));
}
