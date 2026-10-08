import {createAutosave} from './autosave.js';
import {sectionOrder, DRAFT_KEY, normalizeContent, validateContent, youtubeId, getConfig, client} from '/src/cms.js';
import {imageUrl, safeUrl} from '/src/content.js';
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let fieldGroups={}, content, config, api, token=null, dirty=false, revision=null, current='dashboard', pending=0;
const sections={goods:'GOODS',faq:'Q&A',reception:'受付',design:'デザイン',staff:'スタッフ',site:'TOP・ヘッダー・フッター',nextLive:'NEXT LIVE',about:'ABOUT',mind:'OUR MIND',members:'MEMBERS・メンバー',albums:'GALLERY・LIVEアルバム',youtube:'YouTube',socials:'FOLLOW US・SNS',contact:'お問い合わせ',ticket:'チケット'};
const labels={"memberKicker":"MEMBER","profileHeading":"PROFILE","upcomingHeading":"UPCOMING / 今後の活動","upcomingEmpty":"今後の活動は、決まり次第お知らせします。","memberSocialHeading":"FOLLOW / SNS","memberSocialEmpty":"SNSリンクは公開準備中です。","profileButton":"VIEW PROFILE","membersEmpty":"メンバー情報は準備中です。","galleryPlaceholder":"実際の活動写真は近日公開予定です。","ticketPreparing":"チケット販売ページは現在準備中です。 / 公開まで、もうしばらくお待ちください。","videoPreparing":"ライブ映像は近日公開予定です。","playButton":"PLAY FILM","externalFormReady":"専用のお問い合わせフォームで受け付けています。","composeEmail":"メールを作成する","emailHelp":"入力内容を入れたメールアプリが開きます。内容を確認して送信してください。","contactReady":"出演・企画・協賛など、お気軽にご相談ください。","contactPreparing":"お問い合わせの受付は準備中です。",name:'名前',englishName:'英語名',description:'説明文',heroCopy:'TOPのメッセージ（1行ずつ）',heroLabel:'TOPの補足文',draftCopy:'写真・プロフィール準備中の表示',heroImage:'TOP写真',heroImageAlt:'TOP写真の説明',heroVideo:'TOP動画URL（MP4・WebM／空欄なら写真）',photos:'アルバムの写真',title:'タイトル',lead:'写真内の見出し',body:'本文',image:'写真',imageAlt:'写真の説明',message:'メッセージ',part:'担当・肩書き',bio:'プロフィール',instagram:'Instagram URL',x:'X URL',youtube:'YouTube URL',website:'Webサイト URL',placeholder:'準備中の写真・情報',published:'公開サイトに表示する',upcomingActivities:'今後の活動',socials:'SNS',category:'分類名',status:'補足・公開状況',alt:'写真の説明',caption:'写真の見出し',videoId:'YouTube動画URL',poster:'動画のカバー写真',date:'日付',venue:'会場',email:'お問い合わせ先メール',formUrl:'外部フォームURL（設定するとメールフォームの代わりに表示）',categories:'ご相談の種類（1行ずつ）',url:'リンク先URL',heroPosition:'TOP写真の表示位置',imagePosition:'写真の表示位置'};
function externalLink(label,url){const a=node('a',label,'external-action');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function livePocketLinks(parent){const actions=node('div',undefined,'actions');actions.append(externalLink('LivePocketの管理画面を開く ↗','https://promoter.livepocket.jp/login/'));const url=safeUrl(content.ticket.url);if(url)actions.append(externalLink('お客様向けチケットページを見る ↗',url));parent.append(actions);}
function notify(t){$('#status').textContent=t;}
const saver=createAutosave({read:()=>content,canSave:()=>pending===0,write:async document=>{
 validateContent(document);
 if(config.url)revision=await api('/rest/v1/rpc/fuku_website_save',{method:'POST',body:JSON.stringify({document,expected_revision:revision})});
 else localStorage.setItem(DRAFT_KEY,JSON.stringify(document));
},onState:(state,info)=>{dirty=info.dirty;$('#state').textContent=({dirty:'変更あり・まもなく保存',saving:'保存中…',saved:config?.url?'保存しました ✓（下書き）':'このブラウザに保存しました ✓',error:'保存できませんでした・変更は画面に残っています'})[state];$('#save').textContent=state==='error'?'保存を再試行':'下書き保存';if(info.error)notify(info.error.message);}});
let previewTimer;
function changed(){saver.change();clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,200);}
function updatePreview(){
 const box=$('#preview-content');box.replaceChildren();if(!content)return;
 const key=['dashboard','order'].includes(current)?'site':current,obj=content[key];
 box.append(node('p','簡易プレビュー・公開サイトはまだ変わりません','hint'));
 const data=Array.isArray(obj)?obj.filter(x=>x.published!==false):[obj];
 for(const item of data||[]){if(!item)continue;const image=item.heroImage||item.image||item.photos?.[0]?.image||item.poster;if(image){const img=node('img');img.src=imageUrl(image);img.alt=item.imageAlt||'';img.style.objectPosition=item.heroPosition||item.imagePosition||'50% 50%';box.append(img);}for(const name of ['heroCopy','name','title','part','date','venue','lead','body','bio','description'])if(item[name])box.append(node(['name','title','heroCopy'].includes(name)?'h3':'p',Array.isArray(item[name])?item[name].join('\n'):item[name]));}
}
function openSection(key){current=key;render();$('#tabs').classList.remove('mobile-open');$('#menu-toggle').setAttribute('aria-expanded','false');}

