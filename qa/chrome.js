// Path of the pre-installed headless Chromium shell (its folder name carries
// the Playwright build number, which changes between environments).
const fs=require('fs'),path=require('path');
const base='/opt/pw-browsers';
module.exports=(()=>{
  const dirs=fs.existsSync(base)?fs.readdirSync(base).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse():[];
  for(const d of dirs)for(const sub of ['chrome-linux/headless_shell','chrome-headless-shell-linux64/chrome-headless-shell']){const p=path.join(base,d,sub);if(fs.existsSync(p))return p;}
  return undefined;
})();
