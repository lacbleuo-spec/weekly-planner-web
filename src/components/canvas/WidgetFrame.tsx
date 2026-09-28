import { Eye, EyeOff, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface WidgetFrameProps {
  icon: LucideIcon;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  scale: number;
  deleteLabel: string;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDelete: () => void;
  children: ReactNode;
  // 이 위젯의 가이드 말풍선 노출 여부(기본 켜짐). 위젯 헤더의 눈 아이콘으로 각자 켜고 끈다.
  guideOn?: boolean;
  onToggleGuide?: () => void;
  guideToggleLabel?: string;
  guideTitle?: string;
  guideBody?: string;
  guideExampleLabel?: string;
  guideExample?: string;
}

export function WidgetFrame({
  icon: Icon,
  title,
  x,
  y,
  width,
  height,
  zIndex,
  scale,
  deleteLabel,
  onDragStart,
  onDragEnd,
  onDelete,
  children,
  guideOn = true,
  onToggleGuide,
  guideToggleLabel,
  guideTitle,
  guideBody,
  guideExampleLabel,
  guideExample,
}: WidgetFrameProps) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x, y });
  const posRef = useRef(pos);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );

  useEffect(() => {
    posRef.current = { x, y };
    setPos({ x, y });
  }, [x, y]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y,
    };
    setDragging(true);
    onDragStart();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    const next = { x: drag.originX + dx, y: drag.originY + dy };
    posRef.current = next;
    setPos(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    onDragEnd(posRef.current.x, posRef.current.y);
  };

  return (
    <div
      className="absolute left-0 top-0"
      style={{ zIndex, transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card"
        style={{ width, height, boxShadow: dragging ? 'var(--shadow-float)' : undefined }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex shrink-0 cursor-grab items-center justify-between border-b border-line bg-surface px-3.5 py-2.5 active:cursor-grabbing"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Icon size={15} className="shrink-0 text-accent" strokeWidth={2.25} />
            <span className="truncate text-[13px] font-semibold text-ink">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onToggleGuide}
              aria-label={guideToggleLabel}
              className={`transition ${guideOn ? 'text-accent' : 'text-faint hover:text-accent'}`}
            >
              {guideOn ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              aria-label={deleteLabel}
              className="text-faint transition hover:text-danger"
            >
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-3.5 py-2.5">{children}</div>
      </div>

      {/* 위젯을 가리지 않도록, 가이드는 옆에 말풍선으로 띄운다. 위젯별 토글이 켜져 있을 때만 보인다. */}
      {guideOn && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-full top-0 ml-3 w-64 rounded-card bg-surface p-3.5 text-left shadow-float"
        >
          <div className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-surface" />
          <div className="relative text-[13px] leading-5 text-ink">
            <p className="font-bold">{guideTitle}</p>
            <p className="mt-1.5 whitespace-pre-line">{guideBody}</p>
            <p className="mt-3 font-bold">{guideExampleLabel}</p>
            <p className="mt-1 whitespace-pre-line">{guideExample}</p>
          </div>
        </div>
      )}
    </div>
  );
}
