import { requireAdmin, istToday } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const db = await requireAdmin();
  const today = istToday();
  const count = async (f: (q: any) => any) => (await f(db.from("bookings").select("id", { count: "exact", head: true }))).count ?? 0;
  const [total, todays, pending, confirmed, cancelled, upcoming] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("appointment_date", today).in("status", ["pending", "confirmed"])),
    count((q) => q.eq("status", "pending")),
    count((q) => q.eq("status", "confirmed")),
    count((q) => q.eq("status", "cancelled")),
    count((q) => q.gte("appointment_date", today).in("status", ["pending", "confirmed"])),
  ]);
  const stats = [["Total bookings", total], ["Today's appointments", todays], ["Pending confirmations", pending], ["Confirmed", confirmed], ["Cancelled", cancelled], ["Upcoming", upcoming]];
  return (
    <>
      <h1 className="font-serif text-4xl font-semibold text-navy">Overview</h1>
      <dl className="mt-6 grid grid-cols-2 gap-px border border-navy/15 bg-navy/15 md:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k as string} className="bg-white p-5"><dt className="text-sm text-ink/60">{k}</dt><dd className="mt-1 font-serif text-4xl text-navy">{v as number}</dd></div>
        ))}
      </dl>
    </>
  );
}
