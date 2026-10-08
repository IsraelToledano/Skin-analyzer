// One tap on the report button opens the share sheet with a screen image and
// the data file; nothing is saved to the phone. Share sheet is stubbed.
const {chromium}=require('playwright-core');const serve=require('./server');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const products=[P(1,'Gel Cleanser','pm','daily'),P(17,'Snail 96 Mucin Power Essence','pm','daily',{brandName:'COSRX'}),P(5,'water gel moisturizer','pm','daily')];
const seed=profile({products,migrations:MIG,skinImgs:[{b64:'AAAA',mime:'image/png'}]});
(async()=>{const server=await serve(8151);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const open=async mode=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8151'});
  await ctx.addInitScript(({seed,mode})=>{const R=Date;const fx=new R(2026,8,20,20,30).getTime();
    class D extends R{constructor(...a){if(a.length===0)super(fx);else super(...a)}static now(){return fx}}window.Date=D;
    localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));
    window.__shared=[];let first=true;
    if(mode==='none'){delete Navigator.prototype.share;delete Navigator.prototype.canShare;return;}
    navigator.canShare=()=>true;
    navigator.share=async d=>{
      if(mode==='tap'&&first){first=false;const e=new Error('gesture');e.name='NotAllowedError';throw e;}
      const files=await Promise.all(d.files.map(async f=>({name:f.name,type:f.type,size:f.size,text:f.type==='text/plain'?await f.text():null})));
      window.__shared.push(files);};
  },{seed,mode});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8151/');await page.waitForSelector('[data-testid=report-button]');
  return {ctx,page,errors};
};
// 1. one tap → image + data
{const {ctx,page,errors}=await open('ok');
  await page.mouse.wheel(0,400);await page.waitForTimeout(200);
  const box=await page.locator('[data-testid=report-button]').boundingBox();
  ok(box&&box.y>700&&box.x<30,'button stays on screen at the bottom-left while scrolled');
  await page.locator('[data-testid=report-button]').click();
  await page.waitForFunction(()=>window.__shared.length>0,null,{timeout:20000});
  const shared=await page.evaluate(()=>window.__shared);
  ok(shared.length===1,'one tap opens the share sheet once');
  const files=shared[0]||[];
  ok(files.map(f=>f.type).join()==='image/png,text/plain','it carries a screen image and the data file');
  const img=files.find(f=>f.type==='image/png');ok(img&&img.size>5000,'the screen image has real content ('+(img&&img.size)+' bytes)');
  const data=JSON.parse(files.find(f=>f.type==='text/plain').text);
  ok(data.kind==='skinritual-report'&&data.profile.products.length===3,'the data file has the routine data');
  ok(!('skinImgs' in data.profile)&&data.skinImgCount===1,'skin photos are left out');
  ok(/Sep/.test(data.meta.screenDate||'')&&/Calendar/.test(data.meta.tab||''),'it records which screen and day were showing ('+data.meta.tab+', '+data.meta.screenDate+')');
  ok(!data.meta.captureError,'the screen capture worked');
  await page.screenshot({path:'report.png'});
  ok(errors.length===0,'no page errors '+(errors[0]||''));await ctx.close();}
// 2. browser wants a fresh tap
{const {ctx,page,errors}=await open('tap');
  await page.locator('[data-testid=report-button]').click();
  await page.waitForSelector('text=Tap to send',{timeout:20000});ok(true,'shows "Tap to send" when the first tap expired');
  await page.locator('[data-testid=report-button]').click();
  await page.waitForFunction(()=>window.__shared.length>0,null,{timeout:10000});
  ok((await page.evaluate(()=>window.__shared[0].length))===2,'the second tap sends both files');
  ok((await page.locator('[data-testid=report-button]').innerText()).trim()!=='Tap to send','button returns to normal');
  ok(errors.length===0,'no page errors '+(errors[0]||''));await ctx.close();}
// 3. no share sheet → copied
{const {ctx,page,errors}=await open('none');
  await page.locator('[data-testid=report-button]').click();
  await page.waitForSelector('[data-testid=report-msg]',{timeout:20000});
  ok(/Copied/.test(await page.locator('[data-testid=report-msg]').innerText()),'without a share sheet the data is copied to paste');
  const clip=await page.evaluate(()=>navigator.clipboard.readText());
  ok(JSON.parse(clip).kind==='skinritual-report','the clipboard holds the report data');
  ok(errors.length===0,'no page errors '+(errors[0]||''));await ctx.close();}
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nreport e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
