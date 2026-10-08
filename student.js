// ظاهر جدید پنل دانش‌آموز: خانه، درس‌ها، همیار هوشمند و پروفایل
// (این فایل بعد از app.js بارگذاری می‌شود و نمای قبلی دانش‌آموز را عوض می‌کند)
const SUBJ = [
  { n: 'فارسی', i: '📖', c: '#e8590c', d: 'خواندن، نوشتن، دستور زبان و داستان‌های قشنگ' },
  { n: 'ریاضی', i: '➗', c: '#1c7ed6', d: 'عددها، کسرها، اعشار و حل مسئله' },
  { n: 'علوم', i: '🔬', c: '#2f9e44', d: 'آزمایش کن و دنیای اطرافت را بشناس' },
  { n: 'مطالعات اجتماعی', i: '🌍', c: '#f08c00', d: 'ایران، جهان، تاریخ و زندگی در کنار هم' },
  { n: 'هدیه‌های آسمان', i: '🌙', c: '#7048e8', d: 'آموزه‌های دینی و اخلاقی' },
  { n: 'قرآن', i: '📿', c: '#0c8599', d: 'روخوانی، روان‌خوانی و مفهوم آیه‌ها' },
  { n: 'کار و فناوری', i: '🛠️', c: '#d6336c', d: 'ساختن، ابتکار و مهارت‌های زندگی' },
  { n: 'پیک', i: '📬', c: '#5f3dc4', d: 'فعالیت‌ها و پیام‌های مدرسه' },
];
let tab = 'home', subj = null, lq = '', st = 0;
let chat = [{ b: 1, t: 'سلام! من «همیار هوشمند» هستم 🤖 سؤال درسی‌ات را بنویس. اول راهنمایی کوچک می‌دهم تا خودت راه‌حل را پیدا کنی.' }];
const sj = n => SUBJ.find(s => s.n === n) || { i: '📚', c: '#0d7a8a', d: '' };

function go(k) { tab = k; subj = null; render(); }
function nav() {
  return `<nav class="nav">${[['home', '🏠', 'خانه'], ['chat', '🤖', 'همیار'], ['me', '👤', 'پروفایل']]
    .map(([k, i, l]) => `<button class="${tab === k && !subj ? 'on' : ''}" onclick="go('${k}')"><span>${i}</span>${l}</button>`).join('')}</nav>`;
}
function studentView() {
  const v = subj ? subjView() : tab === 'chat' ? chatView() : tab === 'me' ? meView() : homeView();
  return v + nav();
}

// ----- خانه -----
function homeView() {
  const nw = data.filter(a => !a.rec).length, done = data.filter(a => a.rec && a.rec.end).length;
  const pct = data.length ? Math.round(done / data.length * 100) : 0;
  return `<div class="hero up"><div class="row"><div><div class="mut2">سلام 👋</div><h1>${esc(me.name)}</h1></div>
    <div class="bell" aria-label="اعلان‌ها">🔔${nw ? `<b>${fa(nw)}</b>` : ''}</div></div>
    <div class="prog w"><i style="width:${pct}%"></i></div><div class="mut2">پیشرفت: ${fa(pct)}٪ · ${fa(done)} از ${fa(data.length)} تکلیف</div></div>
    ${nw ? `<div class="alert up">🔔 ${fa(nw)} تکلیف جدید برایت آمده است!</div>` : ''}
    <h2>درس‌ها</h2><div class="sgrid">${SUBJ.map((s, i) => {
      const p = data.filter(a => a.subject === s.n && !(a.rec && a.rec.end)).length;
      return `<button class="scard up" style="--c:${s.c};animation-delay:${i * 50}ms" onclick="subj='${s.n}';render()"><span class="ic">${s.i}</span><b>${s.n}</b><small>${p ? fa(p) + ' تکلیف' : 'بدون تکلیف'}</small></button>`;
    }).join('')}</div>`;
}

// ----- صفحه درس -----
function aCard(a) {
  const [c, t] = stat(a.rec);
  return `<div class="card up"><div class="row"><h3>${esc(a.subject)}${a.rec ? '' : ' 🆕'}</h3><span class="tag ${c}">${t}</span></div>
  <div class="mt">صفحه ${esc(a.page)}، ${esc(a.ex)}</div><div class="mut">مهلت: ${esc(a.due)}</div>
  ${a.rec ? `<div class="mut">شروع: ${clock(a.rec.start)}${a.rec.end ? ` · مدت: ${fa(mins(a.rec.start, a.rec.end))} دقیقه` : ''}</div>` : ''}
  ${a.rec && a.rec.end ? '' : `<button class="btn big mt" onclick="startWork('${a.id}')">${a.rec ? 'ادامه تکلیف' : 'شروع تکلیف'}</button>`}</div>`;
}
function subjView() {
  const s = sj(subj), L = data.filter(a => a.subject === subj);
  return `<div class="hero up" style="background:${s.c}"><button class="link w" onclick="subj=null;render()">‹ بازگشت</button>
    <h1>${s.i} ${esc(subj)}</h1><div class="mut2">${s.d}</div></div>
    <h2>تکالیف</h2>${L.length ? L.map(aCard).join('') : '<div class="card mut">فعلاً تکلیفی نیست 🎉</div>'}
    ${examsBlock(subj)}`;
}

// ----- همیار هوشمند (چت) -----
const bubbles = () => chat.map(m => `<div class="bub ${m.b ? 'bot' : 'me'}">${esc(m.t)}</div>`).join('');
function chatView() {
  return `<div class="hero up"><h1>🤖 همیار هوشمند</h1><div class="mut2">قدم‌به‌قدم کمکت می‌کنم، نه فقط جواب نهایی</div></div>
  <div class="card up"><div id="msgs" class="msgs">${bubbles()}</div>
  <div class="row mt"><input id="ci" placeholder="سؤالت را بنویس…" onkeydown="if(event.key==='Enter')sendChat()"><button class="btn" onclick="sendChat()">ارسال</button></div>
  <button class="btn ghost mt" id="more" onclick="moreChat()" ${lq && st < 3 ? '' : 'hidden'}>هنوز نفهمیدم، راهنمایی بعدی</button></div>`;
}
function sendChat() { const q = $('#ci').value.trim(); if (!q) return; lq = q; st = 0; chat.push({ t: q }); ask1(q, 0); }
function moreChat() { st++; ask1(lq, st); }
async function ask1(q, step) {
  try {
    const r = await api('/chat', 'POST', { q, step });
    chat.push({ b: 1, t: (step < 3 ? '💡 راهنمایی ' + fa(step + 1) : '📘 توضیح کامل') + ` (${r.topic}): ` + r.reply });
  } catch (e) { chat.push({ b: 1, t: e.message }); }
  $('#msgs').innerHTML = bubbles(); $('#ci').value = ''; $('#more').hidden = !(lq && st < 3); $('#msgs').scrollTop = 1e9;
}

// ----- پروفایل -----
function meView() {
  const done = data.filter(a => a.rec && a.rec.end).length;
  return `<div class="hero up" style="text-align:center"><div class="av">${esc(me.name[0])}</div><h1>${esc(me.name)}</h1><div class="mut2">دانش‌آموز پایه ششم · همیار درس</div></div>
  <div class="stats"><div class="card"><b>${fa(data.length)}</b>تکلیف</div><div class="card"><b>${fa(done)}</b>انجام‌شده</div><div class="card"><b>${fa(data.length - done)}</b>باقی‌مانده</div></div>
  ${gradesBlock()}<button class="btn ghost big" onclick="logout()">خروج از حساب</button>`;
}
