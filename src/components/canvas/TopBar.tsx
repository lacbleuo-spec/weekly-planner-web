import { ChevronDown, Copy, FilePlus2, FolderOpen, Save } from 'lucide-react';
import { useState } from 'react';

import { useDict } from '../../i18n';
import {
  openSnapshotFile,
  saveSnapshotAs,
  writeSnapshotToHandle,
  type FileSystemFileHandle,
  type OpenedFile,
} from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';
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

  const runSave = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      if (handle) {
        await writeSnapshotToHandle(handle, getSnapshot());
        showToast(dict.alerts.saveDoneMessage);
      } else {
        const result = await saveSnapshotAs(getSnapshot());
        if (result !== 'cancelled') {
          applyNewFile(result);
          showToast(dict.alerts.saveDoneMessage);
        }
      }
    } catch {
      showToast(dict.alerts.saveFailTitle);
    } finally {
      setBusy(false);
    }
  };

  const runSaveAs = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const result = await saveSnapshotAs(getSnapshot());
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
      <Toast message={message} />
    </div>
  );
}
