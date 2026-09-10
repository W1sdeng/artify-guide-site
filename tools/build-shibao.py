"""识宝演示素材：从公有领域油画合成一张「展厅照」+ 抠图 + 轮廓。

产出（assets/）：
  shibao-scene.webp   1200x900  带环境的展厅照片（墙、画框、展签、行人剪影）
  shibao-cut.webp      760x950  只留画作、透明底（抠图结果）
  shibao-outline.txt            画作轮廓的 SVG path（相对于画作区域）

画作取本地公有领域的莫奈睡莲。换图只需改 SRC 与 PAINT_RECT。

用法（在 artify-site 目录下）：
  <venv-python> tools/build-shibao.py
"""
from __future__ import annotations

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

# 画作源：本地公有领域的莫奈睡莲（文件名含中文，用 glob 选分辨率最高的那张）
BACKDROP_DIR = r"D:\ArtsGuide\backgrounds"
KEYWORD = "Water Lilies"

SCENE_W, SCENE_H = 1200, 900
# 画作在展厅照里的位置与尺寸（不含画框）
PAINT = (352, 132, 560, 700)          # left, top, w, h  —— 比例 0.8
FRAME_W = 26                          # 外框宽度
LINER_W = 9                           # 内衬宽度
CUT_W, CUT_H = 760, 950               # 抠图导出尺寸（同比例 0.8）

random.seed(7)


def pick_source() -> str:
    import glob

    hits = [p for p in glob.glob(os.path.join(BACKDROP_DIR, "*")) if KEYWORD in os.path.basename(p)]
    if not hits:
        raise SystemExit("找不到睡莲素材：" + BACKDROP_DIR)
    def area(p):
        try:
            with Image.open(p) as im:
                return im.width * im.height
        except Exception:
            return 0
    return max(hits, key=area)


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    """按 cover 方式缩放到目标尺寸（保持比例、居中裁切）。"""
    sr, tr = im.width / im.height, w / h
    if sr > tr:
        nh = h
        nw = max(1, round(h * sr))
    else:
        nw = w
        nh = max(1, round(w / sr))
    im = im.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def grain(im: Image.Image, amount: int = 6) -> Image.Image:
    import random as _r
    px = im.load()
    w, h = im.size
    for _ in range(w * h // 14):
        x, y = _r.randrange(w), _r.randrange(h)
        r, g, b = px[x, y]
        d = _r.randint(-amount, amount)
        px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return im


def vignette(im: Image.Image, strength: float = 0.42) -> Image.Image:
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-w * 0.28, -h * 0.28, w * 1.28, h * 1.28), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    dark = ImageEnhance.Brightness(im).enhance(1 - strength)
    return Image.composite(im, dark, mask)


