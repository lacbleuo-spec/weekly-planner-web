import { ChevronDown, Copy, FilePlus2, FolderOpen, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDict } from '../../i18n';
import {
  canPickSaveLocation,
  openSnapshotFile,
  saveSnapshotAs,
  writeSnapshotToHandle,
  type FileSystemFileHandle,
  type OpenedFile,
} from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PromptDialog } from '../ui/PromptDialog';
import { Toast } from '../ui/Toast';
import { useToast } from '../ui/useToast';

function emptySnapshot() {
  return {
    lifeLines: [],
    topGoals: [],
    roadmapNodes: [],
    weeklyGoals: [],
    events: [],
    routineBlocks: [],
    dailyAssignments: [],
    widgets: [],
    updatedAt: Date.now(),
  };
}

export function TopBar() {
  const dict = useDict();
  const widgets = usePlanningStore((s) => s.widgets);
  const getSnapshot = usePlanningStore((s) => s.getSnapshot);
  const loadSnapshot = usePlanningStore((s) => s.loadSnapshot);

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<OpenedFile | null>(null);
  const [pendingNew, setPendingNew] = useState(false);
  const [nameToSave, setNameToSave] = useState<string | null>(null);
  const { message, showToast } = useToast();

  const applyNewFile = (result: { handle: FileSystemFileHandle | null; fileName: string }) => {
    setHandle(result.handle);
    setFileName(result.fileName);
  };

  const doNew = () => {
    loadSnapshot(emptySnapshot());
    setHandle(null);
    setFileName(null);
    setPendingNew(false);
  };

  const runNew = () => {
    setMenuOpen(false);
    if (widgets.length > 0) {
      setPendingNew(true);
    } else {
      doNew();
    }
  };

  const runOpen = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const opened = await openSnapshotFile();
      if (opened) setPendingOpen(opened);
    } catch {
      showToast(dict.alerts.openInvalidFileMessage);
    } finally {
      setBusy(false);
    }
  };

  const confirmOpen = () => {
    if (pendingOpen) {
      loadSnapshot(pendingOpen.snapshot);
      setHandle(pendingOpen.handle);
      setFileName(pendingOpen.fileName);
      showToast(dict.alerts.openDoneMessage);
    }
    setPendingOpen(null);
  };

  // 저장 위치를 직접 고를 수 있는 브라우저는 그 대화상자 안에서 이름도 같이 정하지만,
  // 그럴 수 없는 브라우저(모바일, Safari)는 대화상자 자체가 없어 이름을 고칠 방법이
  // 없으므로 우리 UI에서 먼저 이름을 물어본 뒤 그 이름으로 다운로드한다.
  const doSaveAs = async (preferredName?: string) => {
    setBusy(true);
    try {
      const result = await saveSnapshotAs(getSnapshot(), preferredName);
      if (result !== 'cancelled') {
        applyNewFile(result);
        showToast(dict.alerts.saveDoneMessage);
      }
    } catch {
      showToast(dict.alerts.saveFailTitle);
    } finally {
      setBusy(false);
    }
  };

  const runSave = async () => {
    setMenuOpen(false);
    if (handle) {
      setBusy(true);
      try {
        await writeSnapshotToHandle(handle, getSnapshot());
        showToast(dict.alerts.saveDoneMessage);
      } catch {
        showToast(dict.alerts.saveFailTitle);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (canPickSaveLocation()) {
      await doSaveAs(fileName ?? undefined);
      return;
    }
    setNameToSave(fileName ? fileName.replace(/\.json$/i, '') : '무제');
  };

  const runSaveAs = async () => {
    setMenuOpen(false);
    if (canPickSaveLocation()) {
      await doSaveAs(fileName ?? undefined);
      return;
    }
    setNameToSave(fileName ? fileName.replace(/\.json$/i, '') : '무제');
  };

  const confirmNameToSave = () => {
    const base = (nameToSave ?? '').trim() || '무제';
    setNameToSave(null);
    void doSaveAs(`${base}.json`);
  };

  // Cmd/Ctrl+S 저장, Cmd/Ctrl+Shift+S 다른 이름으로 저장.
  // preventDefault를 안 하면 브라우저 자체의 "페이지 저장" 대화상자가 같이 뜬다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      if (busy || pendingOpen || pendingNew || nameToSave !== null) return;
      if (e.shiftKey) {
        void runSaveAs();
      } else {
        void runSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-5 py-3.5">
      <h1 className="flex items-baseline gap-2 text-[17px] font-bold text-ink">
        {dict.app.title}
        {fileName && (
          <span className="truncate text-[13px] font-medium text-faint">{fileName}</span>
        )}
      </h1>

      <div className="relative">
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-card bg-surface py-2 shadow-float">
              <button
                onClick={runNew}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
              >
                <FilePlus2 size={16} className="text-subink" />
                <span className="text-[14px] font-medium text-ink">{dict.topbar.new}</span>
              </button>
              <button
                onClick={runOpen}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
              >
                <FolderOpen size={16} className="text-subink" />
                <span className="text-[14px] font-medium text-ink">{dict.topbar.open}</span>
              </button>
              <button
                onClick={runSave}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
              >
                <Save size={16} className="text-subink" />
                <span className="text-[14px] font-medium text-ink">{dict.topbar.save}</span>
              </button>
              <button
                onClick={runSaveAs}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
              >
                <Copy size={16} className="text-subink" />
                <span className="text-[14px] font-medium text-ink">{dict.topbar.saveAs}</span>
              </button>
            </div>
          </>
        )}
        <button
          disabled={busy}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-control px-3 py-2 text-[14px] font-medium text-subink transition hover:bg-canvas disabled:opacity-50"
        >
          {dict.topbar.file}
          <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <ConfirmDialog
        open={pendingOpen !== null}
        title={dict.confirm.openTitle}
        message={dict.confirm.openMessage}
        confirmLabel={dict.confirm.openConfirm}
        onConfirm={confirmOpen}
        onCancel={() => setPendingOpen(null)}
      />
      <ConfirmDialog
        open={pendingNew}
        title={dict.confirm.newTitle}
        message={dict.confirm.newMessage}
        confirmLabel={dict.confirm.newConfirm}
        onConfirm={doNew}
        onCancel={() => setPendingNew(false)}
      />
      <PromptDialog
        open={nameToSave !== null}
        title={dict.saveAsPrompt.title}
        value={nameToSave ?? ''}
        onChange={setNameToSave}
        confirmLabel={dict.saveAsPrompt.confirm}
        onConfirm={confirmNameToSave}
        onCancel={() => setNameToSave(null)}
      />
      <Toast message={message} />
    </div>
  );
}
