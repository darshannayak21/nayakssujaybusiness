export interface RoomEntry {
  slNo: number;
  roomNumber: string;
  floor: 1 | 2 | 3;
  customerName: string; // If entered, considered as Agoda booking
  isAgoda: boolean;     // Automatically true when customerName is present
  roomRent: number | '';
  advanceCash: number | '';
  advanceOnline: number | '';
  tBusinessCash: number | '';
  tBusinessOnline: number | '';
  gst5: number | '';
  gstAuto: boolean;
  balance: number | '';
  refund: number | '';
  total: number | '';
  checkOut: string;
  status: 'vacant' | 'occupied' | 'checkout';
  notes?: string;
}

export interface DaySheetTotals {
  roomRent: number;
  advanceCash: number;
  advanceOnline: number;
  advanceTotal: number; // Combined advance (cash + online)
  tBusinessCash: number;
  tBusinessAgoda: number; // Total online business for Agoda bookings (with customer name)
  tBusinessOtherOnline: number; // Total online business for direct/other guests
  tBusinessOnline: number; // Total online business (Agoda + Others)
  tBusinessTotal: number;
  gst5: number;
  balance: number;
  refund: number;
  total: number; // Standard table total
  dayTotal: number; // Combined day total: advanceTotal + tBusinessCash + tBusinessAgoda + tBusinessOtherOnline
  netCash: number;
  netOnline: number;
  totalCollections: number;
  occupiedRooms: number;
  vacantRooms: number;
  checkedOutRooms: number;
  agodaBookingsCount: number;
}

export interface DaySheet {
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: string;
  rooms: RoomEntry[];
  totals: DaySheetTotals;
  notes?: string;
  receptionistName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummaryDay {
  date: string;
  dayNumber: number;
  dayOfWeek: string;
  formattedDate: string; // DD/MM/YY
  hasData: boolean;
  totals?: DaySheetTotals;
  advanceTotal: number;
  tBusinessCash: number;
  agodaOnline: number;
  otherOnline: number;
  dayTotal: number;
}

export interface MonthSummary {
  yearMonth: string; // 'YYYY-MM'
  year: number;
  month: number;
  monthName: string;
  totalDays: number;
  recordedDays: number;
  totalRevenue: number;
  totalAdvance: number;
  totalCash: number;
  totalAgoda: number;
  totalOtherOnline: number;
  totalOnline: number;
  totalGst: number;
  totalRefund: number;
  totalBalance: number;
  averageDailyRevenue: number;
  peakDay: { date: string; revenue: number } | null;
  peakOccupancyDay: { date: string; occupiedRooms: number } | null;
  averageOccupancyRate: number;
  days: MonthSummaryDay[];
}

export type ViewMode = 'daily' | 'monthly' | 'analytics' | 'backup';
