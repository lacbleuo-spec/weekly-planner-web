import { useDict } from '../../i18n';
import { WheelColumn } from './WheelColumn';

interface AlarmPanelProps {
  value: string; // 알림 프리셋 키(예: 'none', 'min5')
  onChange: (value: string) => void;
  options: { key: string; label: string }[];
}

// 알림 칩을 누르면 그 아래에 펼쳐지는 알림 휠. 시간 칩의 TimePanel과 같은 모양과 조작이다.
export function AlarmPanel({ value, onChange, options }: AlarmPanelProps) {
  const dict = useDict();
  return (
    <div className="flex items-center justify-center py-1">
      <WheelColumn
        label={dict.widgets.weeklyTimeline.alarmLabel}
        width={160}
        value={value}
        options={options.map((o) => ({ value: o.key, label: o.label }))}
        onChange={(v) => onChange(String(v))}
      />
    </div>
  );
}
