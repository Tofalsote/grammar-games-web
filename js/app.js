/* Grammar Games: interfaz, motor de ejercicios, minijuegos, puntos, logros, voz y chuleta. */
(function () {
  'use strict';

  const { UNITS, EXTRAS, VERBS, RAIN, SWIPE } = window.CONTENT;

  /* ---------- utilidades ---------- */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  /* Comparación tolerante: mayúsculas, espacios, apóstrofos tipográficos y punto final. */
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.!?,;:]+$/, '');
  const noHints = (s) => s.replace(/\s*\([^)]*\)/g, '').trim();
  /* La CSP no deja estilos en línea en el HTML: los anchos se aplican desde aquí. */
  function dataStyles(root) {
    for (const x of $$('[data-w]', root)) x.style.width = x.dataset.w + '%';
  }

  /* El almacenamiento del navegador puede no estar disponible: la página funciona igual sin él. */
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('gg.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('gg.' + k, JSON.stringify(v));
      } catch (e) {}
    },
    clear() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('gg.') && k !== 'gg.theme')
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) {}
    },
  };
  const asSet = (k) => {
    const v = store.get(k, []);
    return new Set(Array.isArray(v) ? v : []);
  };
  const asObj = (k) => {
    const v = store.get(k, {});
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  };

  /* ---------- índices del contenido ---------- */

  const LESSONS = [];
  const EX = new Map();
  for (const u of UNITS) {
    u.lessons.forEach((l, i) => {
      l.unit = u;
      l.idx = i;
      l.ex.forEach((e, j) => {
        e.id = l.id + '-' + j;
        e.lesson = l;
        EX.set(e.id, e);
      });
      LESSONS.push(l);
    });
    for (const g of u.games) g.unit = u;
  }
  const GAMES = UNITS.flatMap((u) => u.games).concat(EXTRAS);
  const SEC = { grammar: ['01', 'Grammar', 'G'], vocab: ['02', 'Vocabulary', 'V'], writing: ['03', 'Writing', 'W'] };
  const DICT = [...new Set(LESSONS.flatMap((l) => l.examples))].filter((s) => !/\d/.test(s));

  /* ---------- estado ---------- */

  let done = asSet('done');
  let answered = asSet('answered');
  let mistakes = asSet('mistakes');
  let badges = asSet('badges');
  let best = asObj('best');
  let hunts = asObj('hunts');
  let xp = Number(store.get('xp', 0)) || 0;
  let streak = 0;
  const closed = asSet('closed');

  let stopView = null; /* limpia temporizadores del juego abierto */
  let keyHandler = null; /* teclas de la vista abierta */

  const RANKS = [
    [0, 'Starter'],
    [80, 'Beginner'],
    [200, 'Learner'],
    [380, 'Speaker'],
    [600, 'Talker'],
    [900, 'Storyteller'],
    [1250, 'Wordsmith'],
    [1700, 'Grammar Ninja'],
    [2300, 'Bookworm'],
    [3000, 'Shakespeare'],
  ];

  const BADGES = [
    { id: 'first', icon: '✏️', name: 'Primer paso', how: 'Responde tu primera pregunta.' },
    { id: 'perfect', icon: '🧠', name: 'De memoria', how: 'Completa una lección sin fallos ni pistas.' },
    { id: 'streak', icon: '🔥', name: 'Racha de 10', how: 'Acierta 10 preguntas seguidas a la primera.' },
    { id: 'u1', icon: '☕', name: 'Unit 1 superada', how: 'Completa las 6 lecciones de la unidad 1.' },
    { id: 'u2', icon: '🏙️', name: 'Unit 2 superada', how: 'Completa las 6 lecciones de la unidad 2.' },
    { id: 'u3', icon: '✈️', name: 'Unit 3 superada', how: 'Completa las 6 lecciones de la unidad 3.' },
    { id: 'all', icon: '👑', name: 'Inglés I completo', how: 'Completa las 18 lecciones.' },
    { id: 'rush', icon: '⏱️', name: 'Hora punta', how: 'Acierta 12 preguntas en un contrarreloj.' },
    { id: 'hunt', icon: '🔎', name: 'Ojo de lince', how: 'Corrige todos los errores de un texto.' },
    { id: 'huntall', icon: '🕵️', name: 'Detective', how: 'Corrige los tres textos de la caza de errores.' },
    { id: 'forge', icon: '⚒️', name: 'Herrero', how: 'Encadena 15 verbos seguidos en la Forja.' },
    { id: 'rain', icon: '☔', name: 'Bajo la lluvia', how: 'Salva 20 frases en la Lluvia de preposiciones.' },
    { id: 'swipe', icon: '🎩', name: 'Muy formal', how: 'Acierta 15 en Formal o informal.' },
    { id: 'review', icon: '🩹', name: 'Cuentas saldadas', how: 'Vacía tu lista de repaso de fallos.' },
    { id: 'listen', icon: '🎧', name: 'Buen oído', how: 'Acierta un dictado.' },
  ];

  const CHEERS = ['Well done!', 'Great!', '¡Eso es!', 'Perfect.', '¡Clavado!', 'Nice one!', 'Brilliant!', 'Así se hace.'];
  const OOPS = ['No es eso.', 'Casi…', 'Mmm, no.', 'Otra vez.'];

  const el = {
    sidebar: $('#sidebar'),
    stage: $('#stage'),
    toasts: $('#toasts'),
  };

  const PARROT =
    '<svg class="parrot" viewBox="0 0 64 64" aria-hidden="true">' +
    '<path class="p-tail" d="M24 50 15 63l13-7z"/>' +
    '<path class="p-crest" d="M27 18c-3-9 3-15 8-15-2 5 0 9 3 12z"/>' +
    '<ellipse class="p-body" cx="32" cy="36" rx="16" ry="20"/>' +
    '<ellipse class="p-belly" cx="35" cy="43" rx="8.5" ry="11"/>' +
    '<path class="p-wing" d="M21 30c-7 13-2 21 5 24 0-9 1-16-5-24z"/>' +
    '<circle class="p-eye" cx="37" cy="25" r="5.2"/>' +
    '<circle class="p-pupil" cx="38.200" cy="25" r="2.400"/>' +
    '<path class="p-beak" d="M43 27c9 0 11 6 8 12-1-5-5-6-9-6z"/>' +
    '</svg>';

  /* ---------- voz (síntesis del navegador, sin conexión a ningún servidor de la web) ---------- */

  const Voice = {
    ok: false,
    voice: null,
    on: store.get('voice', true) !== false,
    init() {
      if (!('speechSynthesis' in window)) return this.ui();
      const choose = () => {
        let list = [];
        try {
          list = speechSynthesis.getVoices();
        } catch (e) {}
        const en = list.filter((v) => /^en([-_]|$)/i.test(v.lang));
        this.voice = en.find((v) => /en[-_]GB/i.test(v.lang)) || en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
        this.ok = !!this.voice;
        this.ui();
      };
      choose();
      try {
        speechSynthesis.addEventListener('voiceschanged', choose);
      } catch (e) {}
    },
    ui() {
      document.body.classList.toggle('no-voice', !this.ok);
      const b = $('#btnVoice');
      b.textContent = this.on ? '🔊' : '🔇';
      b.setAttribute('aria-pressed', String(this.on));
      b.title = this.on ? 'Voz en inglés: activada' : 'Voz en inglés: desactivada';
    },
    say(text, rate = 0.92, force = false) {
      if (!this.ok || (!this.on && !force) || !text) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = this.voice;
        u.lang = this.voice.lang;
        u.rate = rate;
        speechSynthesis.speak(u);
      } catch (e) {}
    },
  };

  /* ---------- puntos, rangos y logros ---------- */

  function rankOf(v) {
    let i = 0;
    while (i + 1 < RANKS.length && v >= RANKS[i + 1][0]) i++;
    return i;
  }
  function renderHud() {
    const i = rankOf(xp);
    const next = RANKS[i + 1];
    $('#hudLevel').textContent = i + 1;
    $('#hudRank').textContent = RANKS[i][1];
    $('#hudXp').textContent = next ? `${xp} / ${next[0]} XP` : `${xp} XP`;
    $('#hudFill').style.width = (next ? ((xp - RANKS[i][0]) / (next[0] - RANKS[i][0])) * 100 : 100) + '%';
    $('#badgeCount').textContent = `${badges.size}/${BADGES.length}`;
  }
  function addXp(n) {
    if (!n) return;
    const before = rankOf(xp);
    xp += n;
    store.set('xp', xp);
    renderHud();
    const hud = $('#hud');
    hud.classList.remove('bump');
    void hud.offsetWidth;
    hud.classList.add('bump');
    if (rankOf(xp) > before) {
      toast('⬆️', 'Subes de rango', `Ahora eres ${RANKS[rankOf(xp)][1]}`);
      confetti(70);
    }
  }
  function award(id) {
    const b = BADGES.find((x) => x.id === id);
    if (!b || badges.has(id)) return;
    badges.add(id);
    store.set('badges', [...badges]);
    toast(b.icon, 'Logro desbloqueado', b.name);
    addXp(20);
  }
  function saveBest(key, v) {
    const old = Number(best[key]) || 0;
    if (v > old) {
      best[key] = v;
      store.set('best', best);
      return true;
    }
    return false;
  }
  function toast(icon, title, text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${icon}</span><div><b>${esc(title)}</b><small>${esc(text)}</small></div>`;
    el.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3600);
  }
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#d93a24', '#ffcd38', '#2d5be3', '#12804e', '#17141f'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = pick(colors);
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.setProperty('--dx', (Math.random() * 200 - 100).toFixed(0) + 'px');
      c.style.setProperty('--rot', (Math.random() * 900 - 450).toFixed(0) + 'deg');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2300);
    }
  }
  function setMistake(id, wrong) {
    if (wrong) mistakes.add(id);
    else mistakes.delete(id);
    store.set('mistakes', [...mistakes]);
  }
  const unitDone = (u) => u.lessons.filter((l) => done.has(l.id)).length;
  function checkUnitBadges() {
    for (const u of UNITS) if (unitDone(u) === u.lessons.length) award(u.id);
    if (LESSONS.every((l) => done.has(l.id))) award('all');
  }

  /* ---------- menú lateral ---------- */

  function bestLabel(g) {
    if (g.kind === 'hunt') {
      const total = parseHunt(g.text).filter((s) => s.err).length;
      return `${(hunts[g.id] || []).length}/${total} errores`;
    }
    if (g.kind === 'review') return mistakes.size ? `${mistakes.size} ${mistakes.size === 1 ? 'pendiente' : 'pendientes'}` : 'nada pendiente';
    if (g.kind === 'dict') return 'necesita voz';
    if (g.kind === 'forge') return `récord ${Math.max(best['forge-past'] || 0, best['forge-part'] || 0)}`;
    return `récord ${best[g.id] || 0}`;
  }
  function foldHead(key, num, label, title, count) {
    const open = !closed.has(key);
    return (
      `<h2 class="nav-h"><button type="button" class="fold" data-fold="${key}" aria-expanded="${open}">` +
      `<span class="u-num">${num}</span><span class="u-txt"><b>${label}</b><span>${esc(title)}</span></span>` +
      `<span class="u-cnt">${count}</span><i aria-hidden="true">▾</i></button></h2><ol class="${open ? '' : 'closed'}">`
    );
  }
  function navGame(g, route) {
    const id = '#/g/' + g.id;
    return (
      `<li><button type="button" class="nav-item is-game${route === id ? ' active' : ''}" data-go="${id}">` +
      `<span class="tag">${g.icon}</span><span class="nav-txt">${esc(g.title)}<small>${esc(bestLabel(g))}</small></span>` +
      (g.kind === 'review' && mistakes.size ? `<span class="pill">${mistakes.size}</span>` : '') +
      `</button></li>`
    );
  }
  function renderSidebar(route) {
    let h = `<button type="button" class="nav-home${route === '#/home' ? ' active' : ''}" data-go="#/home">🏠 Portada</button>`;
    for (const u of UNITS) {
      h += foldHead(u.id, u.n, `Unit ${u.n} \\ Inglés I`, u.title, `${unitDone(u)}/${u.lessons.length}`);
      for (const l of u.lessons) {
        const id = '#/l/' + l.id;
        const s = SEC[l.sec];
        h +=
          `<li><button type="button" class="nav-item${done.has(l.id) ? ' done' : ''}${route === id ? ' active' : ''}" data-go="${id}">` +
          `<span class="tag" aria-hidden="true">${done.has(l.id) ? '✓' : s[2]}</span>` +
          `<span class="nav-txt">${esc(l.title)}<small>${l.page} \\ ${s[1]}</small></span></button></li>`;
      }
      for (const g of u.games) h += navGame(g, route);
      h += '</ol>';
    }
    h += foldHead('x', '★', 'Extra', 'Repaso y oído', '');
    for (const g of EXTRAS) h += navGame(g, route);
    h += '</ol>';
    h += `<div class="sidebar-foot"><button type="button" class="link" id="btnReset">Empezar de cero</button></div>`;
    el.sidebar.innerHTML = h;
  }

  /* ---------- router ---------- */

  function route() {
    const r = location.hash || '#/home';
    if (stopView) stopView();
    stopView = null;
    keyHandler = null;
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    document.body.classList.remove('nav-open');
    $('#btnMenu').setAttribute('aria-expanded', 'false');
    let m;
    if ((m = r.match(/^#\/l\/([\w-]+)$/)) && LESSONS.find((l) => l.id === m[1])) {
      viewLesson(LESSONS.find((l) => l.id === m[1]));
      renderSidebar(r);
    } else if ((m = r.match(/^#\/g\/([\w-]+)$/)) && GAMES.find((g) => g.id === m[1])) {
      viewGame(GAMES.find((g) => g.id === m[1]));
      renderSidebar(r);
    } else {
      viewHome();
      renderSidebar('#/home');
    }
    store.set('last', r);
    el.stage.scrollTop = 0;
    const act = $('.nav-item.active', el.sidebar);
    if (act) act.scrollIntoView({ block: 'nearest' });
  }
  const refreshNav = () => renderSidebar(location.hash || '#/home');

  /* ---------- portada ---------- */

  function nextLesson() {
    return LESSONS.find((l) => !done.has(l.id));
  }
  function viewHome() {
    const nl = nextLesson();
    const total = LESSONS.filter((l) => done.has(l.id)).length;
    let h = `<div class="home">
      <section class="cover">
        <div>
          <div class="eyebrow">Lengua extranjera \\ Inglés I \\ ${total}/${LESSONS.length} lecciones</div>
          <h1>Let's learn <em>English</em> together.</h1>
          <p>La teoría de tus tres unidades, ejercicios que se corrigen solos y minijuegos para fijarlo: tiempos verbales, pronombres, preposiciones, vocabulario y writing.</p>
          <div class="actions">
            ${
              nl
                ? `<button type="button" class="btn primary big" data-go="#/l/${nl.id}">${total ? 'Continuar' : 'Empezar'}: ${esc(nl.title)} →</button>`
                : `<button type="button" class="btn primary big" data-go="#/g/x-review">Repasar fallos →</button>`
            }
            ${mistakes.size ? `<button type="button" class="btn" data-go="#/g/x-review">🩹 ${mistakes.size} ${mistakes.size === 1 ? 'fallo' : 'fallos'} por repasar</button>` : ''}
          </div>
        </div>
        <div class="stamp" aria-hidden="true"><span><b>${UNITS.length}</b>units<br>${LESSONS.reduce((a, l) => a + l.ex.length, 0)} retos</span></div>
      </section>
      <div class="sec-title"><h2>Units</h2><span>01 \\ Grammar · 02 \\ Vocabulary · 03 \\ Writing</span></div>
      <div class="units">`;
    for (const u of UNITS) {
      const d = unitDone(u);
      const first = u.lessons.find((l) => !done.has(l.id)) || u.lessons[0];
      h += `<button type="button" class="unit-card" data-go="#/l/${first.id}">
        <span class="uc-top"><span class="uc-num">${u.n}</span><span class="uc-ico" aria-hidden="true">${u.icon}</span></span>
        <span><span class="uc-title">${esc(u.title)}</span><span class="uc-es">${esc(u.es)}</span></span>
        <span class="uc-topics">${esc(u.topics)}. Juegos: ${u.games.map((g) => esc(g.title)).join(', ')}.</span>
        <span class="uc-prog"><span class="bar g"><i data-w="${(d / u.lessons.length) * 100}"></i></span>${d}/${u.lessons.length}</span>
      </button>`;
    }
    h += `</div>
      <div class="sec-title"><h2>Cómo funciona</h2><span>how it works</span></div>
      <div class="how">
        <div><b>1 · Lee la ficha</b><p>Cada lección es una página de tus apuntes: la regla, la tabla y ejemplos que puedes escuchar con 🔊.</p></div>
        <div><b>2 · Practica</b><p>Seis tipos de reto: elegir, escribir, ordenar, cazar el error, unir parejas y clasificar. Lo que falles va al repaso.</p></div>
        <div><b>3 · Juega</b><p>Contrarreloj, caza de errores y un juego propio por unidad: verbos irregulares, preposiciones y formal o informal.</p></div>
      </div>
    </div>`;
    el.stage.innerHTML = h;
    dataStyles(el.stage);
    keyHandler = (e) => {
      if (e.key === 'Enter') {
        const b = $('.cover .btn.primary', el.stage);
        if (b) b.click();
        return true;
      }
    };
  }

  /* ---------- lección ---------- */

  function viewLesson(l) {
    const u = l.unit;
    const s = SEC[l.sec];
    el.stage.innerHTML = `<div class="lesson">
      <article class="sheet">
        <div class="sheet-head"><span><b>Unit ${u.n}</b> \\ Inglés I</span><span>${esc(u.title)}</span><span>${l.page} \\ 07</span></div>
        <div class="sheet-main">
          <span class="sec-chip ${l.sec}">${s[0]} \\ ${s[1]}</span>
          <h1>${esc(l.title)}</h1>
          <p class="kicker">${esc(l.kicker)}</p>
          <p class="es">${esc(l.es)}</p>
          <dl class="rows">${l.rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
          ${l.tip ? `<p class="tip">💡 ${esc(l.tip)}</p>` : ''}
          <div class="examples-h">Examples</div>
          <ul class="examples">${l.examples.map((x) => `<li>${esc(x)} <button type="button" class="say" data-say="${esc(x)}" aria-label="Escuchar">🔊</button></li>`).join('')}</ul>
        </div>
      </article>
      <section class="practice" id="practice" aria-label="Práctica"></section>
    </div>`;
    runSet($('#practice'), l.ex, {
      title: 'Práctica',
      mode: 'lesson',
      onFinish(res, hinted) {
        const ok = res.filter((r) => r === 'ok').length;
        const first = !done.has(l.id);
        if (first) {
          done.add(l.id);
          store.set('done', [...done]);
          addXp(30);
          toast('📗', 'Lección completada', l.title);
        }
        if (ok === res.length && !hinted) award('perfect');
        checkUnitBadges();
        if (first && unitDone(u) === u.lessons.length) confetti(90);
        refreshNav();
        const idx = LESSONS.indexOf(l);
        const nxt = LESSONS[idx + 1];
        const nextBtn =
          nxt && nxt.unit === u
            ? `<button type="button" class="btn primary" data-go="#/l/${nxt.id}">Siguiente: ${esc(nxt.title)} →</button>`
            : `<button type="button" class="btn primary" data-go="#/g/${u.games[0].id}">Jugar: ${esc(u.games[0].title)} →</button>`;
        return { ok, nextBtn };
      },
    });
  }

  /* Ejecuta una serie de ejercicios (lección o repaso) dentro de host. */
  function runSet(host, items, opts) {
    let i = 0;
    let hinted = false;
    const res = [];

    function step() {
      if (i >= items.length) return finish();
      const ex = items[i];
      let tries = 0;
      let hintedNow = false;
      let solved = false;
      host.innerHTML = `
        <div class="prac-head"><strong>${esc(opts.title)}</strong><span class="grow"></span><span class="count">${i + 1} / ${items.length}</span></div>
        <div class="pips">${items.map((_, k) => `<i class="${k < i ? res[k] : k === i ? 'now' : ''}"></i>`).join('')}</div>
        <div class="ex" id="exBox"></div>
        <div class="feedback">${PARROT}<p class="bubble" id="bubble" aria-live="polite"></p></div>
        <div class="prac-foot">
          <button type="button" class="btn" id="btnHint">💡 Pista</button>
          <span class="grow"></span>
          <button type="button" class="btn" id="btnReveal" hidden>Ver solución</button>
          <button type="button" class="btn primary" id="btnNext" hidden>Siguiente →</button>
        </div>`;
      const box = $('#exBox', host);
      const bubble = $('#bubble', host);
      const parrot = $('.parrot', host);
      const say = (cls, html) => {
        bubble.className = 'bubble ' + (cls || '');
        bubble.innerHTML = html;
      };
      const intro = opts.mode === 'review' ? `<b>Repaso</b>Pregunta de «${esc(ex.lesson.title)}» (Unit ${ex.lesson.unit.n}). Acertándola a la primera sale de la lista.` : pick(['Tú puedes.', 'Vamos allá.', 'Piénsalo con calma.', 'Fíjate en la ficha si dudas.']);
      say('', intro);

      const api = {
        reveal: null,
        keys: null,
        correct(sentence) {
          if (solved) return;
          solved = true;
          const first = tries === 0 && !hintedNow;
          res[i] = first ? 'ok' : 'meh';
          award('first');
          if (opts.mode === 'lesson') {
            if (!answered.has(ex.id)) {
              answered.add(ex.id);
              store.set('answered', [...answered]);
              addXp(first ? 10 : 4);
            }
          } else if (first) addXp(3);
          if (first) setMistake(ex.id, false);
          streak = first ? streak + 1 : 0;
          if (streak >= 10) award('streak');
          const why = ex.why ? esc(ex.why) : '';
          const spk = sentence ? ` <button type="button" class="say" data-say="${esc(sentence)}" aria-label="Escuchar">🔊</button>` : '';
          say('ok', `<b>${pick(CHEERS)}${spk}</b>${why}`);
          parrot.classList.remove('hop');
          void parrot.getBoundingClientRect();
          parrot.classList.add('hop');
          if (sentence) Voice.say(sentence);
          end();
        },
        wrong(msg) {
          if (solved) return;
          tries++;
          streak = 0;
          setMistake(ex.id, true);
          parrot.classList.remove('sad');
          void parrot.getBoundingClientRect();
          parrot.classList.add('sad');
          const extra = tries >= 2 && ex.why ? `💡 ${esc(ex.why)}` : tries >= 2 ? '' : 'Inténtalo otra vez.';
          say('bad', `<b>${esc(msg || pick(OOPS))}</b>${extra}`);
          if (tries >= 2) $('#btnReveal', host).hidden = false;
        },
      };
      function end() {
        $('#btnReveal', host).hidden = true;
        $('#btnHint', host).disabled = true;
        const nb = $('#btnNext', host);
        nb.hidden = false;
        nb.textContent = i + 1 < items.length ? 'Siguiente →' : 'Terminar →';
        nb.focus({ preventScroll: true });
      }
      $('#btnHint', host).onclick = () => {
        hinted = true;
        hintedNow = true;
        say('', `💡 ${esc(ex.why || ex.lesson.tip || ex.lesson.es)}`);
      };
      $('#btnReveal', host).onclick = () => {
        if (solved || !api.reveal) return;
        api.reveal();
        solved = true;
        res[i] = 'meh';
        setMistake(ex.id, true);
        say('bad', `<b>Esta era la buena.</b>${ex.why ? esc(ex.why) + ' ' : ''}<small>Volverá en el repaso de fallos.</small>`);
        end();
      };
      $('#btnNext', host).onclick = () => {
        i++;
        step();
      };
      mountExercise(ex, box, api);
      keyHandler = (e) => {
        if (e.key === 'Enter' && solved) {
          $('#btnNext', host).click();
          return true;
        }
        if (api.keys && !solved) return api.keys(e.key);
      };
      const first = $('input', box);
      if (first && matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
    }

    function finish() {
      keyHandler = null;
      const r = opts.onFinish(res, hinted) || {};
      const ok = r.ok != null ? r.ok : res.filter((x) => x === 'ok').length;
      const msg = ok === items.length ? '¡Todo a la primera! Impecable.' : ok >= items.length * 0.7 ? 'Muy bien. Lo que has fallado se guarda para el repaso.' : 'Repasa la ficha y vuelve a intentarlo: lo fallado está en «Repaso de fallos».';
      host.innerHTML = `
        <div class="prac-head"><strong>${esc(opts.title)}</strong><span class="grow"></span><span class="count">fin</span></div>
        <div class="pips">${res.map((x) => `<i class="${x}"></i>`).join('')}</div>
        <div class="summary">
          ${PARROT.replace('class="parrot"', 'class="parrot hop"')}
          <div class="big">${ok}/${items.length}</div>
          <p>a la primera · ${esc(msg)}</p>
          <div class="row-btns">
            <button type="button" class="btn" id="btnAgain">↺ Repetir</button>
            ${r.nextBtn || ''}
          </div>
        </div>`;
      $('#btnAgain', host).onclick = () => {
        i = 0;
        hinted = false;
        res.length = 0;
        step();
      };
      const nb = $('.btn.primary', host);
      if (nb) nb.focus({ preventScroll: true });
      keyHandler = (e) => {
        if (e.key === 'Enter' && nb) {
          nb.click();
          return true;
        }
      };
    }
    step();
  }

  /* ---------- tipos de ejercicio ---------- */

  const PROMPTS = {
    choice: 'Elige la opción correcta',
    type: 'Escribe lo que falta',
    order: 'Ordena la frase',
    fix: 'Encuentra la palabra que está mal y corrígela',
    match: 'Une cada pareja',
    sort: 'Clasifica: elige una tarjeta y después su caja',
  };
  const GAP = '<span class="gap">&nbsp;</span>';
  /* Frase completa para escucharla: solo si es inglés limpio. */
  function spoken(q, ans) {
    if (!q.includes('___') || /→|"/.test(q)) return noHints(ans);
    return noHints(q.replace('___', ans));
  }

  function mountExercise(ex, box, api) {
    const head = `<div class="ex-prompt">${esc(ex.p || PROMPTS[ex.t])}</div>`;
    ({ choice: exChoice, type: exType, order: exOrder, fix: exFix, match: exMatch, sort: exSort }[ex.t])(ex, box, api, head);
  }

  function exChoice(ex, box, api, head) {
    const q = esc(ex.q).replace('___', GAP);
    box.innerHTML = `${head}<p class="q">${q}</p><div class="opts">${ex.o
      .map((o, k) => `<button type="button" class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`)
      .join('')}</div>`;
    const opts = $$('.opt', box);
    const finish = () => {
      opts.forEach((b) => (b.disabled = true));
      opts[ex.a].classList.add('ok');
      const g = $('.gap', box);
      if (g) {
        g.textContent = ex.o[ex.a];
        g.classList.add('filled');
      }
    };
    opts.forEach((b) => {
      b.onclick = () => {
        const k = Number(b.dataset.k);
        if (k === ex.a) {
          finish();
          api.correct(spoken(ex.q, ex.o[ex.a]));
        } else {
          b.classList.add('bad');
          b.disabled = true;
          api.wrong();
        }
      };
    });
    api.keys = (key) => {
      const n = Number(key);
      if (n >= 1 && n <= opts.length) {
        if (!opts[n - 1].disabled) opts[n - 1].click();
        return true;
      }
    };
    api.reveal = finish;
  }

  function exType(ex, box, api, head) {
    const w = Math.max(...ex.a.map((a) => a.length), 4) + 2;
    const q = esc(ex.q).replace('___', '<input class="gap-in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Respuesta">');
    box.innerHTML = `${head}<p class="q">${q}</p><div class="row-btns"><button type="button" class="btn primary" id="btnCheck">Comprobar</button><span class="note keys"><kbd>Enter</kbd> para comprobar</span></div>`;
    const inp = $('.gap-in', box);
    inp.style.width = w + 'ch';
    const good = ex.a.map(norm);
    const finish = (val) => {
      inp.value = val;
      inp.readOnly = true;
      inp.classList.add('ok');
      $('#btnCheck', box).disabled = true;
    };
    const check = () => {
      const v = norm(inp.value);
      if (!v || inp.readOnly) return;
      if (good.includes(v)) {
        finish(inp.value.trim());
        api.correct(spoken(ex.q, ex.a[0]));
      } else {
        api.wrong();
        inp.select();
      }
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inp.readOnly) $('#btnNext').click();
        else check();
      }
    });
    $('#btnCheck', box).onclick = check;
    api.reveal = () => finish(ex.a[0]);
  }

  function exOrder(ex, box, api, head) {
    const words = ex.a.split(' ');
    let pool = words.map((_, k) => k);
    if (words.length > 1) {
      let tries = 0;
      do pool = shuffle(pool);
      while (pool.every((v, k) => v === k) && tries++ < 20);
    }
    let placed = [];
    let locked = false;
    const end = ex.end ? ` <span class="note">(termina en «${esc(ex.end)}»)</span>` : '';
    box.innerHTML = `${head.replace('</div>', end + '</div>')}<div class="answer-line" id="ansLine"></div><div class="tiles" id="tiles"></div>
      <div class="row-btns"><button type="button" class="btn primary" id="btnCheck" disabled>Comprobar</button><button type="button" class="btn" id="btnClear">Borrar</button></div>`;
    const line = $('#ansLine', box);
    const tiles = $('#tiles', box);
    const good = [ex.a].concat(ex.alt || []).map((s) => norm(s.replace(/,/g, '')));
    function draw() {
      line.innerHTML = placed.map((k) => `<button type="button" class="tile" data-k="${k}">${esc(words[k])}</button>`).join('');
      tiles.innerHTML = pool.map((k) => `<button type="button" class="tile" data-k="${k}">${esc(words[k])}</button>`).join('');
      $('#btnCheck', box).disabled = locked || pool.length > 0;
      $('#btnClear', box).disabled = locked || !placed.length;
      if (locked) {
        line.classList.add('ok');
        $$('.tile', box).forEach((t) => (t.disabled = true));
        if (ex.end) line.insertAdjacentHTML('beforeend', `<span class="end-mark">${esc(ex.end)}</span>`);
      }
    }
    line.onclick = (e) => {
      const t = e.target.closest('.tile');
      if (!t || locked) return;
      const k = Number(t.dataset.k);
      placed = placed.filter((x) => x !== k);
      pool.push(k);
      draw();
    };
    tiles.onclick = (e) => {
      const t = e.target.closest('.tile');
      if (!t || locked) return;
      const k = Number(t.dataset.k);
      pool = pool.filter((x) => x !== k);
      placed.push(k);
      draw();
      if (!pool.length) $('#btnCheck', box).focus({ preventScroll: true });
      else {
        const nt = $('.tile', tiles);
        if (nt) nt.focus({ preventScroll: true });
      }
    };
    $('#btnClear', box).onclick = () => {
      pool = pool.concat(placed);
      placed = [];
      draw();
    };
    $('#btnCheck', box).onclick = () => {
      const s = norm(placed.map((k) => words[k]).join(' '));
      if (good.includes(s)) {
        locked = true;
        draw();
        api.correct(ex.a + (ex.end || ''));
      } else {
        line.classList.remove('flash-bad');
        void line.offsetWidth;
        line.classList.add('flash-bad');
        api.wrong('Ese orden no es correcto.');
      }
    };
    api.reveal = () => {
      placed = words.map((_, k) => k);
      pool = [];
      locked = true;
      draw();
    };
    draw();
  }

  function splitTok(t) {
    const m = t.match(/^(.*?)([.,!?;:]*)$/);
    return { core: m[1], trail: m[2] };
  }

  function exFix(ex, box, api, head) {
    const toks = ex.s.split(' ');
    const bad = toks.findIndex((t) => splitTok(t).core === ex.w);
    const good = ex.a.map(norm);
    let done_ = false;
    box.innerHTML = `${head}<p class="toks">${toks
      .map((t, k) => `<button type="button" class="tok" data-k="${k}">${esc(t)}</button>`)
      .join(' ')}</p><div id="fixArea"></div>`;
    const area = $('#fixArea', box);
    const btn = (k) => $(`.tok[data-k="${k}"]`, box);
    const sentence = (rep) => toks.map((t, k) => (k === bad ? rep + splitTok(t).trail : t)).join(' ');
    function fixed(rep) {
      done_ = true;
      const b = btn(bad);
      const { core, trail } = splitTok(toks[bad]);
      b.outerHTML = `<span class="tok fixed"><span class="tok-old">${esc(core)}</span>${esc(rep)}${esc(trail)}</span>`;
      area.innerHTML = '';
      $$('.tok', box).forEach((t) => (t.disabled = true));
    }
    box.querySelector('.toks').onclick = (e) => {
      const t = e.target.closest('button.tok');
      if (!t || done_) return;
      const k = Number(t.dataset.k);
      if (k !== bad) {
        t.classList.remove('miss');
        void t.offsetWidth;
        t.classList.add('miss');
        api.wrong('Esa palabra está bien. Busca otra.');
        return;
      }
      t.classList.add('picked');
      area.innerHTML = `<div class="row-btns"><span>«${esc(splitTok(toks[bad]).core)}» →</span>
        <input class="gap-in" id="fixIn" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Corrección">
        <button type="button" class="btn primary" id="btnCheck">Corregir</button></div>`;
      const inp = $('#fixIn', area);
      inp.style.width = Math.max(...ex.a.map((a) => a.length), 6) + 3 + 'ch';
      inp.focus();
      const check = () => {
        const v = norm(inp.value);
        if (!v) return;
        if (good.includes(v)) {
          fixed(inp.value.trim());
          api.correct(sentence(ex.a[0]));
        } else {
          api.wrong('Has encontrado el error, pero esa corrección no vale.');
          inp.select();
        }
      };
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          check();
        }
      });
      $('#btnCheck', area).onclick = check;
    };
    api.reveal = () => fixed(ex.a[0]);
  }

  function exMatch(ex, box, api, head) {
    const right = shuffle(ex.pairs.map((p, k) => k));
    let selL = null;
    let selR = null;
    let n = 0;
    box.innerHTML = `${head}<div class="match"><div class="col" id="colL">${ex.pairs
      .map((p, k) => `<button type="button" class="mitem" data-k="${k}">${esc(p[0])}</button>`)
      .join('')}</div><div class="col" id="colR">${right.map((k) => `<button type="button" class="mitem" data-k="${k}">${esc(ex.pairs[k][1])}</button>`).join('')}</div></div>`;
    const L = $('#colL', box);
    const R = $('#colR', box);
    const item = (col, k) => $(`.mitem[data-k="${k}"]`, col);
    function lock(k) {
      n++;
      for (const c of [L, R]) {
        const b = item(c, k);
        b.classList.remove('sel');
        b.classList.add('ok');
        b.disabled = true;
        b.insertAdjacentHTML('afterbegin', `<span class="mk">${n}</span>`);
      }
    }
    function tryPair() {
      if (selL == null || selR == null) return;
      const a = selL;
      const b = selR;
      selL = selR = null;
      if (a === b) {
        lock(a);
        if (n === ex.pairs.length) api.correct(null);
      } else {
        for (const [c, k] of [[L, a], [R, b]]) {
          const x = item(c, k);
          x.classList.remove('sel', 'bad');
          void x.offsetWidth;
          x.classList.add('bad');
        }
        api.wrong('Esa pareja no va junta.');
      }
    }
    L.onclick = (e) => {
      const b = e.target.closest('.mitem');
      if (!b || b.disabled) return;
      $$('.mitem', L).forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      selL = Number(b.dataset.k);
      tryPair();
    };
    R.onclick = (e) => {
      const b = e.target.closest('.mitem');
      if (!b || b.disabled) return;
      $$('.mitem', R).forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      selR = Number(b.dataset.k);
      tryPair();
    };
    api.reveal = () => {
      ex.pairs.forEach((_, k) => {
        if (!item(L, k).disabled) lock(k);
      });
    };
  }

  function exSort(ex, box, api, head) {
    let pool = shuffle(ex.items.map((_, k) => k));
    let sel = null;
    box.innerHTML = `${head}<div class="pool" id="pool"></div><div class="bins">${ex.bins
      .map((b, k) => `<button type="button" class="bin" data-b="${k}"><span class="bin-h">${esc(b)}</span><span class="bin-in"></span></button>`)
      .join('')}</div>`;
    const P = $('#pool', box);
    function draw() {
      P.innerHTML = pool.map((k) => `<button type="button" class="chip${k === sel ? ' sel' : ''}" data-k="${k}">${esc(ex.items[k][0])}</button>`).join('');
    }
    function put(k) {
      const b = $(`.bin[data-b="${ex.items[k][1]}"] .bin-in`, box);
      b.insertAdjacentHTML('beforeend', `<span>${esc(ex.items[k][0])}</span>`);
      pool = pool.filter((x) => x !== k);
    }
    P.onclick = (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      sel = Number(c.dataset.k);
      draw();
      const s = $('.chip.sel', P);
      if (s) s.focus({ preventScroll: true });
    };
    $$('.bin', box).forEach((bin) => {
      bin.onclick = () => {
        if (!pool.length) return;
        if (sel == null) {
          sel = pool[0];
          draw();
          return;
        }
        if (ex.items[sel][1] === Number(bin.dataset.b)) {
          put(sel);
          sel = pool.length ? pool[0] : null;
          draw();
          if (!pool.length) {
            $$('.bin', box).forEach((x) => (x.disabled = true));
            api.correct(null);
          }
        } else {
          const c = $('.chip.sel', P);
          if (c) {
            c.classList.remove('bad');
            void c.offsetWidth;
            c.classList.add('bad');
          }
          api.wrong(`«${ex.items[sel][0]}» no va en esa caja.`);
        }
      };
    });
    api.reveal = () => {
      pool.slice().forEach(put);
      sel = null;
      draw();
      $$('.bin', box).forEach((x) => (x.disabled = true));
    };
    sel = pool[0];
    draw();
  }

  /* ---------- juegos ---------- */

  function gameShell(g, sub) {
    const u = g.unit ? `Unit ${g.unit.n} \\ ${esc(g.unit.title)}` : 'Extra';
    el.stage.innerHTML = `<div class="game-wrap">
      <div class="game-head"><span class="gh-ico" aria-hidden="true">${g.icon}</span>
        <div><div class="sheet-head-mini mono note">${u}</div><h1>${esc(g.title)}</h1><p>${esc(sub || g.sub)}</p></div>
        <span class="grow"></span><span class="note mono" id="bestTag"></span></div>
      <section class="game" id="game"></section>
    </div>`;
    return $('#game');
  }
  function viewGame(g) {
    ({ rush: gameRush, hunt: gameHunt, forge: gameForge, rain: gameRain, swipe: gameSwipe, review: gameReview, dict: gameDict }[g.kind])(g);
  }
  function overScreen(host, o) {
    host.innerHTML = `<div class="over">
      <div class="big">${o.score}</div>
      <p>${esc(o.label)}</p>
      ${o.record ? '<span class="rec">¡Nuevo récord!</span>' : `<span class="note">Récord: ${o.best}</span>`}
      <div class="row-btns"><button type="button" class="btn primary" id="btnAgain">↺ Otra vez</button>${o.extra || ''}</div>
      ${o.recap && o.recap.length ? `<ul class="recap">${o.recap.join('')}</ul>` : ''}
    </div>`;
    $('#btnAgain', host).onclick = o.again;
    $('#btnAgain', host).focus({ preventScroll: true });
    keyHandler = (e) => {
      if (e.key === 'Enter') {
        o.again();
        return true;
      }
    };
  }
  function introScreen(host, html, start, keys) {
    host.innerHTML = `<div class="intro">${html}<button type="button" class="btn primary big" id="btnStart">Empezar</button>${keys ? `<div class="keys">${keys}</div>` : ''}</div>`;
    $('#btnStart', host).onclick = start;
    keyHandler = (e) => {
      if (e.key === 'Enter') {
        start();
        return true;
      }
    };
  }
  const stat = (label, id, v, cls) => `<div class="stat ${cls || ''}"><small>${label}</small><b id="${id}">${v}</b></div>`;

  /* Contrarreloj: preguntas de elegir de toda la unidad durante 60 segundos. */
  function gameRush(g) {
    const host = gameShell(g);
    const pool = g.unit.lessons.flatMap((l) => l.ex.filter((e) => e.t === 'choice' && e.q.includes('___')));
    $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
    const intro = () =>
      introScreen(
        host,
        `<p>${pool.length} preguntas posibles de la unidad ${g.unit.n}. Cada acierto suma puntos y el combo los multiplica; cada fallo te quita 3 segundos.</p>`,
        start,
        'Responde con <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> o con el ratón'
      );
    function start() {
      const T = 60;
      let left = T;
      let score = 0;
      let hits = 0;
      let run = 0;
      let bag = shuffle(pool);
      let cur = null;
      let busy = false;
      const recap = [];
      host.innerHTML = `<div class="scorebar">${stat('Tiempo', 'sT', T)}${stat('Puntos', 'sP', 0, 'hot')}${stat('Aciertos', 'sA', 0)}${stat('Combo', 'sC', 'x1')}</div>
        <div class="timebar" id="tb"><i data-w="100"></i></div><div id="rq"></div>`;
      dataStyles(host);
      const tb = $('#tb i', host);
      const mult = () => Math.min(4, 1 + Math.floor(run / 3));
      function ask() {
        if (left <= 0 || !host.isConnected) return;
        if (!bag.length) bag = shuffle(pool);
        cur = bag.pop();
        busy = false;
        $('#rq', host).innerHTML = `<p class="q">${esc(cur.q).replace('___', GAP)}</p><div class="opts">${cur.o
          .map((o, k) => `<button type="button" class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`)
          .join('')}</div>`;
        $$('#rq .opt', host).forEach((b) => (b.onclick = () => answer(Number(b.dataset.k))));
      }
      function answer(k) {
        if (busy || left <= 0) return;
        busy = true;
        const opts = $$('#rq .opt', host);
        opts.forEach((b) => (b.disabled = true));
        opts[cur.a].classList.add('ok');
        const g2 = $('#rq .gap', host);
        g2.textContent = cur.o[cur.a];
        g2.classList.add('filled');
        if (k === cur.a) {
          run++;
          hits++;
          score += 10 * mult();
          setTimeout(ask, 260);
        } else {
          if (opts[k]) opts[k].classList.add('bad');
          run = 0;
          left = Math.max(0, left - 3);
          recap.push(`<li>${esc(cur.q).replace('___', `<s>${esc(cur.o[k] || '—')}</s> <b>${esc(cur.o[cur.a])}</b>`)}</li>`);
          setMistake(cur.id, true);
          setTimeout(ask, 900);
        }
        $('#sP', host).textContent = score;
        $('#sA', host).textContent = hits;
        $('#sC', host).textContent = 'x' + mult();
      }
      const timer = setInterval(() => {
        left = Math.max(0, left - 0.1);
        $('#sT', host).textContent = Math.ceil(left);
        tb.style.width = (left / T) * 100 + '%';
        $('#tb', host).classList.toggle('low', left < 10);
        if (left <= 0) over();
      }, 100);
      stopView = () => clearInterval(timer);
      keyHandler = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) {
          answer(n - 1);
          return true;
        }
      };
      function over() {
        clearInterval(timer);
        stopView = null;
        const rec = saveBest(g.id, score);
        addXp(hits * 2);
        if (hits >= 12) award('rush');
        $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
        refreshNav();
        overScreen(host, { score, label: `puntos · ${hits} aciertos`, record: rec, best: best[g.id] || 0, again: start, recap });
      }
      ask();
    }
    intro();
  }

  /* Caza de errores: texto con fallos marcados como {mal|bien/otra}. */
  function parseHunt(text) {
    const out = [];
    const re = /\{([^|}]+)\|([^}]+)\}/g;
    let last = 0;
    let m;
    let k = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ err: true, k: k++, text: m[1], ok: m[2].split('/') });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  }
  function gameHunt(g) {
    const host = gameShell(g);
    const segs = parseHunt(g.text);
    const errs = segs.filter((s) => s.err);
    let found = new Set((hunts[g.id] || []).filter((k) => k < errs.length));
    let miss = 0;
    const hintedK = new Set();
    function draw() {
      let words = 0;
      const body = segs
        .map((s) => {
          if (s.err) {
            if (found.has(s.k)) return `<span class="tok fixed"><span class="tok-old">${esc(s.text)}</span>${esc(s.ok[0])}</span>`;
            return `<button type="button" class="tok" data-e="${s.k}">${esc(s.text)}</button>`;
          }
          return s.text
            .split(/(\s+)/)
            .map((w) => (/^\s*$/.test(w) ? w : `<button type="button" class="tok" data-w="${words++}">${esc(w)}</button>`))
            .join('');
        })
        .join('');
      host.innerHTML = `<div class="scorebar">${stat('Corregidos', 'hF', `${found.size}/${errs.length}`, 'hot')}${stat('Clics fallidos', 'hM', miss)}</div>
        <div class="letter" id="letter"><h2>${esc(g.heading)}</h2><p>${body}</p></div>
        <div class="feedback">${PARROT}<p class="bubble" id="bubble" aria-live="polite">Pulsa sobre cada palabra que esté mal y escribe la buena. Hay ${errs.length} errores.</p></div>
        <div class="row-btns"><button type="button" class="btn" id="btnHint">💡 Pista</button><span class="grow"></span><button type="button" class="btn" id="btnRestart">↺ Empezar el texto de nuevo</button></div>`;
      $('#btnHint', host).disabled = found.size === errs.length;
      $('#btnHint', host).onclick = hint;
      $('#btnRestart', host).onclick = () => {
        found = new Set();
        hunts[g.id] = [];
        store.set('hunts', hunts);
        miss = 0;
        refreshNav();
        draw();
      };
      $('#letter', host).onclick = onClick;
      if (found.size === errs.length) bubble('ok', '<b>¡Texto limpio!</b> Has corregido todos los errores.');
    }
    const bubble = (cls, html) => {
      const b = $('#bubble', host);
      b.className = 'bubble ' + cls;
      b.innerHTML = html;
    };
    function hint() {
      const next = errs.find((s) => !found.has(s.k));
      if (!next) return;
      hintedK.add(next.k);
      const b = $(`.tok[data-e="${next.k}"]`, host);
      if (b) {
        b.classList.add('picked');
        setTimeout(() => b.classList.remove('picked'), 1400);
        b.scrollIntoView({ block: 'nearest' });
      }
      bubble('', 'Mira la palabra que parpadea. (Si usas la pista, ese error da menos XP.)');
    }
    function onClick(e) {
      const t = e.target.closest('button.tok');
      if (!t) return;
      if (t.dataset.w != null) {
        miss++;
        $('#hM', host).textContent = miss;
        t.classList.remove('miss');
        void t.offsetWidth;
        t.classList.add('miss');
        bubble('bad', `«${esc(t.textContent)}» está bien escrita. Sigue buscando.`);
        return;
      }
      const s = errs[Number(t.dataset.e)];
      const wrap = document.createElement('span');
      wrap.className = 'fix-box';
      wrap.innerHTML = `<input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Corrección de ${esc(s.text)}"><button type="button" class="btn icon">✓</button>`;
      t.replaceWith(wrap);
      const inp = $('input', wrap);
      inp.placeholder = s.text;
      inp.focus();
      bubble('', `Has encontrado un error: «${esc(s.text)}». Escribe cómo debería ser y pulsa Enter (Esc para cancelar).`);
      const check = () => {
        const v = norm(inp.value);
        if (!v) return;
        if (s.ok.map(norm).includes(v)) {
          found.add(s.k);
          hunts[g.id] = [...found];
          store.set('hunts', hunts);
          addXp(hintedK.has(s.k) ? 5 : 15);
          award('first');
          refreshNav();
          draw();
          if (found.size === errs.length) {
            award('hunt');
            if (UNITS.every((u) => u.games.filter((x) => x.kind === 'hunt').every((h) => (hunts[h.id] || []).length === parseHunt(h.text).filter((x) => x.err).length))) award('huntall');
            confetti(50);
          } else bubble('ok', `<b>${pick(CHEERS)}</b> «${esc(s.text)}» → «${esc(s.ok[0])}». Quedan ${errs.length - found.size}.`);
        } else {
          inp.classList.remove('flash-bad');
          void inp.offsetWidth;
          inp.classList.add('flash-bad');
          bubble('bad', 'Esa palabra sí está mal, pero la corrección no es esa. Prueba otra vez.');
          inp.select();
        }
      };
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          check();
        } else if (ev.key === 'Escape') draw();
      });
      $('button', wrap).onclick = check;
    }
    draw();
  }

  /* Forja: verbos irregulares en past simple o participio, con tres vidas. */
  function gameForge(g) {
    const host = gameShell(g);
    let mode = store.get('forgeMode', 'past') === 'part' ? 'part' : 'past';
    const key = () => 'forge-' + mode;
    const tag = () => ($('#bestTag').textContent = `récord ${best[key()] || 0}`);
    function intro() {
      tag();
      introScreen(
        host,
        `<p>Te doy el verbo y escribes su forma. Tres fallos y se apaga la forja. Son ${VERBS.length} verbos: ¿llegas al final?</p>
         <p><span class="seg" role="group" aria-label="Qué forma practicar">
           <button type="button" data-m="past" aria-pressed="${mode === 'past'}">Past simple (2ª columna)</button>
           <button type="button" data-m="part" aria-pressed="${mode === 'part'}">Participio (3ª columna)</button>
         </span></p>`,
        start,
        'Escribe y pulsa <kbd>Enter</kbd>'
      );
      $$('.seg button', host).forEach(
        (b) =>
          (b.onclick = () => {
            mode = b.dataset.m;
            store.set('forgeMode', mode);
            intro();
          })
      );
    }
    function start() {
      let lives = 3;
      let score = 0;
      let run = 0;
      let bag = shuffle(VERBS);
      let cur;
      const recap = [];
      const col = mode === 'past' ? 1 : 2;
      host.innerHTML = `<div class="scorebar">${stat('Vidas', 'fL', '❤️❤️❤️')}${stat('Forjados', 'fS', 0, 'hot')}${stat('Racha', 'fR', 0)}${stat('Quedan', 'fQ', bag.length)}</div>
        <div class="forge-card"><div class="verb" id="fV"></div><div class="mean" id="fM"></div>
        <div class="ask">${mode === 'past' ? 'Past simple · yesterday I…' : 'Participio · I have…'}</div>
        <input class="big-in" id="fIn" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Tu respuesta">
        <div class="last" id="fLast" aria-live="polite"></div></div>`;
      const inp = $('#fIn', host);
      function next() {
        if (!bag.length) return over(true);
        cur = bag.pop();
        $('#fV', host).textContent = cur[0];
        $('#fM', host).textContent = cur[3];
        $('#fQ', host).textContent = bag.length;
        inp.value = '';
        inp.focus();
      }
      function check() {
        const v = norm(inp.value).replace(/\s*\/\s*/g, '/');
        if (!v) return;
        const forms = cur[col].split('/');
        const ok = forms.includes(v) || v === cur[col];
        const last = $('#fLast', host);
        if (ok) {
          score++;
          run++;
          if (run >= 15) award('forge');
          last.className = 'last ok';
          last.textContent = `✓ ${cur[0]} → ${cur[col]}`;
          Voice.say(cur[col].replace('/', ' or '));
        } else {
          lives--;
          run = 0;
          last.className = 'last bad';
          last.textContent = `✗ ${cur[0]} → ${cur[col]} (escribiste «${inp.value.trim()}»)`;
          recap.push(`<li>${esc(cur[0])}: <s>${esc(inp.value.trim())}</s> <b>${esc(cur[col])}</b></li>`);
          const c = $('.forge-card', host);
          c.classList.remove('flash-bad');
          void c.offsetWidth;
          c.classList.add('flash-bad');
        }
        $('#fL', host).textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
        $('#fS', host).textContent = score;
        $('#fR', host).textContent = run;
        if (lives <= 0) over(false);
        else next();
      }
      function over(all) {
        const rec = saveBest(key(), score);
        addXp(score * 2);
        tag();
        refreshNav();
        overScreen(host, {
          score,
          label: all ? '¡Has forjado todos los verbos!' : 'verbos forjados',
          record: rec,
          best: best[key()] || 0,
          again: start,
          recap,
          extra: `<button type="button" class="btn" id="btnMode">Cambiar a ${mode === 'past' ? 'participio' : 'past simple'}</button>`,
        });
        $('#btnMode', host).onclick = () => {
          mode = mode === 'past' ? 'part' : 'past';
          store.set('forgeMode', mode);
          intro();
        };
      }
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          check();
        }
      });
      next();
    }
    intro();
  }

  /* Lluvia de preposiciones: caen frases y hay que darles in, on o at antes de que lleguen al suelo. */
  function gameRain(g) {
    const host = gameShell(g);
    const PREPS = ['in', 'on', 'at'];
    $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
    introScreen(
      host,
      `<p>Caen frases sin preposición. Responde siempre a la que está más abajo (la amarilla). Tres fallos o tres frases en el suelo y se acaba. Recuerda: <b>in</b> espacios y contenedores, <b>on</b> superficies y transporte público, <b>at</b> puntos y eventos.</p>`,
      start,
      '<kbd>1</kbd>/<kbd>I</kbd> in · <kbd>2</kbd>/<kbd>O</kbd> on · <kbd>3</kbd>/<kbd>A</kbd> at'
    );
    function start() {
      let lives = 3;
      let score = 0;
      let drops = [];
      let raf = 0;
      let lastT = 0;
      let spawnIn = 0;
      let bag = shuffle(RAIN);
      let alive = true;
      const recap = [];
      host.innerHTML = `<div class="scorebar">${stat('Vidas', 'rL', '❤️❤️❤️')}${stat('Salvadas', 'rS', 0, 'hot')}</div>
        <div class="arena" id="arena" aria-live="polite"></div>
        <div class="prep-btns">${PREPS.map((p, k) => `<button type="button" class="btn" data-p="${k}">${p}</button>`).join('')}</div>`;
      const arena = $('#arena', host);
      $$('.prep-btns .btn', host).forEach((b) => (b.onclick = () => answer(Number(b.dataset.p))));
      const speed = () => 38 + Math.min(90, score * 3.2);
      const every = () => Math.max(1.05, 2.6 - score * 0.07);
      function spawn() {
        if (!bag.length) bag = shuffle(RAIN);
        const it = bag.pop();
        const d = document.createElement('div');
        d.className = 'drop';
        d.innerHTML = `<b>___</b> ${esc(it[0])}`;
        arena.appendChild(d);
        const x = Math.random() * Math.max(0, arena.clientWidth - d.offsetWidth - 8) + 4;
        const drop = { el: d, it, x, y: -d.offsetHeight, h: d.offsetHeight };
        d.style.transform = `translate(${x}px, ${drop.y}px)`;
        drops.push(drop);
        mark();
      }
      const target = () => drops.reduce((a, d) => (!a || d.y > a.y ? d : a), null);
      function mark() {
        const t = target();
        drops.forEach((d) => d.el.classList.toggle('target', d === t));
      }
      function lose(d, chosen) {
        lives--;
        d.el.innerHTML = `<b>${PREPS[d.it[1]]}</b> ${esc(d.it[0])}`;
        d.el.classList.remove('target');
        d.el.classList.add('fail');
        recap.push(`<li>${chosen != null ? `<s>${PREPS[chosen]}</s> ` : ''}<b>${PREPS[d.it[1]]}</b> ${esc(d.it[0])}</li>`);
        setTimeout(() => d.el.remove(), 600);
        $('#rL', host).textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(3 - Math.max(0, lives));
        if (lives <= 0) over();
      }
      function answer(p) {
        if (!alive) return;
        const t = target();
        if (!t) return;
        drops = drops.filter((d) => d !== t);
        if (p === t.it[1]) {
          score++;
          $('#rS', host).textContent = score;
          t.el.innerHTML = `<b>${PREPS[p]}</b> ${esc(t.it[0])}`;
          t.el.classList.remove('target');
          t.el.classList.add('pop');
          t.el.style.transform = `translate(${t.x}px, ${t.y - 30}px)`;
          setTimeout(() => t.el.remove(), 450);
        } else lose(t, p);
        mark();
      }
      function loop(ts) {
        if (!alive) return;
        const dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 0;
        lastT = ts;
        spawnIn -= dt;
        if (spawnIn <= 0) {
          spawn();
          spawnIn = every();
        }
        const H = arena.clientHeight - 8;
        const v = speed();
        for (const d of drops.slice()) {
          d.y += v * dt;
          d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
          if (d.y + d.h >= H) {
            drops = drops.filter((x) => x !== d);
            lose(d, null);
            mark();
            if (!alive) return;
          }
        }
        raf = requestAnimationFrame(loop);
      }
      const onVis = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
        } else if (alive) {
          lastT = 0;
          raf = requestAnimationFrame(loop);
        }
      };
      document.addEventListener('visibilitychange', onVis);
      stopView = () => {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
      };
      keyHandler = (e) => {
        const k = { 1: 0, 2: 1, 3: 2, i: 0, o: 1, a: 2 }[e.key.toLowerCase()];
        if (k != null) {
          answer(k);
          return true;
        }
      };
      function over() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
        stopView = null;
        const rec = saveBest(g.id, score);
        addXp(score);
        if (score >= 20) award('rain');
        $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
        refreshNav();
        setTimeout(() => host.isConnected && overScreen(host, { score, label: 'frases salvadas', record: rec, best: best[g.id] || 0, again: start, recap }), 650);
      }
      raf = requestAnimationFrame(loop);
    }
  }

  /* Formal o informal: tarjetas que se mandan a un lado o al otro. */
  function gameSwipe(g) {
    const host = gameShell(g);
    $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
    introScreen(
      host,
      `<p>Sale una frase: ¿es de una carta a un amigo (informal) o de una redacción o email formal? Tienes 60 segundos; cada fallo resta 3.</p>`,
      start,
      '<kbd>←</kbd> informal · <kbd>→</kbd> formal'
    );
    function start() {
      const T = 60;
      let left = T;
      let score = 0;
      let run = 0;
      let bag = shuffle(SWIPE);
      let cur = null;
      let busy = false;
      const recap = [];
      host.innerHTML = `<div class="scorebar">${stat('Tiempo', 'wT', T)}${stat('Aciertos', 'wS', 0, 'hot')}${stat('Racha', 'wR', 0)}</div>
        <div class="timebar" id="tb"><i data-w="100"></i></div>
        <div class="swipe-zone">
          <button type="button" class="btn" data-s="0">← Carta informal</button>
          <div class="card-slot" id="slot"></div>
          <button type="button" class="btn yellow" data-s="1">Formal →</button>
        </div>
        <div class="last" id="wLast" aria-live="polite"></div>`;
      dataStyles(host);
      $$('.swipe-zone .btn', host).forEach((b) => (b.onclick = () => answer(Number(b.dataset.s))));
      function next() {
        if (left <= 0 || !host.isConnected) return;
        if (!bag.length) bag = shuffle(SWIPE);
        cur = bag.pop();
        busy = false;
        $('#slot', host).innerHTML = `<div class="scard enter">${esc(cur[0])}</div>`;
      }
      function answer(s) {
        if (busy || left <= 0) return;
        busy = true;
        const c = $('.scard', host);
        c.classList.remove('enter');
        c.classList.add(s === 0 ? 'left' : 'right');
        const last = $('#wLast', host);
        if (s === cur[1]) {
          score++;
          run++;
          last.className = 'last ok';
          last.textContent = `✓ «${cur[0]}» → ${cur[1] ? 'formal' : 'informal'}. ${cur[2]}`;
        } else {
          run = 0;
          left = Math.max(0, left - 3);
          last.className = 'last bad';
          last.textContent = `✗ «${cur[0]}» era ${cur[1] ? 'formal' : 'informal'}. ${cur[2]}`;
          recap.push(`<li>«${esc(cur[0])}» → <b>${cur[1] ? 'formal' : 'informal'}</b>: ${esc(cur[2])}</li>`);
        }
        $('#wS', host).textContent = score;
        $('#wR', host).textContent = run;
        setTimeout(next, 260);
      }
      const tb = $('#tb i', host);
      const timer = setInterval(() => {
        left = Math.max(0, left - 0.1);
        $('#wT', host).textContent = Math.ceil(left);
        tb.style.width = (left / T) * 100 + '%';
        $('#tb', host).classList.toggle('low', left < 10);
        if (left <= 0) over();
      }, 100);
      stopView = () => clearInterval(timer);
      keyHandler = (e) => {
        if (e.key === 'ArrowLeft') return answer(0), true;
        if (e.key === 'ArrowRight') return answer(1), true;
      };
      function over() {
        clearInterval(timer);
        stopView = null;
        const rec = saveBest(g.id, score);
        addXp(score * 2);
        if (score >= 15) award('swipe');
        $('#bestTag').textContent = `récord ${best[g.id] || 0}`;
        refreshNav();
        overScreen(host, { score, label: 'aciertos', record: rec, best: best[g.id] || 0, again: start, recap });
      }
      next();
    }
  }

  /* Repaso de fallos: vuelven las preguntas falladas; si se aciertan a la primera, salen de la lista. */
  function gameReview(g) {
    const host = gameShell(g);
    const ids = [...mistakes].filter((id) => EX.has(id));
    if (!ids.length) {
      host.innerHTML = `<div class="intro">${PARROT.replace('class="parrot"', 'class="parrot hop"')}<p>No tienes fallos pendientes. Cuando falles una pregunta en una lección o en el contrarreloj, aparecerá aquí para que la repases.</p>
        <button type="button" class="btn primary" data-go="#/home">Volver a la portada</button></div>`;
      return;
    }
    host.classList.add('practice-host');
    host.innerHTML = '';
    const items = shuffle(ids)
      .slice(0, 12)
      .map((id) => EX.get(id));
    const had = mistakes.size;
    runSet(host, items, {
      title: `Repaso · ${items.length} de ${had}`,
      mode: 'review',
      onFinish() {
        refreshNav();
        if (had && !mistakes.size) award('review');
        return {
          nextBtn: mistakes.size
            ? `<button type="button" class="btn primary" data-go="#/home">Portada</button>`
            : `<button type="button" class="btn primary" data-go="#/home">¡Lista vacía! Portada →</button>`,
        };
      },
    });
  }

  /* Dictado: la voz del navegador lee una frase de los ejemplos y hay que escribirla. */
  const CONTR = [
    [/\bi'm\b/g, 'i am'],
    [/\b(you|we|they)'re\b/g, '$1 are'],
    [/\b(he|she|it|that|what|there)'s\b/g, '$1 is'],
    [/\b(\w+)'ll\b/g, '$1 will'],
    [/\b(\w+)'ve\b/g, '$1 have'],
    [/\bcan't\b/g, 'cannot'],
    [/\bwon't\b/g, 'will not'],
    [/\b(\w+)n't\b/g, '$1 not'],
  ];
  function dictNorm(s) {
    let t = String(s)
      .toLowerCase()
      .replace(/[’‘`´]/g, "'");
    for (const [re, rep] of CONTR) t = t.replace(re, rep);
    return t
      .replace(/can not/g, 'cannot')
      .replace(/[^a-z' ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function lcsMarks(target, typed) {
    const a = target;
    const b = typed;
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ok = new Array(a.length).fill(false);
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        ok[i] = true;
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    return ok;
  }
  function gameDict(g) {
    const host = gameShell(g);
    if (!Voice.ok) {
      host.innerHTML = `<div class="intro"><p>Tu navegador no tiene ninguna voz en inglés instalada, así que el dictado no puede sonar. En Windows y macOS suele venir de serie; en Linux instala, por ejemplo, <code>speech-dispatcher</code> con <code>espeak-ng</code> y reinicia el navegador.</p></div>`;
      return;
    }
    $('#bestTag').textContent = `récord ${best[g.id] || 0}/6`;
    introScreen(host, `<p>Seis frases de los ejemplos de las unidades. Escúchalas (puedes repetir y ponerlas despacio) y escríbelas. Las contracciones valen de las dos formas: <i>I'm</i> o <i>I am</i>.</p>`, start, 'Escribe y pulsa <kbd>Enter</kbd>');
    function start() {
      const list = shuffle(DICT).slice(0, 6);
      let i = 0;
      let score = 0;
      const recap = [];
      function show() {
        if (i >= list.length) return over();
        const s = list[i];
        let checked = false;
        host.innerHTML = `<div class="scorebar">${stat('Frase', 'dN', `${i + 1}/6`)}${stat('Bien', 'dS', score, 'hot')}</div>
          <div class="dict-play"><button type="button" class="btn primary big" id="dPlay">🔊 Escuchar</button><button type="button" class="btn big" id="dSlow">🐢 Despacio</button></div>
          <div class="forge-card"><input class="big-in" id="dIn" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Escribe lo que oyes" placeholder="Escribe lo que oyes…"></div>
          <div class="diff" id="dDiff" aria-live="polite"></div>
          <div class="row-btns"><span class="grow"></span><button type="button" class="btn primary" id="dGo">Comprobar</button></div>`;
        const inp = $('#dIn', host);
        $('#dPlay', host).onclick = () => Voice.say(s, 0.9, true);
        $('#dSlow', host).onclick = () => Voice.say(s, 0.6, true);
        const go = () => {
          if (checked) {
            i++;
            return show();
          }
          if (!inp.value.trim()) return;
          checked = true;
          inp.readOnly = true;
          const tw = s.split(/\s+/);
          const marks = lcsMarks(
            tw.map((w) => dictNorm(w)),
            dictNorm(inp.value).split(' ')
          );
          const right = dictNorm(inp.value) === dictNorm(s);
          if (right) {
            score++;
            award('listen');
            addXp(5);
          } else recap.push(`<li>${esc(s)} <br><s>${esc(inp.value.trim())}</s></li>`);
          $('#dDiff', host).innerHTML = (right ? '✓ ' : '') + tw.map((w, k) => `<span class="${marks[k] || right ? 'w-ok' : 'w-bad'}">${esc(w)}</span>`).join(' ');
          $('#dS', host).textContent = score;
          $('#dGo', host).textContent = i + 1 < list.length ? 'Siguiente →' : 'Ver resultado →';
          $('#dGo', host).focus();
        };
        $('#dGo', host).onclick = go;
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        });
        keyHandler = (e) => {
          if (e.key === 'Enter' && checked) {
            go();
            return true;
          }
        };
        inp.focus();
        setTimeout(() => Voice.say(s, 0.9, true), 250);
      }
      function over() {
        const rec = saveBest(g.id, score);
        $('#bestTag').textContent = `récord ${best[g.id] || 0}/6`;
        overScreen(host, { score: `${score}/6`, label: 'frases perfectas', record: rec, best: `${best[g.id] || 0}/6`, again: start, recap });
      }
      show();
    }
  }

  /* ---------- chuleta ---------- */

  function renderCheat(q) {
    const f = norm(q || '');
    const hit = (...xs) => !f || xs.some((x) => norm(x).includes(f));
    let h = '';
    for (const u of UNITS) {
      let uh = '';
      for (const l of u.lessons) {
        const rows = l.rows.filter((r) => hit(r[0], r[1], l.title, l.kicker));
        const tipHit = l.tip && f && norm(l.tip).includes(f);
        if (!rows.length && !tipHit) continue;
        uh += `<div class="cheat-l">${l.page} \\ ${esc(l.title)} <button type="button" class="link" data-go="#/l/${l.id}">ir a la lección</button></div>
          <table class="cheat-t">${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}
          ${l.tip ? `<tr><td>💡</td><td>${esc(l.tip)}</td></tr>` : ''}</table>`;
      }
      if (uh) h += `<div class="cheat-u">Unit ${u.n} \\ ${esc(u.title)}</div>${uh}`;
    }
    const verbs = VERBS.filter((v) => hit(...v));
    if (verbs.length) {
      h += `<div class="cheat-u">Irregular verbs</div><table class="cheat-t verbs"><tr><th>Base</th><th>Past simple</th><th>Participle</th><th>Significado</th></tr>
        ${verbs.map((v) => `<tr><td>${esc(v[0])}</td><td>${esc(v[1])}</td><td>${esc(v[2])}</td><td>${esc(v[3])}</td></tr>`).join('')}</table>`;
    }
    $('#cheatBody').innerHTML = h || '<p class="note">No hay nada con eso. Prueba con otra palabra.</p>';
  }

  function renderTrophy() {
    const r = rankOf(xp);
    $('#trophyBody').innerHTML = `
      <div class="cheat-l">Rangos · ${xp} XP</div>
      <div class="ranks">${RANKS.map((x, k) => `<span class="${k === r ? 'now' : k < r ? 'got' : ''}">${esc(x[1])} · ${x[0]}</span>`).join('')}</div>
      <div class="cheat-l">Logros · ${badges.size}/${BADGES.length}</div>
      <div class="badges">${BADGES.map((b) => `<div class="badge${badges.has(b.id) ? '' : ' off'}"><span class="bi">${b.icon}</span><div><b>${esc(b.name)}</b><small>${esc(b.how)}</small></div></div>`).join('')}</div>
      <div class="cheat-l">Récords</div>
      <div class="bests">
        ${UNITS.map((u) => `<div><span>Contrarreloj U${u.n}</span><b>${best[u.id + '-rush'] || 0}</b></div>`).join('')}
        <div><span>Forja · past simple</span><b>${best['forge-past'] || 0}</b></div>
        <div><span>Forja · participio</span><b>${best['forge-part'] || 0}</b></div>
        <div><span>Lluvia de preposiciones</span><b>${best['u2-rain'] || 0}</b></div>
        <div><span>Formal o informal</span><b>${best['u3-swipe'] || 0}</b></div>
        <div><span>Dictado</span><b>${best['x-dict'] || 0}/6</b></div>
        <div><span>Lecciones</span><b>${done.size}/${LESSONS.length}</b></div>
        <div><span>Fallos por repasar</span><b>${mistakes.size}</b></div>
      </div>`;
  }

  /* ---------- tema ---------- */

  function effectiveDark() {
    const t = document.documentElement.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }

  /* ---------- eventos globales ---------- */

  function bind() {
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        e.preventDefault();
        const h = go.dataset.go;
        const dlg = go.closest('dialog');
        if (dlg) dlg.close();
        if (location.hash === h) route();
        else location.hash = h;
        return;
      }
      const sp = e.target.closest('[data-say]');
      if (sp) {
        Voice.say(sp.dataset.say, 0.92, true);
        return;
      }
      const fold = e.target.closest('[data-fold]');
      if (fold) {
        const k = fold.dataset.fold;
        if (closed.has(k)) closed.delete(k);
        else closed.add(k);
        store.set('closed', [...closed]);
        refreshNav();
        return;
      }
      if (e.target.closest('#btnReset')) {
        const b = e.target.closest('#btnReset');
        if (b.dataset.armed) {
          store.clear();
          done = new Set();
          answered = new Set();
          mistakes = new Set();
          badges = new Set();
          best = {};
          hunts = {};
          xp = 0;
          streak = 0;
          renderHud();
          toast('🧽', 'Progreso borrado', 'Empiezas de cero');
          location.hash = '#/home';
          route();
        } else {
          b.dataset.armed = '1';
          b.textContent = '¿Seguro? Se borra todo. Pulsa otra vez';
          setTimeout(() => {
            if (b.isConnected) {
              delete b.dataset.armed;
              b.textContent = 'Empezar de cero';
            }
          }, 4000);
        }
        return;
      }
      if (document.body.classList.contains('nav-open') && !e.target.closest('#sidebar, #btnMenu')) {
        document.body.classList.remove('nav-open');
        $('#btnMenu').setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest && e.target.closest('input, textarea, dialog')) return;
      if (e.target.closest && e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (keyHandler && keyHandler(e)) e.preventDefault();
    });

    $('#btnMenu').onclick = () => {
      const open = document.body.classList.toggle('nav-open');
      $('#btnMenu').setAttribute('aria-expanded', String(open));
    };
    $('#btnTheme').onclick = () => {
      const t = effectiveDark() ? 'light' : 'dark';
      applyTheme(t);
      store.set('theme', t);
    };
    $('#btnVoice').onclick = () => {
      Voice.on = !Voice.on;
      store.set('voice', Voice.on);
      Voice.ui();
      if (Voice.on) Voice.say('Voice on.');
      else
        try {
          speechSynthesis.cancel();
        } catch (e) {}
    };
    $('#btnCheat').onclick = () => {
      $('#cheatSearch').value = '';
      renderCheat('');
      $('#cheat').showModal();
      $('#cheatSearch').focus();
    };
    $('#cheatSearch').addEventListener('input', (e) => renderCheat(e.target.value));
    const openTrophy = () => {
      renderTrophy();
      $('#trophy').showModal();
    };
    $('#btnTrophy').onclick = openTrophy;
    $('#hud').onclick = openTrophy;
    for (const d of $$('dialog')) {
      d.addEventListener('click', (e) => {
        if (e.target === d || e.target.closest('.dlg-close')) d.close();
      });
    }
    window.addEventListener('hashchange', route);
  }

  /* ---------- arranque ---------- */

  applyTheme(store.get('theme', null));
  Voice.init();
  bind();
  renderHud();
  if (!location.hash) {
    const last = store.get('last', '#/home');
    if (typeof last === 'string' && /^#\/[\w/-]*$/.test(last)) history.replaceState(null, '', last);
  }
  route();
})();
