// همیار درس - بک‌اند MVP (بدون وابستگی خارجی، فقط Node.js 18+)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PUB = path.join(__dirname, 'public');

// ---------- راهنمایی‌های دستیار (قدم‌به‌قدم؛ مرحله ۴ = توضیح کامل) ----------
const TOPICS = [
  { k: 'کسرها', w: ['کسر', 'مخرج', 'صورت', 'مشترک'], h: [
    'اول بگو: در این تمرین کسرها چه مخرج‌هایی دارند؟ آیا مخرج‌ها برابرند؟',
    'برای جمع و تفریق، مخرج‌ها باید یکسان باشند. کوچک‌ترین مضرب مشترک مخرج‌ها را پیدا کن.',
    'هر کسر را طوری ضرب کن که مخرجش برابر مضرب مشترک شود، بعد فقط صورت‌ها را جمع کن.',
    'توضیح کامل با مثال: ۱/۲ + ۱/۳ ← مخرج مشترک ۶ ← ۳/۶ + ۲/۶ = ۵/۶. حالا همین روش را روی سؤال خودت اجرا کن.'] },
  { k: 'معادله', w: ['معادله', 'مجهول', 'x'], h: [
    'مجهول سؤال چیست و در کدام طرف تساوی است؟',
    'هدف این است که مجهول تنها بماند. اول جمع و تفریق‌ها را به طرف دیگر ببر.',
    'هر کاری روی یک طرف تساوی می‌کنی، روی طرف دیگر هم انجام بده؛ بعد ضریب مجهول را تقسیم کن.',
    'توضیح کامل با مثال: ۲x + ۳ = ۱۱ ← ۲x = ۸ ← x = ۴. حالا معادله خودت را همین‌طور حل کن.'] },
  { k: 'هندسه', w: ['مثلث', 'زاویه', 'مساحت', 'دایره', 'محیط'], h: [
    'شکل را بکش و داده‌ها را رویش بنویس. چه چیزی معلوم است؟',
    'کدام فرمول به داده‌هایت می‌خورد؟ مثلاً مجموع زاویه‌های مثلث ۱۸۰ درجه است.',
    'فرمول را بنویس، عددها را جایگذاری کن و واحد را فراموش نکن.',
    'توضیح کامل با مثال: دو زاویه ۵۰ و ۶۰ ← زاویه سوم = ۱۸۰ − ۱۱۰ = ۷۰. مسئله خودت را هم همین‌طور حل کن.'] },
  { k: 'ضرب و تقسیم', w: ['ضرب', 'تقسیم', 'باقی‌مانده'], h: [
    'این مسئله ضرب است یا تقسیم؟ از کجا فهمیدی؟',
    'عدد را به بخش‌های ساده‌تر بشکن، مثلاً ۱۲×۱۵ = ۱۲×۱۰ + ۱۲×۵.',
    'هر بخش را جدا حساب کن و نتیجه‌ها را جمع کن.',
    'توضیح کامل با مثال: ۱۲×۱۵ = ۱۲۰ + ۶۰ = ۱۸۰. حالا روی عددهای خودت امتحان کن.'] },
  { k: 'اعداد اعشاری', w: ['اعشار', 'ممیز', 'دهم', 'صدم'], h: [
    'عدد اعشاری را بخوان: رقم بعد از ممیز دهم است یا صدم؟',
    'برای جمع و تفریق، ممیزها را دقیقاً زیر هم بنویس و جاهای خالی را با صفر پر کن.',
    'مثل عددهای معمولی جمع یا تفریق کن و ممیز را در جواب همان‌جا بگذار.',
    'توضیح کامل با مثال: ۲/۵ + ۱/۳۵ ← ۲/۵۰ + ۱/۳۵ = ۳/۸۵. حالا همین کار را روی سؤال خودت انجام بده.'] },
];
const GENERIC = { k: 'سایر', h: [
  'سؤالت را با زبان خودت بازنویسی کن. دقیقاً کجایش را نمی‌فهمی؟',
  'بخشی را که می‌فهمی بنویس و مشخص کن کار از کجا گیر می‌کند.',
  'به مثال‌های همان صفحه کتاب نگاه کن. کدام مثال شبیه سؤال توست؟',
  'یک مثال ساده‌تر با عدد کوچک‌تر بساز و حل کن، بعد همان روش را برای سؤال اصلی بیاور.'] };
