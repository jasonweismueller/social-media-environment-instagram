// avatar-utils.js
// Small helper to provide real-photo male/female and varied company logos.
// Company logos are SVG data URLs with diverse shapes and backgrounds.

import { uid } from "./utils";

// --- tiny color sets (safe contrast + variety)
const PALETTE = ["#2563eb","#16a34a","#dc2626","#a855f7","#0891b2","#fb923c","#ef4444","#0ea5e9","#059669","#7c3aed"];
const BG_LIGHT = ["#ffffff","#f8fafc","#f3f4f6","#e5e7eb","#e2e8f0","#fef3c7","#fee2e2","#ecfeff","#f0fdf4"];
const BG_DARK  = ["#0f172a","#111827","#1f2937","#334155","#1e293b","#0b1020","#111111"];
const BG_VIVID = ["#0ea5e9","#22c55e","#ef4444","#a855f7","#f59e0b","#06b6d4","#e11d48","#84cc16","#6366f1"];

const svgToDataUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

function hashToIndex(seed, len) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}
const pick = (seed, arr) => arr[hashToIndex(seed, arr.length)];

function hexToRgb(hex){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return {r:0,g:0,b:0};
  return { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) };
}
function luma(hex){
  const {r,g,b} = hexToRgb(hex);
  const s = [r/255,g/255,b/255].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2];
}
function contrastText(bg){ return luma(bg) < 0.45 ? "#ffffff" : "#111827"; }

function getInitials(label = "", fallback = "") {
  const clean = String(label).trim();
  if (clean) {
    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]).join("").toUpperCase();
  }
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = ABC[hashToIndex(fallback + "::a", ABC.length)];
  const b = ABC[hashToIndex(fallback + "::b", ABC.length)];
  return (a + b).toUpperCase();
}

