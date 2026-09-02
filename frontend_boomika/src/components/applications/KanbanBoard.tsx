import React, { useState } from 'react';
import { Mail, Eye, CheckSquare, Trophy, XCircle, GripVertical } from 'lucide-react';
import { TimelineItem } from '../../types';

interface KanbanBoardProps {
  timeline: TimelineItem[];
}

type KanbanColumn = 'applied' | 'viewed' | 'interview' | 'offer' | 'rejected';

interface KanbanCard {
  id: string;
  column: KanbanColumn;
  title: string;
  company: string;
  time: string;
  description: string;
  status?: string;
  type: TimelineItem['type'];
}

const COLUMNS: { id: KanbanColumn; label: string; icon: React.ReactNode; color: string; darkBg: string; lightBg: string }[] = [
  {
    id: 'applied',
    label: 'Applied',
    icon: <Mail className="w-3.5 h-3.5" />,
    color: 'text-blue-600',
    lightBg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900/20',
  },
  {
    id: 'viewed',
    label: 'Viewed',
    icon: <Eye className="w-3.5 h-3.5" />,
    color: 'text-purple-600',
    lightBg: 'bg-purple-50',
    darkBg: 'dark:bg-purple-900/20',
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: <CheckSquare className="w-3.5 h-3.5" />,
    color: 'text-amber-600',
    lightBg: 'bg-amber-50',
    darkBg: 'dark:bg-amber-900/20',
  },
  {
    id: 'offer',
    label: 'Offer',
    icon: <Trophy className="w-3.5 h-3.5" />,
    color: 'text-green-600',
    lightBg: 'bg-green-50',
    darkBg: 'dark:bg-green-900/20',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-slate-400',
    lightBg: 'bg-slate-50',
    darkBg: 'dark:bg-slate-700/30',
  },
];

function timelineTypeToColumn(type: TimelineItem['type']): KanbanColumn {
  switch (type) {
    case 'submitted': return 'applied';
    case 'viewed': return 'viewed';
    case 'interview': return 'interview';
    case 'offer': return 'offer';
    default: return 'applied';
  }
}

/**
 * Feature 4 — Applications Kanban Board View
 * Drag-and-drop Kanban board showing timeline items as cards across pipeline columns.
 * Cards can be dragged between columns to update status.
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({ timeline }) => {
  const [cards, setCards] = useState<KanbanCard[]>(() =>
    timeline.map((item) => ({
      id: item.id,
      column: timelineTypeToColumn(item.type),
      title: item.title,
      company: item.company || 'Unknown',
      time: item.time,
      description: item.description,
      status: item.status,
      type: item.type,
    }))
  );

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumn | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: KanbanColumn) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDrop = (col: KanbanColumn) => {
    if (!draggedId) return;
    setCards(prev =>
      prev.map(c => c.id === draggedId ? { ...c, column: col } : c)
    );
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((col) => {
          const colCards = cards.filter(c => c.column === col.id);
          const isDragTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
              className={`w-56 flex flex-col rounded-xl transition-all ${
                isDragTarget
                  ? `${col.lightBg} ${col.darkBg} ring-2 ring-blue-400 dark:ring-blue-500`
                  : 'bg-slate-50 dark:bg-slate-800/40'
              } p-3`}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between mb-3 px-1`}>
                <div className={`flex items-center gap-1.5 ${col.color}`}>
                  {col.icon}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700/60 px-1.5 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[120px]">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 shadow-subtle cursor-grab active:cursor-grabbing hover:shadow-card transition-all select-none ${
                      draggedId === card.id ? 'opacity-50 scale-95' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                          {card.company}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {card.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                          {card.time}
                        </p>
                        {card.status && (
                          <span className="inline-block mt-1.5 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                            {card.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {colCards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-600 font-medium py-4 text-center">
                    Drop cards here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
