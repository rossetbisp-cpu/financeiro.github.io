export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const compactBrl = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return brl(n);
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Deterministic color for partner avatars
export function colorFromString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.55 0.12 ${hue})`;
}

export function initials(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export const BRANDS = [
  "VALISERE",
  "ÁGUA DOCE",
  "CIA.MARÍTIMA",
  "TRIUMPH",
  "BODY FOR SURE",
] as const;

export type Brand = (typeof BRANDS)[number];

export const RATEIO_PRESETS: { label: string; brands: Brand[] }[] = [
  { label: "Valisere + Água Doce", brands: ["VALISERE", "ÁGUA DOCE"] },
  { label: "SP (Valisere + BFS + Cia.Marítima)", brands: ["VALISERE", "BODY FOR SURE", "CIA.MARÍTIMA"] },
  { label: "RJ (Triumph)", brands: ["TRIUMPH"] },
  { label: "Designer Vinícius (Valisere + BFS + Cia)", brands: ["VALISERE", "BODY FOR SURE", "CIA.MARÍTIMA"] },
  { label: "Neomode (Cia + Valisere + BFS)", brands: ["CIA.MARÍTIMA", "VALISERE", "BODY FOR SURE"] },
  { label: "Todas as marcas", brands: [...BRANDS] },
];