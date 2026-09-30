import { ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';

export function TopGoalWidget() {
  const dict = useDict();
  const topGoals = usePlanningStore((s) => s.topGoals);
  const addTopGoal = usePlanningStore((s) => s.addTopGoal);
  const updateTopGoal = usePlanningStore((s) => s.updateTopGoal);
  const moveTopGoal = usePlanningStore((s) => s.moveTopGoal);
  const deleteTopGoal = usePlanningStore((s) => s.deleteTopGoal);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (editingId && trimmed) updateTopGoal(editingId, trimmed);
    setEditingId(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {topGoals.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.topGoal.empty}</p>
        )}
        {topGoals.map((g, index) => (
          <div key={g.id} className="group flex items-center justify-between gap-2 py-1.5">
            {editingId === g.id ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={onEditKeyDown}
                onBlur={commitEdit}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-[14px] text-ink">{g.title}</span>
            )}
            <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => moveTopGoal(g.id, 'up')}
                disabled={index === 0}
                aria-label={dict.common.moveUp}
                className="text-faint hover:text-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveTopGoal(g.id, 'down')}
                disabled={index === topGoals.length - 1}
                aria-label={dict.common.moveDown}
                className="text-faint hover:text-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => startEdit(g.id, g.title)}
                aria-label={dict.common.edit}
                className="text-faint hover:text-accent"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteTopGoal(g.id)}
                aria-label={dict.common.delete}
                className="text-faint hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AddRow placeholder={dict.widgets.topGoal.addPlaceholder} onSubmit={addTopGoal} />
    </div>
  );
}
