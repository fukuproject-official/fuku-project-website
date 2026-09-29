import {sectionOrder, DRAFT_KEY, normalizeContent, validateContent, youtubeId, getConfig, client} from '/src/cms.js';
import {imageUrl} from '/src/content.js';
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let fieldGroups={}, content, config, api, token=null, dirty=false, revision=null, current='site', pending=0;
const sections={site:'TOP・ヘッダー・フッター',nextLive:'NEXT LIVE',about:'ABOUT',mind:'OUR MIND',members:'MEMBERS・メンバー',albums:'GALLERY・LIVEアルバム',youtube:'YouTube',socials:'FOLLOW US・SNS',contact:'お問い合わせ',ticket:'チケット'};
const labels={"memberKicker":"MEMBER","profileHeading":"PROFILE","upcomingHeading":"UPCOMING / 今後の活動","upcomingEmpty":"今後の活動は、決まり次第お知らせします。","memberSocialHeading":"FOLLOW / SNS","memberSocialEmpty":"SNSリンクは公開準備中です。","profileButton":"VIEW PROFILE","membersEmpty":"メンバー情報は準備中です。","galleryPlaceholder":"実際の活動写真は近日公開予定です。","ticketPreparing":"チケット販売ページは現在準備中です。 / 公開まで、もうしばらくお待ちください。","videoPreparing":"ライブ映像は近日公開予定です。","playButton":"PLAY FILM","externalFormReady":"専用のお問い合わせフォームで受け付けています。","composeEmail":"メールを作成する","emailHelp":"入力内容を入れたメールアプリが開きます。内容を確認して送信してください。","contactReady":"出演・企画・協賛など、お気軽にご相談ください。","contactPreparing":"お問い合わせの受付は準備中です。",name:'名前',englishName:'英語名',description:'説明文',heroCopy:'TOPのメッセージ（1行ずつ）',heroLabel:'TOPの補足文',draftCopy:'写真・プロフィール準備中の表示',heroImage:'TOP写真',heroImageAlt:'TOP写真の説明',heroVideo:'TOP動画URL（MP4・WebM／空欄なら写真）',photos:'アルバムの写真',title:'タイトル',lead:'写真内の見出し',body:'本文',image:'写真',imageAlt:'写真の説明',message:'メッセージ',part:'担当・肩書き',bio:'プロフィール',instagram:'Instagram URL',x:'X URL',youtube:'YouTube URL',website:'Webサイト URL',placeholder:'準備中の写真・情報',published:'公開サイトに表示する',upcomingActivities:'今後の活動',socials:'SNS',category:'分類名',status:'補足・公開状況',alt:'写真の説明',caption:'写真の見出し',videoId:'YouTube動画URL',poster:'動画のカバー写真',date:'日付',venue:'会場',email:'お問い合わせ先メール',formUrl:'外部フォームURL（設定するとメールフォームの代わりに表示）',categories:'ご相談の種類（1行ずつ）',url:'リンク先URL',heroPosition:'TOP写真の表示位置',imagePosition:'写真の表示位置'};
function notify(t){$('#status').textContent=t;}
function changed(){dirty=true;$('#state').textContent='未保存の変更があります';}
function button(text,fn){const b=node('button',text);b.type='button';b.onclick=fn;return b;}
function field(parent,obj,key,label=labels[key]||key){
 if(key==='categories'){categoryEditor(parent,obj);return;}
 const v=obj[key]; if(['x','upcomingActivities','placeholder'].includes(key))return; if(key==='id'||key==='sortOrder'||key==='schemaVersion')return;
 if(['image','heroImage','poster'].includes(key)){photo(parent,obj,key,label);return;}
 if(Array.isArray(v)&&!['heroCopy','categories'].includes(key)){parent.append(node('h3',label));collection(parent,obj,key);return;}
 if(v&&typeof v==='object'&&!Array.isArray(v)){const d=node('details');d.append(node('summary',label));Object.keys(v).forEach(k=>field(d,v,k));parent.append(d);return;}
 const wrap=node('label',label);let input;
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
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('写真はJPEG・PNG・WebP、8MB以内で選んでください。');
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
 const section=node('div');section.append(node('h3',label));const img=node('img',undefined,'image-preview');img.hidden=!obj[key];if(obj[key])img.src=imageUrl(obj[key]);img.alt='選択中の写真';const posKey=key==='heroImage'?'heroPosition':'imagePosition';img.style.objectPosition=obj[posKey]||'50% 50%';section.append(img);
 const drop=node('div',undefined,'upload');const l=node('label','写真を選ぶ・ここにドロップ');const input=node('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';l.append(input);drop.append(l,node('p','JPEG・PNG・WebP／8MBまで。長辺2400pxに調整します。アップロードした写真は公開URLになります。','hint'));const accept=async f=>{if(!f)return;try{notify('写真をアップロードしています…');const selected=current==='members'&&key==='image'?await cropPortrait(f):f;if(!selected){notify('写真の変更をキャンセルしました。');return;}obj[key]=await upload(selected);changed();render();notify('写真を追加しました。位置を確認してください。');}catch(e){notify(e.message);}};input.onchange=()=>{const file=input.files[0];input.value='';accept(file);};drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');accept(e.dataTransfer.files[0]);};section.append(drop);
 const url=node('label','または画像URL');const u=node('input');u.value=obj[key]||'';u.oninput=()=>{obj[key]=u.value;img.hidden=!u.value;if(u.value)img.src=imageUrl(u.value);changed();};url.append(u);section.append(url);
 const position=node('label','写真の表示位置');const select=node('select');for(const [value,title] of [['50% 50%','中央'],['50% 0%','上'],['50% 100%','下'],['0% 50%','左'],['100% 50%','右']]){const o=node('option',title);o.value=value;select.append(o);}select.value=obj[posKey]||'50% 50%';select.onchange=()=>{obj[posKey]=select.value;img.style.objectPosition=select.value;changed();};position.append(select);if(current!=='nextLive')section.append(position);section.append(button('写真を外す',()=>{obj[key]='';changed();render();}));parent.append(section);
}
function albumPhotos(parent,album){
 parent.append(node('p','① 写真をまとめて選ぶ → ② アルバム名を入力 → ③ 下書き保存・プレビュー・公開。先頭の写真が表紙になります。','hint'));
 const picker=node('label','＋ 写真をまとめて追加', 'album-upload');const input=node('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';picker.append(input);parent.append(picker,node('p','何枚でも一緒に選べます。JPEG・PNG・WebP、1枚8MBまで。','hint'));
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
  card.append(button('外す',()=>{if(confirm('この写真をアルバムから外しますか？公開するまでは公開サイトに影響しません。')){album.photos.splice(i,1);changed();render();}}));
  const detail=node('details');detail.append(node('summary','写真の説明・表示位置'));field(detail,photo,'alt');const position=node('label','表示位置');const select=node('select');for(const [value,title]of [['50% 50%','中央'],['50% 0%','上'],['50% 100%','下']]){const option=node('option',title);option.value=value;select.append(option);}select.value=photo.imagePosition||'50% 50%';select.onchange=()=>{photo.imagePosition=select.value;changed();};position.append(select);detail.append(position);card.append(detail);grid.append(card);
 });parent.append(grid);
}
function collection(parent,obj,key){
 if(key==='photos'){albumPhotos(parent,obj);return;}
 const arr=obj[key];parent.append(node('p',key==='members'?'人数に制限はありません。「表示する」を外すと、内容を残したまま非表示にできます。':key==='albums'?'アルバムを作り、写真をまとめて追加してください。写真がないアルバムは、お客様には表示されません。':'項目の追加・並べ替えができます。','hint'));
 arr.forEach((item,i)=>{const card=node('details',undefined,'card');const summary=node('summary',`${i+1}. ${item.name||item.title||item.caption||'新しい項目'}${item.published===false?'（非表示）':''}`);card.dataset.itemId=item.id||String(i);card.append(summary);
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
 const tabs=$('#tabs');tabs.replaceChildren(node('p','⋮⋮ をつかんで順番を変更できます。上下ボタンでも操作できます。TOPとチケット設定は固定です。','hint'));
 const order=sectionOrder(content.sectionOrder);
 for(const key of ['site',...order,'ticket']){
  const row=node('div',undefined,'section-tab-row');
  const tab=button(sections[key],()=>{current=key;render();});tab.dataset.section=key;row.append(tab);
  if(order.includes(key)){
   const handle=button('⋮⋮',()=>{});handle.className='section-handle';handle.setAttribute('aria-label',sections[key]+'をつかんで移動');handle.draggable=true;
   handle.ondragstart=e=>{e.dataTransfer.setData('text/plain',key);e.dataTransfer.effectAllowed='move';};
   row.ondragover=e=>{e.preventDefault();row.classList.add('drop-target');};row.ondragleave=()=>row.classList.remove('drop-target');
   row.ondrop=e=>{e.preventDefault();row.classList.remove('drop-target');moveSection(e.dataTransfer.getData('text/plain'),key);};row.prepend(handle);
   const actions=node('div',undefined,'section-move');for(const [text,delta]of [['↑',-1],['↓',1]]){
    const b=button(text,()=>{moveSection(key,order[order.indexOf(key)+delta]);$('#tabs').querySelector(`[data-section="${key}"]`).focus();});b.setAttribute('aria-label',sections[key]+(delta<0?'を上へ':'を下へ'));b.disabled=!order[order.indexOf(key)+delta];actions.append(b);
   }row.append(actions);
  }tabs.append(row);
 }
}
function render(){
 const opened=[...$('#editor').querySelectorAll('details[open][data-item-id]')].map(d=>d.dataset.itemId);
 $('#editor').replaceChildren(node('h2',sections[current]));$('#tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.section===current?'page':'false'));
 const target=$('#editor');const obj=content[current];
 if(Array.isArray(obj))collection(target,content,current);
 else for(const k of Object.keys(obj))if(!k.endsWith('Position'))field(target,obj,k, k==='title'&&['about','mind'].includes(current)?'見出し2（日本語）':labels[k]||k);
 const group=current==='albums'?'gallery':current;
 const fields=fieldGroups[group]||[];
 if(fields.length){target.append(node('h3','このエリアの見出し・ボタン・案内'));content.copy ||= {};for(const entry of fields){content.copy[entry.id] ||= {label:entry.label,values:Object.fromEntries(entry.defaults.map((v,i)=>[i,v]))};const item=content.copy[entry.id];for(const k of entry.defaults.map((_,i)=>String(i))){item.values[k] ??= entry.defaults[Number(k)];}for(const k of entry.defaults.map((_,i)=>String(i)))field(target,item.values,k,entry.label+(Object.keys(item.values).length>1?`（${Number(k)+1}行目）`:''));}}
 const uiGroups={members:['memberKicker','profileHeading','profileButton','membersEmpty'],albums:['galleryPlaceholder'],youtube:['videoPreparing','playButton'],ticket:['ticketPreparing'],contact:['externalFormReady','composeEmail','emailHelp','contactReady','contactPreparing']};
 for(const key of uiGroups[current]||[])field(target,content.ui,key,({memberKicker:'プロフィール上部のラベル',profileHeading:'プロフィール見出し',profileButton:'写真に重ねるボタン',membersEmpty:'メンバー未登録時の案内',galleryPlaceholder:'アルバム未登録時の案内',videoPreparing:'動画未登録時の案内',playButton:'動画再生ボタン',ticketPreparing:'販売準備中の案内',externalFormReady:'外部フォームの案内',composeEmail:'メール作成ボタン',emailHelp:'メール送信の説明',contactReady:'受付中の案内',contactPreparing:'受付準備中の案内'})[key]);
 for(const d of target.querySelectorAll('details[data-item-id]'))if(opened.includes(d.dataset.itemId))d.open=true;
 if(current==='youtube'&&youtubeId(content.youtube.videoId)){const frame=node('iframe',undefined,'video-preview');frame.title='YouTubeプレビュー';frame.src=`https://www.youtube-nocookie.com/embed/${youtubeId(content.youtube.videoId)}`;target.append(frame);}
}
async function start(){
 const initial=await fetch('/data/site.json').then(r=>r.json());
 if(config.url){const rows=await api('/rest/v1/fuku_website_drafts?id=eq.main&select=content,updated_at');if(rows.length){content=rows[0].content;revision=rows[0].updated_at;}else content=initial;}
 else {try{content=JSON.parse(localStorage.getItem(DRAFT_KEY))||initial;}catch{content=initial;}}
 normalizeContent(content);content.ui ||= initial.ui;content.albums ||= [];content.site.heroVideo ||= '';content.nextLive.image ||= '';content.nextLive.imageAlt ||= '';fieldGroups=await fetch('/data/editor-fields.json').then(r=>r.json()); validateContent(content);$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=!config.url;$('#publish').disabled=!config.url;$('#connection').textContent=config.url?'下書きは管理者だけが見られます。「公開する」で公開サイトへ反映されます。':'接続準備中：編集とプレビューを試せます。下書きはこのブラウザだけに保存され、公開サイトには反映されません。';$('#state').textContent='編集を始められます';renderTabs();render();
}
async function save(){
 validateContent(content);if(pending)throw new Error('写真のアップロード完了をお待ちください。');
 $('#editor').inert=true;$('#save').disabled=true;$('#preview').disabled=true;$('#publish').disabled=true;
 try {
 if(config.url){const result=await api('/rest/v1/rpc/fuku_website_save',{method:'POST',body:JSON.stringify({document:content,expected_revision:revision})});revision=result;}
 else localStorage.setItem(DRAFT_KEY,JSON.stringify(content));
 dirty=false;$('#state').textContent=`下書き保存済み ${new Date().toLocaleTimeString('ja-JP')}`;notify(config.url?'下書きを保存しました。公開サイトはまだ変わりません。':'このブラウザに下書きを保存しました。');
 } finally {$('#editor').inert=false;$('#save').disabled=false;$('#preview').disabled=false;$('#publish').disabled=!config.url||pending>0;}
}
const run=fn=>async()=>{try{await fn();}catch(e){notify(e.message);}};
$('#save').onclick=run(save);
$('#preview').onclick=run(async()=>{validateContent(content);sessionStorage.setItem(DRAFT_KEY,JSON.stringify(content));window.open('/?preview=1','_blank');});
$('#publish').onclick=run(async()=>{validateContent(content);if(!config.url||pending)return;$('#publish-summary').textContent=`表示するメンバー ${content.members.filter(m=>m.published!==false).length}人／LIVEアルバム ${content.albums.length}件`;$('#publish-dialog').showModal();});
$('#cancel-publish').onclick=()=>$('#publish-dialog').close();
$('#confirm-publish').onclick=run(async()=>{const b=$('#confirm-publish');b.disabled=true;try{await save();await api('/rest/v1/rpc/fuku_website_publish',{method:'POST',body:JSON.stringify({expected_revision:revision})});$('#publish-dialog').close();notify('公開しました！公開サイトでご確認ください。');$('#state').textContent='公開済み';}finally{b.disabled=false;}});
$('#login-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const f=new FormData(e.target);const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})});token=r.access_token;e.target.reset();const users=await api('/rest/v1/fuku_website_admins?select=user_id');if(!users.length){token=null;throw new Error('このアカウントにはサイト管理権限がありません。');}await start();notify('ログインしました。');}catch(e){notify(e.message);}finally{b.disabled=false;}};
$('#logout').onclick=run(async()=>{if(dirty&&!confirm('未保存の変更があります。ログアウトしますか？'))return;try{await api('/auth/v1/logout',{method:'POST'});}finally{token=null;sessionStorage.removeItem(DRAFT_KEY);location.reload();}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{config=await getConfig();api=client(config,()=>token);if(config.url)$('#login').hidden=false;else await start();}catch(e){notify(e.message);}

async function cropPortrait(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('JPEG・PNG・WebP、8MB以内の写真を選んでください。');
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
