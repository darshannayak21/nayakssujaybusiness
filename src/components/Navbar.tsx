import React from 'react';
import { ViewMode } from '../types';
import { Calendar, CalendarDays, BarChart3, Database } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const navItems: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'daily', label: 'Daily Sheet', icon: Calendar },
    { id: 'monthly', label: 'Monthly Sheet', icon: CalendarDays },
    { id: 'analytics', label: 'Month Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Data Backup', icon: Database },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="border-b border-plaza-line bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand with New Hotel Mandala Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-plaza-line/60 p-1 bg-white shadow-2xs shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Nayak's Sujay Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[11px] sm:text-xs font-black tracking-[0.14em] uppercase text-plaza-accent leading-tight">
                NAYAK'S SUJAY
              </div>
              <div className="text-xs sm:text-sm font-bold text-plaza-text tracking-tight flex items-center gap-1.5 mt-0.5 leading-none">
                <span>Business Sheet</span>
                <span className="text-plaza-text-4 font-normal text-[11px] hidden xs:inline">· Rooms 101 – 303</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 bg-plaza-card p-1 rounded-xl border border-plaza-line/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-plaza-text shadow-xs font-semibold'
                      : 'text-plaza-text-3 hover:text-plaza-text'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-plaza-accent' : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-plaza-line/80 px-2 py-1.5 shadow-lg no-print">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-plaza-accent font-bold bg-plaza-accent-tint/60'
                    : 'text-plaza-text-3 hover:text-plaza-text'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-plaza-accent' : 'text-plaza-text-3'}`} />
                <span className="text-[10px] leading-tight tracking-tight whitespace-nowrap">
                  {item.id === 'analytics' ? 'Analytics' : item.id === 'backup' ? 'Backup' : item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
