// The refresh button must load newly deployed code without closing the app,
// keep the data, and the "update available" banner must appear when the app
// is resumed after a deploy. The server here caches index.html aggressively
// (like a CDN) unless the request bypasses it, to prove the button does.
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright-core');
const {profile,P}=require('./fixture');const {loadApp}=require('./harness');
const MIG=loadApp().MIGRATIONS.map(m=>m.id);
let fails=0;const ok=(c,m)=>{console.log(c?'  ok   ':'  FAIL ',m);if(!c)fails++};
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace('https://unpkg.com/react@18/umd/react.production.min.js','/react.js').replace('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js','/react-dom.js');
const cur=src.match(/const APP_VERSION = "([^"]+)"/)[1];
let deployed=src;
const files={'/react.js':fs.readFileSync('node_modules/react/umd/react.production.min.js'),'/react-dom.js':fs.readFileSync('node_modules/react-dom/umd/react-dom.production.min.js')};
const server=http.createServer((q,r)=>{const u=q.url.split('?')[0];
  if(u==='/'){r.writeHead(200,{'content-type':'text/html','cache-control':'max-age=600'});return r.end(deployed)}
  if(files[u]){r.writeHead(200,{'content-type':'text/javascript'});return r.end(files[u])}
  r.writeHead(404);r.end()});
(async()=>{await new Promise(r=>server.listen(8144,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.addInitScript(({seed})=>{if(!localStorage.getItem('skinritual_v4'))localStorage.setItem('skinritual_v4',JSON.stringify({v:4,profile:seed}));},{seed:profile({products:[P(1,'Gel Cleanser','pm','daily')],migrations:MIG})});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8144/');await page.waitForSelector('[data-testid=refresh-app]');
const ver=async()=>(await page.locator('text=/^v\\d{4}-\\d{2}-\\d{2}\\.\\d+$/').first().innerText());
ok((await ver())==='v'+cur,`starts on v${cur}`);
const hdr=await page.evaluate(()=>{const r=document.querySelector('[data-testid=refresh-app]').getBoundingClientRect();const s=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Sync')).getBoundingClientRect();return {sameRow:Math.abs((r.top+r.bottom)/2-(s.top+s.bottom)/2)<3,right:r.left>s.left,w:r.width,h:r.height}});
ok(hdr.sameRow&&hdr.right,'refresh button sits next to Sync');
ok(hdr.w>=30&&hdr.h>=30,'it is a proper tap target');
ok(await page.locator('text=Update available').count()===0,'no banner while up to date');
// leave a marker in the data, then "deploy" a new version
await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('skinritual_v4'));d.profile.marker='keep-me';localStorage.setItem('skinritual_v4',JSON.stringify(d))});
deployed=src.replace(`const APP_VERSION = "${cur}"`,'const APP_VERSION = "2099-01-01.1"');
// resume from background → banner appears without a relaunch
await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
await page.waitForSelector('text=Update available',{timeout:5000}).then(()=>ok(true,'banner appears when the app is resumed after a deploy')).catch(()=>ok(false,'banner appears when the app is resumed after a deploy'));
// reopening the same address is served the cached old page (proves the cache is real)
await page.goto('http://localhost:8144/');await page.waitForSelector('[data-testid=refresh-app]');
ok((await ver())==='v'+cur,'control: reopening the app normally still shows the old cached version');
// the button gets past it
await Promise.all([page.waitForNavigation(),page.locator('[data-testid=refresh-app]').click()]);
await page.waitForSelector('[data-testid=refresh-app]');
ok((await ver())==='v2099-01-01.1','refresh button loads the newly deployed version');
ok(!/[?&]r=/.test(page.url()),'address is tidied back after the refresh');
const kept=await page.evaluate(()=>JSON.parse(localStorage.getItem('skinritual_v4')).profile.marker);
ok(kept==='keep-me','your data is untouched');
ok(await page.locator('text=Update available').count()===0,'banner gone once up to date');
ok(errors.length===0,'no page errors '+(errors[0]||''));
await b.close();server.close();console.log(fails?`\n${fails} FAILED`:'\nrefresh e2e passed');process.exit(fails?1:0);})().catch(e=>{console.error('CRASH',e.message);process.exit(2)});
