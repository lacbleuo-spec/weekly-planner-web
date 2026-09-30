import { Pencil, Plus, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';
import type { RoadmapNode } from '../../types/planning';

interface RoadmapWidgetProps {
  widgetId: string;
  topGoalId?: string;
}

export function RoadmapWidget({ widgetId, topGoalId }: RoadmapWidgetProps) {
  const dict = useDict();
  const topGoals = usePlanningStore((s) => s.topGoals);
  const roadmapNodes = usePlanningStore((s) => s.roadmapNodes);
  const addRoadmapNode = usePlanningStore((s) => s.addRoadmapNode);
  const updateRoadmapNode = usePlanningStore((s) => s.updateRoadmapNode);
  const deleteRoadmapNode = usePlanningStore((s) => s.deleteRoadmapNode);
  const setWidgetConfig = usePlanningStore((s) => s.setWidgetConfig);
  const [addingParent, setAddingParent] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const selectedGoalId = topGoalId ?? topGoals[0]?.id ?? null;

  const nodes = useMemo(
    () => roadmapNodes.filter((n) => n.topGoalId === selectedGoalId),
    [roadmapNodes, selectedGoalId]
  );
  const roots = nodes.filter((n) => n.parentId === null);
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

  if (topGoals.length === 0) {
    return <p className="text-[13px] text-faint">{dict.widgets.roadmap.needTopGoal}</p>;
  }

  const startEdit = (node: RoadmapNode) => {
    setEditingId(node.id);
    setEditValue(node.title);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (editingId && trimmed) {
      updateRoadmapNode(editingId, trimmed);
    }
    setEditingId(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const renderNode = (node: RoadmapNode, depth: number): ReactNode => {
    const isEditing = editingId === node.id;
    return (
      <div key={node.id} style={{ marginLeft: depth * 14 }}>
        <div className="group flex items-center justify-between gap-2 py-1">
          {isEditing ? (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={onEditKeyDown}
              onBlur={commitEdit}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink focus:outline-none"
            />
          ) : (
            <span className="flex-1 text-[13px] text-ink">
              {depth > 0 ? '· ' : ''}
              {node.title}
            </span>
          )}
          <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => startEdit(node)}
              aria-label={dict.common.edit}
              className="text-faint hover:text-accent"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setAddingParent(node.id)}
              aria-label={dict.widgets.roadmap.addChild}
              className="text-faint hover:text-accent"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => deleteRoadmapNode(node.id)}
              aria-label={dict.common.delete}
              className="text-faint hover:text-danger"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        {childrenOf(node.id).map((child) => renderNode(child, depth + 1))}
        {addingParent === node.id && (
          <div style={{ marginLeft: (depth + 1) * 14 }}>
            <AddRow
              placeholder={dict.widgets.roadmap.addChildPlaceholder}
              onSubmit={(title) => {
                addRoadmapNode(selectedGoalId as string, node.id, title);
                setAddingParent(null);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {topGoals.map((g) => (
          <button
            key={g.id}
            onClick={() => setWidgetConfig(widgetId, { topGoalId: g.id })}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              g.id === selectedGoalId
                ? 'bg-accent text-white'
                : 'bg-canvas text-subink hover:bg-line'
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {roots.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.roadmap.empty}</p>
        )}
        {roots.map((n) => renderNode(n, 0))}
      </div>
      <AddRow
        placeholder={dict.widgets.roadmap.addPlaceholder}
        onSubmit={(title) => addRoadmapNode(selectedGoalId as string, null, title)}
      />
    </div>
  );
}