function button(text,fn){const b=node('button',text);b.type='button';b.onclick=fn;return b;}
function field(parent,obj,key,label=labels[key]||key){
 if(key==='categories'){categoryEditor(parent,obj);return;}
 const v=obj[key]; if(['x','upcomingActivities','placeholder'].includes(key))return; if(key==='id'||key==='sortOrder'||key==='schemaVersion')return;
 if(['image','heroImage','poster'].includes(key)){photo(parent,obj,key,label);return;}
 if(Array.isArray(v)&&!['heroCopy','categories'].includes(key)){parent.append(node('h3',label));collection(parent,obj,key);return;}
 if(v&&typeof v==='object'&&!Array.isArray(v)){const d=node('details');d.append(node('summary',label));Object.keys(v).forEach(k=>field(d,v,k));parent.append(d);return;}
 const wrap=node('label',label);wrap.dataset.field=key;let input;
 if(typeof v==='boolean'){input=node('input');input.type='checkbox';input.checked=v;input.onchange=()=>{obj[key]=input.checked;changed();};wrap.prepend(input);}
 else {input=node(['body','bio','message','lead','description','heroCopy','categories'].includes(key)||String(v||'').includes('\n')?'textarea':'input'); input.value=Array.isArray(v)?v.join('\n'):v??''; if(input.tagName==='TEXTAREA')input.rows=4; input.oninput=()=>{obj[key]=Array.isArray(v)?input.value.split('\n').filter(Boolean):input.value;changed();};
 if(key==='videoId'){input.value=v?`https://www.youtube.com/watch?v=${v}`:'';input.oninput=()=>{const id=youtubeId(input.value.trim());input.setCustomValidity(input.value&&!id?'YouTubeの動画URLを確認してください。':'');obj[key]=id||input.value||null;changed();};input.onchange=()=>{if(input.reportValidity())render();};}
 wrap.append(input);}
 parent.append(wrap);
}
function categoryEditor(parent,obj){
 const section=node('section');section.append(node('h3','ご相談の種類'),node('p','お客様がお問い合わせ時に選ぶ項目です。追加・削除・順番変更は「公開する」で反映されます。','hint'));
 obj.categories.forEach((value,i)=>{
  const row=node('div',undefined,'category-row');const label=node('label',`種類 ${i+1}`),input=node('input');input.value=value;input.oninput=()=>{obj.categories[i]=input.value;changed();};label.append(input);row.append(label);
  for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,()=>{[obj.categories[i],obj.categories[i+delta]]=[obj.categories[i+delta],obj.categories[i]];changed();render();});b.setAttribute('aria-label',`種類 ${i+1}を${delta<0?'上':'下'}へ`);b.disabled=i+delta<0||i+delta>=obj.categories.length;row.append(b);}
  row.append(button('削除',()=>{obj.categories.splice(i,1);changed();render();}));section.append(row);
 });section.append(button('＋ ご相談の種類を追加',()=>{obj.categories.push('新しいご相談');changed();render();}));parent.append(section);
}
async function upload(file){
 if(!config.url)throw new Error('写真アップロードはSupabase接続後に使えます。現在は画像URLでプレビューできます。');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024)throw new Error('写真はJPEG・PNG・WebP、30MB以内で選んでください。');
 pending++;$('#publish').disabled=true;
 try{
 // Re-encode photos to remove metadata and keep display assets small.
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('写真を読み込めませんでした。別の写真か、JPEG・PNG・WebP形式で選び直してください。');});const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.87));if(!blob)throw new Error('写真を読み込めませんでした。');
 const path=`photos/${crypto.randomUUID()}.webp`;
 await api(`/storage/v1/object/fuku-website-images/${path}`,{method:'POST',body:blob,headers:{'Content-Type':'image/webp','x-upsert':'false'}});
 return `${config.url}/storage/v1/object/public/fuku-website-images/${path}`;
 }finally{pending--;$('#publish').disabled=!config.url||pending>0;}
}
function photo(parent,obj,key,label){
 const section=node('div',undefined,'photo-editor');section.dataset.field=key;section.append(node('h3',label));const img=node('img',undefined,'image-preview');img.hidden=!obj[key];if(obj[key])img.src=imageUrl(obj[key]);img.alt='選択中の写真';const posKey=key==='heroImage'?'heroPosition':'imagePosition';img.style.objectPosition=obj[posKey]||'50% 50%';section.append(img);
 let origin=null,moved=false;
 img.onpointerdown=e=>{if(!obj[key]||current==='nextLive')return;origin={x:e.clientX,y:e.clientY,position:(obj[posKey]||'50% 50%').split(' ').map(parseFloat)};moved=false;img.setPointerCapture(e.pointerId);};
 img.onpointermove=e=>{if(!origin)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y;if(Math.abs(dx)+Math.abs(dy)<5)return;moved=true;const rect=img.getBoundingClientRect();const clamp=n=>Math.round(Math.max(0,Math.min(100,n)));obj[posKey]=`${clamp(origin.position[0]+dx/rect.width*100)}% ${clamp(origin.position[1]+dy/rect.height*100)}%`;img.style.objectPosition=obj[posKey];};
 img.onpointerup=()=>{if(origin&&moved)changed();origin=null;};img.onpointercancel=()=>{if(origin&&moved)changed();origin=null;};img.ondragstart=e=>e.preventDefault();
 const drop=node('div',undefined,'upload');const l=node('label','写真を選ぶ・ここにドロップ');const input=node('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',label+'を変更');img.onclick=()=>{if(!moved)input.click();moved=false;};img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};l.append(input);drop.append(l,node('p','JPEG・PNG・WebP／30MBまで。長辺2400pxに調整します。アップロードした写真は公開URLになります。','hint'));const accept=async f=>{if(!f)return;try{notify('写真をアップロードしています…');const selected=current==='members'&&key==='image'?await cropPortrait(f):f;if(!selected){notify('写真の変更をキャンセルしました。');return;}obj[key]=await upload(selected);changed();render();notify('写真を追加しました。位置を確認してください。');}catch(e){notify(e.message);}};input.onchange=()=>{const file=input.files[0];input.value='';accept(file);};drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');accept(e.dataTransfer.files[0]);};section.append(drop);
 const advanced=node('details');advanced.append(node('summary','画像URLで指定'));const url=node('label','画像URL');const u=node('input');u.value=obj[key]||'';u.oninput=()=>{obj[key]=u.value;img.hidden=!u.value;if(u.value)img.src=imageUrl(u.value);changed();};url.append(u);advanced.append(url);section.append(advanced);
 const position=node('label','写真の表示位置');const select=node('select');for(const [value,title] of [['50% 50%','中央'],['50% 0%','上'],['50% 100%','下'],['0% 50%','左'],['100% 50%','右']]){const o=node('option',title);o.value=value;select.append(o);}select.value=obj[posKey]||'50% 50%';select.onchange=()=>{obj[posKey]=select.value;img.style.objectPosition=select.value;changed();};position.append(select);if(current!=='nextLive'){section.append(position,node('p','写真をドラッグして位置を調整できます。クリックで写真を変更します。','hint'));}section.append(button('写真を外す',()=>{obj[key]='';changed();render();}));parent.append(section);
}
function albumPhotos(parent,album){
 parent.append(node('p','① 写真をまとめて選ぶ → ② アルバム名を入力 → ③ 下書き保存・プレビュー・公開。先頭の写真が表紙になります。','hint'));
 const picker=node('label','＋ 写真をまとめて追加', 'album-upload');const input=node('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';picker.append(input);parent.append(picker,node('p','何枚でも一緒に選べます。JPEG・PNG・WebP、1枚30MBまで。','hint'));
 const progress=node('p','','album-progress');progress.setAttribute('role','status');parent.append(progress);
 input.onchange=async()=>{
  const files=[...input.files];input.value='';if(!files.length)return;
  pending++;$('#editor').inert=true;$('#tabs').inert=true;$('#save').disabled=true;$('#preview').disabled=true;$('#publish').disabled=true;
  let count=0;const failures=[];
  try{for(const [i,file] of files.entries()){
   progress.textContent=`写真を追加しています… ${i+1} / ${files.length}枚`;notify(progress.textContent);
   try{const url=await upload(file);album.photos.push({id:crypto.randomUUID(),image:url,alt:''});count++;changed();}
   catch(e){failures.push(`${file.name}：${e.message}`);}
  }}finally{
   pending--;$('#editor').inert=false;$('#tabs').inert=false;$('#save').disabled=false;$('#preview').disabled=false;$('#publish').disabled=!config.url||pending>0;render();
   notify(`${count}枚の写真を追加しました。${failures.length?'追加できなかった写真があります。画面の案内をご確認ください。':'下書き保存・プレビューで確認できます。'}`);
   if(failures.length){const notice=node('div',undefined,'upload-errors');notice.setAttribute('role','alert');notice.append(node('h3','追加できなかった写真'));for(const reason of failures)notice.append(node('p',reason));notice.append(node('p','追加済みの写真は残っています。上記の写真だけ選び直してください。'));$('#editor').prepend(notice);}
  }
 };
 const grid=node('div',undefined,'admin-album-grid');
 album.photos.forEach((photo,i)=>{
  const card=node('div',undefined,'admin-album-photo');const img=node('img');if(photo.image)img.src=imageUrl(photo.image);img.alt=photo.alt||`写真 ${i+1}`;card.append(img,node('p',i===0?'表紙':`写真 ${i+1}`));
  const cover=button('表紙にする',()=>{album.photos.splice(i,1);album.photos.unshift(photo);changed();render();});cover.disabled=i===0;card.append(cover);
  for(const [text,delta]of [['←',-1],['→',1]]){const b=button(text,()=>{[album.photos[i],album.photos[i+delta]]=[album.photos[i+delta],album.photos[i]];changed();render();});b.disabled=i+delta<0||i+delta>=album.photos.length;b.setAttribute('aria-label',`写真 ${i+1}を${delta<0?'前':'後'}へ`);card.append(b);}
  const handle=button('⋮⋮ 並べ替え',()=>{});handle.draggable=true;handle.ondragstart=e=>e.dataTransfer.setData('application/x-fuku-photo',String(i));card.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-fuku-photo'))e.preventDefault();};card.ondrop=e=>{if(!e.dataTransfer.types.includes('application/x-fuku-photo'))return;e.preventDefault();e.stopPropagation();const from=Number(e.dataTransfer.getData('application/x-fuku-photo'));if(!Number.isInteger(from)||from<0||from>=album.photos.length)return;album.photos.splice(i,0,album.photos.splice(from,1)[0]);changed();render();};card.append(handle);
  card.append(button('外す',()=>{if(confirm('この写真をアルバムから外しますか？公開するまでは公開サイトに影響しません。')){album.photos.splice(i,1);changed();render();}}));
  const detail=node('details');detail.append(node('summary','写真の説明・表示位置'));field(detail,photo,'alt');const position=node('label','表示位置');const select=node('select');for(const [value,title]of [['50% 50%','中央'],['50% 0%','上'],['50% 100%','下']]){const option=node('option',title);option.value=value;select.append(option);}select.value=photo.imagePosition||'50% 50%';select.onchange=()=>{photo.imagePosition=select.value;changed();};position.append(select);detail.append(position);card.append(detail);grid.append(card);
 });parent.append(grid);
}
const selectedItems={};
function sideCollection(parent,obj,key){
 const arr=obj[key],isMember=key==='members';
 if(!arr.includes(selectedItems[key]))selectedItems[key]=arr[0];
 const shell=node('div',undefined,'collection-workspace'),list=node('nav',undefined,'collection-list'),panel=node('section',undefined,'collection-editor');list.setAttribute('aria-label',isMember?'メンバーを選択':'アルバムを選択');panel.setAttribute('aria-label',isMember?'選択中のメンバーを編集':'選択中のアルバムを編集');
 list.append(node('h3',isMember?'メンバー':'アルバム'));
 arr.forEach((item,i)=>{
  const choose=button('',()=>{selectedItems[key]=item;render();});choose.className='collection-choice';choose.setAttribute('aria-pressed',String(selectedItems[key]===item));const src=item.image||item.photos?.[0]?.image;
  if(src){const img=node('img');img.src=imageUrl(src);img.alt='';choose.append(img);}else choose.append(node('span','写真を追加','no-photo'));
  choose.append(node('strong',item.name||item.title||'名前未入力'));if(!isMember)choose.append(node('small',`${item.photos.length}枚`));else if(item.published===false)choose.append(node('small','非表示'));list.append(choose);
  choose.draggable=true;choose.ondragstart=e=>e.dataTransfer.setData('application/x-fuku-collection',`${key}:${i}`);choose.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-fuku-collection'))e.preventDefault();};choose.ondrop=e=>{const [kind,index]=e.dataTransfer.getData('application/x-fuku-collection').split(':');const from=Number(index);if(kind!==key||!Number.isInteger(from)||from<0||from>=arr.length)return;e.preventDefault();arr.splice(i,0,arr.splice(from,1)[0]);if(isMember)arr.forEach((x,n)=>x.sortOrder=(n+1)*10);changed();render();};
 });
 list.append(button(isMember?'＋ メンバーを追加':'＋ アルバムを作る',()=>{const id=crypto.randomUUID();const item=isMember?{id,name:'新しいメンバー',part:'',image:'',imageAlt:'',bio:'',socials:{instagram:null,youtube:null,website:null},upcomingActivities:[],published:false,placeholder:false,sortOrder:(arr.length+1)*10}:{id,title:'新しいLIVEアルバム',date:'',photos:[]};arr.push(item);selectedItems[key]=item;changed();render();}));
 const item=selectedItems[key];
 if(item){
  panel.append(node('h3',isMember?'プロフィールを編集':'アルバムを編集'));
  const basic=node('div',undefined,isMember?'member-basic':'album-basic');
  if(isMember){field(basic,item,'image');const text=node('div');for(const k of ['name','part','bio','published'])field(text,item,k);basic.append(text);panel.append(basic);const socials=node('div',undefined,'member-social-fields');socials.append(node('h3','SNSリンク（空欄なら表示しません）'));for(const k of Object.keys(item.socials))field(socials,item.socials,k);panel.append(socials);field(panel,item,'imageAlt');}
  else {field(basic,item,'title','アルバム名');field(basic,item,'date','開催日');panel.append(basic);albumPhotos(panel,item);}
  const actions=node('div',undefined,'actions collection-actions');const i=arr.indexOf(item);
  for(const [label,delta]of [['順番を前へ',-1],['順番を後へ',1]]){const b=button(label,()=>{[arr[i],arr[i+delta]]=[arr[i+delta],arr[i]];if(isMember)arr.forEach((x,n)=>x.sortOrder=(n+1)*10);changed();render();});b.disabled=i+delta<0||i+delta>=arr.length;actions.append(b);}
  actions.append(button(isMember?'このメンバーを削除':'このアルバムを削除',()=>{if(confirm('下書きから削除しますか？公開するまでは公開サイトに影響しません。')){arr.splice(i,1);selectedItems[key]=arr[Math.min(i,arr.length-1)];changed();render();}}));panel.append(actions);
 }else panel.append(node('p',isMember?'左の「メンバーを追加」から登録できます。':'左の「アルバムを作る」から写真を追加できます。','empty'));
 shell.append(list,panel);parent.append(shell);
}
function collection(parent,obj,key){
 if(['members','albums'].includes(key)){sideCollection(parent,obj,key);return;}

 if(key==='photos'){albumPhotos(parent,obj);return;}
 const arr=obj[key];parent.append(node('p',key==='members'?'人数に制限はありません。「表示する」を外すと、内容を残したまま非表示にできます。':key==='albums'?'アルバムを作り、写真をまとめて追加してください。写真がないアルバムは、お客様には表示されません。':'項目の追加・並べ替えができます。','hint'));
 arr.forEach((item,i)=>{const card=node('details',undefined,'card');const summary=node('summary',`${i+1}. ${item.name||item.title||item.caption||'新しい項目'}${item.published===false?'（非表示）':''}`);card.dataset.itemId=item.id||String(i);card.ontoggle=()=>{if(card.open)for(const other of parent.querySelectorAll(':scope > details[data-item-id]'))if(other!==card)other.open=false;};if(['members','albums'].includes(key)){card.classList.add('item-card');const src=item.image||item.photos?.[0]?.image;if(src){const thumb=node('img',undefined,'card-cover');thumb.src=imageUrl(src);thumb.alt='';summary.prepend(thumb);}}card.append(summary);
 if(key==='members'){
  const handle=button('⋮⋮ 並べ替え',e=>e.preventDefault());handle.draggable=true;handle.className='member-handle';handle.setAttribute('aria-label',item.name+'をつかんで移動');handle.ondragstart=e=>{e.stopPropagation();e.dataTransfer.setData('application/x-fuku-member',String(i));};summary.append(handle);
  card.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-fuku-member'))e.preventDefault();};card.ondrop=e=>{if(!e.dataTransfer.types.includes('application/x-fuku-member'))return;e.preventDefault();const from=Number(e.dataTransfer.getData('application/x-fuku-member'));if(!Number.isInteger(from)||from<0||from>=arr.length)return;arr.splice(i,0,arr.splice(from,1)[0]);arr.forEach((x,n)=>x.sortOrder=(n+1)*10);changed();render();};
 }
 for(const k of Object.keys(item))if(!k.endsWith('Position'))field(card,item,k,key==='albums'&&k==='title'?'アルバム名':undefined);
 const actions=node('div',undefined,'actions');for(const [name,offset] of [['上へ',-1],['下へ',1]]){const b=button(name,()=>{[arr[i],arr[i+offset]]=[arr[i+offset],arr[i]];arr.forEach((x,n)=>{if(key==='members')x.sortOrder=(n+1)*10;});changed();render();});b.disabled=i+offset<0||i+offset>=arr.length;actions.append(b);}actions.append(button('削除',()=>{if(confirm('この項目を下書きから削除しますか？公開するまでは公開サイトに影響しません。')){arr.splice(i,1);changed();render();}}));card.append(actions);parent.append(card);});
 parent.append(button(key==='albums'?'＋ アルバムを作る':'＋ 追加する',()=>{const id=crypto.randomUUID();let item;
 if(key==='members')item={id,name:'新しいメンバー',part:'',image:'',imageAlt:'',bio:'',socials:{instagram:null,x:null,youtube:null,website:null},upcomingActivities:[],published:false,placeholder:false,sortOrder:(arr.length+1)*10};
 else if(key==='albums')item={id,title:'新しいLIVEアルバム',date:'',photos:[]};
 else if(key==='photos')item={id,image:'',alt:''};
 else if(key==='gallery')item={id,image:'assets/stage.svg',alt:'',caption:'新しい写真',placeholder:false};
 else if(key==='activity')item={id,category:'ACTIVITY',title:'新しい活動',body:'',image:'assets/stage.svg',status:''};
 else item={title:'新しい予定',date:'',description:'',url:null};arr.push(item);changed();render();const last=$('#editor').querySelectorAll('.card');if(last.length){let d=last[last.length-1];while(d){d.open=true;d=d.parentElement.closest('details');}}
 }));
}
function moveSection(key,target){
 if(pending||$('#save').disabled)return;
 const order=sectionOrder(content.sectionOrder),from=order.indexOf(key),to=order.indexOf(target);
 if(from<0||to<0||from===to)return;
 order.splice(from,1);order.splice(to,0,key);content.sectionOrder=order;changed();renderTabs();render();
 notify('表示順を変更しました。プレビューで確認し、「公開する」でHPに反映できます。');
}
function renderTabs(){
 const tabs=$('#tabs');tabs.replaceChildren();
 const items=[['dashboard','⌂ ダッシュボード'],['site','▧ TOP'],['nextLive','▣ LIVE'],['albums','▦ PHOTO・写真'],['members','♙ MEMBER'],['goods','◇ GOODS'],['faq','? Q&A'],['ticket','▤ チケット'],['reception','▥ 受付・LivePocket'],['contact','✉ メール・お問い合わせ'],['design','◐ デザイン'],['socials','⚙ サイト設定・SNS'],['staff','♧ スタッフ']];
 for(const [key,title]of items){const tab=button(title,()=>openSection(key));tab.dataset.section=key;tabs.append(tab);}
 tabs.append(node('p','販売・受付はLivePocketを利用します。GOODS・Q&A・デザイン・メール受信・スタッフ設定は開発予定です。','hint'));
}
function orderEditor(target){
 target.append(node('p','つかんで移動するか、上下ボタンで順番を変えられます。TOPは先頭です。','hint'));
 const order=sectionOrder(content.sectionOrder);
 for(const [i,key]of order.entries()){
  const row=node('div',undefined,'section-tab-row');const handle=button('⋮⋮',()=>{});handle.draggable=true;handle.setAttribute('aria-label',sections[key]+'を移動');handle.ondragstart=e=>{e.dataTransfer.setData('text/plain',key);};row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();moveSection(e.dataTransfer.getData('text/plain'),key);};row.append(handle,node('span',sections[key]));
  for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,()=>moveSection(key,order[i+delta]));b.disabled=!order[i+delta];b.setAttribute('aria-label',sections[key]+(delta<0?'を上へ':'を下へ'));row.append(b);}target.append(row);
 }
}
function render(){
 const opened=[...$('#editor').querySelectorAll('details[open][data-item-id]')].map(d=>d.dataset.itemId);
 $('#editor').replaceChildren(node('h2',current==='dashboard'?'ダッシュボード':current==='order'?'サイトの表示順':sections[current]));$('#tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.section===current?'page':'false'));
 const target=$('#editor');target.dataset.section=current;updatePreview();
 if(current==='dashboard'){
  target.append(node('p','写真や文章は自動で下書き保存されます。公開するまではお客様には見えません。','hint'));
  const quick=node('div',undefined,'quick-grid');for(const [key,title]of [['nextLive','LIVEを更新'],['albums','写真を追加'],['members','メンバーを編集'],['site','TOPを編集']])quick.append(button(title,()=>openSection(key)));target.append(quick);
  target.append(node('h3','登録されている情報'),node('p',`メンバー ${content.members.length}人 ／ アルバム ${content.albums.length}件`));target.append(node('p','売上・購入者・受付状況はLivePocketで確認できます。HPへの自動同期は行いません。','notice'));livePocketLinks(target);return;
 }
 if(['site','about','mind','youtube','order'].includes(current)){
  const sub=node('nav',undefined,'subtabs');sub.setAttribute('aria-label','TOPの編集エリア');for(const [key,title]of [['site','メイン写真・文章'],['about','ABOUT'],['mind','OUR MIND'],['youtube','YouTube'],['order','並び順']]){const b=button(title,()=>openSection(key));b.setAttribute('aria-current',current===key?'page':'false');sub.append(b);}target.insertBefore(sub,target.children[1]);
  $('#tabs').querySelector('[data-section="site"]').setAttribute('aria-current','page');
 }
 if(current==='order'){orderEditor(target);return;}
 if(current==='reception'){target.append(node('p','QR受付はLivePocketを利用します。','notice'),node('p','チケットの確認・入場受付はLivePocket側で行います。このHPでは受付記録や購入者情報を保存しません。'));livePocketLinks(target);target.append(externalLink('LivePocketの機能・使い方を見る ↗','https://livepocket.jp/owner/function/index.html'));return;}
 if(['goods','faq','design','staff'].includes(current)){
  target.append(node('p','未接続・開発予定','notice'),node('p',({goods:'写真・紹介文・ショップへのリンクを編集する画面を追加予定です。',faq:'質問と回答をカードで追加・並べ替えできる画面を追加予定です。',reception:'既存QR受付との接続前です。受付担当者に不要な個人情報が見えないことを検証してから利用できるようにします。',design:'現在の公開サイトのデザインを維持しています。色やフォントの変更機能は追加予定です。',staff:'既存の管理者権限を維持しています。アカウント追加・権限変更は、この画面からはまだ行えません。'})[current]));return;
 }
 if(current==='contact')target.append(node('p','ここではお問い合わせの表示・ご相談の種類を編集できます。メール受信箱・返信機能は未接続です。','notice'));
 if(current==='ticket'){target.append(node('p','販売・購入者管理・発券はLivePocketで行います。ここではHPのTICKETボタンの行き先を設定します。','notice'));livePocketLinks(target);target.append(node('p','LIVEごとの販売ページURLにも変更できます。変更は下書き保存後、「公開する」で反映されます。','hint'));}
 if(current==='nextLive'){target.append(node('p','ここではHPに掲載するLIVE情報を編集します。価格・販売期間・購入者管理はLivePocketで設定してください。','hint'));livePocketLinks(target);}
 const obj=content[current];
 if(Array.isArray(obj))collection(target,content,current);
 else for(const k of Object.keys(obj))if(!k.endsWith('Position'))field(target,obj,k, current==='ticket'&&k==='url'?'TICKETボタンのリンク先':k==='title'&&['about','mind'].includes(current)?'見出し2（日本語）':labels[k]||k);
 const group=current==='albums'?'gallery':current;
 const fields=fieldGroups[group]||[];
 const extras=node('details',undefined,'extra-fields');extras.append(node('summary','見出し・ボタン・案内文を編集'));target.append(extras);
 if(fields.length){content.copy ||= {};for(const entry of fields){content.copy[entry.id] ||= {label:entry.label,values:Object.fromEntries(entry.defaults.map((v,i)=>[i,v]))};const item=content.copy[entry.id];for(const k of entry.defaults.map((_,i)=>String(i))){item.values[k] ??= entry.defaults[Number(k)];}for(const k of entry.defaults.map((_,i)=>String(i)))field(extras,item.values,k,entry.label+(Object.keys(item.values).length>1?`（${Number(k)+1}行目）`:''));}}
 const uiGroups={members:['memberKicker','profileHeading','profileButton','membersEmpty'],albums:['galleryPlaceholder'],youtube:['videoPreparing','playButton'],ticket:['ticketPreparing'],contact:['externalFormReady','composeEmail','emailHelp','contactReady','contactPreparing']};
 for(const key of uiGroups[current]||[])field(extras,content.ui,key,({memberKicker:'プロフィール上部のラベル',profileHeading:'プロフィール見出し',profileButton:'写真に重ねるボタン',membersEmpty:'メンバー未登録時の案内',galleryPlaceholder:'アルバム未登録時の案内',videoPreparing:'動画未登録時の案内',playButton:'動画再生ボタン',ticketPreparing:'販売準備中の案内',externalFormReady:'外部フォームの案内',composeEmail:'メール作成ボタン',emailHelp:'メール送信の説明',contactReady:'受付中の案内',contactPreparing:'受付準備中の案内'})[key]);
 for(const d of target.querySelectorAll('details[data-item-id]'))if(opened.includes(d.dataset.itemId))d.open=true;
 if(current==='site'){
  const primary=node('div',undefined,'primary-fields');const media=target.querySelector('[data-field="heroImage"]');
  for(const key of ['name','heroCopy','description']){const field=target.querySelector(`[data-field="${key}"]`);if(field)primary.append(field);}
  const more=node('details',undefined,'extra-fields');more.append(node('summary','動画・補足文・準備中の表示'));
  for(const field of [...target.querySelectorAll(':scope > [data-field]')])if(field!==media)more.append(field);
  if(media)target.insertBefore(media,target.children[2]);target.insertBefore(primary,media?.nextSibling||target.children[1]);target.append(more);
 }
 if(current==='youtube'&&youtubeId(content.youtube.videoId)){const frame=node('iframe',undefined,'video-preview');frame.title='YouTubeプレビュー';frame.src=`https://www.youtube-nocookie.com/embed/${youtubeId(content.youtube.videoId)}`;target.append(frame);}
}
async function start(){
 const initial=await fetch('/data/site.json').then(r=>r.json());
 if(config.url){const rows=await api('/rest/v1/fuku_website_drafts?id=eq.main&select=content,updated_at');if(rows.length){content=rows[0].content;revision=rows[0].updated_at;}else content=initial;}
 else {try{content=JSON.parse(localStorage.getItem(DRAFT_KEY))||initial;}catch{content=initial;}}
 normalizeContent(content);content.ui ||= initial.ui;content.albums ||= [];content.site.heroVideo ||= '';content.nextLive.image ||= '';content.nextLive.imageAlt ||= '';fieldGroups=await fetch('/data/editor-fields.json').then(r=>r.json()); validateContent(content);$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=!config.url;$('#publish').disabled=!config.url;$('#connection').textContent=config.url?'下書きは管理者だけが見られます。「公開する」で公開サイトへ反映されます。':'接続準備中：編集とプレビューを試せます。下書きはこのブラウザだけに保存され、公開サイトには反映されません。';$('#state').textContent='編集を始められます';renderTabs();render();
}
async function save(){
 if(pending)throw new Error('写真のアップロード完了をお待ちください。');
 await saver.retry();
}
const run=fn=>async()=>{try{await fn();}catch(e){notify(e.message);}};
$('#menu-toggle').onclick=()=>{const open=$('#tabs').classList.toggle('mobile-open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
$('#panel-toggle').onclick=()=>{const hidden=!$('#preview-panel').hidden;$('#preview-panel').hidden=hidden;$('#workspace').classList.toggle('with-preview',!hidden);$('#panel-toggle').setAttribute('aria-expanded',String(!hidden));updatePreview();};
$('#preview-size').onchange=e=>$('#preview-content').classList.toggle('phone',e.target.value==='phone');
$('#export-draft').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='fuku-draft-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#save').onclick=run(save);
$('#preview').onclick=run(async()=>{validateContent(content);sessionStorage.setItem(DRAFT_KEY,JSON.stringify(content));window.open('/?preview=1','_blank');});
$('#publish').onclick=run(async()=>{validateContent(content);if(!config.url||pending)return;$('#publish-summary').textContent=`表示するメンバー ${content.members.filter(m=>m.published!==false).length}人／LIVEアルバム ${content.albums.length}件`;$('#publish-dialog').showModal();});
$('#cancel-publish').onclick=()=>$('#publish-dialog').close();
$('#confirm-publish').onclick=run(async()=>{const b=$('#confirm-publish');b.disabled=true;$('#editor').inert=true;$('#tabs').inert=true;try{await save();await api('/rest/v1/rpc/fuku_website_publish',{method:'POST',body:JSON.stringify({expected_revision:revision})});$('#publish-dialog').close();notify('公開しました！公開サイトでご確認ください。');$('#state').textContent='公開済み';}finally{b.disabled=false;$('#editor').inert=false;$('#tabs').inert=false;}});
$('#login-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const f=new FormData(e.target);const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})});token=r.access_token;e.target.reset();const users=await api('/rest/v1/fuku_website_admins?select=user_id');if(!users.length){token=null;throw new Error('このアカウントにはサイト管理権限がありません。');}await start();notify('ログインしました。');}catch(e){notify(e.message);}finally{b.disabled=false;}};
$('#logout').onclick=run(async()=>{if(pending){notify('写真の処理が終わるまでお待ちください。');return;}if(dirty&&!confirm('未保存の変更があります。ログアウトしますか？'))return;saver.cancel();try{await api('/auth/v1/logout',{method:'POST'});}finally{token=null;sessionStorage.removeItem(DRAFT_KEY);location.reload();}});
window.addEventListener('beforeunload',e=>{if(dirty||pending){e.preventDefault();e.returnValue='';}});
try{config=await getConfig();api=client(config,()=>token);if(config.url)$('#login').hidden=false;else await start();}catch(e){notify(e.message);}

async function cropPortrait(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024)throw new Error('JPEG・PNG・WebP、30MB以内の写真を選んでください。');
 const bitmap=await createImageBitmap(file);
 return new Promise(resolve=>{
  const dialog=node('dialog',undefined,'crop-dialog');const title=node('h2','メンバー写真をトリミング');dialog.append(title,node('p','縦4：横3の共通サイズです。拡大と位置を調整してください。'));
  const canvas=node('canvas');canvas.width=600;canvas.height=800;dialog.append(canvas);
  const values={zoom:1,x:50,y:50};
  const draw=()=>{const scale=Math.max(600/bitmap.width,800/bitmap.height)*values.zoom;const w=bitmap.width*scale,h=bitmap.height*scale;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,600,800);ctx.drawImage(bitmap,-(w-600)*values.x/100,-(h-800)*values.y/100,w,h);};
  for(const [key,label,min,max,step] of [['zoom','拡大',1,3,.01],['x','左右の位置',0,100,1],['y','上下の位置',0,100,1]]){const l=node('label',label),input=node('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=values[key];input.oninput=()=>{values[key]=Number(input.value);draw();};l.append(input);dialog.append(l);}
  const finish=value=>{bitmap.close();dialog.close();dialog.remove();resolve(value);};
  dialog.append(button('キャンセル',()=>finish(null)),button('この範囲で決定',()=>canvas.toBlob(blob=>{if(blob)finish(new File([blob],'portrait.webp',{type:'image/webp'}));else finish(null);},'image/webp',.92)));
  dialog.oncancel=e=>{e.preventDefault();finish(null);};document.body.append(dialog);draw();dialog.showModal();
 });
}
