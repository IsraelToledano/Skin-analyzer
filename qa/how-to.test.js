// Every product that needs instructions has them (2026-11-01).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,1]);const type=get('detectType');const prof=seedProfile(get);
const M=()=>get('MIGRATIONS').find(m=>m.id==='how_to_notes_v1');
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const need=[[/cleansing oil/,/dry hands.*milky/],[/Exfoliating SA Cleanser/,/30 seconds/],[/Microfoliant/,/½ teaspoon.*wet hands.*minute/],[/2% BHA/,/Don't rinse/],
  [/Vinopure Blemish/,/Don't rinse/],[/Indian Healing Clay/,/water.*non-metal.*10 minutes max/],[/Red Bean Refreshing Pore/,/5–10 minutes/],[/Instant Détox/,/5–10 minutes/],
  [/Dubai Peptide/,/colour changes/],[/VinoHydra/,/No extra water.*still slightly damp.*retinoid night.*10 minutes.*without rinsing.*overnight/],[/Tretinoin/,/pea-sized/],[/Vitamin C Serum/,/few drops/],[/Niacinamide 10%/,/few drops/],
  [/Sunscreen/,/¼ teaspoon/],[/Tan-Luxe/,/2–4 drops/],[/AHA 30%/,/Spot use/],
  [/St\. Tropez/,/wash your hands.*4–8 hours/],[/Retinol B3/,/few drops.*evening/],[/Glycolic Acid 7%/,/cotton pad/],[/AHA\/BHA Clarifying/,/cotton pad.*eyes and mouth/],
  [/Miracle Toner/,/cotton pad.*pat gently/],[/One Step Peel/,/5 drops.*cotton pad/]];
t('each product that needs it has its maker\'s instructions',()=>need.forEach(([re,txt])=>{const p=by(re);assert.ok(p,String(re));assert.ok(txt.test(p.howTo||''),p.genericName+': '+p.howTo);}));
t('simple layers (toner, essences, gel moisturizer, lip mask) get none',()=>[/Heartleaf/,/Snail/,/Ginseng/,/Red Bean Water Gel/,/lip sleeping/].forEach(re=>assert.ok(!by(re).howTo,String(re))));
t('a self-tan "with vitamin C" gets the self-tan note, not the vitamin C serum one',()=>assert.ok(!/pressed into dry skin/.test(by(/St\. Tropez/).howTo)));
t('the 30% glycolic gel peel (not in the routine) does not get the 7% toner note',()=>{const y=by(/Glycolic Acid 30% Gel Peel/);assert.ok(y,'no Yeouth in seed');assert.ok(!y.howTo,y.howTo);});
t('never overwrites his own note; idempotent; safe on empty',()=>{const mine={products:[{id:1,genericName:'powder exfoliant',brandName:'Dermalogica Daily Microfoliant',howTo:'my way'}]};assert.strictEqual(M().apply(mine),mine);
  const once=M().apply({products:[{id:2,genericName:'powder exfoliant',brandName:'Dermalogica Daily Microfoliant'}]});assert.strictEqual(M().apply(once),once);const e={};assert.strictEqual(M().apply(e),e);});
t('in a 3-week plan, every step with instructions shows them when it comes next',()=>{const pl=plan(get,prof,21);const tip=get('stepTip');let shown=0;
  Object.values(pl).forEach(l=>{for(let i=0;i<l.length-1;i++){if(l[i+1].howTo){const r=tip(l[i],l[i+1]);assert.ok(r&&r.lines.includes(l[i+1].howTo),l[i+1].genericName);shown++;}}});assert.ok(shown>20,'only '+shown);});
t('VinoHydra: the damp-skin note replaces only the earlier text, never his own; idempotent',()=>{const V=get('MIGRATIONS').find(m=>m.id==='vinohydra_damp_skin_v1');
  const old={products:[{id:10,genericName:'hydrating cream mask',brandName:'Caudalie VinoHydra Masque-Crème Hydratant',howTo:'A generous layer. 10 minutes, then wipe off the excess without rinsing — or leave it on overnight.'}]};
  const once=V.apply(old);assert.ok(/still slightly damp/.test(once.products[0].howTo));assert.strictEqual(V.apply(once),once);
  const mine={products:[{id:10,genericName:'hydrating cream mask',brandName:'Caudalie VinoHydra',howTo:'my way'}]};assert.strictEqual(V.apply(mine),mine);const e={};assert.strictEqual(V.apply(e),e);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
