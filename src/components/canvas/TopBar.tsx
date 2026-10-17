import { Check, ChevronDown, Copy, FilePlus2, FolderOpen, Info, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDict, useLocale } from '../../i18n';
import { isLocale } from '../../i18n/locale';
import {
  canPickSaveLocation,
  openSnapshotFile,
  saveSnapshotAs,
  type FileSystemFileHandle,
  type OpenedFile,
} from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AboutDialog } from '../ui/AboutDialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PromptDialog } from '../ui/PromptDialog';
import { Toast } from '../ui/Toast';
import { useToast } from '../ui/useToast';
import { LanguageMenu } from './LanguageMenu';
import { loadAutoSavePreference, saveAutoSavePreference, useAutoSave } from './useAutoSave';

function emptySnapshot() {
  return {
    lifeLines: [],
    topGoals: [],
    roadmapNodes: [],
    dailyGoals: [],
    events: [],
    routineBlocks: [],
    widgets: [],
    updatedAt: Date.now(),
  };
}

export function TopBar() {
  const dict = useDict();
  const { locale, setLocale } = useLocale();
  const widgets = usePlanningStore((s) => s.widgets);
  const getSnapshot = usePlanningStore((s) => s.getSnapshot);
  const loadSnapshot = usePlanningStore((s) => s.loadSnapshot);

  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState<OpenedFile | null>(null);
  const [pendingNew, setPendingNew] = useState(false);
  const [nameToSave, setNameToSave] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(loadAutoSavePreference);
  const { message, showToast } = useToast();

  const currentSnapshot = () => ({ ...getSnapshot(), locale });

  // 열려 있는 파일이 있으면, 켜져 있는 동안 변경 내용을 그 파일에 알아서 저장한다.
  const session = useAutoSave({
    handle,
    enabled: autoSave,
    getSnapshot: currentSnapshot,
    onFail: () => {
      setAutoSave(false); // 이번 접속에서만 끈다. 다음에 열면 저장해 둔 선택대로 켜진다.
      showToast(dict.alerts.autoSaveFailMessage);
    },
  });

  const toggleAutoSave = () => {
    const next = !autoSave;
    setAutoSave(next);
    saveAutoSavePreference(next);
  };

  const applyNewFile = (result: { handle: FileSystemFileHandle | null; fileName: string }) => {
    setHandle(result.handle);
    setFileName(result.fileName);
  };

  const doNew = () => {
    loadSnapshot(emptySnapshot());
    session.markClean();
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
      const opened = await openSnapshotFile(dict.file);
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
      // 파일에 언어가 적혀 있으면 그 언어로 맞춘다(예전 파일은 지금 언어를 그대로 둔다).
      if (isLocale(pendingOpen.snapshot.locale)) setLocale(pendingOpen.snapshot.locale);
      setHandle(pendingOpen.handle);
      setFileName(pendingOpen.fileName);
      session.markClean();
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
      const result = await saveSnapshotAs(currentSnapshot(), dict.file, preferredName);
      if (result !== 'cancelled') {
        applyNewFile(result);
        session.markClean();
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
        await session.saveNow();
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
    setNameToSave(fileName ? fileName.replace(/\.json$/i, '') : dict.file.defaultName);
  };

  const runSaveAs = async () => {
    setMenuOpen(false);
    if (canPickSaveLocation()) {
      await doSaveAs(fileName ?? undefined);
      return;
    }
    setNameToSave(fileName ? fileName.replace(/\.json$/i, '') : dict.file.defaultName);
  };

  const confirmNameToSave = () => {
    const base = (nameToSave ?? '').trim() || dict.file.defaultName;
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
      <h1 className="flex min-w-0 items-baseline gap-2 text-[17px] font-bold text-ink">
        {dict.app.title}
        {fileName && (
          <span className="truncate text-[13px] font-medium text-faint">{fileName}</span>
        )}
        {session.active && (
          <span
            className={`shrink-0 text-[12px] font-normal ${session.status === 'error' ? 'text-danger' : 'text-faint'}`}
          >
            {session.status === 'clean'
              ? dict.autoSave.saved
              : session.status === 'error'
                ? dict.autoSave.error
                : dict.autoSave.saving}
          </span>
        )}
      </h1>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => setAboutOpen(true)}
          aria-label={dict.about.open}
          className="flex items-center gap-1.5 rounded-control px-3 py-2 text-[14px] font-medium text-subink transition hover:bg-canvas"
        >
          <Info size={15} />
          <span className="hidden sm:inline">{dict.about.open}</span>
        </button>

        <LanguageMenu />

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
                {canPickSaveLocation() && (
                  <button
                    onClick={toggleAutoSave}
                    disabled={!handle}
                    title={handle ? undefined : dict.autoSave.needFile}
                    role="menuitemcheckbox"
                    aria-checked={autoSave}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <RefreshCw size={16} className="text-subink" />
                    <span className="flex-1 text-[14px] font-medium text-ink">
                      {dict.autoSave.label}
                    </span>
                    {autoSave && <Check size={15} className="text-accent" />}
                  </button>
                )}
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
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
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
