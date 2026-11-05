import { RoomEntry, DaySheetTotals } from '../types';

export interface RoomDefinition {
  slNo: number;
  roomNumber: string;
  floor: 1 | 2 | 3;
  type?: string;
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
    isAgoda: false,
    roomRent: '',
    advanceCash: '',
    advanceOnline: '',
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
  };
}

export function createInitialRooms(): RoomEntry[] {
  return ROOM_DEFINITIONS.map(createEmptyRoomEntry);
}

export function calculateRoomTotal(room: RoomEntry): number | '' {
  const cash = typeof room.tBusinessCash === 'number' ? room.tBusinessCash : 0;
  const online = typeof room.tBusinessOnline === 'number' ? room.tBusinessOnline : 0;
  
  if (room.tBusinessCash !== '' || room.tBusinessOnline !== '') {
    return cash + online;
  }

  if (typeof room.roomRent === 'number' && room.roomRent > 0) {
    const gst = typeof room.gst5 === 'number' ? room.gst5 : 0;
    return room.roomRent + gst;
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
  let occupiedRooms = 0;
  let checkedOutRooms = 0;
  let agodaBookingsCount = 0;

  rooms.forEach(r => {
    if (typeof r.roomRent === 'number') roomRent += r.roomRent;

    // Check if Agoda booking (customer name entered or isAgoda flag is true)
    const isAgodaBooking = r.isAgoda || (r.customerName && r.customerName.trim().length > 0);
    
    if (isAgodaBooking) {
      agodaBookingsCount++;
      // In Agoda there is no advance concept: all revenue is OTA online
      if (typeof r.tBusinessOnline === 'number') {
        tBusinessAgoda += r.tBusinessOnline;
      } else if (typeof r.roomRent === 'number' && r.roomRent > 0) {
        tBusinessAgoda += r.roomRent;
      }
    } else {
      // Direct / walk-in guests: advances and desk cash apply
      if (typeof r.advanceCash === 'number') advanceCash += r.advanceCash;
      if (typeof r.advanceOnline === 'number') advanceOnline += r.advanceOnline;
      if (typeof r.tBusinessCash === 'number') tBusinessCash += r.tBusinessCash;
      if (typeof r.tBusinessOnline === 'number') tBusinessOtherOnline += r.tBusinessOnline;
    }

    if (typeof r.gst5 === 'number') gst5 += r.gst5;
    if (typeof r.balance === 'number') balance += r.balance;
    if (typeof r.refund === 'number') refund += r.refund;
    if (typeof r.total === 'number') total += r.total;

    // determine occupancy status
    const hasActivity = (r.roomRent !== '' && r.roomRent > 0) || 
                        r.advanceCash !== '' || 
                        r.advanceOnline !== '' || 
                        r.tBusinessCash !== '' || 
                        r.tBusinessOnline !== '' ||
                        (r.customerName && r.customerName.trim().length > 0);

    if (r.checkOut && r.checkOut.trim().length > 0 && r.checkOut.toLowerCase() !== 'no') {
      checkedOutRooms++;
    } else if (hasActivity || r.status === 'occupied') {
      occupiedRooms++;
    }
  });

  const advanceTotal = advanceCash + advanceOnline;
  const tBusinessOnline = tBusinessAgoda + tBusinessOtherOnline;
  const tBusinessTotal = tBusinessCash + tBusinessOnline;
  const netCash = (advanceCash + tBusinessCash) - refund;
  const netOnline = advanceOnline + tBusinessOnline;
  const totalCollections = netCash + netOnline;
  
  // Day total matching notebook: Advance + Cash + Agoda Online + Other Online
  const dayTotal = advanceTotal + tBusinessCash + tBusinessAgoda + tBusinessOtherOnline;

  const vacantRooms = ROOM_DEFINITIONS.length - occupiedRooms - checkedOutRooms;

  return {
    roomRent,
    advanceCash,
    advanceOnline,
    advanceTotal,
    tBusinessCash,
    tBusinessAgoda,
    tBusinessOtherOnline,
    tBusinessOnline,
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
    vacantRooms: Math.max(0, vacantRooms),
    checkedOutRooms,
    agodaBookingsCount,
  };
}
