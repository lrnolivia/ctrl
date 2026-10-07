export async function requestWorkReview(action,items){
 const url='/api/work-review',method='POST';
 const response=await fetch(url,{method,headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({action,items}),signal:AbortSignal.timeout(45000)});
 const text=await response.text();let result;
 try{result=text?JSON.parse(text):{};}catch{result={error:'Unexpected review response.'};}
 if(!response.ok){
  const detail=typeof result.error==='string'?result.error:result.error?.message||'';
  const limited=response.status===429||response.status===403&&/rate limit exceeded/i.test(detail);
  const message=limited?'Review service is temporarily rate-limited. Try again later.':response.status===401||response.status===403?'Review access could not be verified. Refresh your session before trying again.':'Review state could not load ('+response.status+'). Refresh before trying again.';
  throw Object.assign(new Error(message),{status:response.status,url,method,result,responseBody:text});
 }
 return result;
}
