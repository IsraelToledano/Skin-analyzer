// Loads the shipped app logic with "today" pinned, and rebuilds Israel's
// product library: the original seed list (artifact-version ISRAEL_PRODUCTS)
// run through every migration the phone app applies on load.
const fs=require('fs');
function load(today=[2026,9,1]){
  const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  let main=scripts[scripts.length-1];
  main=main.slice(0,main.indexOf('const root = ReactDOM.createRoot'));
  main=main.replace(/const appToday = \(\) => \{[\s\S]*?\n\};\n/,`const appToday = () => new Date(${today.join(',')});\n`);
  const noop=()=>{};
  const React={useState:v=>[typeof v==='function'?v():v,noop],useRef:v=>({current:v}),useEffect:noop,useCallback:f=>f,useMemo:f=>f(),useLayoutEffect:noop,createElement:()=>null,Fragment:'f'};
  const store={};const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
  const doc={getElementById:()=>null,addEventListener:noop,createElement:()=>({style:{}}),documentElement:{},body:{}};
  const win={addEventListener:noop,removeEventListener:noop,matchMedia:()=>({matches:false,addEventListener:noop}),localStorage:ls,innerHeight:800};
  const get=new Function('React','ReactDOM','document','window','localStorage','navigator','URL','Blob','FileReader','IntersectionObserver',main+'\nreturn n=>eval(n);')(React,{},doc,win,ls,{},{createObjectURL:()=>''},function(){},function(){},function(){});
  return get;
}
function seedProfile(get){
  const jsx=fs.readFileSync(require('path').join(__dirname,'..','artifact-version','skincare-agent.jsx'),'utf8');
  const fnSrc=jsx.slice(jsx.indexOf('const ISRAEL_PRODUCTS = () => {'),jsx.indexOf('// @qa:seedAdditions:start'));
  const seed=new Function(fnSrc+'\nreturn ISRAEL_PRODUCTS();')();
  const todayDs=get('todayStr')();
  seed.forEach(p=>{if(p.scheduled)p.nextDate=todayDs;});
  const base={...get('EMPTY_PROFILE'),products:seed,migrations:[]};
  return get('applyMigrations')(base);
}
// Build the day-by-day plan exactly the way the Day view does.
function plan(get,profile,days=30){
  const todayDs=get('todayStr')();
  const toDs=get('addDaysStr')(todayDs,days-1);
  const out={};
  ['am','pm'].forEach(session=>{
    const prods=profile.products;
    const sched=get('buildSessionSchedule')(prods,profile.logs||[],session,get('computeEpoch')(prods,session),toDs,get('SESSION_CAP'),profile.pins||[],profile.procedures||[]);
    for(let d=todayDs;d<=toDs;d=get('addDaysStr')(d,1)){
      const list=get('queueFor')(sched,prods,get('parseDate')(d));
      out[`${d}:${session}`]=get('sortForDay')(list,profile,d,session);
    }
  });
  return out;
}
module.exports={load,seedProfile,plan};
