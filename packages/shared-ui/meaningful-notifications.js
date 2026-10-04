import {assignmentPresentation} from './presentation-copy.js';
export function meaningfulWorkChanges(previous,next){
 if(!previous||!next||next.loadingProgress?.length)return [];
 const changes=[];
 for(const [project,record] of Object.entries(next.coordination||{})){
  if(next.failedProgress?.includes(project)||!previous.coordination?.[project])continue;
  const before=new Map((previous.coordination[project].claims||[]).map(c=>[c.id,c]));
  for(const claim of record.claims||[]){
   const prior=before.get(claim.id);if(!prior||prior.state===claim.state||['superseded','cancelled','retired'].includes(claim.state))continue;
   const copy=assignmentPresentation(claim);
   if(claim.state==='completed')changes.push({id:`work-complete:${project}:${claim.id}`,project,assignment:claim.id,title:'work completed',message:copy.title,severity:'info'});
   else if(claim.state==='held')changes.push({id:`work-held:${project}:${claim.id}`,project,assignment:claim.id,title:'work paused',message:copy.detail,severity:'info'});
  }
  const old=new Map((previous.progress?.[project]?.progress||[]).map(p=>[p.assignment,p]));
  for(const item of next.progress?.[project]?.progress||[]){
   const prior=old.get(item.assignment);if(!prior||prior.state===item.state)continue;
   const copy=assignmentPresentation(item);
   if(item.attention_request?.status==='pending'&&['review','decision'].includes(item.attention_request.kind))changes.push({id:`work-review:${project}:${item.assignment}`,project,assignment:item.assignment,title:item.attention_request.kind==='review'?'ready for your review':'your decision is needed',message:copy.detail,severity:'warning'});
   else if(['failed','blocked'].includes(item.state))changes.push({id:`work-blocked:${project}:${item.assignment}`,project,assignment:item.assignment,title:'work needs a fix',message:copy.detail,severity:'warning'});
  }
 }
 return changes;
}