// Varied company logos
export function makeCompanyLogoSVG(seed = "", label = "") {
  const idx = hashToIndex("logo::" + seed, PALETTE.length);
  const A = PALETTE[idx];
  const B = PALETTE[(idx + 3) % PALETTE.length];
  const C = PALETTE[(idx + 6) % PALETTE.length];

  const bgMode = pick(seed + "::bgmode", ["light","dark","vivid","gradient"]);
  const bgPick = (arr, sfx="") => arr[hashToIndex(seed + sfx, arr.length)];
  const bg1 = bgMode === "light" ? bgPick(BG_LIGHT,"::bg1")
            : bgMode === "dark"  ? bgPick(BG_DARK,"::bg1")
            : bgMode === "vivid" ? bgPick(BG_VIVID,"::bg1")
            : bgPick([...BG_DARK, ...BG_VIVID, ...BG_LIGHT], "::bg1");
  const bg2 = bgMode === "gradient"
    ? bgPick([...BG_VIVID, ...PALETTE, ...BG_DARK, ...BG_LIGHT], "::bg2")
    : null;

  const useGradient = bgMode === "gradient" && bg2 && bg2 !== bg1;
  const textColor = useGradient ? "#ffffff" : contrastText(bg1);
  const borderRadius = [0,6,10,12,16,22,28][hashToIndex(seed + "::r", 7)];
  const initials = getInitials(label, seed);
  const template = pick(seed, [
    "shield","hex","rounded-rect","monogram-circle","chat-bubble",
    "cog","bag","building","ribbon","wordmark"
  ]);

  let inner = "";
  switch (template) {
    case "shield":
      inner = `<path d="M32 6l20 8v14c0 10-9 18-20 22C21 46 12 38 12 28V14l20-8z" fill="${A}"/><text x="32" y="32" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="18" fill="${textColor}">${initials}</text>`;
      break;
    case "hex":
      inner = `<path d="M16 12l16-8 16 8v16l-16 8-16-8z" fill="${A}" opacity=".95"/><path d="M18 14l14-7 14 7v12l-14 7-14-7z" fill="${B}" opacity=".6"/><text x="32" y="34" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="16" fill="${textColor}">${initials}</text>`;
      break;
    case "rounded-rect":
      inner = `<rect x="8" y="12" width="48" height="32" rx="10" fill="${A}"/><circle cx="20" cy="28" r="6" fill="${B}"/><rect x="30" y="22" width="18" height="12" rx="6" fill="${C}" opacity=".85"/><text x="32" y="38" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="${textColor}">${initials}</text>`;
      break;
    case "monogram-circle":
      inner = `<circle cx="32" cy="32" r="22" fill="${A}"/><circle cx="32" cy="32" r="18" fill="${B}" opacity=".25"/><text x="32" y="37" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="18" fill="${textColor}">${initials}</text>`;
      break;
    case "chat-bubble":
      inner = `<rect x="10" y="14" width="44" height="26" rx="10" fill="${A}"/><path d="M20 40l6-6h20l6 6" fill="${A}"/><circle cx="22" cy="27" r="3" fill="${C}"/><circle cx="32" cy="27" r="3" fill="${C}"/><circle cx="42" cy="27" r="3" fill="${C}"/>`;
      break;
    case "cog":
      inner = `<g transform="translate(32 32)"><circle r="12" fill="${A}"/>${
        Array.from({length:8}).map((_,i)=>{
          const a = i*45*Math.PI/180; const x=Math.cos(a)*20; const y=Math.sin(a)*20;
          return `<rect x="${x-3}" y="${y-6}" width="6" height="12" rx="2" transform="rotate(${i*45} ${x} ${y})" fill="${B}"/>`;
        }).join("")
      }<circle r="6" fill="${C}"/></g>`;
      break;
    case "bag":
      inner = `<rect x="18" y="20" width="28" height="26" rx="4" fill="${A}"/><path d="M22 20c0-6 20-6 20 0" fill="none" stroke="${C}" stroke-width="3"/><circle cx="28" cy="31" r="2" fill="#fff"/><circle cx="36" cy="31" r="2" fill="#fff"/>`;
      break;
    case "building":
      inner = `<rect x="16" y="18" width="32" height="28" rx="2" fill="${A}"/>${[20,26,32,38,44].map(x=>`<rect x="${x-2}" y="22" width="4" height="6" rx="1" fill="#fff" opacity=".95"/>`).join("")}${[20,26,32,38,44].map(x=>`<rect x="${x-2}" y="30" width="4" height="6" rx="1" fill="#fff" opacity=".8"/>`).join("")}<rect x="28" y="36" width="8" height="10" rx="2" fill="${C}"/>`;
      break;
    case "ribbon":
      inner = `<rect x="10" y="16" width="44" height="20" rx="6" fill="${A}"/><path d="M18 36l6 10 6-10" fill="${B}"/><path d="M34 36l6 10 6-10" fill="${B}"/><text x="32" y="30" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="${textColor}">${initials}</text>`;
      break;
    case "wordmark":
    default:
      inner = `<rect x="6" y="18" width="52" height="24" rx="6" fill="${A}"/><text x="32" y="35" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="14" fill="${textColor}" letter-spacing=".5">${initials}</text>`;
      break;
  }

  const gid = "g" + hashToIndex(seed + "::gid", 1e6);
  const gradientDefs = useGradient
    ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>`
    : "";
  const bgFill = useGradient ? `url(#${gid})` : bg1;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="96" height="96">${gradientDefs}<rect width="64" height="64" rx="${borderRadius}" fill="${bgFill}"/>${inner}</svg>`;
  return svgToDataUrl(svg);
}

// Return a URL for the avatar depending on the kind.
// - "female"/"male" -> rely on your project's real-photo function
// - "company" -> SVG data URL logo
// - "any" -> mix (40% company, 30% female, 30% male)
export function randomAvatarByKind(kind = "any", seed = "", label = "", realPhotoFn) {
  if (kind === "company") return makeCompanyLogoSVG(seed || uid(), label);
  if (typeof realPhotoFn === "function") {
    if (kind === "female") return realPhotoFn("female");
    if (kind === "male")   return realPhotoFn("male");
  }
  // fallback mixing
  const r = Math.random();
  if (r < 0.4) return makeCompanyLogoSVG(seed || uid(), label);
  if (r < 0.7) return (realPhotoFn && realPhotoFn("female")) || "";
  return (realPhotoFn && realPhotoFn("male")) || "";
}