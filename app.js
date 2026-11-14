/* جاهز للتحصيلي — منطق البرنامج */
const app = document.getElementById('app');
const SKEY = 'math2-student', PKEY = 'math2-progress', QKEY = 'math2-queue';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
let student = load(SKEY, null);
let progress = load(PKEY, {});
let timerId = null;

const READY = Object.keys(L);
const lessonTitle = id => { for (const c of CH) for (const [i, t] of c.ls) if (i === id) return t; return id };
const chapterOf = id => CH.find(c => c.ls.some(l => l[0] === id));
const clean = s => s.replace(/سهيل/g, 'أحد الطلاب');
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };

/* ---------- الاتصال بجدول Google ---------- */
async function api(params) {
  if (!API_URL) return { ok: false, error: 'no_api' };
  const r = await fetch(API_URL + '?' + new URLSearchParams(params), { redirect: 'follow' });
  return r.json();
}
async function flush() {
  if (!API_URL || !student) return;
  let q = load(QKEY, []);
  while (q.length) {
    try { const r = await api({ action: 'record', ...q[0] }); if (!r.ok && r.error !== 'bad_data') break; }
    catch (e) { break }
    q.shift(); store(QKEY, q);
  }
}
async function record(lesson, score, total) {
  const key = lesson;
  const prev = progress[key];
  progress[key] = { best: Math.max(prev?.best ?? 0, score), total };
  store(PKEY, progress);
  if (!API_URL) return 'local';
  const q = load(QKEY, []); q.push({ email: student.email, lesson, score, total }); store(QKEY, q);
  await flush();
  return load(QKEY, []).length ? 'pending' : 'saved';
}
const syncText = s => s === 'saved' ? '✓ أُرسلت نتيجتك إلى معلمك' : s === 'pending' ? 'لم تُرسل النتيجة بعد، وستُرسل تلقائيًّا عند عودة الاتصال' : 'وضع التجربة: النتيجة محفوظة في جهازك فقط';

/* ---------- الدخول ---------- */
function header() {
  const w = document.getElementById('who');
  w.innerHTML = student ? `${esc(student.name || student.email)}${student.cls ? ' · ' + esc(student.cls) : ''} <button id="out">خروج</button>` : '';
  if (student) w.querySelector('#out').onclick = () => { student = null; store(SKEY, null); progress = {}; store(PKEY, {}); location.hash = ''; route() };
}
function viewLogin() {
  app.innerHTML = `<div class="login card">
    <h2>أهلًا بك</h2>
    <p class="muted">ادخل ببريدك الإلكتروني المسجّل عند معلمك، لتُحفظ نتائجك باسمك.</p>
    <label for="em">البريد الإلكتروني</label>
    <input id="em" type="email" autocomplete="email" placeholder="name@example.com">
    <button class="btn pri" id="go" style="width:100%">دخول</button>
    <div id="m"></div>
  </div>`;
  const em = app.querySelector('#em'), go = app.querySelector('#go'), m = app.querySelector('#m');
  const submit = async () => {
    const email = em.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { m.innerHTML = '<div class="msg bad">اكتب بريدًا إلكترونيًّا صحيحًا.</div>'; return }
    go.disabled = true; go.textContent = 'جارٍ التحقق…';
    try {
      const r = await api({ action: 'check', email });
      if (r.ok) { student = { email, name: r.name, cls: r.cls }; }
      else if (r.error === 'no_api') { student = { email, name: '', cls: '' }; }
      else { m.innerHTML = '<div class="msg bad">هذا البريد غير مسجّل. تأكد من كتابته كما سلّمته لمعلمك.</div>'; go.disabled = false; go.textContent = 'دخول'; return }
      store(SKEY, student); route();
    } catch (e) {
      m.innerHTML = '<div class="msg bad">تعذّر الاتصال. تأكد من الإنترنت ثم حاول مرة أخرى.</div>'; go.disabled = false; go.textContent = 'دخول';
    }
  };
  go.onclick = submit; em.onkeydown = e => { if (e.key === 'Enter') submit() };
  if (!API_URL) m.innerHTML = '<div class="msg info">البرنامج في وضع التجربة: لن تُرسل النتائج إلى المعلم بعد.</div>';
}

