import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/site/Header";
import Reveal from "@/components/site/Reveal";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Vedic Astrology Consultations | Jathakam",
  description: "Personal Vedic astrology consultations: Jathakam analysis, kundali matching, career and dosha guidance. Book an appointment online.",
  openGraph: { title: "Vedic Astrology Consultations", description: "Book a personal Jathakam consultation online.", type: "website" },
};

const FAQ = [
  ["What information is required for Jathakam?", "Your full name, date of birth, exact time of birth and place of birth (city or village). For matching, the same details for both people."],
  ["Is exact birth time necessary?", "Yes, it matters. The birth time decides the ascendant and several chart divisions. If you only know it approximately, mention that in your message when booking."],
  ["How do I book an appointment?", "Choose a service, enter your birth details, pick an available date and time, and confirm. A WhatsApp message with your booking details opens for you to send."],
  ["Can I reschedule?", "Yes. Message on WhatsApp with your booking reference and the new time you prefer, and it will be moved if the slot is free."],
  ["How will I receive confirmation?", "Your booking is confirmed only after the astrologer replies on WhatsApp. Until then it stays pending."],
];
const STEPS = ["Select a consultation service", "Enter your birth details", "Choose a convenient appointment", "Submit your booking", "Receive confirmation through WhatsApp"];

function KundaliMotif() {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="#B99A5B" strokeWidth="1.2" aria-hidden="true" className="mx-auto w-full max-w-sm">
      <rect x="10" y="10" width="180" height="180" /><path d="M10 10L190 190M190 10L10 190" /><path d="M100 10L190 100L100 190L10 100Z" />
      <circle cx="100" cy="100" r="14" strokeWidth="0.8" />
    </svg>
  );
}

