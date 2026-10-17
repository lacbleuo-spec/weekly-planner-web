import type { PlanningSnapshot } from '../types/planning';

// 같은 파일을 여러 기기(웹, 앱)가 함께 쓸 때를 위한 병합 규칙.
// - 항목은 id로 짝을 지어, 마지막으로 바꾼 시각(updatedAt, 없으면 createdAt)이 늦은 쪽을 쓴다.
// - 지운 항목은 tombstones에 '컬렉션:id' -> 지운 시각으로 남긴다. 지운 뒤에 다시 고친 항목만 되살아난다.
// - 순서는 내가 순서를 바꿨으면 내 순서, 아니면 다른 쪽 순서를 따른다(마지막 동기화 시점 base와 비교).
export const COLLECTIONS = [
  'lifeLines',
  'topGoals',
  'roadmapNodes',
  'dailyGoals',
  'events',
  'routineBlocks',
  'widgets',
] as const;
export type CollectionKey = (typeof COLLECTIONS)[number];

interface Item {
  id: string;
  updatedAt?: number;
  createdAt?: number;
}

export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const stamp = (i: Item) => i.updatedAt ?? i.createdAt ?? 0;

function sequence(ids: string[], keep: Set<string>): string[] {
  return ids.filter((id) => keep.has(id));
}

function sameSequence(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function mergeList<T extends Item>(
  key: CollectionKey,
  local: T[],
  remote: T[],
  base: T[] | undefined,
  tombstones: Record<string, number>
): T[] {
  const L = new Map(local.map((i) => [i.id, i]));
  const R = new Map(remote.map((i) => [i.id, i]));
  const B = new Map((base ?? []).map((i) => [i.id, i]));

  const winners = new Map<string, T>();
  for (const id of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(id);
    const r = R.get(id);
    const winner = l && r ? (stamp(r) > stamp(l) ? r : l) : (l ?? r)!;
    const deletedAt = tombstones[`${key}:${id}`];
    if (deletedAt !== undefined && deletedAt >= stamp(winner)) continue;
    // 지운 기록이 없는 옛 클라이언트가 지운 경우: 지난번 동기화 때는 있었는데 이번 파일에는 없고, 내가 안 고쳤다면 지운 것으로 본다.
    const b = B.get(id);
    if (b && l && !r && stamp(l) <= stamp(b)) continue;
    winners.set(id, winner);
  }

  const survivors = new Set(winners.keys());
  const localOrder = sequence(
    local.map((i) => i.id),
    survivors
  );
  const remoteOrder = sequence(
    remote.map((i) => i.id),
    survivors
  );
  // 내가 마지막 동기화 이후 순서를 바꿨는가?
  const baseIds = (base ?? []).map((i) => i.id);
  const localMoved = base
    ? !sameSequence(
        sequence(localOrder, new Set(baseIds)),
        sequence(baseIds, new Set(localOrder))
      )
    : true;
  const primary = localMoved ? localOrder : remoteOrder;
  const secondary = localMoved ? remoteOrder : localOrder;

  // 기준 순서에 없는 항목(상대가 새로 만든 것)은 상대 순서에서 바로 앞에 있던 항목 뒤에 끼워 넣는다.
  const result = [...primary];
  const placed = new Set(primary);
  secondary.forEach((id, idx) => {
    if (placed.has(id)) return;
    let at = -1;
    for (let j = idx - 1; j >= 0; j--) {
      const prevIndex = result.indexOf(secondary[j]);
      if (prevIndex >= 0) {
        at = prevIndex;
        break;
      }
    }
    result.splice(at + 1, 0, id);
    placed.add(id);
  });
  return result.map((id) => winners.get(id)!);
}

export function mergeSnapshots(
  local: PlanningSnapshot,
  remote: PlanningSnapshot,
  base?: PlanningSnapshot | null,
  now: number = Date.now()
): PlanningSnapshot {
  const tombstones: Record<string, number> = {};
  for (const source of [remote.tombstones, local.tombstones]) {
    for (const [k, v] of Object.entries(source ?? {})) {
      if (now - v > TOMBSTONE_TTL_MS) continue;
      tombstones[k] = Math.max(tombstones[k] ?? 0, v);
    }
  }
  const merged: PlanningSnapshot = {
    ...local,
    tombstones,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
  for (const key of COLLECTIONS) {
    (merged as unknown as Record<string, unknown>)[key] = mergeList(
      key,
      (local[key] ?? []) as Item[],
      (remote[key] ?? []) as Item[],
      base ? ((base[key] ?? []) as Item[]) : undefined,
      tombstones
    );
  }
  return merged;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

// 저장 시각(updatedAt)과 언어를 뺀, 데이터 내용만 비교하기 위한 문자열.
export function contentKey(s: PlanningSnapshot): string {
  const picked: Record<string, unknown> = { tombstones: s.tombstones ?? {} };
  for (const key of COLLECTIONS) picked[key] = s[key] ?? [];
  return stableStringify(picked);
}
