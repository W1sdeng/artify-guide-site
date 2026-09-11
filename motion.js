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

  // Phase 1：藏宝阁画作"上色"揭示（paint-reveal 的 2D 近似）
  // 随滚动从左往右把画"扫"出来，落到位后交给 CSS 的常驻样式
  gsap.utils.toArray("#shelf .piece img").forEach((img, i) => {
    gsap.fromTo(
      img,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        ease: "none",
        scrollTrigger: { trigger: img, start: "top 92%", end: "top 55%", scrub: 0.5 + i * 0.12 }
      }
    );
  });
})();