const topicByName = k => TOPICS.find(t => t.k === k) || GENERIC;
const detect = q => TOPICS.find(t => t.w.some(w => q.includes(w))) || GENERIC;
const toEn = s => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const toFa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const exNum = q => { const m = toEn(q).match(/(?:تمرین|سوال|سؤال)\s*(\d+)/); return m ? +m[1] : null; };

// ---------- دیتابیس فایل JSON و داده نمونه ----------
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString('hex');
const mkUser = (id, role, name, username, pw, classId) => {
  const salt = crypto.randomBytes(8).toString('hex');
  return { id, role, name, username, salt, hash: hash(pw, salt), classId };
};
const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
const H = (q, topic, ex, level) => ({ id: crypto.randomUUID(), q, topic, ex, level });
function seed() {
  return {
    users: [
      mkUser('t1', 'teacher', 'خانم کریمی', 'karimi', '1234', 'c1'),
      mkUser('s1', 'student', 'زینب حسینی', 'zeinab', '1111', 'c1'),
      mkUser('s2', 'student', 'سارا احمدی', 'sara', '2222', 'c1'),
      mkUser('s3', 'student', 'آرین محمدی', 'arian', '3333', 'c1'),
    ],
    classes: [{ id: 'c1', name: 'ششم — همیار درس' }],
    assignments: [
      { id: 'a1', classId: 'c1', subject: 'ریاضی', page: '۱۵', ex: 'تمرین‌های ۱ تا ۶', due: 'امروز', created: Date.now() },
      { id: 'a2', classId: 'c1', subject: 'فارسی', page: '۳۰', ex: 'درک مطلب درس ۴', due: 'فردا', created: Date.now() + 1 },
      { id: 'a3', classId: 'c1', subject: 'علوم', page: '۲۲', ex: 'فعالیت ۱ و ۲', due: 'فردا', created: Date.now() + 2 },
    ],
    exams: [{ id: 'e1', classId: 'c1', subject: 'ریاضی', title: 'آزمون کسرها', created: Date.now(), questions: [
      { q: 'حاصل ۱/۲ + ۱/۴ چند است؟', opts: ['۲/۶', '۳/۴', '۱/۶', '۲/۴'], ans: 1 },
      { q: 'مخرج مشترک ۳ و ۴ کدام است؟', opts: ['۷', '۱۲', '۶', '۱'], ans: 1 },
      { q: 'کدام کسر از ۱/۲ بزرگ‌تر است؟', opts: ['۱/۳', '۱/۴', '۳/۴', '۱/۵'], ans: 2 }] }],
    results: {
      'e1|s1': { score: 67, correct: 2, answers: [1, 0, 2], at: Date.now(), grade: null },
      'e1|s2': { score: 100, correct: 3, answers: [1, 1, 2], at: Date.now(), grade: null },
    },
    records: {
      'a1|s1': { start: at(17, 10), end: at(17, 42), done: true, helps: [H('مخرج مشترک را نمی‌فهمم', 'کسرها', 4, 3), H('در تمرین ۵ کسر ساده نمی‌شود', 'کسرها', 5, 2)] },
      'a1|s2': { start: at(16, 30), end: at(16, 55), done: true, helps: [] },
      'a1|s3': { start: at(17, 20), end: null, done: false, helps: [H('تمرین ۴ جمع کسرها', 'کسرها', 4, 1)] },
    },
  };
}
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = seed(); save(); }
db.exams = db.exams || []; db.results = db.results || {};
function save() { fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1)); }

