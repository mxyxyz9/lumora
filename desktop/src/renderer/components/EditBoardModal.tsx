import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Board } from '../lib/types';
import { X, Trash2, Check, Save, Cpu, Layers, Folder, CheckCircle2, AlertCircle } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'midnight', hex: '#7c5ce5', label: 'Purple' },
  { id: 'slate', hex: '#38bdf8', label: 'Cyan' },
  { id: 'emerald', hex: '#34d399', label: 'Green' },
  { id: 'purple', hex: '#c084fc', label: 'Lavender' },
  { id: 'amber', hex: '#fbbf24', label: 'Amber' },
  { id: 'rose', hex: '#f87171', label: 'Rose' },
];

const PROJECT_EMOJIS = ['🎯', '🚀', '💻', '⚡', '📦', '🎨', '📝', '💡', '🛠️', '📊', '🌐', '🧪', '📚', '☕', '🎮', '🏠'];

interface EditBoardModalProps {
  board: Board | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditBoardModal: React.FC<EditBoardModalProps> = ({ board, isOpen, onClose }) => {
  const { updateBoard, deleteBoard, showConfirm } = useBoardStore();

  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('midnight');
  const [projectType, setProjectType] = useState<'engineering' | 'general' | 'roadmap'>('engineering');
  const [localRepoPath, setLocalRepoPath] = useState('');
  const [dirStatus, setDirStatus] = useState<{ exists: boolean; isGit: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkDir = async (path: string) => {
    if (window.electronAPI?.verifyDirectoryExists) {
      const res = await window.electronAPI.verifyDirectoryExists(path);
      setDirStatus(res);
    }
  };

  const handleBrowseFolder = async () => {
    if (window.electronAPI?.openDirectoryDialog) {
      const chosen = await window.electronAPI.openDirectoryDialog('Select Codebase Repository Folder');
      if (chosen) {
        setLocalRepoPath(chosen);
        checkDir(chosen);
      }
    }
  };

  useEffect(() => {
    if (board) {
      const rawTitle = (board.title || '').replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '');
      setTitle(rawTitle);
      setSelectedIcon(board.icon || '🎯');
      setSelectedColor(board.color || 'midnight');
      setProjectType(board.projectType || 'engineering');
      setLocalRepoPath(board.localRepoPath || '');
      if (board.localRepoPath) {
        checkDir(board.localRepoPath);
      }
    }
  }, [board, isOpen]);

  if (!isOpen || !board) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await updateBoard(board._id, {
        title: title.trim(),
        icon: selectedIcon,
        color: selectedColor,
        projectType,
        localRepoPath: localRepoPath.trim(),
        enableCodexAgent: projectType === 'engineering',
      });
      onClose();
    } catch (err) {
      console.error('Failed to update project', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to permanently delete project "${board.title}" and all its subfolders and tasks?`,
      confirmText: 'Delete Project',
      isDestructive: true,
      onConfirm: async () => {
        await deleteBoard(board._id);
        onClose();
      },
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{
          width: '520px',
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
        {/* Playful Seamless Header */}
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
              Edit Project Settings
            </h2>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              Update project details, repository link, and Codex autonomous dev configuration
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form noValidate onSubmit={handleSave} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
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
                placeholder="Project title..."
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

          {/* Color Selector */}
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

          {/* Project Type & Codex Workspace Mode */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Project Mode & AI Pipeline
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setProjectType('engineering')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '18px',
                  border: projectType === 'engineering' ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                  background: projectType === 'engineering' ? 'var(--bg-input)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: projectType === 'engineering' ? '0 4px 14px var(--border-card)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Engineering & Code
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.35, fontWeight: 500 }}>
                  Autonomous Codex diagnosis, git branches, quality gates & PRs
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProjectType('general')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '18px',
                  border: projectType === 'general' ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                  background: projectType === 'general' ? 'var(--bg-input)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: projectType === 'general' ? '0 4px 14px var(--border-card)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    General Tasks & Ops
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.35, fontWeight: 500 }}>
                  Task specs, sprint planning & agile breakdown without code repo
                </span>
              </button>
            </div>
          </div>

          {/* Local Codebase Repository Path (if engineering) */}
          {projectType === 'engineering' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Local Codebase Repository Path
                </label>
                {dirStatus && (
                  <span style={{ fontSize: '11px', color: dirStatus.exists ? '#2ecc71' : '#e74c3c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {dirStatus.exists ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {dirStatus.exists ? (dirStatus.isGit ? 'Valid Git Repository' : 'Folder Found') : 'Directory not found'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={localRepoPath}
                  onChange={e => {
                    setLocalRepoPath(e.target.value);
                    checkDir(e.target.value);
                  }}
                  placeholder="/Users/name/projects/my-codebase"
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
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                Codex uses this local directory to inspect code, run test suites, and create isolated git branches.
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '16px', borderTop: '1.5px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-destructive"
              style={{ height: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', borderRadius: '100px' }}
            >
              <Trash2 size={13} />
              <span>Delete Project</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-subtle"
                style={{ height: '34px', fontSize: '12px', padding: '0 16px', borderRadius: '100px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="btn-primary"
                style={{ height: '34px', fontSize: '12px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
              >
                <Save size={13} />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
