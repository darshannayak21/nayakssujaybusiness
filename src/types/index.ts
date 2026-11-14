export interface RoomEntry {
  slNo: number;
  roomNumber: string;
  floor: 1 | 2 | 3;
  ac?: 'AC' | 'Non AC';          // 'AC' (default) or 'Non AC'
  customerName: string;
  platform: string;     // 'Direct' | 'Agoda' | 'MMT' | etc. Default: 'Direct'
  isAgoda?: boolean;    // retained for backward compatibility (platform === 'Agoda')
  roomRent: number | '';
  advanceCash: number | '';
  advanceOnline: number | '';
  advanceCashDate?: string;      // Date when advance cash was received (YYYY-MM-DD)
  advanceOnlineDate?: string;    // Date when advance online was received (YYYY-MM-DD)
  advanceDate?: string;          // Generic fallback advance date
  tBusinessCash: number | '';
  tBusinessOnline: number | '';
  cashUpdatedAt?: string;        // Timestamp when cash was recorded/updated
  bookingUpdatedAt?: string;     // Timestamp when booking details were created/updated
  gst5: number | '';
  gstAuto: boolean;
  balance: number | '';
  refund: number | '';
  total: number | '';
  checkOut: string;
  status: 'vacant' | 'occupied' | 'checkout';
  notes?: string;

  // Multi-day stay support
  checkInDate?: string;          // Check-in date (YYYY-MM-DD)
  checkOutDate?: string;         // Check-out date (YYYY-MM-DD)
  stayDays?: number;             // Total number of nights
  stayType?: 'checkin' | 'stayover'; // 'checkin' on primary date, 'stayover' on following days
  primaryStayDate?: string;      // Primary check-in date (YYYY-MM-DD)
  stayPaidOnCheckIn?: number;    // Total amount already paid on check-in day
  stayBalanceRemaining?: number; // Total remaining balance from check-in day

  // Extra booking entry support (e.g. room booked twice in one day)
  isExtraEntry?: boolean;
  extraEntryIndex?: number;
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

export interface MonthPerformance {
  month: number;
  monthName: string;
  yearMonth: string;
  totalRevenue: number;
  totalCash: number;
  totalAdvance: number;
  totalOnline: number;
  totalOtherOnline: number;
  platformTotals: Record<string, number>;
  occupiedRooms: number;
  recordedDays: number;
  peakDay: { date: string; revenue: number } | null;
}

export interface YearSummary {
  year: number;
  totalRevenue: number;
  totalCash: number;
  totalAdvance: number;
  totalOnline: number;
  totalOtherOnline: number;
  totalRecordedDays: number;
  bestMonth: MonthPerformance | null;
  months: MonthPerformance[];
  activePlatforms: string[];
}

export type ViewMode = 'daily' | 'monthly' | 'analytics' | 'backup';
