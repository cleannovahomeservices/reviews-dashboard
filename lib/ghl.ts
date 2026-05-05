// ============================================================
// Go High Level API — Agency + Reputation
// ============================================================

const BASE_URL = "https://services.leadconnectorhq.com";

// Read env var at call time, not at module load time
function getHeaders() {
  const key = (process.env.GHL_API_KEY ?? "").trim();
  return {
    Authorization: `Bearer ${key}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

// --- Types ---

export interface GHLLocation {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  slug: string;
  color: string;
}

export interface GHLReview {
  id: string;
  rating: number;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  comment: string;
  createTime: string;
  reviewReply?: { comment: string; updateTime: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
}

export interface ReviewsData {
  reviews: GHLReview[];
  totalReviews: number;
  averageRating: number;
  hasGMB: boolean;
}

// --- Helpers ---

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

const COLORS = [
  "#4F8EF7", "#34D399", "#F5C842", "#F472B6",
  "#A78BFA", "#FB923C", "#38BDF8", "#4ADE80",
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// --- Auto-detect companyId from the API key ---

async function detectCompanyId(): Promise<string> {
  const headers = getHeaders();

  // Strategy 1: /oauth/meta
  const metaRes = await fetch(`${BASE_URL}/oauth/meta`, {
    headers,
    cache: "no-store",
  });
  if (metaRes.ok) {
    const data = await metaRes.json();
    if (data?.companyId) return data.companyId as string;
  }

  // Strategy 2: companyId from the first location
  const searchRes = await fetch(`${BASE_URL}/locations/search?limit=1`, {
    headers,
    cache: "no-store",
  });
  if (searchRes.ok) {
    const data = await searchRes.json();
    const first = (data.locations ?? [])[0] as Record<string, unknown> | undefined;
    if (first?.companyId) return first.companyId as string;
    throw new Error(
      `GHL respondio OK pero sin companyId en locations. Respuesta: ${JSON.stringify(data).slice(0, 200)}`
    );
  }

  throw new Error(
    `No se pudo detectar el companyId. /oauth/meta: ${metaRes.status}, /locations/search: ${searchRes.status}. Verifica que GHL_API_KEY sea una Agency API Key valida.`
  );
}

// --- Agency: fetch ALL locations (con paginacion automatica) ---

export async function getAllLocations(): Promise<GHLLocation[]> {
  const companyId = await detectCompanyId();
  const headers = getHeaders();

  const locations: GHLLocation[] = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${BASE_URL}/locations/search?companyId=${companyId}&limit=${limit}&skip=${skip}`,
      {
        headers,
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) throw new Error(`GHL locations API error: ${res.status}`);

    const data = await res.json();
    const batch = (data.locations ?? []) as Record<string, unknown>[];

    batch.forEach((loc, i) => {
      locations.push({
        id: loc.id as string,
        name: loc.name as string,
        email: loc.email as string | undefined,
        phone: loc.phone as string | undefined,
        address: loc.address as string | undefined,
        city: loc.city as string | undefined,
        country: loc.country as string | undefined,
        website: loc.website as string | undefined,
        slug: slugify(loc.name as string),
        color: COLORS[(locations.length + i) % COLORS.length],
      });
    });

    if (batch.length < limit) break;
    skip += limit;
  }

  return locations;
}

// --- Reviews por location ---

function parseReviews(body: string): ReviewsData {
  const data = JSON.parse(body);
  const reviews: GHLReview[] = data.reviews ?? [];
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (STAR_MAP[r.starRating] ?? r.rating ?? 0), 0) / totalReviews
      : 0;
  return { reviews, totalReviews, averageRating, hasGMB: true };
}

const NO_GMB: ReviewsData = { reviews: [], totalReviews: 0, averageRating: 0, hasGMB: false };

export async function getReviews(locationId: string): Promise<ReviewsData> {
  const headers = getHeaders();

  // Endpoint 1: /reputation/review?locationId=...
  const url1 = `${BASE_URL}/reputation/review?locationId=${locationId}&limit=100`;
  const res1 = await fetch(url1, { headers, cache: "no-store" });
  const body1 = await res1.text();
  console.log(`[reviews:ep1] ${res1.status} loc=${locationId} body=${body1.slice(0, 300)}`);

  if (res1.ok) return parseReviews(body1);

  if (res1.status === 404 || res1.status === 422) return NO_GMB;

  if (res1.status === 401 || res1.status === 403) {
    throw new Error(`[ep1] Sin permisos (${res1.status}). Verifica que GHL_API_KEY tenga scope Reputation. Body: ${body1.slice(0, 300)}`);
  }

  // Endpoint 2: /locations/{id}/reputation/review
  const url2 = `${BASE_URL}/locations/${locationId}/reputation/review`;
  const res2 = await fetch(url2, { headers, cache: "no-store" });
  const body2 = await res2.text();
  console.log(`[reviews:ep2] ${res2.status} loc=${locationId} body=${body2.slice(0, 300)}`);

  if (res2.ok) return parseReviews(body2);

  if (res2.status === 404 || res2.status === 422) return NO_GMB;

  if (res2.status === 401 || res2.status === 403) {
    throw new Error(`[ep2] Sin permisos (${res2.status}). Body: ${body2.slice(0, 300)}`);
  }

  throw new Error(`[ep1:${res1.status}] ${body1.slice(0, 300)} | [ep2:${res2.status}] ${body2.slice(0, 300)}`);
}

// --- Analytics helpers ---

export function getReviewsThisWeek(reviews: GHLReview[]): GHLReview[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return reviews.filter((r) => new Date(r.createTime) >= cutoff);
}

export function getReviewsThisMonth(reviews: GHLReview[]): GHLReview[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return reviews.filter((r) => new Date(r.createTime) >= cutoff);
}

export interface DailyCount {
  label: string;
  date: string;
  count: number;
}

export function getWeeklyBreakdown(reviews: GHLReview[]): DailyCount[] {
  const labels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      label: labels[d.getDay()],
      date: dateStr,
      count: reviews.filter((r) => r.createTime.startsWith(dateStr)).length,
    };
  });
}

export function getRatingDistribution(reviews: GHLReview[]): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const s = STAR_MAP[r.starRating] ?? r.rating ?? 0;
    if (s >= 1 && s <= 5) dist[s]++;
  });
  return dist;
}
