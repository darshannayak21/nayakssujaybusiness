import { RoomEntry, DaySheetTotals } from '../types';

export interface RoomDefinition {
  slNo: number;
  roomNumber: string;
  floor: 1 | 2 | 3;
}

export const ROOM_DEFINITIONS: RoomDefinition[] = [
  // Floor 1
  { slNo: 1, roomNumber: '101', floor: 1 },
  { slNo: 2, roomNumber: '102', floor: 1 },
  { slNo: 3, roomNumber: '103', floor: 1 },
  { slNo: 4, roomNumber: '104', floor: 1 },
  { slNo: 5, roomNumber: '105', floor: 1 },
  { slNo: 6, roomNumber: '106', floor: 1 },
  { slNo: 7, roomNumber: '107', floor: 1 },
  { slNo: 8, roomNumber: '108', floor: 1 },
  { slNo: 9, roomNumber: '109', floor: 1 },
  { slNo: 10, roomNumber: '110', floor: 1 },

  // Floor 2
  { slNo: 11, roomNumber: '201', floor: 2 },
  { slNo: 12, roomNumber: '202', floor: 2 },
  { slNo: 13, roomNumber: '203', floor: 2 },
  { slNo: 14, roomNumber: '204', floor: 2 },
  { slNo: 15, roomNumber: '205', floor: 2 },
  { slNo: 16, roomNumber: '206', floor: 2 },
  { slNo: 17, roomNumber: '207', floor: 2 },
  { slNo: 18, roomNumber: '208', floor: 2 },
  { slNo: 19, roomNumber: '209', floor: 2 },
  { slNo: 20, roomNumber: '210', floor: 2 },
  { slNo: 21, roomNumber: '211', floor: 2 },
  { slNo: 22, roomNumber: '212', floor: 2 },
  { slNo: 23, roomNumber: '213', floor: 2 },

  // Floor 3
  { slNo: 24, roomNumber: '301', floor: 3 },
  { slNo: 25, roomNumber: '302', floor: 3 },
  { slNo: 26, roomNumber: '303', floor: 3 },
];

export function createEmptyRoomEntry(def: RoomDefinition): RoomEntry {
  return {
    slNo: def.slNo,
    roomNumber: def.roomNumber,
    floor: def.floor,
    customerName: '',
    platform: 'Direct',
    isAgoda: false,
    roomRent: '',
    advanceCash: '',
    advanceOnline: '',
    advanceCashDate: '',
    advanceOnlineDate: '',
    tBusinessCash: '',
    tBusinessOnline: '',
    gst5: '',
    gstAuto: false,
    balance: '',
    refund: '',
    total: '',
    checkOut: '',
    status: 'vacant',
    notes: '',
    checkInDate: '',
    checkOutDate: '',
    stayDays: 1,
    stayType: 'checkin',
    primaryStayDate: '',
    stayPaidOnCheckIn: 0,
    stayBalanceRemaining: 0,
    isExtraEntry: false,
    extraEntryIndex: 1,
  };
}

export function createInitialRooms(): RoomEntry[] {
  return ROOM_DEFINITIONS.map(createEmptyRoomEntry);
}

/**
 * Normalizes day sheet rooms so all 26 base rooms exist in canonical order,
 * with any extra entries (e.g. room booked twice in a day) neatly preserved directly
 * beneath their parent room.
 */
export function normalizeDaySheetRooms(parsedRooms: any[]): RoomEntry[] {
  if (!Array.isArray(parsedRooms) || parsedRooms.length === 0) {
    return createInitialRooms();
  }

  // 1. Group parsed rooms by roomNumber
  const roomsByNumber = new Map<string, any[]>();
  parsedRooms.forEach(r => {
    if (!r || !r.roomNumber) return;
    const list = roomsByNumber.get(r.roomNumber) || [];
    list.push(r);
    roomsByNumber.set(r.roomNumber, list);
  });

  // 2. Iterate through canonical ROOM_DEFINITIONS (101 to 303)
  const result: RoomEntry[] = [];
  ROOM_DEFINITIONS.forEach(def => {
    const existingList = roomsByNumber.get(def.roomNumber);
    if (!existingList || existingList.length === 0) {
      result.push(createEmptyRoomEntry(def));
    } else {
      // First entry is the base entry (isExtraEntry: false)
      const base: RoomEntry = {
        ...createEmptyRoomEntry(def),
        ...existingList[0],
        floor: def.floor,
        slNo: def.slNo,
        isExtraEntry: false,
        extraEntryIndex: 1,
      };
      result.push(base);

      // Any subsequent entries are extra entries for this room
      for (let i = 1; i < existingList.length; i++) {
        const extra: RoomEntry = {
          ...createEmptyRoomEntry(def),
          ...existingList[i],
          floor: def.floor,
          slNo: def.slNo,
          isExtraEntry: true,
          extraEntryIndex: i + 1,
        };
        result.push(extra);
      }
    }
  });

  return result;
}

