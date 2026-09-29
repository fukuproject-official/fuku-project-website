export const SECTION_IDS={nextLive:'next-live',about:'about',mind:'mind',members:'members',albums:'gallery',youtube:'youtube',socials:'follow',contact:'contact'};
export function sectionOrder(value){const keys=Object.keys(SECTION_IDS);return [...new Set([...(Array.isArray(value)?value:[]).filter(k=>keys.includes(k)),...keys])];}
export const DRAFT_KEY = 'fuku-editor-draft-v1';
export function youtubeId(value) {
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    let id;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) id = u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}
export function normalizeContent(c) {
 c.sectionOrder=sectionOrder(c.sectionOrder);
 c.albums ||= [];c.site.heroVideo ||= '';c.nextLive.image ||= '';c.nextLive.imageAlt ||= '';
 for(const id of ['text-20','text-89']){const item=c.copy?.[id];if(item&&Object.keys(item.values).length>1)item.values={'0':Object.values(item.values).join('')};}
 const old=c.copy?.['text-86']?.values;if(old)for(const k of Object.keys(old))old[k]=old[k].replace('プロフィールと今後の活動。','プロフィール。');
 delete c.socials.x;for(const m of c.members)delete m.socials.x;
 return c;
}
export function validateContent(c) {
  if (!c || c.schemaVersion !== 1 || !Array.isArray(c.members)) throw new Error('サイトデータの形式が違います。');
  for (const name of ['site','about','mind','youtube','nextLive','socials','contact','ticket']) if (!c[name] || typeof c[name] !== 'object') throw new Error(`${name} のデータがありません。`);
  for (const name of ['activity','gallery']) if (!Array.isArray(c[name])) throw new Error(`${name} の一覧がありません。`);
  if (!Array.isArray(c.site.heroCopy) || !Array.isArray(c.contact.categories)) throw new Error('文章の形式が違います。');
  if(c.contact.categories.some(v=>typeof v!=='string'||!v.trim()))throw new Error('ご相談の種類に空欄があります。名前を入力するか削除してください。');
  const ids = new Set();
  for (const m of c.members) {
    if (!m.id || ids.has(m.id) || !m.name || !Array.isArray(m.upcomingActivities) || !m.socials) throw new Error('メンバーの名前・ID・活動情報を確認してください。');
    ids.add(m.id);
  }
  if(c.albums && (!Array.isArray(c.albums)||c.albums.some(a=>!a.title||!Array.isArray(a.photos))))throw new Error('アルバムのタイトルと写真を確認してください。');
  if (c.youtube.videoId && !youtubeId(c.youtube.videoId)) throw new Error('YouTubeのURLを確認してください。');
  const visit = (v, key = '') => {
    if (v && typeof v === 'object') { for (const [k,x] of Object.entries(v)) visit(x,k); return; }
    if (!v || typeof v !== 'string') return;
    if (['url','formUrl','instagram','x','youtube','website','heroVideo'].includes(key) && !/^https:\/\//.test(v)) throw new Error('リンクは https:// から始まるURLを入力してください。');
    if (['image','heroImage','poster'].includes(key) && !/^(https:\/\/|assets\/[\w./-]+$)/.test(v)) throw new Error('写真をアップロードするか、HTTPSの画像URLを入力してください。');
  }; visit(c);
  return c;
}
export async function getConfig() {
  const r = await fetch('/data/cms.json', {cache:'no-store'});
  if (!r.ok) return {};
  const c = await r.json();
  if (c.url && (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url) || !c.publishableKey)) throw new Error('保存先の接続設定を確認してください。');
  return c;
}
export function client(config, getToken = () => null) {
  return async (path, options = {}) => {
    const headers = {apikey:config.publishableKey, ...options.headers};
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';
    const r = await fetch(config.url + path, {...options,headers});
    if (!r.ok) {
      const error = await r.json().catch(()=>({}));
      if (error.code === 'P0001') throw new Error('別の画面で下書きが更新された可能性があります。変更を控えて、再ログインしてください。');
      throw new Error(r.status === 401 || r.status === 403 ? 'ログイン期限または管理者権限を確認してください。' : `保存先との通信に失敗しました（${r.status}）。変更内容は画面に残っています。`);
    }
    return r.status === 204 ? null : r.text().then(t=>t ? JSON.parse(t) : null);
  };
}
