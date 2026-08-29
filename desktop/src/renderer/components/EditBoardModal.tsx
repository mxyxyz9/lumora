import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Board } from '../lib/types';
import { X, Trash2, Check, Save, Cpu, Layers, Folder, CheckCircle2, AlertCircle } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'midnight', hex: '#4f8ef7', label: 'Blue' },
  { id: 'slate', hex: '#38bdf8', label: 'Cyan' },
  { id: 'emerald', hex: '#34d399', label: 'Green' },
  { id: 'purple', hex: '#c084fc', label: 'Purple' },
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
              Edit Project Settings
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Update project details, repository link, and Codex autonomous dev configuration
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '28px', height: '28px' }} title="Close">
            <X size={15} />
          </button>
        </div>

        <form noValidate onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
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
                placeholder="Project title..."
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

          {/* Color Selector */}
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

          {/* Project Type & Codex Workspace Mode */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Project Mode & AI Pipeline
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setProjectType('engineering')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  border: `1px solid ${projectType === 'engineering' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                  background: projectType === 'engineering' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: projectType === 'engineering' ? '0 0 10px rgba(79,142,247,0.1)' : 'none',
                  transition: 'all var(--t-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Engineering & Code
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  Autonomous Codex diagnosis, git branches, quality gates & PRs
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProjectType('general')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  border: `1px solid ${projectType === 'general' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                  background: projectType === 'general' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: projectType === 'general' ? '0 0 10px rgba(79,142,247,0.1)' : 'none',
                  transition: 'all var(--t-fast)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} style={{ color: 'var(--accent-amber)' }} />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    General Tasks & Ops
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  Task specs, sprint planning & agile breakdown without code repo
                </span>
              </button>
            </div>
          </div>

          {/* Local Codebase Repository Path (if engineering) */}
          {projectType === 'engineering' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Local Codebase Repository Path
                </label>
                {dirStatus && (
                  <span style={{ fontSize: '11px', color: dirStatus.exists ? 'var(--success)' : 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {dirStatus.exists ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {dirStatus.exists ? (dirStatus.isGit ? 'Valid Git Repository' : 'Folder Found') : 'Directory not found'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={localRepoPath}
                  onChange={e => {
                    setLocalRepoPath(e.target.value);
                    checkDir(e.target.value);
                  }}
                  placeholder="/Users/name/projects/my-codebase"
                  className="form-input"
                  style={{ flex: 1, fontSize: '12px', height: '34px', fontFamily: 'var(--font-mono)' }}
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="btn-subtle"
                  style={{ fontSize: '11.5px', height: '34px', padding: '0 12px', whiteSpace: 'nowrap' }}
                >
                  Browse...
                </button>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Codex uses this local directory to inspect code, run test suites, and create isolated git branches.
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-destructive"
              style={{ height: '30px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px' }}
            >
              <Trash2 size={13} />
              <span>Delete Project</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-subtle"
                style={{ height: '30px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="btn-primary"
                style={{ height: '30px', fontSize: '12px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
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
