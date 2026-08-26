import { useState, useRef, useEffect, useCallback } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#FAF7F4", card:"#FFFFFF", border:"#EDE8E3",
  accent:"#E8837A", accentSoft:"#E8837A18", peach:"#F2A98A", peachSoft:"#F2A98A15",
  text:"#2C2420", muted:"#9E8E87", faint:"#F5F0EC",
  green:"#5BAA82", greenSoft:"#5BAA8215",
  red:"#D95F5F", redSoft:"#D95F5F12",
  blue:"#6B9FBF", blueSoft:"#6B9FBF15",
  purple:"#9B8ABF", purpleSoft:"#9B8ABF15",
  orange:"#E8A87A", orangeSoft:"#E8A87A15",
  shadow:"0 2px 12px rgba(44,36,32,0.07)",
  shadowMd:"0 4px 24px rgba(44,36,32,0.12)",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-6";
const APP_VERSION = "v2.0";
const STORAGE_KEY = "skinritual_v4";
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SKIN_TYPES  = ["Dry","Oily","Combination","Normal","Sensitive","Acne-prone"];
const CONCERNS    = ["Acne / Breakouts","Blackheads / Whiteheads","Oiliness","Dryness / Flakiness","Sensitivity / Redness","Hyperpigmentation","Dark spots / Melasma","Fine lines / Wrinkles","Enlarged pores","Dullness / Texture","Dark circles","Sagging / Firmness","Rosacea","Eczema / Psoriasis","Scarring"];
const FREQS       = {daily:"Daily","twice-weekly":"2×/week",weekly:"Weekly","bi-weekly":"Every 2 wks",monthly:"Monthly","6-weekly":"Every 6 wks","8-weekly":"Every 8 wks"};
const FREQ_DAYS   = {daily:1,"twice-weekly":3,weekly:7,"bi-weekly":14,monthly:30,"6-weekly":42,"8-weekly":56};

const CONFLICT_PAIRS = [
  ["glycolic acid","retinol"],["aha","retinol"],["bha","retinol"],
  ["lactic acid","retinol"],["salicylic acid","retinol"],
  ["vitamin c","retinol"],["ascorbic acid","retinol"],
  ["benzoyl peroxide","retinol"],["benzoyl peroxide","vitamin c"],
  ["glycolic acid","lactic acid"],["aha","bha"],["niacinamide","vitamin c"],
];

const SUGGESTIONS = [
  "Cleanser","Foaming Cleanser","Gel Cleanser","Cream Cleanser","Oil Cleanser","Micellar Water","Balm Cleanser",
  "Toner","Hydrating Toner","Essence",
  "Vitamin C Serum","Vitamin C (Ascorbic Acid)","Niacinamide Serum","Hyaluronic Acid Serum",
  "Retinol","Retinoid","Tretinoin","Adapalene","Bakuchiol",
  "Salicylic Acid","BHA Exfoliant","Glycolic Acid","AHA Exfoliant","Lactic Acid","Mandelic Acid",
  "Azelaic Acid","Benzoyl Peroxide","Kojic Acid","Alpha Arbutin",
  "Moisturizer","Night Cream","Gel Moisturizer","Barrier Cream","Ceramide Moisturizer",
  "Eye Cream","SPF 30","SPF 50","Mineral Sunscreen","Chemical Sunscreen","Tinted SPF",
  "Face Oil","Rosehip Oil","Squalane","Jojoba Oil",
  "Clay Mask","Sheet Mask","Sleeping Mask","Exfoliant (AHA/BHA)",
  "LED Light Therapy","Microneedling","Gua Sha",
  "Scalp Serum","Scalp Treatment","Lip Balm","Neck Cream",
];

const PRODUCT_COLORS = {
  cleanser:{bg:T.blueSoft,border:T.blue,text:T.blue},
  exfoliant:{bg:T.purpleSoft,border:T.purple,text:T.purple},
  retinol:{bg:T.orangeSoft,border:T.orange,text:T.orange},
  serum:{bg:T.greenSoft,border:T.green,text:T.green},
  moisturizer:{bg:"#E8D5B715",border:"#C4A882",text:"#8A6E4E"},
  spf:{bg:"#FFE08A20",border:"#D4A017",text:"#8A6010"},
  mask:{bg:T.blueSoft,border:T.blue,text:T.blue},
  default:{bg:T.accentSoft,border:T.accent,text:T.accent},
};
const pcolor = p => {
  const g = (p.genericName||"").toLowerCase();
  if(g.includes("cleanser")||g.includes("wash")) return PRODUCT_COLORS.cleanser;
  if(g.includes("exfoliant")||g.includes("aha")||g.includes("bha")||g.includes("acid")) return PRODUCT_COLORS.exfoliant;
  if(g.includes("retinol")||g.includes("retinoid")||g.includes("tretinoin")) return PRODUCT_COLORS.retinol;
  if(g.includes("serum")||g.includes("vitamin c")||g.includes("niacinamide")) return PRODUCT_COLORS.serum;
  if(g.includes("moisturizer")||g.includes("cream")||g.includes("lotion")) return PRODUCT_COLORS.moisturizer;
  if(g.includes("spf")||g.includes("sunscreen")) return PRODUCT_COLORS.spf;
  if(g.includes("mask")) return PRODUCT_COLORS.mask;
  return PRODUCT_COLORS.default;
};

const productMatches = (p, kw) =>
  [p.genericName,p.brandName,p.notes].some(f=>f&&f.toLowerCase().includes(kw.toLowerCase()));

// @qa:ingredientLogic:start
// Ingredient CATEGORIES (keyword-based) so ALL retinoids (incl. tretinoin, A313,
// "retinoid cream") and ALL acids/exfoliants are recognised — not just the literal
// word "retinol". This drives both conflict separation and forced AM/PM sessions.
const _kwRe = {}; // cache compiled regexes per keyword
const hasKeyword = (hay, kw) => {
  if(!_kwRe[kw]) _kwRe[kw] = new RegExp("(^|[^a-z0-9])" + kw.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "([^a-z0-9]|$)", "i");
  return _kwRe[kw].test(hay);
};
const INGREDIENT_CATEGORIES = {
  retinoid:    ["retinol","retinoid","retinal","retinaldehyde","tretinoin","tretinoina","ret-avit","adapalene","tazarotene","retin-a","retinyl","vitamin a","a313","pommade"],
  exfoliant:   ["aha","bha","pha","glycolic","lactic","salicylic","mandelic","azelaic","exfoliant","exfoliating","peeling","peel","microfoliant","enzyme"],
  vitaminc:    ["vitamin c","ascorbic","ascorbyl"],
  niacinamide: ["niacinamide","nicotinamide"],
  benzoyl:     ["benzoyl peroxide","benzoyl"],
};
const productCategories = (p) => {
  const hay = [p.genericName,p.brandName,p.notes].filter(Boolean).join(" ").toLowerCase();
  const cats = new Set();
  for(const cat in INGREDIENT_CATEGORIES)
    if(INGREDIENT_CATEGORIES[cat].some(k=>hasKeyword(hay,k))) cats.add(cat);
  return cats;
};
// Category pairs that must NEVER land on the same day — either harmful together,
// or redundant (no point doubling up the same active).
const CONFLICT_CATEGORIES = [
  ["retinoid","exfoliant"], // tretinoin/retinol + AHA/BHA — classic barrier-wrecker
  ["retinoid","retinoid"],  // NEVER two retinoids the same day (tretinoin + retinol + A313)
  ["retinoid","vitaminc"],  // keep apart (pH + irritation)
  ["retinoid","benzoyl"],   // benzoyl oxidises/deactivates retinoids
  ["exfoliant","exfoliant"],// never stack two exfoliants the same day
  ["exfoliant","vitaminc"], // low-pH acid + vitamin C = irritation for many
  ["vitaminc","vitaminc"],  // redundant — one vitamin C is enough
  ["niacinamide","niacinamide"], // redundant — two niacinamides is pointless
  ["benzoyl","vitaminc"],
];
const productsConflict = (a,b) => {
  const ca=productCategories(a), cb=productCategories(b);
  for(const [x,y] of CONFLICT_CATEGORIES){
    if(x===y){ if(ca.has(x)&&cb.has(x)) return true; }
    else if((ca.has(x)&&cb.has(y))||(ca.has(y)&&cb.has(x))) return true;
  }
  return false;
};
// Human-readable reason two products conflict (for the conflict-review panel).
const CATEGORY_LABEL = { retinoid:"retinoid", exfoliant:"acid/exfoliant", vitaminc:"vitamin C", niacinamide:"niacinamide", benzoyl:"benzoyl peroxide" };
const conflictReason = (a,b) => {
  const ca=productCategories(a), cb=productCategories(b);
  for(const [x,y] of CONFLICT_CATEGORIES){
    const hit = (x===y) ? (ca.has(x)&&cb.has(x)) : ((ca.has(x)&&cb.has(y))||(ca.has(y)&&cb.has(x)));
    if(hit) return x===y ? `Two ${CATEGORY_LABEL[x]}s — redundant, you don't need both` : `${CATEGORY_LABEL[x]} + ${CATEGORY_LABEL[y]} — irritating together`;
  }
  return "";
};
// Hard clinical session rules — NOT left to the AI's discretion.
const forcedSession = (p) => {
  const hay = [p.genericName,p.brandName].filter(Boolean).join(" ").toLowerCase();
  if(/spf|sunscreen|sun serum|sun cream/.test(hay)) return "am";
  const c = productCategories(p);
  if(c.has("vitaminc")) return "am";                 // vitamin C → morning
  if(c.has("retinoid")||c.has("exfoliant")) return "pm"; // acids/retinoids NEVER am
  return null; // no constraint
};
// @qa:ingredientLogic:end

const findConflicts = (products) => {
  const out = [];
  for(let i=0;i<products.length;i++)
    for(let j=i+1;j<products.length;j++)
      if(productsConflict(products[i],products[j]))
        out.push({p1:products[i],p2:products[j]});
  return out;
};

// ─── DATE HELPERS ──────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const parseDate = s  => { const d=new Date(s+"T12:00:00"); return isNaN(d)?null:d; };
const dateStr   = d  => d.toISOString().split("T")[0];
const addDays   = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const fmtLong   = d  => d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const fmtShort  = d  => d.toLocaleDateString("en-US",{month:"short",day:"numeric"});

const scheduledDates = (p, from, to) => {
  if(!p.nextDate) return [];
  const fs=dateStr(from), ts=dateStr(to);
  if(p.isOneOff){const d=parseDate(p.nextDate);if(!d) return [];const ds=dateStr(d);return ds>=fs&&ds<=ts?[ds]:[];}
  const start=parseDate(p.nextDate);if(!start) return [];
  const iv=FREQ_DAYS[p.frequency]||1;
  const dates=[];let cur=new Date(start);
  while(dateStr(cur)<fs) cur=addDays(cur,iv);
  while(dateStr(cur)>fs) cur=addDays(cur,-iv);
  while(dateStr(cur)<=ts){if(dateStr(cur)>=fs) dates.push(dateStr(cur));cur=addDays(cur,iv);}
  return dates;
};

// ─── STORAGE ────────────────────────────────────────────────────────────────────
// Primary: Google Drive (skinritual-profile.json) — shared across all devices
// Fallback: localStorage — used as cache and offline backup
const ISRAEL_PRODUCTS = () => {
  const t = new Date().toISOString().split("T")[0];
  return [
    {id:1, genericName:"Vitamin E Skin Oil", brandName:"Jason Extra Strength Vitamin E 32,000 IU Skin Oil", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:2, genericName:"Retinol Serum", brandName:"La Roche-Posay Retinol B3 Serum", notes:"", session:"pm", frequency:"weekly", stepOrder:3, nextDate:t, isOneOff:false, scheduled:true},
    {id:3, genericName:"Retinol/Vitamin A cream (200,000 IU per 100g)", brandName:"A313 Pommade by Pharma laboratories", notes:"", session:"pm", frequency:"weekly", stepOrder:3, nextDate:t, isOneOff:false, scheduled:true},
    {id:4, genericName:"Topical Retinoid Cream 0.05%", brandName:"Ret-Avit (Tretinoin 0.05% w/w)", notes:"", session:"pm", frequency:"twice-weekly", stepOrder:3, nextDate:t, isOneOff:false, scheduled:true},
    {id:5, genericName:"Vitamin C Serum", brandName:"Pura d'or 20% Vitamin C Serum", notes:"", session:"am", frequency:"twice-weekly", stepOrder:3, nextDate:t, isOneOff:false, scheduled:true},
    {id:6, genericName:"powder exfoliant", brandName:"Dermalogica Daily Microfoliant", notes:"", session:"pm", frequency:"weekly", stepOrder:4, nextDate:t, isOneOff:false, scheduled:true},
    {id:7, genericName:"Purifying Toner", brandName:"Caudalie Vinopure Purifying Toner", notes:"", session:"am", frequency:"daily", stepOrder:2, nextDate:t, isOneOff:false, scheduled:true},
    {id:8, genericName:"cleansing oil", brandName:"SKIN1004 Madagascar Centella Light Cleansing Oil", notes:"", session:"pm", frequency:"daily", stepOrder:1, nextDate:t, isOneOff:false, scheduled:true},
    {id:9, genericName:"chemical exfoliant toner", brandName:"Some By Mi AHA.BHA.PHA 30 Days Miracle Toner", notes:"", session:"pm", frequency:"weekly", stepOrder:4, nextDate:t, isOneOff:false, scheduled:true},
    {id:10, genericName:"hydrating cream mask", brandName:"Caudalie VinoHydra Masque-Crème Hydratant", notes:"", session:"pm", frequency:"weekly", stepOrder:8, nextDate:t, isOneOff:false, scheduled:true},
    {id:11, genericName:"Self-Tanning Bronzing Water Serum with Vitamin C", brandName:"St. Tropez Self Tan Purity Vitamins Bronzing Water Serum", notes:"", session:"pm", frequency:"weekly", stepOrder:2, nextDate:t, isOneOff:false, scheduled:true},
    {id:12, genericName:"Brightening Face Serum", brandName:"Mars Safranal Face Serum (Saffron + Niacinamide)", notes:"", session:"am", frequency:"daily", stepOrder:4, nextDate:t, isOneOff:false, scheduled:true},
    {id:13, genericName:"Niacinamide Serum", brandName:"Yeouth Niacinamide Serum", notes:"", session:"am", frequency:"daily", stepOrder:5, nextDate:t, isOneOff:false, scheduled:true},
    {id:14, genericName:"Blemish Control Salicylic Acid Serum", brandName:"Caudalie Vinopure Blemish Control Salicylic Serum", notes:"", session:"pm", frequency:"weekly", stepOrder:4, nextDate:t, isOneOff:false, scheduled:true},
    {id:16, genericName:"overnight lip sleeping mask", brandName:"Petitfée Oil Blossom Lip Mask", notes:"", session:"pm", frequency:"daily", stepOrder:99, nextDate:t, isOneOff:false, scheduled:true},
    {id:17, genericName:"Essence / Hydrating Serum", brandName:"COSRX Advanced Snail 96 Mucin Power Essence", notes:"", session:"pm", frequency:"daily", stepOrder:6, nextDate:t, isOneOff:false, scheduled:true},
    {id:18, genericName:"Hydrating Serum", brandName:"The Ordinary Marine Hyaluronics", notes:"", session:"pm", frequency:"daily", stepOrder:5, nextDate:t, isOneOff:false, scheduled:true},
    {id:19, genericName:"water gel moisturizer", brandName:"Beauty of Joseon Red Bean Water Gel", notes:"", session:"am", frequency:"daily", stepOrder:8, nextDate:t, isOneOff:false, scheduled:true},
    {id:20, genericName:"Sebo-controlling moisturizer / mattifying moisturizer", brandName:"La Roche-Posay Effaclar Mat", notes:"", session:"pm", frequency:"daily", stepOrder:7, nextDate:t, isOneOff:false, scheduled:true},
    {id:21, genericName:"Sunscreen Serum SPF 50+ PA++++", brandName:"SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum", notes:"", session:"am", frequency:"daily", stepOrder:99, nextDate:t, isOneOff:false, scheduled:true, waitInstruction:"Wait until niacinamide/serum is fully absorbed, not tacky, before applying"},
    {id:22, genericName:"chemical exfoliant / peeling solution", brandName:"The Ordinary AHA 30% + BHA 2% Peeling Solution", notes:"", session:"pm", frequency:"monthly", stepOrder:4, nextDate:t, isOneOff:false, scheduled:true},
    {id:23, genericName:"Clay Face Mask / Bentonite Clay Mask", brandName:"Aztec Secret Indian Healing Clay", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:24, genericName:"Clay/Pore Cleansing Mask", brandName:"Beauty of Joseon Red Bean Refreshing Pore Mask", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:25, genericName:"Hydrating/Soothing Toner", brandName:"Anua Heartleaf 77% Soothing Toner", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:26, genericName:"Chemical Exfoliant Toner (AHA/BHA)", brandName:"COSRX AHA/BHA Clarifying Treatment Toner", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:27, genericName:"Essence Toner", brandName:"Beauty of Joseon Ginseng Essence Water", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:28, genericName:"thermal spring water spray", brandName:"Avène Eau Thermale Thermal Spring Water", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    {id:29, genericName:"Purifying Gel Cleanser", brandName:"Caudalie Vinopure Purifying Gel Cleanser (Paris)", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
  ];
};

// @qa:seedAdditions:start
// Products that must be MERGED into existing saved profiles (not just fresh
// installs), since the seed above only runs for a brand-new profile. Each has a
// stable migration key; once applied (or if the user later deletes it) it won't
// be re-added, tracked via profile.migrations.
const SEED_ADDITIONS = [
  { key:"caudalie_gel_cleanser_v1",
    product:{id:29, genericName:"Purifying Gel Cleanser", brandName:"Caudalie Vinopure Purifying Gel Cleanser (Paris)", notes:"", session:"", frequency:"", stepOrder:0, nextDate:"", isOneOff:false, scheduled:false},
    matches:p => (p.brandName||"").toLowerCase().includes("caudalie") && (p.genericName||"").toLowerCase().includes("gel cleanser") },
];
const applySeedAdditions = (profile) => {
  const done = new Set(profile.migrations || []);
  let products = [...(profile.products||[])];
  let changed = false;
  for(const add of SEED_ADDITIONS){
    if(done.has(add.key)) continue;                 // already applied or user removed it
    const exists = products.some(p => p.id===add.product.id || (add.matches && add.matches(p)));
    if(!exists) products.push({...add.product});
    done.add(add.key);
    changed = true;
  }
  return changed ? {...profile, products, migrations:[...done]} : profile;
};
// @qa:seedAdditions:end

const EMPTY_PROFILE = {
  id:1, name:"My Profile", type:"Combination",
  concerns:["Oiliness","Blackheads / Whiteheads","Enlarged pores","Scarring"], notes:"",
  products:ISRAEL_PRODUCTS(), analysisText:"", analysisGaps:[], logs:[],
  skinImgs:[], wishList:[],
  analysisResult:null, missingAccepted:{}, migrations:[], updatedAt:0,
};

// ── Storage ──────────────────────────────────────────────────────────────────
// window.storage  = Claude.ai built-in, tied to your account, syncs across ALL
//                   devices automatically (iPhone, Mac, any browser on claude.ai)
// localStorage    = instant synchronous cache for this device/session
//
// Per-key layout:
//   "sr_profile"   → profile JSON without image b64 (stays under 5MB limit)
//   "sr_img_0" … "sr_img_N" → one key per photo (each under 5MB)

const WS_PROFILE = "sr_profile";
const wsImgKey   = i => "sr_img_" + i;

const hydrateImgs = (imgs=[]) => imgs.map(img => {
  if(!img?.b64) return null;
  try {
    const bytes = atob(img.b64);
    const arr   = new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
    const blob  = new Blob([arr],{type:img.mime||"image/jpeg"});
    return {...img, preview:URL.createObjectURL(blob)};
  } catch(e){ return null; }
}).filter(Boolean);

const parseProfileData = (raw, skinImgs=null) => {
  try {
    const data = typeof raw==="string" ? JSON.parse(raw) : raw;
    const p    = data?.profile || data;
    if(!p || typeof p!=="object") return null;
    const imgs = skinImgs !== null ? skinImgs : (p.skinImgs||[]);
    const parsed = {...EMPTY_PROFILE, ...p,
      products: normalizeDensity(enforceScheduleInvariants(p.products?.length ? p.products : ISRAEL_PRODUCTS())),
      skinImgs: hydrateImgs(imgs),
      wishList: p.wishList || [],
      analysisResult: Array.isArray(p.analysisResult) ? {items:p.analysisResult, analyzedAt:null} : (p.analysisResult || null),
      missingAccepted: p.missingAccepted || {},
      migrations: p.migrations || [],
      updatedAt: p.updatedAt || 0,
    };
    return applySeedAdditions(parsed);
  } catch(e){ return null; }
};

// ── localStorage (instant, this-device cache) ────────────────────────────────
const lsLoad = () => {
  try {
    for(const key of [STORAGE_KEY,"skinritual_v3","skinritual_v2","skinritual_v1"]){
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const data = JSON.parse(raw);
      if(data?.profile) return parseProfileData(data);
      if(data?.profiles?.length){
        const p = data.profiles[0];
        return parseProfileData({...EMPTY_PROFILE,...p,products:migrateProducts(p)});
      }
    }
  } catch(e){}
  return null;
};
const lsSave = (profile) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({v:4,profile})); return true; }
  catch(e){ return false; }
};

