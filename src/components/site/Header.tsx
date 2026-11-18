"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, MessageCircle } from "lucide-react";

const links = [["Home", "/"], ["About", "/#about"], ["Services", "/#services"], ["Book Consultation", "/book"], ["Contact", "/#contact"]];

export default function Header({ name, whatsapp }: { name: string; whatsapp: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-navy text-ivory">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-wide">{name}</Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          {links.map(([l, h]) => <Link key={l} href={h} className="transition-colors hover:text-gold">{l}</Link>)}
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-gold px-4 py-2 text-gold transition-colors hover:bg-gold hover:text-navy"><MessageCircle size={16} />WhatsApp</a>}
        </nav>
        <button className="p-2 md:hidden" aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-white/10 px-4 pb-4 md:hidden">
          {links.map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="block py-3 text-lg">{l}</Link>)}
          {whatsapp && <a href={whatsapp} className="mt-2 block border border-gold py-3 text-center text-gold">WhatsApp consultation</a>}
        </nav>
      )}
    </header>
  );
}