// ---------- احراز هویت ----------
const sessions = new Map();
const userById = id => db.users.find(u => u.id === id);
const publicUser = u => ({ id: u.id, role: u.role, name: u.name, classId: u.classId });
function auth(req) { const t = (req.headers.authorization || '').replace('Bearer ', ''); return userById(sessions.get(t)); }

// ---------- ابزارهای HTTP ----------
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
async function readBody(req) { let b = ''; for await (const c of req) { b += c; if (b.length > 1e5) break; } try { return JSON.parse(b || '{}'); } catch { return {}; } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// ---------- منطق ----------
const examOf = (id, cid) => db.exams.find(e => e.id === id && e.classId === cid);
const finalScore = r => (r.grade != null ? r.grade : r.score);
const studentView = (u, a) => {
  const r = db.records[a.id + '|' + u.id];
  return { ...a, rec: r ? { start: r.start, end: r.end, done: r.done,
    helps: r.helps.map(h => ({ id: h.id, q: h.q, topic: h.topic, level: h.level, hints: topicByName(h.topic).h.slice(0, h.level) })) } : null };
};
function overview(t) {
  const students = db.users.filter(u => u.role === 'student' && u.classId === t.classId);
  const assignments = db.assignments.filter(a => a.classId === t.classId).sort((x, y) => y.created - x.created);
  const topicSt = {}, exCnt = {};
  const out = assignments.map(a => ({ id: a.id, subject: a.subject, page: a.page, ex: a.ex, due: a.due,
    rows: students.map(s => {
      const r = db.records[a.id + '|' + s.id];
      r && r.helps.forEach(h => { (topicSt[h.topic] = topicSt[h.topic] || new Set()).add(s.id); if (h.ex) exCnt[h.ex] = (exCnt[h.ex] || 0) + 1; });
      return { id: s.id, name: s.name, status: !r ? 'none' : r.end ? (r.done ? 'done' : 'part') : 'prog',
        start: r && r.start, end: r && r.end, helpCount: r ? r.helps.length : 0,
        topics: r ? [...new Set(r.helps.map(h => h.topic))] : [] };
    }) }));
  const insights = [];
  Object.entries(topicSt).filter(([, v]) => v.size >= 2).sort((a, b) => b[1].size - a[1].size).forEach(([k, v]) =>
    insights.push({ type: 'warn', text: `⚠️ امروز ${toFa(v.size)} دانش‌آموز درباره ${k} سؤال داشته‌اند. پیشنهاد می‌شود این قسمت دوباره در کلاس مرور شود.` }));
  const exs = Object.entries(exCnt).filter(([, n]) => n >= 2 || Object.keys(exCnt).length === 1).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([e]) => toFa(e));
  if (exs.length) insights.push({ type: 'tip', text: `💡 بیشتر درخواست‌های کمک مربوط به ${exs.length > 1 ? 'سؤال‌های ' + exs.join(' و ') : 'سؤال ' + exs[0]} بوده است.` });
  if (out[0]) { const nd = out[0].rows.filter(r => r.status === 'none' || r.status === 'prog').map(r => r.name);
    if (nd.length) insights.push({ type: 'info', text: `📌 ${toFa(nd.length)} نفر هنوز تکلیف «${out[0].subject}» را تمام نکرده‌اند: ${nd.join('، ')}` }); }
  return { className: db.classes.find(c => c.id === t.classId).name, assignments: out, insights };
}

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m === 'POST' && p === '/api/login') {
    const { username = '', password = '' } = await readBody(req);
    const u = db.users.find(x => x.username === String(username).trim().toLowerCase());
    if (!u || hash(String(password), u.salt) !== u.hash) return send(res, 401, { error: 'نام کاربری یا رمز عبور درست نیست.' });
    const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, u.id);
    return send(res, 200, { token, user: publicUser(u) });
  }
  const u = auth(req);
  if (!u) return send(res, 401, { error: 'ابتدا وارد شوید.' });
  if (m === 'GET' && p === '/api/me') return send(res, 200, publicUser(u));

  if (u.role === 'teacher') {
    if (m === 'GET' && p === '/api/teacher/overview') return send(res, 200, overview(u));
    if (m === 'POST' && p === '/api/assignments') {
      const b = await readBody(req), f = k => String(b[k] || '').trim().slice(0, 200);
      if (!f('subject') || !f('page') || !f('ex')) return send(res, 400, { error: 'درس، صفحه و تمرین‌ها را کامل کنید.' });
      db.assignments.push({ id: 'a' + Date.now(), classId: u.classId, subject: f('subject'), page: f('page'), ex: f('ex'), due: f('due') || 'امروز', created: Date.now() });
      save(); return send(res, 200, { ok: true });
    }
    if (m === 'GET' && p === '/api/teacher/exams') {
      const st = db.users.filter(x => x.role === 'student' && x.classId === u.classId);
      return send(res, 200, db.exams.filter(e => e.classId === u.classId).sort((a, b) => b.created - a.created).map(e => ({ id: e.id, subject: e.subject, title: e.title, n: e.questions.length,
        rows: st.map(s => { const r = db.results[e.id + '|' + s.id]; return { id: s.id, name: s.name, done: !!r, score: r ? finalScore(r) : null, graded: !!r && r.grade != null }; }) })));
    }
    if (m === 'POST' && p === '/api/exams') {
      const b = await readBody(req), t = String(b.title || '').trim().slice(0, 100), sub = String(b.subject || '').trim().slice(0, 50);
      const qs = (Array.isArray(b.questions) ? b.questions : []).slice(0, 30).map(x => ({ q: String(x.q || '').trim().slice(0, 300), ans: +x.ans, opts: (Array.isArray(x.opts) ? x.opts : []).slice(0, 4).map(o => String(o).trim().slice(0, 150)) }));
      if (!t || !sub || !qs.length || qs.some(x => !x.q || x.opts.length < 4 || x.opts.some(o => !o) || !(x.ans >= 0 && x.ans < 4))) return send(res, 400, { error: 'عنوان، متن سؤال و هر چهار گزینه را کامل کنید.' });
      db.exams.push({ id: 'e' + Date.now(), classId: u.classId, subject: sub, title: t, questions: qs, created: Date.now() }); save(); return send(res, 200, { ok: true });
    }
    const gm = p.match(/^\/api\/exams\/([\w-]+)\/grade\/([\w-]+)$/);
    if (m === 'POST' && gm) {
      const b = await readBody(req), stu = userById(gm[2]), sc = (b.score === '' || b.score == null) ? NaN : Number(b.score);
      if (!examOf(gm[1], u.classId) || !stu || stu.classId !== u.classId) return send(res, 404, { error: 'پیدا نشد.' });
      if (!(sc >= 0 && sc <= 100)) return send(res, 400, { error: 'نمره باید بین ۰ تا ۱۰۰ باشد.' });
      const key = gm[1] + '|' + gm[2]; db.results[key] = db.results[key] || { score: 0, correct: 0, answers: [], at: Date.now(), grade: null };
      db.results[key].grade = Math.round(sc); save(); return send(res, 200, { ok: true });
    }
    return send(res, 403, { error: 'دسترسی ندارید.' });
  }

  // --- دانش‌آموز: فقط داده‌های خودش ---
  const mine = db.assignments.filter(a => a.classId === u.classId).sort((x, y) => y.created - x.created);
  if (m === 'GET' && p === '/api/assignments') return send(res, 200, mine.map(a => studentView(u, a)));
  if (m === 'POST' && p === '/api/chat') {
    const b = await readBody(req), q = String(b.q || '').trim().slice(0, 500);
    if (!q) return send(res, 400, { error: 'سؤالت را بنویس.' });
    const t = detect(q), step = Math.min(Math.max(+b.step || 0, 0), 3);
    return send(res, 200, { topic: t.k, step, reply: t.h[step] });
  }
  let g;
  if (m === 'GET' && p === '/api/exams') return send(res, 200, db.exams.filter(e => e.classId === u.classId).sort((a, b) => b.created - a.created).map(e => {
    const r = db.results[e.id + '|' + u.id];
    return { id: e.id, subject: e.subject, title: e.title, n: e.questions.length, result: r ? { score: finalScore(r), correct: r.correct, total: e.questions.length, graded: r.grade != null } : null };
  }));
  if (m === 'GET' && (g = p.match(/^\/api\/exams\/([\w-]+)$/))) {
    const e = examOf(g[1], u.classId); if (!e) return send(res, 404, { error: 'آزمون پیدا نشد.' });
    if (db.results[e.id + '|' + u.id]) return send(res, 400, { error: 'این آزمون را قبلاً داده‌ای.' });
    return send(res, 200, { id: e.id, subject: e.subject, title: e.title, questions: e.questions.map(q => ({ q: q.q, opts: q.opts })) });
  }
  if (m === 'POST' && (g = p.match(/^\/api\/exams\/([\w-]+)\/submit$/))) {
    const e = examOf(g[1], u.classId); if (!e) return send(res, 404, { error: 'آزمون پیدا نشد.' });
    const key = e.id + '|' + u.id; if (db.results[key]) return send(res, 400, { error: 'این آزمون را قبلاً داده‌ای.' });
    const ans = (await readBody(req)).answers; const a = Array.isArray(ans) ? ans : [];
    const total = e.questions.length, correct = e.questions.filter((q, i) => a[i] === q.ans).length, score = Math.round(correct / total * 100);
    db.results[key] = { score, correct, answers: a.slice(0, total), at: Date.now(), grade: null }; save();
    return send(res, 200, { score, correct, total, review: e.questions.map((q, i) => ({ q: q.q, opts: q.opts, ans: q.ans, mine: a[i] === undefined ? -1 : a[i] })) });
  }
  if (m === 'POST' && (g = p.match(/^\/api\/assignments\/([\w-]+)\/(start|finish|ask)$/))) {
    const a = mine.find(x => x.id === g[1]); if (!a) return send(res, 404, { error: 'تکلیف پیدا نشد.' });
    const key = a.id + '|' + u.id; let r = db.records[key];
    if (g[2] === 'start') { if (!r) db.records[key] = { start: Date.now(), end: null, done: false, helps: [] }; }
    else if (!r) return send(res, 400, { error: 'ابتدا تکلیف را شروع کنید.' });
    else if (r.end) return send(res, 400, { error: 'این تکلیف تمام شده است.' });
    else if (g[2] === 'finish') { const b = await readBody(req); r.end = Date.now(); r.done = b.done !== false; }
    else { const q = String((await readBody(req)).q || '').trim().slice(0, 500);
      if (!q) return send(res, 400, { error: 'سؤالت را بنویس.' });
      r.helps.push({ id: crypto.randomUUID(), q, topic: detect(q).k, ex: exNum(q), level: 1 }); }
    save(); return send(res, 200, studentView(u, a));
  }
  if (m === 'POST' && (g = p.match(/^\/api\/helps\/([\w-]+)\/next$/))) {
    const h = Object.entries(db.records).filter(([k]) => k.endsWith('|' + u.id)).flatMap(([, r]) => r.helps).find(x => x.id === g[1]);
    if (!h) return send(res, 404, { error: 'پیدا نشد.' });
    if (h.level < 4) h.level++; save(); return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'مسیر پیدا نشد.' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const f = path.join(PUB, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); send(res, 500, { error: 'خطای سرور' }); }
}).listen(PORT, '0.0.0.0', () => console.log(`همیار درس روی http://localhost:${PORT} اجرا شد`));
