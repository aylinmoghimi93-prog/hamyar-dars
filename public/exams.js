// بخش ۲: آزمون، نمره و امتیاز (این فایل آخر از همه بارگذاری می‌شود)
let exData = [], takeExam = null, exAns = [], exRes = null, exForm = false;

// هر بار داده‌ها بارگذاری می‌شوند، آزمون‌ها هم گرفته شوند
const _load = load;
load = async () => { exData = await api(me.role === 'teacher' ? '/teacher/exams' : '/exams'); await _load(); };

// ---------- دانش‌آموز ----------
function examsBlock(sub) {
  const L = exData.filter(e => e.subject === sub);
  return '<h2>آزمون‌ها</h2>' + (L.length ? L.map(e => `<div class="card up"><div class="row"><h3>📝 ${esc(e.title)}</h3>
    ${e.result ? `<span class="tag ${e.result.score >= 50 ? 't-done' : 't-part'}">${fa(e.result.score)}٪</span>` : ''}</div>
    <div class="mut">${fa(e.n)} سؤال${e.result && !e.result.graded ? ` · ${fa(e.result.correct)} پاسخ درست · ⭐ ${fa(e.result.correct * 10)} امتیاز` : ''}${e.result && e.result.graded ? ' · نمره را معلم ثبت کرده' : ''}</div>
    ${e.result ? '' : `<button class="btn big mt" onclick="openExam('${e.id}')">شروع آزمون</button>`}</div>`).join('') : '<div class="card mut">آزمونی ثبت نشده است.</div>');
}
function openExam(id) { run(async () => { takeExam = await api('/exams/' + id); exAns = []; exRes = null; render(); }); }
function pick(i, j) { exAns[i] = j; render(); }
function closeExam() { takeExam = null; exRes = null; run(load); }
function submitExam() {
  const n = takeExam.questions.length, answers = [...Array(n)].map((_, i) => exAns[i] ?? -1);
  if (answers.includes(-1) && !confirm('به بعضی سؤال‌ها جواب نداده‌ای. ثبت شود؟')) return;
  run(async () => { exRes = await api(`/exams/${takeExam.id}/submit`, 'POST', { answers }); render(); });
}
const _sv = studentView;
studentView = () => takeExam ? examView() : _sv();
function examView() {
  const e = takeExam;
  if (exRes) {
    const r = exRes, face = r.score >= 80 ? '🏆' : r.score >= 50 ? '👏' : '💪';
    return `<div class="hero up" style="text-align:center"><div style="font-size:48px">${face}</div><h1>${fa(r.score)}٪</h1>
      <div class="mut2">${fa(r.correct)} پاسخ درست از ${fa(r.total)} · ⭐ ${fa(r.correct * 10)} امتیاز</div></div>
      ${r.review.map((q, i) => `<div class="card"><b>${fa(i + 1)}. ${esc(q.q)}</b>${q.opts.map((o, j) =>
        `<div class="opt ${j === q.ans ? 'ok' : j === q.mine ? 'no' : ''}">${esc(o)}${j === q.ans ? ' ✅' : j === q.mine ? ' ❌' : ''}</div>`).join('')}</div>`).join('')}
      <button class="btn big" onclick="closeExam()">بازگشت</button>`;
  }
  return `<button class="link" onclick="closeExam()">‹ بازگشت</button><div class="hero"><h1>📝 ${esc(e.title)}</h1><div class="mut2">${esc(e.subject)} · ${fa(e.questions.length)} سؤال</div></div>
    ${e.questions.map((q, i) => `<div class="card"><b>${fa(i + 1)}. ${esc(q.q)}</b>${q.opts.map((o, j) =>
      `<button class="opt ${exAns[i] === j ? 'sel' : ''}" onclick="pick(${i},${j})">${esc(o)}</button>`).join('')}</div>`).join('')}
    <button class="btn ok big" onclick="submitExam()">ثبت پاسخ‌ها</button>`;
}
function gradesBlock() {
  const R = exData.filter(e => e.result);
  const avg = R.length ? Math.round(R.reduce((a, e) => a + e.result.score, 0) / R.length) : 0, pts = R.reduce((a, e) => a + e.result.correct * 10, 0);
  return '<h2>نمره‌ها</h2>' + (R.length ? `<div class="stats" style="grid-template-columns:1fr 1fr"><div class="card"><b>${fa(avg)}٪</b>میانگین</div><div class="card"><b>⭐ ${fa(pts)}</b>امتیاز</div></div>` +
    R.map(e => `<div class="card row"><span>${esc(e.subject)} · ${esc(e.title)}</span><b>${fa(e.result.score)}٪</b></div>`).join('') : '<div class="card mut">هنوز آزمونی نداده‌ای.</div>') + '<div class="mt"></div>';
}

