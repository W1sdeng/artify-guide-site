"""文艺指南官网素材流水线。

输入：tools/source-screens/ 下的真机截图（安卓模拟器 Pixel_6 实拍，1080x2400）、
      App 仓库里的品牌字标与图标。
输出：assets/ 下的 WebP 截图、字标、下载二维码、favicon。

重新截图后，把新图覆盖到 tools/source-screens/ 同名文件，再跑本脚本即可。

用法（在 artify-site 目录下）：
  <venv-python> tools/build-assets.py
"""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FONTS = os.path.join(ASSETS, "fonts")
SOURCE = os.path.join(ROOT, "tools", "source-screens")

APP_RES = r"D:\ArtsGuide\app\app\src\main\res\drawable-nodpi"

# 二维码指向官网本身（桌面端扫码 → 手机打开官网 → 下载安卓包）
SITE_URL = "https://w1sdeng.github.io/artify-guide-site/"

SCREENSHOTS = {
    "screenshot-today.webp": "today.png",
    "screenshot-scene.webp": "scene.png",
    "screenshot-handbook.webp": "handbook.png",
    "screenshot-route.webp": "route.png",
}


def ensure_dirs() -> None:
    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(FONTS, exist_ok=True)


def build_screenshots() -> None:
    for out_name, src_name in SCREENSHOTS.items():
        src = os.path.join(SOURCE, src_name)
        im = Image.open(src).convert("RGB")
        width = 1080
        if im.width != width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        out = os.path.join(ASSETS, out_name)
        im.save(out, "WEBP", quality=86, method=6)
        print(f"{out_name}: {im.size} {os.path.getsize(out) // 1024}KB")


def build_wordmark() -> None:
    im = Image.open(os.path.join(APP_RES, "artify_logo_transparent.png")).convert("RGBA")
    im = im.crop(im.split()[3].getbbox())  # 裁掉透明边
    width = 640
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    out = os.path.join(ASSETS, "artify-wordmark.png")
    im.save(out, "PNG", optimize=True)
    print(f"artify-wordmark.png: {im.size} {os.path.getsize(out) // 1024}KB")


def build_qr() -> None:
    import segno

    qr = segno.make(SITE_URL, error="m")
    out = os.path.join(ASSETS, "qr-download.png")
    qr.save(out, scale=16, border=2, dark="#252527", light="#FFF9EC")
    print(f"qr-download.png: {SITE_URL} {os.path.getsize(out) // 1024}KB")


def build_favicon() -> None:
    im = Image.open(os.path.join(APP_RES, "ic_launcher.png")).convert("RGB")
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side))
    for size, name in ((180, "apple-touch-icon.png"), (64, "favicon-64.png")):
        im.resize((size, size), Image.LANCZOS).save(
            os.path.join(ASSETS, name), "PNG", optimize=True
        )
    im.resize((48, 48), Image.LANCZOS).save(
        os.path.join(ROOT, "favicon.ico"), sizes=[(48, 48)]
    )
    print("favicon: ok")


if __name__ == "__main__":
    ensure_dirs()
    build_screenshots()
    build_wordmark()
    build_qr()
    build_favicon()
    print("done ->", ASSETS)
