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
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
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
          height: '38px',
          padding: '0 12px',
          borderRadius: 'var(--r-md)',
          background: 'var(--bg-input)',
          border: isOpen ? '1px solid var(--accent-blue)' : '1px solid var(--border-medium)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all var(--t-fast)',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(79,142,247,0.15)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--r-xs)', background: 'rgba(79,142,247,0.15)', color: 'var(--accent-blue)', fontWeight: 600 }}>
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={14} style={{ opacity: 0.6, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-fast)', flexShrink: 0 }} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 1000,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            backdropFilter: 'blur(16px)',
          }}
        >
          {searchable && (
            <div style={{ padding: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', background: 'var(--bg-input)', borderRadius: 'var(--r-xs)', height: '28px' }}>
                <Search size={12} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter models..."
                  autoFocus
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', width: '100%' }}
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
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
                    padding: '8px 10px',
                    borderRadius: 'var(--r-sm)',
                    border: 'none',
                    background: isSelected ? 'rgba(79,142,247,0.12)' : 'transparent',
                    color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background var(--t-fast)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-button-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: isSelected ? 700 : 500 }}>{opt.label}</span>
                      {opt.badge && (
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: 'var(--r-xs)', background: isSelected ? 'rgba(79,142,247,0.2)' : 'var(--bg-badge)', color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
