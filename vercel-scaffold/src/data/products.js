// Source-controlled product roster for Skin Ritual.
//
// This replaces the ISRAEL_PRODUCTS() hardcoded function from the artifact
// version of the app. In the artifact, every new/changed product had to be
// re-hardcoded into the .jsx file by hand each session. Here, it's just a
// file in the repo — edit it, commit it, done. No more re-pasting.
//
// Eventually this can move into a real DB table (see src/lib/storage.js),
// but as a flat JS module it's already a big improvement: it's versioned,
// diffable, and survives independently of any chat session.

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} brand
 * @property {'AM'|'PM'|null} time - time of day to use, null if unscheduled
 * @property {'daily'|'twice-weekly'|'weekly'|'monthly'|null} frequency
 * @property {boolean} scheduled
 * @property {string} [notes]
 */

/** @type {Product[]} */
export const PRODUCTS = [
  // ---- Scheduled ----
  { id: 'lrp-retinol-b3', name: 'Retinol B3 Serum', brand: 'La Roche-Posay', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'a313-pommade', name: 'A313 Pommade', brand: 'A313', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'ret-avit-tretinoin', name: 'Tretinoin 0.05%', brand: 'Ret-Avit', time: 'PM', frequency: 'twice-weekly', scheduled: true },
  { id: 'puradorr-vitc', name: '20% Vitamin C', brand: "Pura d'or", time: 'AM', frequency: 'twice-weekly', scheduled: true },
  { id: 'dermalogica-microfoliant', name: 'Daily Microfoliant', brand: 'Dermalogica', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'caudalie-vinopure-toner', name: 'Vinopure Purifying Toner', brand: 'Caudalie', time: 'AM', frequency: 'daily', scheduled: true },
  { id: 'skin1004-cleansing-oil', name: 'Centella Cleansing Oil', brand: 'SKIN1004', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'somebymi-ahabhapha-toner', name: 'AHA.BHA.PHA Toner', brand: 'Some By Mi', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'caudalie-vinohydra-mask', name: 'VinoHydra Mask', brand: 'Caudalie', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'sttropez-self-tan', name: 'Self Tan Serum', brand: 'St.Tropez', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'mars-safranal-serum', name: 'Safranal Serum', brand: 'Mars', time: 'AM', frequency: 'daily', scheduled: true },
  { id: 'yeouth-niacinamide', name: 'Niacinamide', brand: 'Yeouth', time: 'AM', frequency: 'daily', scheduled: true },
  { id: 'caudalie-vinopure-salicylic', name: 'Vinopure Salicylic Serum', brand: 'Caudalie', time: 'PM', frequency: 'weekly', scheduled: true },
  { id: 'bio-oil', name: 'Bio-Oil', brand: 'Bio-Oil', time: 'PM', frequency: 'daily', scheduled: true },
  { id: 'petitfee-lip-mask', name: 'Lip Mask', brand: 'Petitfée', time: 'PM', frequency: 'daily', scheduled: true },
  { id: 'cosrx-snail-96', name: 'Snail 96 Essence', brand: 'COSRX', time: 'PM', frequency: 'daily', scheduled: true },
  { id: 'ordinary-marine-hyaluronics', name: 'Marine Hyaluronics', brand: 'The Ordinary', time: 'PM', frequency: 'daily', scheduled: true },
  { id: 'boj-red-bean-gel', name: 'Red Bean Water Gel', brand: 'Beauty of Joseon', time: 'AM', frequency: 'daily', scheduled: true },
  { id: 'lrp-effaclar-mat', name: 'Effaclar Mat', brand: 'La Roche-Posay', time: 'PM', frequency: 'daily', scheduled: true },
  { id: 'skin1004-hyalucica-spf50', name: 'Hyalu-Cica Sun Serum SPF50', brand: 'SKIN1004', time: 'AM', frequency: 'daily', scheduled: true },
  { id: 'ordinary-aha30-bha2', name: 'AHA30% + BHA2% Peeling Solution', brand: 'The Ordinary', time: 'PM', frequency: 'monthly', scheduled: true },
  // Second-cleanse (and standalone AM) gel cleanser. An earlier note here
  // referenced "caudalie_gel_cleanser_v1" planning to use Caudalie's
  // Vinopure Purifying Gel Cleanser, but that migration was never actually
  // written, and checking Caudalie's real ingredient list turned up six
  // separate essential oils (lavender, peppermint, rosemary, lemongrass,
  // geranium, melissa) plus isolated fragrance allergens — more fragranced
  // than the SKIN1004 oil cleanser it would've paired with. Finalized
  // instead as CeraVe Foaming Facial Cleanser (verified genuinely
  // fragrance/essential-oil-free) via "gel_cleanser_finalize_v1" in the
  // PWA version. `time` is 'PM' here since this schema doesn't yet support
  // an AM+PM ("both") value the way the PWA's session field does — the PWA
  // additionally runs it AM via "gel_cleanser_am_pm_v1".
  { id: 'cerave-foaming-gel-cleanser', name: 'Foaming Gel Cleanser', brand: 'CeraVe', time: 'PM', frequency: 'daily', scheduled: true },

  // ---- Unscheduled ----
  { id: 'jason-vitamin-e-oil', name: 'Vitamin E Oil', brand: 'Jason', time: null, frequency: null, scheduled: false },
  { id: 'aztec-secret-clay', name: 'Secret Clay', brand: 'Aztec', time: null, frequency: null, scheduled: false },
  { id: 'boj-pore-mask', name: 'Pore Mask', brand: 'Beauty of Joseon', time: null, frequency: null, scheduled: false },
  { id: 'anua-heartleaf-toner', name: 'Heartleaf Toner', brand: 'Anua', time: null, frequency: null, scheduled: false },
  { id: 'cosrx-ahabha-toner', name: 'AHA/BHA Toner', brand: 'COSRX', time: null, frequency: null, scheduled: false },
  { id: 'boj-ginseng-essence', name: 'Ginseng Essence', brand: 'Beauty of Joseon', time: null, frequency: null, scheduled: false },
  { id: 'avene-thermal-water', name: 'Thermal Water', brand: 'Avène', time: null, frequency: null, scheduled: false },
];

export const getScheduledProducts = () => PRODUCTS.filter(p => p.scheduled);
export const getUnscheduledProducts = () => PRODUCTS.filter(p => !p.scheduled);
export const getProductById = (id) => PRODUCTS.find(p => p.id === id);
