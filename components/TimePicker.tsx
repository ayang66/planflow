
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Clock, ChevronDown } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const { themeColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse props safely
  const [propH, propM] = (value || '09:00').split(':').map(Number);
  
  // Local state for immediate visual feedback during scroll
  const [localH, setLocalH] = useState(propH || 0);
  const [localM, setLocalM] = useState(propM || 0);
  
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CONSTANTS FOR PIXEL PERFECT ALIGNMENT
  const ITEM_HEIGHT = 40; 
  const VISIBLE_ITEMS = 3; // Reduced from 5 to 3 for compact look
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 120px
  const SPACER_HEIGHT = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 40px

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);

  // Sync local state with props when NOT scrolling
  useEffect(() => {
    if (!isScrollingRef.current) {
      setLocalH(propH);
      setLocalM(propM);
    }
  }, [propH, propM]);

  // Click outside to close
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

  // Scroll to position when opening
  useLayoutEffect(() => {
    if (isOpen) {
      // Small timeout to ensure DOM is rendered and reflowed
      setTimeout(() => {
        if (hoursRef.current) hoursRef.current.scrollTop = localH * ITEM_HEIGHT;
        if (minutesRef.current) minutesRef.current.scrollTop = localM * ITEM_HEIGHT;
      }, 0);
    }
  }, [isOpen]);

  const handleScroll = (type: 'hours' | 'minutes') => {
    const ref = type === 'hours' ? hoursRef : minutesRef;
    if (!ref.current) return;
    
    // Mark as scrolling to prevent prop updates from interfering
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const scrollTop = ref.current.scrollTop;
    // Calculate index based on scroll position
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    
    if (type === 'hours') {
        const h = Math.max(0, Math.min(23, index));
        if (h !== localH) {
             setLocalH(h);
             // Notify parent
             onChange(`${String(h).padStart(2, '0')}:${String(localM).padStart(2, '0')}`);
        }
    } else {
        const m = Math.max(0, Math.min(59, index));
        if (m !== localM) {
             setLocalM(m);
             // Notify parent
             onChange(`${String(localH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }

    // Reset scrolling flag after user stops
    scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        // Optional: Force snap to exact position if momentum stopped slightly off
        if (ref.current) {
             const finalIndex = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
             ref.current.scrollTo({ top: finalIndex * ITEM_HEIGHT, behavior: 'smooth' });
        }
    }, 150);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-slate-100/50 rounded-xl px-4 py-3 flex items-center w-full transition-all border outline-none ${isOpen ? `border-${themeColor}-500 bg-white ring-2 ring-${themeColor}-500/20` : 'border-slate-200 active:bg-slate-100'}`}
      >
        <Clock className={`w-4 h-4 mr-3 transition-colors ${isOpen ? `text-${themeColor}-500` : 'text-slate-400'}`} />
        <span className="text-sm font-semibold text-slate-700 flex-1 text-left tracking-wide">
            {value}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-none ring-1 ring-black/5">
           
           <div className="flex relative" style={{ height: CONTAINER_HEIGHT }}>
              
              {/* Central Highlight Bar (Visual Only) */}
              <div 
                  className={`absolute left-0 right-0 mx-4 rounded-lg bg-${themeColor}-50 pointer-events-none z-0`}
                  style={{ 
                      top: SPACER_HEIGHT, 
                      height: ITEM_HEIGHT 
                  }}
              ></div>
              
              {/* Hours */}
              <div 
                ref={hoursRef}
                onScroll={() => handleScroll('hours')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-10"
                style={{ height: CONTAINER_HEIGHT }}
              >
                  <div style={{ height: SPACER_HEIGHT }} />
                  {hoursArray.map(h => (
                      <div 
                        key={h} 
                        className={`flex items-center justify-center snap-center text-lg font-bold transition-all duration-150 cursor-pointer ${
                            h === localH 
                            ? `text-${themeColor}-600 scale-110` 
                            : 'text-slate-300 scale-90 hover:text-slate-400'
                        }`}
                        style={{ height: ITEM_HEIGHT }}
                        onClick={() => {
                            if(hoursRef.current) hoursRef.current.scrollTo({ top: h * ITEM_HEIGHT, behavior: 'smooth' });
                        }}
                      >
                          {String(h).padStart(2, '0')}
                      </div>
                  ))}
                  <div style={{ height: SPACER_HEIGHT }} />
              </div>

              {/* Separator */}
              <div 
                 className="flex items-center justify-center font-bold text-slate-300 z-20 pointer-events-none -mt-1"
                 style={{ height: CONTAINER_HEIGHT, paddingTop: 0 }}
              >
                  :
              </div>

              {/* Minutes */}
              <div 
                ref={minutesRef}
                onScroll={() => handleScroll('minutes')}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-10"
                style={{ height: CONTAINER_HEIGHT }}
              >
                  <div style={{ height: SPACER_HEIGHT }} />
                  {minutesArray.map(m => (
                      <div 
                        key={m} 
                        className={`flex items-center justify-center snap-center text-lg font-bold transition-all duration-150 cursor-pointer ${
                            m === localM 
                            ? `text-${themeColor}-600 scale-110` 
                            : 'text-slate-300 scale-90 hover:text-slate-400'
                        }`}
                        style={{ height: ITEM_HEIGHT }}
                        onClick={() => {
                            if(minutesRef.current) minutesRef.current.scrollTo({ top: m * ITEM_HEIGHT, behavior: 'smooth' });
                        }}
                      >
                          {String(m).padStart(2, '0')}
                      </div>
                  ))}
                  <div style={{ height: SPACER_HEIGHT }} />
              </div>
           </div>
           
           <button 
              onClick={() => setIsOpen(false)}
              className="w-full bg-slate-50 border-t border-slate-100 py-2.5 text-center text-[10px] font-bold text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors uppercase tracking-wider"
           >
              Confirm
           </button>
        </div>
      )}
    </div>
  );
};
