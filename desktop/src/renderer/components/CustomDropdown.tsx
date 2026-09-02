import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
  group?: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  style?: React.CSSProperties;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  label,
  disabled = false,
  searchable = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = searchable && searchQuery
    ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()) || o.value.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '40px',
          padding: '0 14px',
          borderRadius: '16px',
          background: 'var(--bg-input)',
          border: isOpen ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(124,92,229,0.15)' : 'none',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'var(--border-medium)', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={14} style={{ color: 'var(--accent-primary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-modal)',
            border: '1.5px solid var(--border-medium)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 1000,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {searchable && (
            <div style={{ padding: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', background: 'var(--bg-input)', borderRadius: '12px', height: '32px', border: '1px solid var(--border-subtle)' }}>
                <Search size={12} style={{ color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter options..."
                  autoFocus
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600, outline: 'none', width: '100%' }}
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
              No options found
            </div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: isSelected ? 'var(--bg-button-hover)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-button-subtle)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: isSelected ? 800 : 700 }}>{opt.label}</span>
                      {opt.badge && (
                        <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '100px', background: isSelected ? 'var(--border-medium)' : 'var(--bg-input)', color: 'var(--accent-primary)', fontWeight: 800 }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
