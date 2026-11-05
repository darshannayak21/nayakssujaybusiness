/**
 * Storage Strategy & Architecture
 * 
 * 1. LOCAL STORAGE ENGINE (Dexie IndexedDB):
 *    - Ideal for the hotel receptionist's physical machine.
 *    - Instant speed, zero latency, works 100% offline (critical during internet drops).
 *    - Stores gigabytes of records without limits.
 *    - Fully backed up to LocalStorage and downloadable as JSON backups.
 * 
 * 2. FUTURE FIREBASE INTEGRATION:
 *    - When the hotel is ready for Firebase authentication (email/password or Google login)
 *      and real-time cloud sync to view sales from phones/laptops remotely,
 *      simply set `USE_FIREBASE = true` and populate `firebaseConfig`.
 */

export interface StorageConfig {
  mode: 'local' | 'firebase';
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  mode: 'local',
};
