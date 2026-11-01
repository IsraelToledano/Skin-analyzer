// 2026-11-01: winter is when acids and retinoids go UP (less sun), the La
// Roche-Posay B3 comes back (he wants to finish it), and the step-up waits
// until he's home: Cambodia/Vietnam/Thailand Nov 4–24 runs a light routine
// (strong sun), with no retinoid around the dives (Nov 15–18).
const assert=require('assert');const {load,seedProfile,plan}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,1]);const type=get('detectType'),rr=get('rotationRoleFor'),ag=get('classifyActiveGroups'),add=get('addDaysStr');
const prof=seedProfile(get);const pl=plan(get,prof,61);
const by=re=>prof.products.find(p=>re.test(p.genericName+' '+(p.brandName||'')));
const keys=s=>Object.keys(pl).filter(k=>k.endsWith(':'+s)).sort();
const inTrip=d=>d>='2026-11-04'&&d<='2026-11-24';
const M=id=>get('MIGRATIONS').find(m=>m.id===id);
const RETURNING=[/Glycolic Acid 7%/,/30 Days Miracle/,/COSRX AHA\/BHA/,/One Step Peel/];

console.log('library');
t('the La Roche-Posay B3 is back in the routine now (weekly, no return date)',()=>{const p=by(/Retinol B3/);assert.ok(p.scheduled&&!p.winterPaused&&!p.activeFrom&&p.frequency==='weekly',JSON.stringify(p).slice(0,200));});
t('the acids paused for winter come back on Nov 25',()=>RETURNING.forEach(re=>{const p=by(re);assert.ok(p.scheduled&&!p.winterPaused,p.genericName);assert.strictEqual(p.activeFrom,'2026-11-25',p.genericName);}));
t('the AHA 30% peel a week later (Dec 2), still mostly spot and every 8 weeks',()=>{const p=by(/AHA 30%/);assert.strictEqual(p.activeFrom,'2026-12-02');assert.ok(p.scheduled&&p.spotTreatment);assert.strictEqual(p.frequency,'8-weekly');});
t('the full winter week starts Nov 25; the trip runs Nov 4–24 with no retinoid Nov 15–18',()=>{
  const pr=prof.procedures;assert.ok(pr.some(x=>x.type==='rotation'&&x.date==='2026-11-25'&&x.plan==='winterFull'));
  const tr=pr.find(x=>x.type==='trip');assert.ok(tr);assert.strictEqual(tr.date,'2026-11-04');assert.strictEqual(tr.until,'2026-11-24');assert.deepStrictEqual(tr.noRetinoid,['2026-11-15','2026-11-16','2026-11-17','2026-11-18']);});
t('migrations: idempotent, safe on empty, no duplicates',()=>{
  ['winter_step_up_2026_11_v1','trip_2026_11_v1'].forEach(id=>{const once=M(id).apply(prof);assert.strictEqual(once,prof,id+' changed an applied profile');const e=M(id).apply({});assert.strictEqual(M(id).apply(e),e,id);});
  assert.strictEqual(prof.procedures.filter(x=>x.type==='trip').length,1);assert.strictEqual(prof.procedures.filter(x=>x.type==='rotation').length,1);});
t('before Nov 1 (plans for earlier days) and after the trip, the migrations change nothing',()=>{
  const g=load([2026,9,31]);const base={products:[{id:1,genericName:'Retinol Serum',brandName:'La Roche-Posay Retinol B3 Serum',scheduled:false,winterPaused:true}],procedures:[]};
  ['winter_step_up_2026_11_v1','trip_2026_11_v1'].forEach(id=>{const m=g('MIGRATIONS').find(x=>x.id===id);assert.strictEqual(m.apply(base),base,id);});
  const late=load([2026,10,25]);const m=late('MIGRATIONS').find(x=>x.id==='trip_2026_11_v1');assert.strictEqual(m.apply(base),base);});

console.log('the trip (Nov 4–24)');
const trip=k=>inTrip(k.split(':')[0]);
t('mornings: cleanser, hydration, moisturizer, sunscreen — no acid, vitamin C or niacinamide',()=>keys('am').filter(trip).forEach(k=>{
  pl[k].forEach(p=>assert.ok(!ag(p).length,`${k}: ${p.genericName}`));assert.ok(pl[k].some(p=>type(p)==='spf'),k+' no SPF');assert.ok(pl[k].some(p=>type(p)==='moisturizer'),k);assert.ok(pl[k].some(p=>/cleanser/.test(type(p))),k+' no cleanser');}));
