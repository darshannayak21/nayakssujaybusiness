import Dexie, { Table } from 'dexie';
import { DaySheet, MonthSummary, MonthSummaryDay } from '../types';
import { ROOM_DEFINITIONS, createInitialRooms, computeSheetTotals } from '../data/rooms';
import { supabase } from './supabase';
import { getBookingPlatforms } from './platforms';

export class PlazaDatabase extends Dexie {
  sheets!: Table<DaySheet, string>;

  constructor() {
    super('PlazaBusinessSheetDB');
    this.version(1).stores({
      sheets: 'date, updatedAt',
    });
  }
}

export const db = new PlazaDatabase();

export function getWeekdayName(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatDateForDisplay(dateStr: string): {
  dayStr: string;
  monthStr: string;
  yearStr: string;
  formatted: string;
  formattedShort: string; // DD/MM/YY
} {
  const parts = dateStr.split('-');
  const y = parts[0] || '2026';
  const m = parts[1] || '01';
  const d = parts[2] || '01';
  const shortYear = y.slice(-2);
  return {
    dayStr: d.padStart(2, '0'),
    monthStr: m.padStart(2, '0'),
    yearStr: y,
    formatted: `${d.padStart(2, '0')} / ${m.padStart(2, '0')} / ${y}`,
    formattedShort: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${shortYear}`,
  };
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createNewDaySheet(dateStr: string): DaySheet {
  const rooms = createInitialRooms();
  const totals = computeSheetTotals(rooms);
  const nowIso = new Date().toISOString();

  return {
    date: dateStr,
    dayOfWeek: getWeekdayName(dateStr),
    rooms,
    totals,
    notes: '',
    receptionistName: 'Reception Desk',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function getDaySheet(dateStr: string): Promise<DaySheet> {
  // 1. Try Supabase Cloud first
  try {
    const { data, error } = await supabase
      .from('day_sheets')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle();

    if (!error && data) {
      const parsedRooms = (typeof data.rooms === 'string' ? JSON.parse(data.rooms) : data.rooms) || [];
      parsedRooms.forEach((r: any) => {
        if (!r.platform) {
          r.platform = r.isAgoda ? 'Agoda' : 'Direct';
        }
      });
      const computedTotals = computeSheetTotals(parsedRooms);
      const sheet: DaySheet = {
        date: data.date,
        dayOfWeek: getWeekdayName(data.date),
        rooms: parsedRooms.length === ROOM_DEFINITIONS.length ? parsedRooms : createInitialRooms().map(empty => {
          const found = parsedRooms.find((r: any) => r.roomNumber === empty.roomNumber);
          return found || empty;
        }),
        totals: computedTotals,
        notes: data.notes || '',
        receptionistName: data.verified_by || 'Reception Desk',
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
      };
      // Keep local Dexie cached in sync
      try { await db.sheets.put(sheet); } catch (_) {}
      return sheet;
    }
  } catch (err) {
    console.warn('Supabase fetch error, checking local storage:', err);
  }

  // 2. Fallback to Local IndexedDB
  try {
    const existing = await db.sheets.get(dateStr);
    if (existing) {
      if (existing.rooms.length < ROOM_DEFINITIONS.length) {
        const mergedRooms = createInitialRooms().map(emptyRoom => {
          const found = existing.rooms.find(r => r.roomNumber === emptyRoom.roomNumber);
          return found || emptyRoom;
        });
        existing.rooms = mergedRooms;
        existing.totals = computeSheetTotals(mergedRooms);
      } else {
        existing.totals = computeSheetTotals(existing.rooms);
      }
      return existing;
    }
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
  }

  return createNewDaySheet(dateStr);
}

export async function saveDaySheet(sheet: DaySheet): Promise<void> {
  sheet.updatedAt = new Date().toISOString();
  sheet.dayOfWeek = getWeekdayName(sheet.date);
  sheet.totals = computeSheetTotals(sheet.rooms);

  // 1. Save to Local Cache (IndexedDB)
  try {
    await db.sheets.put(sheet);
  } catch (err) {
    console.error('Dexie save error:', err);
  }

  // 2. Upsert directly to Supabase Cloud
  try {
    const { error } = await supabase.from('day_sheets').upsert({
      date: sheet.date,
      rooms: sheet.rooms,
      totals: sheet.totals,
      notes: sheet.notes || '',
      verified_by: sheet.receptionistName || '',
      updated_at: sheet.updatedAt,
    }, { onConflict: 'date' });

    if (error) {
      console.error('Supabase cloud upsert error:', error);
    }
  } catch (cloudErr) {
    console.error('Failed to sync to Supabase cloud:', cloudErr);
  }
}

export async function getMonthSummary(year: number, month: number): Promise<MonthSummary> {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const sheetMap = new Map<string, DaySheet>();
  const activePlatformsSet = new Set<string>(getBookingPlatforms());

  // 1. Query Supabase for this month
  try {
    const { data, error } = await supabase
      .from('day_sheets')
      .select('*')
      .gte('date', `${prefix}-01`)
      .lte('date', `${prefix}-${String(daysInMonth).padStart(2, '0')}`);

    if (!error && data && data.length > 0) {
      data.forEach((row: any) => {
        if (row.date === 'CONFIG_PLATFORMS') return;
        const rooms = (typeof row.rooms === 'string' ? JSON.parse(row.rooms) : row.rooms) || [];
        rooms.forEach((r: any) => {
          if (!r.platform) {
            r.platform = r.isAgoda ? 'Agoda' : 'Direct';
          }
          if (r.platform && r.platform !== 'Direct') {
            activePlatformsSet.add(r.platform);
          }
        });
        const totals = computeSheetTotals(rooms);
        sheetMap.set(row.date, {
          date: row.date,
          dayOfWeek: getWeekdayName(row.date),
          rooms,
          totals,
          notes: row.notes || '',
          receptionistName: row.verified_by || 'Reception Desk',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        });
      });
    }
  } catch (err) {
    console.warn('Supabase getMonthSummary error, reading local DB:', err);
  }

  // 2. If nothing from cloud, check local DB
  if (sheetMap.size === 0) {
    const allSheets = await db.sheets
      .filter(sheet => sheet.date.startsWith(prefix) && sheet.date !== 'CONFIG_PLATFORMS')
      .toArray();

    allSheets.forEach(s => {
      s.rooms.forEach((r: any) => {
        if (!r.platform) {
          r.platform = r.isAgoda ? 'Agoda' : 'Direct';
        }
        if (r.platform && r.platform !== 'Direct') {
          activePlatformsSet.add(r.platform);
        }
      });
      s.totals = computeSheetTotals(s.rooms);
      sheetMap.set(s.date, s);
    });
  }

  const activePlatforms = Array.from(activePlatformsSet);
  const monthPlatformTotals: Record<string, number> = {};
  activePlatforms.forEach(p => { monthPlatformTotals[p] = 0; });

  const days: MonthSummaryDay[] = [];
  let totalRevenue = 0;
  let totalAdvance = 0;
  let totalCash = 0;
  let totalAgoda = 0;
  let totalOtherOnline = 0;
  let totalOnline = 0;
  let totalGst = 0;
  let totalRefund = 0;
  let totalBalance = 0;
  let recordedDays = 0;
  let peakDay: { date: string; revenue: number } | null = null;
  let peakOccupancyDay: { date: string; occupiedRooms: number } | null = null;
  let totalOccupancySum = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${prefix}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = `${String(d).padStart(2, '0')}/${monthStr}/${String(year).slice(-2)}`;
    const sheet = sheetMap.get(dStr);

    if (sheet && (sheet.totals.dayTotal > 0 || sheet.totals.occupiedRooms > 0 || sheet.totals.total > 0)) {
      recordedDays++;
      const t = sheet.totals;

      const effectiveDayTotal = t.dayTotal > 0 ? t.dayTotal : t.total;
      totalRevenue += effectiveDayTotal;
      totalAdvance += t.advanceTotal;
      totalCash += t.tBusinessCash;
      totalAgoda += t.tBusinessAgoda;
      totalOtherOnline += t.tBusinessOtherOnline;
      totalOnline += t.tBusinessOnline;
      totalGst += t.gst5;
      totalRefund += t.refund;
      totalBalance += t.balance;
      totalOccupancySum += t.occupiedRooms;

      // Accumulate dynamic platform totals
      activePlatforms.forEach(p => {
        const amt = t.platformTotals?.[p] || 0;
        monthPlatformTotals[p] = (monthPlatformTotals[p] || 0) + amt;
      });

      if (!peakDay || effectiveDayTotal > peakDay.revenue) {
        peakDay = { date: dStr, revenue: effectiveDayTotal };
      }

      if (!peakOccupancyDay || t.occupiedRooms > peakOccupancyDay.occupiedRooms) {
        peakOccupancyDay = { date: dStr, occupiedRooms: t.occupiedRooms };
      }

      days.push({
        date: dStr,
        dayNumber: d,
        dayOfWeek,
        formattedDate,
        hasData: true,
        totals: t,
        advanceTotal: t.advanceTotal,
        tBusinessCash: t.tBusinessCash,
        agodaOnline: t.tBusinessAgoda,
        platformTotals: t.platformTotals || {},
        otherOnline: t.tBusinessOtherOnline,
        dayTotal: effectiveDayTotal,
      });
    } else {
      const emptyPlat: Record<string, number> = {};
      activePlatforms.forEach(p => { emptyPlat[p] = 0; });
      days.push({
        date: dStr,
        dayNumber: d,
        dayOfWeek,
        formattedDate,
        hasData: false,
        advanceTotal: 0,
        tBusinessCash: 0,
        agodaOnline: 0,
        platformTotals: emptyPlat,
        otherOnline: 0,
        dayTotal: 0,
      });
    }
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  const averageDailyRevenue = recordedDays > 0 ? Math.round(totalRevenue / recordedDays) : 0;
  const averageOccupancyRate = recordedDays > 0 
    ? Math.round((totalOccupancySum / (recordedDays * ROOM_DEFINITIONS.length)) * 100) 
    : 0;

  return {
    yearMonth: prefix,
    year,
    month,
    monthName,
    totalDays: daysInMonth,
    recordedDays,
    totalRevenue,
    totalAdvance,
    totalCash,
    totalAgoda,
    totalOtherOnline,
    totalOnline,
    platformTotals: monthPlatformTotals,
    activePlatforms,
    totalGst,
    totalRefund,
    totalBalance,
    averageDailyRevenue,
    peakDay,
    peakOccupancyDay,
    averageOccupancyRate,
    days,
  };
}

export async function exportAllDataAsJSON(): Promise<string> {
  const allSheets = await db.sheets.toArray();
  const exportPayload = {
    appName: 'PlazaBusinessSheet',
    version: '2.0',
    exportDate: new Date().toISOString(),
    totalSheets: allSheets.length,
    sheets: allSheets,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export async function importDataFromJSON(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString);
  if (!data.sheets || !Array.isArray(data.sheets)) {
    throw new Error('Invalid backup file: missing sheets array.');
  }

  let count = 0;
  for (const sheet of data.sheets) {
    if (sheet.date && Array.isArray(sheet.rooms)) {
      sheet.totals = computeSheetTotals(sheet.rooms);
      await db.sheets.put(sheet);
      count++;
    }
  }
  return count;
}

export async function clearAllDatabaseData(): Promise<void> {
  try {
    await db.sheets.clear();
  } catch (e) {
    console.error('Dexie clear error:', e);
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('plaza_sheet_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}
