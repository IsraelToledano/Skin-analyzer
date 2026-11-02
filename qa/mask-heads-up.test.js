// A clay-mask evening is announced from the morning (2026-11-02: he skipped
// mask nights because he found out at bedtime, too tired to wait 10 minutes).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,2]);const H=get('clayMaskHeadsUp'),wash=get('isWashOffMask'),type=get('detectType');
const prof=seedProfile(get);const pl=plan(get,prof,63);const today=get('todayStr')();
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const red=by(/Red Bean Refreshing Pore/),aztec=by(/Indian Healing Clay/),mel=by(/Dubai Peptide/),vino=by(/VinoHydra/),tret=by(/tretinoin/i),gel=by(/Gel Cleanser|Cleanser/);
t('a clay mask on tonight\'s plan: heads-up with the mask and its time from its own instructions',()=>{const h=H([gel,red],[],today,today);assert.ok(h);assert.strictEqual(h.product.id,red.id);assert.strictEqual(h.minutes,'5–10 minutes');assert.strictEqual(h.early,true);});
t('Aztec "10 minutes max" → 10 minutes; no minutes in the instructions → about 10 minutes',()=>{assert.strictEqual(H([aztec],[],today,today).minutes,'10 minutes');assert.strictEqual(H([mel],[],today,today).minutes,'about 10 minutes');assert.strictEqual(H([{...red,howTo:''}],[],today,today).minutes,'about 10 minutes');});
t('no heads-up for the leave-on cream mask, or an evening without a clay mask',()=>{assert.strictEqual(H([gel,vino],[],today,today),null);assert.strictEqual(H([gel],[],today,today),null);assert.strictEqual(H([],[],today,today),null);});
t('gone once the mask is done or skipped; a done different step doesn\'t hide it',()=>{
  assert.strictEqual(H([red],[{date:today,session:'pm',productId:red.id,done:true}],today,today),null);
  assert.strictEqual(H([red],[{date:today,session:'pm',productId:red.id,skipped:true}],today,today),null);
  assert.ok(H([red],[{date:today,session:'pm',productId:gel.id,done:true},{date:today,session:'am',productId:red.id,done:true}],today,today));});
t('past days get none; future days do',()=>{assert.strictEqual(H([red],[],get('addDaysStr')(today,-1),today),null);assert.ok(H([red],[],get('addDaysStr')(today,3),today));});
t('"do it early" only when there\'s no retinoid that evening',()=>{assert.strictEqual(H([red,tret],[],today,today).early,false);});
t('safe on junk input',()=>{assert.strictEqual(H(null,null,today,today),null);assert.strictEqual(H([null,undefined],[null],today,today),null);assert.strictEqual(H([red],[],'',today),null);});
t('his 9-week plan: every clay-mask evening gets a heads-up and nothing else does',()=>{
  Object.keys(pl).filter(k=>k.endsWith(':pm')).forEach(k=>{const d=k.split(':')[0];const h=H(pl[k],[],d,today);const has=pl[k].some(p=>wash(p));assert.strictEqual(!!h,has,k);if(h)assert.ok(h.early,k+' clay night with a retinoid');});});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
