# 琴键练习 · lyre-practice

浏览器里的练琴页面：多首曲目、21 键键位可视化、实时合成琴音、下一个键提示。

## 跑起来

```bash
npm start                 # → http://localhost:8080
```

需要 Node ≥ 20.11（脚本里用了 `import.meta.dirname`）。换端口 `PORT=9000 npm start`；想让同局域网访问 `HOST=0.0.0.0 npm start`（默认只绑 127.0.0.1）。

或者任意静态服务器：

```bash
python -m http.server 8080
```

**为什么要本地服务**：曲目是独立 JSON 文件，浏览器不允许 `file://` 页面读取本地 JSON（CORS）。想要双击就打开的话，跑一次：

```bash
npm run build             # → dist/index.html，曲目已内联，单文件、可双击
npm run check             # 曲目数据体检：id 对齐、bpm 范围、拍号、非法记号
```

## 曲目

| 顺序 | id | 曲名 | 拍号 | 速度 |
|---|---|---|---|---|
| 1 | `outer-wilds` | 星际拓荒主题曲 | 4/4 | ♩=90 |
| 2 | `dream-aria` | 梦之咏叹 | 4/4 | ♩=160 |
| 3 | `smile` | 皎洁的笑颜 | 4/4 | ♩=160 |
| 4 | `never-forget` | 我不曾忘记 | 4/4 | ♩=160 |
| 5 | `birthday` | 生日快乐 | 3/4 | ♩=100 |

顺序由 `songs/index.json` 的数组决定，第一首是默认打开的曲子。

## 键位

7×3 共 21 个格子，对应键盘从 `Q`（左上）到 `M`（右下）的三排：

| 行 | 键位 | 简谱 | 唱名 |
|---|---|---|---|
| 上排（高音） | `Q W E R T Y U` | 1̇ 2̇ 3̇ 4̇ 5̇ 6̇ 7̇ | do re mi fa so la ti |
| 中排（中音） | `A S D F G H J` | 1 2 3 4 5 6 7 | do re mi fa so la ti |
| 下排（低音） | `Z X C V B N M` | 1̣ 2̣ 3̣ 4̣ 5̣ 6̣ 7̣ | do re mi fa so la ti |

## 操作

| 操作 | 说明 |
|---|---|
| 字母键 / 点击琴键 | 发出对应琴音 |
| `空格` | 开始 / 停止（跟弹、自由模式下为重新开始） |
| `Esc` | 重置 |
| 曲目下拉框 | 换曲子 |
| 速度滑杆 | 40–200 BPM，切换曲目时自动套用该曲速度 |

四种模式：

- **跟弹** —— 弹对高亮的键就前进，不看节拍，适合初学
- **跟拍** —— 按曲目速度走时间轴，判定精准 / 不错 / 还行，漏音记 miss
- **示范** —— 自动弹一遍；键盘上高亮的就是此刻正在响的那个音，可以跟着一起弹
- **自由** —— 没有谱面目标，随便弹；下方会把最近弹过的音排成一条"磁带"

和弦（如 `A+E`）需要两个键一起按，跟弹模式下按一半时高亮会缩到剩下的那个键。

## 加一首曲子

1. 在 `songs/` 下新建 `xxx.json`：

```json
{
  "id": "xxx",
  "title": "曲名",
  "from": "出处",
  "timeSig": "4/4",
  "beatsPerMeasure": 4,
  "bpm": 90,
  "score": "A G J [0 G] | [Q J] [H G] [H J] G"
}
```

2. 把 `"xxx"` 加进 `songs/index.json` 的 `songs` 数组。

### 谱面语法

| 写法 | 含义 |
|---|---|
| `A` | 一个音，占一拍 |
| `A+E` | 和弦，两个键同时按下 |
| `0` | 空拍（休止），也接受 `-` 和 `.` |
| `[Q J]` | 一拍里平分（八分音符），外面会画一条横梁 |
| `[W E W]` | 一拍里平分三份（三连音） |
| `[W E W]:0.5` | 三个音挤进半拍，速度翻倍 |
| `J:2` | 这个音占两拍 |
| `\|` | 强制换小节；不写就按 `beatsPerMeasure` 自动分小节 |

写错的记号（比如 `K`、`A+Z` 里混了非法键）会当**空拍**处理并 `console.warn`，不会把后面的音整体往前挪。

小节宽度按拍数自动分配，临时变拍（如弱起小节）不会画歪。

## 目录

```
index.html        页面（CSS / JS 全内联）
songs/            曲目数据，一首一个 JSON
songs/index.json  曲目清单（数组顺序 = 下拉框顺序）
serve.mjs         零依赖静态服务器
build.mjs         生成 dist/index.html（单文件、曲目内联）
package.json      npm start / npm run build / npm run check
scripts/          曲目数据体检脚本
.gitattributes    统一 LF
.gitignore        忽略 dist/、node_modules/
```

## 实现说明

- 音色是 Web Audio 实时合成的（5 个振荡器叠加 + 低通 + 卷积混响），仓库里没有音频文件。
- 排版走「纸墨」路线：灰纸底、细线分隔、Georgia/宋体标题；全页只留一种蓝色，下一个键直接用这块实色填满（不叠蒙层、不发光）。
- 手机横屏（`orientation: landscape`、高度 ≤ 560px 且宽度 ≤ 960px）把页头/控制条/练习条压成三行，键盘吃掉剩余高度，整屏不滚动；宽桌面的矮窗口不会误触发这套布局。
- 尊重 `prefers-reduced-motion`：关掉按键抖动的动画。
- 正文与说明文字对比度 ≥ 4.5:1，控件边框 ≥ 3:1，键盘可 Tab 聚焦、模式按钮带 `aria-pressed`。
- `npm run build` 产出的 `dist/index.html` 不入库（见 `.gitignore`）。
