import { useDict } from '../../i18n';

interface DateSelectProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  invalid?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// 브라우저 기본 날짜 입력칸(<input type="date">)은 앱 언어가 아니라 브라우저/OS 언어로
// 그려져서, 앱 언어와 무관하게 한국어 형식이 나온다. 앱이 직접 그리는 선택칸으로 대신한다.
export function DateSelect({ value, onChange, invalid = false }: DateSelectProps) {
  const dict = useDict();
  const [year, month, day] = value.split('-').map(Number);

  const emit = (y: number, m: number, d: number) => {
    onChange(`${y}-${pad(m)}-${pad(Math.min(d, daysInMonth(y, m)))}`);
  };

  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = Math.min(thisYear - 1, year); y <= Math.max(thisYear + 5, year); y++) years.push(y);

  const selectClass = `rounded-control border bg-canvas px-1.5 py-1 text-[12px] text-ink ${
    invalid ? 'border-danger' : 'border-line'
  }`;

  const fields = {
    year: (
      <select
        key="year"
        aria-label={dict.date.yearField}
        value={year}
        onChange={(e) => emit(Number(e.target.value), month, day)}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    ),
    month: (
      <select
        key="month"
        aria-label={dict.date.monthField}
        value={month}
        onChange={(e) => emit(year, Number(e.target.value), day)}
        className={selectClass}
      >
        {dict.date.monthsShort.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
    ),
    day: (
      <select
        key="day"
        aria-label={dict.date.dayField}
        value={day}
        onChange={(e) => emit(year, month, Number(e.target.value))}
        className={selectClass}
      >
        {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    ),
  };

  const order = dict.date.dateFieldOrder.split('') as ('y' | 'm' | 'd')[];
  const byKey = { y: fields.year, m: fields.month, d: fields.day };
  return <div className="flex items-center gap-1">{order.map((k) => byKey[k])}</div>;
}
