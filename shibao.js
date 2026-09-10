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
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  function reset() {
    CLASSES.forEach((c) => root.classList.remove(c));
    setCount(0);
  }

  function finish() {
    // 减动效 / 不支持时：直接给终态
    CLASSES.forEach((c) => root.classList.add(c));
    setCount(1);
  }

  function play() {
    stop();
    reset();
    if (reduce.matches) { finish(); return; }
    // 强制回流，保证 reset 先生效、过渡能重新跑
    void root.offsetWidth;
    STEPS.forEach(([t, cls]) => {
      timers.push(window.setTimeout(() => root.classList.add(cls), t));
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
