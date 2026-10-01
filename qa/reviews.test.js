// Guards the product reviews (RANK_DATA) against reasoning that says
// nothing about the products themselves. Born from a "better option" whose
// only argument was that the alternative was "already scheduled".
const assert=require('assert');const {load,seedProfile}=require('./sim');
const get=load();const R=get('RANK_DATA');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n').slice(0,6).join('\n        '))}};
const texts=r=>[...(r.pros||[]).map(x=>['pro',x]),...(r.cons||[]).map(x=>['con',x]),['general',r.general||''],
  ...(r.alternatives||[]).flatMap(a=>[['alt name',a.name],['alt note',a.note||''],...((a.compare||{}).this||[]).map(x=>['this',x]),...((a.compare||{}).other||[]).map(x=>['other',x])])];
const CIRCULAR=/already (in your|scheduled|active|in (the|your) rotation|covers)|in your (weekly )?rotation\b|if (ever )?reactivated|unscheduled list|keeps the morning|which is why it keeps/i;
const APP_TALK=/\bslot\b|\bthe app\b|schedul|\balternat(es|ing)\b/i;
t('no review argues from what is or isn\'t already in the routine',()=>{
  const hits=[];R.forEach(r=>texts(r).forEach(([k,x])=>{if(CIRCULAR.test(x))hits.push(`#${r.id} ${k}: ${x.slice(0,90)}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('pros and cons judge the formula, not the app\'s scheduling',()=>{
  const hits=[];R.forEach(r=>[...(r.pros||[]),...(r.cons||[])].forEach(x=>{if(APP_TALK.test(x))hits.push(`#${r.id}: ${x.slice(0,90)}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('every "better" alternative has a head-to-head and a reason',()=>{
  const bad=[];R.forEach(r=>(r.alternatives||[]).filter(a=>a.relation==='better').forEach(a=>{
    const c=a.compare||{};if(!(c.this&&c.this.length)||!(c.other&&c.other.length)||!(a.note&&a.note.length>40))bad.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(bad,[]);
});
t('comparison lines are short enough to read on a phone',()=>{
  const long=[];R.forEach(r=>(r.alternatives||[]).forEach(a=>[...((a.compare||{}).this||[]),...((a.compare||{}).other||[])].forEach(x=>{if(x.length>140)long.push(`#${r.id}: ${x.slice(0,60)}…`)})));
  assert.deepStrictEqual(long,[]);
});
t('no alternative points to a product that was deleted or finished',()=>{
  const gone=/bio-?oil|yeouth niacinamide|mars safranal|effaclar mat/i;const hits=[];
  R.forEach(r=>(r.alternatives||[]).forEach(a=>{if(gone.test(a.name)||gone.test(a.note||''))hits.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('an alternative is never the product itself',()=>{
  const hits=[];R.filter(r=>r.id!==28/* Avène vs La Roche-Posay thermal water: same generic match words, different brands */).forEach(r=>(r.alternatives||[]).forEach(a=>{const hay=a.name.toLowerCase();if(r.match.every(k=>hay.includes(k)))hits.push(`#${r.id} → ${a.name}`)}));
  assert.deepStrictEqual(hits,[]);
});
t('each of his scheduled products resolves to a review that has content',()=>{
  const prof=seedProfile(get);const missing=[];
  prof.products.filter(p=>p.scheduled).forEach(p=>{const r=get('getProductRank')(p);if(!r||!r.id||!(r.general||'').length)missing.push(p.genericName)});
  assert.deepStrictEqual(missing,[]);
});
t('Silymarin CF is described with its real 15% vitamin C',()=>{
  const r=R.find(x=>x.id===5);const a=r.alternatives[0];assert.ok(/15%/.test(JSON.stringify(a))&&!/\b5% L-ascorbic/.test(JSON.stringify(a)));
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
