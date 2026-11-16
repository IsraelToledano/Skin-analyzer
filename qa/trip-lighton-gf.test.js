// 2026-11-16 (from the trip): he also has the Beauty of Joseon Light On Serum
// (Centella + Vita C) and The Ordinary GF 15% Solution with him. Both go in
// the trip mornings (their makers rule out the evening's salicylic acid) and
// take turns, one each morning (The Ordinary rules out the GF 15% with
// vitamin C). The Marine Hyaluronics he also photographed is already packed.
const assert=require('assert');const fs=require('fs');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,16]);const type=get('detectType'),ag=get('classifyActiveGroups'),sg=get('classifySingletonGroups'),add=get('addDaysStr'),on=get('kitEntryOn'),conf=get('productsConflict');
const prof=seedProfile(get);const pl=plan(get,prof,60);
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const LIGHT=by(/Light On Serum/),GF=by(/GF 15%/),PAN=by(/PanOxyl/),NIA=by(/Niacinamide 10%/),BHA=by(/2% BHA Liquid/),MARINE=by(/Marine Hyaluronic/),CREAM=by(/Bamboo Panthenol/),TJ=by(/Trader Joe's Vitamin C/);
const SPF=prof.products.find(p=>p.scheduled&&type(p)==='spf');
const keys=(s,p=pl)=>Object.keys(p).filter(k=>k.endsWith(':'+s)).sort();
const trip=k=>{const d=k.split(':')[0];return d>='2026-11-16'&&d<='2026-11-24';},home=k=>k.split(':')[0]>='2026-11-25';
const even=k=>get('daysBetween')('2026-11-04',k.split(':')[0])%2===0;
const M=(g=get)=>g('MIGRATIONS').find(m=>m.id==='trip_kit_add_lighton_gf_v1');const ids=l=>l.map(p=>p.id);
const TRIP=()=>prof.procedures.find(x=>x.type==='trip');

console.log('library');
t('the Light On Serum joins the library: a vitamin C serum, mornings, not in the home routine, with instructions',()=>{
  assert.ok(LIGHT);assert.strictEqual(type(LIGHT),'vitc');assert.strictEqual(get('productCategoryGroup')(LIGHT),'Vitamin C');assert.strictEqual(LIGHT.scheduled,false);assert.strictEqual(LIGHT.session,'am');assert.ok(LIGHT.howTo&&/AHA\/BHA/.test(LIGHT.notes));});
t('the GF 15% Solution joins the library: a plain serum with no active group, not in the home routine, with instructions',()=>{
  assert.ok(GF);assert.strictEqual(type(GF),'serum');assert.deepStrictEqual(ag(GF),[]);assert.deepStrictEqual(sg(GF),[]);assert.strictEqual(GF.scheduled,false);assert.ok(GF.howTo&&/salicylic/.test(GF.notes));});
t('each has its own review, with content, and neither borrows another product\'s',()=>{
  const a=get('getProductRank')(LIGHT),b=get('getProductRank')(GF);assert.strictEqual(a.id,42);assert.strictEqual(b.id,43);
  [a,b].forEach(r=>{assert.strictEqual(r.tag,'good');assert.ok(r.pros.length&&r.cons.length&&r.general.length>40&&r.alternatives.length);});
  assert.ok(/Trader Joe's Vitamin C/.test(a.alternatives[0].name)&&/own it/i.test(a.alternatives[0].price));
  assert.strictEqual(get('getProductRank')(TJ).id,40);assert.strictEqual(get('getProductRank')(NIA).id,37);assert.strictEqual(get('getProductRank')(MARINE).id,18);});
t('no id collision anywhere in the library',()=>{const all=prof.products.concat(prof.removedProducts||[]).map(p=>p.id);assert.strictEqual(new Set(all).size,all.length);});

console.log('a vitamin C derivative is not the strong vitamin C');
t('the Light On carries no vitamin-c conflict group; the L-ascorbic acid serum still does',()=>{assert.deepStrictEqual(ag(LIGHT),[]);assert.deepStrictEqual(get('strongGroupsOf')(LIGHT),[]);assert.ok(ag(TJ).includes('vitamin-c'));assert.ok(get('strongGroupsOf')(TJ).includes('vitamin-c'));});
t('so it may share a morning with niacinamide and the PanOxyl wash; the L-ascorbic acid serum may not',()=>{
  assert.ok(!conf(LIGHT,NIA));assert.ok(!conf(LIGHT,PAN));assert.ok(conf(TJ,NIA));assert.ok(conf(TJ,PAN));assert.ok(!get('blockedOnRecoveryMorning')(LIGHT));assert.ok(get('blockedOnRecoveryMorning')(TJ));});
t('two vitamin C serums still never share a session (one-per-session group)',()=>{assert.ok(sg(LIGHT).includes('vitamin-c'));assert.ok(sg(TJ).includes('vitamin-c'));});
t('only a product that says so in its name: plain vitamin C, ascorbyl and unrelated names are unchanged; notes are never read',()=>{
  const P=(g,b,notes)=>({id:'x',genericName:g,brandName:b||'',notes:notes||''});
  assert.ok(ag(P('Vitamin C Serum','Brand')).includes('vitamin-c'));assert.ok(ag(P('Ascorbyl Glucoside Solution 12%','The Ordinary')).includes('vitamin-c'));
  assert.ok(ag(P('Vitamin C Serum','Brand','a vitamin C derivative, ethyl ascorbic acid')).includes('vitamin-c'));
  assert.deepStrictEqual(ag(P('Ethyl Ascorbic Acid 15% Solution','The Ordinary')),[]);assert.deepStrictEqual(ag(P('Hydrating Serum','Brand')),[]);
  assert.ok(ag(P('Vitamin C Derivative Serum with Retinol','Brand')).includes('retinoid'));
  assert.strictEqual(get('isVitaminCDerivative')(null),false);assert.strictEqual(get('isVitaminCDerivative')({}),false);});

console.log('the kit');
t('the two join the trip kit for the mornings, taking turns, listed after the wash',()=>{
  assert.deepStrictEqual(TRIP().kit,[{productId:PAN.id,session:'both'},{productId:LIGHT.id,session:'am',every:2,turn:0},{productId:GF.id,session:'am',every:2,turn:1},
    {productId:NIA.id,session:'am'},{productId:BHA.id,session:'pm'},{productId:MARINE.id,session:'pm'},{productId:CREAM.id,session:'both'},{productId:SPF.id,session:'am'}]);});
t('kitEntryOn: session, turns counted from the trip\'s first day, and malformed entries',()=>{const T={date:'2026-11-04',until:'2026-11-24'};
  assert.strictEqual(on(T,{session:'am'},'2026-11-17','am'),true);assert.strictEqual(on(T,{session:'am'},'2026-11-17','pm'),false);assert.strictEqual(on(T,{session:'both'},'2026-11-17','pm'),true);
  assert.strictEqual(on(T,{session:'am',every:2,turn:0},'2026-11-16','am'),true);assert.strictEqual(on(T,{session:'am',every:2,turn:0},'2026-11-17','am'),false);
  assert.strictEqual(on(T,{session:'am',every:2,turn:1},'2026-11-17','am'),true);assert.strictEqual(on(T,{session:'am',every:2,turn:1},'2026-11-16','am'),false);
  assert.strictEqual(on(T,{session:'am',every:2,turn:1},'2026-11-17','pm'),false);
  assert.strictEqual(on(T,{session:'am',every:3,turn:2},'2026-11-06','am'),true);assert.strictEqual(on(T,{session:'am',every:3,turn:5},'2026-11-06','am'),true);
  assert.strictEqual(on(T,{session:'am',every:2},'2026-11-04','am'),true);assert.strictEqual(on(T,{session:'am',every:2,turn:-1},'2026-11-05','am'),true);
  assert.strictEqual(on(T,{session:'am',every:2,turn:1},'2026-11-03','am'),true,'a day before the trip counts backwards, not NaN');
  [0,1,-2,'2',2.5,null,NaN].forEach(e=>assert.strictEqual(on(T,{session:'am',every:e,turn:1},'2026-11-16','am'),true,'every='+e));
  assert.strictEqual(on(T,null,'2026-11-16','am'),false);assert.strictEqual(on(null,{session:'am'},'2026-11-16','am'),false);assert.strictEqual(on(T,{},'2026-11-16','am'),false);
  assert.strictEqual(on({},{session:'am',every:2,turn:0},'2026-11-16','am'),false);assert.strictEqual(on(T,{session:'am',every:2,turn:0},'garbage','am'),false);});

console.log('the trip mornings and evenings (from Nov 16)');
t('even trip days (Nov 16, 18 … 24): PanOxyl > Light On > niacinamide > cream > sunscreen',()=>{const k=keys('am').filter(trip).filter(even);assert.strictEqual(k.length,5);
  k.forEach(x=>assert.deepStrictEqual(ids(pl[x]),[PAN,LIGHT,NIA,CREAM,SPF].map(p=>p.id),x));assert.strictEqual(k[0],'2026-11-16:am');});
t('odd trip days (Nov 17, 19 … 23): PanOxyl > niacinamide > GF 15% > cream > sunscreen',()=>{const k=keys('am').filter(trip).filter(x=>!even(x));assert.strictEqual(k.length,4);
  k.forEach(x=>assert.deepStrictEqual(ids(pl[x]),[PAN,NIA,GF,CREAM,SPF].map(p=>p.id),x));});
t('the two never share a morning, and the morning stays at five steps, sunscreen included',()=>keys('am').filter(trip).forEach(k=>{const i=ids(pl[k]);assert.ok(!(i.includes(LIGHT.id)&&i.includes(GF.id)),k);assert.strictEqual(i.length,5,k);assert.ok(i.filter(id=>id!==SPF.id).length<=get('SESSION_CAP'),k);}));
t('the evenings are unchanged — wash, salicylic acid, Marine, cream — and neither serum ever meets the salicylic acid',()=>keys('pm').filter(trip).forEach(k=>assert.deepStrictEqual(ids(pl[k]),[PAN,BHA,MARINE,CREAM].map(p=>p.id),k)));
t('no warning and no "shouldn\'t be used together" on any packed morning or evening',()=>keys('am').concat(keys('pm')).filter(trip).forEach(k=>{const [d,s]=k.split(':');
  pl[k].forEach(p=>assert.strictEqual(get('addStepIrritationRisks')(prof,p,d,s).length,0,`${k} ${p.genericName}`));
  assert.deepStrictEqual(get('analyzeDayRoutine')(pl[k]).filter(i=>i.type==='conflict'),[],k);}));
t('home (from Nov 25): neither is in any routine; the Trader Joe\'s vitamin C still runs',()=>{keys('am').concat(keys('pm')).filter(home).forEach(k=>assert.ok(!ids(pl[k]).includes(LIGHT.id)&&!ids(pl[k]).includes(GF.id),k));
  assert.ok(keys('am').filter(home).some(k=>ids(pl[k]).includes(TJ.id)));});
t('the trip note lists them once, as taking turns',()=>{const txt=get('tripKitText')(TRIP(),prof.products);
  assert.ok(/Morning: PanOxyl Acne Foaming, Light On Serum or GF 15% Solution \(alternate mornings\), Niacinamide 10% \+ Zinc 1%, Purito Seoul Mighty, SKIN1004 Madagascar Centella\./.test(txt),txt);
  assert.ok(/Evening: PanOxyl Acne Foaming, Paula's Choice, The Ordinary Marine, Purito Seoul Mighty\./.test(txt),txt);});
t('the note copes with one step on turns, a kit entry for a product that is gone, and junk entries',()=>{const K=(...k)=>({type:'trip',date:'2026-11-04',until:'2026-11-24',kit:k});const tx=get('tripKitText');
  assert.ok(/Morning: PanOxyl Acne Foaming, GF 15% Solution \(every other day\)\./.test(tx(K({productId:PAN.id,session:'both'},{productId:GF.id,session:'am',every:2,turn:1}),prof.products)));
  assert.ok(/Evening: GF 15% Solution \(every 3 days\)\./.test(tx(K({productId:GF.id,session:'pm',every:3}),prof.products)));
  assert.ok(/Morning: PanOxyl Acne Foaming, GF 15% Solution \(every other day\)\./.test(tx(K(null,{productId:PAN.id,session:'am'},{productId:'gone',session:'am',every:2,turn:0},{productId:GF.id,session:'am',every:2,turn:1},{}),prof.products)));
  assert.ok(/Morning: —\. Evening: —\./.test(tx(K({productId:'gone',session:'am'}),prof.products)));});

console.log('skips and ticks');
const withLogs=(today,logs)=>{const g=load(today);const p={...prof,logs};return {g,p,pl:plan(g,p,12)};};
t('skipping the Light On does not carry it onto the GF morning; it is back, once, on its own next morning',()=>{
  const {pl:q}=withLogs([2026,10,17],[{id:1,date:'2026-11-16',productId:LIGHT.id,session:'am',done:false,skipped:true}]);
  assert.deepStrictEqual(ids(q['2026-11-17:am']),[PAN,NIA,GF,CREAM,SPF].map(p=>p.id));assert.deepStrictEqual(ids(q['2026-11-18:am']),[PAN,LIGHT,NIA,CREAM,SPF].map(p=>p.id));
  assert.deepStrictEqual(ids(q['2026-11-19:am']),[PAN,NIA,GF,CREAM,SPF].map(p=>p.id));});
t('skipping the GF 15% does not carry it onto the Light On morning either',()=>{
  const {pl:q}=withLogs([2026,10,18],[{id:1,date:'2026-11-17',productId:GF.id,session:'am',done:false,skipped:true}]);
  assert.deepStrictEqual(ids(q['2026-11-18:am']),[PAN,LIGHT,NIA,CREAM,SPF].map(p=>p.id));assert.deepStrictEqual(ids(q['2026-11-19:am']),[PAN,NIA,GF,CREAM,SPF].map(p=>p.id));});
t('skipped on the last trip mornings, neither follows him home',()=>{
  const {pl:q}=withLogs([2026,10,25],[{id:1,date:'2026-11-23',productId:GF.id,session:'am',done:false,skipped:true},{id:2,date:'2026-11-24',productId:LIGHT.id,session:'am',done:false,skipped:true}]);
  Object.keys(q).forEach(k=>assert.ok(!ids(q[k]).includes(LIGHT.id)&&!ids(q[k]).includes(GF.id),k+' '+q[k].map(p=>p.genericName).join(' > ')));});
t('ticking them done changes nothing in the plan; random skips of any packed step never put the two together',()=>{
  const done=keys('am').filter(trip).slice(0,4).flatMap((k,i)=>pl[k].map((p,j)=>({id:i*10+j,date:k.split(':')[0],productId:p.id,session:'am',done:true})));
  const {pl:q}=withLogs([2026,10,20],done);keys('am',q).filter(trip).forEach(k=>assert.deepStrictEqual(ids(q[k]),ids(pl[k]),k));
  let r=4242;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};
  for(let n=0;n<40;n++){const logs=[];keys('am').concat(keys('pm')).filter(trip).forEach(k=>pl[k].forEach(p=>{if(rnd()<0.35)logs.push({id:logs.length,date:k.split(':')[0],productId:p.id,session:k.split(':')[1],done:false,skipped:true});}));
    const {pl:q2}=withLogs([2026,10,16],logs);keys('am',q2).concat(keys('pm',q2)).filter(trip).forEach(k=>{const i=ids(q2[k]);
      assert.ok(!(i.includes(LIGHT.id)&&i.includes(GF.id)),`trial ${n} ${k} both`);assert.ok(!((i.includes(LIGHT.id)||i.includes(GF.id))&&i.includes(BHA.id)),`trial ${n} ${k} with the BHA`);
      assert.strictEqual(new Set(i).size,i.length,`trial ${n} ${k} duplicate`);});}});

console.log('the migration');
t('idempotent; no-op on an empty profile, without a trip, and without a kit',()=>{const m=M();assert.strictEqual(m.apply(prof),prof);const e={};assert.strictEqual(m.apply(e),e);
  const noTrip={products:[],procedures:[{type:'redlight',date:'2026-11-04'}]};assert.strictEqual(m.apply(noTrip),noTrip);
  const noKit={products:[],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24'}]};assert.strictEqual(m.apply(noKit),noKit);});
t('before Nov 16 and after the trip it does nothing',()=>{const base={products:[],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24',kit:[{productId:1,session:'both'}]}]};
  [[2026,10,15],[2026,10,25],[2027,0,5]].forEach(d=>assert.strictEqual(M(load(d)).apply(base),base,d.join('-')));
  [[2026,10,16],[2026,10,24]].forEach(d=>assert.notStrictEqual(M(load(d)).apply(base),base,d.join('-')));});
t('a Light On or GF 15% already in the library is reused, not duplicated; one already in the kit keeps its entry',()=>{
  const base={products:[{id:70,genericName:'Serum',brandName:'Beauty of Joseon Light On Serum Centella + Vita C'},{id:71,genericName:'GF 15% Solution',brandName:'The Ordinary'}],
    procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24',kit:[{productId:1,session:'both'},{productId:70,session:'am'}]}]};
  const o=M().apply(base);assert.strictEqual(o.products.length,2);
  assert.deepStrictEqual(o.procedures[0].kit,[{productId:1,session:'both'},{productId:70,session:'am'},{productId:71,session:'am',every:2,turn:1}]);assert.strictEqual(M().apply(o),o);});
t('an id already taken (even by a deleted product) is never reused; an empty or junk kit is survived',()=>{
  const base={products:[{id:'boj-light-on-serum-v1',genericName:'Something else',brandName:'X'}],removedProducts:[{id:'ordinary-gf-15-v1',genericName:'Old',brandName:'Y'}],
    procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24',kit:[null,{},{productId:9,session:'pm'}]}]};
  const o=M().apply(base);const idsNow=o.products.map(p=>p.id);assert.deepStrictEqual(idsNow,['boj-light-on-serum-v1','boj-light-on-serum-v1-2','ordinary-gf-15-v1-2']);
  const k=o.procedures[0].kit;assert.deepStrictEqual(k.slice(0,2),[{productId:'boj-light-on-serum-v1-2',session:'am',every:2,turn:0},{productId:'ordinary-gf-15-v1-2',session:'am',every:2,turn:1}]);assert.strictEqual(k.length,5);
  const empty={products:[],procedures:[{type:'trip',date:'2026-11-04',until:'2026-11-24',kit:[]}]};assert.strictEqual(M().apply(empty).procedures[0].kit.length,2);});
t('it never touches logs, pins, other products or other procedures',()=>{const base={products:[{id:1,genericName:'Gel Cleanser',brandName:''}],logs:[{id:1}],pins:[{id:2}],
    procedures:[{type:'redlight',date:'2026-10-13'},{type:'trip',date:'2026-11-04',until:'2026-11-24',noRetinoid:['2026-11-16'],kit:[{productId:1,session:'both'}]}]};
  const snap=JSON.stringify(base);const o=M().apply(base);assert.strictEqual(JSON.stringify(base),snap,'input mutated');
  assert.strictEqual(o.logs,base.logs);assert.strictEqual(o.pins,base.pins);assert.strictEqual(o.products[0],base.products[0]);assert.strictEqual(o.procedures[0],base.procedures[0]);assert.deepStrictEqual(o.procedures[1].noRetinoid,['2026-11-16']);});

console.log('his real export (the 2026-11-16 report), when the file is here');
const REAL='/mnt/user-data/uploads/99d742f2-skin-ritual-data-2026-11-16-0845.txt';
if(fs.existsSync(REAL)){const real=JSON.parse(fs.readFileSync(REAL,'utf8')).profile;const snap=JSON.stringify(real);const out=get('applyMigrations')(real);const q=plan(get,out,12);
  const P=re=>out.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));const L=P(/Light On Serum/),G=P(/GF 15%/);
  t('only this migration runs; the two products are added and nothing else in the library changes',()=>{assert.strictEqual(JSON.stringify(real),snap,'input mutated');
    assert.deepStrictEqual(out.migrations.filter(m=>!real.migrations.includes(m)),['trip_kit_add_lighton_gf_v1']);assert.strictEqual(out.products.length,real.products.length+2);
    real.products.forEach((p,i)=>assert.deepStrictEqual(out.products[i],p));assert.deepStrictEqual(out.logs,real.logs);assert.deepStrictEqual(out.pins,real.pins);assert.deepStrictEqual(out.removedProducts,real.removedProducts);});
  t('today (Nov 16) the morning gains the Light On after the wash; tomorrow the GF 15% after the niacinamide; evenings as they were',()=>{
    assert.deepStrictEqual(ids(q['2026-11-16:am']),[42,L.id,'ordinary-niacinamide-zinc-v1',43,21]);assert.deepStrictEqual(ids(q['2026-11-17:am']),[42,'ordinary-niacinamide-zinc-v1',G.id,43,21]);
    for(let d='2026-11-16';d<='2026-11-24';d=add(d,1))assert.deepStrictEqual(ids(q[d+':pm']),[42,35,18,43],d);});
  t('reloading (migrations again) changes nothing',()=>assert.strictEqual(get('applyMigrations')(out),out));
}else console.log('  (file not present — skipped)');

console.log('the whole plan');
t('60-day plan: the routine audit finds no high issues',()=>{const {issues}=require('./audit').audit(get,prof,pl,60);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.key+' '+i.msg),[]);});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
