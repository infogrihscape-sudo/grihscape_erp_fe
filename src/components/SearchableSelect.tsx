import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rearrangedOptions = React.useMemo(() => {
    if (!value) return filteredOptions;
    const selectedIdx = filteredOptions.findIndex(opt => opt.value === value);
    if (selectedIdx === -1) return filteredOptions;
    const selectedOpt = filteredOptions[selectedIdx];
    const rest = filteredOptions.filter((_, idx) => idx !== selectedIdx);
    if (rest.length > 0 && rest[0].value === '') {
      return [rest[0], selectedOpt, ...rest.slice(1)];
    }
    return [selectedOpt, ...rest];
  }, [filteredOptions, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => { searchInputRef.current?.focus(); }, 50);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-[13px] ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          backgroundColor: disabled ? 'var(--hover-bg)' : 'var(--input-bg)',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          borderColor: error ? '#f87171' : 'var(--input-border)',
        }}
        className={`searchable-select-trigger w-full flex items-center justify-between border rounded-lg px-3.5 py-2.5 text-left outline-none transition cursor-pointer select-none font-[inherit] focus:ring-2 focus:ring-amber-100/50 focus:border-[#c5a880] ${
          disabled ? 'cursor-not-allowed' : ''
        } ${error ? 'border-red-300' : ''}`}
      >
        <span style={{ color: !selectedOption ? 'var(--text-muted)' : 'var(--text-primary)' }} className={!selectedOption ? '' : 'font-medium'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          style={{ color: 'var(--text-muted)' }}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-modal)',
          }}
          className="absolute z-50 mt-1.5 w-full border rounded-xl overflow-hidden animate-fade-in max-h-60 flex flex-col"
        >
          {/* Search bar */}
          <div
            style={{ backgroundColor: 'var(--hover-bg)', borderColor: 'var(--border-subtle)' }}
            className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
          >
            <Search size={13} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ color: 'var(--text-primary)', background: 'transparent' }}
              className="w-full border-0 outline-none text-[12px] py-0.5 font-[inherit]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ color: 'var(--text-muted)' }}
                className="p-0.5 rounded border-0 bg-transparent cursor-pointer hover:opacity-70"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1 py-1">
            {rearrangedOptions.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="px-3.5 py-3 italic text-center text-[12px]">
                No options found
              </div>
            ) : (
              rearrangedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      backgroundColor: isSelected ? 'rgba(184,144,71,0.12)' : 'transparent',
                      color: isSelected ? '#b89047' : 'var(--text-secondary)',
                    }}
                    className="w-full text-left px-3.5 py-2 transition-colors cursor-pointer border-0 text-[12.5px] font-[inherit] hover:opacity-80"
                  >
                    <span className={isSelected ? 'font-bold' : ''}>
                      {opt.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
