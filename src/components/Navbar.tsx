import React, { useState } from 'react';
import { ViewMode } from '../types';
import { Calendar, CalendarDays, BarChart3, Database, Globe, Menu, X } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { PlatformSettingsModal } from './PlatformSettingsModal';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onPlatformsChanged?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, onPlatformsChanged }) => {
  const [showPlatformModal, setShowPlatformModal] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navItems: { id: ViewMode; label: string; description: string; icon: React.ElementType }[] = [
    { id: 'daily', label: 'Daily Sheet', description: 'Rooms 101 – 303 Ledger', icon: Calendar },
    { id: 'monthly', label: 'Monthly Sheet', description: 'Full Month Business Statement', icon: CalendarDays },
    { id: 'analytics', label: 'Month Analytics', description: 'Revenue & Occupancy Insights', icon: BarChart3 },
    { id: 'backup', label: 'Data Backup', description: 'Cloud Sync & Offline Backups', icon: Database },
  ];

  const handleMobileNavClick = (view: ViewMode) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <PlatformSettingsModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
        onPlatformsChanged={() => {
          if (onPlatformsChanged) onPlatformsChanged();
        }}
      />

      {/* Top Header */}
      <header className="border-b border-plaza-line bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Brand with New Hotel Mandala Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-plaza-line/60 p-1 bg-white shadow-2xs shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Nayak's Sujay Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[10px] sm:text-xs font-black tracking-[0.14em] uppercase text-plaza-accent leading-tight">
                NAYAK'S SUJAY
              </div>
              <div className="text-xs sm:text-sm font-bold text-plaza-text tracking-tight flex items-center gap-1.5 mt-0.5 leading-none">
                <span>Business Sheet</span>
                <span className="text-plaza-text-4 font-normal text-[11px] hidden xs:inline">· Rooms 101 – 303</span>
              </div>
            </div>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-2">
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

            {/* Top-Right Platforms Settings Button */}
            <button
              onClick={() => setShowPlatformModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-plaza-line hover:border-plaza-accent/50 bg-white hover:bg-plaza-accent-tint/30 text-plaza-text text-xs font-semibold shadow-2xs transition active:scale-[0.98]"
              title="Manage Online Platforms (Agoda, MMT, etc.)"
            >
              <Globe className="w-3.5 h-3.5 text-plaza-accent" />
              <span className="hidden sm:inline">Platforms</span>
            </button>

            {/* Clerk User Account & Sign Out */}
            <div className="flex items-center ml-1">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 rounded-xl border border-plaza-line shadow-2xs',
                  }
                }}
              />
            </div>

            {/* Mobile Hamburger Menu Icon Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-plaza-line bg-white hover:bg-plaza-card text-plaza-text transition active:scale-95 shadow-2xs"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-plaza-accent" />
              ) : (
                <Menu className="w-5 h-5 text-plaza-text" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-plaza-line/60 bg-white/98 backdrop-blur-md px-4 py-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-plaza-text-4 px-2 block mb-1">
                Navigation Menu
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavClick(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                      isActive
                        ? 'bg-plaza-accent-tint text-plaza-accent font-bold border border-plaza-accent-line/70'
                        : 'hover:bg-plaza-card text-plaza-text'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-plaza-accent text-white' : 'bg-plaza-card text-plaza-text-3'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">{item.label}</div>
                        <div className="text-[11px] text-plaza-text-3 leading-tight mt-0.5">{item.description}</div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-plaza-accent"></span>
                    )}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-plaza-line/40">
                <button
                  onClick={() => {
                    setShowPlatformModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-plaza-card text-plaza-text text-left transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-plaza-accent flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">Booking Platforms</div>
                    <div className="text-[11px] text-plaza-text-3 leading-tight mt-0.5">Manage Agoda, MMT, Booking.com</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
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
