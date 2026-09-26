import { loadContent, visibleMembers, safeUrl, imageUrl, youtubeEmbed, contactMailto, offerMailto } from './content.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const text = (selector, value) => { $(selector).textContent = value || ''; };
const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
const image = (src, alt, lazy = true) => { const node = el('img'); node.src = imageUrl(src); node.alt = alt; node.width = 500; node.height = 650; node.decoding = 'async'; if (lazy) node.loading = 'lazy'; return node; };
const externalLink = (label, url) => { const node = el('a', '', label); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
const modal = $('#modal');
let modalTrigger;
function openModal(content) {
  modalTrigger = document.activeElement;
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
    node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
  } else {
    const label = el('span', '', socialLabels[key]);
    if (!valid) label.append(el('small', '', 'COMING SOON'));
    node.append(label);
  }
  return node;
}
function renderMember(member) {
  const content = el('div', 'modal-member');
  content.append(image(member.image, member.imageAlt));
  const details = el('div');
  details.append(el('p', 'eyebrow', 'MEMBER'));
  const heading = el('h2', '', member.name); heading.id = 'modal-title';
  details.append(heading, el('p', 'micro', member.part), el('h3', '', 'PROFILE'), el('p', '', member.bio));
  details.append(el('h3', '', 'UPCOMING / 今後の活動'));
  if (member.upcomingActivities.length) {
    const list = el('ul');
    member.upcomingActivities.forEach(activity => {
      const item = el('li'); const url = safeUrl(activity.url);
      item.append(url ? externalLink(activity.title + '', url) : el('span', '', activity.title));
      if (activity.date) item.append(el('p', 'micro', activity.date));
      if (activity.description) item.append(el('p', '', activity.description));
      list.append(item);
    }); details.append(list);
  } else details.append(el('p', '', '今後の活動は、決まり次第お知らせします。'));
  details.append(el('h3', '', 'FOLLOW / SNS'));
  let count = 0;
  for (const [key, value] of Object.entries(member.socials)) { const url = safeUrl(value); if (url) { details.append(externalLink((socialLabels[key] || key) + '', url)); count++; } }
  if (!count) details.append(el('p', '', 'SNSリンクは公開準備中です。'));
  content.append(details); openModal(content);
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
  const { site, about, mind } = content;
  const members = visibleMembers(content.members);
  $('#hero-image').src = imageUrl(site.heroImage);
  $('#hero-image').alt = site.heroImageAlt;
  text('#hero-copy', site.heroCopy.join('\n')); $('#hero-copy').style.whiteSpace = 'pre';
  text('#hero-label', site.heroLabel);
  text('#about-lead', about.lead); $('#about-lead').style.whiteSpace = 'pre-line';
  text('#about-body', about.body); text('#mind-message', mind.message); text('#mind-body', mind.body);
  text('#about h2 span', about.title); text('#mind h2 span', mind.title);
  $('#about-image').src = imageUrl(about.image); $('#about-image').alt = about.imageAlt;
  $('#mind-image').src = imageUrl(mind.image);
  members.forEach(member => {
    const card = el('button', 'member-card reveal'); card.setAttribute('aria-label', `${member.name}のプロフィールを開く`);
    const photo = el('span', 'member-photo'); photo.append(image(member.image, member.imageAlt), el('span', 'member-overlay', 'VIEW PROFILE'));
    const name = el('span', 'member-name', member.name);
    card.append(photo, name, el('span', 'member-part', member.part)); card.addEventListener('click', () => renderMember(member)); $('#member-grid').append(card);
  });
  if (!members.length) $('#member-grid').append(el('p', 'body-copy', 'メンバー情報は準備中です。'));
  content.activity.forEach((activity, i) => {
    const article = el('article', 'activity-card reveal');
    const photo = el('div', 'activity-photo'); photo.append(image(activity.image, `${activity.category}の写真掲載予定`));
    article.append(photo, el('h3', '', activity.category), el('p', 'micro', `0${i + 1} / FUKU PROJECT`), el('h4', '', activity.title), el('p', '', activity.body), el('p', 'status', activity.status)); $('#activity-list').append(article);
  });
  content.gallery.forEach((item, i) => {
    const figure = el('figure', 'gallery-item'); const button = el('button');
    button.setAttribute('aria-label', `${item.caption}の画像を拡大`); button.append(image(item.image, item.alt));
    button.addEventListener('click', () => { const body = el('div', 'modal-gallery'); const title = el('h2', '', item.caption); title.id = 'modal-title'; body.append(image(item.image, item.alt), title); if (item.placeholder) body.append(el('p', 'micro', '実際の活動写真は近日公開予定です。')); openModal(body); });
    const caption = el('figcaption', '', item.caption); caption.append(el('span', '', String(i + 1).padStart(2, '0'))); figure.append(button, caption); $('#gallery-track').append(figure);
  });
  const track = $('#gallery-track');
  const galleryScroll = dir => track.scrollBy({ left: dir * track.clientWidth * .7, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  const galleryState = () => { $('#gallery-prev').disabled = track.scrollLeft < 2; $('#gallery-next').disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2; };
  $('#gallery-prev').addEventListener('click', () => galleryScroll(-1)); $('#gallery-next').addEventListener('click', () => galleryScroll(1));
  track.addEventListener('scroll', galleryState, { passive: true }); window.addEventListener('resize', galleryState); galleryState();
  track.addEventListener('keydown', event => { if (event.target === track && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); galleryScroll(event.key === 'ArrowLeft' ? -1 : 1); } });
  for (const [key, value] of Object.entries(content.socials)) {
    $$('[data-socials]').forEach(container => container.append(socialControl(key, value, true)));
    $('#follow-links').append(socialControl(key, value, true));
  }
  $$('[data-ticket]').forEach(button => button.addEventListener('click', () => {
    const url = safeUrl(content.ticket.url);
    if (url) window.location.assign(url);
    else messageModal('TICKET', 'COMING SOON...', 'チケット販売ページは現在準備中です。\n公開まで、もうしばらくお待ちください。');
  }));
  const videoSrc = youtubeEmbed(content.youtube.videoId);
  $('#video-container > img').src = imageUrl(content.youtube.poster);
  if (videoSrc) { text('#play-video strong', 'PLAY FILM'); text('#play-video small', content.youtube.title); $('#play-video').setAttribute('aria-label', `${content.youtube.title}を再生`); }
  $('#play-video').addEventListener('click', () => {
    if (!videoSrc) return messageModal('YOUTUBE / LIVE FILM', 'COMING SOON', 'ライブ映像は近日公開予定です。');
    const iframe = el('iframe'); iframe.title = content.youtube.title; iframe.src = videoSrc; iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; $('#video-container').replaceChildren(iframe); iframe.focus();
  });
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
    text('#contact-status', '専用のお問い合わせフォームで受け付けています。');
  } else if (mailAvailable) {
    $('#contact-button').disabled = false;
    text('#contact-button', 'メールを作成する');
    text('#form-help', '入力内容を入れたメールアプリが開きます。内容を確認して送信してください。');
    text('#contact-status', '出演・企画・協賛など、お気軽にご相談ください。');
  } else {
    text('#contact-status', 'お問い合わせの受付は準備中です。');
  }
  $('#offer-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const mail = offerMailto(content.contact.email, fields);
    if (mail) window.location.href = mail;
  });
  setupMotion();
}
init().catch(error => { console.error('Unable to load site content', error); $('#load-error').hidden = false; document.documentElement.classList.remove('motion-enabled'); });
