/* ============================================================
   文艺指南 Artify 官网 · 视口触发层
   只负责在合适时机给元素加类；样式全部在 styles-effects.css。
   不依赖 main.js 的全局，自己查 DOM。
   - 加类后立刻 unobserve，不做滚动重算
   - prefers-reduced-motion 时直接加终态类
   ============================================================ */
(function () {
  "use strict";

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // 第 5 项：逐行幕布揭示的目标
  var lines = document.querySelectorAll(".install__steps li, .faq__item");
  // 第 2 项：章节标题下划线
  var titles = document.querySelectorAll("main section h2");

  // 先落初态类。脚本在首帧前同步执行，不会先闪一下再藏。
  lines.forEach(function (el) {
    el.classList.add("fx-rise");
  });

  function settle(el) {
    el.classList.add("fx-in");
  }

  // 减动效或不支持 IO：全部直达终态
  if (reduce || !hasIO) {
    lines.forEach(settle);
    titles.forEach(settle);
    return;
  }

  var io = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        settle(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  lines.forEach(function (el) {
    io.observe(el);
  });
  titles.forEach(function (el) {
    io.observe(el);
  });
})();
