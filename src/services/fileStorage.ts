import type { PlanningSnapshot } from '../types/planning';

// 서버 없이, 사용자가 직접 관리하는 파일 하나로 보드를 저장하고 불러온다.
// 나중에 다른 앱(iOS/Android 등)에서도 이 파일만 열면 그대로 이어서 쓸 수 있게,
// 포맷은 PlanningSnapshot을 그대로 JSON으로 담는다.
//
// 일러스트레이터의 열기/저장/다른 이름으로 저장처럼, 한 번 열거나 저장한 파일의
// 위치(handle)를 기억해두면 이후 "저장"은 대화상자 없이 그 자리에 덮어쓸 수 있다.
// 이 handle을 지원하지 않는 브라우저(Safari 등)에서는 항상 새 다운로드로 대체한다.

interface FileSystemWritableFileStream {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

type PermissionState = 'granted' | 'denied' | 'prompt';

export interface FileSystemFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FilePickerAcceptType {
  description: string;
  accept: Record<string, string[]>;
}

const FILE_TYPES: FilePickerAcceptType[] = [
  { description: 'Weekboard file', accept: { 'application/json': ['.json'] } },
];

function getShowSaveFilePicker() {
  return (
    window as unknown as {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: FilePickerAcceptType[];
      }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;
}

// 저장 위치를 직접 고를 수 있는 브라우저인지: 데스크톱 Chrome/Edge 정도만 해당하고,
// 모바일 브라우저와 Safari는 지원하지 않는다. 지원하지 않으면 파일명을 우리 UI에서
// 직접 물어본 뒤 다운로드로 대체해야 한다(그러지 않으면 이름을 고칠 방법이 없다).
export function canPickSaveLocation(): boolean {
  return !!getShowSaveFilePicker();
}

function getShowOpenFilePicker() {
  return (
    window as unknown as {
      showOpenFilePicker?: (options: {
        types?: FilePickerAcceptType[];
        multiple?: boolean;
      }) => Promise<FileSystemFileHandle[]>;
    }
  ).showOpenFilePicker;
}

function defaultFileName(): string {
  return '무제.json';
}

function downloadAsFile(json: string, fileName: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari는 클릭 직후 동기적으로 revokeObjectURL을 호출하면 다운로드가
  // 데이터를 다 읽기 전에 URL이 무효화되어 0바이트 파일이 저장되는 경우가 있다.
  // 다운로드가 blob을 다 읽을 시간을 준 뒤에 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function isPlanningSnapshot(data: unknown): data is PlanningSnapshot {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.widgets) && Array.isArray(d.lifeLines) && Array.isArray(d.topGoals);
}

function parseSnapshot(text: string): PlanningSnapshot {
  const data = JSON.parse(text);
  if (!isPlanningSnapshot(data)) throw new Error('invalid-weekboard-file');
  return data;
}

function pickFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    // 일부 브라우저는 문서에 붙어있지 않은 input에서는 click()이 대화상자를
    // 열지 않는다(클릭이 조용히 무시되어 아무 반응 없이 멈춘 것처럼 보인다).
    // iOS Safari(와 iOS의 다른 브라우저들, 전부 같은 WebKit 엔진)는 한 술 더 떠서
    // 화면 밖으로 멀리 빼둔(top/left: -1000px) input에서는 아예 선택 시트가 뜨지
    // 않는다. 문서에 붙이되 화면 안(왼쪽 위 1px)에 두고 투명하게만 감춘다.
    input.style.position = 'fixed';
    input.style.top = '0';
    input.style.left = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
      resolve(file);
    };

    input.onchange = () => finish(input.files?.[0] ?? null);
    // 대화상자를 취소해도 대부분의 브라우저는 'cancel' 이벤트를 보낸다.
    input.addEventListener('cancel', () => finish(null));
    // 'cancel' 이벤트를 지원하지 않는 구형 브라우저를 위한 보험:
    // 대화상자가 닫혀 창이 다시 포커스를 받았는데 선택된 파일이 없으면 취소로 간주한다.
    // (이 콜백이 없으면 취소 시 Promise가 영영 끝나지 않아 버튼이 계속 비활성 상태로 남는다.)
    const onWindowFocus = () => {
      setTimeout(() => finish(input.files?.[0] ?? null), 300);
    };
    window.addEventListener('focus', onWindowFocus);

    input.click();
  });
}

export interface OpenedFile {
  snapshot: PlanningSnapshot;
  handle: FileSystemFileHandle | null;
  fileName: string;
}

// 열기: 취소하면 null, 형식이 맞지 않으면 예외를 던진다.
// 위치 기억이 가능한 브라우저에서는 handle도 함께 돌려주어, 이후 "저장"이
// 대화상자 없이 같은 파일에 바로 덮어쓸 수 있게 한다.
export async function openSnapshotFile(): Promise<OpenedFile | null> {
  const showOpenFilePicker = getShowOpenFilePicker();

  if (showOpenFilePicker) {
    try {
      const [handle] = await showOpenFilePicker({ types: FILE_TYPES, multiple: false });
      const file = await handle.getFile();
      const snapshot = parseSnapshot(await file.text());
      return { snapshot, handle, fileName: file.name };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      throw err;
    }
  }

  const file = await pickFileViaInput();
  if (!file) return null;
  const snapshot = parseSnapshot(await file.text());
  return { snapshot, handle: null, fileName: file.name };
}

async function ensureWritePermission(handle: FileSystemFileHandle): Promise<void> {
  const opts = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(opts)) === 'granted') return;
  if ((await handle.requestPermission(opts)) !== 'granted') {
    throw new Error('write-permission-denied');
  }
}

// 저장: 이미 열려있는 파일의 자리에 대화상자 없이 그대로 덮어쓴다.
export async function writeSnapshotToHandle(
  handle: FileSystemFileHandle,
  snapshot: PlanningSnapshot
): Promise<void> {
  await ensureWritePermission(handle);
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(snapshot, null, 2));
  await writable.close();
}

export interface SavedFile {
  handle: FileSystemFileHandle | null;
  fileName: string;
}

// 다른 이름으로 저장: 항상 새로 위치를 고른다(위치를 고를 수 없는 브라우저는 다운로드로 대체).
// preferredName을 주면 그 이름을 기본값으로 제안한다 — 이미 열려있던 파일을 다시
// 저장할 때 같은 이름이 뜨게 해서, 위치 선택 API가 없는 브라우저에서도 사용자가
// 다운로드 대화상자에서 기존 파일을 "바꾸기"로 고르기 쉽게 한다.
export async function saveSnapshotAs(
  snapshot: PlanningSnapshot,
  preferredName?: string
): Promise<SavedFile | 'cancelled'> {
  const json = JSON.stringify(snapshot, null, 2);
  const suggestedName = preferredName ?? defaultFileName();
  const showSaveFilePicker = getShowSaveFilePicker();

  if (showSaveFilePicker) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return { handle, fileName: handle.name };
    } catch (err) {
      // 대화상자를 취소한 경우: 실패가 아니라 사용자가 그만둔 것이므로 그대로 반환.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // 그 외 오류(권한 문제 등)는 기본 다운로드 방식으로 대체한다.
    }
  }

  downloadAsFile(json, suggestedName);
  return { handle: null, fileName: suggestedName };
}
