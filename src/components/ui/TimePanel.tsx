import { useDict } from '../../i18n';
import { WheelColumn } from './WheelColumn';

const MINUTE_STEP = 5;

interface TimePanelProps {
  value: string; // HH:mm (24시간)
  onChange: (value: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

// 아이폰 일정 편집처럼, 시간 칩을 누르면 그 아래에 펼쳐지는 오전/오후·시·분 휠.
// 브라우저 기본 시간 입력칸은 앱 언어가 아니라 OS 언어(오전/오후)로 그려져서 직접 그린다.
export function TimePanel({ value, onChange }: TimePanelProps) {
  const dict = useDict();
  const [h24, rawMinute] = value.split(':').map(Number);
  const isPm = h24 >= 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minute = Math.min(60 - MINUTE_STEP, Math.round(rawMinute / MINUTE_STEP) * MINUTE_STEP);

  const emit = (h12: number, m: number, pm: boolean) => {
    onChange(`${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(m)}`);
  };

  const period = (
    <WheelColumn
      key="period"
      label={dict.date.periodField}
      width={64}
      value={isPm ? 'pm' : 'am'}
      options={[
        { value: 'am', label: dict.date.am },
        { value: 'pm', label: dict.date.pm },
      ]}
      onChange={(v) => emit(hour12, minute, v === 'pm')}
    />
  );
  const hour = (
    <WheelColumn
      key="hour"
      label={dict.date.hourField}
      width={48}
      value={hour12}
      options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
      onChange={(v) => emit(Number(v), minute, isPm)}
    />
  );
  const minuteCol = (
    <WheelColumn
      key="minute"
      label={dict.date.minuteField}
      width={48}
      value={minute}
      options={Array.from({ length: 60 / MINUTE_STEP }, (_, i) => ({
        value: i * MINUTE_STEP,
        label: pad(i * MINUTE_STEP),
      }))}
      onChange={(v) => emit(hour12, Number(v), isPm)}
    />
  );

  // "오전 9:00"처럼 오전/오후가 앞에 오는 언어와 "9:00 AM"처럼 뒤에 오는 언어를 모두 맞춘다.
  const periodFirst = dict.date.time12.indexOf('{period}') < dict.date.time12.indexOf('{hour}');

  return (
    <div className="flex items-center justify-center gap-3 py-1">
      {periodFirst ? [period, hour, minuteCol] : [hour, minuteCol, period]}
    </div>
  );
}
