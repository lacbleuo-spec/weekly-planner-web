import { useCallback, useEffect, useRef, useState } from 'react';

import { writeSnapshotToHandle, type FileSystemFileHandle } from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import type { PlanningSnapshot } from '../../types/planning';

// 마지막 변경 후 이만큼 조용하면 저장한다. 계속 편집해도 첫 변경 후 MAX_WAIT_MS 안에는 저장한다.
const DEBOUNCE_MS = 2000;
const MAX_WAIT_MS = 10000;

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

export type AutoSaveStatus = 'clean' | 'pending' | 'saving';

interface UseAutoSaveOptions {
  handle: FileSystemFileHandle | null;
  enabled: boolean; // 사용자가 켠 상태 (파일이 있어야 실제로 동작한다)
  getSnapshot: () => PlanningSnapshot;
  onFail: () => void;
}

// 열려 있는 파일에 변경 내용을 알아서 덮어쓴다. 파일 쓰기는 한 번에 하나씩만 하도록 줄 세워서,
// 직접 누른 저장과 자동 저장이 겹쳐도 오래된 내용이 나중에 덮어쓰지 않게 한다.
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

  const version = useRef(0); // 데이터가 바뀔 때마다 1씩 올라간다
  const savedVersion = useRef(0); // 마지막으로 파일에 쓴 시점의 version
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

  const writeOnce = useCallback(async () => {
    const h = handleRef.current;
    if (!h) return;
    const v = version.current;
    setStatus('saving');
    await writeSnapshotToHandle(h, getSnapshotRef.current());
    savedVersion.current = v;
    setStatus(version.current === v ? 'clean' : 'pending');
  }, []);

  const enqueue = useCallback(() => {
    const run = chain.current.then(writeOnce);
    chain.current = run.catch(() => undefined);
    return run;
  }, [writeOnce]);

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
    } catch {
      blocked.current = true;
      setStatus('pending');
      onFailRef.current();
      return;
    }
    // 쓰는 동안 또 바뀌었으면 이어서 예약한다
    if (activeRef.current && !blocked.current && needsSave()) schedule();
  }, [clearTimer, needsSave, enqueue, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

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

  // 자동 저장을 켜거나 다른 파일로 바뀌면 막힘을 풀고, 꺼져 있는 동안 쌓인 변경이 있으면 저장한다.
  useEffect(() => {
    blocked.current = false;
    if (!active) {
      clearTimer();
      return;
    }
    if (needsSave()) schedule();
  }, [active, handle, clearTimer, needsSave, schedule]);

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
  const markClean = useCallback(() => {
    clearTimer();
    savedVersion.current = version.current;
    setStatus('clean');
  }, [clearTimer]);

  // 직접 누른 저장. 자동 저장과 같은 줄에 세워 순서가 뒤바뀌지 않게 한다.
  const saveNow = useCallback(async () => {
    clearTimer();
    await enqueue();
  }, [clearTimer, enqueue]);

  return { status, active, markClean, saveNow };
}
