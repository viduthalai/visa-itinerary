import { NextResponse } from "next/server";
import { getAirport } from "@/lib/airports";
import { searchFlights } from "@/lib/flightSearch";

/**
 * Server-side so the provider token never reaches the browser.
 * GET /api/flights?origin=JFK&destination=MUC&date=2026-10-15
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const origin = (params.get("origin") ?? "").trim().toUpperCase();
  const destination = (params.get("destination") ?? "").trim().toUpperCase();
  const date = (params.get("date") ?? "").trim();

  if (!getAirport(origin)) {
    return NextResponse.json({ error: "Unknown origin airport" }, { status: 400 });
  }
  if (!getAirport(destination)) {
    return NextResponse.json({ error: "Unknown destination airport" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (origin === destination) {
    return NextResponse.json({ error: "Origin and destination are the same" }, { status: 400 });
  }

  const result = await searchFlights({ origin, destination, date });
  return NextResponse.json(result);
}
