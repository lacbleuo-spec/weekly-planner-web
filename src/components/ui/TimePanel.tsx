import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

import { useDict } from '../../i18n';

const ITEM_H = 32;
const VISIBLE = 5; // 가운데 칸이 선택값, 위아래로 두 칸씩 보인다.
const MINUTE_STEP = 5;

interface WheelOption {
  value: string | number;
  label: string;
}

interface WheelColumnProps {
  options: WheelOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  label: string;
  width: number;
}

// 아이폰 시간 휠처럼 스크롤해서 가운데 칸에 멈춘 값을 고른다(스크롤 스냅).
// 마우스로는 휠/클릭/방향키로 고를 수 있다.
function WheelColumn({ options, value, onChange, label, width }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const drag = useRef<{ startY: number; startScroll: number; active: boolean } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - index * ITEM_H) > 1) el.scrollTop = index * ITEM_H;
  }, [index]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onScroll = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (options[i].value !== value) onChange(options[i].value);
    }, 100);
  };

  const select = (i: number) => {
    if (i < 0 || i >= options.length) return;
    onChange(options[i].value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(index - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(index + 1);
    }
  };

  // 터치는 브라우저 스크롤이 그대로 동작하고, 마우스는 스크롤이 안 되므로 직접 드래그로 옮긴다.
  // 작은 움직임은 클릭(항목 선택)으로 남겨두고, 일정 거리 이상 움직였을 때만 드래그로 본다.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    drag.current = { startY: e.clientY, startScroll: ref.current?.scrollTop ?? 0, active: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < 4) return;
      d.active = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = 'none'; // 드래그 중에는 스냅이 위치를 끌어당기지 않게
    }
    el.scrollTop = d.startScroll - dy;
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d?.active || !el) return;
    el.releasePointerCapture(e.pointerId);
    el.style.scrollSnapType = '';
    const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
    el.scrollTop = i * ITEM_H;
    select(i);
  };

  const fade = 'linear-gradient(to bottom, transparent, #000 28%, #000 72%, transparent)';

  return (
    <div className="relative" style={{ height: ITEM_H * VISIBLE, width }}>
      <div
        className="pointer-events-none absolute inset-x-0 rounded-control bg-canvas"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-full cursor-grab touch-pan-y select-none snap-y snap-mandatory overflow-y-auto outline-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {options.map((o, i) => (
          <button
            key={o.value}
            role="option"
            aria-selected={i === index}
            tabIndex={-1}
            onClick={() => select(i)}
            className={`flex w-full snap-center items-center justify-center text-[15px] ${
              i === index ? 'font-semibold text-ink' : 'text-faint'
            }`}
            style={{ height: ITEM_H }}
          >
            {o.label}
          </button>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

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
