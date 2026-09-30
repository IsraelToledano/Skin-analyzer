const assert=require('assert');const A=require('./harness').loadApp();const {P,profile,T}=require('./fixture');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
console.log('essence toner');
t('"Essence Toner" and "Essence Water" are essences',()=>{
  ['Essence Toner','Ginseng Essence Water','Hydrating Essence Water'].forEach(n=>assert.strictEqual(A.detectType(P(1,n,'pm','daily')),'essence',n));
});
t('a plain toner is still a toner, an acid toner still an exfoliant',()=>{
  assert.strictEqual(A.detectType(P(1,'Hydrating Toner','pm','daily')),'toner');
  assert.strictEqual(A.detectType(P(1,'AHA.BHA.PHA 30 Days Miracle Toner','pm','daily',{brandName:'Some By Mi'})),'exfoliant');
});
t('it shares the one-essence-per-night slot with the Snail Essence',()=>{
  const g=A.classifySingletonGroups(P(1,'Essence Toner','pm','daily',{brandName:'Beauty of Joseon Ginseng Essence Water'}));
  assert.ok(g.includes('layer:essence'));
});
console.log('wash-off masks');
const clay=P(23,'Clay Face Mask / Bentonite Clay Mask','pm','weekly',{brandName:'Aztec Secret Indian Healing Clay'});
const detox=P(32,'Masque Instant Détox','pm','weekly',{brandName:'Caudalie'});
const pore=P(24,'Clay/Pore Cleansing Mask','pm','weekly',{brandName:'Beauty of Joseon Red Bean Refreshing Pore Mask'});
const cream=P(10,'hydrating cream mask','pm','weekly',{brandName:'Caudalie VinoHydra Masque-Crème Hydratant'});
const sheet=P(40,'Sheet Mask','pm','weekly');
t('clay, detox and pore masks are wash-off; cream and sheet masks are not',()=>{
  [clay,detox,pore].forEach(p=>assert.ok(A.isWashOffMask(p),p.genericName));
  [cream,sheet].forEach(p=>assert.ok(!A.isWashOffMask(p),p.genericName));
});
t('wash-off masks sort right after the cleanser, before every leave-on step',()=>{
  const ess=P(2,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'});const nia=P(3,'Niacinamide 10% + Zinc 1%','pm','daily');const mo=P(4,'water gel moisturizer','pm','daily');const cl=P(5,'Gel Cleanser','pm','daily');
  [clay,detox,pore].forEach(m=>{const o=A.sortForDay([mo,nia,ess,m,cl],profile(),T,'pm').map(p=>p.id);assert.deepStrictEqual(o.slice(0,2),[5,m.id],m.genericName)});
});
t('a leave-on cream mask keeps its place after serums',()=>{
  const nia=P(3,'Niacinamide 10% + Zinc 1%','pm','daily');const mo=P(4,'water gel moisturizer','pm','daily');
  assert.deepStrictEqual(A.sortForDay([mo,cream,nia],profile(),T,'pm').map(p=>p.id),[3,10,4]);
});
t('the mask stays in the weekly mask rotation (type unchanged)',()=>{[clay,detox,pore].forEach(p=>{assert.strictEqual(A.detectType(p),'mask');assert.strictEqual(A.rotationRoleFor(p),'mask')})});
t('a "Clay Cleanser" is a cleanser, not a wash-off mask',()=>{const p=P(1,'Kaolin Clay Cleanser','pm','daily');assert.strictEqual(A.detectType(p),'cleanser');assert.ok(!A.isWashOffMask(p))});
t('notes never make something a wash-off mask',()=>{assert.ok(!A.isWashOffMask({...cream,notes:'rinse off after clay mask night'}))});
console.log('lip last');
t('lip mask comes after self-tan and moisturizer',()=>{
  const lip=P(16,'overnight lip sleeping mask','pm','daily');const st=P(11,'Self-Tanning Bronzing Water Serum with Vitamin C','pm','weekly',{brandName:'St. Tropez Self Tan'});const mo=P(4,'water gel moisturizer','pm','daily');
  assert.deepStrictEqual(A.sortForDay([lip,st,mo],profile(),T,'pm').map(p=>p.id),[4,11,16]);
});
t('lip is still exempt from the step cap',()=>assert.strictEqual(A.countsTowardCap(P(16,'overnight lip sleeping mask','pm','daily')),false));
console.log('weekly items vs a full daily cap');
const build=(prods,days=42)=>A.buildSessionSchedule(prods,[],'pm',A.computeEpoch(prods,'pm'),A.addDaysStr(T,days-1),A.SESSION_CAP,[],[]);
const dailies=()=>[P(1,'Gel Cleanser','pm','daily'),P(2,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(3,'Niacinamide 10% + Zinc 1%','pm','daily'),P(4,'Hydrating Toner','pm','daily'),P(5,'Peptide Serum','pm','daily'),P(6,'water gel moisturizer','pm','daily')];
t('a weekly product runs weekly even when dailies overflow the cap',()=>{
  const prods=[...dailies(),cream];const sc=build(prods);
  const n=Object.values(sc).filter(l=>l.some(e=>e.productId===10)).length;
  assert.ok(n>=5&&n<=7,`weekly mask ran ${n}× in 6 weeks`);
});
t('it does not run more than weekly either',()=>{
  const sc=build([...dailies(),cream]);const days=Object.keys(sc).sort().filter(d=>sc[d].some(e=>e.productId===10));
  for(let i=1;i<days.length;i++)assert.ok(A.daysBetween(days[i-1],days[i])>=6,days[i]);
});
t('the cap still holds on those nights',()=>{
  const sc=build([...dailies(),cream]);Object.values(sc).forEach(l=>assert.ok(l.length<=A.SESSION_CAP));
});
t('cleanser and moisturizer are never displaced by the weekly item',()=>{
  const sc=build([...dailies(),cream]);Object.entries(sc).forEach(([d,l])=>{assert.ok(l.some(e=>e.productId===1),d+' cleanser');assert.ok(l.some(e=>e.productId===6),d+' moisturizer')});
});
t('empty and malformed inputs do not throw',()=>{
  assert.doesNotThrow(()=>build([]));
  assert.doesNotThrow(()=>build([{id:9,genericName:'',scheduled:true,session:'pm',frequency:'weird',nextDate:T}]));
  assert.doesNotThrow(()=>A.isWashOffMask({id:1}));
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
