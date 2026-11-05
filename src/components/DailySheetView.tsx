import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Download, 
  Printer, 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  BedDouble,
  LayoutList,
  Table as TableIcon,
  Globe
} from 'lucide-react';
import { DaySheet, RoomEntry } from '../types';
import { calculateRoomTotal, computeSheetTotals } from '../data/rooms';
import { formatDateForDisplay } from '../services/db';
import { generateDailyPDF } from '../services/pdfGenerator';
import { getBookingPlatforms } from '../services/platforms';

interface DailySheetViewProps {
  sheet: DaySheet;
  onUpdateSheet: (updated: DaySheet) => void;
  onDateChange: (dateStr: string) => void;
}

export const DailySheetView: React.FC<DailySheetViewProps> = ({
  sheet,
  onUpdateSheet,
  onDateChange,
}) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [mobileMode, setMobileMode] = useState<'table' | 'cards'>('table');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [platforms, setPlatforms] = useState<string[]>(getBookingPlatforms());

  useEffect(() => {
    const handler = () => setPlatforms(getBookingPlatforms());
    window.addEventListener('plaza_platforms_updated', handler);
    return () => window.removeEventListener('plaza_platforms_updated', handler);
  }, []);

  const { dayStr, monthStr, yearStr } = formatDateForDisplay(sheet.date);

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    onDateChange(newDate);
  };

  const handlePrevDay = () => {
    const d = new Date(sheet.date);
    d.setDate(d.getDate() - 1);
    const prev = d.toISOString().split('T')[0];
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const d = new Date(sheet.date);
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split('T')[0];
    onDateChange(next);
  };

  const handleToday = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    onDateChange(today);
  };

  const handleFieldChange = (
    roomIndex: number,
    field: keyof RoomEntry,
    value: any
  ) => {
    setSaveStatus('saving');
    const newRooms = [...sheet.rooms];
    const room = { ...newRooms[roomIndex] };

    if (field === 'customerName') {
      room.customerName = value;
      room.total = calculateRoomTotal(room);
    } else if (field === 'platform') {
      room.platform = value;
      const isOnline = Boolean(value && value !== 'Direct');
      room.isAgoda = Boolean(value && value.toLowerCase() === 'agoda');
      if (isOnline) {
        room.advanceCash = '';
        room.advanceOnline = '';
        if (room.roomRent && room.tBusinessOnline === '' && room.tBusinessCash === '') {
          room.tBusinessOnline = room.roomRent;
        }
      }
      room.total = calculateRoomTotal(room);
    } else if (field === 'isAgoda') {
      room.isAgoda = Boolean(value);
      if (value) {
        room.platform = 'Agoda';
        room.advanceCash = '';
        room.advanceOnline = '';
      }
    } else if (
      [
        'roomRent',
        'advanceCash',
        'advanceOnline',
        'tBusinessCash',
        'tBusinessOnline',
        'gst5',
        'balance',
        'refund',
      ].includes(field as string)
    ) {
      const numVal = value === '' ? '' : parseFloat(value);
      (room as any)[field] = isNaN(numVal as number) ? '' : numVal;

      const isOnline = Boolean(room.platform && room.platform !== 'Direct');
      if (field === 'roomRent' && isOnline && room.tBusinessOnline === '' && room.tBusinessCash === '' && typeof numVal === 'number') {
        room.tBusinessOnline = numVal;
      }

      room.total = calculateRoomTotal(room);
    } else {
      (room as any)[field] = value;
    }

    newRooms[roomIndex] = room;
    const totals = computeSheetTotals(newRooms);

    const updatedSheet: DaySheet = {
      ...sheet,
      rooms: newRooms,
      totals,
      updatedAt: new Date().toISOString(),
    };

    onUpdateSheet(updatedSheet);
    setTimeout(() => setSaveStatus('saved'), 350);
  };

  const filteredRooms = sheet.rooms.map((r, idx) => ({ ...r, originalIndex: idx })).filter(r => {
    if (selectedFloor === 'all') return true;
    return r.floor === selectedFloor;
  });

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-20">
      {/* Top Controls Bar - Mobile Responsive */}
      <div className="bg-white rounded-2xl border border-plaza-line/60 p-3 sm:p-4 mb-4 sm:mb-6 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        {/* Date Selector Navigation */}
        <div className="flex items-center justify-between md:justify-start gap-1.5 sm:gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text shrink-0"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-plaza-line hover:bg-plaza-card text-xs font-semibold text-plaza-text transition"
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text shrink-0"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="relative flex items-center flex-1 sm:flex-none">
            <CalendarIcon className="w-3.5 h-3.5 absolute left-2.5 text-plaza-text-3 pointer-events-none" />
            <input
              type="date"
              value={sheet.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full sm:w-auto pl-8 pr-2.5 py-1.5 rounded-xl border border-plaza-line text-xs font-semibold text-plaza-text focus:outline-none focus:border-plaza-accent transition cursor-pointer"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-plaza-text-3 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px]">{saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}</span>
          </div>
        </div>

        {/* Action Buttons & Mobile Mode Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Mobile Table vs Cards toggle */}
          <div className="flex md:hidden items-center bg-plaza-card p-1 rounded-xl border border-plaza-line/50">
            <button
              onClick={() => setMobileMode('table')}
              className={`p-1.5 rounded-lg text-xs ${mobileMode === 'table' ? 'bg-white text-plaza-text shadow-2xs font-semibold' : 'text-plaza-text-3'}`}
              title="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileMode('cards')}
              className={`p-1.5 rounded-lg text-xs ${mobileMode === 'cards' ? 'bg-white text-plaza-text shadow-2xs font-semibold' : 'text-plaza-text-3'}`}
              title="Card view"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-plaza-line hover:bg-plaza-card text-xs font-medium text-plaza-text transition"
          >
            <Printer className="w-3.5 h-3.5 text-plaza-text-3" />
            Print
          </button>

          <button
            onClick={() => generateDailyPDF(sheet)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Day PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">
        {/* Card 1: Day Total */}
        <div className="bg-plaza-card rounded-2xl p-3 sm:p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
              Combined Day Total
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
              <IndianRupee className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-plaza-text tracking-tight">
            ₹{sheet.totals.dayTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-plaza-text-3 mt-0.5 truncate">
            Adv + Cash + Agoda + Others
          </div>
        </div>

        {/* Card 2: Cash Total */}
        <div className="bg-plaza-card rounded-2xl p-3 sm:p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
              T. Business Cash
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
              <Banknote className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-plaza-text tracking-tight">
            ₹{sheet.totals.tBusinessCash.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-plaza-text-3 mt-0.5 truncate">
            Cash desk collection
          </div>
        </div>

        {/* Card 3: Online Platforms */}
        <div className="bg-plaza-card rounded-2xl p-3 sm:p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-plaza-accent">
              Online (OTAs)
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-plaza-accent-tint text-plaza-accent font-bold">
              {Object.values(sheet.totals.platformBookingsCount || {}).reduce((a, b) => a + b, 0)} Bookings
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-plaza-accent tracking-tight">
            ₹{Object.values(sheet.totals.platformTotals || {}).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-plaza-text-3 mt-0.5 truncate">
            {Object.entries(sheet.totals.platformTotals || {}).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ₹${v.toLocaleString('en-IN')}`).join(', ') || 'Agoda, MMT, etc.'}
          </div>
        </div>

        {/* Card 4: Online (Others) */}
        <div className="bg-plaza-card rounded-2xl p-3 sm:p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
              Direct Online
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
              <CreditCard className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-plaza-text tracking-tight">
            ₹{sheet.totals.tBusinessOtherOnline.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-plaza-text-3 mt-0.5 truncate">
            Direct UPI / POS
          </div>
        </div>

        {/* Card 5: Room Occupancy */}
        <div className="bg-plaza-accent text-white rounded-2xl p-3 sm:p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase text-white/90">
              Room Occupancy
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <BedDouble className="w-3 h-3" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight">
            {sheet.totals.occupiedRooms} <span className="text-xs font-medium text-white/80">/ 26 Rooms</span>
          </div>
          <div className="text-[10px] text-white/80 mt-0.5 truncate">
            Vacant: {sheet.totals.vacantRooms} | CO: {sheet.totals.checkedOutRooms}
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Dedicated for phone users) */}
      {mobileMode === 'cards' ? (
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedFloor === 'all' ? 'bg-plaza-accent text-white' : 'bg-plaza-card text-plaza-text-3'}`}
            >
              All Floors (26)
            </button>
            <button
              onClick={() => setSelectedFloor(1)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedFloor === 1 ? 'bg-plaza-accent text-white' : 'bg-plaza-card text-plaza-text-3'}`}
            >
              Floor 1 (101-110)
            </button>
            <button
              onClick={() => setSelectedFloor(2)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedFloor === 2 ? 'bg-plaza-accent text-white' : 'bg-plaza-card text-plaza-text-3'}`}
            >
              Floor 2 (201-213)
            </button>
            <button
              onClick={() => setSelectedFloor(3)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedFloor === 3 ? 'bg-plaza-accent text-white' : 'bg-plaza-card text-plaza-text-3'}`}
            >
              Floor 3 (301-303)
            </button>
          </div>

          {filteredRooms.map((room) => {
            const isOnlinePlatform = Boolean(room.platform && room.platform !== 'Direct');
            const platformLabel = isOnlinePlatform ? room.platform : '';

            return (
              <div
                key={room.roomNumber}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all ${
                  isOnlinePlatform ? 'border-plaza-accent/50 bg-amber-50/10' : 'border-plaza-line/60'
                }`}
              >
                <div className="flex items-center justify-between border-b border-plaza-line/30 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-10 h-7 rounded-lg bg-plaza-accent-tint text-plaza-text font-bold text-sm flex items-center justify-center">
                      {room.roomNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-plaza-text-3">
                      Floor {room.floor}
                    </span>
                  </div>
                  {isOnlinePlatform ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-plaza-accent text-white text-[10px] font-bold tracking-wider uppercase shadow-2xs">
                      {platformLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-plaza-text-4 font-mono">
                      #{room.slNo} · Direct
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-plaza-text-3 block mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Abhishek Joshi"
                        value={room.customerName}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'customerName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-plaza-line focus:border-plaza-accent focus:outline-none font-medium text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-plaza-text-3 block mb-1">
                        Platform / Source
                      </label>
                      <select
                        value={room.platform || 'Direct'}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'platform', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none font-bold text-xs transition ${
                          isOnlinePlatform 
                            ? 'bg-plaza-accent-tint text-plaza-accent border-plaza-accent' 
                            : 'bg-white text-plaza-text border-plaza-line'
                        }`}
                      >
                        <option value="Direct">Direct / Walk-in</option>
                        {platforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-plaza-text-3 block mb-1">
                        Room Rent
                      </label>
                      <input
                        type="number"
                        placeholder="₹ 0"
                        value={room.roomRent}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'roomRent', e.target.value)}
                        className="w-full text-right px-2.5 py-1.5 rounded-xl border border-plaza-line focus:border-plaza-accent focus:outline-none font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] uppercase font-bold block mb-1 ${isOnlinePlatform ? 'text-plaza-accent' : 'text-plaza-text-3'}`}>
                        {isOnlinePlatform ? `${platformLabel} Amount` : 'Online Amount'}
                      </label>
                      <input
                        type="number"
                        placeholder="₹ 0"
                        value={room.tBusinessOnline}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'tBusinessOnline', e.target.value)}
                        className={`w-full text-right px-2.5 py-1.5 rounded-xl border focus:outline-none font-medium text-xs ${
                          isOnlinePlatform ? 'border-plaza-accent bg-amber-50/40 text-plaza-accent font-bold' : 'border-plaza-line'
                        }`}
                      />
                    </div>
                  </div>

                  {!isOnlinePlatform && (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-plaza-line/30">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-plaza-text-3 block mb-0.5">
                          Adv Cash
                        </label>
                        <input
                          type="number"
                          placeholder="₹ 0"
                          value={room.advanceCash}
                          onChange={(e) => handleFieldChange(room.originalIndex, 'advanceCash', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-lg border border-plaza-line text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-plaza-text-3 block mb-0.5">
                          Adv Online
                        </label>
                        <input
                          type="number"
                          placeholder="₹ 0"
                          value={room.advanceOnline}
                          onChange={(e) => handleFieldChange(room.originalIndex, 'advanceOnline', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-lg border border-plaza-line text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-plaza-text-3 block mb-0.5">
                          TB Cash
                        </label>
                        <input
                          type="number"
                          placeholder="₹ 0"
                          value={room.tBusinessCash}
                          onChange={(e) => handleFieldChange(room.originalIndex, 'tBusinessCash', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-lg border border-plaza-line text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-plaza-line/30">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-plaza-text-3 block mb-0.5">
                        GST (Manual)
                      </label>
                      <input
                        type="number"
                        placeholder="₹ 0"
                        value={room.gst5}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'gst5', e.target.value)}
                        className="w-full text-right px-2 py-1 rounded-lg border border-plaza-line text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-plaza-text-3 block mb-0.5">
                        Check Out
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 11:00 AM"
                        value={room.checkOut}
                        onChange={(e) => handleFieldChange(room.originalIndex, 'checkOut', e.target.value)}
                        className="w-full text-center px-2 py-1 rounded-lg border border-plaza-line text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full Spreadsheet Table View - with Sticky Room Columns for Mobile Swipe */
        <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-4 sm:p-6 md:p-8 print:p-0 print:border-none print:shadow-none">
          
          {/* Document Header */}
          <div className="flex items-center justify-between border-b border-plaza-line/30 pb-3 mb-6">
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-plaza-text-3">
              BUSINESS SHEET
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold tracking-wider uppercase text-plaza-text border-b-2 border-plaza-text pb-0.5">
                ROOMS / 101 – 303
              </span>
            </div>
          </div>

          {/* Title & Centered Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-end mb-6 sm:mb-8">
            <div className="md:col-span-6">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-plaza-text leading-[1.05]">
                Business sheet.
              </h1>
              <div className="text-xl sm:text-3xl font-bold tracking-tight text-plaza-text-4 leading-[1.05] mt-1">
                Rent and collections.
              </div>
            </div>

            {/* Centered Week / Day & Date Section */}
            <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-4 sm:gap-6">
              <div className="flex flex-col items-start md:items-end">
                <span className="bg-plaza-accent text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full mb-1">
                  WEEK / DAY
                </span>
                <div className="text-xs sm:text-sm font-bold tracking-wider uppercase text-plaza-text border-b border-plaza-text px-2 pb-0.5 min-w-[90px] text-center">
                  {sheet.dayOfWeek}
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end">
                <span className="bg-plaza-accent text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full mb-1">
                  DATE
                </span>
                <div className="flex items-center gap-1 font-mono font-bold text-xs sm:text-sm text-plaza-text">
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {dayStr[0]}
                  </div>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {dayStr[1]}
                  </div>
                  <span className="text-plaza-text-3 font-normal px-0.5">/</span>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {monthStr[0]}
                  </div>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {monthStr[1]}
                  </div>
                  <span className="text-plaza-text-3 font-normal px-0.5">/</span>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {yearStr[0]}
                  </div>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {yearStr[1]}
                  </div>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {yearStr[2]}
                  </div>
                  <div className="w-5 h-6 sm:w-6 sm:h-7 rounded border border-plaza-text flex items-center justify-center bg-white">
                    {yearStr[3]}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container with Sticky Column on Mobile */}
          <div className="overflow-x-auto border border-plaza-line rounded-xl">
            <table className="w-full border-collapse text-[12px] min-w-[1050px]">
              <thead>
                <tr className="bg-white border-b border-plaza-line text-[10px] uppercase font-bold text-plaza-text-3">
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-10 sticky left-0 bg-white z-20">
                    SL<br/>NO.
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-16 bg-plaza-accent-tint text-plaza-text sticky left-10 bg-plaza-accent-tint z-20">
                    ROOM<br/>NUMBER
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-24">
                    ROOM<br/>RENT
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-left w-40">
                    CUSTOMER NAME
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-left w-28">
                    PLATFORM
                  </th>
                  
                  {/* ADVANCE GROUP HEADER */}
                  <th 
                    colSpan={2} 
                    className="border-r border-plaza-line py-2 px-3 text-center bg-plaza-accent text-white font-bold tracking-[0.12em]"
                  >
                    ADVANCE
                  </th>

                  {/* T. BUSINESS GROUP HEADER */}
                  <th 
                    colSpan={2} 
                    className="border-r border-plaza-line py-2 px-3 text-center bg-plaza-accent text-white font-bold tracking-[0.12em]"
                  >
                    T. BUSINESS
                  </th>

                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-16">
                    GST
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-16">
                    BALANCE
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-16">
                    REFUND
                  </th>
                  <th rowSpan={2} className="border-r border-plaza-line p-2 text-center w-24 font-bold text-plaza-text">
                    TOTAL
                  </th>
                  <th rowSpan={2} className="p-2 text-center w-24">
                    CHECK<br/>OUT
                  </th>
                </tr>

                {/* Header Level 2 - Clean CASH and ONLINE */}
                <tr className="bg-white border-b border-plaza-line text-[9px] uppercase font-semibold text-plaza-text-3">
                  <th className="border-r border-plaza-line p-1.5 text-center w-20">CASH</th>
                  <th className="border-r border-plaza-line p-1.5 text-center w-20">ONLINE</th>
                  <th className="border-r border-plaza-line p-1.5 text-center w-20">CASH</th>
                  <th className="border-r border-plaza-line p-1.5 text-center w-20">ONLINE</th>
                </tr>
              </thead>

              <tbody>
                {sheet.rooms.map((room, idx) => {
                  const isNewFloor = idx === 0 || idx === 10 || idx === 23;
                  const isOnlinePlatform = Boolean(room.platform && room.platform !== 'Direct');
                  const platformLabel = isOnlinePlatform ? room.platform : '';

                  return (
                    <tr
                      key={room.roomNumber}
                      className={`hover:bg-amber-50/20 transition-colors border-b border-plaza-line/60 ${
                        isNewFloor ? 'border-t-2 border-t-plaza-accent' : ''
                      }`}
                    >
                      {/* SL NO - Sticky on mobile */}
                      <td className="border-r border-plaza-line text-center py-1.5 px-2 font-mono text-plaza-text-3 text-[11px] sticky left-0 bg-white z-10">
                        {room.slNo}
                      </td>

                      {/* ROOM NUMBER - Sticky on mobile */}
                      <td className="border-r border-plaza-line text-center py-1.5 px-2 font-bold text-plaza-text bg-plaza-accent-tint sticky left-10 z-10">
                        {room.roomNumber}
                      </td>

                      {/* ROOM RENT */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.roomRent}
                          onChange={(e) => handleFieldChange(idx, 'roomRent', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none font-medium transition"
                        />
                      </td>

                      {/* CUSTOMER NAME */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="text"
                          placeholder="Guest name"
                          value={room.customerName}
                          onChange={(e) => handleFieldChange(idx, 'customerName', e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none text-[12px] font-medium transition"
                        />
                      </td>

                      {/* PLATFORM / SOURCE DROPDOWN */}
                      <td className="border-r border-plaza-line p-1">
                        <select
                          value={room.platform || 'Direct'}
                          onChange={(e) => handleFieldChange(idx, 'platform', e.target.value)}
                          className={`w-full text-[11px] font-semibold py-1 px-1.5 rounded-md border transition cursor-pointer focus:outline-none focus:border-plaza-accent ${
                            isOnlinePlatform 
                              ? 'bg-plaza-accent-tint text-plaza-accent border-plaza-accent font-bold' 
                              : 'bg-white text-plaza-text-3 border-plaza-line/60 hover:border-plaza-line'
                          }`}
                        >
                          <option value="Direct">Direct</option>
                          {platforms.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>

                      {/* ADVANCE CASH (Disabled for online platforms) */}
                      <td className={`border-r border-plaza-line p-1 ${isOnlinePlatform ? 'bg-plaza-card/40' : ''}`}>
                        {isOnlinePlatform ? (
                          <div className="w-full text-center py-1 text-plaza-text-4 font-mono select-none" title={`${platformLabel} bookings have no advance`}>
                            —
                          </div>
                        ) : (
                          <input
                            type="number"
                            placeholder="—"
                            value={room.advanceCash}
                            onChange={(e) => handleFieldChange(idx, 'advanceCash', e.target.value)}
                            className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none transition"
                          />
                        )}
                      </td>

                      {/* ADVANCE ONLINE (Disabled for online platforms) */}
                      <td className={`border-r border-plaza-line p-1 ${isOnlinePlatform ? 'bg-plaza-card/40' : ''}`}>
                        {isOnlinePlatform ? (
                          <div className="w-full text-center py-1 text-plaza-text-4 font-mono select-none" title={`${platformLabel} bookings have no advance`}>
                            —
                          </div>
                        ) : (
                          <input
                            type="number"
                            placeholder="—"
                            value={room.advanceOnline}
                            onChange={(e) => handleFieldChange(idx, 'advanceOnline', e.target.value)}
                            className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none transition"
                          />
                        )}
                      </td>

                      {/* T. BUSINESS CASH */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.tBusinessCash}
                          onChange={(e) => handleFieldChange(idx, 'tBusinessCash', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none font-medium text-plaza-text transition"
                        />
                      </td>

                      {/* T. BUSINESS ONLINE */}
                      <td className={`border-r border-plaza-line p-1 ${isOnlinePlatform ? 'bg-amber-50/50' : ''}`}>
                        <input
                          type="number"
                          placeholder={isOnlinePlatform ? `${platformLabel} ₹` : "—"}
                          value={room.tBusinessOnline}
                          onChange={(e) => handleFieldChange(idx, 'tBusinessOnline', e.target.value)}
                          className={`w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none font-medium transition ${
                            isOnlinePlatform ? 'text-plaza-accent font-bold placeholder:text-plaza-accent/60' : 'text-plaza-text'
                          }`}
                        />
                      </td>

                      {/* GST (Manual entry) */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.gst5}
                          onChange={(e) => handleFieldChange(idx, 'gst5', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none text-plaza-text-2 transition"
                        />
                      </td>

                      {/* BALANCE */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.balance}
                          onChange={(e) => handleFieldChange(idx, 'balance', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none text-plaza-text-2 transition"
                        />
                      </td>

                      {/* REFUND */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.refund}
                          onChange={(e) => handleFieldChange(idx, 'refund', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none text-amber-700 transition"
                        />
                      </td>

                      {/* TOTAL */}
                      <td className="border-r border-plaza-line p-1">
                        <input
                          type="number"
                          placeholder="—"
                          value={room.total}
                          onChange={(e) => handleFieldChange(idx, 'total', e.target.value)}
                          className="w-full text-right px-2 py-1 rounded-md font-bold text-plaza-text bg-transparent border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none transition"
                        />
                      </td>

                      {/* CHECK OUT */}
                      <td className="p-1">
                        <input
                          type="text"
                          placeholder="—"
                          value={room.checkOut}
                          onChange={(e) => handleFieldChange(idx, 'checkOut', e.target.value)}
                          className="w-full text-center px-1.5 py-1 rounded-md border border-transparent hover:border-plaza-line focus:border-plaza-accent focus:bg-white focus:outline-none text-[11px] transition"
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL SUMMARY ROW */}
                <tr className="bg-plaza-accent-tint border-t-2 border-t-plaza-text font-bold text-plaza-text">
                  <td colSpan={2} className="border-r border-plaza-line py-3 px-3 text-center tracking-wider uppercase text-xs sticky left-0 z-10 bg-plaza-accent-tint">
                    TOTAL
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.roomRent > 0 ? `₹${sheet.totals.roomRent.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-left text-xs text-plaza-text-3">
                    {sheet.rooms.filter(r => r.customerName).length > 0 ? `${sheet.rooms.filter(r => r.customerName).length} Guests` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-center text-xs text-plaza-accent font-semibold">
                    {Object.values(sheet.totals.platformBookingsCount || {}).reduce((a, b) => a + b, 0)} OTA Bookings
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.advanceCash > 0 ? `₹${sheet.totals.advanceCash.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.advanceOnline > 0 ? `₹${sheet.totals.advanceOnline.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.tBusinessCash > 0 ? `₹${sheet.totals.tBusinessCash.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.tBusinessOnline > 0 ? `₹${sheet.totals.tBusinessOnline.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.gst5 > 0 ? `₹${sheet.totals.gst5.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right">
                    {sheet.totals.balance > 0 ? `₹${sheet.totals.balance.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right text-amber-800">
                    {sheet.totals.refund > 0 ? `₹${sheet.totals.refund.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="border-r border-plaza-line py-3 px-2 text-right text-sm text-plaza-text">
                    {sheet.totals.total > 0 ? `₹${sheet.totals.total.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-3 px-2 text-center text-[10px] text-plaza-text-3">
                    {sheet.totals.occupiedRooms} Occ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subtotals Breakdown Bar */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-plaza-card border border-plaza-line/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div>
                <span className="text-plaza-text-3">Advance: </span>
                <span className="font-bold text-plaza-text">₹{sheet.totals.advanceTotal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-plaza-text-3">Cash: </span>
                <span className="font-bold text-plaza-text">₹{sheet.totals.tBusinessCash.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-plaza-text-3">Online (Agoda): </span>
                <span className="font-bold text-plaza-accent">₹{sheet.totals.tBusinessAgoda.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-plaza-text-3">Online (Others): </span>
                <span className="font-bold text-plaza-text">₹{sheet.totals.tBusinessOtherOnline.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-plaza-text flex items-center gap-2">
              <span>Day Total:</span>
              <span className="text-plaza-accent text-sm sm:text-base font-bold">₹{sheet.totals.dayTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Document Footer */}
          <div className="flex items-center justify-between text-[10px] text-plaza-text-3 font-medium mt-6 pt-4 border-t border-plaza-line/40">
            <div>
              Business Sheet  ·  Rooms 101 to 303 (Horizontal Landscape Format)
            </div>
            <div className="font-bold text-plaza-text">
              01 / 01
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
