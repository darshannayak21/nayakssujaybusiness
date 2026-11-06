import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  RotateCcw, 
  ArrowRight,
  Moon
} from 'lucide-react';

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

// Helpers for date calculations in local timezone (avoiding UTC shift issues)
function parseYMD(dStr: string): { year: number; month: number; day: number } {
  if (!dStr) return { year: 2026, month: 0, day: 1 };
  const parts = dStr.split('-').map(Number);
  return { 
    year: parts[0] || 2026, 
    month: (parts[1] ? parts[1] - 1 : 0), 
    day: parts[2] || 1 
  };
}

function toYMD(year: number, month: number, day: number): string {
  const yr = String(year);
  const mo = String(month + 1).padStart(2, '0');
  const da = String(day).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function addDays(dStr: string, n: number): string {
  const { year, month, day } = parseYMD(dStr);
  const dt = new Date(year, month, day);
  dt.setDate(dt.getDate() + n);
  return toYMD(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function getDaysDifference(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const { year: y1, month: m1, day: d1 } = parseYMD(startStr);
  const { year: y2, month: m2, day: d2 } = parseYMD(endStr);
  const dt1 = new Date(y1, m1, d1);
  const dt2 = new Date(y2, m2, d2);
  const diffTime = dt2.getTime() - dt1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function formatDisplayDate(dStr: string): string {
  if (!dStr) return '';
  const { year, month, day } = parseYMD(dStr);
  const dt = new Date(year, month, day);
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
}

function formatShortMonthDay(dStr: string): string {
  if (!dStr) return '';
  const { year, month, day } = parseYMD(dStr);
  const dt = new Date(year, month, day);
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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

  // 'start' = next click sets check-in, 'end' = next click sets check-out
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Calendar month/year navigation state
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(10); // 0-indexed (10 = Nov)

  useEffect(() => {
    if (isOpen) {
      const defaultCheckIn = initialCheckIn || currentDate;
      const defaultCheckOut = initialCheckOut || addDays(defaultCheckIn, initialStayDays || 1);
      setCheckIn(defaultCheckIn);
      setCheckOut(defaultCheckOut);
      setSelectionStep('start');
      setHoveredDate(null);

      const parsed = parseYMD(defaultCheckIn);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [isOpen, initialCheckIn, initialCheckOut, initialStayDays, currentDate]);

  if (!isOpen) return null;

  const stayDays = getDaysDifference(checkIn, checkOut);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const todayParsed = parseYMD(currentDate);
    setViewYear(todayParsed.year);
    setViewMonth(todayParsed.month);
  };

  // Preset days handler (1, 2, 3, 4, 5, 7 nights)
  const handlePresetDays = (days: number) => {
    const newCheckOut = addDays(checkIn, days);
    setCheckOut(newCheckOut);
    setSelectionStep('start');
    setHoveredDate(null);
  };

  // Calendar Date Click Handler
  const handleDateClick = (clickedDate: string) => {
    if (selectionStep === 'start') {
      // Step 1: Select new check-in date
      setCheckIn(clickedDate);
      if (checkOut <= clickedDate) {
        setCheckOut(addDays(clickedDate, 1));
      }
      setSelectionStep('end');
    } else {
      // Step 2: Select check-out date
      if (clickedDate > checkIn) {
        setCheckOut(clickedDate);
        setSelectionStep('start');
        setHoveredDate(null);
      } else if (clickedDate === checkIn) {
        // Same date clicked: default to 1 night
        setCheckOut(addDays(clickedDate, 1));
        setSelectionStep('start');
        setHoveredDate(null);
      } else {
        // Earlier date clicked: treat as new check-in
        setCheckIn(clickedDate);
        setCheckOut(addDays(clickedDate, 1));
        setSelectionStep('end');
      }
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

  // Calendar Days calculation for viewYear and viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Effective end date (considering live hover while selecting check-out)
  const effectiveEnd = (selectionStep === 'end' && hoveredDate && hoveredDate > checkIn) 
    ? hoveredDate 
    : checkOut;

  // Intermediate stayover dates preview
  const stayOverDatesList: string[] = [];
  for (let i = 1; i < stayDays; i++) {
    stayOverDatesList.push(addDays(checkIn, i));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-[480px] rounded-2xl sm:rounded-[20px] border border-plaza-line shadow-2xl p-4 sm:p-6 text-plaza-text select-none animate-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-plaza-line/60 pb-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-plaza-accent-tint border border-plaza-accent-line flex items-center justify-center text-plaza-accent shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-plaza-text flex items-center gap-1.5 flex-wrap">
                <span>Room {roomNumber} Stay Dates</span>
                {customerName && (
                  <span className="text-xs font-semibold text-plaza-text-3 font-normal truncate max-w-[150px]">
                    · {customerName}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-plaza-text-3">
                {selectionStep === 'end' 
                  ? 'Select Check-out Date on the calendar' 
                  : 'Select Check-in Date on the calendar'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-plaza-text-3 hover:text-plaza-text hover:bg-plaza-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Dates Display Card - Clean Hotel Design */}
        <div className="bg-plaza-card rounded-xl p-3 border border-plaza-line/50 mb-3.5 flex items-center justify-between gap-2">
          {/* Check-In Column */}
          <div 
            onClick={() => setSelectionStep('start')}
            className={`flex-1 p-2 rounded-lg cursor-pointer transition ${
              selectionStep === 'start' ? 'bg-white shadow-2xs border border-plaza-accent/40' : 'hover:bg-white/50'
            }`}
          >
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-plaza-text-3">
              <span>Arrival</span>
              {selectionStep === 'start' && <span className="w-1.5 h-1.5 rounded-full bg-plaza-accent"></span>}
            </div>
            <div className="text-xs sm:text-sm font-bold text-plaza-text mt-0.5 truncate">
              {formatShortMonthDay(checkIn)}
            </div>
            <div className="text-[10px] text-plaza-text-4 font-mono">
              {checkIn}
            </div>
          </div>

          {/* Nights Pill Badge in Center */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="px-2.5 py-1 rounded-full bg-plaza-accent text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-2xs">
              <Moon className="w-3 h-3" />
              <span>{stayDays} {stayDays === 1 ? 'Night' : 'Nights'}</span>
            </span>
            <ArrowRight className="w-3 h-3 text-plaza-text-4 mt-0.5" />
          </div>

          {/* Check-Out Column */}
          <div 
            onClick={() => setSelectionStep('end')}
            className={`flex-1 p-2 rounded-lg text-right cursor-pointer transition ${
              selectionStep === 'end' ? 'bg-white shadow-2xs border border-plaza-accent/40' : 'hover:bg-white/50'
            }`}
          >
            <div className="flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wider text-plaza-text-3">
              {selectionStep === 'end' && <span className="w-1.5 h-1.5 rounded-full bg-plaza-accent"></span>}
              <span>Departure</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-plaza-text mt-0.5 truncate">
              {formatShortMonthDay(checkOut)}
            </div>
            <div className="text-[10px] text-plaza-text-4 font-mono">
              {checkOut}
            </div>
          </div>
        </div>

        {/* Quick Stay Duration Presets (Pills) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-plaza-text-3">
              Quick Stay Duration
            </span>
            <span className="text-[10px] text-plaza-text-4 font-semibold">
              {stayDays} Night{stayDays > 1 ? 's' : ''} Stay
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 text-xs">
            {[1, 2, 3, 4, 5, 7].map((num) => {
              const isSelected = stayDays === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePresetDays(num)}
                  className={`py-1.5 px-0.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-plaza-accent bg-plaza-accent text-white shadow-xs font-bold'
                      : 'border-plaza-line bg-white hover:bg-plaza-card text-plaza-text font-semibold'
                  }`}
                >
                  <span className="text-[11px] leading-tight">{num} {num === 1 ? 'Nt' : 'Nts'}</span>
                  <span className={`text-[8.5px] ${isSelected ? 'text-white/80' : 'text-plaza-text-4'}`}>
                    {num === 7 ? '1 Wk' : `${num}d`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrated Range Calendar - Clean Apple & Nayaks Sujay Hotel Style */}
        <div className="border border-plaza-line rounded-2xl p-3 sm:p-3.5 bg-white mb-3.5 shadow-2xs">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-plaza-line/40">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg border border-plaza-line hover:bg-plaza-card flex items-center justify-center text-plaza-text transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-plaza-text tracking-tight">
                {monthName}
              </span>
              <button
                type="button"
                onClick={handleJumpToToday}
                className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md border border-plaza-line text-plaza-text-3 hover:text-plaza-text hover:bg-plaza-card transition"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg border border-plaza-line hover:bg-plaza-card flex items-center justify-center text-plaza-text transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day} className="text-[9.5px] font-bold uppercase tracking-wider text-plaza-text-3 py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8 sm:h-9" />
            ))}

            {/* Days of the Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = toYMD(viewYear, viewMonth, dayNum);

              const isStart = dateStr === checkIn;
              const isEnd = dateStr === effectiveEnd;
              const isInRange = dateStr > checkIn && dateStr < effectiveEnd;
              const isSingle = isStart && isEnd;
              const isToday = dateStr === currentDate;

              let cellBg = '';
              let textColor = 'text-plaza-text hover:bg-plaza-card';

              if (isStart) {
                cellBg = 'bg-plaza-accent text-white font-bold rounded-l-xl shadow-xs';
                textColor = 'text-white';
              } else if (isEnd) {
                cellBg = 'bg-plaza-accent text-white font-bold rounded-r-xl shadow-xs';
                textColor = 'text-white';
              } else if (isInRange) {
                cellBg = 'bg-plaza-accent-tint text-plaza-accent font-semibold';
                textColor = 'text-plaza-accent';
              }

              return (
                <div 
                  key={dateStr}
                  className="relative p-0 h-8 sm:h-9 flex items-center justify-center"
                  onMouseEnter={() => {
                    if (selectionStep === 'end') {
                      setHoveredDate(dateStr);
                    }
                  }}
                  onMouseLeave={() => {
                    if (selectionStep === 'end') {
                      setHoveredDate(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDateClick(dateStr)}
                    className={`w-full h-full flex flex-col items-center justify-center text-xs transition-all relative ${cellBg || textColor}`}
                  >
                    <span className="leading-none">{dayNum}</span>
                    {isToday && !isStart && !isEnd && (
                      <span className="w-1 h-1 rounded-full bg-plaza-accent absolute bottom-1"></span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Calendar Helper Legend */}
          <div className="flex items-center justify-between text-[9.5px] text-plaza-text-3 border-t border-plaza-line/40 pt-2 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-plaza-accent inline-block"></span>
              <span>Check-in / Out</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-plaza-accent-tint inline-block border border-plaza-accent-line"></span>
              <span>Stay Nights</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-plaza-accent inline-block"></span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Auto-Reservation Context Card */}
        {stayDays > 1 && (
          <div className="p-3 rounded-xl bg-plaza-card border border-plaza-line/50 mb-4 text-[11px] text-plaza-text-3 leading-relaxed">
            <span className="font-semibold text-plaza-text">Auto-Reservation: </span>
            Room {roomNumber} will automatically reserve on following dates ({stayOverDatesList.map(d => formatDisplayDate(d).split(',')[0]).join(', ')}).
            <div className="text-[10px] text-plaza-text-4 mt-0.5">
              Check-in collections will <span className="font-semibold text-plaza-text">never duplicate</span> into following days' cash collection.
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-plaza-line/50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-plaza-line hover:bg-plaza-card text-plaza-text-3 hover:text-plaza-text text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset 1 Nt</span>
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
