"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { bookingSchema } from "@/lib/schemas";

type Service = { id: string; title: string; description: string; price: number; duration_minutes: number };
const detailsSchema = bookingSchema.pick({
  customerName: true, phone: true, email: true, dateOfBirth: true,
  birthTime: true, birthPlace: true, gender: true, message: true,
});
type Details = z.infer<typeof detailsSchema>;
type Done = { reference: string; message: string; whatsappUrl: string | null };

const STEPS = ["Service", "Your details", "Appointment", "Review"];
const input = "w-full border border-navy/25 bg-white px-3 py-3 text-base focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold";
const btnPrimary = "bg-navy px-6 py-3 text-ivory transition-colors hover:bg-navy/90 disabled:opacity-50";
const btnGhost = "border border-navy/30 px-6 py-3 transition-colors hover:border-navy";

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", weekday: "short", timeZone: "UTC" });
const fmtTime = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  );
}

function Calendar({ serviceId, value, onPick }: { serviceId: string; value: string; onPick: (d: string) => void }) {
  const now = new Date(Date.now() + 5.5 * 3600e3);
  const [ym, setYm] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
  const [avail, setAvail] = useState<Set<string> | null>(null);
  const key = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;

  useEffect(() => {
    let live = true; setAvail(null);
    fetch(`/api/availability-dates?month=${key}&serviceId=${serviceId}`)
      .then((r) => r.json()).then((j) => live && setAvail(new Set(j.dates ?? [])))
      .catch(() => live && setAvail(new Set()));
    return () => { live = false; };
  }, [key, serviceId]);

  const lead = new Date(Date.UTC(ym.y, ym.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const atCurrent = ym.y === now.getUTCFullYear() && ym.m === now.getUTCMonth();
  const step = (n: number) => setYm(({ y, m }) => { const t = new Date(Date.UTC(y, m + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });

  return (
    <div className="border border-navy/20 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} disabled={atCurrent} aria-label="Previous month" className="p-2 disabled:opacity-30"><ChevronLeft size={20} /></button>
        <span className="font-serif text-xl font-semibold">{new Date(Date.UTC(ym.y, ym.m, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
        <button type="button" onClick={() => step(1)} aria-label="Next month" className="p-2"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-ink/60">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${key}-${String(i + 1).padStart(2, "0")}`;
          const ok = avail?.has(date); const sel = value === date;
          return (
            <button key={date} type="button" disabled={!ok} onClick={() => onPick(date)} aria-pressed={sel}
              className={`h-11 text-sm transition-colors ${sel ? "bg-navy text-ivory" : ok ? "border border-gold/60 hover:bg-gold/15" : "text-ink/25"}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink/60">{avail === null ? "Checking availability…" : avail.size ? "Outlined dates have open slots." : "No open dates this month."}</p>
    </div>
  );
}

export default function BookingFlow({ services, initialServiceId }: { services: Service[]; initialServiceId?: string }) {
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<{ start: string; end: string }[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<Details>({ resolver: zodResolver(detailsSchema), mode: "onTouched" });
  const { register, handleSubmit, getValues, formState: { errors } } = form;
  const service = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!date || !serviceId) return;
    let live = true; setSlots(null); setSlot("");
    fetch(`/api/slots?date=${date}&serviceId=${serviceId}`).then((r) => r.json())
      .then((j) => live && setSlots(j.slots ?? [])).catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [date, serviceId]);

  async function submit() {
    setBusy(true); setErr("");
    const v = getValues();
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, serviceId, appointmentDate: date, startTime: slot }),
    });
    const j = await res.json(); setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "Something went wrong.");
      if (res.status === 409) { setSlot(""); setSlots(null); fetch(`/api/slots?date=${date}&serviceId=${serviceId}`).then((r) => r.json()).then((x) => setSlots(x.slots ?? [])); setStep(2); }
      return;
    }
    setDone(j);
    if (j.whatsappUrl) window.open(j.whatsappUrl, "_blank", "noopener");
  }

  if (done) {
    return (
      <section className="border border-gold/50 bg-white p-6" aria-live="polite">
        <h2 className="font-serif text-3xl font-semibold text-navy">Booking saved</h2>
        <p className="mt-2">Reference: <strong>{done.reference}</strong> · Status: Pending Confirmation</p>
        <p className="mt-3 text-ink/80">Your appointment is not confirmed until you send the WhatsApp message and the astrologer confirms it.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {done.whatsappUrl && <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Open WhatsApp</a>}
          <button type="button" className={`${btnGhost} inline-flex items-center gap-2`} onClick={async () => { await navigator.clipboard.writeText(done.message); setCopied(true); }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy message"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div>
      <ol className="mb-6 flex gap-2 text-xs sm:text-sm" aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} className={`flex-1 border-t-2 pt-2 ${i <= step ? "border-gold text-navy" : "border-navy/15 text-ink/50"}`}>{i + 1}. {s}</li>)}
      </ol>

      {step === 0 && (
        <fieldset className="space-y-3">
          <legend className="sr-only">Select a service</legend>
          {services.map((s) => (
            <label key={s.id} className={`block cursor-pointer border p-4 ${serviceId === s.id ? "border-gold bg-white" : "border-navy/20 hover:border-navy/50"}`}>
              <input type="radio" name="service" className="sr-only" checked={serviceId === s.id} onChange={() => { setServiceId(s.id); setDate(""); setSlot(""); }} />
              <span className="flex items-baseline justify-between gap-4"><span className="font-serif text-xl font-semibold">{s.title}</span><span className="shrink-0 text-sm">₹{Number(s.price).toLocaleString("en-IN")} · {s.duration_minutes} min</span></span>
              {s.description && <span className="mt-1 block text-sm text-ink/70">{s.description}</span>}
            </label>
          ))}
          <button type="button" disabled={!serviceId} onClick={() => setStep(1)} className={btnPrimary}>Continue</button>
        </fieldset>
      )}

      {step === 1 && (
        <form onSubmit={handleSubmit(() => setStep(2))} className="space-y-4" noValidate>
          <Field label="Full name" error={errors.customerName?.message}><input className={input} autoComplete="name" {...register("customerName")} /></Field>
          <Field label="Mobile number" error={errors.phone?.message}><input className={input} inputMode="numeric" autoComplete="tel-national" maxLength={10} {...register("phone")} /></Field>
          <Field label="Email (optional)" error={errors.email?.message}><input className={input} type="email" autoComplete="email" {...register("email")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth" error={errors.dateOfBirth?.message}><input className={input} type="date" max={new Date().toISOString().slice(0, 10)} {...register("dateOfBirth")} /></Field>
            <Field label="Time of birth" error={errors.birthTime?.message}><input className={input} type="time" {...register("birthTime")} /></Field>
          </div>
          <Field label="Birthplace (city or village)" error={errors.birthPlace?.message}><input className={input} {...register("birthPlace")} /></Field>
          <Field label="Gender (optional)"><select className={input} {...register("gender", { setValueAs: (v) => v || undefined })}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
          <Field label="Questions or message (optional)" error={errors.message?.message}><textarea rows={3} className={input} {...register("message")} /></Field>
          <div className="flex gap-3"><button type="button" onClick={() => setStep(0)} className={btnGhost}>Back</button><button className={btnPrimary}>Continue</button></div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Calendar serviceId={serviceId} value={date} onPick={setDate} />
          {date && (
            <div>
              <h2 className="mb-2 font-serif text-xl font-semibold">{fmtDate(date)}</h2>
              {slots === null ? <p className="text-sm">Loading slots…</p> : slots.length === 0 ? <p className="text-sm">No slots left on this date. Please pick another.</p> : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => <button key={s.start} type="button" aria-pressed={slot === s.start} onClick={() => setSlot(s.start)}
                    className={`h-12 text-sm transition-colors ${slot === s.start ? "bg-navy text-ivory" : "border border-navy/25 bg-white hover:border-gold"}`}>{fmtTime(s.start)}</button>)}
                </div>
              )}
            </div>
          )}
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <div className="flex gap-3"><button type="button" onClick={() => setStep(1)} className={btnGhost}>Back</button><button type="button" disabled={!slot} onClick={() => { setErr(""); setStep(3); }} className={btnPrimary}>Review</button></div>
        </div>
      )}

      {step === 3 && service && (() => {
        const v = getValues();
        const rows: [string, string, number][] = [
          ["Service", `${service.title} (${service.duration_minutes} min, ₹${Number(service.price).toLocaleString("en-IN")})`, 0],
          ["Name", v.customerName, 1], ["Mobile", v.phone, 1], ["Email", v.email || "-", 1],
          ["Date of birth", fmtDate(v.dateOfBirth), 1], ["Birth time", fmtTime(v.birthTime), 1], ["Birthplace", v.birthPlace, 1],
          ["Appointment", `${fmtDate(date)}, ${fmtTime(slot)} IST`, 2],
        ];
        return (
          <div>
            <dl className="divide-y divide-navy/10 border border-navy/20 bg-white">
              {rows.map(([k, val, to]) => (
                <div key={k} className="flex items-start justify-between gap-4 p-3 text-sm">
                  <div><dt className="text-ink/60">{k}</dt><dd className="font-medium">{val}</dd></div>
                  <button type="button" onClick={() => setStep(to)} className="shrink-0 text-gold underline underline-offset-4">Edit</button>
                </div>
              ))}
            </dl>
            {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
            <p className="mt-4 text-sm text-ink/70">Confirming saves your request and opens WhatsApp. The booking is only confirmed once the astrologer replies.</p>
            <div className="mt-4 flex gap-3"><button type="button" onClick={() => setStep(2)} className={btnGhost}>Back</button><button type="button" onClick={submit} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Confirm Booking"}</button></div>
          </div>
        );
      })()}
    </div>
  );
}
