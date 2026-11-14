/* قِطاف — تقارير المعلم القابلة للطباعة والحفظ PDF */
(function () {
  const AD = '٠١٢٣٤٥٦٧٨٩';
  const A = x => String(x).replace(/\d/g, d => AD[d]).replace(/%/g, '٪');
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = r => r == null ? '—' : A(Math.round(r * 100) + '%');
  const CATN = { ok: 'متميز', mid: 'جيد', low: 'يحتاج متابعة', none: 'لم يبدأ' };
  const CATC = { ok: 'c-ok', mid: 'c-mid', low: 'c-low', none: 'c-none' };
  const ORDER = ['ok', 'mid', 'low', 'none'];
  const today = () => {
    const d = new Date();
    let h = ''; try { h = d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }) } catch (e) {}
    return h || A(d.toLocaleDateString('en-GB'));
  };
  const MARK = document.querySelector('.brand .mark') ? document.querySelector('.brand .mark').outerHTML
    .replace(/#FFFFFF" stroke-width="6"/, '#0E5E66" stroke-width="6"').replace(/#FFFFFF" stroke-width="5"/, '#0E5E66" stroke-width="5"').replace('class="mark"', 'class="rmark"') : '';

  const head = (title, sub) => `<div class="rh">${MARK}<div class="rh-t"><div class="rh-brand">قِطاف <span>QITAF</span></div><div class="rh-school">متوسطة بدر الكبرى - خميس مشيط · رياضيات الصف الثاني المتوسط</div></div><div class="rh-meta"><b>${E(title)}</b>${sub ? `<span>${E(sub)}</span>` : ''}<span>${today()}</span></div></div>`;
  const foot = `<div class="rf"><div class="sign"><div>معلم المادة: محمد بن عبدالله بن سعيد آل سحمان</div><div>التوقيع: ..........................</div></div><div class="rf-b">قِطاف · ازرَع جهدَك، تقطف تميُّزَك بإذن الله تعالى · math.binsehman.com</div></div>`;
  const stats = list => {
    const n = list.length, entered = list.filter(s => s.tries).length, c = k => list.filter(s => s.cat === k).length;
    const avgs = list.filter(s => s.avg != null).map(s => s.avg);
    return { n, entered, ok: c('ok'), mid: c('mid'), low: c('low'), none: c('none'), avg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null };
  };
  const tiles = st => `<div class="rt">${[['عدد الطلاب', A(st.n)], ['دخلوا المنصة', A(st.entered) + ` <small>(${P(st.n ? st.entered / st.n : 0)})</small>`], ['متوسط الفصل', P(st.avg)], ['متميز', A(st.ok)], ['جيد', A(st.mid)], ['يحتاج متابعة', A(st.low)], ['لم يبدأ', A(st.none)]].map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  const sorted = list => [...list].sort((x, y) => (y.avg ?? -1) - (x.avg ?? -1) || y.tries - x.tries || String(x.name).localeCompare(y.name, 'ar'));

  function classPage(cls, list) {
    const st = stats(list);
    return `<section class="rp">${head('تقرير الفصل', cls)}${tiles(st)}
      <table class="rtab"><thead><tr><th>م</th><th>اسم الطالب</th><th>المحاولات</th><th>الدروس المنجزة</th><th>المتوسط</th><th>التصنيف</th></tr></thead><tbody>
      ${sorted(list).map((s, i) => `<tr><td>${A(i + 1)}</td><td class="nm">${E(s.name)}</td><td>${A(s.tries)}</td><td>${A(s.lessons.length)} من ${A(37)}</td><td>${P(s.avg)}</td><td><span class="chip ${CATC[s.cat]}">${CATN[s.cat]}</span></td></tr>`).join('')}
      </tbody></table>${foot}</section>`;
  }

  function studentPage(s) {
    const chapters = (typeof CH !== 'undefined' ? CH : []).map(c => {
      const rows = c.ls.map(([id, t]) => { const r = s.best[id]; return `<tr><td>${A(id)}</td><td class="nm">${E(t)}</td><td>${r == null ? '<span class="muted">لم يحل</span>' : P(r)}</td></tr>` }).join('');
      const full = s.best[`اختبار الفصل ${c.n} (كامل)`], quick = s.best[`اختبار الفصل ${c.n} (قصير)`];
      return `<div class="sch"><h4>الفصل ${A(c.n)}: ${E(c.t)}<span>اختبار الفصل: ${P(full)} · القصير: ${P(quick)}</span></h4><table class="rtab sm"><colgroup><col style="width:14%"><col><col style="width:20%"></colgroup><tbody>${rows}</tbody></table></div>`;
    }).join('');
    const rec = {
      ok: 'ما شاء الله تبارك الله، أداء متميز بتوفيق الله جل وعلا. نوصي بالاستمرار في التدريب على الاختبارات التجريبية للمحافظة على هذا المستوى.',
      mid: 'مستوى جيد، ونوصي بإعادة التدريب في الدروس التي لم تبلغ فيها الدرجة الكاملة، ليصل إلى الإتقان بإذن الله تعالى.',
      low: 'يحتاج إلى متابعة. نوصي بمشاهدة شروحات منصة عيان (ayyan.binsehman.com) ثم إعادة التدريب على منصة قِطاف، والله الموفق.',
      none: 'لم يدخل الطالب المنصة بعد. نرجو حثّه على الدخول ببريده المدرسي عبر math.binsehman.com والتدرّب استعدادًا للاختبار التحصيلي.'
    }[s.cat];
    return `<section class="rp">${head('تقرير الطالب', s.cls)}
      <div class="sinfo"><div><span>اسم الطالب</span><b>${E(s.name)}</b></div><div><span>الفصل</span><b>${E(s.cls)}</b></div><div><span>المتوسط</span><b>${P(s.avg)}</b></div><div><span>التصنيف</span><b><span class="chip ${CATC[s.cat]}">${CATN[s.cat]}</span></b></div><div><span>المحاولات</span><b>${A(s.tries)}</b></div><div><span>الدروس المنجزة</span><b>${A(s.lessons.length)} من ${A(37)}</b></div></div>
      <div class="rec"><b>التوصية:</b> ${rec}</div>
      <div class="chs">${chapters}</div>${foot}</section>`;
  }

  function adminPage(all) {
    const classes = [...new Set(all.map(s => s.cls))].sort();
    const rows = classes.map(c => [c, stats(all.filter(s => s.cls === c))]);
    const tot = stats(all);
    const bar = (st) => `<div class="stack">${ORDER.map(k => st[k] ? `<i class="${CATC[k]}" style="width:${st[k] / st.n * 100}%" title="${CATN[k]}">${A(st[k])}</i>` : '').join('')}</div>`;
    const top = sorted(all.filter(s => s.avg != null)).slice(0, 10);
    return `<section class="rp">${head('التقرير الإحصائي للإدارة', 'الفصول الثلاثة')}${tiles(tot)}
      <table class="rtab"><thead><tr><th>الفصل</th><th>الطلاب</th><th>دخلوا</th><th>نسبة الدخول</th><th>المتوسط</th><th style="width:38%">توزيع التصنيف</th></tr></thead><tbody>
      ${rows.map(([c, st]) => `<tr><td class="nm">${E(c)}</td><td>${A(st.n)}</td><td>${A(st.entered)}</td><td>${P(st.n ? st.entered / st.n : 0)}</td><td>${P(st.avg)}</td><td>${bar(st)}</td></tr>`).join('')}
      </tbody></table>
      <div class="legend">${ORDER.map(k => `<span><i class="${CATC[k]}"></i>${CATN[k]}</span>`).join('')}</div>
      <h3 class="rh3">أعلى عشرة طلاب متوسطًا</h3>
      <table class="rtab"><thead><tr><th>م</th><th>اسم الطالب</th><th>الفصل</th><th>المتوسط</th><th>المحاولات</th></tr></thead><tbody>
      ${top.length ? top.map((s, i) => `<tr><td>${A(i + 1)}</td><td class="nm">${E(s.name)}</td><td>${E(s.cls)}</td><td>${P(s.avg)}</td><td>${A(s.tries)}</td></tr>`).join('') : '<tr><td colspan="5">لا توجد نتائج بعد.</td></tr>'}
      </tbody></table>${foot}</section>`;
  }

  window.buildReport = function (kind, cls) {
    const all = (window.getStudents ? window.getStudents() : []);
    const scope = cls ? all.filter(s => s.cls === cls) : all;
    const classes = [...new Set(scope.map(s => s.cls))].sort();
    let html = '';
    if (kind === 'admin') html = adminPage(all);
    if (kind === 'class' || kind === 'both') html += classes.map(c => classPage(c, scope.filter(s => s.cls === c))).join('');
    if (kind === 'students' || kind === 'both') html += classes.map(c => sorted(scope.filter(s => s.cls === c)).map(studentPage).join('')).join('');
    const box = document.getElementById('print');
    box.innerHTML = html;
    document.title = 'قطاف - ' + ({ admin: 'التقرير الإحصائي', class: 'تقرير الفصول', students: 'تقارير الطلاب', both: 'التقرير الشامل' }[kind]) + (cls ? ' - ' + cls : '');
    setTimeout(() => window.print(), 300);
  };
})();
