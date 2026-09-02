import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  triggerClassName?: string;
  menuStyle?: React.CSSProperties;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  label,
  disabled = false,
  searchable = false,
  size = 'md',
  style,
  triggerStyle,
  triggerClassName,
  menuStyle,
  className,
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

  const height = size === 'sm' ? '32px' : size === 'lg' ? '46px' : '38px';
  const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '14px' : '13px';
  const borderRadius = size === 'sm' ? '100px' : size === 'lg' ? '18px' : '14px';
  const padding = size === 'sm' ? '0 10px 0 12px' : '0 14px';

  return (
    <div
      ref={dropdownRef}
      className={className}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {label && (
        <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
        style={{
          width: '100%',
          height,
          padding,
          borderRadius,
          background: 'var(--bg-input)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(124, 92, 229, 0.15)' : 'none',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
          ...triggerStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
          {selectedOption?.icon && (
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {selectedOption.icon}
            </span>
          )}
          <span style={{ fontWeight: 700, color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '100px', background: 'var(--bg-badge)', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={size === 'sm' ? 12 : 14} style={{ color: 'var(--accent-primary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
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
            animation: 'modalPop 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            ...menuStyle,
          }}
        >
          {searchable && (
            <div style={{ padding: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', background: 'var(--bg-input)', borderRadius: '12px', height: '30px', border: '1px solid var(--border-subtle)' }}>
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
                    padding: size === 'sm' ? '6px 10px' : '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSelected ? 'var(--bg-button-hover)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontSize: size === 'sm' ? '12px' : '12.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-button-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {opt.icon && <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{opt.icon}</span>}
                      <span style={{ fontWeight: isSelected ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
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
                  {isSelected && <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
