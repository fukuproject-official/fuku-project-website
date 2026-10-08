/** Serializes saves; edits made during a request remain dirty until saved. */
export function createAutosave({read,write,onState=()=>{},canSave=()=>true,delay=1200}){
 let generation=0,saved=0,timer=null,running=null,blocked=false,lastError=null;
 function state(name,error){onState(name,{dirty:generation!==saved,error});}
 function schedule(){clearTimeout(timer);if(!blocked)timer=setTimeout(()=>flush().catch(()=>{}),delay);}
 function change(){generation++;if(blocked){state('error',lastError);return;}state('dirty');schedule();}
 async function flush(){
  clearTimeout(timer);
  if(blocked)throw new Error('保存を再試行するか、変更を書き出してから再ログインしてください。');
  if(running){await running;return flush();}
  if(generation===saved)return;
  if(!canSave()){schedule();return;}
  running=(async()=>{
   while(generation!==saved){
    if(!canSave()){schedule();break;}
    const version=generation,snapshot=structuredClone(read());state('saving');
    try{await write(snapshot);saved=version;state(generation===saved?'saved':'dirty');}
    catch(error){blocked=true;lastError=error;state('error',error);throw error;}
   }
  })();
  try{await running;}finally{running=null;}
 }
 async function retry(){blocked=false;return flush();}
 function cancel(){clearTimeout(timer);blocked=true;}
 return {change,flush,retry,cancel,get dirty(){return generation!==saved;}};
}
