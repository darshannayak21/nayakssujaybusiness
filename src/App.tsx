import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from '@clerk/clerk-react';
import { ViewMode, DaySheet } from './types';
import { Navbar } from './components/Navbar';
import { DailySheetView } from './components/DailySheetView';
import { MonthlyView } from './components/MonthlyView';
import { MonthAnalyticsView } from './components/MonthAnalyticsView';
import { SettingsView } from './components/SettingsView';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginView } from './components/LoginView';
import { 
  getDaySheet, 
  saveDaySheet, 
  getTodayDateString,
  clearAllDatabaseData
} from './services/db';
import { initBookingPlatformsFromCloud, toggleStealthMode } from './services/platforms';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [sheet, setSheet] = useState<DaySheet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize data on mount
  useEffect(() => {
    async function initApp() {
      setLoading(true);
      try {
        // Force complete wipe of previous test/cached data once
        if (!localStorage.getItem('plaza_clean_slate_active_v4_empty')) {
          await clearAllDatabaseData();
          localStorage.clear();
          localStorage.setItem('plaza_clean_slate_active_v4_empty', 'true');
        }

        await initBookingPlatformsFromCloud();

        const initialSheet = await getDaySheet(currentDate);
        setSheet(initialSheet);
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  // Global stealth keyboard shortcut (Ctrl+H / Cmd+H)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        await toggleStealthMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reload sheet when currentDate changes
  const handleDateChange = async (newDate: string) => {
    setCurrentDate(newDate);
    setLoading(true);
    try {
      const loaded = await getDaySheet(newDate);
      setSheet(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSheet = async (updated: DaySheet) => {
    setSheet(updated);
    await saveDaySheet(updated);
  };

  const handleSelectDayFromMonth = (selectedDate: string) => {
    handleDateChange(selectedDate);
    setCurrentView('daily');
  };

  return (
    <>
      <ClerkLoading>
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 select-none">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-plaza-line/60 p-2 bg-white shadow-card mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Nayak's Sujay Logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-6 h-6 border-2 border-plaza-accent border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold text-plaza-text uppercase tracking-widest">NAYAK'S SUJAY</p>
          <p className="text-[11px] text-plaza-text-3 mt-1">Connecting to Reception Portal...</p>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <SignedOut>
          <LoginView />
        </SignedOut>

        <SignedIn>
          {showSplash && (
            <LoadingScreen onComplete={() => setShowSplash(false)} minDuration={1900} />
          )}

          <div className="min-h-screen bg-white text-plaza-text flex flex-col font-sans selection:bg-plaza-accent selection:text-white pb-16 md:pb-0">
            {/* Top Clean Navigation */}
            <Navbar
              currentView={currentView}
              onViewChange={setCurrentView}
            />

            {/* Main View Area */}
            <main className="flex-1 pb-10 md:pb-6">
              {loading && !sheet ? (
                <div className="flex items-center justify-center min-h-[500px]">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-plaza-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-semibold text-plaza-text">Opening Plaza Desk Sheet...</p>
                  </div>
                </div>
              ) : (
                <>
                  {currentView === 'daily' && sheet && (
                    <DailySheetView
                      sheet={sheet}
                      onUpdateSheet={handleUpdateSheet}
                      onDateChange={handleDateChange}
                    />
                  )}

                  {currentView === 'monthly' && (
                    <MonthlyView
                      initialYear={parseInt(currentDate.split('-')[0])}
                      initialMonth={parseInt(currentDate.split('-')[1])}
                      onSelectDay={handleSelectDayFromMonth}
                    />
                  )}

                  {currentView === 'analytics' && (
                    <MonthAnalyticsView
                      initialYear={parseInt(currentDate.split('-')[0])}
                      initialMonth={parseInt(currentDate.split('-')[1])}
                      onSelectDate={handleSelectDayFromMonth}
                    />
                  )}

                  {currentView === 'backup' && (
                    <SettingsView />
                  )}
                </>
              )}
            </main>

            {/* Subtle Bottom Brand Footer */}
            <footer className="border-t border-plaza-line/30 py-4 px-6 text-center text-[10px] text-plaza-text-3 no-print">
              <div className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-2">
                <span>Nayaks Sujay Plaza · Reception Management System</span>
                <span className="font-mono text-plaza-text-4">Rooms 101 – 303</span>
              </div>
            </footer>
          </div>
        </SignedIn>
      </ClerkLoaded>
    </>
  );
};

export default App;
