/*
 * Посредник между формой на сайте и вашим Telegram (Cloudflare Worker, бесплатно).
 * Токен бота хранится ТОЛЬКО здесь, в настройках Worker, — на сайте его нет и быть не должно.
 *
 * Настройки (Worker → Settings → Variables and Secrets):
 *   BOT_TOKEN        — токен бота от @BotFather (тип: Secret)
 *   CHAT_ID          — ваш числовой chat id в Telegram
 *   ALLOWED_ORIGINS  — адреса вашего сайта через запятую, например: https://user.github.io,https://mysite.ru
 * Необязательно (сильнее защита от спама): привязка KV-хранилища с именем RATE.
 */
const KINDS = ['Идея', 'Ошибка', 'Вопрос'];
const MAX_PER_HOUR = 5;                 // сколько сообщений в час можно отправить с одного адреса
const mem = new Map();                  // запасная защита в памяти (работает без KV, но не идеально)

const json = (obj, status, cors) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

async function limited(env, ip) {
  const now = Date.now();
  const arr = (mem.get(ip) || []).filter((t) => now - t < 3600e3);
  if (arr.length >= MAX_PER_HOUR) return true;
  arr.push(now); mem.set(ip, arr);
  if (mem.size > 5000) mem.clear();
  if (env.RATE) {                       // надёжный счётчик, если подключён KV
    const key = 'ip:' + ip, n = parseInt((await env.RATE.get(key)) || '0', 10);
    if (n >= MAX_PER_HOUR) return true;
    await env.RATE.put(key, String(n + 1), { expirationTtl: 3600 });
  }
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : (allowed[0] || 'null'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', Vary: 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
    if (!okOrigin) return json({ ok: false, error: 'origin' }, 403, cors);                    // принимаем только с вашего сайта
    if (!env.BOT_TOKEN || !env.CHAT_ID) return json({ ok: false, error: 'config' }, 500, cors);

    let b;
    try {
      if (Number(request.headers.get('content-length') || 0) > 20000) throw new Error('big');
      b = await request.json();
    } catch (e) { return json({ ok: false, error: 'bad_request' }, 400, cors); }

    if (b.hp) return json({ ok: true }, 200, cors);                                           // скрытое поле для роботов: делаем вид, что всё принято
    const age = Date.now() - Number(b.t || 0);
    if (!(age > 3000 && age < 6 * 3600e3)) return json({ ok: false, error: 'too_fast' }, 400, cors); // человек не заполняет форму за 3 секунды

    const kind = KINDS.includes(b.kind) ? b.kind : 'Вопрос';
    const msg = clean(b.msg, 3000), ver = clean(b.ver, 40), reply = clean(b.reply, 120);
    if (msg.length < 10) return json({ ok: false, error: 'short' }, 400, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await limited(env, ip)) return json({ ok: false, error: 'rate' }, 429, cors);

    const lines = ['📩 Сообщение с сайта', `Тип: ${kind}`];
    if (ver) lines.push(`Версия приложения: ${ver}`);
    if (reply) lines.push(`Как ответить: ${reply}`);
    const text = lines.concat(['', msg]).join('\n');
    let res;
    try {
      res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text, disable_web_page_preview: true })
      });
    } catch (e) { return json({ ok: false, error: 'telegram' }, 502, cors); }
    if (!res.ok) return json({ ok: false, error: 'telegram' }, 502, cors);                    // подробности (и токен) наружу не отдаём
    return json({ ok: true }, 200, cors);
  }
};
