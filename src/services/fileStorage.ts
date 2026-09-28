import type { PlanningSnapshot } from '../types/planning';

// 서버 없이, 사용자가 직접 관리하는 파일 하나로 보드를 저장하고 불러온다.
// 나중에 다른 앱(iOS/Android 등)에서도 이 파일만 열면 그대로 이어서 쓸 수 있게,
// 포맷은 PlanningSnapshot을 그대로 JSON으로 담는다.
//
// 파일 시스템 접근 API(showSaveFilePicker 등)로 "다른 이름으로 저장" 대화상자를 띄우는
// 방식도 시도해봤지만, 브라우저/환경에 따라 대화상자가 뜨지 않거나 멈추는 경우가 있어
// 모든 브라우저에서 안정적으로 동작하는 기본 다운로드 방식만 쓴다.

function defaultFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `weekboard-${y}-${m}-${day}.json`;
}

export async function saveSnapshotToFile(snapshot: PlanningSnapshot): Promise<void> {
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName();
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

function pickFileViaInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    // 일부 브라우저는 문서에 붙어있지 않은 input에서는 click()이 대화상자를
    // 열지 않는다(클릭이 조용히 무시되어 아무 반응 없이 멈춘 것처럼 보인다).
    // 화면에는 보이지 않게 두되 반드시 문서에 붙여둔다.
    input.style.position = 'fixed';
    input.style.top = '-1000px';
    input.style.left = '-1000px';
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

// 취소하면(파일을 고르지 않으면) null, 형식이 맞지 않으면 예외를 던진다.
export async function pickAndLoadSnapshotFile(): Promise<PlanningSnapshot | null> {
  const file = await pickFileViaInput();
  if (!file) return null;
  const text = await file.text();
  const data = JSON.parse(text);
  if (!isPlanningSnapshot(data)) throw new Error('invalid-weekboard-file');
  return data;
}
