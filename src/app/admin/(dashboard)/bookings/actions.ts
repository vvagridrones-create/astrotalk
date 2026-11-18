"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

const id = z.string().uuid();
const done = (msg: string): never => { revalidatePath("/admin/bookings"); redirect(`/admin/bookings?msg=${encodeURIComponent(msg)}`); };

const TRANSITIONS = { confirm: ["confirmed", ["pending"]], reject: ["rejected", ["pending"]], cancel: ["cancelled", ["pending", "confirmed"]] } as const;

export async function changeStatus(fd: FormData) {
  const db = await requireAdmin();
  const bid = id.parse(fd.get("id"));
  const action = z.enum(["confirm", "reject", "cancel"]).parse(fd.get("action"));
  const [status, from] = TRANSITIONS[action];
  const { data } = await db.from("bookings").update({ status }).eq("id", bid).in("status", [...from]).select("id");
  done(data?.length ? `Booking ${status}.` : "That booking can no longer be changed that way.");
}

export async function saveNotes(fd: FormData) {
  const db = await requireAdmin();
  const notes = z.string().max(2000).parse(fd.get("notes") ?? "");
  await db.from("bookings").update({ admin_notes: notes || null }).eq("id", id.parse(fd.get("id")));
  done("Notes saved.");
}

const addMin = (t: string, n: number) => { const [h, m] = t.split(":").map(Number); const x = h * 60 + m + n; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

// Admin override: ignores working hours but the database still rejects any overlap.
export async function reschedule(fd: FormData) {
  const db = await requireAdmin();
  const p = z.object({ id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^\d{2}:\d{2}$/) })
    .parse({ id: fd.get("id"), date: fd.get("date"), start: fd.get("start") });
  const { data: b } = await db.from("bookings").select("services(duration_minutes)").eq("id", p.id).in("status", ["pending", "confirmed"]).single();
  const dur = (b as any)?.services?.duration_minutes;
  if (!dur) return done("Booking not found or no longer active.");
  const end = addMin(p.start, dur);
  if (end <= p.start) return done("That time runs past midnight.");
  const { error } = await db.from("bookings").update({ appointment_date: p.date, start_time: p.start, end_time: end }).eq("id", p.id);
  done(error ? (error.code === "23P01" ? "That time overlaps another booking." : "Could not reschedule.") : "Appointment rescheduled.");
}
