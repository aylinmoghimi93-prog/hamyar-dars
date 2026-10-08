const $ = s => document.querySelector(s);
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = t => fa(new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
const mins = (a, b) => Math.max(1, Math.round((b - a) / 60000));
let token = localStorage.getItem('hd_token'), me = null, data = null, work = null, showForm = false, draft = '', timer;

async function api(p, method = 'GET', body) {
  const r = await fetch('/api' + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { logout(); throw new Error('نشست شما تمام شده؛ دوباره وارد شوید.'); }
  if (!r.ok) throw new Error(j.error || 'خطا');
  return j;
}
const run = async fn => { try { await fn(); } catch (e) { alert(e.message); } };
function logout() { token = null; me = null; work = null; localStorage.removeItem('hd_token'); render(); }
async function load() { data = me.role === 'teacher' ? await api('/teacher/overview') : await api('/assignments'); render(); }
async function init() { if (token) { try { me = await api('/me'); await load(); return; } catch { } } render(); }

function render() {
  clearInterval(timer);
  const app = $('#app');
  if (!me) return app.innerHTML = loginView();
  const who = me.role === 'teacher' ? '👩‍🏫' : '🎒';
  let h = `<div class="top"><div class="logo">📚 همیار درس</div><div class="mut">${who} ${esc(me.name)} <button class="link" onclick="logout()">خروج</button></div></div>`;
  h += me.role === 'teacher' ? teacherView() : (work ? workView() : studentView());
  app.innerHTML = h;
  if (work && me.role === 'student') startTimer();
}

// ---------- ورود ----------
function loginView() {
  return `<div class="top"><div class="logo">📚 همیار درس</div></div><div class="card"><h3>ورود به حساب</h3>
  <form onsubmit="doLogin(event)"><div class="mt"><label>نام کاربری<input id="u" autocomplete="username" autocapitalize="none" required></label></div>
  <div class="mt"><label>رمز عبور<input id="p" type="password" autocomplete="current-password" required></label></div>
  <button class="btn big mt" type="submit">ورود</button><div class="err" id="err" role="alert"></div></form></div>
  <div class="card note"><b>حساب‌های نمونه:</b><br>دانش‌آموز: zeinab / 1111 ، sara / 2222 ، arian / 3333<br>معلم: karimi / 1234</div>`;
}
async function doLogin(e) {
  e.preventDefault();
  try {
    const j = await api('/login', 'POST', { username: $('#u').value, password: $('#p').value });
    token = j.token; me = j.user; localStorage.setItem('hd_token', token); await load();
  } catch (x) { $('#err').textContent = x.message; }
}

// ---------- دانش‌آموز ----------
const stat = r => !r ? ['t-none', 'شروع نشده'] : r.end ? (r.done ? ['t-done', '✅ انجام شد'] : ['t-part', '◐ بخشی انجام شد']) : ['t-prog', '⏳ در حال انجام'];
function studentView() {
  const total = data.length, done = data.filter(a => a.rec && a.rec.end).length, pct = total ? Math.round(done / total * 100) : 0;
  let h = `<h2>سلام ${esc(me.name.split(' ')[0])} 👋</h2>
  <div class="stats"><div class="card"><b>${fa(total)}</b>تکالیف امروز</div><div class="card"><b>${fa(done)}</b>انجام‌شده</div><div class="card"><b>${fa(total - done)}</b>باقی‌مانده</div></div>
  <div class="card"><div class="row"><span>پیشرفت</span><b>${fa(pct)}٪</b></div><div class="prog"><i style="width:${pct}%"></i></div></div>`;
  if (!total) h += `<div class="card mut">هنوز تکلیفی برایت ثبت نشده است.</div>`;
  data.forEach(a => {
    const [c, t] = stat(a.rec);
    h += `<div class="card"><div class="row"><h3>${esc(a.subject)}</h3><span class="tag ${c}">${t}</span></div>
    <div class="mt">صفحه ${esc(a.page)}، ${esc(a.ex)}</div><div class="mut">مهلت: ${esc(a.due)}</div>`;
    if (a.rec) h += `<div class="mut">شروع: ${clock(a.rec.start)}${a.rec.end ? ` · پایان: ${clock(a.rec.end)} · مدت: ${fa(mins(a.rec.start, a.rec.end))} دقیقه` : ''}</div>`;
    h += a.rec && a.rec.end ? '' : `<button class="btn big mt" onclick="startWork('${a.id}')">${a.rec ? 'ادامه تکلیف' : 'شروع تکلیف'}</button>`;
    h += '</div>';
  });
  return h;
}
const cur = () => data.find(a => a.id === work);
function startWork(id) { run(async () => { await api(`/assignments/${id}/start`, 'POST'); work = id; draft = ''; await load(); }); }
function workView() {
  const a = cur(); if (!a) { work = null; return studentView(); }
  let h = `<button class="link" onclick="work=null;render()">‹ بازگشت</button><div class="card mt"><div class="row"><h3>${esc(a.subject)} — صفحه ${esc(a.page)}</h3><span class="mut">شروع ${clock(a.rec.start)}</span></div><div class="mut">${esc(a.ex)}</div><div class="timer" id="tm">۰۰:۰۰</div></div>
  <div class="card"><h3>جایی گیر کردی؟ بپرس 🙋</h3><div class="mut">جواب نهایی را فوری نمی‌گیری. قدم‌به‌قدم راهنمایی می‌شوی تا خودت به جواب برسی.</div>
  <textarea id="qt" class="mt" aria-label="سؤال" placeholder="سؤالت را بنویس…">${esc(draft)}</textarea>
  <div class="grid mt"><button class="btn ghost" onclick="voice()">🎙️ گفتن سؤال</button><button class="btn" onclick="ask()">راهنمایی بگیر</button></div><div class="mut mt" id="vm"></div>`;
  a.rec.helps.forEach(q => {
    h += `<div class="q">${esc(q.q)} <span class="tag t-none">${esc(q.topic)}</span></div>`;
    q.hints.forEach((t, i) => h += `<div class="hint">${i < 3 ? '💡 راهنمایی ' + fa(i + 1) : '📘 توضیح کامل'}: ${esc(t)}</div>`);
    h += q.level < 4 ? `<button class="btn ghost mt" onclick="more('${q.id}')">هنوز مشکل دارم، قدم بعدی</button>` : `<div class="mut mt">حالا خودت سؤال را حل کن. اگر باز گیر کردی دوباره بپرس.</div>`;
  });
  return h + `</div><button class="btn ok big" onclick="finishAsk()">تکلیف را تمام کردم</button><div id="fin"></div>`;
}
function ask() { const q = $('#qt').value.trim(); if (!q) { $('#vm').textContent = 'اول سؤالت را بنویس یا بگو.'; return; } run(async () => { await api(`/assignments/${work}/ask`, 'POST', { q }); draft = ''; await load(); }); }
function more(id) { draft = $('#qt').value; run(async () => { await api(`/helps/${id}/next`, 'POST'); await load(); }); }
function voice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, m = $('#vm');
  if (!SR) { m.textContent = 'مرورگر شما ورودی صوتی را پشتیبانی نمی‌کند؛ سؤال را تایپ کن.'; return; }
  try { const rc = new SR(); rc.lang = 'fa-IR'; m.textContent = '🎙️ در حال گوش دادن…';
    rc.onresult = e => { $('#qt').value = e.results[0][0].transcript; m.textContent = 'سؤال ثبت شد؛ می‌توانی ویرایشش کنی.'; };
    rc.onerror = () => { m.textContent = 'دسترسی به میکروفون ممکن نشد؛ سؤال را تایپ کن.'; }; rc.start();
  } catch { m.textContent = 'ورودی صوتی در دسترس نیست.'; }
}
function finishAsk() { $('#fin').innerHTML = `<div class="card mt"><h3>تکلیف چطور پیش رفت؟</h3><div class="grid mt"><button class="btn ok" onclick="finish(true)">کامل انجام شد</button><button class="btn ghost" onclick="finish(false)">بخشی انجام شد</button></div></div>`; }
function finish(done) { run(async () => { await api(`/assignments/${work}/finish`, 'POST', { done }); work = null; await load(); }); }
function startTimer() {
  const el = $('#tm'), a = cur(); if (!el || !a) return;
  const f = () => { const s = Math.floor((Date.now() - a.rec.start) / 1000); el.textContent = fa(String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')); };
  f(); timer = setInterval(f, 1000);
}

// ---------- معلم ----------
function teacherView() {
  let h = `<div class="mut">کلاس ${esc(data.className)} (پایه ششم)</div><h2>تحلیل کلاس</h2>`;
  h += data.insights.length ? data.insights.map(i => `<div class="${i.type === 'warn' ? 'alert' : 'card'}">${esc(i.text)}</div>`).join('') : `<div class="good">فعلاً نقطه ضعف مشترکی در کلاس دیده نمی‌شود.</div>`;
  h += `<button class="btn ghost big" onclick="showForm=!showForm;render()">${showForm ? 'بستن فرم' : '＋ تکلیف جدید'}</button>`;
  if (showForm) h += `<div class="card mt"><div><label>درس<select id="f1" style="width:100%">${SUBJ.map(s=>`<option>${s.n}</option>`).join('')}</select></label></div><div class="mt"><label>صفحه<input id="f2" placeholder="مثلاً ۲۰"></label></div><div class="mt"><label>تمرین‌ها<input id="f3" placeholder="مثلاً تمرین‌های ۱ تا ۶"></label></div><div class="mt"><label>مهلت<input id="f4" value="فردا"></label></div><button class="btn big mt" onclick="addA()">ارسال برای کل کلاس</button></div>`;
  const lbl = { done: ['t-done', '✅ تکلیف انجام شد'], part: ['t-part', '◐ بخشی انجام شد'], prog: ['t-prog', '⏳ در حال انجام'], none: ['t-none', 'شروع نشده'] };
  data.assignments.forEach(a => {
    h += `<h2>${esc(a.subject)} · صفحه ${esc(a.page)} · ${esc(a.ex)}</h2><div class="card">`;
    a.rows.forEach(r => {
      const [c, t] = lbl[r.status];
      h += `<div class="stu"><div class="row"><b>${esc(r.name)}</b><span class="tag ${c}">${t}</span></div>`;
      if (r.start) h += `<div class="mut">شروع: ${clock(r.start)}${r.end ? ` · پایان: ${clock(r.end)} · مدت: ${fa(mins(r.start, r.end))} دقیقه` : ''}</div>`;
      if (r.helpCount) h += `<div class="mut">${fa(r.helpCount)} بار درخواست کمک · موضوع مشکل: ${r.topics.map(esc).join('، ')}</div>`;
      else if (r.end) h += `<div class="mut">بدون درخواست کمک</div>`;
      h += '</div>';
    });
    h += '</div>';
  });
  return h;
}
function addA() {
  const g = i => $('#f' + i).value;
  run(async () => { await api('/assignments', 'POST', { subject: g(1), page: g(2), ex: g(3), due: g(4) }); showForm = false; await load(); });
}
init();
