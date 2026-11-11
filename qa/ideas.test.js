// The Ideas page (2026-11-11): Claude's proposals as cards; his accept /
// reject decisions are profile data and travel with the report.
const assert=require('assert');const {load,seedProfile}=require('./sim');
let pass=0,fail=0;const t=(n,fn)=>{try{fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const get=load([2026,10,11]);const IDEAS=get('IDEAS'),G=get('IDEA_GROUPS'),sum=get('suggestionSummary'),dec=get('decideSuggestion');
t('every card has a unique id, a known group, a title and a body',()=>{const ids=IDEAS.map(s=>s.id);assert.strictEqual(new Set(ids).size,ids.length);
  IDEAS.forEach(s=>{assert.ok(G.some(([g])=>g===s.group),s.id);assert.ok(s.title&&s.body&&s.body.length>30,s.id);});});
t('all three groups have cards: UX, UI and the monthly check-up',()=>G.forEach(([g])=>assert.ok(IDEAS.filter(s=>s.group===g).length>=3,g)));
t('summary: all open at first',()=>assert.deepStrictEqual(sum({}),{open:IDEAS.length,accepted:0,rejected:0}));
t('accept / reject / undo',()=>{let p={};const a=IDEAS[0].id,b=IDEAS[1].id;
  p={...p,...dec(p,a,'accept')};p={...p,...dec(p,b,'reject')};assert.deepStrictEqual(sum(p),{open:IDEAS.length-2,accepted:1,rejected:1});
  assert.strictEqual(p.suggestionDecisions[a].at,'2026-11-11');
  p={...p,...dec(p,a,null)};assert.deepStrictEqual(sum(p),{open:IDEAS.length-1,accepted:0,rejected:1});assert.ok(!(a in p.suggestionDecisions));});
t('deciding does not mutate the profile it was given',()=>{const p={suggestionDecisions:{x:{decision:'accept',at:'2026-01-01'}}};const before=JSON.stringify(p);dec(p,IDEAS[0].id,'reject');assert.strictEqual(JSON.stringify(p),before);});
t('a decision on a card no longer in the list is kept but not counted; junk is safe',()=>{const p={suggestionDecisions:{'gone-card':{decision:'accept',at:'2026-01-01'},[IDEAS[0].id]:'junk'}};
  assert.deepStrictEqual(sum(p),{open:IDEAS.length,accepted:0,rejected:0});assert.ok('gone-card' in {...p,...dec(p,IDEAS[1].id,'accept')}.suggestionDecisions);assert.deepStrictEqual(sum(null),{open:IDEAS.length,accepted:0,rejected:0});});
t('decisions travel in the report and survive the migrations',()=>{const prof={...seedProfile(get),suggestionDecisions:{[IDEAS[0].id]:{decision:'accept',at:'2026-11-11'}}};
  const r=JSON.parse(get('buildReportData')(prof));assert.strictEqual(r.profile.suggestionDecisions[IDEAS[0].id].decision,'accept');
  assert.strictEqual(get('applyMigrations')(prof).suggestionDecisions[IDEAS[0].id].decision,'accept');});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
