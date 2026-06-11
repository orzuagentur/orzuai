import { NextResponse } from "next/server";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json([]);
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "OrzuAI-CRM/1.0 (contact-location-autocomplete)",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const results = (await response.json()) as NominatimResult[];

  return NextResponse.json(
    results.map((item) => ({
      label: item.display_name,
      lat: item.lat,
      lon: item.lon,
    })),
  );
}
