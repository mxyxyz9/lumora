import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { X, Folder, Layers, Check, Code, Zap, Milestone, ShieldAlert, Cpu } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'midnight', hex: '#4f8ef7', label: 'Blue' },
  { id: 'slate', hex: '#38bdf8', label: 'Cyan' },
  { id: 'emerald', hex: '#34d399', label: 'Green' },
  { id: 'purple', hex: '#c084fc', label: 'Purple' },
  { id: 'amber', hex: '#fbbf24', label: 'Amber' },
  { id: 'rose', hex: '#f87171', label: 'Rose' },
];

export const PROJECT_EMOJIS = ['🎯', '🚀', '💻', '⚡', '📦', '🎨', '📝', '💡', '🛠️', '📊', '🌐', '🧪', '📚', '☕', '🎮', '🏠'];

const TEMPLATES = [
  {
    id: 'tasks',
    icon: Zap,
    defaultEmoji: '🎯',
    iconColor: 'var(--accent-blue)',
    name: 'Personal Tasks & Workstream',
    desc: 'Clean, simple daily to-do, in progress, and done flow for everyday work',
    subfolders: ['Daily Tasks', 'Projects & Ideas'],
    lists: ['To Do', 'In Progress', 'Done'],
    projectType: 'general' as const,
  },
  {
    id: 'codex',
    icon: Cpu,
    defaultEmoji: '🚀',
    iconColor: '#818cf8',
    name: 'Autonomous Dev Pipeline',
    desc: 'Autonomous issue diagnosis, code generation, quality gates & PR review',
    subfolders: ['Bugs & Fixes', 'Features', 'Refactoring'],
    lists: [
      'Backlog',
      'Diagnosis',
      'In Progress',
      'Review',
      'Shipped',
    ],
    projectType: 'engineering' as const,
  },
  {
    id: 'coding',
    icon: Code,
    defaultEmoji: '💻',
    iconColor: '#38bdf8',
    name: 'Fullstack Engineering',
    desc: 'Frontend, Backend, DevOps workstreams with PR review flow',
    subfolders: ['Frontend UI', 'Backend & API', 'DevOps & Infra'],
    lists: ['Backlog', 'In Progress', 'PR Review', 'Done'],
    projectType: 'engineering' as const,
  },
  {
    id: 'sprint',
    icon: Zap,
    defaultEmoji: '⚡',
    iconColor: 'var(--accent-amber)',
    name: 'Sprint Scrum',
    desc: 'Sprint 1, Sprint 2 with rapid task velocity',
    subfolders: ['Sprint 1', 'Sprint 2', 'Tech Debt'],
    lists: ['Sprint Backlog', 'In Progress', 'Review', 'Done'],
    projectType: 'general' as const,
  },
  {
    id: 'roadmap',
    icon: Milestone,
    defaultEmoji: '📦',
    iconColor: 'var(--accent-purple)',
    name: 'Product Roadmap',
    desc: 'Milestones, architecture & strategic initiatives',
    subfolders: ['Core Engine', 'UI Components', 'Integrations'],
    lists: ['Backlog', 'Planned', 'In Progress', 'Shipped'],
    projectType: 'roadmap' as const,
  },
];

export const NewBoardModal: React.FC = () => {
  const { isNewBoardModalOpen, setNewBoardModalOpen, createBoard, updateBoard } = useBoardStore();

  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('midnight');
  const [selectedTemplate, setSelectedTemplate] = useState('tasks');
  const [localRepoPath, setLocalRepoPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNewBoardModalOpen) return null;

  const handleBrowseFolder = async () => {
    if (window.electronAPI?.openDirectoryDialog) {
      const chosen = await window.electronAPI.openDirectoryDialog('Select Codebase Repository Folder');
      if (chosen) {
        setLocalRepoPath(chosen);
      }
    }
  };

  const handleSelectTemplate = (tId: string) => {
    setSelectedTemplate(tId);
    const tmpl = TEMPLATES.find(t => t.id === tId);
    if (tmpl) {
      setSelectedIcon(tmpl.defaultEmoji);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const t = TEMPLATES.find(tmpl => tmpl.id === selectedTemplate);
      const newBoardId = await createBoard(
        title.trim(),
        selectedColor,
        'private',
        t?.lists,
        t?.subfolders,
        selectedIcon
      );

      if (newBoardId) {
        await updateBoard(newBoardId as string, {
          icon: selectedIcon,
          localRepoPath: localRepoPath.trim(),
          projectType: t?.projectType || 'general',
          enableCodexAgent: t?.projectType === 'engineering',
        });
      }

      setTitle('');
      setSelectedIcon('🎯');
      setLocalRepoPath('');
      setNewBoardModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => setNewBoardModalOpen(false)}
    >
      <div
        className="modal-dialog"
        style={{
          width: '540px',
          maxWidth: '92vw',
          height: 'auto',
          maxHeight: '88vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-header)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create New Project
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Local offline engineering board & workstream hub
            </p>
          </div>
          <button
            onClick={() => setNewBoardModalOpen(false)}
            className="btn-icon"
            style={{ width: '28px', height: '28px' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '12px 20px 0', padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--r-sm)', color: 'var(--accent-red)', fontSize: '12px' }}>
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          {/* Project Emoji & Title Row */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Project Icon & Name
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '38px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-input)',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {selectedIcon}
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. My Tasks, Mobile App, Core Engine..."
                className="form-input"
                style={{ flex: 1, fontSize: '13px', height: '38px' }}
                autoFocus
              />
            </div>

            {/* Quick Emoji Selection Palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', padding: '8px', background: 'var(--bg-card-hover)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
              {PROJECT_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--r-sm)',
                    border: selectedIcon === emoji ? '2px solid var(--accent-blue)' : '1px solid transparent',
                    background: selectedIcon === emoji ? 'var(--bg-card)' : 'transparent',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--t-fast)',
                    transform: selectedIcon === emoji ? 'scale(1.15)' : 'none',
                  }}
                  title={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Accent Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c.hex,
                    border: selectedColor === c.id ? '2px solid #ffffff' : 'none',
                    boxShadow: selectedColor === c.id ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={c.label}
                >
                  {selectedColor === c.id && <Check size={12} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Starter Template */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Select Workflow Template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {TEMPLATES.map(tmpl => {
                const IconComponent = tmpl.icon;
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--r-md)',
                      border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: isSelected ? '0 0 10px rgba(79,142,247,0.1)' : 'none',
                      transition: 'all var(--t-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{tmpl.defaultEmoji}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {tmpl.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {tmpl.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Codebase Folder Linker (Only shown if engineering template or user chooses) */}
          {(selectedTemplate === 'codex' || selectedTemplate === 'coding') && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Local Repository Folder (Optional)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={localRepoPath}
                  onChange={e => setLocalRepoPath(e.target.value)}
                  placeholder="/path/to/git/repository"
                  className="form-input"
                  style={{ flex: 1, fontSize: '12px', fontFamily: 'var(--font-mono)', height: '34px' }}
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="btn-subtle"
                  style={{ height: '34px', fontSize: '11.5px', padding: '0 12px', flexShrink: 0 }}
                >
                  Browse...
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setNewBoardModalOpen(false)}
              className="btn-subtle"
              style={{ height: '30px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="btn-primary"
              style={{ height: '30px', fontSize: '12px', padding: '0 16px' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
