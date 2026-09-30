const fs=require('fs');
function loadApp(){
  const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  let main=scripts[scripts.length-1];
  main=main.slice(0,main.indexOf('const root = ReactDOM.createRoot'));
  main=main.replace(/const appToday = \(\) => \{[\s\S]*?\n\};\n/,'const appToday = () => new Date(2026, 8, 20);\n');
  const names=['daysBetween','rotationRoleFor','isWashOffMask','FREQ_DAYS','canonicalStepOrder','detectType','stepInfoFor','buildSessionSchedule','computeEpoch','addDaysStr','SESSION_CAP','MIGRATIONS','applyMigrations','productCategoryGroup','classifySingletonGroups','countsTowardCap','analyzeDayRoutine','isRinseOffProduct','productUsage','buildPickerSections','sortForDay','analyzeRoutine'];
  const body=main+'\nreturn {'+names.map(n=>`${n}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',')+'};';
  const noop=()=>{};
  const React={useState:v=>[typeof v==='function'?v():v,noop],useRef:v=>({current:v}),useEffect:noop,useCallback:f=>f,useMemo:f=>f(),useLayoutEffect:noop,createElement:()=>null,Fragment:'f'};
  const store={};const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
  const doc={getElementById:()=>null,addEventListener:noop,createElement:()=>({style:{}}),documentElement:{},body:{}};
  const win={addEventListener:noop,removeEventListener:noop,matchMedia:()=>({matches:false,addEventListener:noop}),localStorage:ls,innerHeight:800};
  return new Function('React','ReactDOM','document','window','localStorage','navigator','URL','Blob','FileReader','IntersectionObserver',body)(React,{},doc,win,ls,{},{createObjectURL:()=>''},function(){},function(){},function(){});
}
module.exports={loadApp};
