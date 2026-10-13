/* Network-only install/update worker. Never stores protected pages, API data,
 * credentials, captures, messages, or a second application-shell cache.
 */
self.addEventListener('install',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='CTRL_ACTIVATE_UPDATE')void self.skipWaiting();});
// No fetch handler: every request retains the server's normal access/cache rules.
