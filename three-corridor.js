/* ============================================================
   概念长廊：three.js 3D 走廊
   - 滚动驱动相机向长廊深处前进；离开视口暂停渲染
   - WebGL 不可用 / 库加载失败 / 减动效 → 回退静态（.is-fallback）
   ============================================================ */
import * as THREE from "three";

(function () {
  "use strict";
  const stage = document.getElementById("corridorStage");
  const canvas = document.getElementById("corridorCanvas");
  if (!stage || !canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    stage.classList.add("is-fallback");
    return;
  }
  // 性能分级：低端设备用 1x 像素比，减少 WebGL 负担
  const lowEnd = document.documentElement.classList.contains("perf-low")
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  renderer.setPixelRatio(lowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 400);
  camera.position.set(0, 0, 0);

  const COLS = [0x92ddd1, 0x92a7ed, 0xf1ce67, 0xe98bcf, 0xcbcbe7];
  const group = new THREE.Group();
  scene.add(group);
  const N = 26;
  for (let i = 0; i < N; i++) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 9, 0.25));
    const mat = new THREE.LineBasicMaterial({ color: COLS[i % COLS.length], transparent: true, opacity: 0.92 });
    const frame = new THREE.LineSegments(geo, mat);
    frame.position.z = -i * 7 - 4;
    frame.position.x = (i % 2 ? 1 : -1) * 0.4;
    frame.rotation.z = (i % 2 ? 1 : -1) * 0.04;
    group.add(frame);
  }

  // 概念牌：纸底 + 墨边 + 词，做成 CanvasTexture 贴在平面上
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function makeLabel(text) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const g = c.getContext("2d");
    g.fillStyle = "#FFF9EC";
    g.strokeStyle = "#252527";
    g.lineWidth = 10;
    roundRect(g, 10, 10, c.width - 20, c.height - 20, 30);
    g.fill();
    g.stroke();
    g.fillStyle = "#252527";
    g.font = "700 62px 'FangYuan','Microsoft YaHei',sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  const WORDS = ["本真性", "惯习", "陌生化", "媒介即讯息", "侘寂", "网络化公众", "虚无主义", "元小说"];
  for (let i = 0; i < WORDS.length; i++) {
    const mat = new THREE.MeshBasicMaterial({ map: makeLabel(WORDS[i]), transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.0), mat);
    mesh.position.set(i % 2 ? 1.7 : -1.7, 0, -i * (N * 7 / WORDS.length) - 12);
    group.add(mesh);
  }

  function resize() {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let target = 0, cur = 0, visible = false;
  function scrollProgress() {
    const r = stage.getBoundingClientRect();
    return Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
  }
  function frame() {
    if (!visible) return;
    cur += (target - cur) * 0.12;
    group.position.z = cur * (N * 7 - 20);
    camera.rotation.y = Math.sin(cur * Math.PI * 2) * 0.06;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", function () { target = scrollProgress(); }, { passive: true });
  window.addEventListener("resize", function () { resize(); target = scrollProgress(); }, { passive: true });

  if ("IntersectionObserver" in window && !reduce.matches) {
    const io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        visible = en.isIntersecting;
        if (visible) { target = scrollProgress(); requestAnimationFrame(frame); }
      });
    }, { threshold: 0.05 });
    io.observe(stage);
  }

  resize();
  if (reduce.matches) {
    cur = target = 0.08;
    group.position.z = cur * (N * 7 - 20);
    renderer.render(scene, camera);
  }
})();
