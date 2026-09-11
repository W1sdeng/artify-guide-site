/* 官网资源与链接自检（零外部依赖）。
 * 用法：node tools/check-assets.mjs
 * 检查：本地引用是否存在 / 是否引入外部资源 / 是否有 emoji / img 是否缺 alt。
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HTML_FILES = ["index.html", "privacy.html", "terms.html"];
const CSS_FILES = ["styles.css"];
const JS_FILES = ["main.js", "shibao.js"];

const failures = [];
const notes = [];

function read(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}
function fail(file, msg) { failures.push(`${file}: ${msg}`); }
function isExternal(u) { return /^https?:\/\//i.test(u); }
// 允许的 CDN 白名单（技术路线：GSAP / ScrollTrigger / three 经 jsDelivr 或 unpkg 引入）
const CDN_ALLOW = [/^https?:\/\/cdn\.jsdelivr\.net\//i, /^https?:\/\/unpkg\.com\//i];
function allowedExternal(u) { return CDN_ALLOW.some((re) => re.test(u)); }

// 去掉 data: URI 后提取 url(...)
function cssUrls(css) {
  const out = [];
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let m;
  while ((m = re.exec(css))) if (!m[2].startsWith("data:")) out.push(m[2]);
  return out;
}

// <img> 是否有非空 alt（属性必须存在）
function checkImgAlt(file, html) {
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const alt = tag.match(/\balt\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
    if (!alt) fail(file, `<img> 缺 alt：${tag.slice(0, 70)}`);
  }
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

// 1) HTML
for (const file of HTML_FILES) {
  const html = read(file);
  if (html == null) { fail(file, "文件不存在"); continue; }

  for (const re of [/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,
                    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,
                    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi]) {
    let m;
    while ((m = re.exec(html))) {
      const u = m[1];
      if (u.startsWith("data:")) continue;
      if (isExternal(u)) {
        if (allowedExternal(u)) notes.push(`${file}: 允许的 CDN 资源 ${u}`);
        else fail(file, `外部资源引用：${u}`);
        continue;
      }
      if (!existsSync(join(ROOT, u.split(/[?#]/)[0]))) fail(file, `本地资源缺失：${u}`);
    }
  }

  checkImgAlt(file, html);

  if (EMOJI.test(html)) {
    const hit = html.match(EMOJI);
    fail(file, `出现 emoji：${hit && hit[0]}`);
  }
}

// 2) CSS
for (const file of CSS_FILES) {
  const css = read(file);
  if (css == null) { fail(file, "文件不存在"); continue; }
  for (const u of cssUrls(css)) {
    if (isExternal(u)) { if (allowedExternal(u)) notes.push(`${file}: 允许的 CDN 资源 ${u}`); else fail(file, `外部资源引用：${u}`); }
    else if (!existsSync(join(ROOT, u.split(/[?#]/)[0]))) fail(file, `本地资源缺失：${u}`);
  }
}

// 3) JS（扫字符串里的直链，宽松判断）
for (const file of JS_FILES) {
  const js = read(file);
  if (js == null) { fail(file, "文件不存在"); continue; }
  const ext = js.match(/["'`]https?:\/\/[^"'`]+["'`]/g) || [];
  for (const e of ext) notes.push(`${file}: 含外部字符串 ${e.slice(0, 60)}`);
}

console.log("== Artify 资源自检 ==");
console.log(`HTML: ${HTML_FILES.join(", ")}  CSS: ${CSS_FILES.join(", ")}`);
console.log(`结果：${failures.length} 项失败`);
failures.forEach((f) => console.log("  FAIL " + f));
notes.forEach((n) => console.log("  note " + n));
if (!failures.length) console.log("全部通过：本地资源齐全、无外部资源、无 emoji、img 均有 alt。");
process.exit(failures.length ? 1 : 0);
