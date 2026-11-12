import { supabase } from './supabase';
import { RoomEntry } from '../types';

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

export function getStealthActivatedAt(): string | null {
  try {
    return localStorage.getItem('plaza_stealth_activated_at');
  } catch (_) {
    return null;
  }
}

export async function toggleStealthMode(): Promise<boolean> {
  const current = getBookingPlatforms();
  const isStealth = isStealthMode(current);
  if (isStealth) {
    await removeBookingPlatform('bookings');
    return false;
  } else {
    await addBookingPlatform('bookings');
    return true;
  }
}

export function isStealthMode(platformsList?: string[]): boolean {
  const current = platformsList || getBookingPlatforms();
  return current.some(p => p.trim().toLowerCase() === 'bookings');
}

/**
 * Checks if a specific cash entry should be visible:
 * - In normal mode (stealth OFF): all cash entries are visible.
 * - In stealth mode (stealth ON): all historical/pre-stealth cash is hidden.
 *   Only cash bookings created/updated AFTER stealth mode was activated are visible.
 */
export function isCashVisible(cashUpdatedAt?: string): boolean {
  if (!isStealthMode()) return true;
  const activatedAt = getStealthActivatedAt();
  if (!activatedAt) return false;
  if (!cashUpdatedAt) return false;
  return new Date(cashUpdatedAt).getTime() > new Date(activatedAt).getTime();
}

/**
 * Determines whether a room's booking was made/paid by cash and should be completely
 * hidden (disappearing customer name, room rent, amounts, and occupancy) during stealth mode.
 */
export function isCashOnlyHiddenBooking(room: RoomEntry): boolean {
  if (!isStealthMode()) return false;

  // Bookings created or updated during the active stealth mode session are never hidden
  const activatedAt = getStealthActivatedAt();
  if (activatedAt && room.bookingUpdatedAt) {
    if (new Date(room.bookingUpdatedAt).getTime() > new Date(activatedAt).getTime()) {
      return false;
    }
  }

  const isOnlinePlatform = Boolean(room.platform && room.platform !== 'Direct' && room.platform.trim().length > 0);
  if (isOnlinePlatform) return false;

  const hasOnlinePayment = (typeof room.advanceOnline === 'number' && room.advanceOnline > 0) ||
                           (typeof room.tBusinessOnline === 'number' && room.tBusinessOnline > 0);
  if (hasOnlinePayment) return false;

  const hasVisibleCash = isCashVisible(room.cashUpdatedAt) && (
    (typeof room.advanceCash === 'number' && room.advanceCash > 0) ||
    (typeof room.tBusinessCash === 'number' && room.tBusinessCash > 0)
  );
  if (hasVisibleCash) return false;

  // A direct booking is ONLY hidden if it actually had cash paid before stealth mode:
  const hasHiddenCash = (
    !isCashVisible(room.cashUpdatedAt) && (
      (typeof room.advanceCash === 'number' && room.advanceCash > 0) ||
      (typeof room.tBusinessCash === 'number' && room.tBusinessCash > 0)
    )
  );

  const isHiddenStayover = Boolean(
    room.stayType === 'stayover' &&
    typeof room.stayPaidOnCheckIn === 'number' &&
    room.stayPaidOnCheckIn > 0 &&
    !hasOnlinePayment &&
    !isCashVisible(room.cashUpdatedAt)
  );

  return hasHiddenCash || isHiddenStayover;
}

export function getDisplayPlatforms(platformsList?: string[]): string[] {
  const current = platformsList || getBookingPlatforms();
  return current.filter(p => p.trim().toLowerCase() !== 'bookings');
}

export async function saveBookingPlatforms(platforms: string[]): Promise<void> {
  const sanitized = Array.from(new Set(platforms.map(p => p.trim()).filter(Boolean)));
  const isStealth = sanitized.some(p => p.toLowerCase() === 'bookings');

  let stealthActivatedAt = getStealthActivatedAt();
  if (isStealth && !stealthActivatedAt) {
    stealthActivatedAt = new Date().toISOString();
    try {
      localStorage.setItem('plaza_stealth_activated_at', stealthActivatedAt);
    } catch (_) {}
  } else if (!isStealth) {
    stealthActivatedAt = null;
    try {
      localStorage.removeItem('plaza_stealth_activated_at');
    } catch (_) {}
  }

  try {
    localStorage.setItem('plaza_booking_platforms', JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent('plaza_platforms_updated', { detail: sanitized }));
  } catch (e) {
    console.error('Error saving booking platforms locally:', e);
  }

  // Sync to Supabase config table for cross-device persistence
  try {
    const payload = {
      platforms: sanitized,
      stealthActivatedAt: stealthActivatedAt,
    };
    await supabase.from('day_sheets').upsert({
      date: 'CONFIG_PLATFORMS',
      rooms: [],
      totals: {},
      notes: JSON.stringify(payload),
      verified_by: 'System Config',
      updated_at: new Date().toISOString()
    }, { onConflict: 'date' });
  } catch (err) {
    console.error('Error syncing booking platforms to cloud:', err);
  }
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
      let platforms: string[] = [];
      let stealthActivatedAt: string | null = null;

      if (Array.isArray(parsed)) {
        platforms = parsed;
      } else if (parsed && typeof parsed === 'object') {
        platforms = Array.isArray(parsed.platforms) ? parsed.platforms : [];
        stealthActivatedAt = parsed.stealthActivatedAt || null;
      }

      if (platforms.length > 0) {
        localStorage.setItem('plaza_booking_platforms', JSON.stringify(platforms));
        if (stealthActivatedAt) {
          localStorage.setItem('plaza_stealth_activated_at', stealthActivatedAt);
        } else {
          localStorage.removeItem('plaza_stealth_activated_at');
        }
        window.dispatchEvent(new CustomEvent('plaza_platforms_updated', { detail: platforms }));
        return platforms;
      }
    }
  } catch (err) {
    console.error('Error fetching config from cloud:', err);
  }
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

// Setup Supabase Realtime subscription so changes on any device sync live everywhere
try {
  supabase
    .channel('plaza_cloud_config_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'day_sheets', filter: 'date=eq.CONFIG_PLATFORMS' },
      () => {
        initBookingPlatformsFromCloud();
      }
    )
    .subscribe();
} catch (_) {}

