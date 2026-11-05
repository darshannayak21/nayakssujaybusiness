import React from 'react';
import { IndianRupee, CreditCard, Banknote, Percent, BedDouble } from 'lucide-react';
import { DaySheetTotals } from '../types';

interface KPICardsProps {
  totals: DaySheetTotals;
  isMonthly?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ totals, isMonthly = false }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
      {/* Card 1: Total Revenue */}
      <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40 transition-all hover:border-plaza-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
            {isMonthly ? 'Month Revenue' : "Today's Business"}
          </span>
          <div className="w-6 h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
            <IndianRupee className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
          ₹{totals.total.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-plaza-text-3 mt-1 flex items-center gap-1.5">
          <span>Rent billed: ₹{totals.roomRent.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Card 2: Cash Collections */}
      <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40 transition-all hover:border-plaza-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
            Cash Collected
          </span>
          <div className="w-6 h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
            <Banknote className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
          ₹{(totals.tBusinessCash + totals.advanceCash).toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-plaza-text-3 mt-1">
          Adv: ₹{totals.advanceCash.toLocaleString('en-IN')} | TB: ₹{totals.tBusinessCash.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Card 3: Online Collections */}
      <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40 transition-all hover:border-plaza-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
            Online (UPI / POS)
          </span>
          <div className="w-6 h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
          ₹{(totals.tBusinessOnline + totals.advanceOnline).toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-plaza-text-3 mt-1">
          Adv: ₹{totals.advanceOnline.toLocaleString('en-IN')} | TB: ₹{totals.tBusinessOnline.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Card 4: GST 5% */}
      <div className="bg-plaza-card rounded-2xl p-4 border border-plaza-line/40 transition-all hover:border-plaza-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-plaza-text-3">
            GST (5%)
          </span>
          <div className="w-6 h-6 rounded-lg bg-white border border-plaza-line/50 flex items-center justify-center text-plaza-text-3">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold text-plaza-text tracking-tight">
          ₹{totals.gst5.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-plaza-text-3 mt-1">
          Refunds: ₹{totals.refund.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Card 5: Solid Orange Accent Card (Per Style Guide Specification) */}
      <div className="bg-plaza-accent text-white rounded-2xl p-4 shadow-md col-span-2 md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-white/90">
            Room Occupancy
          </span>
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
            <BedDouble className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl lg:text-2xl font-bold tracking-tight">
          {totals.occupiedRooms} <span className="text-sm font-medium text-white/80">/ 26 Rooms</span>
        </div>
        <div className="text-[11px] text-white/80 mt-1 flex items-center justify-between">
          <span>Vacant: {totals.vacantRooms}</span>
          <span>Checked out: {totals.checkedOutRooms}</span>
        </div>
      </div>
    </div>
  );
};
