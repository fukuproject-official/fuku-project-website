import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { visibleMembers, safeUrl, imageUrl, youtubeEmbed, contactMailto, offerMailto } from '../src/content.js';
const content = JSON.parse(await readFile(new URL('../data/site.json', import.meta.url)));
test('unique members, complete editable profiles, and all image assets exist', async () => {
 assert.equal(new Set(content.members.map(m=>m.id)).size, content.members.length);
 for (const member of content.members) { assert.ok(member.name && member.part && member.bio); assert.ok(Array.isArray(member.upcomingActivities)); }
 const paths = [...content.members.map(m=>m.image), ...content.gallery.map(g=>g.image), ...content.activity.map(a=>a.image),content.about.image,content.mind.image,content.youtube.poster];
 for(const path of paths) await access(new URL('../'+path, import.meta.url));
});
test('editable external destinations cannot execute scripts or insecure URLs', () => {
 for(const value of ['javascript:alert(1)','data:text/html,test','http://example.com','//example.com',null,'']) assert.equal(safeUrl(value),null);
 assert.equal(safeUrl('https://example.com/ticket'),'https://example.com/ticket');
 assert.ok(!imageUrl('assets/../../private').includes('/private'));
});
test('YouTube only embeds a valid video ID on privacy-enhanced domain',()=>{
 assert.equal(youtubeEmbed(null),null);assert.equal(youtubeEmbed('<script>'),null);
 assert.equal(youtubeEmbed('abcdefghijk'),'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0');
});
test('contact email cannot inject extra recipients or headers',()=>{
 assert.equal(contactMailto('hello@example.com?bcc=other@example.com','test'),null);
 assert.equal(contactMailto(null,'test'),null);
 const result=contactMailto('hello@example.com','出演・イベント');
 assert.ok(result.startsWith('mailto:hello@example.com?subject=')); assert.ok(result.includes(encodeURIComponent('出演・イベント')));
});
test('configured destinations are valid, missing destinations use explicit nulls',()=>{
 for(const url of [content.ticket.url,content.contact.formUrl,...Object.values(content.socials)]) assert.ok(url===null||safeUrl(url));
 assert.ok(content.youtube.videoId===null||youtubeEmbed(content.youtube.videoId));
 assert.ok(content.contact.email===null||contactMailto(content.contact.email,''));
});

test('members support addition, removal, hiding and reordering without mutating content', () => {
 const members = [{id:'a',sortOrder:20},{id:'b',published:false,sortOrder:10},{id:'c',sortOrder:5}];
 assert.deepEqual(visibleMembers(members).map(m=>m.id), ['c','a']);
 assert.equal(members.length,3);
 assert.deepEqual(visibleMembers([]), []);
 assert.equal(visibleMembers([...members,{id:'d',sortOrder:30}]).length,3);
 assert.equal(visibleMembers(members.filter(m=>m.id!=='a')).length,1);
});

test('offer form composes all fields without interpreting user text as mail headers', () => {
 const fields = {name:'山田 & bcc=other@example.com',organization:'福',email:'sender@example.com',category:'出演',date:'2027-01-01',message:'こんにちは\n会場について'};
 assert.equal(offerMailto(null, fields), null);
 const mail = new URL(offerMailto('office@example.com', fields));
 assert.equal(mail.pathname, 'office@example.com');
 assert.equal(mail.searchParams.get('bcc'), null);
 const body = mail.searchParams.get('body');
 for (const value of Object.values(fields)) assert.ok(body.includes(value));
});