// ---------- معلم ----------
const _tv = teacherView;
teacherView = () => _tv() + examTeacher();
const qBlock = i => `<div class="card qb"><b>سؤال ${fa(i)}</b><input class="qq mt" placeholder="متن سؤال">
  <div class="grid mt">${[1, 2, 3, 4].map(n => `<input class="qo" placeholder="گزینه ${fa(n)}">`).join('')}</div>
  <label class="mt">گزینه درست<select class="qa" style="width:100%">${[0, 1, 2, 3].map(n => `<option value="${n}">گزینه ${fa(n + 1)}</option>`).join('')}</select></label></div>`;
function addQ() { const b = $('#qbs'); b.insertAdjacentHTML('beforeend', qBlock(b.children.length + 1)); }
function saveExam() {
  const questions = [...document.querySelectorAll('.qb')].map(b => ({ q: b.querySelector('.qq').value, opts: [...b.querySelectorAll('.qo')].map(x => x.value), ans: +b.querySelector('.qa').value }));
  run(async () => { await api('/exams', 'POST', { subject: $('#es').value, title: $('#et').value, questions }); exForm = false; await load(); });
}
function setGrade(eid, sid) {
  const v = $('#g' + eid + sid).value; if (v === '') { alert('نمره را بنویسید.'); return; }
  run(async () => { await api(`/exams/${eid}/grade/${sid}`, 'POST', { score: v }); await load(); });
}
function examTeacher() {
  let h = `<h2>آزمون‌ها و نمره‌ها</h2><button class="btn ghost big" onclick="exForm=!exForm;render()">${exForm ? 'بستن فرم' : '＋ ساخت آزمون'}</button>`;
  if (exForm) h += `<div class="card mt"><label>درس<select id="es" style="width:100%">${SUBJ.map(s => `<option>${s.n}</option>`).join('')}</select></label>
    <div class="mt"><label>عنوان آزمون<input id="et" placeholder="مثلاً آزمون فصل ۲"></label></div><div id="qbs">${qBlock(1)}${qBlock(2)}</div>
    <div class="grid mt"><button class="btn ghost" onclick="addQ()">＋ سؤال</button><button class="btn" onclick="saveExam()">ذخیره و ارسال</button></div></div>`;
  exData.forEach(e => {
    h += `<div class="card mt"><h3>📝 ${esc(e.subject)} — ${esc(e.title)}</h3>${e.rows.map(r => `<div class="stu"><div class="row"><b>${esc(r.name)}</b>
      <span class="mut">${r.done ? (r.score != null ? fa(r.score) + '٪' + (r.graded ? ' (ثبت معلم)' : '') : '') : 'پاسخ نداده'}</span></div>
      <div class="row mt"><input id="g${e.id}${r.id}" type="number" min="0" max="100" placeholder="نمره از ۱۰۰" value="${r.graded ? r.score : ''}"><button class="btn ghost" onclick="setGrade('${e.id}','${r.id}')">ثبت نمره</button></div></div>`).join('')}</div>`;
  });
  return h;
}
