
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ 
  value, 
  onChange, 
  options, 
  icon, 
  placeholder,
  className = "",
  disabled = false
}) => {
  const { themeColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`bg-slate-100/50 rounded-xl pl-4 pr-3 py-3 flex items-center w-full transition-all border outline-none text-left ${
            isOpen 
            ? `border-${themeColor}-500 bg-white ring-2 ring-${themeColor}-500/20` 
            : 'border-slate-200 hover:bg-slate-100/80 active:bg-slate-100'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {icon && (
            <div className={`mr-3 transition-colors ${isOpen ? `text-${themeColor}-500` : 'text-slate-400'}`}>
                {icon}
            </div>
        )}
        
        <span className={`text-sm font-semibold flex-1 truncate ${selectedOption ? 'text-slate-700' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : (placeholder || 'Select...')}
        </span>
        
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 flex flex-col max-h-[240px]">
           <div className="overflow-y-auto p-1.5 no-scrollbar">
              {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                      <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                              onChange(option.value);
                              setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-0.5 last:mb-0 ${
                              isSelected 
                              ? `bg-${themeColor}-50 text-${themeColor}-700` 
                              : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                          }`}
                      >
                          <span className="truncate">{option.label}</span>
                          {isSelected && <Check className={`w-3.5 h-3.5 text-${themeColor}-600 shrink-0 ml-2`} />}
                      </button>
                  );
              })}
           </div>
        </div>
      )}
    </div>
  );
};
