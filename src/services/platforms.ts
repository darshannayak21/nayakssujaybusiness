import { supabase } from './supabase';

export const DEFAULT_PLATFORMS = ['Agoda', 'MMT'];

export function getBookingPlatforms(): string[] {
  try {
    const raw = localStorage.getItem('plaza_booking_platforms');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => String(p).trim()).filter(Boolean);
      }
    }
  } catch (e) {
    console.error('Error reading booking platforms:', e);
  }
  return [...DEFAULT_PLATFORMS];
}

export async function saveBookingPlatforms(platforms: string[]): Promise<void> {
  const sanitized = Array.from(new Set(platforms.map(p => p.trim()).filter(Boolean)));
  try {
    localStorage.setItem('plaza_booking_platforms', JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('plaza_platforms_updated', { detail: sanitized }));
  } catch (e) {
    console.error('Error saving booking platforms locally:', e);
  }

  // Sync to Supabase config table (optional/silent fallback)
  try {
    await supabase.from('day_sheets').upsert({
      date: 'CONFIG_PLATFORMS',
      rooms: [],
      totals: {},
      notes: JSON.stringify(sanitized),
      verified_by: 'System Config',
      updated_at: new Date().toISOString()
    }, { onConflict: 'date' });
  } catch (_) {}
}

export async function initBookingPlatformsFromCloud(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('day_sheets')
      .select('notes')
      .eq('date', 'CONFIG_PLATFORMS')
      .maybeSingle();

    if (data?.notes) {
      const parsed = JSON.parse(data.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('plaza_booking_platforms', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (_) {}
  return getBookingPlatforms();
}

export async function addBookingPlatform(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) return getBookingPlatforms();
  const current = getBookingPlatforms();
  if (!current.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    await saveBookingPlatforms(updated);
    return updated;
  }
  return current;
}

export async function removeBookingPlatform(name: string): Promise<string[]> {
  const current = getBookingPlatforms();
  const updated = current.filter(p => p.toLowerCase() !== name.toLowerCase());
  await saveBookingPlatforms(updated);
  return updated;
}