t('a gentle cleanser stands in for the acid one every trip morning',()=>keys('am').filter(trip).forEach(k=>{const c=pl[k].find(p=>type(p)==='cleanser');assert.ok(c&&!ag(c).length,k+' '+(c&&c.genericName));}));
t('evenings: no acids, masks, self-tan, vitamin C or OTC retinol',()=>keys('pm').filter(trip).forEach(k=>pl[k].forEach(p=>{
  assert.ok(!['mask','selftan'].includes(type(p)),`${k}: ${p.genericName}`);assert.ok(!ag(p).some(g=>g!=='retinoid'),`${k}: ${p.genericName}`);if(type(p)==='retinoid')assert.strictEqual(rr(p),'tretinoin',k);})));
const tretNights=keys('pm').filter(k=>pl[k].some(p=>rr(p)==='tretinoin')).map(k=>k.split(':')[0]);
t('tretinoin keeps going on the trip, at most twice in any 7 trip nights',()=>{const n=tretNights.filter(inTrip);assert.ok(n.length>=4,'only '+n.join(' '));
  n.forEach(d=>{const w=n.filter(x=>x<=d&&x>add(d,-7));assert.ok(w.length<=2,d+': '+w.join(' '));});});
t('no retinoid from the night before the first dive to the night after the last (Nov 15–18)',()=>['2026-11-15','2026-11-16','2026-11-17','2026-11-18'].forEach(d=>assert.ok(!pl[d+':pm'].some(p=>type(p)==='retinoid'),d)));
t('every trip evening still has a cleanse, a hydrating layer or toner, and a moisturizer',()=>keys('pm').filter(trip).forEach(k=>{assert.ok(pl[k].some(p=>type(p)==='cleanser'),k);assert.ok(pl[k].some(p=>type(p)==='moisturizer'),k);}));

console.log('home again (from Nov 25)');
const home=k=>k.split(':')[0]>='2026-11-25';
const weeks=[];for(let d='2026-11-25';add(d,6)<='2026-12-31';d=add(d,7))weeks.push(d);
const inWeek=(w,f)=>keys('pm').filter(k=>{const d=k.split(':')[0];return d>=w&&d<=add(w,6)&&pl[k].some(f);}).length;
t('two exfoliant nights a week',()=>weeks.forEach(w=>assert.strictEqual(inWeek(w,p=>rr(p)==='exfoliant'),2,w)));
t('three retinoid nights a week: tretinoin twice and the B3 once',()=>weeks.forEach(w=>{assert.strictEqual(inWeek(w,p=>rr(p)==='tretinoin'),2,w);assert.strictEqual(inWeek(w,p=>rr(p)==='retinol'),1,w);}));
t('a clay mask night and a rest night every week',()=>weeks.forEach(w=>{assert.strictEqual(inWeek(w,p=>rr(p)==='mask'),1,w);assert.ok(7-inWeek(w,p=>!!rr(p)||type(p)==='retinoid')>=1,w);}));
t('never two exfoliants, two retinoids, or a retinoid with an exfoliant on one night',()=>keys('pm').filter(home).forEach(k=>{const r=pl[k].filter(p=>type(p)==='retinoid').length,e=pl[k].filter(p=>rr(p)==='exfoliant').length;assert.ok(r<=1&&e<=1&&!(r&&e),k);}));
t('every returning acid gets a night by the end of December; none before its date',()=>{
  RETURNING.concat([/AHA 30%/]).forEach(re=>{const p=by(re);const n=keys('pm').filter(k=>pl[k].some(q=>q.id===p.id)).map(k=>k.split(':')[0]);assert.ok(n.length>=1,p.genericName+' never');assert.ok(n.every(d=>d>=p.activeFrom),p.genericName+' '+n[0]);});});
t('the returning acids don\'t take over: the gentle exfoliants still get their turns',()=>{const ex=keys('pm').filter(home).filter(k=>pl[k].some(p=>rr(p)==='exfoliant'));
  const gentle=ex.filter(k=>pl[k].some(p=>rr(p)==='exfoliant'&&!p.activeFrom));assert.ok(gentle.length>=ex.length/4,`${gentle.length}/${ex.length}`);
  [/2% BHA/,/Microfoliant/,/Vinopure Blemish/].forEach(re=>{const p=by(re);assert.ok(ex.some(k=>pl[k].some(q=>q.id===p.id)),p.genericName);});});
