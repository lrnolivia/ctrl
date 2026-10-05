export function previewTone(r,g,b){return (0.2126*r+0.7152*g+0.0722*b)>145?'light':'dark';}
export function preparePreviewImage(surface,image){
 if(!surface||!image)return;
 const settle=()=>{if(!image.naturalWidth)return;surface.dataset.imageState='ready';
  if(surface.dataset.previewTone)return;
  try{const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
   const size=Math.max(1,Math.min(image.naturalWidth,image.naturalHeight)*.15);
   ctx.drawImage(image,Math.max(0,image.naturalWidth-size),0,size,size,0,0,16,16);
   const {data}=ctx.getImageData(0,0,16,16);let r=0,g=0,b=0;for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];}
   surface.dataset.previewTone=previewTone(r/256,g/256,b/256);
  }catch{surface.dataset.previewTone='dark';}
 };
 if(image.complete&&image.naturalWidth)settle();else if(!image.dataset.previewBound){image.dataset.previewBound='true';image.addEventListener('load',settle,{once:true});image.addEventListener('error',()=>{surface.dataset.imageState='error';},{once:true});}
}
