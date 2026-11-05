import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  BedDouble, 
  Flame, 
  CreditCard,
  Banknote,
  ArrowRight,
  Calendar,
  CalendarDays,
  Award,
  Filter,
  BarChart3
} from 'lucide-react';
import { MonthSummary, YearSummary, MonthPerformance, MonthSummaryDay } from '../types';
import { getMonthSummary, getYearSummary } from '../services/db';

interface MonthAnalyticsViewProps {
  initialYear?: number;
  initialMonth?: number;
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthAnalyticsView: React.FC<MonthAnalyticsViewProps> = ({
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
  onSelectDate,
}) => {
  // Mode: 'daily' (per day analysis for selected month) vs 'monthly' (12-month overview of the year)
  const [analyticsScope, setAnalyticsScope] = useState<'daily' | 'monthly'>('daily');
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  // Data states
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [yearSummary, setYearSummary] = useState<YearSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // UI filters
  const [dailyTableFilter, setDailyTableFilter] = useState<'peak' | 'active' | 'all'>('peak');
  const [monthlySortOrder, setMonthlySortOrder] = useState<'rank' | 'calendar'>('rank');
  const [hoveredDay, setHoveredDay] = useState<MonthSummaryDay | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<MonthPerformance | null>(null);

  // Load Month Summary (for daily scope)
  const loadMonthData = async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await getMonthSummary(y, m);
      setSummary(res);
    } catch (e) {
      console.error('Failed to load month summary:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Year Summary (for monthly scope)
  const loadYearData = async (y: number) => {
    setLoading(true);
    try {
      const res = await getYearSummary(y);
      setYearSummary(res);
    } catch (e) {
      console.error('Failed to load year summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analyticsScope === 'daily') {
      loadMonthData(year, month);
    } else {
      loadYearData(year);
    }
  }, [analyticsScope, year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handlePrevYear = () => {
    setYear(year - 1);
  };

  const handleNextYear = () => {
    setYear(year + 1);
  };

  const switchToMonthDaily = (targetMonth: number) => {
    setMonth(targetMonth);
    setAnalyticsScope('daily');
  };

  // Weekday totals for daily analysis
  const weekdayTotals: { [key: string]: { revenue: number; count: number; occupancy: number } } = {
    Sunday: { revenue: 0, count: 0, occupancy: 0 },
    Monday: { revenue: 0, count: 0, occupancy: 0 },
    Tuesday: { revenue: 0, count: 0, occupancy: 0 },
    Wednesday: { revenue: 0, count: 0, occupancy: 0 },
    Thursday: { revenue: 0, count: 0, occupancy: 0 },
    Friday: { revenue: 0, count: 0, occupancy: 0 },
    Saturday: { revenue: 0, count: 0, occupancy: 0 },
  };

  const dayOfWeekNames: { [key: string]: string } = {
    Sun: 'Sunday',
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
  };

  summary?.days.forEach((d) => {
    const fullDay = dayOfWeekNames[d.dayOfWeek] || d.dayOfWeek;
    if (weekdayTotals[fullDay]) {
      weekdayTotals[fullDay].count++;
      if (d.hasData) {
        weekdayTotals[fullDay].revenue += d.dayTotal;
        weekdayTotals[fullDay].occupancy += d.totals?.occupiedRooms || 0;
      }
    }
  });

  // Calculate days for the daily table based on filter
  const allDaysList = summary ? summary.days : [];
  let displayedDays: MonthSummaryDay[] = [];
  if (dailyTableFilter === 'peak') {
    displayedDays = [...allDaysList].filter(d => d.hasData && d.dayTotal > 0);
    displayedDays.sort((a, b) => b.dayTotal - a.dayTotal);
    displayedDays = displayedDays.slice(0, 7); // Top 7 Peak Days
  } else if (dailyTableFilter === 'active') {
    displayedDays = [...allDaysList].filter(d => d.hasData && (d.dayTotal > 0 || (d.totals && d.totals.occupiedRooms > 0)));
  } else {
    displayedDays = allDaysList;
  }

  // Active online platforms across the month/year
  const activePlatforms = analyticsScope === 'daily' 
    ? (summary?.activePlatforms || ['Agoda'])
    : (yearSummary?.activePlatforms || ['Agoda']);

  // Maximum revenues for chart heights
  const maxDayRevenue = Math.max(...(summary?.days.map(d => d.dayTotal) || [1]), 10000);
  const maxMonthRevenue = Math.max(...(yearSummary?.months.map(m => m.totalRevenue) || [1]), 25000);

  // Daily percentages
  const totalPlatformsRevenue = summary 
    ? Object.values(summary.platformTotals || {}).reduce((a, b) => a + b, 0) || summary.totalAgoda 
    : 0;

  const platformsPercentage = summary && summary.totalRevenue > 0 
    ? Math.round((totalPlatformsRevenue / summary.totalRevenue) * 100) 
    : 0;

  const cashPercentage = summary && summary.totalRevenue > 0 
    ? Math.round((summary.totalCash / summary.totalRevenue) * 100) 
    : 0;

  const otherOnlinePercentage = summary && summary.totalRevenue > 0 
    ? Math.round((summary.totalOtherOnline / summary.totalRevenue) * 100) 
    : 0;

  // Monthly table sorted
  const sortedMonths = yearSummary ? [...yearSummary.months] : [];
  if (monthlySortOrder === 'rank') {
    sortedMonths.sort((a, b) => b.totalRevenue - a.totalRevenue);
  } else {
    sortedMonths.sort((a, b) => a.month - b.month);
  }

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-20">
      {/* Top Scope & Time Selector Navigation Bar */}
      <div className="bg-white rounded-2xl border border-plaza-line/70 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: View Mode Toggle (Daily vs Monthly) */}
        <div className="flex items-center gap-1.5 bg-plaza-card p-1 rounded-xl border border-plaza-line/60">
          <button
            onClick={() => setAnalyticsScope('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              analyticsScope === 'daily'
                ? 'bg-white text-plaza-text shadow-xs'
                : 'text-plaza-text-3 hover:text-plaza-text'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${analyticsScope === 'daily' ? 'text-plaza-accent' : ''}`} />
            <span>Daily View (Per Day)</span>
          </button>

          <button
            onClick={() => setAnalyticsScope('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              analyticsScope === 'monthly'
                ? 'bg-white text-plaza-text shadow-xs'
                : 'text-plaza-text-3 hover:text-plaza-text'
            }`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${analyticsScope === 'monthly' ? 'text-plaza-accent' : ''}`} />
            <span>Monthly View (Best Months)</span>
          </button>
        </div>

        {/* Right: Time Selectors & Fast Month Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {analyticsScope === 'daily' ? (
            <>
              {/* Prev Month */}
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Dropdown Filter */}
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-plaza-line bg-white text-xs font-bold text-plaza-text focus:outline-none focus:border-plaza-accent cursor-pointer shadow-2xs"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown Filter */}
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-plaza-line bg-white text-xs font-bold text-plaza-text focus:outline-none focus:border-plaza-accent cursor-pointer shadow-2xs"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Next Month */}
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Prev Year */}
              <button
                onClick={handlePrevYear}
                className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
                title="Previous Year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Year Dropdown Filter */}
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-3.5 py-1.5 rounded-xl border border-plaza-line bg-white text-xs font-bold text-plaza-text focus:outline-none focus:border-plaza-accent cursor-pointer shadow-2xs"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Year {y} Overview
                  </option>
                ))}
              </select>

              {/* Next Year */}
              <button
                onClick={handleNextYear}
                className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
                title="Next Year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-plaza-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-plaza-text-3 font-semibold">Loading hotel analytics data...</p>
          </div>
        </div>
      ) : analyticsScope === 'daily' ? (
        /* ========================================================================= */
        /* ======================== DAILY VIEW (PER DAY) =========================== */
        /* ========================================================================= */
        <>
          {/* Top 4 Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            {/* Peak Sales Day */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                  Peak Sales Day
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <Flame className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
                {summary?.peakDay ? `₹${summary.peakDay.revenue.toLocaleString('en-IN')}` : '—'}
              </div>
              <div className="text-xs text-plaza-accent font-semibold mt-1">
                {summary?.peakDay ? `Date: ${summary.peakDay.date}` : 'No records yet'}
              </div>
            </div>

            {/* Peak Occupancy Day */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                  Peak Room Occupancy
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <BedDouble className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
                {summary?.peakOccupancyDay ? `${summary.peakOccupancyDay.occupiedRooms} / 26 Rooms` : '—'}
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {summary?.peakOccupancyDay ? `Date: ${summary.peakOccupancyDay.date}` : 'No records yet'}
              </div>
            </div>

            {/* OTA Platform Channel Share */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-accent">
                  OTA Platform Share
                </span>
                <div className="w-6 h-6 rounded-lg bg-plaza-accent-tint flex items-center justify-center text-plaza-accent">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-plaza-accent tracking-tight">
                ₹{totalPlatformsRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-plaza-text-3 mt-1">
                {platformsPercentage}% of total month revenue
              </div>
            </div>

            {/* Average Daily Revenue */}
            <div className="bg-plaza-accent text-white rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-white/90">
                  Daily Average Revenue
                </span>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold tracking-tight">
                ₹{summary ? summary.averageDailyRevenue.toLocaleString('en-IN') : 0}
              </div>
              <div className="text-xs text-white/80 mt-1">
                Avg Occupancy: {summary?.averageOccupancyRate}%
              </div>
            </div>
          </div>

          {/* Daily Revenue Trend Bar Chart */}
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-4 sm:p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-plaza-text flex items-center gap-2">
                  <span>Daily Revenue Flow — {summary?.monthName} {year}</span>
                </h3>
                <p className="text-xs text-plaza-text-3 mt-0.5">
                  Hover over any bar to inspect cash, Agoda, and online breakdown. Click any bar to open that day's sheet.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-plaza-accent"></span>
                  <span className="text-plaza-text-2">Peak Day</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-plaza-text"></span>
                  <span className="text-plaza-text-2">Daily Revenue</span>
                </div>
              </div>
            </div>

            {/* Interactive Daily SVG Bar Chart */}
            <div className="relative pt-4 pb-2 overflow-x-auto">
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-56 min-w-[650px] border-b border-plaza-line/60 pb-2">
                {summary?.days.map((day) => {
                  const isPeak = summary.peakDay && summary.peakDay.date === day.date && summary.peakDay.revenue > 0;
                  const heightPercent = maxDayRevenue > 0 ? Math.max((day.dayTotal / maxDayRevenue) * 100, day.dayTotal > 0 ? 6 : 2) : 2;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => onSelectDate(day.date)}
                    >
                      {/* Tooltip on hover */}
                      {hoveredDay && hoveredDay.date === day.date && (
                        <div className="absolute -top-24 z-30 bg-[#18181b] text-white px-3 py-2 rounded-xl text-[10px] shadow-xl pointer-events-none whitespace-nowrap min-w-[130px]">
                          <div className="font-bold text-white border-b border-white/10 pb-1 mb-1">
                            {day.formattedDate} ({day.dayOfWeek})
                          </div>
                          <div className="text-amber-400 font-bold">Total: ₹{day.dayTotal.toLocaleString('en-IN')}</div>
                          {day.advanceTotal > 0 && <div className="text-sky-300">Advance: ₹{day.advanceTotal.toLocaleString('en-IN')}</div>}
                          {day.tBusinessCash > 0 && <div className="text-emerald-300">Cash: ₹{day.tBusinessCash.toLocaleString('en-IN')}</div>}
                          {Object.entries(day.platformTotals || {}).filter(([_, v]) => (v as number) > 0).map(([k, v]) => (
                            <div key={k} className="text-orange-300">{k}: ₹{(v as number).toLocaleString('en-IN')}</div>
                          ))}
                          {day.otherOnline > 0 && <div className="text-cyan-300">Online Other: ₹{day.otherOnline.toLocaleString('en-IN')}</div>}
                          <div className="text-[9px] text-white/60 mt-1">Rooms: {day.totals?.occupiedRooms || 0} Occ</div>
                        </div>
                      )}

                      {/* Bar Visual */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[24px] rounded-t-md transition-all duration-200 ${
                          isPeak
                            ? 'bg-plaza-accent shadow-xs'
                            : day.dayTotal > 0
                            ? 'bg-plaza-text hover:bg-plaza-accent'
                            : 'bg-plaza-line/40'
                        }`}
                      ></div>

                      {/* Day Number Label */}
                      <span className="text-[9px] font-mono font-medium text-plaza-text-3 mt-2 group-hover:text-plaza-accent transition-colors">
                        {day.dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid: Revenue Breakdown by Channel & Weekday Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Left: Revenue Channel Breakdown */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-plaza-line shadow-card p-6">
              <h3 className="text-base font-bold text-plaza-text mb-1">
                Revenue Source Breakdown
              </h3>
              <p className="text-xs text-plaza-text-3 mb-6">
                Proportion of sales generated via OTAs vs Front Desk Cash vs Direct Online.
              </p>

              <div className="space-y-4">
                {/* OTA Platforms */}
                {activePlatforms.map(plat => {
                  const pAmt = summary?.platformTotals?.[plat] || (plat.toLowerCase() === 'agoda' ? summary?.totalAgoda || 0 : 0);
                  const pPct = summary && summary.totalRevenue > 0 ? Math.round((pAmt / summary.totalRevenue) * 100) : 0;
                  return (
                    <div key={plat}>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-plaza-accent flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-plaza-accent"></span>
                          {plat} Bookings
                        </span>
                        <span className="text-plaza-text">
                          ₹{pAmt.toLocaleString('en-IN')} ({pPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-plaza-card overflow-hidden">
                        <div style={{ width: `${pPct}%` }} className="h-full bg-plaza-accent rounded-full transition-all duration-500"></div>
                      </div>
                    </div>
                  );
                })}

                {/* Desk Cash */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-plaza-text flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-plaza-text"></span>
                      Cash Collections
                    </span>
                    <span className="text-plaza-text">
                      ₹{summary?.totalCash.toLocaleString('en-IN')} ({cashPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-plaza-card overflow-hidden">
                    <div style={{ width: `${cashPercentage}%` }} className="h-full bg-plaza-text rounded-full transition-all duration-500"></div>
                  </div>
                </div>

                {/* Other Online */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-plaza-text-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Direct Online (UPI / POS)
                    </span>
                    <span className="text-plaza-text">
                      ₹{summary?.totalOtherOnline.toLocaleString('en-IN')} ({otherOnlinePercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-plaza-card overflow-hidden">
                    <div style={{ width: `${otherOnlinePercentage}%` }} className="h-full bg-emerald-600 rounded-full transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Weekday vs Weekend Demand */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-plaza-line shadow-card p-6">
              <h3 className="text-base font-bold text-plaza-text mb-1">
                Busiest Days of the Week
              </h3>
              <p className="text-xs text-plaza-text-3 mb-4">
                Total sales accumulated across each day of the week in {summary?.monthName}.
              </p>

              <div className="space-y-2.5">
                {Object.entries(weekdayTotals).map(([dayName, data]) => {
                  const maxDayRev = Math.max(...Object.values(weekdayTotals).map(v => v.revenue), 1);
                  const barPercent = maxDayRev > 0 ? (data.revenue / maxDayRev) * 100 : 0;
                  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

                  return (
                    <div key={dayName} className="flex items-center gap-3 text-xs">
                      <span className={`w-24 font-medium ${isWeekend ? 'text-plaza-accent font-semibold' : 'text-plaza-text-2'}`}>
                        {dayName}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-plaza-card overflow-hidden">
                        <div
                          style={{ width: `${barPercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${isWeekend ? 'bg-plaza-accent' : 'bg-plaza-text'}`}
                        ></div>
                      </div>
                      <span className="w-20 text-right font-semibold text-plaza-text font-mono text-[11px]">
                        ₹{data.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COMPREHENSIVE DAILY SALES BREAKDOWN TABLE (ALL COLUMNS AS IN MONTH SHEET) */}
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card overflow-hidden">
            <div className="p-4 border-b border-plaza-line/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-plaza-text uppercase tracking-wider">
                  Daily Performance & Revenue Breakdown ({summary?.monthName} {year})
                </h3>
                <p className="text-xs text-plaza-text-3 mt-0.5">
                  Complete ledger breakdown including Advance, Cash, Online Platforms, and Day Totals.
                </p>
              </div>

              {/* Table Sub-Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-plaza-card p-1 rounded-xl border border-plaza-line/60 text-xs">
                <button
                  onClick={() => setDailyTableFilter('peak')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    dailyTableFilter === 'peak'
                      ? 'bg-white text-plaza-accent shadow-xs'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  🔥 Top Peak Days
                </button>
                <button
                  onClick={() => setDailyTableFilter('active')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    dailyTableFilter === 'active'
                      ? 'bg-white text-plaza-accent shadow-xs'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  📋 Active Days Only
                </button>
                <button
                  onClick={() => setDailyTableFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    dailyTableFilter === 'all'
                      ? 'bg-white text-plaza-accent shadow-xs'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  📅 Full Month ({summary?.totalDays} Days)
                </button>
              </div>
            </div>

            {displayedDays.length === 0 ? (
              <div className="p-8 text-center text-xs text-plaza-text-3">
                No daily records found matching this filter for {summary?.monthName} {year}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-plaza-card border-b border-plaza-line text-[10px] uppercase font-bold text-plaza-text-3">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3 text-center w-24">Date</th>
                      <th className="p-3 text-center w-16">Day</th>
                      <th className="p-3 text-center">Rooms Occ</th>
                      <th className="p-3 text-right">Advance</th>
                      <th className="p-3 text-right">Cash</th>
                      {activePlatforms.map(plat => (
                        <th key={plat} className="p-3 text-right text-plaza-accent whitespace-nowrap">
                          Online ({plat})
                        </th>
                      ))}
                      <th className="p-3 text-right whitespace-nowrap">Online (Others)</th>
                      <th className="p-3 text-right font-bold text-plaza-text whitespace-nowrap">Day Total</th>
                      <th className="p-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-plaza-line/50">
                    {displayedDays.map((d, index) => {
                      const occ = d.totals?.occupiedRooms || 0;
                      return (
                        <tr
                          key={d.date}
                          onClick={() => onSelectDate(d.date)}
                          className="hover:bg-plaza-accent-tint/30 cursor-pointer transition-colors"
                        >
                          <td className="p-3 text-center font-bold">
                            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                              dailyTableFilter === 'peak' && index === 0
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-plaza-card text-plaza-text-3'
                            }`}>
                              {dailyTableFilter === 'peak' ? `#${index + 1}` : d.dayNumber}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-semibold text-plaza-text">
                            {d.formattedDate}
                          </td>
                          <td className="p-3 text-center text-plaza-text-3 uppercase font-semibold text-[10px]">
                            {d.dayOfWeek}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              occ > 0 ? 'bg-plaza-accent-tint text-plaza-accent' : 'bg-plaza-card text-plaza-text-4'
                            }`}>
                              {occ} / 26
                            </span>
                          </td>
                          <td className="p-3 text-right text-plaza-text-2">
                            {d.advanceTotal > 0 ? `₹${d.advanceTotal.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="p-3 text-right text-plaza-text-2">
                            {d.tBusinessCash > 0 ? `₹${d.tBusinessCash.toLocaleString('en-IN')}` : '—'}
                          </td>
                          {activePlatforms.map(plat => {
                            const pAmt = d.platformTotals?.[plat] || (plat.toLowerCase() === 'agoda' ? d.agodaOnline : 0) || 0;
                            return (
                              <td key={plat} className="p-3 text-right font-medium text-plaza-accent">
                                {pAmt > 0 ? `₹${pAmt.toLocaleString('en-IN')}` : '—'}
                              </td>
                            );
                          })}
                          <td className="p-3 text-right text-plaza-text-2">
                            {d.otherOnline > 0 ? `₹${d.otherOnline.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="p-3 text-right font-bold text-plaza-text text-sm">
                            ₹{d.dayTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-plaza-accent hover:underline">
                              Open <ArrowRight className="w-3 h-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* ================== MONTHLY VIEW (YEAR / BEST MONTHS) ==================== */
        /* ========================================================================= */
        <>
          {/* Top 4 Year Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            {/* 🏆 Best Selling Month */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-accent flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Best Selling Month
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <Flame className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-black text-plaza-text tracking-tight">
                {yearSummary?.bestMonth ? yearSummary.bestMonth.monthName : '—'}
              </div>
              <div className="text-xs text-plaza-accent font-bold mt-1">
                {yearSummary?.bestMonth ? `₹${yearSummary.bestMonth.totalRevenue.toLocaleString('en-IN')}` : 'No revenue recorded yet'}
              </div>
            </div>

            {/* Total Annual Revenue */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                  Total Annual Revenue ({year})
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
                ₹{yearSummary ? yearSummary.totalRevenue.toLocaleString('en-IN') : 0}
              </div>
              <div className="text-xs text-plaza-text-3 mt-1">
                Gross hotel business across all 12 months
              </div>
            </div>

            {/* Cash vs Online Split */}
            <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                  Cash vs Online Collections
                </span>
                <div className="w-6 h-6 rounded-lg bg-plaza-accent-tint flex items-center justify-center text-plaza-accent">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-sm font-bold text-plaza-text flex items-center justify-between mt-1">
                <span className="text-plaza-text">Cash: ₹{yearSummary ? (yearSummary.totalCash + yearSummary.totalAdvance).toLocaleString('en-IN') : 0}</span>
                <span className="text-plaza-accent">Online: ₹{yearSummary ? yearSummary.totalOnline.toLocaleString('en-IN') : 0}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-plaza-card overflow-hidden mt-2.5 flex">
                <div 
                  style={{ 
                    width: `${yearSummary && yearSummary.totalRevenue > 0 ? Math.round(((yearSummary.totalCash + yearSummary.totalAdvance) / yearSummary.totalRevenue) * 100) : 50}%` 
                  }} 
                  className="bg-plaza-text h-full"
                ></div>
                <div 
                  style={{ 
                    width: `${yearSummary && yearSummary.totalRevenue > 0 ? Math.round((yearSummary.totalOnline / yearSummary.totalRevenue) * 100) : 50}%` 
                  }} 
                  className="bg-plaza-accent h-full"
                ></div>
              </div>
            </div>

            {/* Active Trading Days */}
            <div className="bg-plaza-accent text-white rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-white/90">
                  Active Trading Days
                </span>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl lg:text-2xl font-bold tracking-tight">
                {yearSummary ? yearSummary.totalRecordedDays : 0} Days
              </div>
              <div className="text-xs text-white/80 mt-1">
                With revenue recorded in {year}
              </div>
            </div>
          </div>

          {/* 12-Month Annual Revenue Comparison Bar Chart */}
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-4 sm:p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-plaza-text flex items-center gap-2">
                  <span>Monthly Sales Performance — Year {year}</span>
                </h3>
                <p className="text-xs text-plaza-text-3 mt-0.5">
                  Comparison of all 12 months. Click any month bar to dive into its detailed daily report.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-plaza-accent"></span>
                  <span className="text-plaza-text-2">Best Selling Month</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-plaza-text"></span>
                  <span className="text-plaza-text-2">Monthly Revenue</span>
                </div>
              </div>
            </div>

            {/* Interactive 12-Month Bar Chart */}
            <div className="relative pt-4 pb-2 overflow-x-auto">
              <div className="flex items-end justify-between gap-2 sm:gap-4 h-60 min-w-[650px] border-b border-plaza-line/60 pb-2">
                {yearSummary?.months.map((m) => {
                  const isBest = yearSummary.bestMonth && yearSummary.bestMonth.month === m.month && m.totalRevenue > 0;
                  const heightPercent = maxMonthRevenue > 0 ? Math.max((m.totalRevenue / maxMonthRevenue) * 100, m.totalRevenue > 0 ? 8 : 3) : 3;

                  return (
                    <div
                      key={m.month}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      onMouseEnter={() => setHoveredMonth(m)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      onClick={() => switchToMonthDaily(m.month)}
                    >
                      {/* Tooltip on hover */}
                      {hoveredMonth && hoveredMonth.month === m.month && (
                        <div className="absolute -top-24 z-30 bg-[#18181b] text-white px-3 py-2 rounded-xl text-[10px] shadow-xl pointer-events-none whitespace-nowrap min-w-[130px]">
                          <div className="font-bold text-white border-b border-white/10 pb-1 mb-1 flex items-center justify-between gap-2">
                            <span>{m.monthName} {year}</span>
                            {isBest && <span className="text-amber-400 font-bold">★ Best Month</span>}
                          </div>
                          <div className="text-amber-400 font-bold">Revenue: ₹{m.totalRevenue.toLocaleString('en-IN')}</div>
                          <div className="text-emerald-300">Cash: ₹{m.totalCash.toLocaleString('en-IN')}</div>
                          <div className="text-orange-300">Online: ₹{m.totalOnline.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-white/60 mt-1">Days active: {m.recordedDays}</div>
                        </div>
                      )}

                      {/* Best Selling Badge over Bar */}
                      {isBest && (
                        <span className="mb-1 text-[9px] font-black uppercase text-plaza-accent tracking-tighter bg-plaza-accent-tint px-1.5 py-0.5 rounded-md border border-plaza-accent-line">
                          Peak
                        </span>
                      )}

                      {/* Bar Visual */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[42px] rounded-t-lg transition-all duration-200 ${
                          isBest
                            ? 'bg-plaza-accent shadow-xs'
                            : m.totalRevenue > 0
                            ? 'bg-plaza-text hover:bg-plaza-accent'
                            : 'bg-plaza-line/40'
                        }`}
                      ></div>

                      {/* Month Short Label */}
                      <span className={`text-[10px] font-bold mt-2 transition-colors ${
                        isBest ? 'text-plaza-accent font-extrabold' : 'text-plaza-text-3 group-hover:text-plaza-accent'
                      }`}>
                        {m.monthName.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BEST SELLING MONTHS RANKING TABLE (FULL YEAR PERFORMANCE) */}
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card overflow-hidden">
            <div className="p-4 border-b border-plaza-line/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-plaza-text uppercase tracking-wider">
                  Best Selling Months of {year}
                </h3>
                <p className="text-xs text-plaza-text-3 mt-0.5">
                  Ranked by revenue performance with full breakdown of Cash, Online platforms, and Peak day.
                </p>
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center gap-1.5 bg-plaza-card p-1 rounded-xl border border-plaza-line/60 text-xs">
                <button
                  onClick={() => setMonthlySortOrder('rank')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    monthlySortOrder === 'rank'
                      ? 'bg-white text-plaza-accent shadow-xs'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  🏆 Best Selling Rank
                </button>
                <button
                  onClick={() => setMonthlySortOrder('calendar')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    monthlySortOrder === 'calendar'
                      ? 'bg-white text-plaza-accent shadow-xs'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  📅 Calendar Order (Jan - Dec)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-plaza-card border-b border-plaza-line text-[10px] uppercase font-bold text-plaza-text-3">
                    <th className="p-3 text-center w-14">Rank</th>
                    <th className="p-3 text-left w-32">Month</th>
                    <th className="p-3 text-center">Active Days</th>
                    <th className="p-3 text-right">Advance</th>
                    <th className="p-3 text-right">Cash</th>
                    {activePlatforms.map(plat => (
                      <th key={plat} className="p-3 text-right text-plaza-accent whitespace-nowrap">
                        Online ({plat})
                      </th>
                    ))}
                    <th className="p-3 text-right whitespace-nowrap">Online (Others)</th>
                    <th className="p-3 text-right font-bold text-plaza-text whitespace-nowrap">Month Total</th>
                    <th className="p-3 text-left w-36">Peak Earning Day</th>
                    <th className="p-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-plaza-line/50">
                  {sortedMonths.map((m, index) => {
                    const isTop1 = monthlySortOrder === 'rank' && index === 0 && m.totalRevenue > 0;
                    return (
                      <tr
                        key={m.month}
                        onClick={() => switchToMonthDaily(m.month)}
                        className={`hover:bg-plaza-accent-tint/30 cursor-pointer transition-colors ${
                          isTop1 ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-bold">
                          <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                            isTop1
                              ? 'bg-amber-100 text-amber-800 font-black'
                              : m.totalRevenue > 0
                              ? 'bg-plaza-card text-plaza-text font-bold'
                              : 'bg-plaza-card text-plaza-text-4'
                          }`}>
                            {monthlySortOrder === 'rank' ? `#${index + 1}` : m.month}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-plaza-text">
                          <span className="flex items-center gap-1.5">
                            {m.monthName} {year}
                            {isTop1 && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                Best
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-center font-medium text-plaza-text-2">
                          {m.recordedDays} Days
                        </td>
                        <td className="p-3 text-right text-plaza-text-2">
                          {m.totalAdvance > 0 ? `₹${m.totalAdvance.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3 text-right text-plaza-text-2">
                          {m.totalCash > 0 ? `₹${m.totalCash.toLocaleString('en-IN')}` : '—'}
                        </td>
                        {activePlatforms.map(plat => {
                          const pAmt = m.platformTotals?.[plat] || 0;
                          return (
                            <td key={plat} className="p-3 text-right font-medium text-plaza-accent">
                              {pAmt > 0 ? `₹${pAmt.toLocaleString('en-IN')}` : '—'}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right text-plaza-text-2">
                          {m.totalOtherOnline > 0 ? `₹${m.totalOtherOnline.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-plaza-text text-sm">
                          ₹{m.totalRevenue.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-left font-mono text-[11px] text-plaza-accent">
                          {m.peakDay ? `${m.peakDay.date} (₹${m.peakDay.revenue.toLocaleString('en-IN')})` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-plaza-accent hover:underline">
                            View Daily <ArrowRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};