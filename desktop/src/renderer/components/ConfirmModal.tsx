import React, { useEffect, useCallback } from 'react';
import { useBoardStore } from '../store/boardStore';
import {
  AlertTriangle,
  AlertCircle,
  LogOut,
  Info,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useBoardStore();

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog) return;
    try {
      await confirmDialog.onConfirm();
    } finally {
      closeConfirm();
    }
  }, [confirmDialog, closeConfirm]);

  const handleCancel = useCallback(() => {
    if (!confirmDialog) return;
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    closeConfirm();
  }, [confirmDialog, closeConfirm]);

  useEffect(() => {
    if (!confirmDialog?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog?.isOpen, handleCancel, handleConfirm]);

  if (!confirmDialog?.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    variant: rawVariant,
    icon: rawIcon,
    badge,
    note,
  } = confirmDialog;

  // Resolve effective dialog type
  const isQuit =
    rawVariant === 'quit' ||
    rawIcon === 'logout' ||
    title.toLowerCase().includes('quit');

  const resolvedVariant = isQuit
    ? 'quit'
    : isDestructive || rawVariant === 'danger'
    ? 'danger'
    : rawVariant === 'warning'
    ? 'warning'
    : rawVariant === 'info'
    ? 'info'
    : 'primary';

  const renderIcon = () => {
    if (rawIcon === 'logout' || isQuit) {
      return <LogOut size={18} strokeWidth={2.2} />;
    }
    if (rawIcon === 'danger' || resolvedVariant === 'danger') {
      return <AlertTriangle size={18} strokeWidth={2.2} />;
    }
    if (rawIcon === 'warning' || resolvedVariant === 'warning') {
      return <AlertCircle size={18} strokeWidth={2.2} />;
    }
    if (rawIcon === 'sparkles') {
      return <Sparkles size={18} strokeWidth={2.2} />;
    }
    if (rawIcon === 'info' || resolvedVariant === 'info') {
      return <Info size={18} strokeWidth={2.2} />;
    }
    return <HelpCircle size={18} strokeWidth={2.2} />;
  };

  const btnClass =
    resolvedVariant === 'quit'
      ? 'confirm-btn confirm-btn-quit'
      : resolvedVariant === 'danger'
      ? 'confirm-btn confirm-btn-danger'
      : 'confirm-btn confirm-btn-primary';

  return (
    <div className="confirm-modal-overlay" onClick={handleCancel}>
      <div
        className="confirm-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '18px 20px 14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={`confirm-icon-badge ${resolvedVariant}`}>
              {renderIcon()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  id="confirm-modal-title"
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.015em',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h3>
                {badge && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 'var(--r-full)',
                      background: 'var(--bg-badge)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="btn-icon"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 20px 20px 20px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              fontWeight: 400,
            }}
          >
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg-header)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            className="confirm-btn confirm-btn-cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={btnClass}
            autoFocus
          >
            {isQuit && <LogOut size={14} />}
            {resolvedVariant === 'danger' && <AlertTriangle size={14} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
