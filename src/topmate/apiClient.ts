import { config } from "../config.js";
import type { TopmateProfile, TopmateService } from "../types.js";

/**
 * Topmate does not publish an official API. This targets their internal app
 * backend at api.galactus.run, verified by capturing the real dashboard's own
 * network traffic against a live account:
 *
 *   GET /fetchByUsername/?username=<username>
 *
 * returns the full public profile (name, title, bio) plus the complete
 * services array (id, title, description, pricing, questions) — no login or
 * auth token required, since it's the same data Topmate's public profile
 * pages render for anyone. Fetched once per process and cached; write tools
 * call invalidateProfileCache() after a successful mutation so the next read
 * reflects it instead of serving stale cached data.
 */

interface RawServiceCharge {
  amount?: number;
  code?: string;
  currency?: string;
  display_text?: string;
}

interface RawServiceQuestion {
  id?: number;
  question: string;
}

interface RawService {
  id: number;
  title: string;
  description?: string | null;
  duration?: number;
  charge?: RawServiceCharge;
  questions?: RawServiceQuestion[];
  type?: number;
  [key: string]: unknown;
}

interface RawProfile {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  full_name?: string;
  title?: string;
  description?: string;
  profile_pic?: string;
  services?: RawService[];
  [key: string]: unknown;
}

async function parseOrThrow<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${context} failed (HTTP ${res.status}). Response: ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context} returned non-JSON response: ${text}`);
  }
}

function normalizeService(raw: RawService): TopmateService {
  return {
    ...raw,
    id: String(raw.id),
    title: raw.title,
    description: raw.description ?? undefined,
    charge: raw.charge?.amount,
    currency: raw.charge?.code ?? raw.charge?.currency,
    durationMinutes: raw.duration,
    questions: raw.questions?.map((q) => q.question),
  };
}

let cachedProfile: RawProfile | null = null;

async function fetchProfileData(): Promise<RawProfile> {
  if (cachedProfile) return cachedProfile;
  const res = await fetch(
    `${config.apiBaseUrl}/fetchByUsername/?username=${encodeURIComponent(config.username())}`
  );
  cachedProfile = await parseOrThrow<RawProfile>(res, "Fetching profile");
  return cachedProfile;
}

/** Call after any successful write so the next read isn't served stale data. */
export function invalidateProfileCache(): void {
  cachedProfile = null;
}

export async function getProfile(): Promise<TopmateProfile> {
  const data = await fetchProfileData();
  return {
    username: data.username,
    name: data.full_name || data.display_name || `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
    title: data.title,
    description: data.description,
    profilePicUrl: data.profile_pic,
    services: (data.services ?? []).map(normalizeService),
  };
}

export async function listServices(): Promise<TopmateService[]> {
  const data = await fetchProfileData();
  return (data.services ?? []).map(normalizeService);
}

export async function getService(serviceId: string): Promise<TopmateService> {
  const services = await listServices();
  const match = services.find((s) => s.id === serviceId);
  if (!match) {
    throw new Error(`No service with id "${serviceId}" found on this profile.`);
  }
  return match;
}
