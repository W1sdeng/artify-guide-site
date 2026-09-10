/* ============================================================
   识宝演示动画
   展厅照 -> 识别扫描 -> 光线绕画作一圈 -> 黑墨白线加粗
   -> 抠图（行人消失）-> 底部说明 -> 存进藏宝阁
   只用 class 切换驱动 CSS 过渡，JS 负责时间轴与循环控制。
   ============================================================ */
(function () {
  "use strict";

  const root = document.getElementById("shibao");
  if (!root) return;

  const countEl = document.getElementById("shibaoCount");
  const replayBtn = document.getElementById("shibaoReplay");
  const shelf = document.getElementById("shelf");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  // 飞入临时层：克隆手机里的抠图，落到书柜第一幅作品的位置
  let ghost = null;
  let flyTimer = null;

  // 时间轴：毫秒 -> 要加上的 class
  const STEPS = [
    [0, "is-viewfinder"],
    [620, "is-scanning"],
    [1180, "is-tracing"],
    [1760, "is-inking"],
    [2360, "is-cutting"],
    [2940, "is-lifted"],   // 讲解卡从下往上滑出
    [3420, "is-reading"],  // 卡内分段逐段浮现
    [3900, "is-vaulting"], // 飞一份进藏宝阁
  ];
  const CLASSES = STEPS.map((s) => s[1]);

  let timers = [];
  let vaultTimer = null;

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    if (vaultTimer) { clearTimeout(vaultTimer); vaultTimer = null; }
  }

  function setCount(n) {
    if (countEl) countEl.textContent = String(n);
  }

  function clearFly() {
    if (ghost) { ghost.remove(); ghost = null; }
    if (flyTimer) { clearTimeout(flyTimer); flyTimer = null; }
  }

  function land() {
    if (shelf) shelf.classList.add("is-landed");
  }

  function reset() {
    CLASSES.forEach((c) => root.classList.remove(c));
    setCount(0);
    clearFly();
    if (shelf) shelf.classList.remove("is-landed");
  }

  function finish() {
    // 减动效 / 不支持时：直接给终态，不飞
    CLASSES.forEach((c) => root.classList.add(c));
    setCount(1);
    land();
  }

  // 抠图从手机飞向书柜第一幅作品；落位后给书柜加 is-landed 触发轻微回弹
  function fly() {
    if (reduce.matches) { land(); return; }
    clearFly();
    const cut = root.querySelector(".sb__cut");
    const target = shelf && shelf.querySelector(".piece img");
    if (!cut || !target) { land(); return; }
    const from = cut.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) { land(); return; }

    ghost = cut.cloneNode(true);
    ghost.className = "sb__cut sb__fly";
    ghost.style.opacity = "1";
    ghost.style.left = from.left + "px";
    ghost.style.top = from.top + "px";
    ghost.style.width = from.width + "px";
    ghost.style.height = from.height + "px";
    document.body.appendChild(ghost);

    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const s = to.width / from.width;
    const el = ghost;
    // 先落在起点，下一帧再起飞，过渡才会跑
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el.isConnected) return;
        el.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
      });
    });
    flyTimer = window.setTimeout(() => { flyTimer = null; clearFly(); land(); }, 640);
  }

  function play() {
    stop();
    reset();
    if (reduce.matches) { finish(); return; }
    // 强制回流，保证 reset 先生效、过渡能重新跑
    void root.offsetWidth;
    STEPS.forEach(([t, cls]) => {
      timers.push(window.setTimeout(() => {
        root.classList.add(cls);
        if (cls === "is-vaulting") fly();
      }, t));
    });
    vaultTimer = window.setTimeout(() => setCount(1), 3980);
  }

  let played = false;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && !played) {
            played = true;
            play();
            io.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(root);
  } else {
    play();
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      played = true;
      play();
    });
  }
})();
