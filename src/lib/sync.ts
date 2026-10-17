import type { PlanningSnapshot } from '../types/planning';
import { contentKey, mergeSnapshots } from './merge';

// 파일과 앱(웹) 화면의 데이터를 한 번 맞춘다. 읽기/쓰기/화면 반영은 플랫폼마다 달라서 밖에서 넣어 준다.
export interface SyncIO {
  readRemote: () => Promise<string | null>;
  writeRemote: (text: string) => Promise<void>;
  getLocal: () => PlanningSnapshot;
  applyLocal: (merged: PlanningSnapshot) => void;
}

export interface SyncState {
  base: PlanningSnapshot | null; // 마지막으로 맞춘 시점의 데이터
}

export type SyncResult = 'unchanged' | 'pulled' | 'pushed' | 'merged';

function isSnapshot(data: unknown): data is PlanningSnapshot {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.widgets) && Array.isArray(d.lifeLines) && Array.isArray(d.topGoals);
}

export async function syncOnce(io: SyncIO, state: SyncState, now: number = Date.now()): Promise<SyncResult> {
  const text = await io.readRemote();
  const local = io.getLocal();

  let remote: PlanningSnapshot | null = null;
  if (text && text.trim()) {
    const parsed: unknown = JSON.parse(text); // 깨진 파일은 덮어쓰지 않고 오류로 알린다
    if (!isSnapshot(parsed)) throw new Error('invalid-weekboard-file');
    remote = parsed;
  }

  const merged = remote ? mergeSnapshots(local, remote, state.base, now) : local;
  const localChanged = contentKey(merged) !== contentKey(local);
  const remoteChanged = !remote || contentKey(merged) !== contentKey(remote);

  if (localChanged) io.applyLocal(merged);
  if (remoteChanged) await io.writeRemote(JSON.stringify({ ...merged, updatedAt: now }, null, 2));
  state.base = merged;

  if (localChanged && remoteChanged) return 'merged';
  if (localChanged) return 'pulled';
  if (remoteChanged) return 'pushed';
  return 'unchanged';
}
