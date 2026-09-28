import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { useDict } from '../../i18n';
import { PALETTE } from '../../lib/palette';
import { usePlanningStore } from '../../store/usePlanningStore';
import { hourToTimeString, TimeRangeDial } from '../ui/TimeRangeDial';

// 요일별 보기 화면의 정적인(드래그 불가) 원형 개요 — TimeRangeDial과 같은 크기로 맞춘다.
const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 96;
const STROKE = 16;
const TICK_R = RADIUS + 18;
const LABEL_R = TICK_R + 12;

function hourToPoint(hour: number, radius: number): { x: number; y: number } {
  const rad = (hour / 24) * Math.PI * 2;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function describeArc(startHour: number, endHour: number, radius: number): string {
  const start = hourToPoint(startHour, radius);
  const end = hourToPoint(endHour, radius);
  let sweep = endHour - startHour;
  if (sweep <= 0) sweep += 24;
  const largeArc = sweep > 12 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
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

export function TimetableWidget() {
  const dict = useDict();
  const t = dict.widgets.timetable;
  const days = dict.date.weekdaysMonFirst; // 월화수목금토일, RoutineBlock.dayOfWeek(0=월)과 순서 일치

  const routineBlocks = usePlanningStore((s) => s.routineBlocks);
  const addRoutineBlock = usePlanningStore((s) => s.addRoutineBlock);
  const deleteRoutineBlock = usePlanningStore((s) => s.deleteRoutineBlock);

  const todayIndex = (new Date().getDay() + 6) % 7; // JS: 0=일 → 0=월 기준으로 보정
  const [viewDay, setViewDay] = useState(todayIndex);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [overlapDays, setOverlapDays] = useState<number[]>([]);
  // 루틴을 저장할 때마다 다음 팔레트 색을 순서대로 써서 서로 다른 색이 붙게 한다.
  // (선택한 요일 수만큼 늘어나는 routineBlocks.length를 그대로 쓰면 매번 같은 색이 나올 수 있다.)
  const [nextColorIndex, setNextColorIndex] = useState(routineBlocks.length);

  const openForm = () => {
    setTitle('');
    setSelectedDays(new Set([viewDay]));
    setStartHour(9);
    setEndHour(10);
    setOverlapDays([]);
    setShowForm(true);
  };

  const toggleDay = (i: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        if (next.size > 1) next.delete(i); // 최소 하나는 선택돼 있어야 한다.
      } else {
        next.add(i);
      }
      return next;
    });
    setOverlapDays([]);
  };

  // 같은 요일에 시간이 겹치는 루틴이 이미 있는지 확인한다.
  const overlaps = (day: number, s: number, e: number) =>
    routineBlocks.some((b) => b.dayOfWeek === day && s < b.endHour && e > b.startHour);

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed || selectedDays.size === 0) return;
    const conflicts = Array.from(selectedDays).filter((day) => overlaps(day, startHour, endHour));
    if (conflicts.length > 0) {
      setOverlapDays(conflicts);
      return;
    }
    const color = PALETTE[nextColorIndex % PALETTE.length];
    selectedDays.forEach((dayOfWeek) => {
      addRoutineBlock({ title: trimmed, dayOfWeek, startHour, endHour, color });
    });
    setNextColorIndex((i) => i + 1);
    setShowForm(false);
  };

  if (showForm) {
    const previewBlocks = routineBlocks.filter((b) => selectedDays.has(b.dayOfWeek));

    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
          <div className="flex justify-between">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`mx-0.5 h-7 flex-1 rounded-control text-[11px] font-medium transition ${
                  overlapDays.includes(i)
                    ? 'bg-danger/10 text-danger ring-1 ring-inset ring-danger'
                    : selectedDays.has(i)
                      ? 'bg-accent text-white'
                      : 'bg-canvas text-subink hover:bg-line'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <p className="text-center text-[10.5px] text-faint">{t.dragHint}</p>

          <TimeRangeDial
            startHour={startHour}
            endHour={endHour}
            onChangeStart={(h) => {
              setStartHour(h);
              setOverlapDays([]);
            }}
            onChangeEnd={(h) => {
              setEndHour(h);
              setOverlapDays([]);
            }}
            previewArcs={previewBlocks.map((b) => ({ id: b.id, startHour: b.startHour, endHour: b.endHour, color: b.color }))}
            caption={`${t.startsLabel} · ${t.endsLabel}`}
          />

          {overlapDays.length > 0 && (
            <p className="text-[11.5px] text-danger">
              {t.overlapError} ({overlapDays.map((d) => days[d]).join(', ')})
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5 border-t border-line pt-2">
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
      </div>
    );
  }

  const blocksForView = routineBlocks.filter((b) => b.dayOfWeek === viewDay).sort((a, b) => a.startHour - b.startHour);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 justify-between">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setViewDay(i)}
            className={`mx-0.5 h-7 flex-1 rounded-control text-[11px] font-medium transition ${
              viewDay === i ? 'bg-accent text-white' : 'bg-canvas text-subink hover:bg-line'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 justify-center py-1">
        <svg width={SIZE} height={SIZE} className="max-w-full">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} strokeWidth={STROKE} className="fill-none stroke-line" />
          <DialTicks />
          {blocksForView.map((b) => (
            <path
              key={b.id}
              d={describeArc(b.startHour, b.endHour, RADIUS)}
              strokeWidth={STROKE}
              strokeLinecap="round"
              stroke={b.color}
              className="fill-none"
            >
              <title>{`${b.title} · ${hourToTimeString(b.startHour)}-${hourToTimeString(b.endHour)}`}</title>
            </path>
          ))}
        </svg>
      </div>

      {/* 원 위 라벨 위치가 시간마다 제각각이라 읽기 어려워, 목록으로 순서대로 보여준다. */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {blocksForView.length === 0 ? (
          <p className="px-1 py-2 text-center text-[11.5px] text-faint">{t.empty}</p>
        ) : (
          blocksForView.map((b) => (
            <div key={b.id} className="group flex items-center gap-2 rounded-control px-1.5 py-1 hover:bg-canvas">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="flex-1 truncate text-[12.5px] text-ink">{b.title}</span>
              <span className="shrink-0 text-[11px] text-subink">
                {hourToTimeString(b.startHour)}-{hourToTimeString(b.endHour)}
              </span>
              <button
                onClick={() => deleteRoutineBlock(b.id)}
                className="shrink-0 text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
              >
                <X size={12} />
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
        {t.addRoutine}
      </button>
    </div>
  );
}
