"""按官网实际用到的字符集，把阿里妈妈方圆体与 Montserrat 子集化为 woff2。

用法（在 artify-site 目录下）：
  <venv-python> tools/subset-fonts.py

改了页面文案后需要重跑本脚本，否则新字可能缺字形。
"""
from __future__ import annotations

import os
import re

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fonts")

APP_FONT_DIR = r"D:\ArtsGuide\app\app\src\main\res\font"
FANGYUAN_REGULAR = os.path.join(APP_FONT_DIR, "alimama_fangyuan_regular.ttf")
FANGYUAN_BOLD = os.path.join(APP_FONT_DIR, "alimama_fangyuan_bold.ttf")
MONTSERRAT = os.path.join(APP_FONT_DIR, "montserrat_variable.ttf")

TEXT_SOURCES = ["index.html", "privacy.html", "terms.html", "styles.css", "main.js"]

# 兜底字符：ASCII 可打印 + 常用中文标点与符号，防止后续微调文案时缺字
EXTRA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "　、。，！？；：（）【】《》「」『』·—…‰‘’“”－·°％×÷≤≥≠→←↑↓"
    + "0123456789"
)


def collect_chars() -> str:
    chars: set[str] = set(EXTRA)
    for name in TEXT_SOURCES:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            chars.update(fh.read())
    # 去掉控制字符
    return "".join(sorted(c for c in chars if c.isprintable() or c == " "))


def subset_to(src: str, dst: str, text: str) -> None:
    font = TTFont(src, lazy=True)
    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.drop_tables += ["DSIG"]
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(dst)
    font.close()
    print(f"{os.path.basename(dst)}: {os.path.getsize(dst) // 1024}KB")


def montserrat_black(dst: str, text: str) -> None:
    font = TTFont(MONTSERRAT)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": 900}, inplace=False, updateFontNames=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(dst)
    font.close()
    print(f"{os.path.basename(dst)}: {os.path.getsize(dst) // 1024}KB")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    hans = collect_chars()
    latin = "".join(sorted(set(EXTRA) | set(re.findall(r"[0-9A-Za-z .,:/-]", hans))))
    print(f"汉字/符号 {len(hans)} 个，拉丁 {len(latin)} 个")

    subset_to(FANGYUAN_REGULAR, os.path.join(OUT, "fangyuan-regular.woff2"), hans)
    subset_to(FANGYUAN_BOLD, os.path.join(OUT, "fangyuan-bold.woff2"), hans)
    montserrat_black(os.path.join(OUT, "montserrat-black.woff2"), latin)


if __name__ == "__main__":
    main()
