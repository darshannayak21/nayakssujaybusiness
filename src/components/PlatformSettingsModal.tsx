import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Globe, CheckCircle2 } from 'lucide-react';
import { getBookingPlatforms, addBookingPlatform, removeBookingPlatform } from '../services/platforms';

interface PlatformSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlatformsChanged?: (platforms: string[]) => void;
}

export const PlatformSettingsModal: React.FC<PlatformSettingsModalProps> = ({
  isOpen,
  onClose,
  onPlatformsChanged,
}) => {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [newPlatformName, setNewPlatformName] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPlatforms = () => {
    setPlatforms(getBookingPlatforms());
  };

  useEffect(() => {
    if (isOpen) {
      loadPlatforms();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (nameToAdd?: string) => {
    const target = (nameToAdd || newPlatformName).trim();
    if (!target) return;
    const updated = await addBookingPlatform(target);
    setPlatforms(updated);
    setNewPlatformName('');
    setFeedback(`Added "${target}" to booking platforms.`);
    if (onPlatformsChanged) onPlatformsChanged(updated);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleRemove = async (platformName: string) => {
    if (platforms.length <= 1) {
      alert('You must have at least one online platform configured.');
      return;
    }
    if (window.confirm(`Remove "${platformName}" from booking platforms?`)) {
      const updated = await removeBookingPlatform(platformName);
      setPlatforms(updated);
      setFeedback(`Removed "${platformName}".`);
      if (onPlatformsChanged) onPlatformsChanged(updated);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const suggestions = ['Booking.com', 'Goibibo', 'Airbnb', 'Expedia', 'EaseMyTrip'].filter(
    s => !platforms.some(p => p.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-plaza-line overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-plaza-line/60 flex items-center justify-between bg-plaza-card/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-plaza-accent-tint flex items-center justify-center text-plaza-accent">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-plaza-text leading-tight">
                Online Booking Platforms
              </h3>
              <p className="text-[11px] text-plaza-text-3">
                Manage OTA sources (Agoda, MMT, etc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-plaza-text-3 hover:text-plaza-text hover:bg-plaza-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-plaza-text-2 leading-relaxed">
            Configure the online platforms your hotel takes bookings from. In the daily sheet, 
            simply select the platform from the dropdown next to the customer's name. 
            The monthly report will dynamically add columns for each platform.
          </p>

          {/* Add Platform Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Booking.com, Goibibo"
              value={newPlatformName}
              onChange={(e) => setNewPlatformName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-plaza-line focus:outline-none focus:border-plaza-accent"
            />
            <button
              onClick={() => handleAdd()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-plaza-text-4 block mb-1.5">
                Quick Add Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAdd(s)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-plaza-card hover:bg-plaza-accent-tint hover:text-plaza-accent text-plaza-text-2 border border-plaza-line/50 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Platforms List */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-plaza-text-4 block mb-2">
              Active Platforms ({platforms.length})
            </span>
            <div className="divide-y divide-plaza-line/40 border border-plaza-line/60 rounded-xl overflow-hidden bg-white">
              {platforms.map((plat) => (
                <div
                  key={plat}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-plaza-card/40 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-plaza-accent"></span>
                    <span className="text-xs font-bold text-plaza-text">{plat}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(plat)}
                    className="p-1 rounded-lg text-plaza-text-4 hover:text-red-600 hover:bg-red-50 transition"
                    title={`Remove ${plat}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {feedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-plaza-line/60 bg-plaza-card/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-plaza-text text-white text-xs font-semibold hover:bg-black transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
