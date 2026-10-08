import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave} from '../admin/autosave.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
test('edits during saving are serialized and latest content is retained',async()=>{
 let doc={title:'first'},release;const writes=[];
 const a=createAutosave({delay:100000,read:()=>doc,write:async d=>{writes.push(d);if(writes.length===1)await new Promise(r=>release=r);}});
 a.change();const p=a.flush();await tick();doc.title='second';a.change();assert.equal(writes[0].title,'first');release();await p;
 assert.deepEqual(writes.map(d=>d.title),['first','second']);assert.equal(a.dirty,false);a.cancel();
});
test('a failed or conflicting save remains dirty and cannot publish silently',async()=>{
 let fail=true,count=0;
 const a=createAutosave({delay:100000,read:()=>({title:'local'}),write:async()=>{count++;if(fail)throw new Error('conflict');}});
 a.change();await assert.rejects(a.flush(),/conflict/);assert.equal(a.dirty,true);await assert.rejects(a.flush());assert.equal(count,1);
 fail=false;await a.retry();assert.equal(a.dirty,false);a.cancel();
});
test('uploads defer saving until all media mutations complete',async()=>{
 let uploading=true,count=0;
 const a=createAutosave({delay:100000,canSave:()=>!uploading,read:()=>({photos:['a']}),write:async()=>count++});
 a.change();await a.flush();assert.equal(count,0);assert.equal(a.dirty,true);uploading=false;await a.flush();assert.equal(count,1);a.cancel();
});
test('multiple flush calls never send concurrent writes',async()=>{
 let active=0,max=0;const a=createAutosave({delay:100000,read:()=>({}),write:async()=>{active++;max=Math.max(max,active);await tick();active--;}});
 a.change();await Promise.all([a.flush(),a.flush(),a.flush()]);assert.equal(max,1);assert.equal(a.dirty,false);a.cancel();
});
test('editing after a failed save retains the error until an explicit retry',async()=>{
 const states=[];let count=0;const a=createAutosave({delay:100000,read:()=>({}),onState:s=>states.push(s),write:async()=>{count++;throw new Error('offline');}});
 a.change();await assert.rejects(a.flush());a.change();assert.equal(states.at(-1),'error');assert.equal(count,1);assert.equal(a.dirty,true);a.cancel();
});
