export const featureIcons:Readonly<Record<string,Readonly<{id:string;src:string;compact:string|null}>>>;
export const featureLabels:Readonly<Record<string,string>>;
export function canonicalFeature(value:string):string|null;
export function featureIcon(value:string,options?:{compact?:boolean}):string|null;
export function featureIconMarkup(value:string,options?:{compact?:boolean}):string;
