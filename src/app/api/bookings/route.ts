import { NextRequest, NextResponse } from "next/server";
import { bookingSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { buildWhatsAppMessage, whatsappUrl } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields." }, { status: 400 });
  }
  const b = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_booking", {
    p_service_id: b.serviceId, p_customer_name: b.customerName, p_phone: b.phone,
    p_email: b.email ?? "", p_dob: b.dateOfBirth, p_birth_time: b.birthTime,
    p_birth_place: b.birthPlace, p_gender: b.gender ?? null, p_message: b.message ?? "",
    p_date: b.appointmentDate, p_start: b.startTime,
  });

  if (error) {
    if (error.message.includes("slot_unavailable")) {
      return NextResponse.json({ error: "That slot was just taken. Please pick another." }, { status: 409 });
    }
    console.error("create_booking failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not save your booking." }, { status: 500 }); // no PII logged
  }

  const row = Array.isArray(data) ? data[0] : data;
  const [{ data: service }, { data: settings }] = await Promise.all([
    supabase.from("services").select("title").eq("id", b.serviceId).single(),
    supabase.from("settings").select("whatsapp_number").eq("id", 1).single(),
  ]);

  const message = buildWhatsAppMessage({
    reference: row.booking_reference, name: b.customerName, phone: b.phone,
    service: service?.title ?? "", dob: b.dateOfBirth, birthTime: b.birthTime,
    birthPlace: b.birthPlace, date: b.appointmentDate, time: b.startTime, message: b.message,
  });
  return NextResponse.json({
    reference: row.booking_reference,
    status: "Pending Confirmation",
    message, // for the copy-message fallback
    whatsappUrl: settings?.whatsapp_number ? whatsappUrl(settings.whatsapp_number, message) : null,
  });
}
