import { Download, Upload } from 'lucide-react';
import { useState } from 'react';

import { useDict } from '../../i18n';
import { pickAndLoadSnapshotFile, saveSnapshotToFile } from '../../services/fileStorage';
import { usePlanningStore } from '../../store/usePlanningStore';
import type { PlanningSnapshot } from '../../types/planning';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Toast } from '../ui/Toast';
import { useToast } from '../ui/useToast';

export function TopBar() {
  const dict = useDict();
  const [pendingImport, setPendingImport] = useState<PlanningSnapshot | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const { message, showToast } = useToast();
  const getSnapshot = usePlanningStore((s) => s.getSnapshot);
  const loadSnapshot = usePlanningStore((s) => s.loadSnapshot);

  const runExport = async () => {
    setExportBusy(true);
    try {
      await saveSnapshotToFile(getSnapshot());
      showToast(dict.alerts.exportDoneMessage);
    } catch {
      showToast(dict.alerts.exportFailTitle);
    } finally {
      setExportBusy(false);
    }
  };

  const pickImportFile = async () => {
    setImportBusy(true);
    try {
      const snapshot = await pickAndLoadSnapshotFile();
      if (snapshot) setPendingImport(snapshot);
    } catch {
      showToast(dict.alerts.importInvalidFileMessage);
    } finally {
      setImportBusy(false);
    }
  };

  const confirmImport = () => {
    if (pendingImport) {
      loadSnapshot(pendingImport);
      showToast(dict.alerts.importDoneMessage);
    }
    setPendingImport(null);
  };

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-5 py-3.5">
      <h1 className="text-[17px] font-bold text-ink">{dict.app.title}</h1>
      <div className="flex items-center gap-1.5">
        <button
          disabled={exportBusy}
          onClick={runExport}
          className="flex items-center gap-1.5 rounded-control px-3 py-2 text-[14px] font-medium text-subink transition hover:bg-canvas disabled:opacity-50"
        >
          <Upload size={16} />
          {dict.topbar.export}
        </button>
        <button
          disabled={importBusy}
          onClick={pickImportFile}
          className="flex items-center gap-1.5 rounded-control px-3 py-2 text-[14px] font-medium text-subink transition hover:bg-canvas disabled:opacity-50"
        >
          <Download size={16} />
          {dict.topbar.import}
        </button>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title={dict.confirm.importTitle}
        message={dict.confirm.importMessage}
        confirmLabel={dict.confirm.importConfirm}
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
      <Toast message={message} />
    </div>
  );
}
