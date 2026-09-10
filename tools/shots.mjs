/* 页面截图（半自动，零第三方依赖）。
 * 用法：node tools/shots.mjs [参数]
 * 原理：用系统 Chrome 的 headless 模式起一个临时实例，通过 CDP（WebSocket）连接，
 *       逐个滚动到锚点后截取视口，png 落到 --out-dir。
 * 依赖：内置 http / child_process / fs，以及 Node 自带的全局 WebSocket；无需构建、无需 npm 安装。
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 默认的六个锚点截图：名字 -> 页面选择器（滚动到该元素顶部后截视口）
const DEFAULT_SHOTS = [
  { name: "hero", sel: "#top" },
  { name: "concept", sel: "#concept" },
  { name: "scene", sel: "#scene" },
  { name: "shibao", sel: "#shibao" },
  { name: "download", sel: "#download" },
  { name: "faq", sel: "#faq" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function printHelp() {
  console.log(`用法：node tools/shots.mjs [参数]

  --url <地址>       页面地址，默认 http://127.0.0.1:8777/
  --out-dir <目录>   截图输出目录，默认 tools/shots
  --width <像素>     视口宽，默认 1440
  --height <像素>    视口高，默认 900
  --dsf <倍数>       设备像素比，默认 1
  --shot <名字=选择器>  自定义截图，可重复；给了就不再用默认六张
  --help             显示本帮助

环境变量：
  CHROME             指定 chrome.exe 路径，默认用系统 Chrome`);
}

function parseArgs(argv) {
  const opts = {
    url: "http://127.0.0.1:8777/",
    outDir: join(ROOT, "tools", "shots"),
    width: 1440,
    height: 900,
    dsf: 1,
    shots: [...DEFAULT_SHOTS],
  };
  let customShots = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) throw new Error(`参数 ${arg} 缺少取值`);
      return argv[++i];
    };
    switch (arg) {
      case "--url": opts.url = val(); break;
      case "--out-dir": opts.outDir = resolve(ROOT, val()); break;
      case "--width": opts.width = Number(val()); break;
      case "--height": opts.height = Number(val()); break;
      case "--dsf": opts.dsf = Number(val()); break;
      case "--shot": {
        if (!customShots) { opts.shots = []; customShots = true; }
        const raw = val();
        const eq = raw.indexOf("=");
        if (eq < 1) throw new Error(`--shot 需要 名字=选择器 形式，收到：${raw}`);
        opts.shots.push({ name: raw.slice(0, eq), sel: raw.slice(eq + 1) });
        break;
      }
      case "--help":
      case "-h": printHelp(); process.exit(0);
      default: throw new Error(`未知参数：${arg}`);
    }
  }
  for (const k of ["width", "height", "dsf"]) {
    if (!Number.isFinite(opts[k]) || opts[k] <= 0) throw new Error(`${k} 需要正数`);
  }
  return opts;
}

// 依次尝试环境变量与常见安装位置
function findChrome() {
  const candidates = [
    process.env.CHROME,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("未找到 Chrome，请用 CHROME 环境变量指定 chrome.exe 路径");
}

function httpJson(url, method = "GET") {
  return new Promise((res, rej) => {
    const req = request(url, { method }, (resp) => {
      let data = "";
      resp.setEncoding("utf8");
      resp.on("data", (c) => { data += c; });
      resp.on("end", () => {
        try { res(JSON.parse(data)); } catch { rej(new Error(`响应不是 JSON：${url}`)); }
      });
    });
    req.on("error", rej);
    req.end();
  });
}

// headless Chrome 启动后会往用户目录写 DevToolsActivePort：第一行是端口
async function waitForPort(profileDir, timeoutMs) {
  const file = join(profileDir, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(file)) {
      const [port] = readFileSync(file, "utf8").split("\n");
      if (port && Number(port)) return Number(port);
    }
    await sleep(100);
  }
  throw new Error("等待 Chrome 调试端口超时");
}

async function getPageTarget(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const list = await httpJson(`http://127.0.0.1:${port}/json/list`);
      const page = (Array.isArray(list) ? list : []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* 端口刚起，稍后重试 */ }
    await sleep(150);
  }
  throw new Error("未找到可用的页面调试目标");
}

// 极简 CDP 客户端：发命令 + 等一次性事件
class CDP {
  constructor(ws) {
    this.ws = ws;
    this._id = 0;
    this._pending = new Map();
    this._events = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const p = this._pending.get(msg.id);
        if (!p) return;
        this._pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) {
        const waiters = this._events.get(msg.method);
        if (waiters) { this._events.delete(msg.method); waiters.forEach((r) => r(msg.params)); }
      }
    });
  }
  send(method, params = {}) {
    const id = ++this._id;
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`等待事件超时：${method}`)), timeoutMs);
      const waiters = this._events.get(method) || [];
      waiters.push((params) => { clearTimeout(timer); resolve(params); });
      this._events.set(method, waiters);
    });
  }
  close() { try { this.ws.close(); } catch { /* 忽略 */ } }
}

function killChrome(proc) {
  if (!proc || proc.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { proc.kill("SIGKILL"); } catch { /* 忽略 */ }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const chromePath = findChrome();
  const profileDir = mkdtempSync(join(tmpdir(), "artify-shots-"));
  mkdirSync(opts.outDir, { recursive: true });

  let chrome;
  let cdp;
  try {
    chrome = spawn(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        `--window-size=${opts.width},${opts.height}`,
        `--force-device-scale-factor=${opts.dsf}`,
        "about:blank",
      ],
      { stdio: "ignore" },
    );

    const port = await waitForPort(profileDir, 20000);
    const target = await getPageTarget(port, 15000);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", () => res(), { once: true });
      ws.addEventListener("error", () => rej(new Error("连接 Chrome 调试 WebSocket 失败")), { once: true });
    });
    cdp = new CDP(ws);

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: opts.dsf,
      mobile: false,
    });

    const loaded = cdp.once("Page.loadEventFired");
    const nav = await cdp.send("Page.navigate", { url: opts.url });
    if (nav && nav.errorText) throw new Error(`页面打不开（${nav.errorText}）：${opts.url}`);
    await loaded;
    await sleep(1200); // 等字体与入场动画稳定

    for (const shot of opts.shots) {
      const expr = `(() => {
        const el = document.querySelector(${JSON.stringify(shot.sel)});
        if (!el) return false;
        el.scrollIntoView({ block: "start" });
        return true;
      })()`;
      const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
      if (!r.result || r.result.value === false) console.log(`  警告：未找到 ${shot.sel}，跳过 ${shot.name}`);
      await sleep(700);
      const cap = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      const file = join(opts.outDir, `${shot.name}.png`);
      writeFileSync(file, Buffer.from(cap.data, "base64"));
      console.log(file);
    }
    console.log(`\n完成：${opts.shots.length} 张，输出目录 ${opts.outDir}`);
  } finally {
    if (cdp) cdp.close();
    killChrome(chrome);
    await sleep(400);
    try { rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* 忽略 */ }
  }
}

main().catch((err) => {
  console.error(`截图失败：${err.message}`);
  process.exit(1);
});
