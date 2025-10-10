"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ThemeColorUpdater() {
  const pathname = usePathname();

  useEffect(() => {
    // Prefer the one emitted by `export const viewport`
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }

    const pick = (p: string) => {
      if (p === "/") return "#1e1b4b";            // indigo-950
      if (p.startsWith("/expenses")) return "#78350f"; // amber-950
      if (p.startsWith("/income")) return "#064e3b";   // emerald-950
      if (p.startsWith("/debts")) return "#881337";    // rose-950
      if (p.startsWith("/overflow")) return "#1E0D42"; // indigo-purple night
      return "#000000";
    };

    meta.setAttribute("content", pick(pathname));
  }, [pathname]);

  return null;
}