/* ---------- الرئيسية ---------- */
function mark(id) {
  const p = progress[id]; if (!p) return '';
  const r = p.best / p.total, cls = r >= .85 ? 'ok' : r >= .6 ? 'mid' : 'lo';
  return `<span class="mark ${cls}">${p.best}/${p.total}</span>`;
}
/* كل فصل من الكتاب وحدة مستقلة: دروسه، واختباره الكامل، واختباره القصير */
const readyIn = c => c.ls.map(l => l[0]).filter(i => L[i]);
const testsOf = c => {
  const n = readyIn(c).reduce((s, i) => s + L[i].quiz.length, 0);
  return [
    { id: c.n + '-full', key: `اختبار الفصل ${c.n} (كامل)`, name: 'اختبار الفصل الكامل', note: `${n} سؤالًا من كل دروس الفصل`, n: 0, mins: Math.max(10, Math.ceil(n * 1.3)) },
    { id: c.n + '-quick', key: `اختبار الفصل ${c.n} (قصير)`, name: 'اختبار تجريبي قصير', note: `${Math.min(10, n)} أسئلة عشوائية من الفصل`, n: 10, mins: 15 }
  ];
};
function chapterDone(c) { const ids = readyIn(c); return ids.filter(i => progress[i] && progress[i].best / progress[i].total >= .6).length }
function viewHome() {
  app.innerHTML = `
  <div class="sec-h"><h2>فصول الكتاب</h2><span class="muted">اختر الفصل، ولكل فصل دروسه واختباراته</span></div>
  <div class="tests">${CH.map(c => { const ids = readyIn(c); return `
   <button class="card test" ${ids.length ? `data-c="${c.n}"` : 'disabled style="opacity:.55;cursor:default"'}>
    <span style="font-family:var(--head);color:var(--brand);font-weight:800">الفصل ${c.n}</span><b>${c.t}</b>
    <span>${ids.length ? `${c.ls.length} دروس · أنجزت ${chapterDone(c)} منها` : 'قريبًا'}</span></button>` }).join('')}</div>`;
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => location.hash = 'c-' + b.dataset.c);
}
function viewChapter(n) {
  const c = CH.find(x => x.n === n); if (!c || !readyIn(c).length) { location.hash = ''; return }
  app.innerHTML = `<button class="back" id="bk">→ فصول الكتاب</button>
  <div class="ltitle"><span class="k">الفصل ${c.n}</span><h2>${c.t}</h2></div>
  <div class="sec-h"><h2>الدروس</h2><span class="muted">قانون، ومثال، وخطأ شائع، وأسئلة</span></div>
  <div class="card chap"><ul style="padding-top:8px">${c.ls.map(([id, t]) => `<li><button ${L[id] ? `data-l="${id}"` : 'disabled'}><span class="num">${id}</span><span class="tt">${t}</span>${L[id] ? mark(id) : '<span class="mark" style="background:var(--sunk);color:var(--muted)">قريبًا</span>'}</button></li>`).join('')}</ul></div>
  <div class="sec-h"><h2>اختبارات الفصل</h2><span class="muted">بتوقيت مثل اختبار الإدارة</span></div>
  <div class="tests">${testsOf(c).map(t => `<button class="card test" data-t="${t.id}"><b>${t.name}</b><span>${t.note} · ${t.mins} دقيقة</span>${progress[t.key] ? `<span>أفضل نتيجة: ${mark(t.key)}</span>` : ''}</button>`).join('')}</div>`;
  app.querySelector('#bk').onclick = () => location.hash = '';
  app.querySelectorAll('[data-l]').forEach(b => b.onclick = () => location.hash = 'l-' + b.dataset.l);
  app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => location.hash = 't-' + b.dataset.t);
}

