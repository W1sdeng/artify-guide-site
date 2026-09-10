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
      shots.mjs         半自动页面截图（headless Chrome + CDP，输出到 tools/shots）
      check-assets.mjs  资源与链接自检
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

### 页面截图

想在本地截几张图预览或存档，先起本地服务，再跑截图脚本：

    py -3 -m http.server 8777 --bind 127.0.0.1 --directory .
    node tools/shots.mjs

`tools/shots.mjs` 用系统 Chrome 的 headless 模式（零第三方依赖、无需构建），
默认滚动到首屏 / 概念卡 / 现场题 / 识宝 / 下载 / FAQ 六个锚点各截一张，png 存进 `tools/shots/`。
常用参数：

    --url <地址>       页面地址，默认 http://127.0.0.1:8777/
    --out-dir <目录>   输出目录，默认 tools/shots
    --width / --height / --dsf   视口尺寸与像素比，默认 1440x900、1 倍
    --shot 名字=选择器  自定义截图，可重复；给了就不再截默认六张
    --help             查看全部参数

Chrome 默认取 `C:\Program Files\Google\Chrome\Application\chrome.exe`，可用 `CHROME` 环境变量覆盖。

## 发布

推送到 `main` 分支即可，GitHub Pages 会自动构建：

    git push origin main