// ── window.storage (Claude.ai account-scoped, cross-device) ──────────────────
const wsLoadProfile = async () => {
  try {
    const r = await window.storage.get(WS_PROFILE);
    return r?.value || null;
  } catch(e){ return null; }
};

const wsLoadImages = async (count) => {
  const imgs = [];
  for(let i=0; i<count; i++){
    try {
      const r = await window.storage.get(wsImgKey(i));
      if(r?.value) imgs.push(JSON.parse(r.value));
      else break;
    } catch(e){ break; }
  }
  return imgs;
};

// @qa:wsSaveFlush:start
let _wsTimer = null;
let _wsPendingProfile = null;
const _wsFlushNow = async (profile) => {
  try {
    const {skinImgs=[], ...rest} = profile;
    await window.storage.set(WS_PROFILE, JSON.stringify({v:4, profile:{...rest, skinImgCount:skinImgs.length}}));
    for(let i=0; i<skinImgs.length; i++){
      try { const {preview, ...imgData} = skinImgs[i]; await window.storage.set(wsImgKey(i), JSON.stringify(imgData)); }
      catch(e){ /* image too large — skip */ }
    }
    for(let i=skinImgs.length; i<30; i++){
      try { await window.storage.delete(wsImgKey(i)); } catch(e){ break; }
    }
  } catch(e){ /* localStorage is the fallback */ }
};
const wsSave = (profile) => {
  _wsPendingProfile = profile;
  clearTimeout(_wsTimer);
  _wsTimer = setTimeout(() => { const p=_wsPendingProfile; _wsPendingProfile=null; _wsFlushNow(p); }, 1500);
};
// BUG FIX: the debounced save above lives only in memory — if the tab/app is
// closed or backgrounded within the 1.5s window, the timer dies with the page
// and the write NEVER HAPPENS (this is why a routine built right before
// switching devices could silently fail to sync). Flush immediately on the
// signals that precede a page actually going away.
try {
  const flushPending = () => { if(_wsPendingProfile){ clearTimeout(_wsTimer); const p=_wsPendingProfile; _wsPendingProfile=null; _wsFlushNow(p); } };
  document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden") flushPending(); });
  window.addEventListener("pagehide", flushPending);
} catch(e){ /* non-browser test environment */ }
// @qa:wsSaveFlush:end

// Load from window.storage — used on mount to get cross-device data
const loadFromCloud = async () => {
  try {
    const raw = await wsLoadProfile();
    if(!raw) return null;
    const data = JSON.parse(raw);
    const p    = data?.profile || data;
    if(!p) return null;
    const count = p.skinImgCount || 0;
    const imgs  = count > 0 ? await wsLoadImages(count) : [];
    return parseProfileData(data, imgs);
  } catch(e){ return null; }
};

// @qa:reconcileProfiles:start
// BUG FIX (products silently vanishing): loading from cloud used to
// UNCONDITIONALLY overwrite whatever was already loaded from localStorage —
// including whenever the cloud snapshot was stale (e.g. the debounced
// window.storage write from a prior session never got a chance to fire).
// That meant a device with a full, freshly-saved product list could open the
// app and have it silently replaced with an old/empty cloud copy.
// Every save now stamps `updatedAt`; on load we keep whichever copy is
// actually newer instead of blindly trusting the cloud.
const reconcileProfiles = (localProfile, cloudProfile) => {
  const localTs = localProfile?.updatedAt || 0;
  const cloudTs = cloudProfile?.updatedAt || 0;
  return cloudTs > localTs ? cloudProfile : localProfile;
};
// @qa:reconcileProfiles:end

// Synchronous init (localStorage) then async cloud load on mount
const load = () => lsLoad();
const save = (profile) => {
  lsSave(profile);  // instant local cache
  wsSave(profile);  // async cloud sync (1.5s debounce)
  return true;
};
const migrateProducts = p => {
  if(p.products?.length) return p.products;
  const out = [];
  let ord = 1;
  (p.amSteps||[]).forEach(s=>out.push({id:ord*100,genericName:s.text||s,brandName:"",notes:"",session:"am",frequency:"daily",stepOrder:ord++,nextDate:todayStr(),isOneOff:false,scheduled:true}));
  (p.pmSteps||[]).forEach(s=>out.push({id:ord*100,genericName:s.text||s,brandName:"",notes:"",session:"pm",frequency:"daily",stepOrder:ord++,nextDate:todayStr(),isOneOff:false,scheduled:true}));
  (p.treatments||[]).forEach(t=>out.push({id:t.id||ord*100,genericName:t.name||t.genericName||"Treatment",brandName:"",notes:t.notes||"",session:t.session||"pm",frequency:t.frequency||"weekly",stepOrder:ord++,nextDate:t.nextDate||todayStr(),isOneOff:t.isOneOff||false,scheduled:!!(t.session&&t.frequency)}));
  return out;
};

// ─── IMAGE LOADING ─────────────────────────────────────────────────────────────
// Reads any image file as base64 via FileReader (no canvas — CSP-safe).
// Handles iPhone quirks: empty file.type, HEIC extension, large files.
// Re-encode an image file to JPEG via canvas. On iPhone/Safari this natively
// decodes HEIC too, so iPhone camera photos work instead of being rejected.
// Also downscales huge photos (max 1600px) to stay well under API size limits.
const canvasReencode = (file, maxDim=1600, quality=0.85) => new Promise((resolve, reject) => {
  let url = "";
  try { url = URL.createObjectURL(file); } catch(e){ reject(new Error("Could not read photo")); return; }
  const img = new Image();
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("HEIC_DECODE_FAILED")); };
  img.onload = () => {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(url);
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if(!b64 || b64.length < 10){ reject(new Error("HEIC_DECODE_FAILED")); return; }
      resolve({ b64, mime:"image/jpeg", preview:dataUrl, size: Math.round(b64.length * 0.75) });
    } catch(err){ URL.revokeObjectURL(url); reject(new Error("HEIC_DECODE_FAILED")); }
  };
  img.src = url;
});

const loadImage = file => new Promise((resolve, reject) => {
  const name = (file.name||"").toLowerCase();
  const isHeic = name.endsWith(".heic") || name.endsWith(".heif") || /hei[cf]/.test(file.type||"");
  const MAX_BYTES = 15 * 1024 * 1024;
  if(file.size > MAX_BYTES) {
    reject(new Error(`Photo too large (${(file.size/1024/1024).toFixed(1)} MB). Please use a compressed or screenshot version.`));
    return;
  }
  // HEIC (iPhone default) or big files: re-encode to JPEG via canvas.
  // iOS Safari decodes HEIC natively, so this makes iPhone photos just work.
  if(isHeic || file.size > 3.5 * 1024 * 1024){
    canvasReencode(file).then(resolve).catch(reject);
    return;
  }

  const rawMime = file.type && file.type !== "application/octet-stream" ? file.type : "image/jpeg";
  const r = new FileReader();
  r.onerror = () => reject(new Error("Could not read photo. Try a screenshot instead."));
  r.onload = ev => {
    try {
      const result = ev.target.result;
      if(!result || typeof result !== "string") { reject(new Error("Empty result from reader")); return; }
      const commaIdx = result.indexOf(",");
      if(commaIdx < 0) { reject(new Error("Unexpected file format")); return; }
      const b64 = result.slice(commaIdx + 1);
      if(!b64 || b64.length < 10) { reject(new Error("No image data")); return; }
      const mimeMatch = result.slice(0, commaIdx).match(/^data:([^;]+)/);
      const mime = (mimeMatch && mimeMatch[1] && mimeMatch[1] !== "application/octet-stream")
        ? mimeMatch[1] : rawMime;
      let preview = "";
      try { preview = URL.createObjectURL(file); } catch(e) { preview = result; }
      resolve({ b64, mime, preview, size: file.size });
    } catch(err) {
      reject(new Error("Photo processing failed: " + err.message));
    }
  };
  r.readAsDataURL(file);
});

// ─── API ───────────────────────────────────────────────────────────────────────
// @qa:callClaude:start
// Mirrors the documented artifact API shape EXACTLY: { model, max_tokens, messages }.
// SELF-HEALING MODEL SELECTION: if the runtime rejects the preferred model
// (fetch throws e.g. "Invalid response format", or the API errors on the model),
// automatically retry the same request with fallback model strings and lock onto
// the first one that works (cached in-memory + localStorage for future sessions).
const MODEL_CANDIDATES = [
  MODEL,                        // preferred (claude-sonnet-4-6)
  "claude-sonnet-4-5-20250929",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-haiku-4-5-20251001",
];
let _workingModel = null;
try { _workingModel = localStorage.getItem("sr_working_model") || null; } catch(_){}

const _rawCall = async (model, messages, maxTokens) => {
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({ model, max_tokens:maxTokens, messages }),
    });
  } catch(networkErr){
    const e = new Error(`fetch rejected: ${networkErr.message}`); e.modelIssuePossible = true; throw e;
  }
  let raw = "", data = null;
  try { raw = await res.text(); data = JSON.parse(raw); } catch(_){}
  if(!res.ok){
    const detail = data?.error?.message || (raw ? raw.slice(0,300) : `HTTP ${res.status}`);
    const e = new Error(`API ${res.status}: ${detail}`);
    e.modelIssuePossible = res.status===400 || res.status===404 || /model/i.test(detail);
    throw e;
  }
  const text = (data?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  if(!text) throw new Error(`API returned no text (stop_reason=${data?.stop_reason||"?"})`);
  return text;
};

const callClaude = async (messages, maxTokens=1000) => {
  const imgCount = (messages||[]).reduce((n,m)=>n + (Array.isArray(m.content)?m.content.filter(b=>b&&b.type==="image").length:0), 0);
  const tried = [];
  const order = _workingModel
    ? [_workingModel, ...MODEL_CANDIDATES.filter(m=>m!==_workingModel)]
    : [...MODEL_CANDIDATES];
  for(const model of order){
    try {
      const text = await _rawCall(model, messages, maxTokens);
      if(_workingModel!==model){
        _workingModel = model;
        try { localStorage.setItem("sr_working_model", model); } catch(_){}
      }
      return text;
    } catch(e){
      tried.push(`${model}: ${e.message}`);
      if(!e.modelIssuePossible) {
        throw new Error(`Request failed (${imgCount} image(s), max_tokens=${maxTokens}) — ${e.message}`);
      }
      // model likely rejected → try next candidate
    }
  }
  throw new Error(`All models rejected (${imgCount} image(s), max_tokens=${maxTokens}). Tried → ${tried.join(" | ")}`);
};
// @qa:callClaude:end

// @qa:apiDiagnostic:start
// Probes each model candidate with a minimal call and reports pass/fail per
// model, plus environment info. Runs on the user's device where the real
// artifact proxy lives — the only place the failure can be reproduced.
const runApiDiagnostic = async () => {
  const results = [];
  try { results.push(`env: ${window.location.origin}`); } catch(_){ results.push("env: unknown"); }
  const tiny = [{role:"user",content:[{type:"text",text:"Reply with exactly: OK"}]}];
  for(const model of MODEL_CANDIDATES){
    try { await _rawCall(model, tiny, 1000); results.push(`✓ ${model}`); }
    catch(e){ results.push(`✗ ${model} → ${e.message}`); }
  }
  results.push(_workingModel ? `active model: ${_workingModel}` : "active model: none succeeded");
  return results;
};
// @qa:apiDiagnostic:end

