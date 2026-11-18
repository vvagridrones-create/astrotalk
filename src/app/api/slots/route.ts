import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), serviceId: z.string().uuid() });

export async function GET(req: NextRequest) {
  const parsed = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await createClient().rpc("get_available_slots", {
    p_date: parsed.data.date, p_service_id: parsed.data.serviceId,
  });
  if (error) return NextResponse.json({ error: "Could not load slots" }, { status: 500 });
  return NextResponse.json({
    timezone: "Asia/Kolkata",
    slots: (data ?? []).map((s: { start_time: string; end_time: string }) => ({
      start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5),
    })),
  });
}
