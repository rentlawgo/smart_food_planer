(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const S = window.SITE || {}, dev = S.developer || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtN = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
  const fmtDate = (iso, opts) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('ru-RU', opts || { day: 'numeric', month: 'long', year: 'numeric' }); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ───────── Тема ───────── */
  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    const dark = cur === 'dark' || (cur === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* хранилище недоступно — не страшно */ }
  });

  /* ───────── Появление при прокрутке ───────── */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'), s = document.createElement('span');
          w.className = 'w'; s.textContent = part; s.style.setProperty('--i', i++); w.appendChild(s); frag.appendChild(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) walk(c);
    });
    walk(el);
  }
  $$('.split').forEach(splitWords);

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.onin) document.dispatchEvent(new CustomEvent(e.target.dataset.onin)); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }) : null;
  const watch = (el) => { if (io) io.observe(el); else el.classList.add('in'); };
  $$('.reveal, .vchips').forEach(watch);
  $$('.vchips li').forEach((li, k) => li.style.setProperty('--k', k));
  requestAnimationFrame(() => $$('.split').forEach((h) => h.classList.add('in')));

  /* ───────── Демо-окно в первом экране ───────── */
  function tween(from, to, dur, delay, cb) {
    if (reduce) { cb(to); return; }
    setTimeout(() => {
      const t0 = performance.now();
      const step = (t) => { const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3); cb(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, delay);
  }
  function runDemo() {
    $$('#demoList li').forEach((li, i) => setTimeout(() => li.classList.add('show'), reduce ? 0 : 900 + i * 330));
    const total = 4802, budget = 5000, ring = $('#ring');
    tween(0, total, 2300, 900, (v) => { $('#sumNum').textContent = fmtN(v); $('#leftNum').textContent = fmtN(budget - v); });
    tween(0, total / budget * 100, 2300, 900, (p) => { ring.style.setProperty('--p', p.toFixed(1)); $('#ringNum').textContent = Math.round(p) + '%'; });
  }
  runDemo();

  /* ───────── Магазины (бегущая строка) ───────── */
  const stores = ['Перекрёсток', 'Лента', 'Магнит', 'ВкусВилл', 'Самокат', 'Пятёрочка', 'Ашан', 'Дикси', 'Яндекс Лавка', 'Купер', 'Метро', 'Азбука Вкуса'];
  const track = $('#marq'), chips = stores.map((n) => `<span>${esc(n)}</span>`).join('');
  track.innerHTML = chips + chips.replace(/<span>/g, '<span aria-hidden="true">');

  /* ───────── Подсветка карточек за курсором ───────── */
  $$('.spot').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  const bar = $('#vbarFill'); if (bar) { const card = bar.closest('.card'); const o = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es[0].isIntersecting) { bar.style.width = '96%'; o.disconnect(); } }, { threshold: 0.4 }) : null; if (o) o.observe(card); else bar.style.width = '96%'; }

  /* ───────── Шапка, шаги, активный раздел ───────── */
  const nav = $('#nav'), steps = $('#steps'), fill = $('#stepsFill'), stepEls = $$('.step', steps);
  let ticking = false;
  function onScroll() {
    ticking = false;
    nav.classList.toggle('scrolled', scrollY > 8);
    if (steps) {
      const r = steps.getBoundingClientRect(), mark = innerHeight * 0.58;
      fill.parentElement.style.setProperty('--prog', clamp((mark - r.top) / r.height, 0, 1));
      stepEls.forEach((s) => s.classList.toggle('on', s.getBoundingClientRect().top < mark));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll); onScroll();

  const links = $$('#links a');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    ['features', 'how', 'download', 'news', 'feedback', 'faq'].forEach((id) => { const el = document.getElementById(id); if (el) so.observe(el); });
  }

  /* мобильное меню */
  const burger = $('#burger'), menu = $('#links');
  const setMenu = (open) => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); nav.classList.toggle('menu-open', open); };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ───────── Скачивание ───────── */
  (function renderDownload() {
    const d = S.download || {}, url = String(d.url || '').trim();
    const ok = /^https:\/\/\S+$/i.test(url) || /^(\.\/)?downloads\/[\w.\-]+$/i.test(url);   // только безопасные адреса
    const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6M5 20h14"/></svg>';
    if (ok) {
      $('#dlLead').textContent = `Версия ${d.version || ''} — установщик для Windows 10 и 11.`;
      $('#dlCta').innerHTML = `<a class="btn btn-primary btn-lg" href="${esc(url)}" download>Скачать для Windows${arrow}</a>`;
    } else {
      $('#dlLead').textContent = 'Первая версия готовится к выходу. Напишите нам — сообщим, когда появится установщик.';
      $('#dlCta').innerHTML = '<span class="btn btn-primary btn-lg is-off" aria-disabled="true">Скоро</span><a class="btn btn-ghost btn-lg" href="#feedback">Сообщить о выходе</a>';
    }
    const rows = [['Версия', d.version || '—'], ['Размер', ok ? (d.size || '—') : '—'], ['Выпуск', ok && d.date ? fmtDate(d.date) || '—' : 'Скоро'], ['Система', 'Windows 10/11, 64 бит']];
    $('#dlMeta').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const sha = String(d.sha256 || '').trim();
    if (ok && /^[a-f0-9]{64}$/i.test(sha)) {
      $('#shaBox').hidden = false; $('#shaCode').textContent = sha.toLowerCase();
      $('#shaCopy').addEventListener('click', () => copy(sha, 'Контрольная сумма скопирована'));
    }
  })();

  /* ───────── Новости ───────── */
  (function renderNews() {
    const list = $('#newsList'), more = $('#newsMore');
    const items = (S.news || []).filter((n) => n && n.title).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!items.length) { list.innerHTML = '<p class="empty">Новостей пока нет — скоро появятся.</p>'; return; }
    let all = false;
    const draw = () => {
      const shown = all ? items : items.slice(0, 3);
      list.innerHTML = shown.map((n) => `<article class="card post reveal"><div class="post-m">${n.tag ? `<span class="tag">${esc(n.tag)}</span>` : ''}<time>${esc(fmtDate(n.date, { day: 'numeric', month: 'long' }))}</time></div><h3>${esc(n.title)}</h3><p>${esc(n.text || '')}</p></article>`).join('');
      $$('.reveal', list).forEach(watch);
      more.hidden = items.length <= 3 || all;
    };
    more.addEventListener('click', () => { all = true; draw(); });
    draw();
  })();

  /* ───────── Контакты и форма ───────── */
  const tg = String(dev.telegram || '').replace(/^@/, '').trim(), mail = String(dev.email || '').trim();
  const tgOk = /^[A-Za-z0-9_]{4,32}$/.test(tg), mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  const ctTg = $('#ctTg'), ctMail = $('#ctMail');
  if (tgOk) { ctTg.href = 'https://t.me/' + tg; ctTg.target = '_blank'; ctTg.rel = 'noopener'; $('#ctTgText').textContent = '@' + tg; } else ctTg.setAttribute('aria-disabled', 'true');
  if (mailOk) { ctMail.href = 'mailto:' + mail; $('#ctMailText').textContent = mail; } else ctMail.setAttribute('aria-disabled', 'true');
  if (!tgOk || !mailOk) console.warn('Укажите контакты разработчика в config.js (developer.telegram / developer.email).');

  function copy(text, okMsg) {
    const done = () => toast(okMsg || 'Скопировано');
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, () => fallback()); return; }
    fallback();
    function fallback() { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Не удалось скопировать'); } t.remove(); }
  }
  const form = $('#fbForm'), err = $('#fbErr'), okBox = $('#fbOk'), sendBtn = $('#fbSend');
  const endpoint = String((S.feedback || {}).endpoint || '').trim(), epOk = /^https:\/\/\S+$/i.test(endpoint);
  const openedAt = Date.now();                                  // время открытия страницы (отсекает роботов, заполняющих форму мгновенно)
  const showErr = (m) => { err.textContent = m; err.hidden = !m; if (m) okBox.hidden = true; };
  function compose(needAgree) {
    const el = form.elements, kind = el.kind.value, msg = el.msg.value.trim(), ver = el.ver.value.trim(), reply = el.reply.value.trim();
    if (msg.length < 10) { showErr('Опишите подробнее — хотя бы пару предложений.'); el.msg.focus(); return null; }
    if (needAgree && !el.agree.checked) { showErr('Поставьте галочку согласия, чтобы отправить сообщение.'); return null; }
    showErr('');
    return { kind, msg, ver, reply, text: [`[${kind}] ${msg}`, ver && `Версия приложения: ${ver}`, reply && `Как ответить: ${reply}`].filter(Boolean).join('\n\n') };
  }
  const openTg = (m) => { if (!tgOk) { toast('Telegram разработчика пока не указан'); return; } open('https://t.me/' + tg + '?text=' + encodeURIComponent(m.text), '_blank', 'noopener'); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = compose(true); if (!m) return;
    if (!epOk) { showErr('Прямая отправка пока не подключена — открываю Telegram с готовым текстом.'); openTg(m); return; }
    sendBtn.disabled = true; sendBtn.textContent = 'Отправляю…'; okBox.hidden = true;
    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: m.kind, msg: m.msg, ver: m.ver, reply: m.reply, hp: form.elements.website.value, t: openedAt })
      });
      if (res.ok) {
        form.reset(); showErr(''); okBox.textContent = 'Спасибо! Сообщение отправлено разработчику.'; okBox.hidden = false;
      } else if (res.status === 429) showErr('Вы отправили слишком много сообщений. Попробуйте позже или напишите в Telegram.');
      else if (res.status === 400) showErr('Не удалось отправить: проверьте текст сообщения и повторите.');
      else showErr('Не удалось отправить сообщение. Попробуйте ещё раз или напишите в Telegram.');
    } catch (ex) { showErr('Нет связи с сервером. Проверьте интернет или напишите в Telegram.'); }
    sendBtn.disabled = false; sendBtn.textContent = 'Отправить';
  });
  $('#fbTg').addEventListener('click', () => { const m = compose(false); if (m) openTg(m); });
  $('#fbMail').addEventListener('click', () => {
    const m = compose(false); if (!m) return;
    if (!mailOk) return toast('Почта разработчика пока не указана — воспользуйтесь Telegram');
    location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Умный планировщик: ' + m.kind) + '&body=' + encodeURIComponent(m.text);
  });
  $('#fbCopy').addEventListener('click', () => { const m = compose(false); if (m) copy(m.text, 'Текст скопирован — вставьте его в любое сообщение'); });

  /* ───────── Вопросы ───────── */
  $$('.qa').forEach((qa) => qa.firstElementChild.addEventListener('click', () => {
    const open = !qa.classList.contains('open');
    $$('.qa.open').forEach((o) => { o.classList.remove('open'); o.firstElementChild.setAttribute('aria-expanded', 'false'); });
    qa.classList.toggle('open', open); qa.firstElementChild.setAttribute('aria-expanded', String(open));
  }));

  /* ───────── Документы ───────── */
  const dlg = $('#legalDlg'), L = window.LEGAL || {};
  const siteHtml = '<p class="legal-date">Как работает этот сайт</p><h4>Что мы не делаем</h4><p>Сайт не использует cookies и аналитику и не показывает рекламу. Все шрифты и скрипты находятся на самом сайте.</p><h4>Что хранится в вашем браузере</h4><p>Только выбранная тема оформления (светлая или тёмная) — в локальном хранилище браузера. Её можно удалить в настройках браузера.</p><h4>Форма обратной связи</h4><p>Когда вы нажимаете «Отправить», текст сообщения и необязательные поля («версия приложения», «как вам ответить») передаются через сервис Cloudflare в Telegram разработчика. Мы получаем только то, что вы написали сами, и используем это исключительно для ответа и улучшения приложения. Служебно Cloudflare видит ваш IP-адрес: он нужен, чтобы ограничивать частоту сообщений, и мы его не сохраняем. Не пишите в сообщении пароли, платёжные и иные чувствительные данные. Если вы не хотите отправлять сообщение через форму, воспользуйтесь кнопками «Написать в Telegram» или «Почта» — тогда вы отправляете его сами из своего приложения.</p><h4>Удаление данных</h4><p>Чтобы удалить ваше сообщение, напишите нам в Telegram, и мы удалим переписку.</p>';
  const tabs = { terms: ['Пользовательское соглашение', L.terms || '<p>Текст готовится.</p>'], privacy: ['Политика конфиденциальности', L.privacy || '<p>Текст готовится.</p>'], site: ['Этот сайт', siteHtml] };
  function showLegal(tab) {
    if (!tabs[tab]) tab = 'terms';
    $('#legalTitle').textContent = tabs[tab][0]; $('#legalBody').innerHTML = tabs[tab][1]; $('#legalBody').scrollTop = 0;
    $$('.dlg-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  $$('[data-legal]').forEach((b) => b.addEventListener('click', () => showLegal(b.dataset.legal)));
  $$('.dlg-tabs button').forEach((b) => b.addEventListener('click', () => showLegal(b.dataset.tab)));
  $('#legalClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // клик по затемнению закрывает окно
  const fromHash = () => { const h = location.hash.slice(1); if (h === 'terms' || h === 'privacy') showLegal(h); };
  addEventListener('hashchange', fromHash); fromHash();

  $('#year').textContent = new Date().getFullYear();
})();
