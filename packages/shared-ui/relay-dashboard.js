// Share the existing dashboard owner with the compact connection panel.
// No second fetch, persisted cache or invented activity feed.
let snapshot=null;
const listeners=new Set();
export function publishRelayDashboard(next){snapshot=next;for(const listener of listeners)listener(next);}
export function subscribeRelayDashboard(listener){listeners.add(listener);listener(snapshot);return()=>listeners.delete(listener);}
