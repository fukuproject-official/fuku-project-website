import test from 'node:test';
import assert from 'node:assert/strict';
import {isPastPerformance} from '../src/events.js';
import {normalizeContent,validateContent} from '../src/cms.js';
import {readFile} from 'node:fs/promises';
test('archive switches after the event day in Japan, never on the day',()=>{
 const event={date:'2026-10-12'};
 assert.equal(isPastPerformance(event,new Date('2026-10-12T14:59:59Z')),false);
 assert.equal(isPastPerformance(event,new Date('2026-10-12T15:00:00Z')),true);
 assert.equal(isPastPerformance({date:'2026.10.12 月'},new Date('2026-10-13T00:00:00Z')),true);
 for(const date of ['', '日付未定','2026-02-30'])assert.equal(isPastPerformance({date},new Date('2026-10-13T00:00:00Z')),false);
 assert.equal(isPastPerformance({date:'',archived:true}),true);
});
test('legacy LIVE data gains optional fields without changing existing text',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/site.json',import.meta.url)));const before=c.nextLive.title;
 normalizeContent(c);assert.equal(c.nextLive.title,before);assert.deepEqual(c.nextLive.performances,[]);assert.equal(c.nextLive.titleMobile,'');validateContent(c);
 c.nextLive.performances.push({id:'test',title:'改行\nタイトル',date:'2026-12-19',url:'javascript:alert(1)'});assert.throws(()=>validateContent(c));
});