// ─── UI PRIMITIVES ─────────────────────────────────────────────────────────────
// @qa:applyScheduleToProducts:start
// Merge a schedule array (from the AI + conflict resolver) onto the product list.
// Every product whose id appears in the schedule becomes scheduled with the given
// session/frequency/step/date/wait note; products absent from the schedule are
// returned unchanged. Pure function so it can be unit-tested directly.
const applyScheduleToProducts = (products, schedule, today) => {
  const byId = {};
  (schedule||[]).forEach(r=>{ if(r && r.id!=null) byId[String(r.id)] = r; });
  return (products||[]).map(p=>{
    const r = byId[String(p.id)];
    if(!r) return p;
    return {
      ...p,
      session:   r.session   || p.session,
      frequency: r.frequency || p.frequency,
      stepOrder: r.stepOrder || p.stepOrder || 1,
      nextDate:  r.nextDate  || p.nextDate  || today,
      scheduled: true,
      waitInstruction: (r.waitInstruction !== undefined ? r.waitInstruction : (p.waitInstruction || "")),
    };
  });
};
// @qa:applyScheduleToProducts:end

// @qa:apiImageBlocks:start
// The Anthropic API accepts ONLY these image types. Any other or missing
// media_type (e.g. HEIC from an iPhone, or an empty mime) makes the ENTIRE
// request invalid — which surfaces as the artifact shim throwing on fetch.
// This drops unsupported/empty images so one bad photo can't break a call.
const API_IMAGE_TYPES = ["image/jpeg","image/png","image/gif","image/webp"];
const apiImageBlocks = (imgs) => (imgs||[])
  .filter(img => img && typeof img.b64 === "string" && img.b64.length > 0
    && API_IMAGE_TYPES.includes(String(img.mime||"").toLowerCase()))
  .map(img => ({ type:"image", source:{ type:"base64", media_type:String(img.mime).toLowerCase(), data:img.b64 } }));
// @qa:apiImageBlocks:end

// @qa:offlineScheduler:start
// DETERMINISTIC ROUTINE BUILDER — no AI required. Encodes the canonical
// dermatologist framework (AM: cleanse→vit C→moisturise→SPF; PM: cleanse→one
// treatment→moisturise) so Build Routine works even where the artifact AI
// bridge is unavailable (e.g. the iPhone app). Same-category actives are given
// offsets whose periods can't collide; the cross-category conflict resolver
// still runs afterwards in buildRoutine.
const detectType = (p) => {
  const hay=[p.genericName,p.brandName].filter(Boolean).join(" ").toLowerCase();
  if(/spf|sunscreen|sun serum|sun cream/.test(hay)) return "spf";
  if(/self.?tan/.test(hay)) return "selftan";
  if(/lip/.test(hay)) return "lip";                 // check before "mask" — a lip MASK is a nightly lip treatment, not a weekly face mask
  if(/mask/.test(hay)) return "mask";                // check before "cleanser" — a "cleansing mask" is a mask, not your daily cleanser
  if(/cleansing oil|cleansing balm/.test(hay)) return "cleanser_oil";
  if(/cleanser|cleansing|face wash|facial wash|soap|foaming/.test(hay)) return "cleanser";
  const cats = productCategories(p);
  if(cats.has("exfoliant")) return "exfoliant";
  if(cats.has("retinoid")) return "retinoid";
  if(cats.has("vitaminc")) return "vitc";
  if(cats.has("niacinamide")) return "niacinamide";
  if(/thermal|spring water|mist|spray/.test(hay)) return "mist";
  if(/moisturi|water gel|gel cream|effaclar mat|red bean/.test(hay)) return "moisturizer";
  if(/eye/.test(hay)) return "eye";
  if(/bio-oil|face oil|facial oil|vitamin e oil|squalane/.test(hay)) return "faceoil";
  if(/toner/.test(hay)) return "toner";
  if(/essence/.test(hay)) return "essence";
  if(/serum/.test(hay)) return "serum";
  return "other";
};
// type → [session, frequency, stepOrder, waitInstruction]; "extra" = rules for
// 2nd+ product of the same type (rotate instead of stacking).
const OFFLINE_RULES = {
  spf:          { first:["am","daily",99,"Wait until serums fully absorbed before applying"] },
  cleanser:     { first:["both","daily",1,""] },
  cleanser_oil: { first:["pm","daily",1,""] },
  toner:        { first:["pm","daily",2,""],        extra:["pm","twice-weekly",2,""] },
  essence:      { first:["pm","twice-weekly",2,""], extra:["pm","twice-weekly",2,""] },
  vitc:         { first:["am","twice-weekly",3,""], extra:["am","twice-weekly",3,""] },
  niacinamide:  { first:["am","twice-weekly",4,""], extra:["am","twice-weekly",4,""] },
  retinoid:     { first:["pm","twice-weekly",6,"Apply to completely dry skin"], extra:["pm","twice-weekly",6,"Apply to completely dry skin"] },
  exfoliant:    { first:["pm","weekly",3,""],       extra:["pm","weekly",3,""] },
  selftan:      { first:["pm","weekly",9,""],       extra:["pm","weekly",9,""] },
  mask:         { first:["pm","weekly",2,"On clean skin after cleansing — leave on, then rinse"], extra:["pm","weekly",2,"On clean skin after cleansing — leave on, then rinse"] },
  mist:         { first:["am","weekly",2,""],       extra:["am","weekly",2,""] },
  moisturizer:  { first:["pm","daily",8,""],        extra:["am","daily",8,""] },
  lip:          { first:["pm","daily",10,""] },
  eye:          { first:["pm","daily",7,""] },
  faceoil:      { first:["pm","twice-weekly",9,""], extra:["pm","twice-weekly",9,""] },
  serum:        { first:["pm","daily",5,""],        extra:["pm","twice-weekly",5,""] },
  other:        { first:["pm","twice-weekly",5,""], extra:["pm","twice-weekly",5,""] },
};
// Special-case: very strong peels (e.g. AHA 30%) go monthly, not weekly.
const isStrongPeel = (p) => /30\s*%|peeling solution/i.test([p.genericName,p.brandName].filter(Boolean).join(" "));
const buildScheduleOffline = (products) => {
  const seenOfType = {};
  // Offsets chosen so same-period items never share a day:
  // twice-weekly (3d): offsets stepping by 2 → distinct mod 3 for first three.
  // weekly (7d): offsets stepping by 2 → distinct mod 7 for first three.
  const offsetCounters = {};
  return (products||[]).map(p=>{
    const t = detectType(p);
    const rules = OFFLINE_RULES[t] || OFFLINE_RULES.other;
    const n = (seenOfType[t] = (seenOfType[t]||0)+1);
    const [session,frequencyBase,stepOrder,waitInstruction] = (n===1 || !rules.extra) ? rules.first : rules.extra;
    const frequency = (t==="exfoliant" && isStrongPeel(p)) ? "monthly" : frequencyBase;
    let dayOffset = 0;
    if(frequency!=="daily"){
      const k = `${t}`;
      const c = (offsetCounters[k] = (offsetCounters[k]??-1)+1);
      dayOffset = (c*2) % 7;
    }
    return { id:String(p.id), session, frequency, stepOrder, dayOffset, waitInstruction };
  });
};
// @qa:offlineScheduler:end

// @qa:scheduleInvariants:start
// SAFETY NET: enforce clinical invariants on ALREADY-SAVED schedule data every
// time it loads. Build-time rules can't fix stale entries from older builds
// (e.g. a clay mask saved as AM step-0) — this runs on the live data itself.
const enforceScheduleInvariants = (products) => (products||[]).map(p=>{
  if(!p || !p.scheduled) return p;
  let { session, frequency, stepOrder } = p;
  const t = detectType(p);
  // Session rules
  const fs = forcedSession(p);
  if(fs && session!==fs) session = fs;
  if((t==="mask" || t==="selftan") && session!=="pm") session = "pm";      // masks & self-tan are evening
  // Frequency rules — treatments are never daily
  if(t==="mask" || t==="selftan"){ if(frequency==="daily") frequency = "weekly"; }
  const cats = productCategories(p);
  if((cats.has("retinoid")||cats.has("exfoliant")) && frequency==="daily") frequency = "twice-weekly";
  // Step order — no step-0 orphans sorting to the top; masks right after cleanse
  if(t==="mask") stepOrder = 2;                                            // on clean skin, before serums
  if(!stepOrder || stepOrder<=0){
    const rules = OFFLINE_RULES[t] || OFFLINE_RULES.other;
    stepOrder = rules.first[2];
  }
  if(session===p.session && frequency===p.frequency && stepOrder===p.stepOrder) return p;
  return { ...p, session, frequency, stepOrder };
});
// @qa:scheduleInvariants:end

// @qa:densityNormalize:start
// LOAD-TIME DENSITY FIX: old builds saved "everything daily" schedules (12-13
// steps/day). Safety invariants above don't thin those out — this does. If the
// saved schedule overloads any day, rebuild the scheduled products with the
// deterministic offline rules. Idempotent: once normal, it never re-triggers.
const normalizeDensity = (products) => {
  const scheduled = (products||[]).filter(p=>p&&p.scheduled);
  if(!scheduled.length) return products;
  const dailyPm = scheduled.filter(p=>p.frequency==="daily"&&(p.session==="pm"||p.session==="both")).length;
  const dailyAm = scheduled.filter(p=>p.frequency==="daily"&&(p.session==="am"||p.session==="both")).length;
  if(dailyAm<=5 && dailyPm<=6) return products; // healthy — leave untouched
  const sched = buildScheduleOffline(scheduled);
  const byId = {}; sched.forEach(r=>{ byId[String(r.id)]=r; });
  const today = todayStr();
  return products.map(p=>{
    if(!p.scheduled) return p;
    const r = byId[String(p.id)]; if(!r) return p;
    return {...p,
      session:r.session, frequency:r.frequency, stepOrder:r.stepOrder,
      waitInstruction:r.waitInstruction||"",
      nextDate: r.frequency==="daily" ? (p.nextDate||today) : addDaysStr(today, r.dayOffset||0),
    };
  });
};
// @qa:densityNormalize:end

// @qa:offlineAnalysis:start
// Rule-based product analysis for when the AI bridge is unreachable (phone).
// Flags duplicate actives and missing essentials deterministically.
const offlineAnalysis = (products) => {
  const items = [];
  const dupCats = { retinoid:"retinoid", exfoliant:"acid/exfoliant", vitaminc:"vitamin C", niacinamide:"niacinamide" };
  const byCat = {}; Object.keys(dupCats).forEach(k=>byCat[k]=[]);
  (products||[]).forEach(p=>{ const c=productCategories(p); for(const k in dupCats) if(c.has(k)) byCat[k].push(p); });
  const flagged = new Set();
  for(const k in byCat){
    if(byCat[k].length>1){
      byCat[k].slice(1).forEach(p=>{
        if(flagged.has(p.id)) return;
        flagged.add(p.id);
        items.push({ id:String(p.id), tag:"consider-removing",
          reason:`You have ${byCat[k].length} ${dupCats[k]} products — one is enough. Extras add irritation risk without added benefit.`,
          alternatives:[] });
      });
    }
  }
  (products||[]).filter(p=>!flagged.has(p.id)).forEach(p=>{
    items.push({ id:String(p.id), tag:"keep-asis",
      reason:"Rule-based check passed: no duplicate actives or ingredient conflicts. For a full clinical review, run analysis on desktop.",
      alternatives:[] });
  });
  const types = new Set((products||[]).map(detectType));
  if(!types.has("cleanser") && !types.has("cleanser_oil"))
    items.push({ tag:"missing", productName:"Gentle daily cleanser", reason:"Every routine starts with a cleanser, morning and evening." });
  if(!types.has("spf"))
    items.push({ tag:"missing", productName:"Broad-spectrum SPF 30+", reason:"Daily sunscreen is the single most important protective step." });
  if(!types.has("moisturizer"))
    items.push({ tag:"missing", productName:"Daily moisturizer", reason:"Supports the skin barrier — essential alongside actives like retinoids and acids." });
  return items;
};
// @qa:offlineAnalysis:end

// @qa:extractJsonObjects:start
// Robustly pull an array of objects out of an LLM response that may be
// truncated (response hit max_tokens), wrapped in ```json fences, or preceded
// by prose. Walks char-by-char tracking string state + brace depth, and parses
// each complete top-level {…} object independently. A truncated final object is
// dropped rather than failing the whole parse. Returns an array (possibly empty).
const extractJsonObjects = (raw) => {
  if(!raw || typeof raw !== "string") return [];
  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "");
  const start = cleaned.indexOf("[");
  if(start < 0) return [];
  const s = cleaned.slice(start + 1);
  const objs = [];
  let depth = 0, inStr = false, esc = false, buf = "";
  for(let i=0;i<s.length;i++){
    const ch = s[i];
    if(esc){ buf += ch; esc = false; continue; }
    if(ch === "\\"){ buf += ch; esc = true; continue; }
    if(ch === '"'){ inStr = !inStr; buf += ch; continue; }
    if(inStr){ buf += ch; continue; }
    if(ch === "{"){ if(depth === 0) buf = ""; depth++; buf += ch; continue; }
    if(ch === "}"){
      depth--; buf += ch;
      if(depth === 0){ try{ objs.push(JSON.parse(buf)); }catch(_){} buf = ""; }
      continue;
    }
    if(ch === "]" && depth === 0) break;
    if(depth > 0) buf += ch;
  }
  return objs;
};
// @qa:extractJsonObjects:end

// Google Shopping search link for any product name
const buyLink = (name) => "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(name||"");

