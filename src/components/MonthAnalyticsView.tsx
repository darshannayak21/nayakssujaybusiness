import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  BedDouble, 
  Flame, 
  CreditCard,
  Banknote,
  ArrowRight
} from 'lucide-react';
import { MonthSummary } from '../types';
import { getMonthSummary } from '../services/db';

interface MonthAnalyticsViewProps {
  initialYear?: number;
  initialMonth?: number;
  onSelectDate: (dateStr: string) => void;
}

export const MonthAnalyticsView: React.FC<MonthAnalyticsViewProps> = ({
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
  onSelectDate,
}) => {
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);

  const loadData = async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await getMonthSummary(y, m);
      setSummary(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(year, month);
  }, [year, month]);

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

  if (!summary && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-plaza-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-plaza-text-3 font-medium">Analyzing monthly performance...</p>
        </div>
      </div>
    );
  }

  // Calculate weekday averages
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

  // Top 5 Highest Sales Days
  const activeDaysWithData = summary ? [...summary.days].filter(d => d.hasData && d.dayTotal > 0) : [];
  activeDaysWithData.sort((a, b) => b.dayTotal - a.dayTotal);
  const top5Days = activeDaysWithData.slice(0, 5);

  // Maximum revenue for bar chart scaling
  const maxRevenue = Math.max(...(summary?.days.map(d => d.dayTotal) || [1]), 10000);

  const agodaPercentage = summary && summary.totalRevenue > 0 
    ? Math.round((summary.totalAgoda / summary.totalRevenue) * 100) 
    : 0;

  const cashPercentage = summary && summary.totalRevenue > 0 
    ? Math.round((summary.totalCash / summary.totalRevenue) * 100) 
    : 0;

  const otherOnlinePercentage = summary && summary.totalRevenue > 0 
    ? Math.round((summary.totalOtherOnline / summary.totalRevenue) * 100) 
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-20">
      {/* Month Selector Bar */}
      <div className="bg-white rounded-2xl border border-plaza-line/60 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-base font-bold text-plaza-text px-3 min-w-[160px] text-center">
            {summary?.monthName} {year} Analytics
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-plaza-text-3 font-medium">
          Sales & Occupancy Intelligence for Nayaks Sujay Plaza
        </div>
      </div>

      {/* Top 4 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Peak Sales Day */}
        <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
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
        <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
              Peak Room Demand
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

        {/* Agoda Channel Share */}
        <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-accent">
              Agoda Booking Share
            </span>
            <div className="w-6 h-6 rounded-lg bg-plaza-accent-tint flex items-center justify-center text-plaza-accent">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold text-plaza-accent tracking-tight">
            ₹{summary ? summary.totalAgoda.toLocaleString('en-IN') : 0}
          </div>
          <div className="text-xs text-plaza-text-3 mt-1">
            {agodaPercentage}% of total month revenue
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

      {/* Main Visual Section 1: Daily Revenue Trend Chart */}
      <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-plaza-text">
              Daily Revenue Flow ({summary?.monthName} {year})
            </h3>
            <p className="text-xs text-plaza-text-3 mt-0.5">
              Hover over any day bar to inspect its exact cash vs Agoda vs online breakdown.
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

        {/* SVG Interactive Bar Chart */}
        <div className="relative pt-4 pb-2">
          <div className="flex items-end justify-between gap-1 sm:gap-2 h-56 border-b border-plaza-line/60 pb-2">
            {summary?.days.map((day) => {
              const isPeak = summary.peakDay && summary.peakDay.date === day.date && summary.peakDay.revenue > 0;
              const heightPercent = maxRevenue > 0 ? Math.max((day.dayTotal / maxRevenue) * 100, day.dayTotal > 0 ? 6 : 2) : 2;

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
                    <div className="absolute -top-16 z-30 bg-[#18181b] text-white px-3 py-1.5 rounded-lg text-[10px] shadow-lg pointer-events-none whitespace-nowrap">
                      <div className="font-bold text-white">{day.formattedDate} ({day.dayOfWeek})</div>
                      <div className="text-amber-400">Total: ₹{day.dayTotal.toLocaleString('en-IN')}</div>
                      {day.agodaOnline > 0 && <div className="text-orange-300">Agoda: ₹{day.agodaOnline.toLocaleString('en-IN')}</div>}
                      {day.tBusinessCash > 0 && <div className="text-emerald-300">Cash: ₹{day.tBusinessCash.toLocaleString('en-IN')}</div>}
                    </div>
                  )}

                  {/* The Chart Bar */}
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
            Proportion of sales generated via Agoda vs Front Desk Cash vs Direct Online.
          </p>

          <div className="space-y-4">
            {/* Agoda */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-plaza-accent flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-plaza-accent"></span>
                  Agoda Bookings
                </span>
                <span className="text-plaza-text">
                  ₹{summary?.totalAgoda.toLocaleString('en-IN')} ({agodaPercentage}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-plaza-card overflow-hidden">
                <div style={{ width: `${agodaPercentage}%` }} className="h-full bg-plaza-accent rounded-full transition-all duration-500"></div>
              </div>
            </div>

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

      {/* Top 5 Peak Sales Days Table */}
      <div className="bg-white rounded-2xl border border-plaza-line shadow-card overflow-hidden">
        <div className="p-4 border-b border-plaza-line/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-plaza-text uppercase tracking-wider">
              Top Peak Earning Days in {summary?.monthName}
            </h3>
            <p className="text-xs text-plaza-text-3 mt-0.5">
              Quick review of the hotel's highest grossing dates this month.
            </p>
          </div>
        </div>

        {top5Days.length === 0 ? (
          <div className="p-8 text-center text-xs text-plaza-text-3">
            No daily transactions recorded for this month yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-plaza-card border-b border-plaza-line text-[10px] uppercase font-bold text-plaza-text-3">
                  <th className="p-3 text-center w-14">Rank</th>
                  <th className="p-3 text-center">Date</th>
                  <th className="p-3 text-center">Day</th>
                  <th className="p-3 text-center">Rooms Occupied</th>
                  <th className="p-3 text-right">Cash</th>
                  <th className="p-3 text-right text-plaza-accent">Online (Agoda)</th>
                  <th className="p-3 text-right font-bold text-plaza-text">Day Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plaza-line/50">
                {top5Days.map((d, index) => (
                  <tr
                    key={d.date}
                    onClick={() => onSelectDate(d.date)}
                    className="hover:bg-plaza-accent-tint/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-center font-bold">
                      <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                        index === 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-plaza-card text-plaza-text-3'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-plaza-text">
                      {d.formattedDate}
                    </td>
                    <td className="p-3 text-center text-plaza-text-3 uppercase font-semibold text-[10px]">
                      {d.dayOfWeek}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-plaza-accent-tint text-plaza-accent font-semibold text-[10px]">
                        {d.totals?.occupiedRooms || 0} / 26 Rooms
                      </span>
                    </td>
                    <td className="p-3 text-right text-plaza-text-2">
                      ₹{d.tBusinessCash.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-semibold text-plaza-accent">
                      ₹{d.agodaOnline.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-bold text-plaza-text text-sm">
                      ₹{d.dayTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-plaza-accent hover:underline">
                        Open Sheet <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
