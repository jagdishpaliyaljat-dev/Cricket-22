import { CricketMatch, Player } from '../types/cricket';

const CACHE_KEYS = {
  MATCHES: 'localxi_cache_matches_v1',
  PLAYERS: 'localxi_cache_players_v1',
  TIMESTAMP: 'localxi_cache_timestamp_v1',
};

const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes TTL

export function getCachedMatches(): CricketMatch[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.MATCHES);
    const ts = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
    if (!raw || !ts) return null;

    const age = Date.now() - parseInt(ts, 10);
    if (age > CACHE_TTL_MS) return null; // expired

    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read cached matches:', e);
    return null;
  }
}

export function setCachedMatches(matches: CricketMatch[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.MATCHES, JSON.stringify(matches));
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.warn('Failed to save cached matches:', e);
  }
}

export function getCachedPlayers(): Player[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.PLAYERS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read cached players:', e);
    return null;
  }
}

export function setCachedPlayers(players: Player[]): void {
  try {
    localStorage.setItem(CACHE_KEYS.PLAYERS, JSON.stringify(players));
  } catch (e) {
    console.warn('Failed to save cached players:', e);
  }
}
