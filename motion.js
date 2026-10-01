/* ============================================================
   文艺指南 Artify · GSAP 动效中枢
   - 库未加载、或 prefers-reduced-motion 时整体跳过，站点保持可用
   - Lenis 惯性滚动（trevornoah 手感）：仅桌面精细指针，启用时关闭桌面 scroll-snap
   - 章节标题随滚动 scrub（词级上浮 + 模糊，滚到哪亮到哪）
   - hero 手机 3D 翻入时间线（视差 scrub 管外层 .phone-wrap，两层互不覆盖）
   - 藏宝阁画作"上色"湿边揭示（随滚动扫出）
   ============================================================ */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis 惯性滚动：桌面开启，与 ScrollTrigger 同驱 ----
     snap 由 CSS 的 html.lenis-on 门控关闭；锚点跳转改走 lenis.scrollTo。 */
  (function () {
    if (!window.Lenis) return;
    const mq = window.matchMedia("(min-width: 861px) and (hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    let lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis-on");
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (!href || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -(document.querySelector(".nav") ? 64 : 0) });
      });
    });
  })();

  /* ---- 章节标题 scrub：main.js 已拆好词，这里交给滚动进度 ----
     start 88% 时词全部藏在遮罩里（模糊 + 沉底），滚到 42% 全部就位；反向滚回会退回。
     必须先用 gsap.set 预置初态：CSS 里的 translateY(112%) 会被 gsap 解析进像素通道，
     与 yPercent 通道叠加后词永远停在中途——set 覆盖后 y 通道归零。 */
  (function () {
    document.querySelectorAll("main section h2").forEach((h) => {
      const words = h.querySelectorAll(".word__in");
      if (!words.length) { h.classList.add("is-splitin"); return; }
      gsap.set(words, { yPercent: 112, filter: "blur(6px)" });
      gsap.to(words, {
        yPercent: 0, filter: "blur(0px)", ease: "none",
        stagger: { each: 0.05, from: "start" },
        scrollTrigger: { trigger: h, start: "top 88%", end: "top 42%", scrub: 0.4 }
      });
    });
  })();

  /* ---- hero 手机翻入：一次性时间线，只在入场时刻播，不参与滚动 ---- */
  (function () {
    const phone = document.querySelector("#heroPhone");
    const media = document.querySelector(".hero__media");
    if (!phone || !media) return;
    phone.classList.add("phone--wait");
    let played = false;
    function heroIn() {
      if (played) return;
      played = true;
      gsap.timeline({ delay: 0.35 })
        .fromTo(media, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, 0)
        .fromTo(phone,
          { rotateY: 70, y: 46, scale: 0.94, opacity: 0 },
          { rotateY: 0, y: 0, scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.4)" }, 0.05)
        .set(phone, { clearProps: "transform,opacity" });
    }
    const title = document.querySelector("#heroTitle");
    if (title && title.classList.contains("is-in")) heroIn();
    else window.addEventListener("hero:in", heroIn, { once: true });
  })();

  /* ---- 首屏手机随滚动 scrub 旋转/下沉：作用在 .phone-wrap 外层 ----
     （入场翻转作用于内层 #heroPhone，wrap 与 phone 各写各的 transform，不打架） */
  const wrap = document.querySelector(".hero__media .phone-wrap");
  if (wrap) {
    gsap.fromTo(
      wrap,
      { rotate: 0, y: 0 },
      {
        rotate: 6, y: 64,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      }
    );
  }

  // 藏宝阁画作"上色"揭示 + 湿边光带：随滚动从左往右把画"扫"出来
  gsap.utils.toArray("#shelf .piece img").forEach((img, i) => {
    const piece = img.parentElement;
    const wet = document.createElement("span");
    wet.className = "piece__wet";
    wet.setAttribute("aria-hidden", "true");
    if (piece) piece.appendChild(wet);
    const st = { trigger: img, start: "top 92%", end: "top 52%", scrub: 0.5 + i * 0.12 };
    const tl = gsap.timeline({ scrollTrigger: st });
    tl.fromTo(img, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", ease: "none" }, 0);
    if (piece) {
      tl.fromTo(wet, { x: 0, opacity: 0 }, { x: piece.clientWidth || 120, ease: "none" }, 0)
        .to(wet, { opacity: 0.95, duration: 0.04 }, 0.02)
        .to(wet, { opacity: 0, duration: 0.05 }, 0.95);
    }
  });
})();
