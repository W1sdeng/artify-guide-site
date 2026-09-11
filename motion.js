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

  // Phase 1 + 3：藏宝阁画作"上色"揭示 + 湿边光带
  // 随滚动从左往右把画"扫"出来，一条青柠湿边跟着扫描头走
  gsap.utils.toArray("#shelf .piece img").forEach((img, i) => {
    const wrap = img.parentElement;
    const wet = document.createElement("span");
    wet.className = "piece__wet";
    wet.setAttribute("aria-hidden", "true");
    if (wrap) wrap.appendChild(wet);
    const st = { trigger: img, start: "top 92%", end: "top 52%", scrub: 0.5 + i * 0.12 };
    const tl = gsap.timeline({ scrollTrigger: st });
    tl.fromTo(img, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: "none" }, 0);
    if (wrap) {
      tl.fromTo(wet, { x: 0, opacity: 0 }, { x: wrap.clientWidth || 120, ease: "none" }, 0)
        .to(wet, { opacity: 0.95, duration: 0.04 }, 0.02)
        .to(wet, { opacity: 0, duration: 0.05 }, 0.95);
    }
  });
})();
