import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { X, Folder, Layers, Check, Code, Zap, Milestone, ShieldAlert, Cpu } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'midnight', hex: '#7c5ce5', label: 'Purple' },
  { id: 'slate', hex: '#38bdf8', label: 'Cyan' },
  { id: 'emerald', hex: '#34d399', label: 'Green' },
  { id: 'purple', hex: '#c084fc', label: 'Lavender' },
  { id: 'amber', hex: '#fbbf24', label: 'Amber' },
  { id: 'rose', hex: '#f87171', label: 'Rose' },
];

export const PROJECT_EMOJIS = ['🎯', '🚀', '💻', '⚡', '📦', '🎨', '📝', '💡', '🛠️', '📊', '🌐', '🧪', '📚', '☕', '🎮', '🏠'];

const TEMPLATES = [
  {
    id: 'tasks',
    icon: Zap,
    defaultEmoji: '🎯',
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
          width: '560px',
          maxWidth: '92vw',
          height: 'auto',
          maxHeight: '88vh',
          background: 'var(--bg-modal)',
          borderRadius: '36px',
          border: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header (Seamless Minimalist) */}
        <div
          style={{
            padding: '24px 24px 8px',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-modal)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Create New Project
            </h2>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              Local offline engineering board & workstream hub
            </p>
          </div>
          <button
            onClick={() => setNewBoardModalOpen(false)}
            className="btn-icon"
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', color: 'var(--danger)', fontSize: '12px', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
          {/* Project Emoji & Title Row */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Project Icon & Name
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  width: '42px',
                  height: '40px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--border-subtle)',
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
                placeholder="e.g. Mobile App, Core Engine, Sprint Tasks..."
                style={{
                  flex: 1,
                  fontSize: '13px',
                  fontWeight: 600,
                  height: '40px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '0 14px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>

            {/* Quick Emoji Selection Palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', padding: '10px', background: 'var(--bg-input)', borderRadius: '18px', border: '1.5px solid var(--border-subtle)' }}>
              {PROJECT_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '12px',
                    border: selectedIcon === emoji ? '2px solid var(--accent-primary)' : '1px solid transparent',
                    background: selectedIcon === emoji ? 'var(--bg-button-hover)' : 'transparent',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
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
            <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accent Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c.hex,
                    border: selectedColor === c.id ? '2.5px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: selectedColor === c.id ? '0 0 10px var(--border-card)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease',
                    transform: selectedColor === c.id ? 'scale(1.1)' : 'none',
                  }}
                  title={c.label}
                >
                  {selectedColor === c.id && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Starter Template */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Workflow Template
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {TEMPLATES.map(tmpl => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '18px',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                      background: isSelected ? 'var(--bg-input)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: isSelected ? '0 4px 14px var(--border-card)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px' }}>{tmpl.defaultEmoji}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {tmpl.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, fontWeight: 500 }}>
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
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Local Repository Folder (Optional)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={localRepoPath}
                  onChange={e => setLocalRepoPath(e.target.value)}
                  placeholder="/path/to/git/repository"
                  style={{
                    flex: 1,
                    fontSize: '12.5px',
                    height: '38px',
                    fontFamily: 'monospace',
                    background: 'var(--bg-input)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="btn-subtle"
                  style={{ fontSize: '12px', height: '38px', padding: '0 14px', whiteSpace: 'nowrap', borderRadius: '100px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)', fontWeight: 800 }}
                >
                  Browse...
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', paddingTop: '16px', borderTop: '1.5px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setNewBoardModalOpen(false)}
              className="btn-subtle"
              style={{ height: '34px', fontSize: '12px', padding: '0 16px', borderRadius: '100px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="btn-primary"
              style={{ height: '34px', fontSize: '12px', padding: '0 20px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
