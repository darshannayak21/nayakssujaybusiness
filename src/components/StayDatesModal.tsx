import React, { useState, useEffect } from 'react';
import { Calendar, Moon, X, Check, RotateCcw, ArrowRight } from 'lucide-react';

interface StayDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber: string;
  currentDate: string; // The current sheet date (YYYY-MM-DD)
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialStayDays?: number;
  customerName?: string;
  isStayOver?: boolean;
  onSave: (checkIn: string, checkOut: string, days: number) => void;
  onClear: () => void;
}

// Date helper functions
function addDays(dStr: string, n: number): string {
  const [y, m, d] = dStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yr = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

function getDaysDifference(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const diffTime = dt2.getTime() - dt1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function formatDisplayDate(dStr: string): string {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
}

export const StayDatesModal: React.FC<StayDatesModalProps> = ({
  isOpen,
  onClose,
  roomNumber,
  currentDate,
  initialCheckIn,
  initialCheckOut,
  initialStayDays,
  customerName,
  isStayOver = false,
  onSave,
  onClear,
}) => {
  const [checkIn, setCheckIn] = useState<string>(initialCheckIn || currentDate);
  const [checkOut, setCheckOut] = useState<string>(
    initialCheckOut || addDays(initialCheckIn || currentDate, initialStayDays || 1)
  );

  useEffect(() => {
    if (isOpen) {
      const defaultCheckIn = initialCheckIn || currentDate;
      setCheckIn(defaultCheckIn);
      setCheckOut(initialCheckOut || addDays(defaultCheckIn, initialStayDays || 1));
    }
  }, [isOpen, initialCheckIn, initialCheckOut, initialStayDays, currentDate]);

  if (!isOpen) return null;

  const stayDays = getDaysDifference(checkIn, checkOut);

  const handlePresetDays = (days: number) => {
    const newCheckOut = addDays(checkIn, days);
    setCheckOut(newCheckOut);
  };

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    // If checkIn becomes >= checkOut, push checkOut forward by 1 day
    if (newCheckIn >= checkOut) {
      setCheckOut(addDays(newCheckIn, 1));
    }
  };

  const handleCheckOutChange = (newCheckOut: string) => {
    if (newCheckOut <= checkIn) {
      setCheckOut(addDays(checkIn, 1));
    } else {
      setCheckOut(newCheckOut);
    }
  };

  const handleSave = () => {
    onSave(checkIn, checkOut, stayDays);
    onClose();
  };

  const handleReset = () => {
    onClear();
    onClose();
  };

  // Intermediate stayover dates preview
  const stayOverDatesList: string[] = [];
  for (let i = 1; i < stayDays; i++) {
    stayOverDatesList.push(addDays(checkIn, i));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl border border-plaza-line shadow-2xl p-5 sm:p-6 text-plaza-text select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-plaza-line/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-plaza-accent-tint border border-plaza-accent-line flex items-center justify-center text-plaza-accent">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-plaza-text flex items-center gap-2">
                <span>Room {roomNumber} Stay Dates</span>
                {customerName && (
                  <span className="text-xs font-semibold text-plaza-text-3 font-normal truncate max-w-[150px]">
                    · {customerName}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-plaza-text-3">
                {isStayOver ? 'Guest is on a continuing multi-day stay.' : 'Set multi-day reservation to reserve future dates automatically.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-plaza-text-3 hover:text-plaza-text hover:bg-plaza-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-plaza-text-3 block mb-1.5">
            Quick Stay Duration
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs font-semibold">
            {[1, 2, 3, 4, 5, 7].map((num) => {
              const isSelected = stayDays === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePresetDays(num)}
                  className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'border-plaza-accent bg-plaza-accent text-white shadow-xs font-bold'
                      : 'border-plaza-line bg-white hover:bg-plaza-card text-plaza-text'
                  }`}
                >
                  <span className="leading-tight">{num} {num === 1 ? 'Night' : 'Nights'}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-plaza-text-4'}`}>
                    {num === 7 ? '1 Week' : `${num}d`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Check-In and Check-Out Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-plaza-text-3 block mb-1">
              Check-in Date (Arrival)
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-plaza-line focus:border-plaza-accent focus:outline-none text-xs font-bold text-plaza-text bg-white"
            />
            <span className="text-[10px] text-plaza-text-3 mt-1 block">
              {formatDisplayDate(checkIn)}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-plaza-text-3 block mb-1">
              Check-out Date (Departure)
            </label>
            <input
              type="date"
              value={checkOut}
              min={addDays(checkIn, 1)}
              onChange={(e) => handleCheckOutChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-plaza-line focus:border-plaza-accent focus:outline-none text-xs font-bold text-plaza-text bg-white"
            />
            <span className="text-[10px] text-plaza-text-3 mt-1 block">
              {formatDisplayDate(checkOut)}
            </span>
          </div>
        </div>

        {/* Dynamic Summary Card */}
        <div className="p-3.5 rounded-xl bg-plaza-card border border-plaza-line/60 mb-5 text-xs">
          <div className="flex items-center justify-between font-bold text-plaza-text mb-1">
            <span className="flex items-center gap-1.5 text-plaza-accent">
              <Moon className="w-3.5 h-3.5" />
              <span>{stayDays} {stayDays === 1 ? 'Night Stay' : 'Nights Stay'}</span>
            </span>
            <span className="font-mono text-[11px] text-plaza-text-2">
              {checkIn} <ArrowRight className="w-3 h-3 inline text-plaza-accent" /> {checkOut}
            </span>
          </div>

          {stayDays > 1 ? (
            <div className="text-[11px] text-plaza-text-3 mt-2 leading-relaxed border-t border-plaza-line/40 pt-2">
              <span className="font-semibold text-plaza-text">Auto-Reservation: </span>
              Room {roomNumber} will automatically show as <span className="font-semibold text-plaza-accent">Occupied / Reserved</span> on following dates ({stayOverDatesList.map(d => formatDisplayDate(d).split(',')[0]).join(', ')}).
              <div className="text-[10.5px] text-plaza-text-4 mt-0.5">
                Payments made on check-in will <span className="font-semibold text-plaza-text">never duplicate</span> into following days' cash collections.
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-plaza-text-3 mt-1">
              Standard single-day booking. Check-out expected next morning.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-plaza-line/50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-plaza-line hover:bg-plaza-card text-plaza-text-3 hover:text-plaza-text text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to 1 Night</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-plaza-line hover:bg-plaza-card text-xs font-semibold text-plaza-text transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-bold transition shadow-xs active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Stay Dates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
