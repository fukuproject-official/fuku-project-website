import {SECTION_IDS, sectionOrder} from './cms.js';
import { loadContent, visibleMembers, safeUrl, imageUrl, youtubeEmbed, contactMailto, offerMailto } from './content.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const text = (selector, value) => { $(selector).textContent = value || ''; };
const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
const image = (src, alt, lazy = true) => { const node = el('img'); node.src = imageUrl(src); node.alt = alt; node.width = 500; node.height = 650; node.decoding = 'async'; if (lazy) node.loading = 'lazy'; return node; };
const externalLink = (label, url) => { const node = el('a', '', label); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
let uiCopy = {};
const copy = (key, fallback) => uiCopy[key] ?? fallback;
const modal = $('#modal');
let modalTrigger;
function openModal(content) {
  if (!modal.open) modalTrigger = document.activeElement;
  $('#modal-content').replaceChildren(content);
  if (!modal.open) modal.showModal();
  document.body.classList.add('modal-open');
  $('.modal-close').focus();
}
function messageModal(kicker, title, message) {
  const content = el('div', 'modal-message');
  content.append(el('p', 'eyebrow', kicker));
  const heading = el('h2', '', title); heading.id = 'modal-title';
  content.append(heading, el('p', '', message));
  openModal(content);
}
$('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
});
modal.addEventListener('close', () => { document.body.classList.remove('modal-open'); modalTrigger?.focus(); });
const menu = $('.menu-toggle');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'メニューを開く'); $('#navigation').classList.remove('open'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  $('#navigation').classList.toggle('open', open);
});
$$('#navigation a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
matchMedia('(min-width: 1051px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
text('#year', new Date().getFullYear());
const socialLabels = { instagram: 'Instagram', x: 'X', youtube: 'YouTube', website: 'Website' };
const icons = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r=".7"/>',
  x: '<path fill="currentColor" stroke="none" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932Zm-1.29 19.49h2.039L6.487 3.24H4.3Z"/>',
  youtube: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6Z"/>'
};
function socialControl(key, url, icon = false) {
  const valid = safeUrl(url);
  const node = valid ? externalLink('', valid) : el('button');
  if (!valid) node.addEventListener('click', () => messageModal(socialLabels[key], 'COMING SOON', `${socialLabels[key]}の公式アカウントは、公開準備中です。`));
  if (icon) {
    node.className = 'social-icon';
    node.setAttribute('aria-label', `${socialLabels[key]}${valid ? '（新しいタブで開く）' : '（公開準備中）'}`);
    node.title = node.getAttribute('aria-label');
    // Constant SVG paths only; editable content is always rendered with textContent.
    node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[key] || '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 6 6 12 0 18-6-6-6-12 0-18Z"/>'}</svg>`;
  } else {
    const label = el('span', '', socialLabels[key]);
    if (!valid) label.append(el('small', '', 'COMING SOON'));
    node.append(label);
  }
  return node;
}
function renderMember(member) {
  const content = el('div', 'modal-member');
  const portrait = image(member.image, member.imageAlt); portrait.style.objectPosition = member.imagePosition || "50% 50%"; content.append(portrait);
  const details = el('div');
  details.append(el('p', 'eyebrow', copy('memberKicker', 'MEMBER')));
  const heading = el('h2', '', member.name); heading.id = 'modal-title';
  details.append(heading, el('p', 'micro', member.part), el('h3', '', copy('profileHeading', 'PROFILE')), el('p', '', member.bio));
  const links = el('div', 'member-socials');
  for (const [key,value] of Object.entries(member.socials)) if(key !== 'x' && safeUrl(value)) links.append(socialControl(key,value,true));
  if(links.childElementCount) details.append(links);
  content.append(details); openModal(content);
}
function showAlbum(album){
 const body=el('div','modal-album');const title=el('h2','',album.title);title.id='modal-title';body.append(title);if(album.date)body.append(el('p','micro',album.date));
 const grid=el('div','album-photos');(album.photos||[]).filter(item=>item.image).forEach((item,i)=>{
  const button=el('button');button.setAttribute('aria-label',`写真${i+1}を大きく見る`);const photo=image(item.image,item.alt||album.title);photo.style.objectPosition=item.imagePosition||'50% 50%';button.append(photo);
  button.onclick=()=>{const view=el('div','modal-gallery');const heading=el('h2','',album.title);heading.id='modal-title';const back=el('button','album-back','アルバムに戻る');back.onclick=()=>showAlbum(album);view.append(back,heading,image(item.image,item.alt||album.title,false));openModal(view);};grid.append(button);
 });body.append(grid);openModal(body);
}
function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  let pending = false;
  const update = () => {
    pending = false;
    if (preference.matches) return;
    const y = Math.min(window.scrollY, 1000);
    $('.hero').style.setProperty('--parallax', `${y * .055}px`);
    $('.hero').style.setProperty('--title-shift', `${-Math.min(y * .028, 12)}px`);
  };
  const scroll = () => { if (!pending && !preference.matches && window.scrollY < 1500) { pending = true; requestAnimationFrame(update); } };
  const configure = () => {
    observer?.disconnect();
    document.documentElement.classList.toggle('motion-enabled', !preference.matches);
    if (!preference.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
      $$('.reveal').forEach(node => observer.observe(node));
      update();
    } else document.documentElement.classList.remove('motion-enabled');
  };
  window.addEventListener('scroll', scroll, { passive: true });
  preference.addEventListener('change', configure); configure();
}
async function init() {
  const content = await loadContent();
  for(const key of sectionOrder(content.sectionOrder)){
    $('#main').append(document.getElementById(SECTION_IDS[key]));
    const link=$(`#navigation a[href="#${SECTION_IDS[key]}"]`);if(link)$('#navigation').append(link);
  }
  for (const [id, entry] of Object.entries(content.copy || {})) {
    const target = document.querySelector(`[data-copy-id="${CSS.escape(id)}"]`);
    if (!target) continue;
    const texts = [...target.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
    for (const [index,value] of Object.entries(entry.values)) if (texts[Number(index)]) texts[Number(index)].textContent = value ?? '';
  }
  if (new URLSearchParams(location.search).get('preview') === '1') {
    const banner = el('div', 'preview-banner', '下書きプレビュー — 公開サイトには反映されていません');
    document.body.append(banner);
  }
  uiCopy = content.ui || {};
  const { site, about, mind } = content;
  document.title = `${site.name} | ${site.englishName}`;
  $('meta[name="description"]').content = site.description || '';
  $('.hero-note').hidden = !site.draftCopy;
  $('#hero-image').style.objectPosition = site.heroPosition || '50% 50%';
  $('#about-image').style.objectPosition = about.imagePosition || '50% 50%';
  $('#mind-image').style.objectPosition = mind.imagePosition || '50% 50%';
  if(safeUrl(site.heroVideo)) {
    const video=el('video','hero-video');video.src=safeUrl(site.heroVideo);video.poster=imageUrl(site.heroImage);video.muted=true;video.loop=true;video.playsInline=true;video.autoplay=!matchMedia('(prefers-reduced-motion: reduce)').matches;video.preload='metadata';video.setAttribute('aria-label','TOPの映像');
    video.addEventListener('error',()=>video.remove());$('.hero-visual').append(video);
    const toggle=el('button','video-toggle','動画を再生 / 停止');toggle.onclick=()=>video.paused?video.play().catch(()=>{}):video.pause();$('.hero-visual').append(toggle);
  }
  const members = visibleMembers(content.members);
  $('#hero-image').src = imageUrl(site.heroImage);
  $('#hero-image').alt = site.heroImageAlt || '';
  text('#hero-copy', site.heroCopy.join('\n')); $('#hero-copy').style.whiteSpace = 'pre';
  text('#hero-label', site.heroLabel);
  text('#about-lead', about.lead); $('#about-lead').style.whiteSpace = 'pre-line';
  text('#about-body', about.body); text('#mind-message', mind.message); text('#mind-body', mind.body);
  text('#about h2 span', about.title); text('#mind h2 span', mind.title);
  $('#about-image').src = imageUrl(about.image); $('#about-image').alt = about.imageAlt;
  $('#mind-image').src = imageUrl(mind.image);$('#mind-image').alt=mind.imageAlt||'';
  members.forEach(member => {
    const card = el('button', 'member-card reveal'); card.setAttribute('aria-label', `${member.name}のプロフィールを開く`);
    const photo = el('span', 'member-photo'); const portrait = image(member.image, member.imageAlt); portrait.style.objectPosition = member.imagePosition || '50% 50%'; photo.append(portrait, el('span', 'member-overlay', copy('profileButton', 'VIEW PROFILE')));
    const name = el('span', 'member-name', member.name);
    card.append(photo, name, el('span', 'member-part', member.part)); card.addEventListener('click', () => renderMember(member)); $('#member-grid').append(card);
  });
  if (!members.length) $('#member-grid').append(el('p', 'body-copy', copy('membersEmpty', 'メンバー情報は準備中です。')));
  const albums = (content.albums || []).filter(album=>(album.photos||[]).some(photo=>photo.image));
  albums.forEach(album => {
    const first=album.photos.find(photo=>photo.image);
    const card=el('button','album-card reveal');card.setAttribute('aria-label',`${album.title}のアルバムを開く`);
    const cover=el('span','album-cover');const photo=image(first.image,first.alt||album.title);photo.style.objectPosition=first.imagePosition||'50% 50%';cover.append(photo);
    card.append(cover,el('span','album-name',album.title));if(album.date)card.append(el('span','micro',album.date));card.onclick=()=>showAlbum(album);$('#gallery-track').append(card);
  });
  if(!albums.length) $('#gallery-track').append(el('p','body-copy',copy('galleryPlaceholder','LIVEの写真は、開催後に公開します。')));
  for (const [key, value] of Object.entries(content.socials)) {
    if(key==='x')continue;
    $$('[data-socials]').forEach(container => container.append(socialControl(key, value, true)));
    $('#follow-links').append(socialControl(key, value, true));
  }
  $$('[data-ticket]').forEach(button => button.addEventListener('click', () => {
    const url = safeUrl(content.ticket.url);
    if (url) window.location.assign(url);
    else messageModal('TICKET', 'COMING SOON...', copy('ticketPreparing', 'チケット販売ページは現在準備中です。\n公開まで、もうしばらくお待ちください。'));
  }));
  const videoSrc = youtubeEmbed(content.youtube.videoId);
  $('#video-container > img').src = imageUrl(content.youtube.poster);
  $('#video-container > img').style.objectPosition = content.youtube.imagePosition || '50% 50%';
  if (videoSrc) { text('#play-video strong', copy('playButton', 'PLAY FILM')); text('#play-video small', content.youtube.title); $('#play-video').setAttribute('aria-label', `${content.youtube.title}を再生`); }
  $('#play-video').addEventListener('click', () => {
    if (!videoSrc) return messageModal('YOUTUBE / LIVE FILM', 'COMING SOON', copy('videoPreparing', 'ライブ映像は近日公開予定です。'));
    const iframe = el('iframe'); iframe.title = content.youtube.title; iframe.src = videoSrc; iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; $('#video-container').replaceChildren(iframe); iframe.focus();
  });
  if(content.nextLive.image){$('#live-image').src=imageUrl(content.nextLive.image);$('#live-image').alt=content.nextLive.imageAlt||content.nextLive.title||'ライブ案内';$('#live-image').hidden=false;}
  if (content.nextLive.title) text('#live-title', content.nextLive.title);
  text('#live-description', content.nextLive.description);
  text('#live-meta', [content.nextLive.date, content.nextLive.venue].filter(Boolean).join(' / '));
  text('#contact-message', content.contact.message);
  content.contact.categories.forEach(category => { const option = el('option', '', category); option.value = category; $('#contact-category').append(option); });
  const externalForm = safeUrl(content.contact.formUrl);
  const mailAvailable = contactMailto(content.contact.email, '');
  if (externalForm) {
    $('#external-contact').hidden = false;
    $('#external-contact').href = externalForm;
    $('#offer-form').hidden = true;
    text('#contact-status', copy('externalFormReady', '専用のお問い合わせフォームで受け付けています。'));
  } else if (mailAvailable) {
    $('#contact-button').disabled = false;
    text('#contact-button', copy('composeEmail', 'メールを作成する'));
    text('#form-help', copy('emailHelp', '入力内容を入れたメールアプリが開きます。内容を確認して送信してください。'));
    text('#contact-status', copy('contactReady', '出演・企画・協賛など、お気軽にご相談ください。'));
  } else {
    text('#contact-status', copy('contactPreparing', 'お問い合わせの受付は準備中です。'));
  }
  $('#offer-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const mail = offerMailto(content.contact.email, fields);
    if (mail) window.location.href = mail;
  });
  document.body.classList.remove('is-loading');$('#site-loader').remove();
  setupMotion();
}
init().catch(error => { console.error('Unable to load site content', error); $('#load-error').hidden = false;$('#site-loader').replaceChildren(el('p','','読み込めませんでした。ページを再読み込みしてください。')); document.documentElement.classList.remove('motion-enabled'); });
