import { GameSaveState } from '../types/cricket';
import { DEFAULT_FORMATION_PRESETS } from '../data/realCricketers';

const AUTO_SAVE_KEY = 'cricket_apex_autosave_v2';
const DB_NAME = 'CricketApexManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'save_slots';

export interface SaveSlotMeta {
  slotId: string;
  saveName: string;
  savedAt: string;
  managerName: string;
  teamName: string;
  season: string;
  mode: string;
  state: GameSaveState;
}

export function saveAutoState(state: GameSaveState): void {
  try {
    const updated = { ...state, savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage overflow
  }
}

export function loadAutoState(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveState;
    if (parsed && parsed.players && parsed.teams && parsed.userTeamId) {
      if (!parsed.customFormations || parsed.customFormations.length === 0) {
        parsed.customFormations = DEFAULT_FORMATION_PRESETS;
      }
      if (!parsed.careerLegacy) {
        parsed.careerLegacy = {
          trophiesWon: 2,
          matchesManaged: 42,
          matchesWon: 29,
          playersDeveloped: 11,
          successfulAuctionSignings: 14,
          highestTeamScore: '234/3 (20.0)',
          milestones: [
            'Won Back-to-Back Rivalry Derbies with +0.842 NRR',
            'Developed Tilak Varma & Yashasvi Jaiswal into 90+ Potential Stars',
          ],
        };
      }
      if (typeof parsed.teamChemistry !== 'number') {
        parsed.teamChemistry = 89;
      }
      if (parsed.liveMatch && !parsed.liveMatch.bowlingAggressiveness) {
        parsed.liveMatch.bowlingAggressiveness = 'Balanced Control';
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIndexedDBSlot(slotId: string, saveName: string, state: GameSaveState): Promise<void> {
  const db = await openDatabase();
  const team = state.teams[state.userTeamId];
  const record: SaveSlotMeta = {
    slotId,
    saveName,
    savedAt: new Date().toLocaleString(),
    managerName: state.managerName,
    teamName: team ? team.name : state.userTeamId,
    season: state.season,
    mode: state.mode === 'FRANCHISE_T20' ? 'Franchise T20' : 'International',
    state: { ...state, saveName, savedAt: new Date().toLocaleString() },
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listIndexedDBSlots(): Promise<SaveSlotMeta[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as SaveSlotMeta[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteIndexedDBSlot(slotId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(slotId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