/* ---------- الأسئلة ---------- */
function quiz(qs, onDone, showFrom) {
  const box = document.createElement('div'), pick = {};
  box.innerHTML = qs.map((q, i) => `<div class="q" data-q="${i}"><div class="qt"><span class="k">${i + 1}</span><div>${q.q}${showFrom ? `<span class="from">من الدرس ${q.id}</span>` : ''}</div></div>
    <div class="opts">${q.o.map((o, j) => `<button class="opt" data-j="${j}">${'أبجد'[j]}) ${o}</button>`).join('')}</div><div class="why" hidden></div></div>`).join('') +
    `<div class="bar-row"><button class="btn pri" id="sub" disabled>صحّح إجاباتي</button><span class="muted" id="left">بقي ${qs.length}</span></div>`;
  const sub = box.querySelector('#sub');
  box.querySelectorAll('.q').forEach(qd => qd.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    qd.querySelectorAll('.opt').forEach(x => x.classList.remove('pick')); b.classList.add('pick'); pick[qd.dataset.q] = +b.dataset.j;
    const n = Object.keys(pick).length; sub.disabled = n < qs.length; box.querySelector('#left').textContent = n < qs.length ? `بقي ${qs.length - n}` : 'جاهز للتصحيح';
  }));
  const grade = () => {
    let sc = 0; const per = [];
    box.querySelectorAll('.q').forEach(qd => {
      const i = +qd.dataset.q, q = qs[i], ok = pick[i] === q.a; if (ok) sc++; per.push(ok);
      qd.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; x.classList.remove('pick'); if (j === q.a) x.classList.add('right'); else if (j === pick[i]) x.classList.add('wrong') });
      const w = qd.querySelector('.why'); w.hidden = false; w.innerHTML = (ok ? '✓ ' : '✗ ') + q.why;
    });
    sub.parentElement.remove(); onDone(sc, per, box);
  };
  sub.onclick = grade; box.grade = grade;
  return box;
}

/* ---------- الدرس ---------- */
function viewLesson(id) {
  const d = L[id], c = chapterOf(id), g = d.bug;
  const fix = g.fixes.find(f => f.ok).t;
  app.innerHTML = `<button class="back" id="bk">→ كل الدروس</button>
  <div class="ltitle"><span class="k">الفصل ${c.n} · الدرس ${id}</span><h2>${lessonTitle(id)}</h2><p>${d.idea}</p></div>
  <div class="box rule"><span class="k">القانون</span>${d.concept.words}
    <div class="rows">${d.concept.rows.map(r => `<div><small>${r[0]}</small>${r[1]}</div>`).join('')}</div></div>
  <div class="vocab">${d.vocab.map(v => `<span>${v}</span>`).join('')}</div>
  <div class="box warn"><span class="k">انتبه: خطأ شائع</span>${clean(g.intro)}
    <div class="wrong"><span class="ic">✗</span><div>${g.steps[g.wrong]}</div></div>
    <div class="right"><span class="ic">✓</span><div>${fix}</div></div>
    <p style="margin:8px 0 0">${clean(g.why)}</p></div>
  <div class="sec-h"><h2>تدرّب</h2><span class="muted">أسئلة بصيغة الاختبار التحصيلي</span></div><div id="qz"></div>`;
  app.querySelector('#bk').textContent = `→ دروس الفصل ${c.n}`;
  app.querySelector('#bk').onclick = () => location.hash = 'c-' + c.n;
  const qz = app.querySelector('#qz');
  qz.appendChild(quiz(d.quiz, async (sc, per, box) => {
    const s = document.createElement('div'); s.className = 'score';
    s.innerHTML = `<b>${sc} / ${d.quiz.length}</b><span>${sc === d.quiz.length ? 'إتقان كامل!' : sc >= 2 ? 'جيد. راجع السؤال الذي أخطأت فيه.' : 'راجع القانون والخطأ الشائع ثم أعد المحاولة.'}</span><span class="sync muted">جارٍ الحفظ…</span><span style="flex:1"></span><button class="btn" id="ag">أعد المحاولة</button>`;
    box.prepend(s); s.querySelector('#ag').onclick = () => viewLesson(id);
    const ids = readyIn(c), i = ids.indexOf(id), nxt = ids[i + 1];
    const nx = document.createElement('div'); nx.className = 'bar-row';
    nx.innerHTML = nxt ? `<button class="btn pri">الدرس التالي: ${lessonTitle(nxt)} ←</button>` : `<button class="btn pri">اختبار الفصل ${c.n} ←</button>`;
    nx.firstChild.onclick = () => location.hash = nxt ? 'l-' + nxt : 'c-' + c.n; box.appendChild(nx);
    s.querySelector('.sync').textContent = syncText(await record(id, sc, d.quiz.length));
  }));
}

