import { useDict } from '../../i18n';

interface TimeSelectProps {
  value: string; // HH:mm (24시간)
  onChange: (value: string) => void;
  invalid?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

// <input type="time">의 오전/오후 표기도 브라우저/OS 언어를 따라가므로,
// 앱 언어의 문구를 쓰는 선택칸으로 대신한다. 값은 기존처럼 "HH:mm" 문자열이다.
export function TimeSelect({ value, onChange, invalid = false }: TimeSelectProps) {
  const dict = useDict();
  const [h24, minute] = value.split(':').map(Number);
  const isPm = h24 >= 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (h12: number, m: number, pm: boolean) => {
    onChange(`${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(m)}`);
  };

  const selectClass = `rounded-control border bg-canvas px-1.5 py-1 text-[12px] text-ink ${
    invalid ? 'border-danger' : 'border-line'
  }`;

  const period = (
    <select
      aria-label={dict.date.periodField}
      value={isPm ? 'pm' : 'am'}
      onChange={(e) => emit(hour12, minute, e.target.value === 'pm')}
      className={selectClass}
    >
      <option value="am">{dict.date.am}</option>
      <option value="pm">{dict.date.pm}</option>
    </select>
  );

  // "오전 9:00"처럼 오전/오후가 앞에 오는 언어와 "9:00 AM"처럼 뒤에 오는 언어를 모두 맞춘다.
  const periodFirst = dict.date.time12.indexOf('{period}') < dict.date.time12.indexOf('{hour}');

  return (
    <div className="flex items-center gap-1">
      {periodFirst && period}
      <select
        aria-label={dict.date.hourField}
        value={hour12}
        onChange={(e) => emit(Number(e.target.value), minute, isPm)}
        className={selectClass}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-subink">:</span>
      <select
        aria-label={dict.date.minuteField}
        value={minute}
        onChange={(e) => emit(hour12, Number(e.target.value), isPm)}
        className={selectClass}
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>
            {pad(m)}
          </option>
        ))}
      </select>
      {!periodFirst && period}
    </div>
  );
}
