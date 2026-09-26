/** Replace this adapter with a public, published-only Supabase query in phase 2. */
export async function loadContent() {
  const response = await fetch(new URL('../data/site.json', import.meta.url));
  if (!response.ok) throw new Error(`Content unavailable: ${response.status}`);
  const content = await response.json();
  if (content.schemaVersion !== 1 || !Array.isArray(content.members)) throw new Error('Unsupported content');
  return content;
}

export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}

export function imageUrl(value) {
  if (typeof value === 'string' && /^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return new URL('../' + value, import.meta.url).href;
  return safeUrl(value) || new URL('../assets/stage.svg', import.meta.url).href;
}

export function youtubeEmbed(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
}

export function contactMailto(email, category) {
  if (typeof email !== 'string' || !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) return null;
  return `mailto:${email}?subject=${encodeURIComponent(`【福プロジェクト】${category}のご相談`)}&body=${encodeURIComponent('お名前・団体名：\nご連絡先：\n開催予定日：\n会場・場所：\nご相談内容：\n')}`;
}

/** Stable IDs are independent of display order and current member count. */
export function visibleMembers(members) {
  return members.filter(member => member.published !== false).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Compose locally; never submit or store inquiry data from the static site. */
export function offerMailto(email, fields) {
  const base = contactMailto(email, fields.category || 'お問い合わせ');
  if (!base) return null;
  const body = [
    `お名前：${fields.name || ''}`,
    `団体・会社名：${fields.organization || ''}`,
    `メールアドレス：${fields.email || ''}`,
    `ご相談内容：${fields.category || ''}`,
    `開催予定日：${fields.date || '未定'}`,
    '', fields.message || ''
  ].join('\n');
  return base.split('&body=')[0] + '&body=' + encodeURIComponent(body);
}
