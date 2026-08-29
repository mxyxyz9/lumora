import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { CustomFieldType } from '../lib/types';
import { X, Plus, Trash2, CheckSquare, Hash, Type, Calendar, DollarSign, ListFilter, Loader2 } from 'lucide-react';

export const CustomFieldsModal: React.FC = () => {
  const {
    isCustomFieldsModalOpen,
    setCustomFieldsModalOpen,
    customFields,
    createCustomField,
    deleteCustomField,
    showConfirm,
  } = useBoardStore();

  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [dropdownOptions, setDropdownOptions] = useState<string>('P1, P2, P3, Blocked');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [showOnCard, setShowOnCard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCustomFieldsModalOpen) return null;

  const typeOptions: { id: CustomFieldType; label: string; icon: any }[] = [
    { id: 'text', label: 'Text', icon: Type },
    { id: 'number', label: 'Number / Metric', icon: Hash },
    { id: 'dropdown', label: 'Dropdown / Tag', icon: ListFilter },
    { id: 'checkbox', label: 'Checkbox / Boolean', icon: CheckSquare },
    { id: 'date', label: 'Date', icon: Calendar },
    { id: 'currency', label: 'Currency', icon: DollarSign },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      let settings: any = {};
      if (fieldType === 'dropdown') {
        settings.dropdownItems = dropdownOptions.split(',').map(o => ({
          _id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: o.trim(),
        })).filter(o => o.name);
      } else if (fieldType === 'currency') {
        settings.currencyCode = currencyCode.trim() || 'USD';
      }

      await createCustomField({
        name: fieldName.trim(),
        type: fieldType,
        settings,
        showOnCard,
      });

      setFieldName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create custom field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (cfId: string) => {
    showConfirm({
      title: 'Delete Custom Field',
      message: 'Are you sure you want to delete this custom field definition from all cards?',
      confirmText: 'Delete Field',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteCustomField(cfId);
        } catch (err: any) {
          setError(err.message || 'Failed to delete custom field');
        }
      },
    });
  };

  return (
    <div className="modal-backdrop" onClick={() => setCustomFieldsModalOpen(false)}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 className="modal-title">Custom Fields Definition</h2>
            <p className="modal-subtitle">Extend cards with custom attributes, dropdown tags, numbers and currencies</p>
          </div>
          <button
            onClick={() => setCustomFieldsModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: '#fda4af', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleCreate} style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <div className="form-group">
            <label className="form-label">Field Name</label>
            <input
              type="text"
              required
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. Priority, Story Points, Budget, Sprint Target"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Field Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {typeOptions.map(t => {
                const Icon = t.icon;
                const isSelected = fieldType === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setFieldType(t.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-card)',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      color: isSelected ? '#818cf8' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {fieldType === 'dropdown' && (
            <div className="form-group">
              <label className="form-label">Dropdown Options (comma-separated)</label>
              <input
                type="text"
                value={dropdownOptions}
                onChange={(e) => setDropdownOptions(e.target.value)}
                placeholder="High, Medium, Low, Critical"
                className="form-input"
              />
            </div>
          )}

          {fieldType === 'currency' && (
            <div className="form-group">
              <label className="form-label">Currency Code</label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                placeholder="USD, EUR, GBP, JPY"
                className="form-input font-mono"
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showOnCard}
                onChange={(e) => setShowOnCard(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span>Display field on mini-cards</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !fieldName.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem' }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /><span>Add Field</span></>}
            </button>
          </div>
        </form>

        {/* Existing Custom Fields */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Existing Custom Fields ({customFields.length})
          </div>

          {customFields.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
              No custom fields configured for this workspace.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {customFields.map(cf => (
                <div
                  key={cf._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cf.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      Type: {cf.type} {cf.settings?.dropdownItems ? `(${cf.settings.dropdownItems.length} options)` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(cf._id)}
                    title="Delete Custom Field"
                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
