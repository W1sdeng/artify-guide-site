/* ============================================================
   文艺指南 Artify 官网交互
   - 卡片数据放在文件顶部，方便替换
   - 动画只用 transform / opacity；滚动监听走 rAF 节流
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 概念卡数据（唯一数据源） ---------- */
  const CARDS = [
    { idx:"01", field:"媒介与数字文化", name:"网络化公众", def:"由平台技术组织的公众，同时受可搜索、可复制和持续留存的影响。", difficulty:"2/4", common:"3/4" },
    { idx:"02", field:"存在主义",       name:"本真性",     def:"不是任性做自己，是承担起自身的有限处境和选择。",           difficulty:"3/4", common:"2/4" },
    { idx:"03", field:"哲学",           name:"虚无主义",   def:"旧的最高价值失效之后，留下的那片价值真空。",               difficulty:"3/4", common:"3/4" },
    { idx:"04", field:"社会学",         name:"惯习",       def:"那些你以为天生就有的品味和反应，其实是长期处境养成的。",   difficulty:"2/4", common:"2/4" },
    { idx:"05", field:"文学理论",       name:"陌生化",     def:"把熟悉的东西写得不像它，逼你重新看见它。",                 difficulty:"2/4", common:"2/4" }
  ];

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  /* ============================================================
     Hero 标题逐字入场（JS 关闭时正文原样可读）
     ============================================================ */
  function splitHero() {
    const title = $("#heroTitle");
    if (!title) return;
    let ci = 0;
    $$(".hero__line", title).forEach((line) => {
      const text = line.textContent;
      line.textContent = "";
      const frag = document.createDocumentFragment();
      for (const ch of text) {
        const span = document.createElement("span");
        span.className = "char";
        span.style.setProperty("--ci", ci++);
        span.textContent = ch;
        frag.appendChild(span);
      }
      line.appendChild(frag);
    });
    requestAnimationFrame(() => title.classList.add("is-in"));
  }
  splitHero();

  /* ============================================================
     导航：汉堡抽屉 + 滚动进度条 + Hero 视差
     ============================================================ */
  const nav = $(".nav");
  const burger = $("#navBurger");
  const drawer = $("#navDrawer");

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove("is-visible");
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "打开菜单");
    window.setTimeout(() => { if (!drawer.classList.contains("is-visible")) drawer.hidden = true; }, 450);
  }
  if (burger && drawer) {
    burger.addEventListener("click", () => {
      const open = drawer.hidden;
      if (open) {
        drawer.hidden = false;
        requestAnimationFrame(() => drawer.classList.add("is-visible"));
        nav.classList.add("is-open");
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "关闭菜单");
      } else {
        closeDrawer();
      }
    });
    $$("a", drawer).forEach((a) => a.addEventListener("click", closeDrawer));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }

  const progressBar = $("#progressBar");
  const heroPhone = $("#heroPhone");
  const decor = $$("[data-decor]");
  let scrollQueued = false;

  function updateScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? doc.scrollTop / max : 0;
    if (progressBar) progressBar.style.transform = "scaleX(" + p + ")";
    if (reduce.matches) return;
    const y = doc.scrollTop;
    if (heroPhone) {
      heroPhone.style.transform = "translate3d(0," + (y * 0.1) + "px,0) rotate(" + (-3 + y * 0.015) + "deg)";
    }
    // 装饰色块随滚动轻微视差，走 CSS 变量，保留各自基础变换
    decor.forEach((el, i) => {
      el.style.setProperty("--py", y * (0.04 + i * 0.02) + "px");
    });
  }
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; updateScroll(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  updateScroll();

  /* ============================================================
     滚入错峰揭示
     ============================================================ */
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revealObs.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$(".reveal").forEach((el) => revealObs.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  /* ============================================================
     数字计数器
     ============================================================ */
  function countUp(el) {
    const target = Number(el.dataset.target) || 0;
    if (reduce.matches) { el.textContent = target; return; }
    const dur = 1200;
    const start = performance.now();
    function tick(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    el.textContent = "0";
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    const statObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { countUp(en.target); statObs.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    $$(".stat__num").forEach((el) => statObs.observe(el));
  }

  /* ============================================================
     现场题：滚动驱动步骤点亮（越过中线即永久点亮）
     ============================================================ */
  if ("IntersectionObserver" in window) {
    const stepObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("is-lit"); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    $$("[data-step]").forEach((el) => stepObs.observe(el));
  } else {
    $$("[data-step]").forEach((el) => el.classList.add("is-lit"));
  }

  /* ============================================================
     概念卡剧场
     ============================================================ */
  const deck = $("#deck");
  const hintRight = $("#hintRight");
  const hintLeft = $("#hintLeft");
  const deckCount = $("#deckCount");
  const deckDots = $("#deckDots");

  const cardsEl = [];
  let current = 0;
  let firstRender = true;

  let frontX = 0, frontY = 0, frontR = 0, frontS = 1;
  let mode = "idle"; // idle | drag | fly | spring
  let rafId = null;
  let pointer = null;
  let suppressClick = false;

  function buildDeck() {
    if (!deck) return;
    CARDS.forEach((c, i) => {
      const el = document.createElement("article");
      el.className = "card";
      el.dataset.index = i;
      el.style.transition = "none";
      el.innerHTML =
        '<div class="card__top">' +
          '<span class="card__idx">' + c.idx + "</span>" +
          '<span class="card__tag">' + c.field + "</span>" +
        "</div>" +
        '<h3 class="card__name">' + c.name + "</h3>" +
        '<p class="card__def">' + c.def + "</p>" +
        '<div class="card__meta">理解难度 ' + c.difficulty + " · 常见度 " + c.common + "</div>" +
        '<div class="card__prompt">点卡进入 1 分钟概念微课 <span aria-hidden="true">→</span></div>';
      deck.appendChild(el);
      cardsEl.push(el);
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
      el.addEventListener("keydown", onCardKey);
      el.addEventListener("click", () => {
        if (suppressClick) { suppressClick = false; return; }
        if (cardsEl[current] === el) openCourse(CARDS[current]);
      });
    });
    deck.classList.add("deck--enhanced");

    if (deckDots) {
      for (let i = 0; i < CARDS.length; i++) {
        const dot = document.createElement("span");
        dot.className = "dot";
        deckDots.appendChild(dot);
      }
    }
  }

  function render() {
    cardsEl.forEach((el, i) => {
      const off = i - current;
      let x = 0, y = 0, r = 0, s = 0.85, o = 0, z = 100 - off;
      if (off === 0) { x = frontX; y = frontY; r = frontR; s = frontS; o = 1; }
      // 位移收敛：卡片缩小后右边缘不得越过卡组，否则在窄屏上会溢出到版心外
      else if (off === 1) { x = 8; y = 16; r = 2; s = 0.95; o = 1; }
      else if (off === 2) { x = 16; y = 32; r = 4; s = 0.9; o = 1; }
      el.style.setProperty("--x", num(x) + "px");
      el.style.setProperty("--y", num(y) + "px");
      el.style.setProperty("--r", num(r) + "deg");
      el.style.setProperty("--s", num(s) || 1);
      el.style.opacity = o;
      el.style.zIndex = z;
      el.style.transition = (firstRender || off < 0 || off > 2) ? "none" : "";
      el.style.pointerEvents = off === 0 ? "auto" : "none";
      el.tabIndex = off === 0 ? 0 : -1;
      el.setAttribute("aria-hidden", off === 0 ? "false" : "true");
    });
    firstRender = false;
  }

  // 任何 NaN 都会让整条 transform 声明失效、卡片瞬间丢失居中，这里统一兜底
  function num(v) { return Number.isFinite(v) ? v : 0; }

  function applyFront() {
    const el = cardsEl[current];
    if (!el) return;
    el.style.setProperty("--x", num(frontX) + "px");
    el.style.setProperty("--y", num(frontY) + "px");
    el.style.setProperty("--r", num(frontR) + "deg");
    el.style.setProperty("--s", num(frontS) || 1);
  }

  function updateProgress() {
    if (deckCount) {
      deckCount.textContent = CARDS[current] ? CARDS[current].idx + " / " + String(CARDS.length).padStart(2, "0") : "";
    }
    if (deckDots) {
      $$(".dot", deckDots).forEach((d, i) => d.classList.toggle("is-current", i === current));
    }
  }

  function updateHints(x) {
    if (hintRight) hintRight.style.opacity = clamp(x / 130, 0, 0.9);
    if (hintLeft) hintLeft.style.opacity = clamp(-x / 130, 0, 0.9);
  }

  // 装饰色块随卡片位移反向视差
  function updateDecor(x) {
    const dx = -x * 0.06 + "px";
    decor.forEach((el) => el.style.setProperty("--px", dx));
  }

  // 从已有 transform 矩阵读出当前可视位置/旋转/缩放，用于动画中断接管
  function readVisual(el) {
    const r = el.getBoundingClientRect();
    const d = deck.getBoundingClientRect();
    let rot = 0, scale = 1;
    try {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
      scale = Math.hypot(m.a, m.b);
    } catch (_) { /* 忽略，使用默认值 */ }
    return {
      x: r.left + r.width / 2 - (d.left + d.width / 2),
      y: r.top + r.height / 2 - (d.top + d.height / 2),
      rot: rot,
      scale: scale || 1
    };
  }

  // 最后一张卡：位移做渐进阻尼，不硬停
  function rubber(x) {
    const limit = window.innerWidth * 0.5;
    if (Math.abs(x) <= limit) return x;
    const over = Math.abs(x) - limit;
    return Math.sign(x) * (limit + over * 0.32);
  }

  function cancelAnimation() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function onPointerDown(e) {
    if (reduce.matches) return;
    const el = e.currentTarget;
    if (cardsEl[current] !== el) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    cancelAnimation();
    mode = "idle";
    const v = readVisual(el);
    frontX = v.x; frontY = v.y; frontR = v.rot; frontS = v.scale;

    pointer = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startFrontX: frontX,
      startFrontY: frontY,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      moved: false
    };
    suppressClick = false;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
    el.classList.add("is-dragging");
    deck.classList.add("is-dragging");
    mode = "drag";

    frontS = v.scale * 1.02;
    applyFront();
  }

  function onPointerMove(e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.startX;
    const dy = e.clientY - pointer.startY;

    frontX = pointer.startFrontX + dx;
    if (current === CARDS.length - 1) frontX = rubber(frontX);
    frontY = pointer.startFrontY + dy * 0.25;
    frontR = frontX / window.innerWidth * 16;

    applyFront();
    updateHints(frontX);
    updateDecor(frontX);

    const now = performance.now();
    const dt = now - pointer.lastT;
    if (dt > 0) {
      pointer.vx = (e.clientX - pointer.lastX) / dt * 1000; // px/s
      pointer.lastX = e.clientX;
      pointer.lastT = now;
    }
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) pointer.moved = true;
  }

  function onPointerUp(e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const el = cardsEl[current];
    try { el.releasePointerCapture(e.pointerId); } catch (_) { /* 已释放 */ }
    const vx = pointer.vx;
    const moved = pointer.moved;
    pointer = null;
    // 拖动过就吃掉随后的 click，避免误触进微课；稍后自动复位
    suppressClick = moved;
    if (moved) window.setTimeout(() => { suppressClick = false; }, 350);
    el.classList.remove("is-dragging");
    deck.classList.remove("is-dragging");

    // Apple 式动量投影
    const projected = frontX + (vx / 1000) * (0.998 / (1 - 0.998));
    const threshold = Math.max(90, window.innerWidth * 0.2);
    const fling = Math.abs(projected) > threshold || Math.abs(frontX) > window.innerWidth * 0.4;

    if (fling && current < CARDS.length - 1) {
      flyOut(projected >= 0 ? 1 : -1, vx);
    } else {
      springBack();
    }
  }

  function onCardKey(e) {
    if (cardsEl[current] !== e.currentTarget) return;
    if (e.key === "ArrowRight") { e.preventDefault(); openCourse(CARDS[current]); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); skip(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCourse(CARDS[current]); }
  }

  // 回弹：使用 App 招牌弹性缓动，带轻微过冲
  function springBack() {
    const el = cardsEl[current];
    if (!el) return;
    if (reduce.matches) { frontX = 0; frontY = 0; frontR = 0; frontS = 1; render(); return; }
    mode = "spring";
    el.style.transition = "transform .52s var(--ease-spring), opacity .52s var(--ease-spring)";
    frontX = 0; frontY = 0; frontR = 0; frontS = 1;
    applyFront();
    updateHints(0);
    updateDecor(0);
    const done = () => {
      el.removeEventListener("transitionend", done);
      if (mode !== "spring") return;
      mode = "idle";
      render();
    };
    el.addEventListener("transitionend", done);
  }

  // 飞出：以松手速度为初速度的指数逼近，保证速度交接、无顿挫
  function flyOut(dir, v0) {
    const el = cardsEl[current];
    if (!el) return;
    mode = "fly";
    el.style.transition = "none";
    const cardHalf = el.getBoundingClientRect().width / 2 || 170;
    const startX = frontX;
    const targetX = dir * (window.innerWidth * 1.15 + cardHalf);
    const dist = targetX - startX;
    let k = Math.abs(v0) / Math.abs(dist || 1);
    k = clamp(k, 3.2, 16);
    let prev = performance.now();

    function frame(now) {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const p = 1 - Math.exp(-k * dt);
      frontX += (targetX - frontX) * p;
      frontR = dir * 16;
      frontS = 1;
      applyFront();
      updateHints(frontX);
      updateDecor(frontX);
      if (Math.abs(targetX - frontX) < 4) { finish(dir, el); return; }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function finish(dir, el) {
    rafId = null;
    mode = "idle";
    const entered = dir > 0;
    const leaving = CARDS[current];
    if (current < CARDS.length - 1) current++;
    frontX = 0; frontY = 0; frontR = 0; frontS = 1;
    el.style.opacity = 0;
    render();
    updateProgress();
    updateHints(0);
    updateDecor(0);
    if (entered) openCourse(leaving);
  }

  function skip() {
    if (current >= CARDS.length - 1) { springBack(); return; }
    if (reduce.matches) {
      current++;
      frontX = 0; frontY = 0; frontR = 0; frontS = 1;
      render();
      updateProgress();
      return;
    }
    flyOut(-1, 1000);
  }

  const btnSkip = $("#btnSkip");
  const btnCourse = $("#btnCourse");
  if (btnSkip) btnSkip.addEventListener("click", skip);
  if (btnCourse) btnCourse.addEventListener("click", () => {
    if (cardsEl[current]) openCourse(CARDS[current]);
  });

  buildDeck();
  render();
  updateProgress();

  /* ============================================================
     进微课庆祝层（自由区咯时刻）
     ============================================================ */
  const overlay = $("#courseOverlay");
  const courseField = $("#courseField");
  const courseName = $("#courseName");
  const courseDef = $("#courseDef");
  const courseMeta = $("#courseMeta");
  const courseClose = $("#courseClose");
  let lastFocus = null;

  function openCourse(c) {
    if (!overlay || !c) return;
    lastFocus = document.activeElement;
    if (courseField) courseField.textContent = c.field;
    if (courseName) courseName.textContent = c.name;
    if (courseDef) courseDef.textContent = c.def;
    if (courseMeta) courseMeta.textContent = "理解难度 " + c.difficulty + " · 常见度 " + c.common;
    overlay.setAttribute("aria-hidden", "false");
    // html 与 body 都要锁，只锁 body 时移动端仍能滚动背景
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    // 先显示，再触发青柠色块的庆祝动画与面板弹性入场
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    if (courseClose) courseClose.focus();
  }

  function closeCourse() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (courseClose) courseClose.addEventListener("click", closeCourse);
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCourse(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCourse(); });

  /* ============================================================
     磁吸主 CTA（仅桌面精细指针）
     ============================================================ */
  if (finePointer.matches && !reduce.matches) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + (mx * 0.16) + "px," + (my * 0.26) + "px)";
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ============================================================
     章节导航高亮（滚动到哪一章，顶部导航就点亮哪一项）
     对齐 Shopify Editions 的章节导航
     ============================================================ */
  (function () {
    const links = $$(".nav__links a[href^='#']");
    if (!links.length) return;
    const pairs = [];
    links.forEach((a) => {
      const sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec) pairs.push([sec, a]);
    });
    if (!pairs.length) return;

    let queued = false;
    function update() {
      queued = false;
      const line = window.scrollY + window.innerHeight * 0.38;
      let hit = null;
      pairs.forEach(([sec, a]) => { if (sec.offsetTop <= line) hit = a; });
      // 到底部时强制点亮最后一节
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        hit = pairs[pairs.length - 1][1];
      }
      links.forEach((l) => l.classList.toggle("is-active", l === hit));
    }
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  })();

  /* ============================================================
     跑马灯：离开视口即暂停，省电
     ============================================================ */
  (function () {
    const marquee = $(".marquee");
    const track = $(".marquee__track");
    if (!marquee || !track || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          track.style.animationPlayState = en.isIntersecting ? "running" : "paused";
        });
      },
      { threshold: 0 }
    );
    obs.observe(marquee);
  })();

  /* ============================================================
     自绘墨点光标（可选，桌面精细指针）
     ============================================================ */
  const dot = $("#cursorDot");
  if (dot && finePointer.matches && !reduce.matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.opacity = "1";
    }, { passive: true });
    (function follow() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      dot.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(follow);
    })();
  }
})();