def build() -> None:
    src_path = pick_source()
    src = Image.open(src_path).convert("RGB")
    print("画作源：", os.path.basename(src_path))

    # ── 画作本体（抠图用的干净版本） ──────────────────────────────
    painting = fit(src, CUT_W, CUT_H)
    # 轻微提亮 + 加一点点对比，像打了展厅射灯
    painting = ImageEnhance.Contrast(painting).enhance(1.04)
    painting = ImageEnhance.Brightness(painting).enhance(1.02)

    # ── 展厅照 ────────────────────────────────────────────────────
    wall = Image.new("RGB", (SCENE_W, SCENE_H), (196, 188, 176))
    wd = ImageDraw.Draw(wall)
    # 墙面竖向明暗梯度（射灯打下来）
    for y in range(SCENE_H):
        k = 1.0 - 0.16 * (y / SCENE_H)
        wd.line([(0, y), (SCENE_W, y)], fill=(int(198 * k), int(190 * k), int(178 * k)))
    wall = ImageEnhance.Brightness(wall).enhance(1.0).filter(ImageFilter.GaussianBlur(0.6))

    # 左边缘：旁边另一幅画的一角（虚化、压暗）
    nb = fit(src, 260, 380)
    nb = ImageEnhance.Brightness(nb).enhance(0.78)
    nb = nb.filter(ImageFilter.GaussianBlur(2.2))
    wall.paste(nb, (-150, 300))

    px, py, pw, ph = PAINT

    # 画框投影
    shadow = Image.new("RGBA", (SCENE_W, SCENE_H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    o = FRAME_W + LINER_W
    sd.rectangle((px - o + 10, py - o + 14, px + pw + o + 10, py + ph + o + 14), fill=(30, 24, 18, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    wall = Image.alpha_composite(wall.convert("RGBA"), shadow).convert("RGB")

    wd = ImageDraw.Draw(wall)
    # 外框（深色木框）
    wd.rectangle((px - o, py - o, px + pw + o, py + ph + o), fill=(38, 32, 28))
    wd.rectangle((px - o + 5, py - o + 5, px + pw + o - 5, py + ph + o - 5), fill=(58, 48, 40))
    # 内衬（米色卡纸）
    wd.rectangle((px - LINER_W, py - LINER_W, px + pw + LINER_W, py + ph + LINER_W), fill=(214, 205, 188))

    # 画作贴入
    wall.paste(painting.resize((pw, ph), Image.LANCZOS), (px, py))

    # 展签（画框左下，避开前景行人）
    lx, ly = px - o - 122, py + ph - 54
    wd.rectangle((lx, ly, lx + 96, ly + 66), fill=(232, 228, 219))
    wd.rectangle((lx, ly, lx + 96, ly + 66), outline=(150, 142, 130), width=1)
    for i in range(4):
        wd.line([(lx + 9, ly + 12 + i * 13), (lx + 9 + (74 if i % 2 == 0 else 52), ly + 12 + i * 13)],
                fill=(120, 114, 104), width=3)

    # 前景行人剪影（虚化的头+肩，压在画面右下角）
    person = Image.new("RGBA", (SCENE_W, SCENE_H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(person)
    pd.ellipse((862, 612, 1006, 760), fill=(26, 24, 26, 255))          # 头
    pd.rounded_rectangle((790, 736, 1090, 1040), radius=120, fill=(24, 22, 24, 255))  # 肩
    person = person.filter(ImageFilter.GaussianBlur(9))
    wall = Image.alpha_composite(wall.convert("RGBA"), person).convert("RGB")

    # 相机质感
    wall = vignette(wall, 0.40)
    wall = grain(wall, 7)
    wall = ImageEnhance.Color(wall).enhance(1.05)

    scene_out = os.path.join(ASSETS, "shibao-scene.webp")
    wall.save(scene_out, "WEBP", quality=84, method=6)
    print("shibao-scene.webp:", wall.size, os.path.getsize(scene_out) // 1024, "KB")

    # ── 抠图：透明底 + 2px 羽化边 ─────────────────────────────────
    cut = painting.convert("RGBA")
    alpha = Image.new("L", cut.size, 255)
    ad = ImageDraw.Draw(alpha)
    ad.rounded_rectangle((0, 0, cut.width - 1, cut.height - 1), radius=3, fill=255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))
    cut.putalpha(alpha)
    cut_out = os.path.join(ASSETS, "shibao-cut.webp")
    cut.save(cut_out, "WEBP", quality=80, method=6)
    print("shibao-cut.webp:", cut.size, os.path.getsize(cut_out) // 1024, "KB")

    # ── 轮廓 path（0..CUT_W × 0..CUT_H，带一点点检测感的抖动） ────
    w, h = CUT_W, CUT_H
    step = 26
    pts = []

    def jitter(base):
        return base + random.uniform(-1.6, 1.6)

    for x in range(0, w, step):
        pts.append((jitter(x), jitter(2)))
    for y in range(0, h, step):
        pts.append((jitter(w - 2), jitter(y)))
    for x in range(w, 0, -step):
        pts.append((jitter(x), jitter(h - 2)))
    for y in range(h, 0, -step):
        pts.append((jitter(2), jitter(y)))

    d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
    for x, y in pts[1:]:
        d += f"L{x:.1f},{y:.1f}"
    d += "Z"
    txt = os.path.join(ASSETS, "shibao-outline.txt")
    with open(txt, "w", encoding="utf-8") as f:
        f.write(d)
    print("shibao-outline.txt:", len(d), "字符 ->", txt)


if __name__ == "__main__":
    build()

