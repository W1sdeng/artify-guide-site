/* ============================================================
   文艺指南 Artify · GSAP / ScrollTrigger 效果层
   - 库未加载、或 prefers-reduced-motion 时整体跳过，站点保持可用
   - Phase 0：首屏手机随滚动 scrub 旋转/下沉（替代 main.js 的手写视差）
   ============================================================ */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const phone = document.querySelector("#heroPhone");
  if (phone) {
    gsap.fromTo(
      phone,
      { rotate: -3, y: 0 },
      {
        rotate: 3,
        y: 64,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      }
    );
  }
})();
