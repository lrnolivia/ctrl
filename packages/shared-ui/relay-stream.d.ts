export function subscribeRelayStream(callback:(event:{kind:string;status:string;lastEventAt:number;event?:{id:string;topics:string[]}})=>void):()=>void;
