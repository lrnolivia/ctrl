// A shared authenticated event connection. Snapshots remain canonical; events invalidate them.
let socket=null,timer=0,heartbeat=0,lastPong=0,attempt=0,closed=true,lastEventAt=0,cursor='',status='connecting';
const subscribers=new Set();
const emit=(kind,detail={})=>{for(const fn of subscribers)fn({kind,status,lastEventAt,...detail});};
export function validateEvent(value){return value&&value.type==='change'&&/^\d{1,20}$/.test(String(value.id))&&Array.isArray(value.topics)&&value.topics.length<=64&&value.topics.every(x=>typeof x==='string'&&x.length<=80);}
function connect(){
 if(closed||document.hidden)return;
 status=attempt?'reconnecting':'connecting';emit('status');
 const url=new URL('/api/events',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';if(cursor)url.searchParams.set('cursor',cursor);
 const current=socket=new WebSocket(url);
 current.onopen=()=>{if(socket!==current)return;attempt=0;lastPong=Date.now();status='connected';emit('status');clearInterval(heartbeat);heartbeat=setInterval(()=>{if(socket!==current)return;if(Date.now()-lastPong>45000){current.close();return;}current.send('ping');},20000);};
 current.onmessage=({data})=>{if(data==='pong'&&socket===current){lastPong=Date.now();lastEventAt=lastPong;emit('heartbeat');return;}if(socket!==current||typeof data!=='string'||data.length>16384)return;let e;try{e=JSON.parse(data);}catch{return;}
  if(e.type==='resync'){cursor=/^\d{1,20}$/.test(String(e.cursor))?String(e.cursor):'';lastEventAt=Date.now();emit('resync');return;}
  if(!validateEvent(e))return;if(cursor&&BigInt(e.id)<=BigInt(cursor))return;
  const gap=cursor&&BigInt(e.id)>BigInt(cursor)+1n;cursor=String(e.id);lastEventAt=Date.now();emit(gap?'resync':'change',{event:e});
 };
 current.onclose=()=>{if(socket!==current)return;socket=null;clearInterval(heartbeat);if(closed)return;status=navigator.onLine?'reconnecting':'offline';emit('status');const delay=Math.min(30000,1000*2**Math.min(attempt++,5));timer=setTimeout(connect,delay+Math.random()*300);};
 current.onerror=()=>current.close();
}
function onVisible(){if(document.hidden){clearTimeout(timer);clearInterval(heartbeat);const s=socket;socket=null;s?.close();status='paused';emit('status');}else{attempt=0;connect();emit('resync');}}
function onOnline(){clearTimeout(timer);if(!socket){attempt=0;connect();}}
export function subscribeRelayStream(fn){subscribers.add(fn);fn({kind:'status',status,lastEventAt});if(closed){closed=false;document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onOnline);connect();}
 return()=>{subscribers.delete(fn);if(subscribers.size)return;closed=true;clearTimeout(timer);clearInterval(heartbeat);const s=socket;socket=null;s?.close();document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onOnline);};}
