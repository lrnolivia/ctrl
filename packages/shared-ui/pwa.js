export function pwaInstallGuidance({standalone=false,ios=false,supported=false}={}){
 if(standalone)return 'Installed app';
 if(supported)return 'Install ctrl';
 return ios?'In Safari, choose Share, then Add to Home Screen.':'Use your browser’s Install app option when available.';
}
export function pwaHasUnsavedInput(root=document){return [...root.querySelectorAll('textarea,input[type=text],input:not([type])')].some(input=>input.value?.trim()&&!input.disabled&&!input.readOnly);}
export function bindPwa(){
 const controller=new AbortController(),signal=controller.signal;let prompt=null,registration=null,reloadRequested=false,disposed=false,lastCheck=0;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const controls=()=>[...document.querySelectorAll('[data-pwa-install]')];
 function update(){if(disposed)return;for(const button of controls()){button.textContent=pwaInstallGuidance({standalone:standalone(),ios,supported:Boolean(prompt)});button.disabled=standalone();}for(const button of document.querySelectorAll('[data-pwa-update]')){button.hidden=!registration?.waiting;button.disabled=pwaHasUnsavedInput();button.title=button.disabled?'Keep your draft safe: finish or close it before updating.':'Load the latest version';}}
 const install=event=>{event.preventDefault();prompt=event;update();};window.addEventListener('beforeinstallprompt',install,{signal});window.addEventListener('appinstalled',()=>{prompt=null;update();},{signal});
 async function click(event){
  if(event.target.closest('[data-pwa-install]')){if(prompt){const ready=prompt;prompt=null;await ready.prompt();await ready.userChoice;update();}else{const hint=document.querySelector('[data-pwa-guidance]');if(hint){hint.hidden=false;hint.textContent=pwaInstallGuidance({standalone:standalone(),ios});}}}
  if(event.target.closest('[data-pwa-update]')&&registration?.waiting&&!pwaHasUnsavedInput()){reloadRequested=true;registration.waiting.postMessage({type:'CTRL_ACTIVATE_UPDATE'});}
 }
 document.addEventListener('click',click,{signal});document.addEventListener('input',update,{signal});
 const check=()=>{if(disposed||document.hidden||Date.now()-lastCheck<60000)return;lastCheck=Date.now();void registration?.update().catch(()=>{});update();};
 window.addEventListener('focus',check,{signal});document.addEventListener('visibilitychange',check,{signal});
 if('serviceWorker' in navigator&&isSecureContext){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadRequested)location.reload();},{signal});
  void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{if(disposed)return;registration=value;value.addEventListener('updatefound',()=>{const worker=value.installing;worker?.addEventListener('statechange',update,{signal});},{signal});update();check();}).catch(()=>{const hint=document.querySelector('[data-pwa-guidance]');if(hint){hint.hidden=false;hint.textContent='Install setup could not load. Your current page remains available.';}});
 }
 update();return()=>{disposed=true;controller.abort();};
}
