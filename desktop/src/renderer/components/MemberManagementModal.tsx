import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { X, UserPlus, Shield, User, MessageSquare, Briefcase, Eye, Trash2, Loader2, Check, ChevronDown } from 'lucide-react';

export const MemberManagementModal: React.FC = () => {
  const { isMemberModalOpen, setMemberModalOpen, activeBoard, addBoardMember, removeBoardMember, showConfirm } = useBoardStore();

  const [memberInput, setMemberInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'normal' | 'comment-only' | 'worker' | 'read-only'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openRoleMenuUserId, setOpenRoleMenuUserId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenRoleMenuUserId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isMemberModalOpen || !activeBoard) return null;

  const members = activeBoard.members || [];

  const roles = [
    { id: 'admin', label: 'Admin', icon: Shield, desc: 'Full write & board management capabilities' },
    { id: 'normal', label: 'Member', icon: User, desc: 'Can edit cards, lists, checklists and comments' },
    { id: 'worker', label: 'Worker', icon: Briefcase, desc: 'Assigned cards only' },
    { id: 'comment-only', label: 'Commenter', icon: MessageSquare, desc: 'Can only comment on cards' },
    { id: 'read-only', label: 'Observer', icon: Eye, desc: 'Read only access' },
  ];

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberInput.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await addBoardMember(memberInput.trim(), selectedRole);
      setSuccess(`Member "${memberInput.trim()}" added successfully`);
      setMemberInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    showConfirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the workspace?',
      confirmText: 'Remove Member',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await removeBoardMember(userId);
        } catch (err: any) {
          setError(err.message || 'Failed to remove member');
        }
      },
    });
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await addBoardMember(userId, newRole);
      setOpenRoleMenuUserId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setMemberModalOpen(false)}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 className="modal-title">Workspace Members & Permissions</h2>
            <p className="modal-subtitle">Manage access, roles and card assignment permissions</p>
          </div>
          <button
            onClick={() => setMemberModalOpen(false)}
            className="btn-icon"
            style={{ width: '28px', height: '28px' }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '10px 14px', borderRadius: 'var(--r-md)', color: '#fda4af', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '10px 14px', borderRadius: 'var(--r-md)', color: '#6ee7b7', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} />
            <span>{success}</span>
          </div>
        )}

        {/* Add Member Form */}
        <form onSubmit={handleAddMember} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={14} style={{ color: 'var(--accent-blue)' }} />
            <span>Invite Member by User ID / Username</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="text"
              required
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder="e.g. user ID or username"
              className="form-input"
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !memberInput.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <span>Add Member</span>}
            </button>
          </div>

          {/* Role selector chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {roles.map(r => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: 'var(--r-sm)',
                    background: isSelected ? 'var(--bg-button-hover)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'all var(--t-fast)',
                  }}
                  title={r.desc}
                >
                  <Icon size={12} style={{ color: isSelected ? 'var(--accent-blue)' : undefined }} />
                  <span>{r.label}</span>
                </div>
              );
            })}
          </div>
        </form>

        {/* Existing Members List */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Current Members ({members.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {members.map(m => {
              let currentRole = 'normal';
              if (m.isAdmin) currentRole = 'admin';
              else if (m.isCommentOnly) currentRole = 'comment-only';
              else if (m.isWorker) currentRole = 'worker';

              const currentRoleObj = roles.find(r => r.id === currentRole) || roles[1];
              const isMenuOpen = openRoleMenuUserId === m.userId;

              return (
                <div
                  key={m.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(79,142,247,0.15)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                      }}
                    >
                      {m.userId.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.username || `User ${m.userId.slice(0, 8)}...`}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        ID: {m.userId}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={isMenuOpen ? menuRef : undefined}>
                    {/* Custom Role Pill Dropdown */}
                    <button
                      type="button"
                      onClick={() => setOpenRoleMenuUserId(isMenuOpen ? null : m.userId)}
                      className="notion-prop-pill"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      <currentRoleObj.icon size={11} style={{ color: 'var(--accent-blue)' }} />
                      <span>{currentRoleObj.label}</span>
                      <ChevronDown size={10} style={{ opacity: 0.7 }} />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="notion-prop-dropdown"
                        style={{ right: 0, left: 'auto', minWidth: '180px', padding: '4px' }}
                      >
                        {roles.map(r => {
                          const isCur = r.id === currentRole;
                          const RIcon = r.icon;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleUpdateRole(m.userId, r.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: 'var(--r-sm)',
                                border: 'none',
                                background: isCur ? 'var(--bg-button-hover)' : 'transparent',
                                color: isCur ? 'var(--accent-blue)' : 'var(--text-primary)',
                                fontSize: '11.5px',
                                fontWeight: isCur ? 600 : 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <RIcon size={12} />
                                <span>{r.label}</span>
                              </div>
                              {isCur && <Check size={11} />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      title="Remove Member"
                      className="btn-icon"
                      style={{ width: '26px', height: '26px', color: 'var(--accent-red)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
