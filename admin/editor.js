import {DRAFT_KEY, validateContent, youtubeId, getConfig, client} from '/src/cms.js';
import {imageUrl} from '/src/content.js';
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let content, config, api, token=null, dirty=false, revision=null, current='site', pending=0;
const sections={site:'TOP・基本情報',about:'ABOUT',mind:'MIND',members:'メンバー',activity:'活動紹介',gallery:'ギャラリー',youtube:'YouTube',nextLive:'次のライブ',socials:'SNS',contact:'お問い合わせ',ticket:'チケット',copy:'見出し・ボタン・その他の文字',ui:'プロフィール・準備中の案内'};
const labels={"memberKicker":"MEMBER","profileHeading":"PROFILE","upcomingHeading":"UPCOMING / 今後の活動","upcomingEmpty":"今後の活動は、決まり次第お知らせします。","memberSocialHeading":"FOLLOW / SNS","memberSocialEmpty":"SNSリンクは公開準備中です。","profileButton":"VIEW PROFILE","membersEmpty":"メンバー情報は準備中です。","galleryPlaceholder":"実際の活動写真は近日公開予定です。","ticketPreparing":"チケット販売ページは現在準備中です。 / 公開まで、もうしばらくお待ちください。","videoPreparing":"ライブ映像は近日公開予定です。","playButton":"PLAY FILM","externalFormReady":"専用のお問い合わせフォームで受け付けています。","composeEmail":"メールを作成する","emailHelp":"入力内容を入れたメールアプリが開きます。内容を確認して送信してください。","contactReady":"出演・企画・協賛など、お気軽にご相談ください。","contactPreparing":"お問い合わせの受付は準備中です。",name:'名前',englishName:'英語名',description:'説明文',heroCopy:'TOPのメッセージ（1行ずつ）',heroLabel:'TOPの補足文',draftCopy:'写真・プロフィール準備中の表示',heroImage:'TOP写真',heroImageAlt:'TOP写真の説明',title:'タイトル',lead:'見出し',body:'本文',image:'写真',imageAlt:'写真の説明',message:'メッセージ',part:'担当・肩書き',bio:'プロフィール',instagram:'Instagram URL',x:'X URL',youtube:'YouTube URL',website:'Webサイト URL',placeholder:'準備中の写真・情報',published:'公開サイトに表示する',upcomingActivities:'今後の活動',socials:'SNS',category:'分類名',status:'補足・公開状況',alt:'写真の説明',caption:'写真の見出し',videoId:'YouTube動画URL',poster:'動画のカバー写真',date:'日付',venue:'会場',email:'お問い合わせ先メール',formUrl:'外部フォームURL（設定するとメールフォームの代わりに表示）',categories:'ご相談の種類（1行ずつ）',url:'リンク先URL',heroPosition:'TOP写真の表示位置',imagePosition:'写真の表示位置'};
function notify(t){$('#status').textContent=t;}
function changed(){dirty=true;$('#state').textContent='未保存の変更があります';}
function button(text,fn){const b=node('button',text);b.type='button';b.onclick=fn;return b;}
function field(parent,obj,key,label=labels[key]||key){
 const v=obj[key]; if(key==='id'||key==='sortOrder'||key==='schemaVersion')return;
 if(['image','heroImage','poster'].includes(key)){photo(parent,obj,key,label);return;}
 if(Array.isArray(v)&&!['heroCopy','categories'].includes(key)){parent.append(node('h3',label));collection(parent,obj,key);return;}
 if(v&&typeof v==='object'&&!Array.isArray(v)){const d=node('details');d.append(node('summary',label));Object.keys(v).forEach(k=>field(d,v,k));parent.append(d);return;}
 const wrap=node('label',label);let input;
 if(typeof v==='boolean'){input=node('input');input.type='checkbox';input.checked=v;input.onchange=()=>{obj[key]=input.checked;changed();};wrap.prepend(input);}
 else {input=node(['body','bio','message','lead','description','heroCopy','categories'].includes(key)||String(v||'').includes('\n')?'textarea':'input'); input.value=Array.isArray(v)?v.join('\n'):v??''; if(input.tagName==='TEXTAREA')input.rows=4; input.oninput=()=>{obj[key]=Array.isArray(v)?input.value.split('\n').filter(Boolean):input.value||null;changed();};
 if(key==='videoId'){input.value=v?`https://www.youtube.com/watch?v=${v}`:'';input.oninput=()=>{const id=youtubeId(input.value.trim());input.setCustomValidity(input.value&&!id?'YouTubeの動画URLを確認してください。':'');obj[key]=id||input.value||null;changed();};input.onchange=()=>{if(input.reportValidity())render();};}
 wrap.append(input);}
 parent.append(wrap);
}
async function upload(file){
 if(!config.url)throw new Error('写真アップロードはSupabase接続後に使えます。現在は画像URLでプレビューできます。');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('写真はJPEG・PNG・WebP、8MB以内で選んでください。');
 pending++;$('#publish').disabled=true;
 try{
 // Re-encode photos to remove metadata and keep display assets small.
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.87));if(!blob)throw new Error('写真を読み込めませんでした。');
 const path=`photos/${crypto.randomUUID()}.webp`;
 await api(`/storage/v1/object/fuku-website-images/${path}`,{method:'POST',body:blob,headers:{'Content-Type':'image/webp','x-upsert':'false'}});
 return `${config.url}/storage/v1/object/public/fuku-website-images/${path}`;
 }finally{pending--;$('#publish').disabled=!config.url||pending>0;}
}
function photo(parent,obj,key,label){
 const section=node('div');section.append(node('h3',label));const img=node('img',undefined,'image-preview');img.src=imageUrl(obj[key]);img.alt='選択中の写真';const posKey=key==='heroImage'?'heroPosition':'imagePosition';img.style.objectPosition=obj[posKey]||'50% 50%';section.append(img);
 const drop=node('div',undefined,'upload');const l=node('label','写真を選ぶ・ここにドロップ');const input=node('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';l.append(input);drop.append(l,node('p','JPEG・PNG・WebP／8MBまで。長辺2400pxに調整します。アップロードした写真は公開URLになります。','hint'));const accept=async f=>{if(!f)return;try{notify('写真をアップロードしています…');obj[key]=await upload(f);changed();render();notify('写真を追加しました。位置を確認してください。');}catch(e){notify(e.message);}};input.onchange=()=>{const file=input.files[0];input.value='';accept(file);};drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag');};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');accept(e.dataTransfer.files[0]);};section.append(drop);
 const url=node('label','または画像URL');const u=node('input');u.value=obj[key]||'';u.onchange=()=>{obj[key]=u.value;img.src=imageUrl(u.value);changed();};url.append(u);section.append(url);
 const position=node('label','写真の表示位置');const select=node('select');for(const [value,title] of [['50% 50%','中央'],['50% 0%','上'],['50% 100%','下'],['0% 50%','左'],['100% 50%','右']]){const o=node('option',title);o.value=value;select.append(o);}select.value=obj[posKey]||'50% 50%';select.onchange=()=>{obj[posKey]=select.value;img.style.objectPosition=select.value;changed();};position.append(select);section.append(position);parent.append(section);
}
function collection(parent,obj,key){
 const arr=obj[key];parent.append(node('p',key==='members'?'人数に制限はありません。「表示する」を外すと、内容を残したまま非表示にできます。':'項目の追加・並べ替えができます。','hint'));
 arr.forEach((item,i)=>{const card=node('details',undefined,'card');const summary=node('summary',`${i+1}. ${item.name||item.title||item.caption||'新しい項目'}${item.published===false?'（非表示）':''}`);card.append(summary);
 for(const k of Object.keys(item))if(!k.endsWith('Position'))field(card,item,k);
 const actions=node('div',undefined,'actions');for(const [name,offset] of [['上へ',-1],['下へ',1]]){const b=button(name,()=>{[arr[i],arr[i+offset]]=[arr[i+offset],arr[i]];arr.forEach((x,n)=>{if(key==='members')x.sortOrder=(n+1)*10;});changed();render();});b.disabled=i+offset<0||i+offset>=arr.length;actions.append(b);}actions.append(button('削除',()=>{if(confirm('この項目を下書きから削除しますか？公開するまでは公開サイトに影響しません。')){arr.splice(i,1);changed();render();}}));card.append(actions);parent.append(card);});
 parent.append(button('＋ 追加する',()=>{const id=crypto.randomUUID();let item;
 if(key==='members')item={id,name:'新しいメンバー',part:'',image:'assets/member-01.svg',imageAlt:'',bio:'',socials:{instagram:null,x:null,youtube:null,website:null},upcomingActivities:[],published:false,placeholder:false,sortOrder:(arr.length+1)*10};
 else if(key==='gallery')item={id,image:'assets/stage.svg',alt:'',caption:'新しい写真',placeholder:false};
 else if(key==='activity')item={id,category:'ACTIVITY',title:'新しい活動',body:'',image:'assets/stage.svg',status:''};
 else item={title:'新しい予定',date:'',description:'',url:null};arr.push(item);changed();render();const last=$('#editor').querySelectorAll('.card');if(last.length)last[last.length-1].open=true;
 }));
}
function render(){
 $('#editor').replaceChildren(node('h2',sections[current]));$('#tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.section===current?'page':'false'));
 const target=$('#editor');const obj=content[current];
 if(current==='copy'){target.append(node('p','見出し、メニュー、ボタン、フッターなどを変更できます。','hint'));for(const [id,item]of Object.entries(obj||{})){const d=node('details');d.append(node('summary',item.label));for(const k of Object.keys(item.values))field(d,item.values,k,`文言 ${Number(k)+1}`);target.append(d);}}
 else if(Array.isArray(obj))collection(target,content,current);
 else for(const k of Object.keys(obj))if(!k.endsWith('Position'))field(target,obj,k);
 if(current==='youtube'&&youtubeId(content.youtube.videoId)){const frame=node('iframe',undefined,'video-preview');frame.title='YouTubeプレビュー';frame.src=`https://www.youtube-nocookie.com/embed/${youtubeId(content.youtube.videoId)}`;target.append(frame);}
}
async function start(){
 const initial=await fetch('/data/site.json').then(r=>r.json());
 if(config.url){const rows=await api('/rest/v1/fuku_website_drafts?id=eq.main&select=content,updated_at');if(rows.length){content=rows[0].content;revision=rows[0].updated_at;}else content=initial;}
 else {try{content=JSON.parse(localStorage.getItem(DRAFT_KEY))||initial;}catch{content=initial;}}
 content.ui ||= initial.ui; validateContent(content);$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=!config.url;$('#publish').disabled=!config.url;$('#connection').textContent=config.url?'下書きは管理者だけが見られます。「公開する」で公開サイトへ反映されます。':'接続準備中：編集とプレビューを試せます。下書きはこのブラウザだけに保存され、公開サイトには反映されません。';$('#state').textContent='編集を始められます';$('#tabs').replaceChildren();for(const [key,label]of Object.entries(sections)){const b=button(label,()=>{current=key;render();});b.dataset.section=key;$('#tabs').append(b);}render();
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
$('#publish').onclick=run(async()=>{validateContent(content);if(!config.url||pending)return;$('#publish-summary').textContent=`表示するメンバー ${content.members.filter(m=>m.published!==false).length}人／ギャラリー ${content.gallery.length}枚`;$('#publish-dialog').showModal();});
$('#cancel-publish').onclick=()=>$('#publish-dialog').close();
$('#confirm-publish').onclick=run(async()=>{const b=$('#confirm-publish');b.disabled=true;try{await save();await api('/rest/v1/rpc/fuku_website_publish',{method:'POST',body:JSON.stringify({expected_revision:revision})});$('#publish-dialog').close();notify('公開しました！公開サイトでご確認ください。');$('#state').textContent='公開済み';}finally{b.disabled=false;}});
$('#login-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const f=new FormData(e.target);const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})});token=r.access_token;e.target.reset();const users=await api('/rest/v1/fuku_website_admins?select=user_id');if(!users.length){token=null;throw new Error('このアカウントにはサイト管理権限がありません。');}await start();notify('ログインしました。');}catch(e){notify(e.message);}finally{b.disabled=false;}};
$('#logout').onclick=run(async()=>{if(dirty&&!confirm('未保存の変更があります。ログアウトしますか？'))return;try{await api('/auth/v1/logout',{method:'POST'});}finally{token=null;sessionStorage.removeItem(DRAFT_KEY);location.reload();}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{config=await getConfig();api=client(config,()=>token);if(config.url)$('#login').hidden=false;else await start();}catch(e){notify(e.message);}
