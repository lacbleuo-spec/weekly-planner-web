import { useRef, useState } from 'react';

// 시간 범위를 원형 다이얼에서 드래그로 정하는 공용 컴포넌트.
// 시간표(요일별 루틴)와 캘린더(특정 날짜 이벤트)에서 함께 쓴다.

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 96;
const STROKE = 16;
const TICK_R = RADIUS + 18;
const LABEL_R = TICK_R + 12;
const HANDLE_R = 10;
const MIN_STEP = 0.25; // 15분 단위 스냅

function hourToPoint(hour: number, radius: number): { x: number; y: number } {
  const rad = (hour / 24) * Math.PI * 2;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

// 원 중심 기준 상대 좌표(dx, dy)를 0~24 사이 시각으로 변환
function pointToHour(dx: number, dy: number): number {
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return (deg / 360) * 24;
}

function snapHour(hour: number): number {
  const snapped = Math.round(hour / MIN_STEP) * MIN_STEP;
  return snapped >= 24 ? 0 : snapped;
}

function isTooClose(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 - diff) < MIN_STEP - 1e-6;
}

function describeArc(startHour: number, endHour: number, radius: number): string {
  const start = hourToPoint(startHour, radius);
  const end = hourToPoint(endHour, radius);
  let sweep = endHour - startHour;
  if (sweep <= 0) sweep += 24;
  const largeArc = sweep > 12 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function hourToTimeString(hour: number): string {
  const totalMinutes = Math.round(hour * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function DialTicks() {
  return (
    <>
      {Array.from({ length: 24 }).map((_, h) => {
        const p = hourToPoint(h, TICK_R);
        const major = h % 6 === 0;
        return <circle key={h} cx={p.x} cy={p.y} r={major ? 1.6 : 1} className={major ? 'fill-subink' : 'fill-faint'} />;
      })}
      {[0, 6, 12, 18].map((h) => {
        const p = hourToPoint(h, LABEL_R);
        return (
          <text
            key={h}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-faint text-[10px] font-medium"
          >
            {h === 0 ? 24 : h}
          </text>
        );
      })}
    </>
  );
}

export interface TimeDialPreviewArc {
  id: string;
  startHour: number;
  endHour: number;
  color: string;
}

interface TimeRangeDialProps {
  startHour: number;
  endHour: number;
  onChangeStart: (hour: number) => void;
  onChangeEnd: (hour: number) => void;
  previewArcs?: TimeDialPreviewArc[];
  caption?: string;
}

export function TimeRangeDial({ startHour, endHour, onChangeStart, onChangeEnd, previewArcs = [], caption }: TimeRangeDialProps) {
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const startPt = hourToPoint(startHour, RADIUS);
  const endPt = hourToPoint(endHour, RADIUS);

  const dragHandle = (which: 'start' | 'end', e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    if (dragging !== which) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const dx = (e.clientX - (rect.left + rect.width / 2)) * scale;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * scale;
    const hour = snapHour(pointToHour(dx, dy));
    if (which === 'start') {
      if (isTooClose(hour, endHour)) return;
      onChangeStart(hour);
    } else {
      if (isTooClose(hour, startHour)) return;
      onChangeEnd(hour);
    }
  };

  return (
    <div className="flex justify-center">
      <svg ref={svgRef} width={SIZE} height={SIZE} className="max-w-full">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} strokeWidth={STROKE} className="fill-none stroke-line" />
        <DialTicks />
        {previewArcs.map((a) => (
          <path
            key={a.id}
            d={describeArc(a.startHour, a.endHour, RADIUS)}
            strokeWidth={STROKE}
            strokeLinecap="round"
            stroke={a.color}
            className="fill-none"
            style={{ opacity: 0.3 }}
          />
        ))}
        <path
          d={describeArc(startHour, endHour, RADIUS)}
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="fill-none stroke-accent"
        />
        <circle
          cx={startPt.x}
          cy={startPt.y}
          r={HANDLE_R}
          strokeWidth={3}
          className="cursor-grab fill-white stroke-accent"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging('start');
          }}
          onPointerMove={(e) => dragHandle('start', e)}
          onPointerUp={(e) => {
            e.stopPropagation();
            setDragging(null);
          }}
        />
        <circle
          cx={endPt.x}
          cy={endPt.y}
          r={HANDLE_R}
          strokeWidth={3}
          className="cursor-grab fill-white stroke-accent"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging('end');
          }}
          onPointerMove={(e) => dragHandle('end', e)}
          onPointerUp={(e) => {
            e.stopPropagation();
            setDragging(null);
          }}
        />
        {caption && (
          <text x={CENTER} y={CENTER - 7} textAnchor="middle" className="fill-faint text-[9.5px]">
            {caption}
          </text>
        )}
        <text x={CENTER} y={caption ? CENTER + 12 : CENTER} textAnchor="middle" dominantBaseline={caption ? undefined : 'middle'} className="fill-ink text-[14px] font-bold">
          {hourToTimeString(startHour)} - {hourToTimeString(endHour)}
        </text>
      </svg>
    </div>
  );
}
