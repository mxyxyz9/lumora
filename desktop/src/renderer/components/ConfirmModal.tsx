import React from 'react';
import { useBoardStore } from '../store/boardStore';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useBoardStore();

  if (!confirmDialog?.isOpen) return null;

  const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm } = confirmDialog;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      closeConfirm();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={closeConfirm}
    >
      <div
        className="modal-dialog"
        style={{
          width: '420px',
          maxWidth: '92vw',
          height: 'auto',
          maxHeight: '85vh',
        }}
        onClick={e => e.stopPropagation()}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDestructive && (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(248,113,113,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-red)',
                }}
              >
                <AlertTriangle size={13} />
              </div>
            )}
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </span>
          </div>

          <button onClick={closeConfirm} className="btn-icon" style={{ width: '26px', height: '26px' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </div>

        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={closeConfirm}
            className="btn-subtle"
            style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              height: '30px',
              fontSize: '12px',
              padding: '0 14px',
              borderRadius: 'var(--r-md)',
              fontWeight: 600,
              cursor: 'pointer',
              border: isDestructive ? 'none' : '1px solid var(--border-strong)',
              background: isDestructive ? 'var(--accent-red)' : 'var(--text-primary)',
              color: '#ffffff',
              transition: 'all var(--t-fast)',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
