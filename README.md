# 文艺指南 Artify · 官网

帮年轻人在文艺场合「不露馅」的安卓 App 官网，静态单页，GitHub Pages 托管。

线上地址：https://w1sdeng.github.io/artify-guide-site/

## 文件结构

    index.html          页面结构与全部文案
    styles.css          设计 token + 布局 + 动效
    main.js             概念卡拖拽、滚动叙事、章节导航高亮等交互
    assets/
      fonts/            阿里妈妈方圆体子集（woff2）+ Montserrat
      screenshot-*.webp 真机截图（今日 / 现场题 / 手册 / 路线）
      artify-wordmark.png 品牌字标
      qr-download.png   下载区二维码（指向本站官网）
    shibao.js           识宝演示动画（照片→识别→描边→抠图→说明→藏宝阁）
    tools/
      build-assets.py   从 source-screens 生成 WebP / 字标 / 二维码 / favicon
      build-shibao.py   合成识宝演示素材（展厅照 / 抠图 / 轮廓）
      subset-fonts.py   按页面实际用字生成字体子集
      source-screens/   真机截图原图（1080x2400，安卓模拟器实拍）

## 本地预览

    python -m http.server 8777

然后打开 http://127.0.0.1:8777/

## 设计约束

- 视觉与 App 同源：长春花蓝 `#9FAFF0` 画布、暖纸 `#FFF9EC` 卡片、2px 墨色描边 `#252527`、
  零模糊硬阴影、圆角 16/12/8/999、青柠 `#CBEF72` 主 CTA、弹性缓动 `cubic-bezier(.34,1.56,.64,1)`
- 全站零 emoji，图标一律内联 SVG（24x24 网格、2px 描边）
- 纯静态、零构建、无 CDN；动画只用 transform / opacity

## 更新素材

换真机截图：把新图覆盖到 `tools/source-screens/`（today.png / scene.png / handbook.png / route.png），然后

    <venv-python> tools/build-assets.py

识宝演示素材（展厅照 / 抠图 / 轮廓路径）由本地公有领域油画合成，换画作只需改脚本里的
`BACKDROP_DIR` / `KEYWORD` / `PAINT`：

    <venv-python> tools/build-shibao.py

改过页面文案后，字体子集需要重跑，否则新出现的字可能缺字形：

    <venv-python> tools/subset-fonts.py

## 发布

推送到 `main` 分支即可，GitHub Pages 会自动构建：

    git push origin main
