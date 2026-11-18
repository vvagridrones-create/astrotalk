import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const q = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), serviceId: z.string().uuid() });

// Dates in a month that still have at least one bookable slot (computed by the database).
export async function GET(req: NextRequest) {
  const p = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!p.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [y, m] = p.data.month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const supabase = createClient();
  const checks = await Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const date = `${p.data.month}-${String(i + 1).padStart(2, "0")}`;
      if (date < today) return null;
      const { data } = await supabase.rpc("get_available_slots", { p_date: date, p_service_id: p.data.serviceId });
      return data?.length ? date : null;
    })
  );
  return NextResponse.json({ dates: checks.filter(Boolean) });
}
