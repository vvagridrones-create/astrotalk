import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = { title: "Book a Consultation | Jathakam" };
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: { service?: string } }) {
  const { data: services } = await createClient()
    .from("services").select("id,title,slug,description,price,duration_minutes")
    .eq("is_active", true).order("created_at");
  const initial = services?.find((s) => s.slug === searchParams.service)?.id;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
      <Link href="/" className="text-sm text-ink/70 underline-offset-4 hover:underline">&larr; Back to home</Link>
      <h1 className="mt-4 font-serif text-4xl font-semibold text-navy">Book your consultation</h1>
      <p className="mt-2 text-ink/70">All appointment times are in Indian Standard Time (Asia/Kolkata).</p>
      <div className="mt-8">
        {services?.length
          ? <BookingFlow services={services} initialServiceId={initial} />
          : <p className="border border-navy/20 p-4">Bookings are not open yet. Please check back soon.</p>}
      </div>
    </main>
  );
}
