import { IceServerConfig } from '../types';

export const DEFAULT_ICE_SERVERS: IceServerConfig[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
    ],
  },
  {
    urls: 'stun:global.stun.twilio.com:3478',
  },
];

const STORAGE_KEY = 'peerdrop_custom_ice_servers';

export function getStoredIceServers(): IceServerConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ICE_SERVERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse stored ICE servers', e);
  }
  return DEFAULT_ICE_SERVERS;
}

export function saveStoredIceServers(servers: IceServerConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch (e) {
    console.error('Failed to save ICE servers to localStorage', e);
  }
}

export function resetIceServersToDefault(): IceServerConfig[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear ICE servers in localStorage', e);
  }
  return DEFAULT_ICE_SERVERS;
}

export async function testIceServers(iceServers: IceServerConfig[]): Promise<{
  success: boolean;
  candidates: string[];
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  const candidates: string[] = [];

  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers });
      // Create a dummy data channel to trigger ICE gathering
      pc.createDataChannel('ice-test');

      const timeout = setTimeout(() => {
        pc.close();
        if (candidates.length > 0) {
          resolve({
            success: true,
            candidates,
            latencyMs: Math.round(performance.now() - start),
          });
        } else {
          resolve({
            success: false,
            candidates: [],
            latencyMs: Math.round(performance.now() - start),
            error: 'ICE gathering timed out (10s) with no candidates discovered.',
          });
        }
      }, 10000);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const cand = event.candidate;
          const candType = cand.type || 'relay/srflx/host';
          const candidateStr = cand.candidate
            ? cand.candidate.trim()
            : `${candType} candidate (${cand.protocol || 'udp'} port ${cand.port || '?'})`;
          if (!candidates.includes(candidateStr)) {
            candidates.push(candidateStr);
          }
        } else {
          // ICE gathering complete
          clearTimeout(timeout);
          pc.close();
          resolve({
            success: candidates.length > 0,
            candidates,
            latencyMs: Math.round(performance.now() - start),
            error: candidates.length === 0 ? 'No ICE candidates were generated.' : undefined,
          });
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => {
          clearTimeout(timeout);
          pc.close();
          resolve({
            success: false,
            candidates: [],
            latencyMs: Math.round(performance.now() - start),
            error: `Failed to create offer: ${err.message}`,
          });
        });
    } catch (err: any) {
      resolve({
        success: false,
        candidates: [],
        latencyMs: Math.round(performance.now() - start),
        error: err.message || 'Unknown error initializing RTCPeerConnection',
      });
    }
  });
}
