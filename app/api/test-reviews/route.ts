import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = "https://services.leadconnectorhq.com";

async function probe(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    let body: unknown;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { url, status: res.status, ok: res.ok, body };
  } catch (err) {
    return { url, status: null, ok: false, error: String(err) };
  }
}

export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId query param required" }, { status: 400 });
  }

  const rawKey = process.env.GHL_API_KEY ?? "";
  const key = rawKey.trim();

  const headers = {
    Authorization: `Bearer ${key}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const [ep1, ep2] = await Promise.all([
    probe(`${BASE_URL}/reputation/review?locationId=${locationId}&limit=5`, headers),
    probe(`${BASE_URL}/locations/${locationId}/reputation/review?limit=5`, headers),
  ]);

  return NextResponse.json({
    sentHeaders: {
      Authorization: `Bearer ${key.slice(0, 6)}...${key.slice(-4)}`,
      Version: headers.Version,
    },
    keyLength: key.length,
    rawKeyLength: rawKey.length,
    ep1,
    ep2,
  });
}
