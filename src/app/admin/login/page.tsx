import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(), password: String(formData.get("password") ?? ""),
  });
  if (error) redirect("/admin/login?error=1");
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (p?.role !== "admin") { await supabase.auth.signOut(); redirect("/admin/login?error=1"); }
  redirect("/admin");
}

export const metadata = { title: "Admin sign in", robots: { index: false } };

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  const cls = "w-full border border-white/25 bg-transparent px-3 py-3 text-ivory focus:border-gold focus:outline-none";
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={signIn} className="w-full max-w-sm space-y-4 text-ivory">
        <h1 className="font-serif text-3xl font-semibold">Admin sign in</h1>
        {searchParams.error && <p role="alert" className="text-sm text-red-300">Invalid credentials or not an administrator.</p>}
        <label className="block text-sm">Email<input name="email" type="email" required autoComplete="username" className={cls} /></label>
        <label className="block text-sm">Password<input name="password" type="password" required autoComplete="current-password" className={cls} /></label>
        <button className="w-full bg-gold px-4 py-3 font-medium text-navy hover:bg-gold/90">Sign in</button>
      </form>
    </main>
  );
}
