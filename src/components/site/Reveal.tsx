"use client";
import { useEffect, useRef, useState } from "react";

// Gentle fade-in when a section scrolls into view.
export default function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`transition-all duration-700 ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} ${className}`}>{children}</div>;
}