export function calculateRoomTotal(room: RoomEntry): number | '' {
  const advCash = typeof room.advanceCash === 'number' ? room.advanceCash : 0;
  const advOnline = typeof room.advanceOnline === 'number' ? room.advanceOnline : 0;
  const tbCash = typeof room.tBusinessCash === 'number' ? room.tBusinessCash : 0;
  const tbOnline = typeof room.tBusinessOnline === 'number' ? room.tBusinessOnline : 0;
  
  const hasPayment = (
    room.advanceCash !== '' || 
    room.advanceOnline !== '' || 
    room.tBusinessCash !== '' || 
    room.tBusinessOnline !== ''
  );

  if (hasPayment) {
    return advCash + advOnline + tbCash + tbOnline;
  }

  return '';
}

export function computeSheetTotals(rooms: RoomEntry[]): DaySheetTotals {
  let roomRent = 0;
  let advanceCash = 0;
  let advanceOnline = 0;
  let tBusinessCash = 0;
  let tBusinessAgoda = 0;
  let tBusinessOtherOnline = 0;
  let gst5 = 0;
  let balance = 0;
  let refund = 0;
  let total = 0;
  let agodaBookingsCount = 0;

  const platformTotals: Record<string, number> = {};
  const platformBookingsCount: Record<string, number> = {};

  rooms.forEach(r => {
    // Only add room rent if NOT a stayover (since rent is accounted on check-in day)
    if (r.stayType !== 'stayover') {
      if (typeof r.roomRent === 'number') roomRent += r.roomRent;
    }

    // Platform identifier: determined solely by platform dropdown (NOT just name)
    const isOnlinePlatform = Boolean(r.platform && r.platform !== 'Direct' && r.platform.trim().length > 0);
    
    if (isOnlinePlatform) {
      const plat = r.platform.trim();
      const hasBooking = Boolean(
        r.stayType === 'stayover' ||
        (r.customerName && r.customerName.trim().length > 0) ||
        (typeof r.roomRent === 'number' && r.roomRent > 0) ||
        (typeof r.tBusinessOnline === 'number' && r.tBusinessOnline > 0)
      );

      if (hasBooking) {
        platformBookingsCount[plat] = (platformBookingsCount[plat] || 0) + 1;
      }
      
      // On stayover, only count online money if explicitly entered on this date
      if (r.stayType === 'stayover') {
        if (typeof r.tBusinessOnline === 'number' && r.tBusinessOnline > 0) {
          platformTotals[plat] = (platformTotals[plat] || 0) + r.tBusinessOnline;
          if (plat.toLowerCase() === 'agoda') {
            tBusinessAgoda += r.tBusinessOnline;
          }
        }
      } else {
        const amt = typeof r.tBusinessOnline === 'number' 
          ? r.tBusinessOnline 
          : (typeof r.roomRent === 'number' && r.roomRent > 0 ? r.roomRent : 0);

        if (amt > 0) {
          platformTotals[plat] = (platformTotals[plat] || 0) + amt;
        }

        if (plat.toLowerCase() === 'agoda') {
          tBusinessAgoda += amt;
          if (hasBooking && amt > 0) {
            agodaBookingsCount++;
          }
        }
      }
      // For online platforms, advance does not apply (paid through OTA)
    } else {
      // Direct / Walk-in guests
      if (typeof r.advanceCash === 'number') advanceCash += r.advanceCash;
      if (typeof r.advanceOnline === 'number') advanceOnline += r.advanceOnline;
      if (typeof r.tBusinessCash === 'number') tBusinessCash += r.tBusinessCash;
      if (typeof r.tBusinessOnline === 'number') tBusinessOtherOnline += r.tBusinessOnline;
    }

    if (typeof r.gst5 === 'number') gst5 += r.gst5;
    if (typeof r.balance === 'number') balance += r.balance;
    if (typeof r.refund === 'number') refund += r.refund;
    r.total = calculateRoomTotal(r);
    if (typeof r.total === 'number') total += r.total;

    // Strict occupancy determination:
    // A room has an active entry IF AND ONLY IF actual data exists in that row,
    // OR it is actively marked as an ongoing stay-over:
    const hasActiveEntry = Boolean(
      r.stayType === 'stayover' ||
      (r.customerName && r.customerName.trim().length > 0) ||
      (typeof r.roomRent === 'number' && r.roomRent > 0) ||
      (typeof r.advanceCash === 'number' && r.advanceCash > 0) ||
      (typeof r.advanceOnline === 'number' && r.advanceOnline > 0) ||
      (typeof r.tBusinessCash === 'number' && r.tBusinessCash > 0) ||
      (typeof r.tBusinessOnline === 'number' && r.tBusinessOnline > 0)
    );

    const isCheckedOut = Boolean(
      r.checkOut && r.checkOut.trim().length > 0 && r.checkOut.trim().toLowerCase() !== 'no'
    );

    if (isCheckedOut) {
      r.status = 'checkout';
    } else if (hasActiveEntry) {
      r.status = 'occupied';
    } else {
      r.status = 'vacant';
    }
  });

  // Distinct physical room occupancy determination (each physical room 101-303 counted once):
  // 1. A physical room is 'occupied' if ANY entry for that room is currently active ('occupied').
  // 2. Otherwise, it is 'checkout' if ANY entry for that room was checked out ('checkout').
  // 3. Otherwise, it is 'vacant'.
  const physicalRoomStatus = new Map<string, 'occupied' | 'checkout' | 'vacant'>();
  ROOM_DEFINITIONS.forEach(def => {
    physicalRoomStatus.set(def.roomNumber, 'vacant');
  });

  rooms.forEach(r => {
    const current = physicalRoomStatus.get(r.roomNumber);
    if (r.status === 'occupied') {
      physicalRoomStatus.set(r.roomNumber, 'occupied');
    } else if (r.status === 'checkout' && current !== 'occupied') {
      physicalRoomStatus.set(r.roomNumber, 'checkout');
    }
  });

  let occupiedRooms = 0;
  let checkedOutRooms = 0;
  let vacantRooms = 0;

  physicalRoomStatus.forEach(status => {
    if (status === 'occupied') occupiedRooms++;
    else if (status === 'checkout') checkedOutRooms++;
    else vacantRooms++;
  });

  const advanceTotal = advanceCash + advanceOnline;
  const platformsOnlineSum = Object.values(platformTotals).reduce((sum, v) => sum + v, 0);
  const tBusinessOnline = platformsOnlineSum + tBusinessOtherOnline;
  const tBusinessTotal = tBusinessCash + tBusinessOnline;
  const netCash = (advanceCash + tBusinessCash) - refund;
  const netOnline = advanceOnline + tBusinessOnline;
  const totalCollections = netCash + netOnline;
  
  // Day total: Advance + Cash + sum(all online platforms) + Other Online
  const dayTotal = advanceTotal + tBusinessCash + platformsOnlineSum + tBusinessOtherOnline;

  return {
    roomRent,
    advanceCash,
    advanceOnline,
    advanceTotal,
    tBusinessCash,
    tBusinessAgoda,
    tBusinessOtherOnline,
    tBusinessOnline,
    platformTotals,
    platformBookingsCount,
    tBusinessTotal,
    gst5,
    balance,
    refund,
    total,
    dayTotal,
    netCash,
    netOnline,
    totalCollections,
    occupiedRooms,
    vacantRooms,
    checkedOutRooms,
    agodaBookingsCount,
  };
}
