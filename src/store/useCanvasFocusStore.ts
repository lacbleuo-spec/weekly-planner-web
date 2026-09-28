import { create } from 'zustand';

// AddWidgetMenu가 "이미 캔버스에 있는 위젯"을 눌렀을 때, 새로 추가하는 대신
// CanvasBoard에게 그 위젯으로 화면을 이동해 달라고 요청하기 위한 용도.
interface CanvasFocusState {
  requestedWidgetId: string | null;
  focusWidget: (id: string) => void;
  clearFocus: () => void;
}

export const useCanvasFocusStore = create<CanvasFocusState>((set) => ({
  requestedWidgetId: null,
  focusWidget: (id) => set({ requestedWidgetId: id }),
  clearFocus: () => set({ requestedWidgetId: null }),
}));
