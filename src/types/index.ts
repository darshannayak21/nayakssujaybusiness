export interface RoomEntry {
  slNo: number;
  roomNumber: string;
  floor: 1 | 2 | 3;
  customerName: string;
  platform: string;     // 'Direct' | 'Agoda' | 'MMT' | etc. Default: 'Direct'
  isAgoda?: boolean;    // retained for backward compatibility (platform === 'Agoda')
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
  tBusinessAgoda: number; // For backward compatibility
  tBusinessOtherOnline: number; // Total online business for direct/other guests
  tBusinessOnline: number; // Total online business across all channels
  platformTotals: Record<string, number>; // Dynamic totals per online platform: { Agoda: 15000, MMT: 8000 }
  tBusinessTotal: number;
  gst5: number;
  balance: number;
  refund: number;
  total: number;
  dayTotal: number; // Advance + Cash + sum(all online platforms) + Other Online
  netCash: number;
  netOnline: number;
  totalCollections: number;
  occupiedRooms: number;
  vacantRooms: number;
  checkedOutRooms: number;
  agodaBookingsCount: number;
  platformBookingsCount: Record<string, number>;
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
  platformTotals: Record<string, number>;
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
  platformTotals: Record<string, number>;
  activePlatforms: string[]; // Dynamic list of platforms (e.g. ['Agoda', 'MMT'])
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
