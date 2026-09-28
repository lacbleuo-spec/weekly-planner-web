import { useCallback, useEffect, useRef, useState } from 'react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useCanvasFocusStore } from '../../store/useCanvasFocusStore';
import { WIDGET_ICONS } from '../widgets/meta';
import { WidgetContent } from './WidgetContent';
import { WidgetFrame } from './WidgetFrame';
import { ZoomControls } from './ZoomControls';

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface View {
  x: number;
  y: number;
  scale: number;
}

const INITIAL_VIEW: View = { x: 64, y: 32, scale: 1 };

export function CanvasBoard() {
  const dict = useDict();
  const widgets = usePlanningStore((s) => s.widgets);
  const moveWidget = usePlanningStore((s) => s.moveWidget);
  const removeWidget = usePlanningStore((s) => s.removeWidget);
  const bringToFront = usePlanningStore((s) => s.bringToFront);
  const toggleWidgetGuideVisible = usePlanningStore((s) => s.toggleWidgetGuideVisible);
  const requestedWidgetId = useCanvasFocusStore((s) => s.requestedWidgetId);
  const clearFocus = useCanvasFocusStore((s) => s.clearFocus);

  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const viewRef = useRef(view);
  viewRef.current = view;
  // + 메뉴에서 이미 있는 위젯을 다시 눌렀을 때만 부드럽게 이동하고,
  // 사용자가 직접 드래그/핀치할 때는 즉시 반응하도록 한다.
  const [smoothPan, setSmoothPan] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    midX: number;
    midY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const zoomAt = useCallback((cx: number, cy: number, nextScaleRaw: number) => {
    setView((v) => {
      const nextScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
      const worldX = (cx - v.x) / v.scale;
      const worldY = (cy - v.y) / v.scale;
      return { x: cx - worldX * nextScale, y: cy - worldY * nextScale, scale: nextScale };
    });
  }, []);

  useEffect(() => {
    if (!requestedWidgetId) return;
    const widget = widgets.find((w) => w.id === requestedWidgetId);
    const rect = containerRef.current;
    if (widget && rect) {
      const { width, height } = rect.getBoundingClientRect();
      const scale = viewRef.current.scale;
      const worldCenterX = widget.x + widget.width / 2;
      const worldCenterY = widget.y + widget.height / 2;
      setSmoothPan(true);
      setView({ x: width / 2 - worldCenterX * scale, y: height / 2 - worldCenterY * scale, scale });
      window.setTimeout(() => setSmoothPan(false), 300);
    }
    clearFocus();
  }, [requestedWidgetId, widgets, clearFocus]);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * 0.012);
      zoomAt(cx, cy, viewRef.current.scale * factor);
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // 위젯 위에서는 캔버스 팬을 시작하지 않는다
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      panRef.current = null;
      const [p1, p2] = [...pointers.current.values()];
      const rect = containerRef.current!.getBoundingClientRect();
      pinchRef.current = {
        startDist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        startScale: viewRef.current.scale,
        midX: (p1.x + p2.x) / 2 - rect.left,
        midY: (p1.y + p2.y) / 2 - rect.top,
        originX: viewRef.current.x,
        originY: viewRef.current.y,
      };
    } else if (pointers.current.size === 1) {
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: viewRef.current.x,
        originY: viewRef.current.y,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchRef.current) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const pinch = pinchRef.current;
      const nextScale = clamp((dist / pinch.startDist) * pinch.startScale, MIN_SCALE, MAX_SCALE);
      const worldX = (pinch.midX - pinch.originX) / pinch.startScale;
      const worldY = (pinch.midY - pinch.originY) / pinch.startScale;
      setView({ x: pinch.midX - worldX * nextScale, y: pinch.midY - worldY * nextScale, scale: nextScale });
      return;
    }

    const pan = panRef.current;
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      setView((v) => ({ ...v, x: pan.originX + dx, y: pan.originY + dy }));
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
    if (pointers.current.size < 2) pinchRef.current = null;
  };

  const zoomByButton = (direction: 1 | -1) => {
    const rect = containerRef.current!.getBoundingClientRect();
    zoomAt(
      rect.width / 2,
      rect.height / 2,
      viewRef.current.scale * (direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP)
    );
  };

  const resetView = () => setView(INITIAL_VIEW);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 touch-none overflow-hidden bg-canvas"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
    >
      <div
        className={`absolute left-0 top-0 ${smoothPan ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {widgets.length === 0 && (
          <div className="absolute left-0 top-0 w-72 rounded-card bg-surface px-4 py-3.5 shadow-card">
            <p className="text-[13px] font-semibold leading-5 text-ink">
              {dict.canvas.emptyIntro}
            </p>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-5 text-subink">
              {dict.canvas.emptyHint}
            </p>
          </div>
        )}
        {widgets.map((widget) => {
          const Icon = WIDGET_ICONS[widget.type];
          return (
            <WidgetFrame
              key={widget.id}
              icon={Icon}
              title={dict.widgets[widget.type].title}
              x={widget.x}
              y={widget.y}
              width={widget.width}
              height={widget.height}
              zIndex={widget.zIndex}
              scale={view.scale}
              deleteLabel={dict.common.delete}
              onDragStart={() => bringToFront(widget.id)}
              onDragEnd={(x, y) => moveWidget(widget.id, x, y)}
              onDelete={() => removeWidget(widget.id)}
              guideOn={widget.guideVisible ?? true}
              onToggleGuide={() => toggleWidgetGuideVisible(widget.id)}
              guideToggleLabel={dict.widgetGuide.perWidgetToggleLabel}
              guideTitle={dict.widgetGuide[widget.type].title}
              guideBody={dict.widgetGuide[widget.type].body}
              guideExampleLabel={dict.widgetGuide.exampleLabel}
              guideExample={dict.widgetGuide[widget.type].example}
            >
              <WidgetContent widget={widget} />
            </WidgetFrame>
          );
        })}
      </div>
      <ZoomControls
        scale={view.scale}
        onZoomIn={() => zoomByButton(1)}
        onZoomOut={() => zoomByButton(-1)}
        onReset={resetView}
      />
    </div>
  );
}
