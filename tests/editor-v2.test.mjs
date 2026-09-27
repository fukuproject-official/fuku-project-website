import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeContent,validateContent} from '../src/cms.js';
const original=JSON.parse(await readFile(new URL('../data/site.json',import.meta.url)));
test('legacy content keeps edited text while adding albums and media fields',()=>{
 const c=structuredClone(original);c.about.body='保存済みの文章';c.members[0].socials.instagram='https://instagram.com/example';normalizeContent(c);
 assert.equal(c.about.body,'保存済みの文章');assert.equal(c.copy['text-20'].values[0],'SOUND & CONNECTION');assert.equal(c.copy['text-86'].values[1].trim(),'プロフィール。');assert.equal(c.socials.x,undefined);assert.equal(c.members[0].socials.instagram,'https://instagram.com/example');assert.deepEqual(c.albums,[]);assert.equal(validateContent(c),c);
});
test('album structure and video destinations are validated before saving',()=>{
 const c=normalizeContent(structuredClone(original));c.albums=[{title:'LIVE',photos:[]}];assert.doesNotThrow(()=>validateContent(c));c.albums[0].photos=null;assert.throws(()=>validateContent(c));c.albums=[];c.site.heroVideo='javascript:alert(1)';assert.throws(()=>validateContent(c));
});
test('every editor text field has a surviving public destination and removed sections stay absent',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const fields=JSON.parse(await readFile(new URL('../data/editor-fields.json',import.meta.url)));
 for(const items of Object.values(fields))for(const item of items){assert.ok(html.includes(`data-copy-id="${item.id}"`),item.id);assert.ok(item.defaults.length>0,item.id);}
 assert.ok(!html.includes('id="activity"'));assert.ok(!/0[1-8] \/ /.test(html));assert.ok(html.includes('class="is-loading"'));
});