/* ---------- الاختبار التجريبي ---------- */
function viewTest(tid) {
  const c = CH.find(x => x.n === +tid.split('-')[0]);
  const t = c && testsOf(c).find(x => x.id === tid); if (!t || !readyIn(c).length) { location.hash = ''; return }
  let qs = []; readyIn(c).forEach(id => L[id].quiz.forEach(q => qs.push({ ...q, id })));
  qs = shuffle(qs); if (t.n) qs = qs.slice(0, t.n);
  app.innerHTML = `<button class="back" id="bk">→ الفصل ${c.n}</button>
  <div class="ltitle"><span class="k">الفصل ${c.n}: ${c.t}</span><h2>${t.name}</h2><p>${qs.length} سؤالًا · ${t.mins} دقيقة. يُصحَّح الاختبار تلقائيًّا عند انتهاء الوقت.</p></div>
  <div class="timer" style="margin-top:14px"><span>الوقت المتبقي</span><b id="clock"></b></div><div id="qz"></div>`;
  app.querySelector('#bk').onclick = () => location.hash = 'c-' + c.n;
  let left = t.mins * 60; const clock = app.querySelector('#clock');
  const tick = () => { const m = Math.floor(left / 60), s = left % 60; clock.textContent = `${m}:${String(s).padStart(2, '0')}`; clock.classList.toggle('low', left < 120) };
  const box = quiz(qs, async (sc, per, b) => {
    clearInterval(timerId); app.querySelector('.timer').remove();
    const by = {}; qs.forEach((q, i) => { by[q.id] = by[q.id] || [0, 0]; by[q.id][1]++; if (per[i]) by[q.id][0]++ });
    const ids = Object.keys(by).sort();
    const weak = ids.filter(i => by[i][0] / by[i][1] < .6);
    const r = document.createElement('div');
    r.innerHTML = `<div class="score"><b>${sc} / ${qs.length}</b><span>${Math.round(sc / qs.length * 100)}٪</span><span class="sync muted">جارٍ الحفظ…</span></div>
    <h3>نتيجتك في كل درس</h3>
    <div class="rep">${ids.map(i => { const [a, n] = by[i], x = a / n; return `<div><span>${i} ${lessonTitle(i)}</span><span class="meter"><i class="${x < .5 ? 'lo' : x < .85 ? 'mid' : ''}" style="width:${x * 100}%"></i></span><span>${a}/${n}</span></div>` }).join('')}</div>
    ${weak.length ? `<p>راجع هذه الدروس: ${weak.map(i => `<a href="#l-${i}">${lessonTitle(i)}</a>`).join('، ')}</p>` : '<p>أداء ممتاز في كل الدروس.</p>'}`;
    b.prepend(r); scrollTo({ top: 0, behavior: 'smooth' });
    r.querySelector('.sync').textContent = syncText(await record(t.key, sc, qs.length));
  }, true);
  app.querySelector('#qz').appendChild(box);
  tick(); clearInterval(timerId);
  timerId = setInterval(() => { left--; tick(); if (left <= 0) { clearInterval(timerId); box.grade() } }, 1000);
}

/* ---------- التنقل ---------- */
function route() {
  clearInterval(timerId); header();
  if (!student) { viewLogin(); return }
  const h = location.hash.slice(1);
  if (h.startsWith('c-')) viewChapter(+h.slice(2));
  else if (h.startsWith('l-') && L[h.slice(2)]) viewLesson(h.slice(2));
  else if (h.startsWith('t-')) viewTest(h.slice(2));
  else viewHome();
  scrollTo({ top: 0 });
}
addEventListener('hashchange', () => {
  if (timerId && !confirm('سيُلغى الاختبار إن خرجت الآن. هل تريد الخروج؟')) return;
  route();
});
route(); flush();
