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
  const wideMQ = window.matchMedia("(min-width: 768px)");
  // 支持 CSS 滚动时间轴时，进度条交给合成器，JS 不再每帧读 scrollHeight
  const scrollTimeline = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));

  /* ============================================================
     Hero 标题逐字入场（JS 关闭时正文原样可读）
     ============================================================ */
  function splitHero() {
    const title = $("#heroTitle");
    if (!title) return;
    $$(".hero__line", title).forEach((line, i) => {
      const inner = document.createElement("span");
      inner.className = "hero__line-in";
      inner.textContent = line.textContent;
      line.textContent = "";
      line.appendChild(inner);
      line.style.setProperty("--li", i);
    });
  }
  splitHero();

  /* ============================================================
     章节标题逐字揭示：把 main 里的 h2 切成逐字 span，进视口错峰上浮
     ============================================================ */
  (function () {
    const heads = $$("main section h2");
    if (!heads.length) return;
    heads.forEach((h) => {
      const text = h.textContent.trim();
      if (!text) return;
      h.textContent = "";
      Array.prototype.forEach.call(text, (ch, i) => {
        const w = document.createElement("span");
        w.className = "word";
        const inner = document.createElement("span");
        inner.className = "word__in";
        inner.textContent = ch === " " ? "\u00A0" : ch;
        w.style.setProperty("--wi", i);
        w.appendChild(inner);
        h.appendChild(w);
      });
    });
    if (reduce.matches || !("IntersectionObserver" in window)) {
      heads.forEach((h) => h.classList.add("is-splitin"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-splitin"); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    heads.forEach((h) => io.observe(h));
  })();

  /* ============================================================
     开屏页：一张会自己撕开的纸
     - 只在本会话第一次进站时出现；点任意处 / 滚动 / 按键 / 1.8s 后自动进入
     - 关闭后才启动 Hero 的逐字入场，避免动画在幕布后面空放
     - prefers-reduced-motion 或已看过 → 直接跳过
     ============================================================ */
  const intro = $("#intro");
  let introDone = false;
  let heroStarted = false;

  /* 导航项与 CTA 的 clip-path 揭示（trevornoah 手法） */
  (function () {
    const nav = $(".nav");
    if (nav) requestAnimationFrame(() => nav.classList.add("is-ready"));
    const reveals = $$(".btn--reveal");
    if (reveals.length && "IntersectionObserver" in window) {
      // 被 clip-path 完全裁掉的元素对 IO 来说是"不可见"的（可见面积为 0），
      // 自己永远等不到 is-in。所以观察它未被裁的外层容器，命中后再揭开按钮。
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            const btn = en.target.matches(".btn--reveal") ? en.target : en.target.querySelector(".btn--reveal");
            if (btn) btn.classList.add("is-in");
            io.unobserve(en.target);
          });
        },
        { threshold: 0.2 }
      );
      reveals.forEach((el) => io.observe(el.parentElement || el));
    } else {
      reveals.forEach((el) => el.classList.add("is-in"));
    }
  })();

  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    const title = $("#heroTitle");
    if (title) requestAnimationFrame(() => title.classList.add("is-in"));
  }

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    if (intro) {
      intro.classList.add("is-leaving");
      window.setTimeout(() => { intro.style.display = "none"; }, 760);
    }
    document.body.classList.remove("intro-open");
    startHero();
  }

  (function runIntro() {
    let seen = true;
    try { seen = sessionStorage.getItem("artify-intro") === "1"; } catch (_) { /* 隐私模式下当作已看过 */ }
    if (!intro || seen || reduce.matches) {
      if (intro) intro.style.display = "none";
      startHero();
      return;
    }
    intro.setAttribute("aria-hidden", "false");
    document.body.classList.add("intro-open");
    requestAnimationFrame(() => intro.classList.add("is-in"));
    const timer = window.setTimeout(finishIntro, 1800);
    ["click", "keydown", "wheel", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, () => { window.clearTimeout(timer); finishIntro(); }, { once: true, passive: true })
    );
    try { sessionStorage.setItem("artify-intro", "1"); } catch (_) {}
  })();

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
    if (progressBar && !scrollTimeline) {
      const d = document.documentElement;
      const max = d.scrollHeight - window.innerHeight;
      const p = max > 0 ? d.scrollTop / max : 0;
      progressBar.style.transform = "scaleX(" + p + ")";
    }
    if (reduce.matches) return;
    const doc = document.documentElement;
    const y = doc.scrollTop;
    // 手机随滚动轻微旋转：单元素 transform，合成器友好，移动端也保留
    // （GSAP 加载时由 motion.js 用 ScrollTrigger scrub 接管，这里让位）
    if (heroPhone && !window.gsap) {
      heroPhone.style.transform = "translate3d(0," + (y * 0.1) + "px,0) rotate(" + (-3 + y * 0.015) + "deg)";
    }
    // 装饰色块视差只在桌面：移动端多个元素每帧写 CSS 变量会拖慢滚动
    if (!wideMQ.matches) return;
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
     首屏手机截图轮播：箭头 / 圆点 / 自动播 / 可拖
     ============================================================ */
  (function () {
    const track = $("#heroTrack");
    const prev = $("#heroPrev");
    const next = $("#heroNext");
    const dotsEl = $("#heroDots");
    if (!track || !dotsEl) return;
    const slides = $$("img", track);
    const n = slides.length;
    let i = 0;
    let timer = null;
    for (let k = 0; k < n; k++) {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "phone__dot";
      d.setAttribute("aria-label", "第 " + (k + 1) + " 张截图");
      d.addEventListener("click", () => go(k));
      dotsEl.appendChild(d);
    }
    const dots = $$(".phone__dot", dotsEl);
    function render() {
      track.style.transform = "translateX(" + (-i * 100) + "%)";
      dots.forEach((d, k) => d.classList.toggle("is-current", k === i));
    }
    function restart() {
      if (timer) { clearInterval(timer); timer = null; }
      if (reduce.matches) return;
      timer = window.setInterval(() => go(i + 1), 4200);
    }
    function go(k) { i = (k % n + n) % n; render(); restart(); }
    if (prev) prev.addEventListener("click", () => go(i - 1));
    if (next) next.addEventListener("click", () => go(i + 1));
    // 横向拖动换页
    let drag = null;
    track.addEventListener("pointerdown", (e) => {
      if (reduce.matches) return;
      drag = { x: e.clientX, id: e.pointerId };
      track.style.transition = "none";
      try { track.setPointerCapture(e.pointerId); } catch (_) {}
    });
    track.addEventListener("pointerup", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag = null;
      track.style.transition = "";
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      else render();
      restart();
    });
    // 离开首屏暂停自动播
    const host = $("#heroPhone") || track;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) restart();
          else if (timer) { clearInterval(timer); timer = null; }
        });
      }, { threshold: 0.2 });
      io.observe(host);
    }
    render();
    restart();
  })();

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
     概念卡：滚进视口时五张卡依次发牌入场
     ============================================================ */
  (function () {
    const stage = $(".deck-stage");
    if (!stage || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting || reduce.matches) return;
          stage.classList.remove("is-dealing");
          void stage.offsetWidth; // 强制回流，让动画可以重复触发
          stage.classList.add("is-dealing");
        });
      },
      { threshold: 0.5 }
    );
    io.observe(stage);
  })();

  /* ============================================================
     文艺助手：我提问 -> 思考 -> 回答，气泡依次弹入（每次进视口重放）
     ============================================================ */
  (function () {
    const ai = $("#ai");
    if (!ai) return;
    const STEPS = [[0, "is-step1"], [560, "is-step2"], [2200, "is-step3"], [2820, "is-step4"]];
    const typed = $$('.ai__row--bot .ai__bubble', ai).filter((el) => !el.classList.contains("ai__typing"));
    const originals = typed.map((el) => el.textContent);
    let timers = [];
    let typeTimers = [];
    // 逐字打出回答
    function typeAt(idx, speed) {
      const el = typed[idx];
      if (!el) return;
      el.textContent = "";
      let k = 0;
      typeTimers[idx] = window.setInterval(() => {
        k += 1;
        el.textContent = originals[idx].slice(0, k);
        if (k >= originals[idx].length) { clearInterval(typeTimers[idx]); typeTimers[idx] = null; }
      }, speed);
    }
    function play() {
      timers.forEach(clearTimeout);
      timers = [];
      typeTimers.forEach((t) => t && clearInterval(t));
      typeTimers = [];
      ai.classList.remove("is-step1", "is-step2", "is-step3", "is-step4");
      typed.forEach((el) => { el.textContent = ""; });
      if (reduce.matches) {
        ai.classList.add("is-step1", "is-step2", "is-step3", "is-step4");
        typed.forEach((el, i) => { el.textContent = originals[i]; });
        return;
      }
      void ai.offsetWidth;
      STEPS.forEach(([t, c]) => timers.push(window.setTimeout(() => {
        ai.classList.add(c);
        if (c === "is-step3") typeAt(0, 24);
        if (c === "is-step4") typeAt(1, 22);
      }, t)));
    }
    if ("IntersectionObserver" in window) {
      let visible = false;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) { if (!visible) { visible = true; play(); } }
            else { visible = false; }
          });
        },
        { threshold: 0.4 }
      );
      io.observe(ai);
    } else {
      play();
    }
  })();

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
     现场题
     - 桌面：钉住 + 横向推进（.scene 撑高成跑道，.scene__frame 吸附，五步横向平移）
     - 移动端 / 减动效 / 无 IO：退回纵向列表，滚入点亮
     ============================================================ */
  let scenePinned = false;
  let sceneH = false;   // 移动端横向吸附模式

  /* 纵向兜底：越过中线即永久点亮 */
  if ("IntersectionObserver" in window) {
    const stepObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting && !scenePinned && !sceneH) en.target.classList.add("is-lit"); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    $$("[data-step]").forEach((el) => stepObs.observe(el));
  } else {
    $$("[data-step]").forEach((el) => el.classList.add("is-lit"));
  }

  /* 纵向兜底：五步依次往上滑入 */
  (function () {
    const ol = $(".steps");
    if (!ol || !("IntersectionObserver" in window)) return;
    $$(".step", ol).forEach((li, i) => li.style.setProperty("--i", i));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting || reduce.matches || scenePinned || sceneH) return;
          ol.classList.remove("is-dealt");
          void ol.offsetWidth;
          ol.classList.add("is-dealt");
        });
      },
      { threshold: 0.35 }
    );
    io.observe(ol);
  })();

  /* 移动端：五步横向吸附，滑动点亮到当前步 */
  (function () {
    const vp = $("#scene .scene__viewport");
    const steps = $$("#scene .step");
    if (!vp || !steps.length) return;
    const mq = window.matchMedia("(max-width: 767px)");
    let raf = null;
    function light() {
      raf = null;
      const center = vp.scrollLeft + vp.clientWidth / 2;
      let best = 0, bd = Infinity;
      steps.forEach((el, i) => {
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - center);
        if (d < bd) { bd = d; best = i; }
      });
      steps.forEach((el, i) => el.classList.toggle("is-lit", i <= best));
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(light); }
    function sync() {
      sceneH = mq.matches;
      vp.removeEventListener("scroll", onScroll);
      if (sceneH) {
        vp.addEventListener("scroll", onScroll, { passive: true });
        light();
      } else {
        steps.forEach((el) => el.classList.remove("is-lit"));
      }
    }
    if (mq.addEventListener) mq.addEventListener("change", sync);
    sync();
  })();

  /* 桌面：钉住 + 横向推进。进度映射到轨道平移量，越过锚点的步骤永久点亮 */
  (function () {
    const scene = $("#scene");
    const frame = scene && $(".scene__frame", scene);
    const viewport = scene && $(".scene__viewport", scene);
    const stepsEl = scene && $(".steps", scene);
    if (!scene || !frame || !viewport || !stepsEl) return;
    const steps = $$(".step", stepsEl);
    const pinnedMQ = window.matchMedia("(min-width: 768px)");

    let maxT = 0;      // 轨道可平移的最大距离
    let centers = [];  // 每步中心相对轨道起点的位置
    let sceneTop = 0;  // 区块绝对顶部
    let navH = 64;
    let tx = 0;        // 当前平移量
    let maxLit = -1;
    let queued = false;
    let rQueued = false;

    function measure() {
      if (!scenePinned) return;
      centers = steps.map((el) => el.offsetLeft + el.offsetWidth / 2);
      // 让最后一步也能推进到锚点：跑道长度 = 末步中心到锚点的距离
      maxT = Math.max(0, centers[centers.length - 1] - viewport.clientWidth * 0.5);
      sceneTop = scene.getBoundingClientRect().top + window.scrollY;
      navH = $(".nav") ? $(".nav").offsetHeight : 64;
      scene.style.height = (frame.offsetHeight + maxT) + "px";
    }

    function update() {
      if (!scenePinned) return;
      const start = sceneTop - navH;
      const end = start + maxT;
      const p = clamp((window.scrollY - start) / (end - start || 1), 0, 1);
      const next = -p * maxT;
      if (Math.abs(next - tx) > 0.2) {
        tx = next;
        stepsEl.style.transform = "translate3d(" + tx + "px,0,0)";
      }
      const anchor = viewport.clientWidth * 0.5;
      let best = 0, bd = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = Math.abs(centers[i] + tx - anchor);
        if (d < bd) { bd = d; best = i; }
      }
      if (best > maxLit) {
        maxLit = best;
        for (let i = 0; i <= maxLit; i++) steps[i].classList.add("is-lit");
      }
    }

    function enable() {
      if (scenePinned) return;
      scenePinned = true;
      scene.classList.add("scene--pinned");
      steps.forEach((el) => el.classList.remove("is-lit"));
      maxLit = -1; tx = 0;
      requestAnimationFrame(() => { measure(); update(); });
    }

    function disable() {
      if (!scenePinned) return;
      scenePinned = false;
      scene.classList.remove("scene--pinned");
      scene.style.height = "";
      stepsEl.style.transform = "";
      tx = 0; maxLit = -1;
      steps.forEach((el) => el.classList.remove("is-lit"));
    }

    function sync() {
      if (pinnedMQ.matches && !reduce.matches) enable();
      else disable();
    }

    window.addEventListener("scroll", () => {
      if (!scenePinned || queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; update(); });
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (!scenePinned || rQueued) return;
      rQueued = true;
      requestAnimationFrame(() => { rQueued = false; measure(); update(); });
    }, { passive: true });

    if (pinnedMQ.addEventListener) pinnedMQ.addEventListener("change", sync);
    else if (pinnedMQ.addListener) pinnedMQ.addListener(sync);

    sync();
  })();

  /* ============================================================
     识宝：讲解卡支持鼠标/手指从下往上拖开
     ============================================================ */
  (function () {
    const root = $("#shibao");
    if (!root) return;
    const sheet = $(".sb__sheet", root);
    if (!sheet) return;
    const H = () => sheet.offsetHeight || 1;
    const setY = (px) => sheet.style.setProperty("--sy", px + "px");
    let drag = null;

    // shibao.js 的时间轴用类驱动，这里保证两者不打架
    new MutationObserver(() => {
      if (!drag) sheet.style.removeProperty("--sy");
    }).observe(root, { attributes: true, attributeFilter: ["class"] });

    sheet.addEventListener("pointerdown", (e) => {
      if (reduce.matches) return;
      drag = {
        id: e.pointerId,
        startY: e.clientY,
        base: root.classList.contains("is-lifted") ? 0 : H(),
        lastY: e.clientY,
        t: performance.now(),
        v: 0,
      };
      try { sheet.setPointerCapture(e.pointerId); } catch (_) {}
      root.classList.add("is-dragging-sheet");
      setY(drag.base);
    });

    sheet.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      let y = drag.base + (e.clientY - drag.startY);
      if (y < 0) y *= 0.35;                          // 顶部阻尼
      if (y > H()) y = H() + (y - H()) * 0.35;       // 底部阻尼
      setY(y);
      const now = performance.now();
      if (now > drag.t) drag.v = ((e.clientY - drag.lastY) / (now - drag.t)) * 1000;
      drag.lastY = e.clientY;
      drag.t = now;
    });

    const end = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const y = parseFloat(getComputedStyle(sheet).getPropertyValue("--sy")) || 0;
      const v = drag.v;
      drag = null;
      root.classList.remove("is-dragging-sheet");
      const open = y < H() * 0.5 || v < -450;        // 松手用速度判定，不只位置
      root.classList.toggle("is-lifted", open);
      setY(open ? 0 : H());                          // 平滑收尾到目标
    };
    sheet.addEventListener("pointerup", end);
    sheet.addEventListener("pointercancel", end);
  })();

  /* ============================================================
     藏宝阁：滚进视口，作品依次落架 + 收藏数滚动
     ============================================================ */
  (function () {
    const shelf = $("#shelf");
    if (!shelf) return;
    const countEl = $("#vaultCount");
    let tick = null;
    function play() {
      shelf.classList.remove("is-in");
      void shelf.offsetWidth;
      shelf.classList.add("is-in");
      if (!countEl) return;
      if (tick) { clearInterval(tick); tick = null; }
      if (reduce.matches) { countEl.textContent = "3"; return; }
      let n = 0;
      countEl.textContent = "0";
      window.setTimeout(() => {
        tick = window.setInterval(() => {
          n += 1;
          countEl.textContent = String(n);
          if (n >= 3) { clearInterval(tick); tick = null; }
        }, 150);
      }, 320);
    }
    if ("IntersectionObserver" in window) {
      let seen = false;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) { if (!seen) { seen = true; play(); } }
            else { seen = false; }
          });
        },
        { threshold: 0.28 }
      );
      io.observe(shelf);
    } else {
      play();
    }
  })();

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
  let mode = "idle"; // idle | drag | spring
  let rafId = null;        // 当前牌面的动画（回弹）
  let flyRaf = null;       // 退场卡的动画，独立于牌面，抓下一张不会打断它
  let flyingEl = null;     // 正在退场的那张，render() 不碰它
  let pointer = null;
  let suppressClick = false;

  function meter(label, val) {
    const n = parseInt(val, 10) || 0;
    let dots = "";
    for (let i = 0; i < 4; i++) dots += '<i class="' + (i < n ? "on" : "") + '"></i>';
    return '<span class="card__meter"><em>' + label + '</em><span class="card__dots">' + dots + "</span></span>";
  }

  function buildDeck() {
    if (!deck) return;
    CARDS.forEach((c, i) => {
      const el = document.createElement("article");
      el.className = "card";
      el.dataset.index = i;
      el.style.transition = "none";
      el.style.setProperty("--i", i); // 发牌入场的错峰序号
      el.innerHTML =
        '<div class="card__top">' +
          '<span class="card__idx">' + c.idx + "</span>" +
          '<span class="card__tag">' + c.field + "</span>" +
        "</div>" +
        '<h3 class="card__name">' + c.name + "</h3>" +
        '<p class="card__def">' + c.def + "</p>" +
        '<div class="card__meta">' + meter("理解难度", c.difficulty) + meter("常见度", c.common) + "</div>" +
        '<div class="card__prompt">点卡看这一条 <span aria-hidden="true">→</span></div>';
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

  // 任何 NaN 都会让整条 transform 声明失效、卡片瞬间丢失居中，这里统一兜底
  function num(v) { return Number.isFinite(v) ? v : 0; }

  function setCardVars(el, x, y, r, s) {
    el.style.setProperty("--x", num(x) + "px");
    el.style.setProperty("--y", num(y) + "px");
    el.style.setProperty("--r", num(r) + "deg");
    el.style.setProperty("--s", num(s) || 1);
  }

  function render() {
    cardsEl.forEach((el, i) => {
      if (el === flyingEl) return; // 退场中的那张自己管自己
      const off = i - current;
      let x = 0, y = 0, r = 0, s = 0.85, o = 0, z = 100 - off;
      if (off === 0) { x = frontX; y = frontY; r = frontR; s = frontS; o = 1; }
      // 位移收敛：卡片缩小后右边缘不得越过卡组，否则在窄屏上会溢出到版心外
      else if (off === 1) { x = 8; y = 16; r = 2; s = 0.95; o = 1; }
      else if (off === 2) { x = 16; y = 32; r = 4; s = 0.9; o = 1; }
      setCardVars(el, x, y, r, s);
      el.style.opacity = o;
      el.style.zIndex = z;
      el.style.transition = (firstRender || off < 0 || off > 2) ? "none" : "";
      el.style.pointerEvents = off === 0 ? "auto" : "none";
      el.tabIndex = off === 0 ? 0 : -1;
      el.setAttribute("aria-hidden", off === 0 ? "false" : "true");
    });
    firstRender = false;
  }

  function applyFront() {
    const el = cardsEl[current];
    if (!el) return;
    setCardVars(el, frontX, frontY, frontR, frontS);
  }

  function updateProgress() {
    if (deckCount) {
      const txt = CARDS[current] ? CARDS[current].idx + " / " + String(CARDS.length).padStart(2, "0") : "";
      if (deckCount.textContent !== txt) {
        deckCount.textContent = txt;
        deckCount.classList.remove("is-roll");
        void deckCount.offsetWidth;
        deckCount.classList.add("is-roll");
      }
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
    // 用户上手就停掉发牌入场，避免动画和拖拽抢同一个 transform
    const stage = el.parentElement;
    if (stage) stage.classList.remove("is-dealing");
    const v = readVisual(el);
    frontX = v.x; frontY = v.y; frontR = v.rot; frontS = v.scale;

    pointer = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startFrontX: frontX,
      startFrontY: frontY,
      baseScale: v.scale,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      moved: false,
      scaled: false
    };
    suppressClick = false;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
    el.classList.add("is-dragging");
    deck.classList.add("is-dragging");
    mode = "drag";

    // 按下先不放大：等确认是横向拖动再放大，避免纵向滚动被误判
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

    // 只有横向意图明显（横移>8px 且大于纵向）才触发放大，纵向滑动交给页面
    if (!pointer.scaled && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      pointer.scaled = true;
      frontS = pointer.baseScale * 1.02;
    }

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
  /**
   * 飞出。关键在「松手即交接」：
   * 判定甩出的这一刻就把下一张提升为可拖的牌面，退场动画另起一条 rAF 独立跑，
   * 所以松手后可以立刻抓下一张，不会再卡 0.5 秒。
   */
  function flyOut(dir, v0) {
    const el = cardsEl[current];
    if (!el) return;
    const leaving = CARDS[current];
    const entered = dir > 0;
    const cardHalf = el.getBoundingClientRect().width / 2 || 170;
    const startX = frontX;
    const targetX = dir * (window.innerWidth * 1.15 + cardHalf);
    const dist = targetX - startX;
    const k = clamp(Math.abs(v0) / Math.abs(dist || 1), 3.2, 16);

    // 1) 交接：退场的卡摘出交互，牌面立刻前进
    flyingEl = el;
    el.style.pointerEvents = "none";
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    el.classList.remove("is-dragging");
    if (current < CARDS.length - 1) current++;
    frontX = 0; frontY = 0; frontR = 0; frontS = 1;
    mode = "idle";
    render();
    updateProgress();
    updateHints(0);
    updateDecor(0);

    // 2) 退场：独立动画，不碰牌面状态，也不会被下一次拖拽打断
    el.style.transition = "none";
    let fx = startX;
    let prev = performance.now();
    function frame(now) {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const p = 1 - Math.exp(-k * dt);
      fx += (targetX - fx) * p;
      setCardVars(el, fx, 0, dir * 16, 1);
      if (Math.abs(targetX - fx) < 4) {
        el.style.opacity = 0;
        setCardVars(el, 0, 0, 0, 0.85);
        flyingEl = null;
        flyRaf = null;
        return;
      }
      flyRaf = requestAnimationFrame(frame);
    }
    flyRaf = requestAnimationFrame(frame);

    // 右滑 = 进这一课（浮层延后一点，让飞出的动画被看见）
    if (entered && leaving) window.setTimeout(() => openCourse(leaving), 300);
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
  // 「去 App 里看」：关掉浮层并滚到下载区
  const courseCta = $("#courseCta");
  if (courseCta) courseCta.addEventListener("click", () => closeCourse());
  if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCourse(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCourse(); });
  /* 9×9 像素点亮钮：构建 X 点阵，悬停时对角扫过点亮 */
  (function () {
    const grid = $("#courseCloseGrid");
    if (!grid) return;
    const N = 9;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = document.createElement("i");
        if (r === c || r === N - 1 - c) i.className = "on";
        i.style.transitionDelay = (r + c) * 9 + "ms";
        grid.appendChild(i);
      }
    }
    const cells = $$("i", grid);
    const btn = $("#courseClose");
    if (btn) {
      btn.addEventListener("pointerenter", () => cells.forEach((el) => el.classList.add("lit")));
      btn.addEventListener("pointerleave", () => cells.forEach((el) => el.classList.remove("lit")));
    }
  })();

  /* 底栏细条生长菜单：从抽屉克隆链接，点开向上生长（移动端） */
  (function () {
    const dock = $("#dock"), bar = $("#dockBar"), menu = $("#dockMenu");
    if (!dock || !bar || !menu) return;
    const src = $(".nav__drawer-links");
    if (src) $$("a", src).forEach((a) => menu.appendChild(a.cloneNode(true)));
    function close() { dock.classList.remove("is-open"); bar.setAttribute("aria-expanded", "false"); }
    bar.addEventListener("click", () => {
      const open = !dock.classList.contains("is-open");
      dock.classList.toggle("is-open", open);
      bar.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", close));
  })();

  // 焦点陷阱：微课浮层打开时，Tab 只在浮层内循环，不跑到背景
  window.addEventListener("keydown", (e) => {
    if (!overlay || !overlay.classList.contains("is-open") || e.key !== "Tab") return;
    const items = overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

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
      }, { passive: true });
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
    const navInk = $(".nav__ink");
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
      if (navInk) {
        if (hit) {
          navInk.style.width = hit.offsetWidth + "px";
          navInk.style.transform = "translateX(" + hit.offsetLeft + "px)";
        } else {
          navInk.style.width = "0px";
        }
      }
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

  /* ============================================================
     概念卡：光标跟随的小卡预览（仅桌面精细指针）
     - 进入卡组淡入、跟随光标带轻微阻尼；拖拽时让位
     ============================================================ */
  (function () {
    const preview = $("#deckPreview");
    const stage = $(".deck-stage");
    if (!preview || !stage || !finePointer.matches || reduce.matches) return;
    let px = 0, py = 0, cx = 0, cy = 0;
    let active = false, shown = false, lastIdx = -1;

    function fill() {
      const c = CARDS[current];
      if (!c) return;
      preview.innerHTML =
        '<span class="deck-preview__idx">' + c.idx + "</span>" +
        '<span class="deck-preview__name">' + c.name + "</span>" +
        '<span class="deck-preview__hint">进微课 →</span>';
    }

    stage.addEventListener("pointerenter", (e) => {
      active = true;
      cx = px = e.clientX;
      cy = py = e.clientY;
    });
    stage.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
    stage.addEventListener("pointerleave", () => { active = false; });

    (function loop() {
      if (current !== lastIdx) { lastIdx = current; fill(); }
      const dragging = deck && deck.classList.contains("is-dragging");
      const want = active && !dragging;
      if (want !== shown) { shown = want; preview.classList.toggle("is-on", want); }
      if (want) {
        cx += (px - cx) * 0.22;
        cy += (py - cy) * 0.22;
        preview.style.transform =
          "translate3d(" + (cx + 20) + "px," + (cy + 16) + "px,0) rotate(-6deg)";
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ============================================================
     成就吐司：识宝首次收进藏宝阁时弹出；本机 localStorage 去重
     ============================================================ */
  (function () {
    const toast = $("#toast");
    const shelf = $("#shelf");
    if (!toast || !shelf) return;
    const KEY = "artify-toast-vault";
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch (_) {}
    let hideTimer = null;
    function hide() {
      toast.classList.remove("is-on");
      toast.setAttribute("aria-hidden", "true");
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }
    function show() {
      if (seen) return;
      seen = true;
      try { localStorage.setItem(KEY, "1"); } catch (_) {}
      toast.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => toast.classList.add("is-on"));
      hideTimer = window.setTimeout(hide, 5200);
    }
    if ("MutationObserver" in window) {
      new MutationObserver(() => { if (shelf.classList.contains("is-landed")) show(); })
        .observe(shelf, { attributes: true, attributeFilter: ["class"] });
    }
    toast.addEventListener("click", hide);
  })();

  /* ============================================================
     藏宝阁卷角：指针越靠近作品右上角，卷角越大
     ============================================================ */
  (function () {
    if (!finePointer.matches || reduce.matches) return;
    const pieces = $$(".piece");
    if (!pieces.length) return;
    pieces.forEach((p) => {
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        const dx = r.right - e.clientX;
        const dy = e.clientY - r.top;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const peel = Math.max(0, Math.min(1, 1 - dist / 48));
        p.style.setProperty("--peel", peel.toFixed(3));
      }, { passive: true });
      p.addEventListener("pointerleave", () => p.style.setProperty("--peel", "0"));
    });
  })();
})();
