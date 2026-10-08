// One-tap "report to Claude": screen image + data file through the share sheet.
const assert=require('assert');const {load}=require('./sim');const {T}=require('./fixture');
const get=load([2026,8,20]);
let pass=0,fail=0;const t=async(n,fn)=>{try{await fn();pass++;console.log('  ok  ',n)}catch(e){fail++;console.log('  FAIL',n,'\n       ',e.message.split('\n')[0])}};
const png=()=>new File([new Uint8Array([137,80,78,71])],'s.png',{type:'image/png'});
const txt=()=>new File(['{}'],'d.txt',{type:'text/plain'});
const nav=(o={})=>{const calls=[];return {calls,share:async x=>{calls.push(x);if(o.err){const e=new Error(o.err);e.name=o.err;throw e}},canShare:o.canShare||(()=>true)}};
(async()=>{
console.log('data file');
await t('carries the profile, version, date and screen info, without skin photos',()=>{
  const d=JSON.parse(get('buildReportData')({products:[{id:1}],logs:[{date:T}],skinImgs:[{b64:'x'.repeat(50000)}]},{tab:'📅 Calendar',screenDate:'Fri, Oct 2'}));
  assert.strictEqual(d.kind,'skinritual-report');assert.strictEqual(d.appVersion,get('APP_VERSION'));assert.strictEqual(d.today,T);
  assert.deepStrictEqual(d.profile.products,[{id:1}]);assert.ok(!('skinImgs' in d.profile));assert.strictEqual(d.skinImgCount,1);
  assert.strictEqual(d.meta.screenDate,'Fri, Oct 2');
});
await t('a large profile stays parseable and small without photos',()=>{
  const logs=Array.from({length:5000},(_,i)=>({id:i,date:T,session:'pm',productId:i%30,done:true}));
  const s=get('buildReportData')({logs,skinImgs:Array(20).fill({b64:'y'.repeat(100000)})});
  assert.ok(s.length<600000,`${s.length} bytes`);assert.strictEqual(JSON.parse(s).profile.logs.length,5000);
});
await t('null/empty profile and meta do not throw',()=>{
  [null,undefined,{}].forEach(p=>{const d=JSON.parse(get('buildReportData')(p,null));assert.deepStrictEqual(d.profile,{});assert.deepStrictEqual(d.meta,{})});
});
await t('file stamp is YYYY-MM-DD-HHMM',()=>assert.strictEqual(get('reportStamp')(new Date(2026,9,8,9,5)),'2026-10-08-0905'));
console.log('files');
await t('screen image + data file',async()=>{
  const f=await get('prepareReportFiles')({products:[]},{tab:'x'},async()=>new Blob([new Uint8Array([1])],{type:'image/png'}));
  assert.deepStrictEqual(f.map(x=>x.type),['image/png','text/plain']);assert.ok(/^skin-ritual-screen-.*\.png$/.test(f[0].name));
  assert.ok(/^skin-ritual-data-.*\.txt$/.test(f[1].name));assert.strictEqual(JSON.parse(await f[1].text()).meta.tab,'x');
});
await t('a failed capture still sends the data, noting why',async()=>{
  const f=await get('prepareReportFiles')({},{},async()=>{throw new Error('no canvas')});
  assert.deepStrictEqual(f.map(x=>x.type),['text/plain']);assert.strictEqual(JSON.parse(await f[0].text()).meta.captureError,'no canvas');
});
console.log('share sheet');
const share=get('shareReport');
await t('shares both files',async()=>{const n=nav();assert.strictEqual(await share([png(),txt()],n),'shared');assert.strictEqual(n.calls[0].files.length,2)});
await t('falls back to the data file when images can\'t be shared',async()=>{
  const n=nav({canShare:x=>x.files.every(f=>f.type==='text/plain')});assert.strictEqual(await share([png(),txt()],n),'shared-data-only');assert.strictEqual(n.calls[0].files.length,1);
});
await t('a browser that wants a fresh tap → needs-tap; cancel → cancelled; other error → failed',async()=>{
  assert.strictEqual(await share([png(),txt()],nav({err:'NotAllowedError'})),'needs-tap');
  assert.strictEqual(await share([png(),txt()],nav({err:'AbortError'})),'cancelled');
  assert.strictEqual(await share([png(),txt()],nav({err:'TypeError'})),'failed');
});
await t('no share support, no files or nothing shareable → unsupported',async()=>{
  assert.strictEqual(await share([txt()],{}),'unsupported');assert.strictEqual(await share([],nav()),'unsupported');assert.strictEqual(await share(null,nav()),'unsupported');
  assert.strictEqual(await share([png(),txt()],nav({canShare:()=>false})),'unsupported');assert.strictEqual(await share([txt()],null),'unsupported');
});
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
