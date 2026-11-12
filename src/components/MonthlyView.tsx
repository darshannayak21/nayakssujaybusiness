import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Table as TableIcon, 
  LayoutGrid, 
  FileDown
} from 'lucide-react';
import { MonthSummary } from '../types';
import { getMonthSummary, getDaySheet } from '../services/db';
import { generateMonthlyPDF, generateDailyPDF } from '../services/pdfGenerator';
import { getBookingPlatforms, isStealthMode } from '../services/platforms';

interface MonthlyViewProps {
  initialYear?: number;
  initialMonth?: number;
  onSelectDay: (dateStr: string) => void;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
  onSelectDay,
}) => {
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'table' | 'grid'>('table');

  const loadData = async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await getMonthSummary(y, m);
      setSummary(res);
    } catch (err) {
      console.error('Failed to load month summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(year, month);
    const handler = () => loadData(year, month);
    window.addEventListener('plaza_platforms_updated', handler);
    return () => window.removeEventListener('plaza_platforms_updated', handler);
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

  const handleDownloadDayPDF = async (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sheet = await getDaySheet(dateStr);
    generateDailyPDF(sheet);
  };

  if (!summary && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-plaza-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-plaza-text-3 font-medium">Loading monthly ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-20">
      {/* Top Header & Navigation */}
      <div className="bg-white rounded-2xl border border-plaza-line/60 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-base font-bold text-plaza-text px-3 min-w-[150px] text-center">
            {summary?.monthName} {year}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-plaza-line hover:bg-plaza-card transition text-plaza-text"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher (Audit Table vs Calendar Grid) & Download Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-plaza-card p-1 rounded-xl border border-plaza-line/50">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'table'
                  ? 'bg-white text-plaza-text shadow-xs font-semibold'
                  : 'text-plaza-text-3 hover:text-plaza-text'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Monthly Table
            </button>
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'grid'
                  ? 'bg-white text-plaza-text shadow-xs font-semibold'
                  : 'text-plaza-text-3 hover:text-plaza-text'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Calendar Grid
            </button>
          </div>

          <button
            onClick={() => summary && generateMonthlyPDF(summary)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            Download Month PDF
          </button>
        </div>
      </div>

      {(() => {
        const configured = getBookingPlatforms();
        const stealth = isStealthMode(configured);
        const rawPlatforms = summary?.activePlatforms && summary.activePlatforms.length > 0 
          ? summary.activePlatforms 
          : configured;
        const filteredPlatforms = rawPlatforms.filter(p => {
          if (p.trim().toLowerCase() === 'bookings') return false;
          if (configured.some(cp => cp.toLowerCase() === p.toLowerCase())) return true;
          const tot = summary?.platformTotals?.[p] || (p.toLowerCase() === 'agoda' ? summary?.totalAgoda || 0 : 0) || 0;
          return tot > 0;
        });
        const displayPlatforms = filteredPlatforms.length > 0 
          ? filteredPlatforms 
          : (configured.filter(p => p.trim().toLowerCase() !== 'bookings').length > 0 ? configured.filter(p => p.trim().toLowerCase() !== 'bookings') : ['Agoda']);

        return (
          <>
            {/* Monthly Summary Cards Matching Notebook Columns */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
                <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                    Total Month Revenue
                  </span>
                  <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight mt-1.5">
                    ₹{summary.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-plaza-text-3 mt-1">
                    Combined day totals
                  </div>
                </div>

                <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                    Total Cash Collected
                  </span>
                  <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight mt-1.5">
                    ₹{stealth ? '0' : summary.totalCash.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-plaza-text-3 mt-1">
                    T. Business Cash column
                  </div>
                </div>

                {/* Dynamic Platform Cards */}
                {displayPlatforms.map((plat) => {
                  const tot = summary.platformTotals?.[plat] || (plat.toLowerCase() === 'agoda' ? summary.totalAgoda : 0);
                  return (
                    <div key={plat} className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-accent">
                        Total Online ({plat})
                      </span>
                      <div className="text-xl lg:text-2xl font-bold text-plaza-accent tracking-tight mt-1.5">
                        ₹{tot.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-plaza-text-3 mt-1">
                        Bookings via {plat}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
                    Total Online (Others)
                  </span>
                  <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight mt-1.5">
                    ₹{summary.totalOtherOnline.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-plaza-text-3 mt-1">
                    Direct digital payments
                  </div>
                </div>
              </div>
            )}

            {/* Main Content: Exact Table Format from Image 1 - Horizontal Landscape */}
            {activeTab === 'table' && summary && (
              <div className="bg-white rounded-2xl border border-plaza-line shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-plaza-card border-b border-plaza-line text-[10px] uppercase font-bold text-plaza-text">
                        <th className="p-3 text-center w-14">SR. NO.</th>
                        <th className="p-3 text-center w-24">DATE</th>
                        <th className="p-3 text-right">ADVANCE</th>
                        <th className="p-3 text-right">CASH</th>
                        {displayPlatforms.map((plat) => (
                          <th key={plat} className="p-3 text-right text-plaza-accent whitespace-nowrap">
                            ONLINE ({plat.toUpperCase()})
                          </th>
                        ))}
                        <th className="p-3 text-right whitespace-nowrap">ONLINE (OTHERS)</th>
                        <th className="p-3 text-right font-bold text-plaza-text whitespace-nowrap">(DAY TOTAL)</th>
                        <th className="p-3 text-center w-20">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-plaza-line/50">
                      {summary.days.map((day) => {
                        return (
                          <tr
                            key={day.date}
                            onClick={() => onSelectDay(day.date)}
                            className="hover:bg-plaza-accent-tint/30 cursor-pointer transition-colors"
                          >
                            <td className="p-3 text-center font-mono font-medium text-plaza-text-3">
                              {day.dayNumber}
                            </td>
                            <td className="p-3 text-center font-mono font-semibold text-plaza-text">
                              {day.formattedDate}
                            </td>
                            <td className="p-3 text-right text-plaza-text-2">
                              {day.advanceTotal > 0 ? `₹${day.advanceTotal.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-3 text-right text-plaza-text-2">
                              {!stealth && day.tBusinessCash > 0 ? `₹${day.tBusinessCash.toLocaleString('en-IN')}` : '—'}
                            </td>
                            {displayPlatforms.map((plat) => {
                              const amt = day.platformTotals?.[plat] || (plat.toLowerCase() === 'agoda' ? day.agodaOnline : 0);
                              return (
                                <td key={plat} className="p-3 text-right font-semibold text-plaza-accent">
                                  {amt > 0 ? `₹${amt.toLocaleString('en-IN')}` : '—'}
                                </td>
                              );
                            })}
                            <td className="p-3 text-right text-plaza-text-2">
                              {day.otherOnline > 0 ? `₹${day.otherOnline.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-3 text-right font-bold text-plaza-text">
                              {day.dayTotal > 0 ? `₹${day.dayTotal.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => onSelectDay(day.date)}
                                  className="px-2.5 py-1 rounded-lg border border-plaza-line hover:border-plaza-accent hover:text-plaza-accent text-[11px] font-medium transition"
                                >
                                  Open
                                </button>
                                {day.hasData && (
                                  <button
                                    onClick={(e) => handleDownloadDayPDF(day.date, e)}
                                    className="p-1 rounded-lg text-plaza-text-3 hover:text-plaza-accent transition"
                                    title="Download Daily PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* GRAND TOTAL ROW EXACTLY AS IN REGISTER */}
                      <tr className="bg-plaza-accent-tint font-bold text-plaza-text border-t-2 border-t-plaza-text">
                        <td colSpan={2} className="p-3 text-center uppercase tracking-wider text-xs">
                          GRAND TOTAL
                        </td>
                        <td className="p-3 text-right">
                          {summary.totalAdvance > 0 ? `₹${summary.totalAdvance.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          {!stealth && summary.totalCash > 0 ? `₹${summary.totalCash.toLocaleString('en-IN')}` : '—'}
                        </td>
                        {displayPlatforms.map((plat) => {
                          const tot = summary.platformTotals?.[plat] || (plat.toLowerCase() === 'agoda' ? summary.totalAgoda : 0);
                          return (
                            <td key={plat} className="p-3 text-right text-plaza-accent font-bold">
                              {tot > 0 ? `₹${tot.toLocaleString('en-IN')}` : '—'}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          {summary.totalOtherOnline > 0 ? `₹${summary.totalOtherOnline.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3 text-right text-sm font-bold text-plaza-text">
                          ₹{summary.totalRevenue.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => generateMonthlyPDF(summary)}
                            className="px-2.5 py-1 rounded-lg bg-plaza-accent text-white text-[11px] font-medium shadow-2xs"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Main Content: Calendar Grid View */}
      {activeTab === 'grid' && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {summary.days.map((day) => {
            const hasData = day.hasData;

            return (
              <div
                key={day.date}
                onClick={() => onSelectDay(day.date)}
                className={`group relative rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between min-h-[120px] ${
                  hasData
                    ? 'bg-white hover:border-plaza-accent hover:shadow-hover border-plaza-line/70'
                    : 'bg-plaza-card/60 hover:bg-white border-plaza-line/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-bold text-plaza-text tracking-tight group-hover:text-plaza-accent transition-colors">
                      {String(day.dayNumber).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] font-semibold text-plaza-text-3 uppercase tracking-wider">
                      {day.dayOfWeek}
                    </div>
                  </div>

                  {hasData && (
                    <button
                      onClick={(e) => handleDownloadDayPDF(day.date, e)}
                      className="p-1 rounded-lg text-plaza-text-3 hover:text-plaza-accent hover:bg-plaza-accent-tint transition"
                      title="Download Day PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="my-1.5">
                  {hasData ? (
                    <>
                      <div className="text-sm font-bold text-plaza-text">
                        ₹{day.dayTotal.toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {day.agodaOnline > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-plaza-accent-tint text-plaza-accent font-bold">
                            Agoda: ₹{day.agodaOnline.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-plaza-text-4">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
