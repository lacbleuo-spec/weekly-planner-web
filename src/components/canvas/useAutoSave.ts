import { useCallback, useEffect, useRef, useState } from 'react';

import { syncOnce, type SyncState } from '../../lib/sync';
import { readTextFromHandle, writeTextToHandle, type FileSystemFileHandle } from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import type { PlanningSnapshot } from '../../types/planning';

// 마지막 변경 후 이만큼 조용하면 저장한다. 계속 편집해도 첫 변경 후 MAX_WAIT_MS 안에는 저장한다.
// 다른 기기가 파일을 바꿨는지는 탭이 보이는 동안 POLL_MS마다, 그리고 탭으로 돌아올 때 확인한다.
const DEBOUNCE_MS = 2000;
const MAX_WAIT_MS = 10000;
const POLL_MS = 15000;

const PREF_KEY = 'weekboard/autosave';

// 처음 쓰는 사람은 켜진 상태로 시작한다. 끄면 그 선택을 기억한다.
export function loadAutoSavePreference(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveAutoSavePreference(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    // 저장하지 못해도 이번 접속에서는 선택한 대로 동작한다.
  }
}

const DATA_KEYS = [
  'lifeLines',
  'topGoals',
  'roadmapNodes',
  'dailyGoals',
  'events',
  'routineBlocks',
  'widgets',
] as const;

export type AutoSaveStatus = 'clean' | 'pending' | 'saving' | 'error';

interface UseAutoSaveOptions {
  handle: FileSystemFileHandle | null;
  enabled: boolean; // 사용자가 켠 상태 (파일이 있어야 실제로 동작한다)
  getSnapshot: () => PlanningSnapshot;
  onFail: (err: unknown) => void;
}

// 열려 있는 파일과 화면의 데이터를 계속 맞춘다. 저장만 하는 게 아니라 파일을 읽어서 다른 기기(앱 등)가 바꾼 내용도 합친 뒤 쓴다.
// 파일 읽기/쓰기는 한 번에 하나씩만 하도록 줄 세워서, 직접 누른 저장과 자동 저장이 겹쳐도 순서가 뒤바뀌지 않게 한다.
export function useAutoSave({ handle, enabled, getSnapshot, onFail }: UseAutoSaveOptions) {
  const active = enabled && handle !== null;
  const [status, setStatus] = useState<AutoSaveStatus>('clean');

  const handleRef = useRef(handle);
  const activeRef = useRef(active);
  const getSnapshotRef = useRef(getSnapshot);
  const onFailRef = useRef(onFail);
  useEffect(() => {
    handleRef.current = handle;
    activeRef.current = active;
    getSnapshotRef.current = getSnapshot;
    onFailRef.current = onFail;
  });

  const syncState = useRef<SyncState>({ base: null });
  const version = useRef(0); // 데이터가 바뀔 때마다 1씩 올라간다
  const savedVersion = useRef(0); // 마지막으로 파일과 맞춘 시점의 version
  const timer = useRef<number | undefined>(undefined);
  const firstChangeAt = useRef<number | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const blocked = useRef(false); // 저장에 실패한 뒤에는 다시 켜기 전까지 시도하지 않는다

  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const clearTimer = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    firstChangeAt.current = null;
  }, []);

  const needsSave = useCallback(() => version.current !== savedVersion.current, []);

  // 파일과 한 번 맞춘다(읽기 → 병합 → 필요하면 쓰기).
  const syncOnceNow = useCallback(async () => {
    const h = handleRef.current;
    if (!h) return;
    const v = version.current;
    setStatus('saving');
    let ok = false;
    try {
      await syncOnce(
        {
          readRemote: () => readTextFromHandle(h),
          writeRemote: (text) => writeTextToHandle(h, text),
          getLocal: getSnapshotRef.current,
          applyLocal: (merged) => usePlanningStore.getState().loadSnapshot(merged),
        },
        syncState.current
      );
      savedVersion.current = v;
      ok = true;
    } finally {
      // 실패했는데 "저장됨"으로 보이면 안 된다. 다음 동기화가 성공하면 저절로 되돌아온다.
      setStatus(!ok ? 'error' : version.current === savedVersion.current ? 'clean' : 'pending');
    }
  }, []);

  const enqueue = useCallback(() => {
    const run = chain.current.then(syncOnceNow);
    chain.current = run.catch(() => undefined);
    return run;
  }, [syncOnceNow]);

  const schedule = useCallback(() => {
    const now = Date.now();
    if (firstChangeAt.current === null) firstChangeAt.current = now;
    const wait = Math.min(DEBOUNCE_MS, Math.max(0, firstChangeAt.current + MAX_WAIT_MS - now));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current(), wait);
  }, []);

  const flush = useCallback(async () => {
    clearTimer();
    if (!activeRef.current || blocked.current || !needsSave()) return;
    try {
      await enqueue();
    } catch (err) {
      blocked.current = true;
      setStatus('error');
      onFailRef.current(err);
      return;
    }
    // 쓰는 동안 또 바뀌었으면 이어서 예약한다
    if (activeRef.current && !blocked.current && needsSave()) schedule();
  }, [clearTimer, needsSave, enqueue, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // 다른 기기의 변경을 가져오는 조용한 동기화. 일시적인 실패는 다음 기회에 다시 한다.
  const poll = useCallback(() => {
    if (!activeRef.current || blocked.current) return;
    void enqueue().catch(() => undefined);
  }, [enqueue]);

  // 데이터가 바뀌면 저장을 예약한다.
  useEffect(() => {
    const unsubscribe = usePlanningStore.subscribe((state, prev) => {
      if (DATA_KEYS.every((k) => state[k] === prev[k])) return;
      version.current += 1;
      setStatus((st) => (st === 'saving' ? st : 'pending'));
      if (activeRef.current && !blocked.current) schedule();
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer.current);
    };
  }, [schedule]);

  // 자동 저장을 켜거나 다른 파일로 바뀌면 막힘을 풀고 한 번 맞춘다(꺼져 있는 동안 쌓인 변경도 올라간다).
  useEffect(() => {
    blocked.current = false;
    if (!active) {
      clearTimer();
      return;
    }
    if (needsSave()) schedule();
    else poll();
  }, [active, handle, clearTimer, needsSave, schedule, poll]);

  // 탭이 보이는 동안 주기적으로, 그리고 탭으로 돌아올 때 파일을 확인한다.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') poll();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active, poll]);

  // 탭을 숨기거나 닫기 직전에는 기다리지 않고 바로 저장한다.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flush]);

  // 열기/새로 만들기/다른 이름으로 저장 직후처럼, 지금 화면이 파일과 같다고 확정할 때 쓴다.
  // 이때의 화면 내용을 "마지막으로 맞춘 상태"로 삼아 이후 병합의 기준으로 쓴다.
  const markClean = useCallback(() => {
    clearTimer();
    savedVersion.current = version.current;
    syncState.current.base = getSnapshotRef.current();
    setStatus('clean');
  }, [clearTimer]);

  // 직접 누른 저장. 자동 저장과 같은 줄에 세워 순서가 뒤바뀌지 않게 한다.
  const saveNow = useCallback(async () => {
    clearTimer();
    await enqueue();
  }, [clearTimer, enqueue]);

  return { status, active, markClean, saveNow };
}