export default async function Home() {
  const db = createClient();
  const [{ data: s }, { data: services }, { data: reviews }] = await Promise.all([
    db.from("settings").select("*").eq("id", 1).single(),
    db.from("services").select("title,slug,description,price,duration_minutes").eq("is_active", true).order("created_at"),
    db.from("testimonials").select("id,customer_name,review").eq("is_published", true).order("created_at", { ascending: false }).limit(6),
  ]);
  const name = s?.astrologer_name || "Jathakam Consultations";
  const wa = s?.whatsapp_number ? `https://wa.me/${s.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent("Namaste, I would like to know more about a consultation.")}` : null;
  const trust = [
    ["Traditional Vedic approach", "Charts are read in the classical Jyotish tradition."],
    ["Personalised guidance", "Every consultation is based on your own birth details and questions."],
    ["Clear consultation", "A fixed duration and price are shown before you book."],
    ...(s?.years_experience ? [[`${s.years_experience} years of practice`, "Experience in Jathakam and Kundali matching."]] : []),
  ];
  const h2 = "font-serif text-3xl font-semibold sm:text-4xl";

  return (
    <>
      <Header name={name} whatsapp={wa} />
      <main>
        <section className="bg-navy text-ivory">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.2em] text-gold">Vedic astrology consultation</p>
              <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">Understand Your Stars. Find Clarity in Your Journey.</h1>
              <p className="mt-5 max-w-lg text-lg text-ivory/80">Personal consultations rooted in traditional Vedic astrology, from a detailed Jathakam reading to kundali matching and career guidance.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/book" className="bg-gold px-6 py-3 font-medium text-navy transition-colors hover:bg-gold/90">Book Your Consultation</Link>
                <Link href="#services" className="border border-ivory/40 px-6 py-3 transition-colors hover:border-gold hover:text-gold">Explore Services</Link>
              </div>
            </div>
            <KundaliMotif />
          </div>
        </section>

        <section className="border-b border-navy/10">
          <Reveal className="mx-auto grid max-w-6xl gap-px px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map(([t, d]) => <div key={t} className="py-4 pr-6"><h2 className="font-serif text-xl font-semibold text-navy">{t}</h2><p className="mt-1 text-sm text-ink/70">{d}</p></div>)}
          </Reveal>
        </section>

        <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <Reveal>
            <h2 className={`${h2} text-navy`}>Services</h2>
            {services?.length ? (
              <ul className="mt-8 divide-y divide-navy/15 border-y border-navy/15">
                {services.map((v) => (
                  <li key={v.slug} className="grid gap-3 py-6 md:grid-cols-[1fr_auto] md:items-center">
                    <div><h3 className="font-serif text-2xl font-semibold text-navy">{v.title}</h3><p className="mt-1 max-w-2xl text-ink/75">{v.description}</p>
                      <p className="mt-2 text-sm text-ink/60">{v.duration_minutes} minutes · ₹{Number(v.price).toLocaleString("en-IN")}</p></div>
                    <Link href={`/book?service=${v.slug}`} className="justify-self-start border border-navy px-5 py-3 text-navy transition-colors hover:bg-navy hover:text-ivory">Book Now</Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-6 text-ink/70">Services will be listed here soon.</p>}
          </Reveal>
        </section>

        {(s?.biography || s?.astrologer_name) && (
          <section id="about" className="scroll-mt-20 bg-navy text-ivory">
            <Reveal className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[320px_1fr]">
              {s.profile_image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={s.profile_image} alt={s.astrologer_name} className="aspect-[4/5] w-full object-cover" />
                : <div className="flex aspect-[4/5] items-center justify-center border border-gold/50 font-serif text-7xl text-gold">{name[0]}</div>}
              <div><h2 className={h2}>About {s.astrologer_name}</h2>
                {s.biography && <p className="mt-5 max-w-2xl whitespace-pre-line text-ivory/85">{s.biography}</p>}
                {s.years_experience ? <p className="mt-5 text-gold">{s.years_experience} years of experience</p> : null}</div>
            </Reveal>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal><h2 className={`${h2} text-navy`}>How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((t, i) => <li key={t} className="border-t-2 border-gold pt-3"><span className="font-serif text-3xl text-gold">{i + 1}</span><p className="mt-1">{t}</p></li>)}
            </ol></Reveal>
        </section>

        {!!reviews?.length && (
          <section className="border-y border-navy/10 bg-white">
            <Reveal className="mx-auto max-w-6xl px-4 py-16"><h2 className={`${h2} text-navy`}>Client words</h2>
              <div className="mt-8 grid gap-8 md:grid-cols-3">
                {reviews.map((r) => <figure key={r.id}><blockquote className="text-ink/85">{r.review}</blockquote><figcaption className="mt-3 text-sm text-gold">{r.customer_name}</figcaption></figure>)}
              </div></Reveal>
          </section>
        )}

        <section className="mx-auto max-w-3xl px-4 py-16">
          <Reveal><h2 className={`${h2} text-navy`}>Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-navy/15 border-y border-navy/15">
              {FAQ.map(([q, a]) => <details key={q} className="group py-4"><summary className="cursor-pointer font-medium text-navy">{q}</summary><p className="mt-2 text-ink/75">{a}</p></details>)}
            </div></Reveal>
        </section>
      </main>

      <footer id="contact" className="scroll-mt-20 bg-navy pb-24 text-ivory md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
          <div><p className="font-serif text-2xl">{name}</p><p className="mt-2 max-w-sm text-sm text-ivory/70">Appointment times are in Indian Standard Time.</p></div>
          <ul className="space-y-2 text-sm">
            {wa && <li><a href={wa} className="hover:text-gold">WhatsApp consultation</a></li>}
            {s?.contact_number && <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0" /><a href={`tel:${s.contact_number.replace(/\s/g, "")}`}>{s.contact_number}</a></li>}
            {s?.email && <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0" /><a href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s?.address && <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /><span>{s.address}</span></li>}
          </ul>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-ivory/50">&copy; {new Date().getFullYear()} {name}</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/40 bg-navy p-3 md:hidden">
        <Link href="/book" className="block bg-gold py-3 text-center font-medium text-navy">Book Your Consultation</Link>
      </div>
    </>
  );
}
