import Dexie, { Table } from 'dexie';
import { DaySheet, MonthSummary, MonthSummaryDay, MonthPerformance, YearSummary } from '../types';
import { ROOM_DEFINITIONS, createInitialRooms, createEmptyRoomEntry, computeSheetTotals } from '../data/rooms';
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

export function addDays(dateStr: string, n: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  dt.setDate(dt.getDate() + n);
  const yr = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
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
  let loadedSheet: DaySheet | null = null;

  // 1. Try Supabase Cloud first
  try {
    const { data, error } = await supabase
      .from('day_sheets')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle();

    if (!error && data) {
      const parsedRooms = (typeof data.rooms === 'string' ? JSON.parse(data.rooms) : data.rooms) || [];
      const configuredPlatforms = getBookingPlatforms();
      parsedRooms.forEach((r: any) => {
        if (!r.platform) {
          r.platform = r.isAgoda ? 'Agoda' : 'Direct';
        }
        const isKnown = configuredPlatforms.some(p => p.toLowerCase() === (r.platform || '').toLowerCase());
        const isEmpty = !r.customerName && !r.roomRent && !r.tBusinessOnline && !r.total && r.stayType !== 'stayover';
        if (!isKnown && r.platform && r.platform !== 'Direct' && isEmpty) {
          r.platform = 'Direct';
        }
      });
      const computedTotals = computeSheetTotals(parsedRooms);
      loadedSheet = {
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
      try { await db.sheets.put(loadedSheet); } catch (_) {}
    }
  } catch (err) {
    console.warn('Supabase fetch error, checking local storage:', err);
  }

  // 2. Fallback to Local IndexedDB
  if (!loadedSheet) {
    try {
      const existing = await db.sheets.get(dateStr);
      if (existing) {
        const configuredPlatforms = getBookingPlatforms();
        existing.rooms.forEach((r: any) => {
          if (!r.platform) {
            r.platform = r.isAgoda ? 'Agoda' : 'Direct';
          }
          const isKnown = configuredPlatforms.some(p => p.toLowerCase() === (r.platform || '').toLowerCase());
          const isEmpty = !r.customerName && !r.roomRent && !r.tBusinessOnline && !r.total && r.stayType !== 'stayover';
          if (!isKnown && r.platform && r.platform !== 'Direct' && isEmpty) {
            r.platform = 'Direct';
          }
        });
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
        loadedSheet = existing;
      }
    } catch (err) {
      console.warn('Error reading from IndexedDB:', err);
    }
  }

  if (!loadedSheet) {
    loadedSheet = createNewDaySheet(dateStr);
  }

  // 3. Apply active stay-overs from preceding days
  return await applyStayOversFromPrecedingDays(loadedSheet);
}

/**
 * Checks past 14 days to see if any multi-day stays cover `sheet.date`.
 * If any rooms in `sheet.rooms` are vacant or need updating from their primary stay, applies them.
 */
async function applyStayOversFromPrecedingDays(sheet: DaySheet): Promise<DaySheet> {
  const targetDate = sheet.date;
  const startDate = addDays(targetDate, -14);

  try {
    const { data, error } = await supabase
      .from('day_sheets')
      .select('*')
      .gte('date', startDate)
      .lt('date', targetDate)
      .order('date', { ascending: true });

    const precedingSheets: DaySheet[] = [];

    if (!error && data && data.length > 0) {
      data.forEach((row: any) => {
        const rooms = (typeof row.rooms === 'string' ? JSON.parse(row.rooms) : row.rooms) || [];
        precedingSheets.push({
          date: row.date,
          dayOfWeek: getWeekdayName(row.date),
          rooms,
          totals: computeSheetTotals(rooms),
          notes: row.notes || '',
          receptionistName: row.verified_by || '',
          createdAt: row.created_at || '',
          updatedAt: row.updated_at || '',
        });
      });
    } else {
      const localSheets = await db.sheets
        .where('date')
        .between(startDate, targetDate, true, false)
        .toArray();
      precedingSheets.push(...localSheets);
    }

    let modified = false;

    precedingSheets.forEach(priorSheet => {
      priorSheet.rooms.forEach(priorRoom => {
        if (
          priorRoom.stayDays &&
          priorRoom.stayDays > 1 &&
          priorRoom.checkInDate &&
          priorRoom.checkOutDate &&
          priorRoom.stayType !== 'stayover' &&
          priorRoom.customerName?.trim()
        ) {
          if (targetDate > priorRoom.checkInDate && targetDate < priorRoom.checkOutDate) {
            const currentRoom = sheet.rooms.find(r => r.roomNumber === priorRoom.roomNumber);
            if (currentRoom) {
              const isVacantOrMatching = !currentRoom.customerName || currentRoom.primaryStayDate === priorRoom.checkInDate || currentRoom.status === 'vacant';
              if (isVacantOrMatching) {
                const advCash = typeof priorRoom.advanceCash === 'number' ? priorRoom.advanceCash : 0;
                const advOnline = typeof priorRoom.advanceOnline === 'number' ? priorRoom.advanceOnline : 0;
                const tbCash = typeof priorRoom.tBusinessCash === 'number' ? priorRoom.tBusinessCash : 0;
                const tbOnline = typeof priorRoom.tBusinessOnline === 'number' ? priorRoom.tBusinessOnline : 0;
                const paidOnCheckIn = advCash + advOnline + tbCash + tbOnline;
                const rent = typeof priorRoom.roomRent === 'number' ? priorRoom.roomRent : 0;

                // Sum all payments made on intermediate stayover days between checkInDate and targetDate
                const pCheckIn = priorRoom.checkInDate;
                let intermediatePayments = 0;
                precedingSheets.forEach(interSheet => {
                  if (interSheet.date > pCheckIn && interSheet.date < targetDate) {
                    const interRoom = interSheet.rooms.find(r => r.roomNumber === priorRoom.roomNumber && r.primaryStayDate === pCheckIn);
                    if (interRoom) {
                      const c = typeof interRoom.tBusinessCash === 'number' ? interRoom.tBusinessCash : 0;
                      const o = typeof interRoom.tBusinessOnline === 'number' ? interRoom.tBusinessOnline : 0;
                      intermediatePayments += (c + o);
                    }
                  }
                });

                const totalPaidBeforeToday = paidOnCheckIn + intermediatePayments;
                const startingBalance = rent > 0 ? Math.max(0, rent - totalPaidBeforeToday) : 0;

                currentRoom.customerName = priorRoom.customerName;
                currentRoom.platform = priorRoom.platform || 'Direct';
                currentRoom.isAgoda = Boolean(priorRoom.isAgoda || priorRoom.platform === 'Agoda');
                currentRoom.roomRent = ''; // no rent recharge on stayover
                currentRoom.advanceCash = '';
                currentRoom.advanceOnline = '';
                currentRoom.status = 'occupied';
                currentRoom.checkInDate = priorRoom.checkInDate;
                currentRoom.checkOutDate = priorRoom.checkOutDate;
                currentRoom.stayDays = priorRoom.stayDays;
                currentRoom.stayType = 'stayover';
                currentRoom.primaryStayDate = priorRoom.checkInDate;
                currentRoom.stayPaidOnCheckIn = paidOnCheckIn;
                currentRoom.stayBalanceRemaining = startingBalance;
                modified = true;
              }
            }
          }
        }
      });
    });

    if (modified) {
      sheet.totals = computeSheetTotals(sheet.rooms);
      try {
        await db.sheets.put(sheet);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('applyStayOversFromPrecedingDays error:', err);
  }

  return sheet;
}

/**
 * Synchronizes multi-day stays initiated or modified on `sheet.date` forward to subsequent days.
 * Also cleans up any previously scheduled stay-overs if a room is shortened or cleared.
 */
export async function syncMultiDayStays(sheet: DaySheet): Promise<void> {
  const checkInDate = sheet.date;

  const multiDayMap = new Map<string, {
    stayDays: number;
    checkOutDate: string;
    customerName: string;
    platform: string;
    isAgoda: boolean;
    paidOnCheckIn: number;
    balanceRemaining: number;
    notes?: string;
  }>();

  // For stays where payment was made on an ongoing stayover day:
  const stayOverUpdateMap = new Map<string, {
    primaryStayDate: string;
    checkOutDate: string;
    remainingAfterToday: number;
  }>();

  sheet.rooms.forEach(r => {
    if (r.stayDays && r.stayDays > 1 && r.checkOutDate && r.customerName?.trim()) {
      if (r.stayType !== 'stayover') {
        const advCash = typeof r.advanceCash === 'number' ? r.advanceCash : 0;
        const advOnline = typeof r.advanceOnline === 'number' ? r.advanceOnline : 0;
        const tbCash = typeof r.tBusinessCash === 'number' ? r.tBusinessCash : 0;
        const tbOnline = typeof r.tBusinessOnline === 'number' ? r.tBusinessOnline : 0;
        const totalPaid = advCash + advOnline + tbCash + tbOnline;
        const rent = typeof r.roomRent === 'number' ? r.roomRent : 0;
        const remaining = rent > 0 ? Math.max(0, rent - totalPaid) : 0;

        multiDayMap.set(r.roomNumber, {
          stayDays: r.stayDays,
          checkOutDate: r.checkOutDate,
          customerName: r.customerName,
          platform: r.platform || 'Direct',
          isAgoda: Boolean(r.isAgoda || r.platform === 'Agoda'),
          paidOnCheckIn: totalPaid,
          balanceRemaining: remaining,
          notes: r.notes,
        });
      } else if (r.primaryStayDate && sheet.date < r.checkOutDate) {
        // Stayover row: compute remaining balance after today's payment
        const startingBal = typeof r.stayBalanceRemaining === 'number' ? r.stayBalanceRemaining : 0;
        const tbCash = typeof r.tBusinessCash === 'number' ? r.tBusinessCash : 0;
        const tbOnline = typeof r.tBusinessOnline === 'number' ? r.tBusinessOnline : 0;
        const remainingAfterToday = Math.max(0, startingBal - (tbCash + tbOnline));

        stayOverUpdateMap.set(r.roomNumber, {
          primaryStayDate: r.primaryStayDate,
          checkOutDate: r.checkOutDate,
          remainingAfterToday,
        });
      }
    }
  });

  for (let offset = 1; offset <= 14; offset++) {
    const targetDate = addDays(checkInDate, offset);
    let targetSheet: DaySheet | null = null;

    try {
      targetSheet = await db.sheets.get(targetDate) || null;
      if (!targetSheet) {
        const { data } = await supabase.from('day_sheets').select('*').eq('date', targetDate).maybeSingle();
        if (data) {
          const parsedRooms = (typeof data.rooms === 'string' ? JSON.parse(data.rooms) : data.rooms) || [];
          targetSheet = {
            date: data.date,
            dayOfWeek: getWeekdayName(data.date),
            rooms: parsedRooms.length === ROOM_DEFINITIONS.length ? parsedRooms : createInitialRooms().map(empty => {
              const found = parsedRooms.find((r: any) => r.roomNumber === empty.roomNumber);
              return found || empty;
            }),
            totals: computeSheetTotals(parsedRooms),
            notes: data.notes || '',
            receptionistName: data.verified_by || 'Reception Desk',
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
          };
        }
      }
    } catch (_) {}

    let hasChange = false;

    ROOM_DEFINITIONS.forEach(def => {
      const stayInfo = multiDayMap.get(def.roomNumber);
      const isWithinStay = stayInfo && offset < stayInfo.stayDays && targetDate < stayInfo.checkOutDate;

      if (isWithinStay && stayInfo) {
        if (!targetSheet) {
          targetSheet = createNewDaySheet(targetDate);
        }
        const room = targetSheet.rooms.find(r => r.roomNumber === def.roomNumber);
        if (room) {
          if (!room.customerName || room.primaryStayDate === checkInDate || room.status === 'vacant') {
            room.customerName = stayInfo.customerName;
            room.platform = stayInfo.platform;
            room.isAgoda = stayInfo.isAgoda;
            room.roomRent = '';
            room.advanceCash = '';
            room.advanceOnline = '';
            room.tBusinessCash = typeof room.tBusinessCash === 'number' ? room.tBusinessCash : '';
            room.tBusinessOnline = typeof room.tBusinessOnline === 'number' ? room.tBusinessOnline : '';
            room.status = 'occupied';
            room.checkInDate = checkInDate;
            room.checkOutDate = stayInfo.checkOutDate;
            room.stayDays = stayInfo.stayDays;
            room.stayType = 'stayover';
            room.primaryStayDate = checkInDate;
            room.stayPaidOnCheckIn = stayInfo.paidOnCheckIn;
            room.stayBalanceRemaining = stayInfo.balanceRemaining;
            hasChange = true;
          }
        }
      } else if (stayOverUpdateMap.has(def.roomNumber)) {
        const soInfo = stayOverUpdateMap.get(def.roomNumber)!;
        if (targetDate < soInfo.checkOutDate && targetSheet) {
          const room = targetSheet.rooms.find(r => r.roomNumber === def.roomNumber);
          if (room && (room.primaryStayDate === soInfo.primaryStayDate || room.stayType === 'stayover')) {
            room.stayBalanceRemaining = soInfo.remainingAfterToday;
            hasChange = true;
          }
        }
      } else if (targetSheet && multiDayMap.has(def.roomNumber)) {
        const room = targetSheet.rooms.find(r => r.roomNumber === def.roomNumber);
        if (room && room.primaryStayDate === checkInDate) {
          const empty = createEmptyRoomEntry(def);
          Object.assign(room, empty);
          hasChange = true;
        }
      }
    });

    if (hasChange && targetSheet) {
      targetSheet.totals = computeSheetTotals(targetSheet.rooms);
      targetSheet.updatedAt = new Date().toISOString();
      try {
        await db.sheets.put(targetSheet);
        await supabase.from('day_sheets').upsert({
          date: targetSheet.date,
          rooms: targetSheet.rooms,
          totals: targetSheet.totals,
          notes: targetSheet.notes || '',
          verified_by: targetSheet.receptionistName || '',
          updated_at: targetSheet.updatedAt,
        }, { onConflict: 'date' });
      } catch (err) {
        console.warn('Error saving synced targetSheet:', err);
      }
    }
  }
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

  // 3. Sync multi-day stay reservations forward asynchronously
  syncMultiDayStays(sheet).catch(err => console.error('syncMultiDayStays error:', err));
}

export async function getMonthSummary(year: number, month: number): Promise<MonthSummary> {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const sheetMap = new Map<string, DaySheet>();
  const monthPlatformSales: Record<string, number> = {};

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
        });
        const totals = computeSheetTotals(rooms);
        Object.entries(totals.platformTotals || {}).forEach(([plat, amt]) => {
          if (amt > 0) {
            monthPlatformSales[plat] = (monthPlatformSales[plat] || 0) + amt;
          }
        });
        if (totals.tBusinessAgoda > 0) {
          monthPlatformSales['Agoda'] = (monthPlatformSales['Agoda'] || 0) + totals.tBusinessAgoda;
        }

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
      });
      s.totals = computeSheetTotals(s.rooms);
      Object.entries(s.totals.platformTotals || {}).forEach(([plat, amt]) => {
        if (amt > 0) {
          monthPlatformSales[plat] = (monthPlatformSales[plat] || 0) + amt;
        }
      });
      if (s.totals.tBusinessAgoda > 0) {
        monthPlatformSales['Agoda'] = (monthPlatformSales['Agoda'] || 0) + s.totals.tBusinessAgoda;
      }
      sheetMap.set(s.date, s);
    });
  }

  // Platform inclusion rules:
  // 1. All currently configured platforms are ALWAYS included (even if 0 sales this month)
  // 2. Any platform removed from configured platforms is included ONLY IF it had actual sales (> 0) in this month.
  //    If a removed platform has 0 sales in this month, DO NOT show it in the Monthly PDF, View, or Analytics.
  const configuredPlatforms = getBookingPlatforms();
  const activePlatforms: string[] = [];

  configuredPlatforms.forEach(p => {
    if (!activePlatforms.some(ap => ap.toLowerCase() === p.toLowerCase())) {
      activePlatforms.push(p);
    }
  });

  Object.entries(monthPlatformSales).forEach(([plat, sales]) => {
    if (sales > 0 && !activePlatforms.some(ap => ap.toLowerCase() === plat.toLowerCase())) {
      activePlatforms.push(plat);
    }
  });

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
      const dayPlatTotals: Record<string, number> = {};
      activePlatforms.forEach(p => {
        const amt = t.platformTotals?.[p] || (p.toLowerCase() === 'agoda' ? t.tBusinessAgoda : 0) || 0;
        dayPlatTotals[p] = amt;
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
        platformTotals: dayPlatTotals,
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

export async function getYearSummary(year: number): Promise<YearSummary> {
  const monthPromises = Array.from({ length: 12 }, (_, i) => getMonthSummary(year, i + 1));
  const monthSummaries = await Promise.all(monthPromises);

  const configuredPlatforms = getBookingPlatforms();
  const activePlatforms: string[] = [];
  configuredPlatforms.forEach(p => {
    if (!activePlatforms.some(ap => ap.toLowerCase() === p.toLowerCase())) {
      activePlatforms.push(p);
    }
  });

  let totalRevenue = 0;
  let totalCash = 0;
  let totalAdvance = 0;
  let totalOnline = 0;
  let totalOtherOnline = 0;
  let totalRecordedDays = 0;

  const months: MonthPerformance[] = monthSummaries.map((ms) => {
    ms.activePlatforms.forEach(p => {
      if (!activePlatforms.some(ap => ap.toLowerCase() === p.toLowerCase())) {
        activePlatforms.push(p);
      }
    });
    totalRevenue += ms.totalRevenue;
    totalCash += ms.totalCash;
    totalAdvance += ms.totalAdvance;
    totalOnline += ms.totalOnline;
    totalOtherOnline += ms.totalOtherOnline;
    totalRecordedDays += ms.recordedDays;

    return {
      month: ms.month,
      monthName: ms.monthName,
      yearMonth: ms.yearMonth,
      totalRevenue: ms.totalRevenue,
      totalCash: ms.totalCash,
      totalAdvance: ms.totalAdvance,
      totalOnline: ms.totalOnline,
      totalOtherOnline: ms.totalOtherOnline,
      platformTotals: ms.platformTotals,
      occupiedRooms: ms.days.reduce((sum, d) => sum + (d.totals?.occupiedRooms || 0), 0),
      recordedDays: ms.recordedDays,
      peakDay: ms.peakDay,
    };
  });

  const activeMonths = [...months].filter(m => m.totalRevenue > 0);
  activeMonths.sort((a, b) => b.totalRevenue - a.totalRevenue);
  const bestMonth = activeMonths.length > 0 ? activeMonths[0] : null;

  return {
    year,
    totalRevenue,
    totalCash,
    totalAdvance,
    totalOnline,
    totalOtherOnline,
    totalRecordedDays,
    bestMonth,
    months,
    activePlatforms,
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
