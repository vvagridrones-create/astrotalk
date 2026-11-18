import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  await createClient().auth.signOut();
  redirect("/admin/login");
}

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-navy text-ivory">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex gap-5 text-sm">
            <Link href="/admin" className="hover:text-gold">Overview</Link>
            <Link href="/admin/bookings" className="hover:text-gold">Bookings</Link>
          </nav>
          <form action={signOut}><button className="text-sm hover:text-gold">Log out</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
