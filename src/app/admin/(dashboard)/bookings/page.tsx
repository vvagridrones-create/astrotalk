import { requireAdmin, fmtDate, fmtTime } from "@/lib/admin";
import { changeStatus, saveNotes, reschedule } from "./actions";

export const dynamic = "force-dynamic";
const STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"];
const badge: Record<string, string> = { pending: "bg-gold/20", confirmed: "bg-green-100", rejected: "bg-red-100", cancelled: "bg-red-100", completed: "bg-navy/10" };
const field = "border border-navy/25 bg-white px-2 py-2 text-sm";
const btn = "border border-navy/30 px-3 py-2 text-sm hover:border-navy";

type Sp = { q?: string; status?: string; date?: string; service?: string; msg?: string };

export default async function Bookings({ searchParams: sp }: { searchParams: Sp }) {
  const db = await requireAdmin();
  const { data: services } = await db.from("services").select("id,title").order("title");
  let q = db.from("bookings").select("*, services(title)").order("appointment_date", { ascending: false }).order("start_time").limit(200);
  const s = (sp.q ?? "").replace(/[^\p{L}\p{N} +]/gu, "").trim();
  if (s) q = q.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
  if (sp.status && STATUSES.includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)) q = q.eq("appointment_date", sp.date);
  if (sp.service && /^[0-9a-f-]{36}$/.test(sp.service)) q = q.eq("service_id", sp.service);
  const { data: rows } = await q;

  return (
    <>
      <h1 className="font-serif text-4xl font-semibold text-navy">Bookings</h1>
      {sp.msg && <p role="status" className="mt-4 border border-gold/50 bg-white p-3 text-sm">{sp.msg}</p>}
      <form className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name or phone" className={`${field} w-48`} />
        <select name="status" defaultValue={sp.status ?? ""} className={field}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        <select name="service" defaultValue={sp.service ?? ""} className={field}><option value="">All services</option>{services?.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        <input name="date" type="date" defaultValue={sp.date} className={field} />
        <button className="bg-navy px-4 py-2 text-sm text-ivory">Filter</button>
      </form>

      <div className="mt-6 overflow-x-auto border border-navy/15 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy/5 text-xs uppercase tracking-wide"><tr>
            {["Ref", "Customer", "Service", "Appointment (IST)", "Status"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}
          </tr></thead>
          {rows?.map((b) => (
            <tbody key={b.id} className="border-t border-navy/10 align-top">
              <tr>
                <td className="p-3 font-mono text-xs">{b.booking_reference}</td>
                <td className="p-3">{b.customer_name}<br /><span className="text-ink/60">{b.phone}</span></td>
                <td className="p-3">{b.services?.title}</td>
                <td className="p-3">{fmtDate(b.appointment_date)}<br />{fmtTime(b.start_time)}</td>
                <td className="p-3"><span className={`px-2 py-1 text-xs ${badge[b.status]}`}>{b.status}</span></td>
              </tr>
              <tr><td colSpan={5} className="px-3 pb-3">
                <details>
                  <summary className="cursor-pointer text-gold">Details and actions</summary>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <dl className="space-y-1">
                      {[["Date of birth", fmtDate(b.date_of_birth)], ["Birth time", fmtTime(b.birth_time)], ["Birthplace", b.birth_place], ["Gender", b.gender ?? "-"], ["Email", b.email ?? "-"], ["Message", b.additional_message ?? "-"]].map(([k, v]) => <div key={k}><dt className="inline text-ink/60">{k}: </dt><dd className="inline">{v}</dd></div>)}
                    </dl>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(["confirm", "reject", "cancel"] as const).filter((a) => a === "cancel" ? ["pending", "confirmed"].includes(b.status) : b.status === "pending").map((a) => (
                          <form key={a} action={changeStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="action" value={a} /><button className={btn}>{a[0].toUpperCase() + a.slice(1)}</button></form>
                        ))}
                        <a className={btn} href={`https://wa.me/91${b.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
                      </div>
                      {["pending", "confirmed"].includes(b.status) && (
                        <form action={reschedule} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={b.id} />
                          <input name="date" type="date" required defaultValue={b.appointment_date} className={field} />
                          <input name="start" type="time" required defaultValue={b.start_time.slice(0, 5)} className={field} />
                          <button className={btn}>Reschedule</button></form>
                      )}
                      <form action={saveNotes} className="space-y-2"><input type="hidden" name="id" value={b.id} />
                        <textarea name="notes" rows={2} maxLength={2000} defaultValue={b.admin_notes ?? ""} placeholder="Internal notes" className={`${field} w-full`} />
                        <button className={btn}>Save notes</button></form>
                    </div>
                  </div>
                </details>
              </td></tr>
            </tbody>
          ))}
        </table>
        {!rows?.length && <p className="p-4 text-sm text-ink/60">No bookings match.</p>}
      </div>
    </>
  );
}