const Card = ({children,style}) => <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:20,boxShadow:T.shadow,...style}}>{children}</div>;
const Lbl  = ({children,style}) => <div style={{fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6,...style}}>{children}</div>;
const Btn  = ({onClick,children,disabled,variant="primary",style}) => {
  const base={padding:"10px 18px",borderRadius:100,border:"none",fontWeight:600,fontSize:13,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6,justifyContent:"center"};
  const v={
    primary:{background:disabled?"#ccc":T.accent,color:"#fff",boxShadow:disabled?"none":"0 2px 8px rgba(232,131,122,0.3)"},
    ghost:{background:"transparent",color:T.text,border:`1.5px solid ${T.border}`},
    soft:{background:T.accentSoft,color:T.accent,border:`1.5px solid ${T.accent}44`},
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...(v[variant]||v.primary),...style}}>{children}</button>;
};
const TxtIn = ({value,onChange,placeholder,style}) =>
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:"100%",background:T.faint,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 14px",color:T.text,fontSize:13,fontFamily:"'Inter',sans-serif",boxSizing:"border-box",...style}}/>;
const selSty = {width:"100%",background:T.faint,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 14px",color:T.text,fontSize:13,fontFamily:"'Inter',sans-serif"};

const MD = ({text}) => {
  if(!text) return null;
  return <div style={{lineHeight:1.8,fontSize:14}}>{text.split("\n").map((line,i)=>{
    if(line.startsWith("## ")) return <div key={i} style={{color:T.accent,fontWeight:700,fontSize:15,marginTop:16,marginBottom:4,fontFamily:"'Cormorant Garamond',serif"}}>{line.slice(3)}</div>;
    if(line.startsWith("# "))  return <div key={i} style={{color:T.text,fontWeight:700,fontSize:18,marginTop:16,fontFamily:"'Cormorant Garamond',serif"}}>{line.slice(2)}</div>;
    if(line.startsWith("- ")||line.startsWith("* ")){
      const parts=line.slice(2).split(/\*\*(.*?)\*\*/g);
      return <div key={i} style={{display:"flex",gap:10,marginBottom:5}}><span style={{color:T.accent,flexShrink:0}}>•</span><span style={{color:T.muted}}>{parts.map((p,j)=>j%2===1?<strong key={j} style={{color:T.text}}>{p}</strong>:p)}</span></div>;
    }
    if(line.trim()==="") return <div key={i} style={{height:8}}/>;
    const parts=line.split(/\*\*(.*?)\*\*/g);
    return <div key={i} style={{color:T.muted,marginBottom:4}}>{parts.map((p,j)=>j%2===1?<strong key={j} style={{color:T.text}}>{p}</strong>:p)}</div>;
  })}</div>;
};

// ─── CONCERNS SELECTOR ─────────────────────────────────────────────────────────
const ConcernsSelector = ({selected,onChange}) => {
  const [open,setOpen] = useState(false);
  const toggle = c => onChange(selected.includes(c)?selected.filter(x=>x!==c):[...selected,c]);
  return (
    <>
      <div onClick={()=>setOpen(true)} style={{background:T.faint,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",minHeight:46,display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
        {selected.length===0?<span style={{color:T.muted,fontSize:13}}>Tap to select…</span>:selected.map(c=><span key={c} style={{background:T.accent,color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>{c}</span>)}
        <span style={{marginLeft:"auto",color:T.muted,fontSize:11}}>▾</span>
      </div>
      {open&&(
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(44,36,32,0.5)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:560,maxHeight:"75vh",display:"flex",flexDirection:"column",boxShadow:T.shadowMd}}>
            <div style={{padding:"14px 20px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 14px"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,color:T.text,fontSize:17,fontFamily:"'Cormorant Garamond',serif"}}>Skin Concerns</span>
                <Btn onClick={()=>setOpen(false)} style={{padding:"8px 20px"}}>Done</Btn>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:"16px 20px 32px",display:"flex",flexWrap:"wrap",gap:10}}>
              {CONCERNS.map(c=>{const on=selected.includes(c);return(
                <div key={c} onClick={()=>toggle(c)} style={{padding:"10px 18px",borderRadius:100,background:on?T.accent:T.faint,border:`1.5px solid ${on?T.accent:T.border}`,color:on?"#fff":T.text,fontSize:13,fontWeight:on?600:400,cursor:"pointer",userSelect:"none"}}>
                  {on?"✓ ":""}{c}
                </div>
              );})}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── DAY SHEET ─────────────────────────────────────────────────────────────────
// Reusable day checklist body (AM/PM blocks) — used by both the modal sheet and
// the inline Day view in the calendar.
const DayDetail = ({date,profile,onUpdate}) => {
  const ds = dateStr(date);
  const prods = profile.products.filter(p=>p.scheduled&&scheduledDates(p,date,date).includes(ds)).sort((a,b)=>a.stepOrder-b.stepOrder);
  const amProds = prods.filter(p=>p.session==="am"||p.session==="both");
  const pmProds = prods.filter(p=>p.session==="pm"||p.session==="both");
  const logs = profile.logs.filter(l=>l.date===ds);

  const toggle = (productId,session) => {
    const ex = logs.find(l=>l.productId===productId&&l.session===session);
    const done = !ex?.done;
    const newLogs = ex
      ? profile.logs.map(l=>(l.date===ds&&l.productId===productId&&l.session===session)?{...l,done}:l)
      : [...profile.logs,{id:Date.now(),date:ds,productId,session,done:true}];
    onUpdate({logs:newLogs});
  };
  const markAll = (prodList,session) => {
    let newLogs = [...profile.logs];
    prodList.forEach(p=>{
      const ex = newLogs.find(l=>l.date===ds&&l.productId===p.id&&l.session===session);
      if(ex) newLogs = newLogs.map(l=>(l.date===ds&&l.productId===p.id&&l.session===session)?{...l,done:true}:l);
      else newLogs = [...newLogs,{id:Date.now()+Math.random(),date:ds,productId:p.id,session,done:true}];
    });
    onUpdate({logs:newLogs});
  };

  const Block = ({prods,session,accent,label,icon}) => {
    const allDone = prods.length>0 && prods.every(p=>logs.find(l=>l.productId===p.id&&l.session===session)?.done);
    return (
      <div style={{background:T.faint,borderRadius:14,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:12}}>
        <div style={{background:`linear-gradient(135deg,${accent}18,${accent}08)`,padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,color:accent,fontSize:14,fontFamily:"'Cormorant Garamond',serif"}}>{icon} {label}</span>
          <button onClick={()=>markAll(prods,session)} style={{padding:"5px 14px",borderRadius:100,border:`1.5px solid ${allDone?T.green:T.border}`,background:allDone?T.greenSoft:"transparent",color:allDone?T.green:T.text,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            {allDone?"✓ All Done":"Mark All Done"}
          </button>
        </div>
        <div style={{padding:"8px 16px"}}>
          {prods.length===0&&<div style={{color:T.muted,fontSize:13,fontStyle:"italic",padding:"8px 0"}}>Nothing scheduled.</div>}
          {prods.length>1&&(
            <div style={{fontSize:11,color:T.muted,fontStyle:"italic",padding:"4px 0 8px",borderBottom:`1px solid ${T.border}`,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
              <span>⏱</span><span>Let each layer absorb (~30–60s, until not tacky) before the next.</span>
            </div>
          )}
          {prods.map((p,i)=>{
            const done = logs.find(l=>l.productId===p.id&&l.session===session)?.done||false;
            const col = pcolor(p);
            return (
              <div key={p.id} onClick={()=>toggle(p.id,session)} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:i<prods.length-1?`1px solid ${T.border}`:"none",cursor:"pointer"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${done?T.green:col.border}`,background:done?T.green:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                  {done&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                </div>
                <div style={{flex:1}}>
                  <span style={{color:done?T.muted:T.text,fontSize:13,fontWeight:600,textDecoration:done?"line-through":"none"}}>
                    <span style={{color:done?T.muted:accent,fontSize:12,marginRight:6}}>{i+1}.</span>
                    {p.genericName}
                    {p.brandName&&<span style={{color:T.muted,fontWeight:400,fontSize:12}}> · {p.brandName}</span>}
                  </span>
                  {p.frequency!=="daily"&&<span style={{marginLeft:8,fontSize:10,background:col.bg,color:col.text,borderRadius:20,padding:"1px 7px"}}>{FREQS[p.frequency]}</span>}
                  {p.waitInstruction&&!done&&(
                    <div style={{marginTop:3,fontSize:11,color:T.accent,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                      <span>⚠️</span><span>{p.waitInstruction}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (<><Block prods={amProds} session="am" accent={T.accent} label="Morning Routine" icon="🌅"/><Block prods={pmProds} session="pm" accent={T.blue} label="Evening Routine" icon="🌙"/></>);
};

const DaySheet = ({date,profile,onUpdate,onClose,onNavigate}) => {
  const isToday = date.toDateString()===new Date().toDateString();
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,36,32,0.5)",zIndex:998,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:580,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:T.shadowMd}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 10px"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>onNavigate(-1)} style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,color:T.muted}}>‹</button>
              <div>
                <div style={{fontWeight:700,color:T.text,fontSize:17,fontFamily:"'Cormorant Garamond',serif"}}>{fmtLong(date)}</div>
                {isToday&&<div style={{color:T.accent,fontSize:11,fontWeight:700}}>TODAY</div>}
              </div>
              <button onClick={()=>onNavigate(1)} style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,color:T.muted}}>›</button>
            </div>
            <button onClick={onClose} style={{background:T.faint,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.muted}}>×</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px 32px",flex:1}}>
          <DayDetail date={date} profile={profile} onUpdate={onUpdate}/>
        </div>
      </div>
    </div>
  );
};

// ─── CALENDAR ──────────────────────────────────────────────────────────────────
const CalendarTab = ({profile,onUpdate}) => {
  const today = new Date();
  // BUG FIX: default focus was the current MONTH's grid (view="month", cursor
  // pinned to the 1st of the month) — so opening the app never actually
  // landed on today. Default to the Day view, cursor on today's date.
  const [view,setView]       = useState("day");
  const [cursor,setCursor]   = useState(new Date(today.getFullYear(),today.getMonth(),today.getDate()));
  const [selected,setSelected] = useState(null);

  const prev = () => setCursor(d=>view==="month"?new Date(d.getFullYear(),d.getMonth()-1,1):view==="day"?addDays(d,-1):addDays(d,-7));
  const next = () => setCursor(d=>view==="month"?new Date(d.getFullYear(),d.getMonth()+1,1):view==="day"?addDays(d,1):addDays(d,7));

  const rangeStart = view==="month"?new Date(cursor.getFullYear(),cursor.getMonth(),1)
    :view==="day"?new Date(cursor)
    :(()=>{const d=new Date(cursor);d.setDate(d.getDate()-d.getDay());return d;})();
  const rangeEnd = view==="month"?new Date(cursor.getFullYear(),cursor.getMonth()+1,0):view==="day"?new Date(cursor):addDays(rangeStart,6);

  const days = [];
  if(view==="month"){for(let i=0;i<rangeStart.getDay();i++) days.push(null);}
  for(let d=new Date(rangeStart);d<=rangeEnd;d=addDays(d,1)) days.push(new Date(d));

  const scheduledProds = useCallback(date=>{
    return profile.products.filter(p=>p.scheduled&&scheduledDates(p,date,date).includes(dateStr(date)));
  },[profile.products]);

  const nonDailyProds = useCallback(date=>{
    return scheduledProds(date).filter(p=>p.frequency!=="daily");
  },[scheduledProds]);

  const title = view==="month"?`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`:view==="day"?fmtLong(cursor):`${fmtShort(rangeStart)} – ${fmtShort(rangeEnd)}`;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",background:T.faint,borderRadius:100,padding:3,border:`1px solid ${T.border}`}}>
          {["day","week","month"].map(v=><button key={v} onClick={()=>{ setView(v); if(v==="day"){ setCursor(new Date(today.getFullYear(),today.getMonth(),today.getDate())); } }} style={{padding:"7px 14px",borderRadius:100,background:view===v?T.accent:"transparent",color:view===v?"#fff":T.muted,border:"none",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{v}</button>)}
        </div>
        <button onClick={prev} style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:14}}>‹</button>
        <div style={{flex:1,textAlign:"center",fontWeight:700,color:T.text,fontFamily:"'Cormorant Garamond',serif",fontSize:17}}>{title}</div>
        <button onClick={next} style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:14}}>›</button>
        <Btn onClick={()=>setCursor(view==="month"?new Date(today.getFullYear(),today.getMonth(),1):new Date(today.getFullYear(),today.getMonth(),today.getDate()))} variant="ghost" style={{padding:"8px 14px",fontSize:12}}>Today</Btn>
      </div>

      {view==="day" ? (
        <div>
          {cursor.toDateString()===new Date().toDateString()&&<div style={{color:T.accent,fontSize:11,fontWeight:700,marginBottom:10,textAlign:"center"}}>TODAY</div>}
          <DayDetail date={cursor} profile={profile} onUpdate={onUpdate}/>
        </div>
      ) : (<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:T.muted,padding:"4px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {days.map((date,i)=>{
          if(!date) return <div key={`e${i}`}/>;
          const ds = dateStr(date);
          const isToday = date.toDateString()===today.toDateString();
          const isOther = view==="month"&&date.getMonth()!==cursor.getMonth();
          const chips = nonDailyProds(date);
          const allProds = scheduledProds(date);
          const dayLogs = profile.logs.filter(l=>l.date===ds);
          const amDone = allProds.filter(p=>p.session==="am"||p.session==="both").every(p=>dayLogs.find(l=>l.productId===p.id&&l.session==="am")?.done);
          const pmDone = allProds.filter(p=>p.session==="pm"||p.session==="both").every(p=>dayLogs.find(l=>l.productId===p.id&&l.session==="pm")?.done);
          const hasAm = allProds.some(p=>p.session==="am"||p.session==="both");
          const hasPm = allProds.some(p=>p.session==="pm"||p.session==="both");
          return (
            <div key={ds} onClick={()=>setSelected(date)}
              style={{background:isToday?T.accentSoft:T.card,border:`1.5px solid ${isToday?T.accent:T.border}`,borderRadius:12,padding:view==="month"?"7px 7px 8px":"8px",cursor:"pointer",minHeight:view==="month"?76:150,opacity:isOther?0.3:1,boxShadow:isToday?`0 0 0 2px ${T.accent}33`:"none",display:"flex",flexDirection:"column",gap:2}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:isToday?800:500,width:22,height:22,borderRadius:"50%",background:isToday?T.accent:"transparent",color:isToday?"#fff":T.text,display:"flex",alignItems:"center",justifyContent:"center"}}>{date.getDate()}</span>
                <div style={{display:"flex",gap:2}}>
                  {hasAm&&<div style={{width:5,height:5,borderRadius:"50%",background:amDone?T.green:T.border}}/>}
                  {hasPm&&<div style={{width:5,height:5,borderRadius:"50%",background:pmDone?T.green:T.border}}/>}
                </div>
              </div>
              {view==="week" ? (()=>{
                const bySession = sess => allProds
                  .filter(p=>p.session===sess||p.session==="both")
                  .sort((a,b)=>(a.stepOrder||0)-(b.stepOrder||0));
                const renderSession = (sess,icon) => {
                  const prods = bySession(sess);
                  if(!prods.length) return null;
                  return (
                    <div style={{marginTop:3}}>
                      <div style={{fontSize:8,fontWeight:800,color:T.muted,letterSpacing:"0.04em",marginBottom:1}}>{icon} {sess.toUpperCase()}</div>
                      {prods.map(p=>{
                        const col=pcolor(p);
                        return (
                          <div key={p.id+sess} style={{display:"flex",alignItems:"center",gap:3,marginBottom:1}}>
                            <div style={{width:3,height:3,borderRadius:"50%",background:col.border,flexShrink:0}}/>
                            <span style={{fontSize:8.5,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.25}}>
                              {p.genericName.split(" ").slice(0,3).join(" ")}
                            </span>
                            {p.waitInstruction&&<span style={{fontSize:8,flexShrink:0}}>⏱</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                };
                return <>{renderSession("am","☀")}{renderSession("pm","🌙")}</>;
              })() : (<>
                {chips.slice(0,2).map(p=>{
                  const col=pcolor(p);
                  const done=dayLogs.find(l=>l.productId===p.id)?.done;
                  return <div key={p.id} style={{background:done?T.greenSoft:col.bg,border:`1px solid ${done?T.green:col.border}55`,borderRadius:6,padding:"2px 5px",fontSize:9,fontWeight:700,color:done?T.green:col.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.genericName.split(" ").slice(0,2).join(" ")}</div>;
                })}
                {chips.length>2&&<div style={{fontSize:9,color:T.muted}}>+{chips.length-2}</div>}
              </>)}
            </div>
          );
        })}
      </div>
      </>)}
      {selected&&(
        <DaySheet date={selected} profile={profile} onUpdate={onUpdate}
          onNavigate={dir=>setSelected(d=>addDays(d,dir))}
          onClose={()=>setSelected(null)}/>
      )}
    </div>
  );
};

// ─── CONFLICTS TAB ─────────────────────────────────────────────────────────────
const ConflictsTab = ({profile,onUpdate}) => {
  const removeProduct = id => {
    if(!window.confirm("Remove this product?")) return;
    onUpdate({products: profile.products.filter(p=>p.id!==id)});
  };
  const pairs = [];
  for(let i=0;i<profile.products.length;i++)
    for(let j=i+1;j<profile.products.length;j++)
      if(productsConflict(profile.products[i],profile.products[j]))
        pairs.push({a:profile.products[i],b:profile.products[j],reason:conflictReason(profile.products[i],profile.products[j])});
  return (
    <div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>Ingredient Conflicts</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:18}}>
        Products that shouldn't be used together. Your routine already schedules these on separate days — this is just so you can review or remove one.
      </div>
      {pairs.length===0?(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:40,marginBottom:12}}>✓</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:T.green,marginBottom:8}}>No conflicts</div>
          <div style={{fontSize:13,color:T.muted}}>None of your products clash. Nice.</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {pairs.map((c,i)=>(
            <div key={i} style={{background:T.redSoft,border:`1px solid ${T.red}44`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:700,color:T.red,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{c.reason}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[c.a,c.b].map((p,k)=>(
                  <div key={k} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,color:T.text,fontSize:13}}>{p.genericName}</div>
                      {p.brandName&&<div style={{color:T.muted,fontSize:11,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.brandName}</div>}
                    </div>
                    <button onClick={()=>removeProduct(p.id)}
                      style={{flexShrink:0,background:"transparent",color:T.red,border:`1px solid ${T.red}55`,borderRadius:100,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── PRODUCTS TAB ──────────────────────────────────────────────────────────────
const ProductsTab = ({profile,onUpdate,skinImgs,addToWishlist,wishList,
  analyzing,setAnalyzing,analyzeProgress,setAnalyzeProgress,analyzeMsg,setAnalyzeMsg,
  building,setBuilding,buildMsg,setBuildMsg,buildProgress,setBuildProgress,preview,setPreview}) => {
  const [showAdd,setShowAdd]   = useState(false);
  const [name,setName]         = useState("");
  const [brand,setBrand]       = useState("");
  const [notes,setNotes]       = useState("");
  const [sugs,setSugs]         = useState([]);
  const [showSugs,setShowSugs] = useState(false);
  const [saved,setSaved]       = useState(false);
  const [scanning,setScanning]   = useState(false);
  const [scanMsg,setScanMsg]     = useState("");
  const [scanCount,setScanCount] = useState(0);
  const analysisResult = profile.analysisResult || null; // persisted on profile, not local — survives tab switches
  const setAnalysisResult = (val) => onUpdate({analysisResult: val});
  const [expandedIds,setExpandedIds] = useState(()=>new Set()); // product ids with upgrade options expanded
  const toggleExpand = id => setExpandedIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const [sortDir,setSortDir]       = useState("keep-first"); // keep-first | remove-first
  const [filterTag,setFilterTag]   = useState("all");
  const missingAccepted = profile.missingAccepted || {}; // persisted on profile, not local
  const setMissingAccepted = (fnOrVal) => {
    const next = typeof fnOrVal==="function" ? fnOrVal(profile.missingAccepted||{}) : fnOrVal;
    onUpdate({missingAccepted: next});
  };
  const [findingFor,setFindingFor] = useState(null);
  const [diagRunning,setDiagRunning] = useState(false);
  const [diagResults,setDiagResults] = useState([]);
  const [productSearch,setProductSearch] = useState("");

  const onNameChange = v => {
    setName(v);
    if(v.length>=2){
      const q=v.toLowerCase();
      const m=SUGGESTIONS.filter(s=>s.toLowerCase().includes(q)).slice(0,7);
      setSugs(m); setShowSugs(m.length>0);
    } else { setShowSugs(false); }
  };

  const addProduct = () => {
    if(!name.trim()) return;
    const prod = {id:Date.now(),genericName:name.trim(),brandName:brand.trim(),notes:notes.trim(),session:"",frequency:"",stepOrder:0,nextDate:"",isOneOff:false,scheduled:false};
    onUpdate({products:[...profile.products, prod]});
    setName(""); setBrand(""); setNotes(""); setShowAdd(false); setShowSugs(false);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const removeProduct = id => {
    onUpdate({products:profile.products.filter(p=>p.id!==id)});
  };

  const analyzeProducts = async () => {
    if(!profile.products.length) return;
    setAnalyzing(true); setAnalyzeMsg(""); setAnalysisResult(null);
    setAnalyzeProgress({done:0, total:0, label:"Preparing…"});
    try {
      const skinCtx = [
        profile.type && `Skin type: ${profile.type}`,
        profile.concerns?.length && `Concerns: ${profile.concerns.join(", ")}`,
        profile.notes && `Notes: ${profile.notes}`,
        profile.analysisText && `Recent skin analysis: ${profile.analysisText.slice(0,500)}`,
      ].filter(Boolean).join("\n") || "No skin profile provided";

      // Batch products so the JSON response never truncates (4 per call —
      // each item carries a reason + alternatives, sized for max_tokens 1000)
      const BATCH = 4;
      const batches = [];
      for(let i=0;i<profile.products.length;i+=BATCH) batches.push(profile.products.slice(i,i+BATCH));

      const total = batches.length + 1; // +1 for the "missing products" pass
      setAnalyzeProgress({done:0, total, label:`Analysing products 1–${Math.min(BATCH,profile.products.length)}…`});

      const all = [];
      for(let b=0;b<batches.length;b++){
        const batch = batches[b];
        const listStr = batch.map(p=>`ID:${p.id} | ${p.genericName}${p.brandName?` (${p.brandName})`:""}`).join("\n");
        const prompt = `You are a board-certified dermatologist and cosmetic chemist.

PATIENT SKIN PROFILE:
${skinCtx}

PRODUCTS TO RANK:
${listStr}

For EACH product assign exactly one ranking tag:
- "keep-asis" — clinically effective, well-suited to this skin, no change needed
- "upgrade" — works but a more effective / better-researched product exists; give exactly 3 upgrade options with brand names
- "nice-to-have" — harmless but little benefit for this skin
- "consider-removing" — may cause harm, irritation, or works against this skin's goals

Return ONLY a JSON array, no markdown, no extra text:
[{"id":"NUMERIC_ID","productName":"name","tag":"keep-asis|upgrade|nice-to-have|consider-removing","reason":"one clinical sentence","alternatives":[{"name":"Brand Product","why":"why more effective"},{"name":"Brand Product","why":"why"},{"name":"Brand Product","why":"why"}]}]
Include "alternatives" (exactly 3) ONLY for tag="upgrade"; omit it otherwise.`;

        const content = [];
        if(b===0) content.push(...apiImageBlocks(skinImgs));
        content.push({type:"text",text:prompt});

        const result = await callClaude([{role:"user",content}], 1000);
        all.push(...extractJsonObjects(result));
        const nextStart = (b+1)*BATCH+1;
        setAnalyzeProgress({done:b+1, total,
          label: b+1<batches.length
            ? `Analysing products ${nextStart}–${Math.min(nextStart+BATCH-1,profile.products.length)}…`
            : "Finding gaps in your routine…"});
      }

      // Final pass: missing products
      try {
        const allNames = profile.products.map(p=>p.genericName).join(", ");
        const mPrompt = `Dermatologist. Skin profile:\n${skinCtx}\n\nCurrent products: ${allNames}\n\nList up to 3 clinically important products MISSING from this routine for this skin. Return ONLY JSON array:\n[{"id":"missing_1","productName":"name","tag":"missing","reason":"one clinical sentence"}]`;
        const mRes = await callClaude([{role:"user",content:[{type:"text",text:mPrompt}]}], 600);
        all.push(...extractJsonObjects(mRes));
      } catch(_){}

      setAnalyzeProgress({done:total, total, label:"Done"});
      if(!all.length) throw new Error("No results returned. Please try again.");
      setAnalysisResult({items:all, analyzedAt:new Date().toISOString()});
    } catch(err) {
      if(/All models rejected|fetch rejected|Network/i.test(err.message)){
        // AI bridge unreachable (phone) — run the deterministic rule-based analysis.
        const items = offlineAnalysis(profile.products);
        setAnalyzeProgress({done:1, total:1, label:"Done"});
        setAnalysisResult({items, analyzedAt:new Date().toISOString(), offline:true});
        setAnalyzeMsg("");
      } else {
        setAnalyzeMsg(`Analysis failed: ${err.message}`);
      }
    }
    setAnalyzing(false);
  };

  // When user accepts a "missing" recommendation, find 3 concrete products to choose from
  const findProductsFor = async (missingItem) => {
    setFindingFor(missingItem.productName);
    try {
      const skinCtx = [profile.type&&`Skin type: ${profile.type}`, profile.concerns?.length&&`Concerns: ${profile.concerns.join(", ")}`].filter(Boolean).join("; ");
      const prompt = `Dermatologist. For a patient with ${skinCtx||"combination skin"}, recommend exactly 3 specific, real, purchasable products for this need: "${missingItem.productName}" (${missingItem.reason||""}).
Return ONLY JSON array, no markdown:
[{"name":"Brand + Exact Product Name","why":"one clinical sentence why it's effective and suitable"}]`;
      const res = await callClaude([{role:"user",content:[{type:"text",text:prompt}]}], 700);
      const c = res.replace(/```json|```/g,"").trim();
      const s = c.indexOf("["), e = c.lastIndexOf("]");
      if(s>=0&&e>s){
        const opts = JSON.parse(c.slice(s,e+1));
        setMissingAccepted(prev=>({...prev, [missingItem.productName]:opts}));
      }
    } catch(err){
      if(/All models rejected|fetch rejected|Network/i.test(err.message)){
        window.alert("Finding product suggestions needs the AI, which isn't reachable on this device. Try this on desktop.");
      }
    }
    setFindingFor(null);
  };

  const buildRoutine = async () => {
    if(!profile.products.length) return;
    setBuilding(true); setBuildMsg(""); setPreview(null);
    setBuildProgress({done:0, total:3, label:"Building your schedule…"});
    try {
      const today = todayStr();
      const FREQ_IV = {daily:1,"twice-weekly":3,weekly:7,"bi-weekly":14,monthly:30,"6-weekly":42,"8-weekly":56};
      const addDaysStr = (s,n) => { const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };

      const conflictPairs = CONFLICT_PAIRS.map(([a,b])=>`${a} + ${b}`).join("; ");

      // Skin context from profile + analysis
      const skinCtx = [
        profile.type && `Skin type: ${profile.type}`,
        profile.concerns.length && `Concerns: ${profile.concerns.join(", ")}`,
        profile.notes && `Notes: ${profile.notes}`,
        profile.analysisText && `Recent analysis summary: ${profile.analysisText.slice(0,400)}`,
        skinImgs.length>0 && `${skinImgs.length} skin photo(s) available for context`,
      ].filter(Boolean).join("\n");

      const rulesBlock = `A REALISTIC routine has AT MOST ~4–6 steps per session on any given day. Real dermatologists and aestheticians do NOT have anyone layer 12+ products daily — that is unrealistic and causes irritation and abandonment.

CANONICAL DERMATOLOGIST FRAMEWORK (follow this standard structure):
- AM: cleanse (or gentle water rinse) → antioxidant (vitamin C) → moisturiser → SPF. Actives are NOT for the morning.
- PM: cleanse → ONE treatment for the night (a retinoid OR an exfoliant — NEVER both, NEVER two retinoids, NEVER two exfoliants) → moisturiser.
HARD LIMITS: at most ONE retinoid per day, at most ONE exfoliant per day, across the whole routine.

CLEANSERS: schedule EVERY cleanser — never drop one. A cleansing OIL is PM (removes SPF/grime, first step). A gel/foaming/gentle cleanser is the everyday cleanse (AM and/or PM). The morning must include a cleanse or explicit water rinse.
SCHEDULE EVERY PRODUCT exactly once — if something is redundant, give it a LOW frequency rather than omitting it.

DAILY (every single day) — ONLY these essentials:
- AM: gentle cleanser (or water rinse), ONE hydrating/antioxidant serum (only if well-suited), moisturiser, SPF
- PM: cleanser, ONE core treatment OR ONE hydrating serum, moisturiser
Everything else ROTATES to a NON-daily frequency, spread so no more than ~1–2 "extras" land on the same day:
- Actives (retinol, AHA/BHA, vitamin C, exfoliants): twice-weekly or weekly, offset from each other
- Duplicate/extra serums & essences, niacinamide, brightening serums, extra hydrators: twice-weekly — do NOT stack several serums on the same day; alternate them across days
- Masks, peels, treatments: weekly / bi-weekly / monthly
- Self-tanning: weekly (NEVER daily)
- Thermal water / mists / optional extras: weekly or as-needed
Assign "dayOffset" (0–6) to push non-daily products onto DIFFERENT days of the week so every day stays light and balanced. Give duplicate or conflicting products DIFFERENT offsets.

FREQUENCY OPTIONS: daily(1d), twice-weekly(3d), weekly(7d), bi-weekly(14d), monthly(30d), 6-weekly(42d), 8-weekly(56d).

STEP ORDER in a session: cleanser=1, toner/essence=2, thin serums=3–5, thicker serums/treatments=6, moisturiser=8, face oil=9, SPF=99.

SESSION RULES: Vitamin C→AM. Retinol/retinoids→PM. AHA/BHA→PM (offset from retinol). Niacinamide→AM. SPF→AM only.

CONFLICT PAIRS — must NEVER share a day: ${conflictPairs}

waitInstruction: leave "" for the VAST MAJORITY of products. Set it ONLY for genuinely critical steps — chiefly SPF ("Wait until serums fully absorbed before applying") and strong actives over damp skin. Under 12 words.`;

      // ── SINGLE CALL: the AI must see the WHOLE routine at once to balance the
      // daily step load. (Batching per-5 was the cause of everything defaulting
      // to daily → 12–13 steps/day.) Compact output fits easily in 2000 tokens.
      const total = 2;
      setBuildProgress({done:0, total, label:"Designing a balanced routine…"});
      const listStr = profile.products.map(p=>`ID:${p.id} | ${p.genericName}${p.brandName?` (${p.brandName})`:""}`).join("\n");
      const prompt = `You are a board-certified dermatologist and aesthetician building a REALISTIC, low-friction routine. Patients abandon routines with too many daily steps, so keep each day light and rotate non-essentials across the week.

PATIENT SKIN CONTEXT:
${skinCtx||"Not provided"}

${rulesBlock}

FULL PRODUCT LIST (schedule EVERY one exactly once, use EXACT numeric IDs):
${listStr}

Return ONLY a JSON array, no markdown:
[{"id":"EXACT_ID","session":"am|pm|both","frequency":"daily|twice-weekly|weekly|bi-weekly|monthly|6-weekly|8-weekly","stepOrder":1,"dayOffset":0,"waitInstruction":""}]
Keep each day to ~4–6 steps per session by rotating extras. Every product exactly once.`;

      const content = [];
      content.push(...apiImageBlocks(skinImgs));
      content.push({type:"text",text:prompt});
      let rawSchedule = [];
      let builtOffline = false;
      try {
        const res = await callClaude([{role:"user",content}], 2000);
        rawSchedule = extractJsonObjects(res);
      } catch(apiErr){
        // AI bridge unreachable (e.g. iPhone runtime) — build deterministically.
        builtOffline = true;
      }
      if(!rawSchedule.length){
        builtOffline = true;
        rawSchedule = buildScheduleOffline(profile.products);
      }
      setBuildProgress({done:1, total, label:"Resolving scheduling conflicts…"});

      // ── DETERMINISTIC CONFLICT ENFORCEMENT ───────────────────────────────
      // Even if AI does it right, we verify and fix in code.
      // Strategy: for each conflict pair, simulate their occurrence dates
      // over 90 days. If any overlap, shift p2's nextDate forward until clear.
      const assigned = {};
      rawSchedule.forEach(r=>{
        const off = Math.max(0, Math.min(6, parseInt(r.dayOffset)||0));
        // Daily items start today; rotating items start on their offset day so
        // extras land on different days of the week instead of stacking.
        const nd = r.nextDate || (r.frequency==="daily" ? today : addDaysStr(today, off));
        assigned[String(r.id)] = {...r, nextDate: nd};
      });

      const getOccurrences = (r, days=90) => {
        const iv = FREQ_IV[r.frequency]||7;
        if(iv<=0) return [];
        const out = [];
        const start = new Date(r.nextDate+"T12:00:00");
        for(let i=0;i<days/iv+1;i++){
          const d = new Date(start); d.setDate(d.getDate()+i*iv);
          out.push(d.toISOString().split("T")[0]);
        }
        return out;
      };

      const sharesDay = (r1, r2) => {
        const d1 = new Set(getOccurrences(r1));
        return getOccurrences(r2).some(d=>d1.has(d));
      };

      // Only conflicts within same session matter (different sessions = no conflict)
      const sameOrBothSession = (r1,r2) => {
        if(r1.session==="both"||r2.session==="both") return true;
        return r1.session===r2.session;
      };

      // Frequency escalation ladder — if staggering fails, reduce frequency
      const FREQ_LADDER = ["daily","twice-weekly","weekly","bi-weekly","monthly"];
      const escalate = freq => {
        const idx = FREQ_LADDER.indexOf(freq);
        return idx>=0&&idx<FREQ_LADDER.length-1 ? FREQ_LADDER[idx+1] : "monthly";
      };

      // ── STEP A: enforce hard clinical sessions (acids/retinoids→PM, vit C & SPF→AM)
      // regardless of what the AI proposed. This alone kills "exfoliant in the AM".
      profile.products.forEach(p=>{
        const r = assigned[String(p.id)];
        if(!r) return;
        const fs = forcedSession(p);
        if(fs && r.session!==fs && r.session!=="both") r.session = fs;
      });

      // ── STEP B: separate EVERY conflicting pair (category-based, all products),
      // so e.g. tretinoin and an AHA/BHA toner can never share a day.
      const orderedPairs = [];
      for(let i=0;i<profile.products.length;i++)
        for(let j=i+1;j<profile.products.length;j++)
          if(productsConflict(profile.products[i], profile.products[j]))
            orderedPairs.push([profile.products[i], profile.products[j]]);

      for(const [p1,p2] of orderedPairs){
        const r1 = assigned[String(p1.id)];
        const r2 = assigned[String(p2.id)];
        if(!r1||!r2) continue;
        if(!sameOrBothSession(r1,r2)) continue;

        // Pass 1: shift p2's start date day-by-day until no shared day (up to 30)
        for(let attempt=0; attempt<30 && sharesDay(r1,assigned[String(p2.id)]); attempt++){
          const cur = assigned[String(p2.id)];
          assigned[String(p2.id)] = {...cur, nextDate: addDaysStr(cur.nextDate,1)};
        }
        // Pass 2: if frequencies still force overlap, reduce p2's frequency & re-stagger
        if(sharesDay(r1, assigned[String(p2.id)])){
          const cur = assigned[String(p2.id)];
          assigned[String(p2.id)] = {...cur, frequency:escalate(cur.frequency), nextDate:today};
          for(let attempt=0; attempt<30 && sharesDay(r1,assigned[String(p2.id)]); attempt++){
            const c = assigned[String(p2.id)];
            assigned[String(p2.id)] = {...c, nextDate: addDaysStr(c.nextDate,1)};
          }
        }
      }

      const finalSchedule = Object.values(assigned);
      setBuildProgress({done:total, total, label:"Done"});
      // Apply directly — schedule onto products now. (No separate preview/apply step.)
      onUpdate({products: enforceScheduleInvariants(applyScheduleToProducts(profile.products, finalSchedule, todayStr()))});
      setSaved(true); setTimeout(()=>setSaved(false),2000);
      const n = finalSchedule.length;
      setBuildMsg(builtOffline
        ? `✓ Scheduled ${n} product${n!==1?"s":""} using built-in dermatologist rules. (AI isn't reachable on this device — rebuild on desktop anytime for AI-personalised fine-tuning.)`
        : `✓ Scheduled ${n} product${n!==1?"s":""}.`);

    } catch(e) {
      setBuildMsg(`Error: ${e.message}`);
    }
    setBuilding(false);
  };

  const applyPreview = () => {
    if(!preview) return;
    const schedule = preview.schedule || preview; // handle both shapes
    onUpdate({products: enforceScheduleInvariants(applyScheduleToProducts(profile.products, schedule, todayStr()))});
    setPreview(null);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const handleScan = async e => {
    const files = Array.from(e.target.files||[]); if(!files.length) return; e.target.value="";
    setScanning(true); setScanMsg(""); setScanCount(0);
    const newProds = [];
    const newImgs = [];
    const errors = [];
    let aiDown = false;
    for(let fi=0; fi<files.length; fi++){
      const file = files[fi];
      setScanMsg(`Reading ${fi+1}/${files.length}…`);
      let saved = null;
      try {
        saved = await loadImage(file);
      } catch(err){ errors.push(`Photo ${fi+1}: ${err.message}`); continue; }
      const {b64, mime, preview} = saved;
      // Save every scanned photo to the gallery, regardless of identification outcome
      newImgs.push({b64, mime, preview, kind:"product", addedAt:new Date().toISOString()});
      const baseProd = {
        id: Date.now()+fi+Math.random(),
        genericName:"", brandName:"",
        notes:"", session:"", frequency:"", stepOrder:0,
        nextDate:"", isOneOff:false, scheduled:false,
      };
      const imgBlocks = apiImageBlocks([{b64, mime}]);
      if(!imgBlocks.length){
        // Unsupported format for the API (e.g. HEIC) — keep the product anyway.
        newProds.push({...baseProd, genericName:"New product — tap ✎ to name", pendingIdentify:true});
        continue;
      }
      if(aiDown){
        // AI already failed this session — don't burn a call per photo.
        newProds.push({...baseProd, genericName:"New product — tap ✎ to name", pendingIdentify:true});
        continue;
      }
      try {
        setScanMsg(`Identifying ${fi+1}/${files.length}…`);
        const result = await callClaude([{role:"user",content:[
          imgBlocks[0],
          {type:"text",text:'What skincare product is this? Reply with ONLY a JSON object, no markdown, no explanation: {"genericName":"product type/category","brandName":"brand name and product name"}'},
        ]}],300);
        const clean = result.replace(/```json|```/g,"").trim();
        const st=clean.indexOf("{"), en=clean.lastIndexOf("}");
        if(st<0||en<0) throw new Error("No JSON in response");
        const parsed = JSON.parse(clean.slice(st,en+1));
        newProds.push({...baseProd, genericName:parsed.genericName||"Product", brandName:parsed.brandName||""});
      } catch(err) {
        // AI unavailable (e.g. phone runtime) — SAVE the product anyway, name it later.
        if(/All models rejected|fetch rejected|Network/i.test(err.message)) aiDown = true;
        newProds.push({...baseProd, genericName:"New product — tap ✎ to name", pendingIdentify:true});
      }
    }
    if(newProds.length||newImgs.length){
      onUpdate({
        products: newProds.length ? [...profile.products, ...newProds] : profile.products,
        skinImgs: newImgs.length ? [...(profile.skinImgs||[]), ...newImgs] : profile.skinImgs,
      });
      setScanCount(newProds.length);
      setSaved(true); setTimeout(()=>setSaved(false),2000);
    }
    const pendingCount = newProds.filter(p=>p.pendingIdentify).length;
    setScanMsg(
      errors.length ? `⚠️ ${errors.join(" | ")}`
      : pendingCount ? `✓ Saved ${newProds.length} product${newProds.length>1?"s":""} with photo${newImgs.length>1?"s":""}. AI identification isn't available on this device — tap ✎ on the card to name ${pendingCount>1?"them":"it"}, or use "Identify" on desktop.`
      : newProds.length ? `✓ Added ${newProds.length} product${newProds.length>1?"s":""}`
      : "No products added"
    );
    setScanning(false);
  };

  const conflicts = findConflicts(profile.products.filter(p=>p.scheduled));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* ── Scan Products ──────────────────────────────────────────────── */}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:scanMsg&&!scanning?10:0}}>
          <div>
            <div style={{fontWeight:700,color:T.text,fontSize:14}}>📷 Scan Products</div>
            <div style={{fontSize:12,color:T.muted}}>Take a photo or pick from gallery to identify a product.</div>
          </div>
          {scanning?(
            <div style={{background:T.accentSoft,color:T.accent,border:`1.5px solid ${T.accent}44`,borderRadius:100,padding:"9px 16px",fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>⏳ {scanMsg||"Scanning…"}</div>
          ):(
            <div style={{display:"flex",gap:6}}>
              <label htmlFor="scan-camera" style={{cursor:"pointer",position:"relative",display:"inline-block"}}>
                <div style={{background:T.accentSoft,color:T.accent,border:`1.5px solid ${T.accent}44`,borderRadius:100,padding:"9px 16px",fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>📷</div>
                <input id="scan-camera" type="file" accept="image/*" capture="environment" onChange={handleScan}
                  style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}}/>
              </label>
              <label htmlFor="scan-gallery" style={{cursor:"pointer",position:"relative",display:"inline-block"}}>
                <div style={{background:T.accentSoft,color:T.accent,border:`1.5px solid ${T.accent}44`,borderRadius:100,padding:"9px 16px",fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>🖼</div>
                <input id="scan-gallery" type="file" accept="image/*" multiple onChange={handleScan}
                  style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}}/>
              </label>
            </div>
          )}
        </div>
        {scanMsg&&!scanning&&(
          <div style={{fontSize:12,padding:"8px 12px",borderRadius:8,marginTop:8,
            background: scanMsg.startsWith("⚠️")?T.redSoft:T.greenSoft,
            color: scanMsg.startsWith("⚠️")?T.red:T.green,fontWeight:600}}>
            {scanMsg}
          </div>
        )}
      </Card>

      {/* ── Analyse Products ───────────────────────────────────────────── */}
      {profile.products.length>0&&(
        <div style={{background:`linear-gradient(135deg,${T.accentSoft},#e8f4ff)`,border:`1px solid ${T.blue}33`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontWeight:700,color:T.blue,fontSize:14,marginBottom:2}}>🔬 Analyse My Products</div>
              <div style={{color:T.muted,fontSize:12}}>AI reviews clinical evidence & reviews — suggests keeps, swaps, and gaps.</div>
            </div>
            <Btn onClick={analyzeProducts} disabled={analyzing}
              style={{flexShrink:0,background:T.blue,color:"#fff"}}>
              {analyzing?"⏳ Analysing…":"Analyse"}
            </Btn>
          </div>
          {analyzing&&analyzeProgress.total>0&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.muted,marginBottom:5,fontWeight:600}}>
                <span>{analyzeProgress.label}</span>
                <span>{Math.round((analyzeProgress.done/analyzeProgress.total)*100)}%</span>
              </div>
              <div style={{height:6,background:"#fff",borderRadius:100,overflow:"hidden",border:`1px solid ${T.blue}22`}}>
                <div style={{height:"100%",width:`${(analyzeProgress.done/analyzeProgress.total)*100}%`,background:T.blue,borderRadius:100,transition:"width 0.4s ease"}}/>
              </div>
            </div>
          )}
          {analyzeMsg&&<div style={{color:T.red,fontSize:12,marginTop:8}}>{analyzeMsg}</div>}
        </div>
      )}


      {/* ── Build Routine ──────────────────────────────────────────────── */}
      {profile.products.length>0&&(
        <div style={{background:`linear-gradient(135deg,${T.accentSoft},${T.peachSoft})`,border:`1px solid ${T.accent}44`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontWeight:700,color:T.accent,fontSize:14,marginBottom:2}}>
                {profile.products.some(p=>p.scheduled)?"✨ Rebuild Routine":"✨ Build My Routine"}
              </div>
              <div style={{color:T.muted,fontSize:12}}>AI schedules every product based on your skin & photos. Zero conflicts guaranteed.</div>
            </div>
            <Btn onClick={buildRoutine} disabled={building} style={{flexShrink:0}}>
              {building?"⏳ Building…":"Build Routine"}
            </Btn>
          </div>
          {building&&buildProgress.total>0&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.muted,marginBottom:5,fontWeight:600}}>
                <span>{buildProgress.label}</span>
                <span>{Math.round((buildProgress.done/buildProgress.total)*100)}%</span>
              </div>
              <div style={{height:6,background:"#fff",borderRadius:100,overflow:"hidden",border:`1px solid ${T.accent}33`}}>
                <div style={{height:"100%",width:`${(buildProgress.done/buildProgress.total)*100}%`,background:T.accent,borderRadius:100,transition:"width 0.4s ease"}}/>
              </div>
            </div>
          )}
          {buildMsg&&<div style={{color:buildMsg.startsWith("✓")?T.green:T.red,fontSize:12,marginTop:8,fontWeight:600}}>{buildMsg}</div>}
          {buildMsg&&!buildMsg.startsWith("✓")&&(
            <div style={{marginTop:10}}>
              <button onClick={async()=>{ setDiagRunning(true); setDiagResults(["Running probes…"]); const r = await runApiDiagnostic(); setDiagResults(r); setDiagRunning(false); }}
                disabled={diagRunning}
                style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:100,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:diagRunning?"default":"pointer",fontFamily:"'Inter',sans-serif"}}>
                {diagRunning?"⏳ Testing API…":"🔧 Debug API — find the exact cause"}
              </button>
              {diagResults.length>0&&(
                <div style={{marginTop:8,background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px"}}>
                  {diagResults.map((r,i)=>(
                    <div key={i} style={{fontSize:11,fontFamily:"monospace",color:r.startsWith("✓")?T.green:r.startsWith("✗")?T.red:T.muted,lineHeight:1.7,wordBreak:"break-word"}}>{r}</div>
                  ))}
                  <div style={{fontSize:10,color:T.muted,marginTop:6}}>Send these lines to Claude to pinpoint the fix.</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Unified product list: routine + analysis in one card each ────── */}
      {profile.products.length>0&&(()=>{
        const TAG_STYLE = {
          "keep-asis":         {color:T.green, bg:T.greenSoft, label:"Keep",     dot:"✓", rank:0},
          "upgrade":           {color:T.blue,  bg:T.blueSoft,  label:"Upgrade",  dot:"⬆", rank:1},
          "nice-to-have":      {color:T.muted, bg:T.faint,     label:"Optional", dot:"○", rank:2},
          "consider-removing": {color:T.red,   bg:T.redSoft,   label:"Remove",   dot:"✕", rank:3},
        };
        const items   = analysisResult?.items || [];
        const hasAna  = items.length>0;
        const anaById = {};
        items.forEach(it=>{ if(it.tag!=="missing") anaById[String(it.id)] = it; });
        const missing = items.filter(r=>r.tag==="missing");
        const isWished = (name) => (wishList||[]).some(w=>w.name===name);

        // Build display list: analyzed products sorted by tag, unanalyzed always last
        let list = [...profile.products];
        // Search filter (name/brand/notes)
        const q = (productSearch||"").trim().toLowerCase();
        if(q) list = list.filter(p=>[p.genericName,p.brandName,p.notes].filter(Boolean).some(f=>f.toLowerCase().includes(q)));
        if(hasAna && filterTag!=="all") list = list.filter(p=>anaById[String(p.id)]?.tag===filterTag);
        if(hasAna){
          const withTag = list.filter(p=>anaById[String(p.id)]);
          const noTag   = list.filter(p=>!anaById[String(p.id)]);
          withTag.sort((a,b)=>{
            const ra=TAG_STYLE[anaById[String(a.id)].tag]?.rank??9, rb=TAG_STYLE[anaById[String(b.id)].tag]?.rank??9;
            return sortDir==="keep-first" ? ra-rb : rb-ra;
          });
          list = [...withTag, ...noTag];
        }
        const FILTERS = [["all","All"],["keep-asis","Keep"],["upgrade","Upgrade"],["nice-to-have","Optional"],["consider-removing","Remove"]];
        const analyzedDate = analysisResult?.analyzedAt ? new Date(analysisResult.analyzedAt) : null;

        return (
        <div>
          {/* Section header */}
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:10,padding:"0 2px"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:T.text}}>Your Products</div>
            <div style={{fontSize:12,color:T.muted}}>{profile.products.length} total · {profile.products.filter(p=>p.scheduled).length} scheduled</div>
          </div>

          {/* Product search */}
          {profile.products.length>4&&(
            <div style={{marginBottom:12,position:"relative"}}>
              <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search your products…"
                style={{width:"100%",boxSizing:"border-box",padding:"9px 32px 9px 12px",borderRadius:10,border:`1px solid ${T.border}`,fontSize:13,fontFamily:"'Inter',sans-serif",background:T.faint,color:T.text}}/>
              {productSearch&&<button onClick={()=>setProductSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:16}}>×</button>}
            </div>
          )}

          {/* Sort + filter (only once analysis exists) */}
          {hasAna&&(
            <div style={{marginBottom:14,padding:"0 2px"}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8}}>
                Analysed {analyzedDate?`${fmtLong(analyzedDate)} · ${analyzedDate.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:""}{analysisResult?.offline?" · rule-based offline check (run on desktop for full AI review)":""}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>setSortDir(d=>d==="keep-first"?"remove-first":"keep-first")}
                  style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:100,padding:"6px 12px",fontSize:11,fontWeight:600,color:T.text,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                  {sortDir==="keep-first"?"↓ Keep first":"↑ Remove first"}
                </button>
                {FILTERS.map(([val,lbl])=>(
                  <button key={val} onClick={()=>setFilterTag(val)}
                    style={{background:filterTag===val?T.accent:T.faint,color:filterTag===val?"#fff":T.muted,border:`1px solid ${filterTag===val?T.accent:T.border}`,borderRadius:100,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested additions (missing products) */}
          {missing.length>0&&filterTag==="all"&&(
            <div style={{marginBottom:14,background:`linear-gradient(135deg,${T.accentSoft},${T.peachSoft})`,border:`1px solid ${T.accent}33`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:11,fontWeight:700,color:T.accent,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>➕ Suggested additions</div>
              {missing.map((r,i)=>{
                const accepted = missingAccepted[r.productName];
                return (
                  <div key={i} style={{marginBottom:i<missing.length-1?12:0,paddingBottom:i<missing.length-1?12:0,borderBottom:i<missing.length-1?`1px solid ${T.accent}22`:"none"}}>
                    <div style={{fontWeight:700,color:T.text,fontSize:13}}>{r.productName}</div>
                    <div style={{color:T.muted,fontSize:12,marginTop:2,lineHeight:1.45,marginBottom:accepted?0:9}}>{r.reason}</div>
                    {!accepted&&(
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>findProductsFor(r)} disabled={findingFor===r.productName}
                          style={{background:T.accent,color:"#fff",border:"none",borderRadius:100,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                          {findingFor===r.productName?"⏳ Finding…":"✓ Accept — find products"}
                        </button>
                        <button onClick={()=>{ if(window.confirm(`Reject "${r.productName}"? It may be suggested again next time you run analysis.`)) setMissingAccepted(prev=>({...prev,[r.productName]:"rejected"})); }}
                          style={{background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:100,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                          Reject
                        </button>
                      </div>
                    )}
                    {accepted==="rejected"&&<div style={{fontSize:12,color:T.muted,fontStyle:"italic",marginTop:8}}>Dismissed</div>}
                    {Array.isArray(accepted)&&(
                      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                        {accepted.map((opt,oi)=>(
                          <div key={oi} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px"}}>
                            <div style={{fontWeight:600,color:T.text,fontSize:12}}>{opt.name}</div>
                            <div style={{color:T.muted,fontSize:11,marginTop:2,lineHeight:1.4}}>{opt.why}</div>
                            <div style={{display:"flex",gap:10,marginTop:8,alignItems:"center"}}>
                              <button onClick={()=>addToWishlist({name:opt.name,why:opt.why,source:"missing",forProduct:r.productName})}
                                disabled={isWished(opt.name)}
                                style={{background:isWished(opt.name)?T.greenSoft:T.accent,color:isWished(opt.name)?T.green:"#fff",border:"none",borderRadius:100,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:isWished(opt.name)?"default":"pointer",fontFamily:"'Inter',sans-serif"}}>
                                {isWished(opt.name)?"💛 In wishlist":"+ Wishlist"}
                              </button>
                              <a href={buyLink(opt.name)} target="_blank" rel="noopener noreferrer" style={{color:T.blue,fontSize:11,fontWeight:600,textDecoration:"none"}}>🔍 Buy →</a>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>accepted.forEach(opt=>addToWishlist({name:opt.name,why:opt.why,source:"missing",forProduct:r.productName}))}
                          style={{background:"transparent",color:T.accent,border:`1px solid ${T.accent}55`,borderRadius:100,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",alignSelf:"flex-start"}}>
                          💛 Add all to wishlist
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unified product cards */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {list.length===0&&(
              <div style={{textAlign:"center",padding:"28px 0",color:T.muted,fontSize:13,fontStyle:"italic"}}>No products match this filter.</div>
            )}
            {list.map(p=>{
              const col = pcolor(p);
              const ana = anaById[String(p.id)];
              const ts  = ana ? (TAG_STYLE[ana.tag]||TAG_STYLE["nice-to-have"]) : null;
              const sessionIcon = p.session==="am"?"☀️":p.session==="pm"?"🌙":p.session==="both"?"☀️🌙":"";
              const sessionLbl  = p.session==="both"?"AM + PM":p.session?.toUpperCase();
              const buyName = p.brandName || p.genericName;
              const expanded = expandedIds.has(p.id);
              const hasUpgrades = ana?.tag==="upgrade" && ana.alternatives?.length>0;
              return (
                <div key={p.id} style={{position:"relative",background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 16px 14px 18px",boxShadow:T.shadow,overflow:"hidden"}}>
                  {/* category accent stripe */}
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:col.border}}/>

                  {/* header */}
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,color:p.pendingIdentify?T.muted:T.text,fontSize:14,lineHeight:1.3,fontStyle:p.pendingIdentify?"italic":"normal"}}>{p.genericName}</div>
                      {p.brandName&&<div style={{color:T.muted,fontSize:12,marginTop:1,lineHeight:1.3}}>{p.brandName}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {ts&&(
                        <span style={{background:ts.bg,color:ts.color,border:`1px solid ${ts.color}44`,borderRadius:100,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                          {ts.dot} {ts.label}
                        </span>
                      )}
                      <button title="Rename" onClick={()=>{
                        const nn = window.prompt("Product name (e.g. Purifying Gel Cleanser):", p.pendingIdentify?"":p.genericName);
                        if(nn===null) return;
                        const nb = window.prompt("Brand (optional):", p.brandName||"");
                        onUpdate({products: profile.products.map(x=>x.id===p.id?{...x, genericName:(nn||x.genericName).trim(), brandName:(nb??x.brandName??"").trim(), pendingIdentify:false}:x)});
                      }} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:14,lineHeight:1,padding:0}}>✎</button>
                      <button onClick={()=>removeProduct(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18,lineHeight:1,padding:0}}>×</button>
                    </div>
                  </div>

                  {/* pending identification notice */}
                  {p.pendingIdentify&&(
                    <div style={{marginTop:8,fontSize:11,color:T.muted,lineHeight:1.45}}>
                      Photo saved to Gallery. Tap ✎ to name this product yourself — or, on desktop, run product analysis after naming.
                    </div>
                  )}

                  {/* routine row */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    {p.scheduled?(
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,background:col.bg,color:col.text,border:`1px solid ${col.border}40`,borderRadius:100,padding:"3px 11px",fontSize:11,fontWeight:600}}>
                        <span>{sessionIcon}</span>{sessionLbl} · {FREQS[p.frequency]||p.frequency}
                      </span>
                    ):(
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,background:ana?.tag==="consider-removing"?T.redSoft:T.faint,color:ana?.tag==="consider-removing"?T.red:T.muted,border:`1px solid ${ana?.tag==="consider-removing"?T.red+"33":T.border}`,borderRadius:100,padding:"3px 11px",fontSize:11,fontWeight:600,fontStyle:"italic"}}>
                        ○ Not scheduled
                      </span>
                    )}
                  </div>

                  {/* not-scheduled explanation — always shown, never a silent gap */}
                  {!p.scheduled&&(
                    ana?.tag==="consider-removing"?(
                      <div style={{marginTop:7,fontSize:11,color:T.muted,lineHeight:1.4}}>
                        Analysis flagged this for removal, so it was left out of your routine on purpose. Remove it with × if you no longer want it, or schedule it anyway below.
                      </div>
                    ):(
                      <div style={{marginTop:7,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:T.muted,lineHeight:1.4}}>
                          {ana ? "Rated but not yet added to your routine — " : "Hasn't been scheduled yet — "}run Build Routine to place it.
                        </span>
                        <button onClick={buildRoutine} disabled={building}
                          style={{background:"transparent",color:T.accent,border:`1px solid ${T.accent}55`,borderRadius:100,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:building?"default":"pointer",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
                          {building?"⏳ Scheduling…":"Schedule now →"}
                        </button>
                      </div>
                    )
                  )}

                  {/* wait instruction */}
                  {p.scheduled&&p.waitInstruction&&(
                    <div style={{marginTop:7,fontSize:11,color:T.accent,fontStyle:"italic",display:"flex",alignItems:"center",gap:5}}>
                      <span>⏱</span><span>{p.waitInstruction}</span>
                    </div>
                  )}

                  {/* analysis reason */}
                  {ana?.reason&&(
                    <div style={{marginTop:9,fontSize:12,color:T.text,lineHeight:1.5,opacity:0.78,borderLeft:`2px solid ${ts.color}33`,paddingLeft:10}}>
                      {ana.reason}
                    </div>
                  )}

                  {/* footer: upgrade toggle + buy + notes */}
                  <div style={{display:"flex",alignItems:"center",gap:14,marginTop:11,flexWrap:"wrap"}}>
                    {hasUpgrades&&(
                      <button onClick={()=>toggleExpand(p.id)}
                        style={{background:expanded?T.blue:T.blueSoft,color:expanded?"#fff":T.blue,border:`1px solid ${T.blue}44`,borderRadius:100,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        ⬆ {ana.alternatives.length} better option{ana.alternatives.length>1?"s":""} {expanded?"▴":"▾"}
                      </button>
                    )}
                    <a href={buyLink(buyName)} target="_blank" rel="noopener noreferrer" style={{color:T.blue,fontSize:11,fontWeight:600,textDecoration:"none"}}>🔍 Buy →</a>
                    {p.notes&&<span style={{fontSize:11,color:T.muted,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notes}</span>}
                  </div>

                  {/* expanded upgrade options */}
                  {hasUpgrades&&expanded&&(
                    <div style={{marginTop:11,paddingTop:12,borderTop:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.07em"}}>More effective alternatives</div>
                      {ana.alternatives.map((alt,ai)=>(
                        <div key={ai} style={{background:T.faint,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontWeight:600,color:T.text,fontSize:12}}>{alt.name}</div>
                          <div style={{color:T.muted,fontSize:11,marginTop:2,lineHeight:1.4}}>{alt.why}</div>
                          <div style={{display:"flex",gap:10,marginTop:8,alignItems:"center"}}>
                            <button onClick={()=>addToWishlist({name:alt.name,why:alt.why,source:"upgrade",forProduct:p.genericName})}
                              disabled={isWished(alt.name)}
                              style={{background:isWished(alt.name)?T.greenSoft:T.blue,color:isWished(alt.name)?T.green:"#fff",border:"none",borderRadius:100,padding:"4px 11px",fontSize:11,fontWeight:600,cursor:isWished(alt.name)?"default":"pointer",fontFamily:"'Inter',sans-serif"}}>
                              {isWished(alt.name)?"💛 Saved":"+ Wishlist"}
                            </button>
                            <a href={buyLink(alt.name)} target="_blank" rel="noopener noreferrer" style={{color:T.blue,fontSize:11,fontWeight:600,textDecoration:"none"}}>🔍 Buy →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* Empty */}
      {profile.products.length===0&&!showAdd&&(
        <div style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:40,marginBottom:12}}>🧴</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>Add your products</div>
          <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Cleansers, serums, treatments, masks — anything you use. AI will schedule them.</div>
          <Btn onClick={()=>setShowAdd(true)}>+ Add First Product</Btn>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length>0&&(
        <div style={{background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:12,padding:"12px 14px"}}>
          <div style={{color:T.red,fontWeight:700,fontSize:13,marginBottom:6}}>⚠️ {conflicts.length} ingredient conflict{conflicts.length>1?"s":""}</div>
          {conflicts.map((c,i)=><div key={i} style={{color:T.muted,fontSize:12}}>• {c.p1.genericName} + {c.p2.genericName}</div>)}
        </div>
      )}
    </div>
  );
};

// ─── MAIN APP ───────────────────────────────────────────────────────────────────
const GalleryTab = ({skinImgs}) => {
  const [zoom,setZoom] = useState(null);
  const [filter,setFilter] = useState("all"); // all | skin | product
  const imgs = skinImgs||[];
  const shown = filter==="all" ? imgs : imgs.filter(img => (img.kind||"skin")===filter);
  const skinCount = imgs.filter(img=>(img.kind||"skin")==="skin").length;
  const productCount = imgs.filter(img=>img.kind==="product").length;
  return (
    <div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>Photo Gallery</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:14}}>
        {imgs.length===0 ? "All skin and product photos you've added." : `${imgs.length} photo${imgs.length!==1?"s":""} · ${skinCount} skin check-in${skinCount!==1?"s":""}, ${productCount} scanned product${productCount!==1?"s":""}`}
      </div>
      {imgs.length>0&&(
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[["all",`All (${imgs.length})`],["skin",`Skin (${skinCount})`],["product",`Products (${productCount})`]].map(([val,lbl])=>(
            <button key={val} onClick={()=>setFilter(val)}
              style={{background:filter===val?T.accent:T.faint,color:filter===val?"#fff":T.muted,border:`1px solid ${filter===val?T.accent:T.border}`,borderRadius:100,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              {lbl}
            </button>
          ))}
        </div>
      )}
      {(!shown||shown.length===0)?(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:40,marginBottom:12}}>🖼</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>No photos yet</div>
          <div style={{fontSize:13,color:T.muted}}>Add skin photos from the Profile tab, or scan products in the Products tab.</div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10}}>
          {shown.map((img,i)=>(
            <div key={i} onClick={()=>setZoom(img.preview)} style={{position:"relative",paddingBottom:"100%",borderRadius:12,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",background:T.faint}}>
              <img src={img.preview} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",bottom:4,left:4,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:9,fontWeight:600,borderRadius:6,padding:"2px 6px",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                {img.kind==="product"?"Product":"Skin"}
              </div>
            </div>
          ))}
        </div>
      )}
      {zoom&&(
        <div onClick={()=>setZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <img src={zoom} alt="" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12}}/>
          <button onClick={()=>setZoom(null)} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",borderRadius:"50%",width:40,height:40,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
      )}
    </div>
  );
};

const WishlistTab = ({wishList,onRemove}) => {
  const grouped = {};
  (wishList||[]).forEach(w=>{ const k=w.forProduct||"General"; (grouped[k]=grouped[k]||[]).push(w); });
  const keys = Object.keys(grouped);
  return (
    <div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>My Wishlist</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:18}}>Products you've saved to try, from analysis recommendations.</div>
      {(!wishList||wishList.length===0)?(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:40,marginBottom:12}}>💛</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>Wishlist is empty</div>
          <div style={{fontSize:13,color:T.muted}}>Save products from the analysis in the Products tab.</div>
        </div>
      ):(
        keys.map(k=>(
          <Card key={k} style={{marginBottom:14}}>
            <Lbl style={{marginBottom:12}}>{k==="General"?"Saved products":`For: ${k}`}</Lbl>
            {grouped[k].map((w,i)=>(
              <div key={w.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:i<grouped[k].length-1?`1px solid ${T.border}`:"none"}}>
                <span style={{fontSize:16,flexShrink:0}}>💛</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,color:T.text,fontSize:13}}>{w.name}</div>
                  {w.why&&<div style={{color:T.muted,fontSize:12,marginTop:2,lineHeight:1.4}}>{w.why}</div>}
                  <a href={buyLink(w.name)} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:6,color:T.blue,fontSize:12,fontWeight:600,textDecoration:"none"}}>🔍 Find where to buy →</a>
                </div>
                <button onClick={()=>onRemove(w.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18,flexShrink:0}}>×</button>
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );
};

export default function App() {
  // All state declared first so update() can close over setters safely
  const [profile,setProfile]       = useState(()=>{ const s=load(); return s||{...EMPTY_PROFILE}; });
  const [savedFlash,setSavedFlash] = useState(false);
  const [storageOk,setStorageOk]   = useState(true);
  const [syncStatus,setSyncStatus] = useState("syncing");
  const [showData,setShowData]     = useState(false);   // export/import modal
  const [importText,setImportText] = useState("");
  const [dataMsg,setDataMsg]       = useState(""); // "syncing"|"synced"|"local"|"error"

  // update() — merges patch, saves immediately, flashes indicator
  // NOTE: never call setState inside setProfile's updater — do it after
  const update = useCallback(patch => {
    setProfile(cur => {
      // Stamp every save with a timestamp — this is what lets mount-time
      // cloud/local reconciliation tell fresh data from stale data instead
      // of the cloud always blindly winning (see reconcileProfiles).
      const next = {...cur, ...patch, updatedAt: Date.now()};
      // Save synchronously inside the updater (localStorage is sync, this is safe)
      const ok = save(next);
      // Schedule storageOk update as a microtask — never nest setState calls
      if(!ok) Promise.resolve().then(()=>setStorageOk(false));
      else    Promise.resolve().then(()=>setStorageOk(true));
      return next;
    });
  },[]);

  // Flash "✓ Saved" whenever profile changes
  const prevProfile = useRef(null);
  useEffect(()=>{
    if(prevProfile.current !== null){
      setSavedFlash(true);
      const t = setTimeout(()=>setSavedFlash(false),1200);
      return ()=>clearTimeout(t);
    }
    prevProfile.current = profile;
  },[profile]);

  // On mount: load from cloud (cross-device), but never let a STALE cloud
  // snapshot overwrite a device that already has fresher local data.
  useEffect(()=>{
    setSyncStatus("syncing");
    loadFromCloud().then(cloudProfile => {
      setProfile(cur => {
        const winner = reconcileProfiles(cur, cloudProfile);
        if(winner === cloudProfile){
          lsSave(cloudProfile);
        } else if(cloudProfile){
          // Local was newer — push it back up so the cloud catches up too.
          wsSave(cur);
        }
        return winner;
      });
      setSyncStatus(cloudProfile ? "synced" : "local");
    }).catch(()=>setSyncStatus("local"));
  },[]);

  const [activeTab,setActiveTab] = useState(0);
  const TABS = ["📅 Calendar","👤 Profile","🧴 Products","⚠️ Conflicts","💛 Wishlist","🖼 Gallery"];

  // Analysis run-state lives here (App), not in ProductsTab, so an in-progress
  // analysis keeps running and showing progress even if you switch tabs mid-run.
  const [analyzing,setAnalyzing] = useState(false);
  const [analyzeProgress,setAnalyzeProgress] = useState({done:0,total:0,label:""});
  const [analyzeMsg,setAnalyzeMsg] = useState("");

  // Build-routine run-state — lifted to App for the same reason (survives tab switch)
  const [building,setBuilding] = useState(false);
  const [buildMsg,setBuildMsg] = useState("");
  const [buildProgress,setBuildProgress] = useState({done:0,total:0,label:""});
  const [preview,setPreview]   = useState(null); // {schedule:[...], suggestions:[...]}

  // Image state — backed by profile.skinImgs so it persists across reloads
  const [imgLoading,setImgLoading] = useState(false);
  const [imgError,setImgError]     = useState("");
  // skinImgs is a derived alias — always read/write through profile
  const skinImgs = profile.skinImgs || [];
  const wishList = profile.wishList || [];
  const addToWishlist = (item) => {
    // item: {name, why, source:"upgrade"|"missing"|"manual", forProduct}
    const exists = (profile.wishList||[]).some(w=>w.name===item.name);
    if(exists) return false;
    const entry = {id:Date.now()+Math.random(), name:item.name, why:item.why||"", source:item.source||"manual", forProduct:item.forProduct||"", addedAt:todayStr()};
    update({wishList:[...(profile.wishList||[]), entry]});
    return true;
  };
  const removeFromWishlist = (id) => update({wishList:(profile.wishList||[]).filter(w=>w.id!==id)});
  const setSkinImgs = fn => {
    update({skinImgs: typeof fn==="function" ? fn(profile.skinImgs||[]) : fn});
  };

  const handleImg = async e => {
    const files = Array.from(e.target.files||[]); if(!files.length) return; e.target.value="";
    setImgError(""); setImgLoading(true);
    const loaded = [];
    const errs   = [];
    for(const file of files){
      try{
        const img = await loadImage(file);
        // Build a local preview URL for this session
        const preview = img.preview || URL.createObjectURL(
          new Blob([Uint8Array.from(atob(img.b64),c=>c.charCodeAt(0))],{type:img.mime})
        );
        loaded.push({b64:img.b64, mime:img.mime, preview, kind:"skin", addedAt:new Date().toISOString()});
      }catch(err){
        const m = err.message||"";
        errs.push(m==="HEIC_DECODE_FAILED"
          ? "iPhone HEIC format not supported. In Settings → Camera → Formats, choose 'Most Compatible' (JPEG), or screenshot the photo."
          : (m || "Unknown error reading photo. Try a screenshot."));
      }
    }
    if(loaded.length) setSkinImgs(cur => [...cur, ...loaded]);
    if(errs.length)   setImgError(errs.join(" | "));
    setImgLoading(false);
  };

  // Analysis
  const [analysisLoading,setAnalysisLoading] = useState(false);
  const [profileSaved,setProfileSaved]       = useState(false);

  const runAnalysis = async () => {
    setAnalysisLoading(true); update({analysisText:"",analysisGaps:[]});
    try {
      const ctx = [
        profile.type&&`Skin type: ${profile.type}`,
        profile.concerns.length&&`Concerns: ${profile.concerns.join(", ")}`,
        profile.notes&&`Notes: ${profile.notes}`,
      ].filter(Boolean).join(". ");
      const amList = profile.products.filter(p=>p.session==="am"||p.session==="both").sort((a,b)=>a.stepOrder-b.stepOrder).map((p,i)=>`${i+1}. ${p.genericName}${p.brandName?` (${p.brandName})`:""} — ${FREQS[p.frequency]||"unscheduled"}`).join("\n");
      const pmList = profile.products.filter(p=>p.session==="pm"||p.session==="both").sort((a,b)=>a.stepOrder-b.stepOrder).map((p,i)=>`${i+1}. ${p.genericName}${p.brandName?` (${p.brandName})`:""} — ${FREQS[p.frequency]||"unscheduled"}`).join("\n");
      const existingNames = profile.products.map(p=>p.genericName).join(", ");
      const content = [];
      content.push(...apiImageBlocks(skinImgs));
      content.push({type:"text",text:`Comprehensive skin analysis. Be specific and clinically accurate.

PROFILE: ${ctx||"Not set."}
AM ROUTINE:\n${amList||"(none)"}
PM ROUTINE:\n${pmList||"(none)"}
ALL PRODUCTS: ${existingNames||"(none)"}

Analyze:
## 1. Skin Assessment
## 2. Routine Strengths  
## 3. Ingredient Conflicts & Timing
Post-procedure rules: after microneedling avoid retinol/acids for 48h.
## 4. Gaps (DO NOT suggest: ${existingNames||"none"})
## 5. Priority Recommendations (top 3)`});
      const analysisText = await callClaude([{role:"user",content}],1000);

      // Extract actionable gaps
      let analysisGaps = [];
      try {
        const gapResult = await callClaude([{role:"user",content:
          `From this analysis, list up to 5 actionable items. User already has: ${existingNames}. Return ONLY JSON:\n[{"type":"add|warning|frequency","value":"name or title","reason":"one sentence","severity":"high|medium|low","session":"am|pm"}]\n\nAnalysis:\n${analysisText.slice(0,1200)}`
        }],400);
        const parsed = JSON.parse(gapResult.replace(/```json|```/g,"").trim());
        if(Array.isArray(parsed)) analysisGaps = parsed.slice(0,5);
      } catch(e) {}

      update({analysisText,analysisGaps});
    } catch(e) { update({analysisText:`Error: ${e.message}`}); }
    setAnalysisLoading(false);
  };

  // Export everything (products, photos, profile, analysis) as a portable string
  const exportData = () => {
    try {
      const payload = JSON.stringify({v:4, profile});
      const b64 = btoa(unescape(encodeURIComponent(payload)));
      // Try clipboard
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(b64).then(
          ()=>setDataMsg("✓ Copied to clipboard! Paste it on your other device's Import box."),
          ()=>setDataMsg("Select the text below and copy it manually.")
        );
      } else {
        setDataMsg("Select the text below and copy it manually.");
      }
      setImportText(b64);
      setShowData(true);
    } catch(e){ setDataMsg("Export failed: "+e.message); }
  };

  // Import from a pasted string — replaces current profile
  const importData = () => {
    try {
      const raw = importText.trim();
      if(!raw){ setDataMsg("Paste your exported data first."); return; }
      const json = decodeURIComponent(escape(atob(raw)));
      const parsed = parseProfileData(json);
      if(!parsed){ setDataMsg("Couldn't read that data. Make sure you copied all of it."); return; }
      setProfile(parsed);
      save(parsed);
      setDataMsg(`✓ Imported ${parsed.products.length} products, ${(parsed.skinImgs||[]).length} photos!`);
      setTimeout(()=>{ setShowData(false); setDataMsg(""); setImportText(""); }, 1800);
    } catch(e){ setDataMsg("Import failed — the data may be incomplete. Try copying it again."); }
  };

  const renderTab = () => {
    switch(activeTab) {
      case 0: return <CalendarTab profile={profile} onUpdate={update}/>;

      case 1: return (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* ── Skin Profile ─────────────────────────────────────────────── */}
          <Card>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:T.text,marginBottom:4}}>My Skin Profile</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:18}}>Saved automatically. Personalises every AI recommendation.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div><Lbl>Skin Type</Lbl>
                <select value={profile.type} onChange={e=>update({type:e.target.value})} style={selSty}>
                  <option value="">Select…</option>
                  {SKIN_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><Lbl>Notes</Lbl><TxtIn value={profile.notes} onChange={v=>update({notes:v})} placeholder="Allergies, climate…"/></div>
            </div>
            <Lbl>Skin Concerns</Lbl>
            <ConcernsSelector selected={profile.concerns} onChange={c=>update({concerns:c})}/>
          </Card>

          {/* ── Skin Photos ───────────────────────────────────────────────── */}
          <Card>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Skin Photos</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:12}}>Used in analysis and routine building.</div>
            {imgLoading&&<div style={{textAlign:"center",padding:16,color:T.muted}}>⏳ Loading…</div>}
            {skinImgs.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
                {skinImgs.map((img,i)=>(
                  <div key={i} style={{position:"relative",width:80,height:80,flexShrink:0}}>
                    <img src={img.preview} alt="" style={{width:80,height:80,borderRadius:10,objectFit:"cover",border:`2px solid ${T.border}`}}/>
                    <button onClick={()=>setSkinImgs(cur=>cur.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-6,right:-6,background:T.red,color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",padding:0}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {!imgLoading&&(
              <div style={{display:"flex",gap:10,marginBottom:8}}>
                <label htmlFor="photo-profile-cam" style={{cursor:"pointer",position:"relative",display:"inline-block"}}>
                  <div style={{background:T.accent,color:"#fff",borderRadius:100,padding:"10px 18px",fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif"}}>📷 Camera</div>
                  <input id="photo-profile-cam" type="file" accept="image/*" capture="user" onChange={handleImg}
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}}/>
                </label>
                <label htmlFor="photo-profile-lib" style={{cursor:"pointer",position:"relative",display:"inline-block"}}>
                  <div style={{background:T.faint,color:T.accent,border:`1.5px solid ${T.accent}44`,borderRadius:100,padding:"10px 18px",fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif"}}>🖼 Gallery</div>
                  <input id="photo-profile-lib" type="file" accept="image/*" multiple onChange={handleImg}
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}}/>
                </label>
              </div>
            )}
            {imgError&&<div style={{color:T.red,fontSize:12,background:T.redSoft,padding:"10px 12px",borderRadius:8}}>⚠️ {imgError}</div>}
          </Card>

          {/* ── Full Skin Analysis ────────────────────────────────────────── */}
          <Card style={{background:`linear-gradient(135deg,${T.accentSoft},${T.peachSoft})`,borderColor:`${T.accent}33`}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>Skin Analysis</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:12}}>Analyses your profile, photos, routine, and products together.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
              {[
                {label:"Skin profile",done:!!(profile.type||profile.concerns.length),icon:"👤"},
                {label:"Photos",done:skinImgs.length>0,icon:"📷"},
                {label:"Products",done:profile.products.length>0,icon:"🧴"},
              ].map(({label,done,icon})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:6,background:done?T.greenSoft:"#fff",border:`1px solid ${done?T.green:T.border}`,borderRadius:100,padding:"5px 12px",fontSize:12}}>
                  <span>{icon}</span><span style={{color:done?T.green:T.muted,fontWeight:done?600:400}}>{label}</span><span>{done?"✓":"○"}</span>
                </div>
              ))}
            </div>
            <Btn onClick={runAnalysis} disabled={analysisLoading} style={{width:"100%",justifyContent:"center",padding:"13px",fontSize:14}}>
              {analysisLoading?"⏳ Running analysis…":"✨ Run Full Skin Analysis"}
            </Btn>
          </Card>

          {analysisLoading&&<div style={{textAlign:"center",padding:40,background:T.card,borderRadius:16,border:`1px solid ${T.border}`}}><div style={{fontSize:28,marginBottom:12}}>✨</div><div style={{color:T.muted,fontSize:13}}>Analysing your skin and routine…</div></div>}

          {!analysisLoading&&profile.analysisText&&(
            <Card style={{borderColor:`${T.accent}44`,background:T.accentSoft}}>
              <Lbl>Analysis Report</Lbl>
              <MD text={profile.analysisText}/>
            </Card>
          )}

          {!analysisLoading&&(profile.analysisGaps||[]).filter(g=>!g.resolved).length>0&&(
            <Card>
              <Lbl style={{marginBottom:12}}>Action Items</Lbl>
              {(profile.analysisGaps||[]).filter(g=>!g.resolved).map((g,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:i<profile.analysisGaps.filter(x=>!x.resolved).length-1?`1px solid ${T.border}`:"none"}}>
                  <span style={{fontSize:16}}>{g.type==="warning"?"⚠️":g.type==="add"?"➕":"🔄"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,color:T.text,fontSize:13,marginBottom:2}}>{g.value}</div>
                    <div style={{color:T.muted,fontSize:12}}>{g.reason}</div>
                    {g.type==="add"&&(
                      <button onClick={()=>{
                        const id=Date.now();
                        const newProd={id,genericName:g.value,brandName:"",notes:"Added from analysis",session:g.session||"pm",frequency:"daily",stepOrder:0,nextDate:todayStr(),isOneOff:false,scheduled:false};
                        const newGaps=(profile.analysisGaps||[]).map(x=>x===g?{...x,resolved:true}:x);
                        update({products:[...profile.products,newProd],analysisGaps:newGaps});
                        setActiveTab(2);
                      }} style={{marginTop:8,background:T.accent,color:"#fff",border:"none",borderRadius:100,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        + Add to Products
                      </button>
                    )}
                    {g.type!=="add"&&<button onClick={()=>update({analysisGaps:(profile.analysisGaps||[]).map(x=>x===g?{...x,resolved:true}:x)})} style={{marginTop:8,background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:100,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Dismiss</button>}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      );

      case 2: return <ProductsTab profile={profile} onUpdate={update} skinImgs={skinImgs} addToWishlist={addToWishlist} wishList={wishList}
        analyzing={analyzing} setAnalyzing={setAnalyzing}
        analyzeProgress={analyzeProgress} setAnalyzeProgress={setAnalyzeProgress}
        analyzeMsg={analyzeMsg} setAnalyzeMsg={setAnalyzeMsg}
        building={building} setBuilding={setBuilding}
        buildMsg={buildMsg} setBuildMsg={setBuildMsg}
        buildProgress={buildProgress} setBuildProgress={setBuildProgress}
        preview={preview} setPreview={setPreview}/>;
      case 3: return <ConflictsTab profile={profile} onUpdate={update}/>;
      case 4: return <WishlistTab wishList={wishList} onRemove={removeFromWishlist}/>;
      case 5: return <GalleryTab skinImgs={skinImgs}/>;
      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};}
        input,select{outline:none;}
        input:focus,select:focus{border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accentSoft}!important;}
        button:hover:not(:disabled){opacity:0.88;transform:translateY(-1px);}
        button:active:not(:disabled){transform:translateY(0);}
        ::placeholder{color:${T.muted};opacity:0.7;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
      `}</style>
      <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Inter',sans-serif"}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,#fff,${T.accentSoft})`,borderBottom:`1px solid ${T.border}`,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 12px rgba(232,131,122,0.08)"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${T.accent},${T.peach})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(232,131,122,0.3)"}}>✦</div>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:T.text}}>Skin Ritual</div>
            <div style={{fontSize:10,color:T.muted,letterSpacing:"0.12em",textTransform:"uppercase"}}>AI Skincare Consultant</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,color:T.muted,fontWeight:600,opacity:0.7}}>{APP_VERSION}</span>
            {savedFlash&&<span style={{fontSize:11,color:T.green,fontWeight:600}}>✓ Saved</span>}
            <span title="Whether this device is reading/writing your cross-device cloud profile"
              style={{fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4,
                color: syncStatus==="synced"?T.green : syncStatus==="syncing"?T.muted : T.red}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",display:"inline-block",
                animation: syncStatus==="syncing" ? "sr-pulse 1.1s ease-in-out infinite" : "none"}}/>
              {syncStatus==="synced"?"Cloud synced":syncStatus==="syncing"?"Syncing…":"⚠ Local only — use Sync below"}
            </span>
            <button onClick={()=>{setShowData(true);setDataMsg("");setImportText("");}}
              style={{background:T.accentSoft,color:T.accent,border:`1.5px solid ${T.accent}44`,borderRadius:100,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
              ⇄ Sync
            </button>
          </div>
          <style>{`@keyframes sr-pulse{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
        </div>
        {/* Tabs */}
        <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,display:"flex",overflowX:"auto",padding:"0 8px"}}>
          {TABS.map((tab,i)=>(
            <button key={tab} onClick={()=>setActiveTab(i)} style={{padding:"13px 11px",background:"none",border:"none",whiteSpace:"nowrap",borderBottom:`2.5px solid ${activeTab===i?T.accent:"transparent"}`,color:activeTab===i?T.accent:T.muted,fontWeight:activeTab===i?700:400,fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"}}>
              {tab}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px 80px"}}>
          {renderTab()}
        </div>

        {/* Sync / Export-Import modal */}
        {showData&&(
          <div onClick={()=>setShowData(false)} style={{position:"fixed",inset:0,background:"rgba(44,36,32,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:T.shadowMd,padding:24}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:T.text}}>Move data between devices</div>
                <button onClick={()=>setShowData(false)} style={{background:T.faint,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.muted}}>×</button>
              </div>
              <div style={{fontSize:13,color:T.muted,marginBottom:18,lineHeight:1.5}}>
                Export here, then paste into Import on your other device. This carries <strong style={{color:T.text}}>all products, photos, and analysis</strong>.
              </div>

              {/* Export */}
              <div style={{marginBottom:20}}>
                <Lbl>1 · Export from this device</Lbl>
                <Btn onClick={exportData} style={{width:"100%",justifyContent:"center",marginBottom:10}}>
                  📋 Copy My Data ({profile.products.length} products, {(profile.skinImgs||[]).length} photos)
                </Btn>
                {importText&&(
                  <textarea readOnly value={importText} onClick={e=>e.target.select()}
                    style={{width:"100%",height:90,background:T.faint,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:10,color:T.muted,fontFamily:"monospace",resize:"none",boxSizing:"border-box"}}/>
                )}
              </div>

              {/* Import */}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:18}}>
                <Lbl>2 · Import on another device</Lbl>
                <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste your exported data here…"
                  style={{width:"100%",height:90,background:T.faint,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"10px 12px",fontSize:10,color:T.text,fontFamily:"monospace",resize:"none",boxSizing:"border-box",marginBottom:10}}/>
                <Btn onClick={importData} variant="ghost" style={{width:"100%",justifyContent:"center"}}>
                  ⬇ Load This Data
                </Btn>
              </div>

              {dataMsg&&(
                <div style={{marginTop:14,fontSize:13,padding:"10px 14px",borderRadius:10,fontWeight:600,background:dataMsg.startsWith("✓")?T.greenSoft:T.accentSoft,color:dataMsg.startsWith("✓")?T.green:T.accent}}>
                  {dataMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