t('the 61-day plan passes the routine audit (trip rules included) with no high issues',()=>{const {issues}=require('./audit').audit(get,prof,pl,61);assert.deepStrictEqual(issues.filter(i=>i.sev==='high').map(i=>i.key+' '+i.msg),[]);});

console.log('when the B3 runs out');
t('tretinoin takes its night back at home (3 a week); the trip still keeps it to 2',()=>{
  const p2={...prof,products:prof.products.map(p=>/Retinol B3/.test(p.brandName||'')?{...p,scheduled:false}:p)};const pl2=plan(get,p2,61);
  const n=Object.keys(pl2).filter(k=>k.endsWith(':pm')&&pl2[k].some(p=>rr(p)==='tretinoin')).map(k=>k.split(':')[0]).sort();
  weeks.forEach(w=>assert.strictEqual(n.filter(d=>d>=w&&d<=add(w,6)).length,3,w));
  n.filter(inTrip).forEach(d=>assert.ok(n.filter(x=>inTrip(x)&&x<=d&&x>add(d,-7)).length<=2,d));});

console.log('warnings');
const R=(re,d,s='pm')=>get('addStepIrritationRisks')(prof,by(re),d,s).map(r=>r.text).join(' | ');
t('an exfoliant added on the trip warns about the sun',()=>{[/2% BHA/,/Glycolic Acid 7%/,/Microfoliant/].forEach(re=>assert.ok(/strong sun/.test(R(re,'2026-11-11')),String(re)));});
t('tretinoin added next to the dives warns',()=>assert.ok(/dives/.test(R(/tretinoin/i,'2026-11-16'))));
const extra=tretNights.filter(inTrip).map(d=>add(d,1)).find(d=>inTrip(d)&&!tretNights.includes(d)&&tretNights.filter(x=>inTrip(x)&&x<d&&x>add(d,-7)).length>=2); // trip nights only
t('a third tretinoin night inside a trip week warns',()=>{assert.ok(extra,'no such night');assert.ok(/2 a week/.test(R(/tretinoin/i,extra)),extra+': '+R(/tretinoin/i,extra));});
t('tretinoin on its own trip nights does not warn',()=>tretNights.filter(inTrip).forEach(d=>assert.strictEqual(R(/tretinoin/i,d),'',d)));
t('no trip warnings at home (before or after)',()=>['2026-11-02','2026-11-29','2026-12-06'].forEach(d=>assert.ok(!/strong sun|dives|2 a week/.test(R(/2% BHA/,d)+R(/tretinoin/i,d)),d)));

console.log('generic');
t('a product with a future return date sits out until then, then rotates in level with the others',()=>{
  const {P}=require('./fixture');const ex=(id,name,o={})=>P(id,name,'pm','weekly',{nextDate:'2026-10-01',rotationAnchor:'2026-10-01',...o});
  const ps=[P(1,'Gentle Gel Cleanser','pm','daily',{nextDate:'2026-10-01'}),P(5,'Barrier Repair Moisturizer','pm','daily',{nextDate:'2026-10-01'}),ex(10,'chemical exfoliant toner'),ex(11,'powder exfoliant'),ex(12,'glycolic acid toner',{activeFrom:'2026-11-25'})];
  const s=get('buildSessionSchedule')(ps,[],'pm','2026-10-01','2026-12-31',get('SESSION_CAP'),[],[]);
  const on=id=>Object.keys(s).filter(d=>s[d].some(e=>e.productId===id)).sort();
  assert.ok(on(12).length&&on(12)[0]>='2026-11-25',on(12)[0]);
  const after=id=>on(id).filter(d=>d>='2026-11-25').length;assert.ok(Math.max(after(10),after(11),after(12))-Math.min(after(10),after(11),after(12))<=2,[after(10),after(11),after(12)].join('/'));});
t('malformed trip/rotation entries are ignored',()=>{const g=get('tripOn'),r=get('rotationSlotsOn');
  [{type:'trip'},{type:'trip',date:'x',until:'2026-11-30'},{type:'trip',date:'2026-11-01'},null].forEach(x=>assert.strictEqual(g([x],'2026-11-10'),null,JSON.stringify(x)));
  assert.strictEqual(r([{type:'rotation',date:'2026-11-01',plan:'nope'},{type:'rotation',plan:'standard'}],'2026-11-10'),get('ROTATION_SLOTS'));});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
