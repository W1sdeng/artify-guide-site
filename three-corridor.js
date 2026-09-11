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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

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
