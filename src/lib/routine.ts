// 루틴(시간표) 계산 공통 함수. 웹과 앱이 같은 파일을 쓴다 — 한쪽을 고치면 다른 쪽도 똑같이 고칠 것.

// 다이얼은 24:00을 0으로 저장하고, 22:00~02:00처럼 자정을 넘는 범위도 만든다(끝 <= 시작).
// 그래서 "끝 > 시작"이라고 가정하면 안 된다. 자정을 넘는 범위는 0~24 위의 두 구간으로 쪼개서 본다.
export function splitRange(startHour: number, endHour: number): [number, number][] {
  if (endHour > startHour) return [[startHour, endHour]];
  const parts: [number, number][] = [];
  if (startHour < 24) parts.push([startHour, 24]);
  if (endHour > 0) parts.push([0, endHour]);
  return parts;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  const a = splitRange(aStart, aEnd);
  const b = splitRange(bStart, bEnd);
  return a.some(([as, ae]) => b.some(([bs, be]) => as < be && ae > bs));
}

interface DayBlock {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

// 같은 요일에 이 시간과 겹치는 루틴이 이미 있는지.
export function hasRoutineOverlap(blocks: DayBlock[], day: number, startHour: number, endHour: number): boolean {
  return blocks.some((b) => b.dayOfWeek === day && rangesOverlap(startHour, endHour, b.startHour, b.endHour));
}

// ---- 색: 브랜드 파란색 한 가지를 진한 색에서 연한 색으로 ----
// 한 요일의 루틴을 0시부터 시계 방향(시작 시각 순서)으로 놓고, 첫 번째를 가장 진하게, 마지막을 가장 연하게 칠한다.
// 색은 저장하지 않고 그릴 때 계산한다. 그래서 루틴을 넣고 지워도 항상 순서대로 이어진다.
export const ROUTINE_COLOR_DARK = '#1B4DB1';
export const ROUTINE_COLOR_BRAND = '#3182F6';
export const ROUTINE_COLOR_LIGHT = '#A9C7FA';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

// index번째(0부터) / 전체 count개 중의 색. 하나뿐이면 브랜드 색 그대로.
export function routineShade(index: number, count: number): string {
  if (count <= 1) return ROUTINE_COLOR_BRAND;
  const t = index / (count - 1);
  return t <= 0.5
    ? mix(ROUTINE_COLOR_DARK, ROUTINE_COLOR_BRAND, t * 2)
    : mix(ROUTINE_COLOR_BRAND, ROUTINE_COLOR_LIGHT, (t - 0.5) * 2);
}

interface ColorBlock extends DayBlock {
  id: string;
}

// 0시를 지나가는 루틴인지. 끝이 0(=24:00)이면 24시에서 끝나는 것이지 0시를 지나가는 게 아니다.
function coversMidnight(b: DayBlock): boolean {
  return b.endHour > 0 && b.endHour <= b.startHour;
}

// 0시부터 시계 방향 순서. 0시를 지나가는 루틴이 가장 앞이고, 그다음은 시작 시각 순이다.
function clockwiseOrder(a: ColorBlock, b: ColorBlock): number {
  const wa = coversMidnight(a) ? 0 : 1;
  const wb = coversMidnight(b) ? 0 : 1;
  if (wa !== wb) return wa - wb;
  return a.startHour - b.startHour || a.id.localeCompare(b.id);
}

// 루틴 id → 색. 요일마다 따로 순서를 매긴다.
export function routineColorMap(blocks: ColorBlock[]): Map<string, string> {
  const byDay = new Map<number, ColorBlock[]>();
  for (const b of blocks) byDay.set(b.dayOfWeek, [...(byDay.get(b.dayOfWeek) ?? []), b]);
  const colors = new Map<string, string>();
  for (const list of byDay.values()) {
    list.sort(clockwiseOrder);
    list.forEach((b, i) => colors.set(b.id, routineShade(i, list.length)));
  }
  return colors;
}

// ---- 하루 24시간을 가로 띠로 그릴 때 ----
// 띠를 15분(1/96) 칸으로 나눠서 칸마다 색을 정한다. 칸 폭을 똑같이 나누면 위젯이 얼마나 넓든 띠가 폭에 꼭 맞고,
// 자정을 넘는 루틴(22~02)이나 24:00에서 끝나는 루틴(23~0)도 폭이 음수가 되지 않는다.
export const BAR_CELLS = 96;

interface Seg {
  start: number;
  end: number;
  color: string;
}

// 반환: 길이 96. 루틴이 없는 칸은 null.
export function barCellColors(segments: Seg[]): (string | null)[] {
  const cells: (string | null)[] = new Array(BAR_CELLS).fill(null);
  for (const seg of segments) {
    for (const [a, b] of splitRange(seg.start, seg.end)) {
      for (let i = 0; i < BAR_CELLS; i++) {
        const mid = ((i + 0.5) / BAR_CELLS) * 24; // 칸의 한가운데 시각이 이 구간 안이면 그 칸을 칠한다
        if (mid >= a && mid < b) cells[i] = seg.color;
      }
    }
  }
  return cells;
}
