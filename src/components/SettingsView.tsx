import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  CheckCircle2, 
  HardDrive, 
  Cloud,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { exportAllDataAsJSON, importDataFromJSON, clearAllDatabaseData } from '../services/db';
import { supabase } from '../services/supabase';

export const SettingsView: React.FC = () => {
  const [exporting, setExporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [cloudRecordCount, setCloudRecordCount] = useState<number>(0);

  const checkCloudConnection = async () => {
    setCloudStatus('checking');
    try {
      const { data, error } = await supabase.from('day_sheets').select('date');
      if (error) throw error;
      setCloudStatus('connected');
      setCloudRecordCount(data ? data.length : 0);
    } catch (err) {
      console.error(err);
      setCloudStatus('error');
    }
  };

  useEffect(() => {
    checkCloudConnection();
  }, []);

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      const json = await exportAllDataAsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `Plaza_Business_Sheet_Backup_${nowStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export backup: ' + e);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importDataFromJSON(text);
      setImportStatus(`Successfully restored ${count} daily sheet records!`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err?.message || 'Invalid format'}`);
    }
  };

  const handleWipeDatabase = async () => {
    if (window.confirm('Are you sure you want to completely clear all saved sheets? This cannot be undone.')) {
      await clearAllDatabaseData();
      alert('All local data cleared. The sheet is now completely clean.');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-plaza-text">
          Database & Cloud Architecture
        </h2>
        <p className="text-sm text-plaza-text-3 mt-1">
          Real-time cloud database connection with Nayak's Sujay Supabase instance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Local Storage & Backup Tools */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plaza-accent-tint flex items-center justify-center text-plaza-accent">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-plaza-text">
                    Local Reception Desk Engine
                  </h3>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    IndexedDB Offline Active
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-plaza-text-2 leading-relaxed mb-6">
              All sheet entries are stored securely on this computer inside high-capacity browser IndexedDB.
              It operates 100% offline with zero latency and syncs with Supabase in the background.
            </p>

            {/* Backup & Restore Controls */}
            <div className="pt-4 border-t border-plaza-line/40 flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export JSON Backup'}
              </button>

              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-plaza-line hover:bg-plaza-card text-plaza-text text-xs font-medium cursor-pointer transition">
                <Upload className="w-4 h-4 text-plaza-text-3" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleWipeDatabase}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition ml-auto"
                title="Wipe local records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Local Data
              </button>
            </div>

            {importStatus && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Supabase Cloud Live Sync */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-plaza-line shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-plaza-text">
                    Supabase Cloud Live Sync
                  </h3>
                  {cloudStatus === 'connected' ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected & Ready
                    </span>
                  ) : cloudStatus === 'checking' ? (
                    <span className="text-xs text-amber-600 font-medium">Checking connection...</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">Connection Error</span>
                  )}
                </div>
              </div>

              <button
                onClick={checkCloudConnection}
                className="p-2 rounded-xl text-plaza-text-3 hover:text-plaza-text hover:bg-plaza-card transition"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-plaza-line/40">
                <span className="text-plaza-text-3">Project Endpoint</span>
                <span className="font-mono text-[11px] text-plaza-text font-medium truncate max-w-[210px]">
                  vmkwotxrpwpcahxqwikg.supabase.co
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-plaza-line/40">
                <span className="text-plaza-text-3">Cloud Records</span>
                <span className="font-semibold text-plaza-text">
                  {cloudRecordCount} Day Sheets
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-plaza-text-3">Sync Strategy</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                  Cloud + Local Offline Fallback
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
