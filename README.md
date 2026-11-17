# dsh-theme-cinnabar 朱砂

DeepSeek Harness Web 客户端的主题插件。配色方向是**暖墨加一点朱砂**：纸白的暖中性阶，
一个朱砂红承担全部强调色。两个目标，按优先级排序：

1. **会话可读性**——正文、气泡、代码块、输入框、侧栏的每一对前景/背景都有对比度下限，
   生成器不达标就不产出。
2. **可选的背景图**——一张图铺在会话后面，上面盖一层固定强度的表面色遮罩，再叠一点模糊。
   默认关闭，纯色表面就是完整主题。

它**不注册第三方主题**，而是把全部 token 作为**一层覆盖**叠在 DSH 自带的浅色/深色上，再加
**一个设置行**和**一套双模式的液态玻璃**（暗色墨玻璃 / 浅色宣纸玻璃）；不碰布局、不改动
DSH 自带的外观设置。装上默认开启，深浅沿用「外观」里的浅色/深色/跟随系统——**选过一次
深色，重启还是深色**。浅色在开启背景图时退回实心纸面，理由见玻璃一节。

```
纸白  #faf7f2        暖中性阶：OKLCH 80°，彩度 0.006–0.016
墨黑  #23201c        深色表面，同样暖偏
朱砂  #c41002        浅色强调（对比度 5.74:1）
      #db6150        深色强调（对比度 5.04:1）
```

![palette](preview.png)

<sub><i>深浅两套调的对比，由 <code>tools/render-preview.mjs</code> 从真实 token 值绘制。
想看交互效果请打开 <code>preview.html</code>：正文、气泡、代码块、菜单、状态色，含遮罩强度滑杆。</i></sub>

## 它做了什么

**149 个 token + 8 个非颜色声明**，全部按 `{light, dark}` 成对写出：

| 来源 | 数量 | 说明 |
|---|---|---|
| 色阶成员 | 63 | 暖墨中性阶（80°）、朱砂强调（30°）、原样保留的绿/琥珀/红/蓝/紫族 |
| 语义 token | 75 | 69 个由色阶别名派生，3 个字面量 hex 改为指向色阶，2 个纯前景色单独抬到下限，1 个阅读表面 |
| 代码高亮 | 11 | 9 个 `--shiki-token-*` 对代码块重新定标 + 前景/背景 |
| 非颜色 | 8 | 正文/代码字体栈（`--dsh-font-*`，设置里的字体行读的就是它们）、圆角 |

### 两条来自实测的约束

**一、对比度由相对亮度决定，不是 OKLCH 明度。** 同一明度下挪色相，对比度能差 0.08 个
亮度值——link 在浅色下因此从 4.23 掉到 3.9。所以生成器的做法是：**保留色相、求解对比度**。
每个受力面的种子写一个目标比值，生成器在 OKLCH 里二分明度（不够就退彩度）直到命中。

**二、朱砂需要三样东西同时约束，否则会变成"深红"或"珊瑚粉"。**

| 约束 | 作用 | 不做的后果 |
|---|---|---|
| `target: 5.6` | 比 4.5 下限略高 | 刚好卡在 4.5 时，求解器把彩度压到 0.16，红变暗红 |
| `maxLightness` | 浅色上限 0.52 / 深色 0.64 | 深色下会算到明度 0.74，橙红色域只剩 0.15 彩度，成荧光粉 |
| `minChroma: 0.2` | 绝对彩度下限 | 基线的深色蓝彩度只有 0.10，乘系数后仍是弱红 |

深色朱砂的物理上限：在深色表面上要维持 5:1 对比度，明度得 0.74，而那个亮度的橙红色域
只够 0.16 彩度。所以深色取的是 `#db6150`（5.04:1、彩度 0.157），这是两者能同时满足的边界。

### 可读性门禁：38 组配对

所有配对都在**合成后**的颜色上算：半透明 token 先叠到表面上，再算 WCAG 对比度。
基线本身有 3 组低于阈值（caption 1.98、warning 2.79、success 2.28），本主题**全部修到下限之上**：

| 模式 | 场景 | 浅色 | 深色 | 结果 |
|---|---|---|---|---|
| 正文 | `label-primary` on `bg-base` | 17.67:1 | 17.30:1 | PASS（下限 7.0） |
| 代码块 | `label-primary` on `markdown-code-block` | 18.01:1 | 16.44:1 | PASS（下限 7.0） |
| 气泡 | `label-primary` on `specific-bubble` | 16.22:1 | 12.93:1 | PASS（下限 7.0） |
| 输入框 | `label-primary` on `input-major` | 17.71:1 | 12.93:1 | PASS（下限 7.0） |
| 引用块 | `label-primary` on `markdown-citation` | 16.10:1 | 11.52:1 | PASS（下限 7.0） |
| 次要文字 | `label-secondary` | 5.44:1 | 12.36:1 | PASS（下限 4.5） |
| 辅助文字 | `label-tertiary` | 5.42:1 | 8.48:1 | PASS（下限 4.5） |
| 朱砂链接 | `link` on `bg-base` | 5.74:1 | 5.04:1 | PASS（下限 4.5） |
| 说明文字 | `label-caption` | 3.20:1 | 4.90:1 | PASS（下限 3.0，基线 1.98） |
| 警告文字 | `state-warn-label` | 3.05:1 | 6.71:1 | PASS（下限 3.0，基线 2.79） |

**38 组全部 PASS，没有 INHERITED，没有 BROKEN。** 基线那 3 组低于阈值的
（caption 1.98、warning 2.79、success 2.28）全部被抬到下限之上；success 是绿族，
属于"不动颜色含义"的范围，它靠的是中性的不动 + 表面色略深一点的重新计算，不是改绿。

`node tools/palette.mjs` 一次跑完所有配对，任何一组跌破下限就 `exit 1`；最弱的三组会打印出来。

## 背景图

默认不启用。背景层做两件事，**顺序就是可读性的保证**：

1. 一张图固定在视口上（不随会话滚动）；
2. 盖一层**同色表面色**，不透明度浅色 82% / 深色 88%，再叠 3px 模糊。

遮罩是**不透明基底的一部分**：图再花，文字永远读在遮罩上，而所有对比度配对就是按这个颜色算的。
模糊只是装饰，掉帧或不被支持都不影响可读性。

背景层依赖 DSH 自己的 DOM 属性，不依赖哈希类名，并做了三件事：

- 挂载前探测 `[data-conversation-content]` / `[data-chat-turn]`，找不到就**自我放弃并 warn**；
- 只清空四个真正画实色背景的容器的背景；
- `ctx.effect` 里注册清理，卸载时把 `<style>`、`data-dsh-cinnabar-bg` 属性和三个 CSS 变量全部回收。

**启用方式**：运行时设置 `globalThis.__CINNABAR_BACKGROUND__ = { url: "file:///..." }`（或 `data:` URL、
`http:` 地址）。旧名 `__INKSTONE_BACKGROUND__` 仍然认，迁移期不必改脚本。没有设置它就是纯色主题。
**这是全部——不读设置文件、不做界面**，因为你只说"图后面再找"。

## 从 0.4 升级

0.5 起包名、bundle id 和内部标识从 `inkstone` 改成 `cinnabar`，配色与行为不变。旧的
`localStorage` 开关（`dsh-theme-inkstone:enabled`）和 pre-0.4 的 `choice` 键会在首次启动时
迁移一次；背景图的旧全局名仍然可用。已经装进 profile 的需要把依赖名和软链换成新包名，
步骤见下一节。0.6 起浅色也有玻璃；开启背景图时浅色仍退回实心纸面。

## 安装

> **先确认目标 profile。** 桌面客户端（Electron）读的是 `desktop`，CLI 默认的 `web` 是另一套。
> 装错 profile 的症状很难查：服务端完全正常（层栈、软链、patch 全对），但界面毫无变化。
>
> 下文用 `<检出目录>` 指代本地检出。本机当前是 `E:\github_own\dsh-theme-inkstone`
> （目录名可以随时改成 `dsh-theme-cinnabar`，包 id 只认 `package.json`）。

**桌面端（`desktop` profile）**——该 profile 被 Electron 独占，CLI 会直接拒绝：

```sh
dsh plugin --profile desktop add <检出目录>
# error: profile "desktop" is managed exclusively by the Electron application
```

实测可行的做法是**不经过 pnpm 重装**，只改清单 + 建软链：

1. 编辑 `$DSH_HOME/profiles/desktop/package.json`：
   - `dependencies` 里加 `"dsh-theme-cinnabar": "link:<检出目录>"`
   - `dsh.profile.bundles` 末尾加 `"dsh-theme-cinnabar"`
2. 在该 profile 的 `node_modules/` 下建一条软链指向本地检出：
   `ln -s <检出目录> node_modules/dsh-theme-cinnabar`
   （Windows 下用 `mklink /D`，或 Git Bash 的 `ln -s`）
3. 重启桌面客户端。

**不要运行 `pnpm install`。** 改了清单后 pnpm 会判定 `node_modules` 需要重建
（`hoisted` 模式下会清空整个目录），这个 profile 装着几十个插件，重装失败会导致客户端
起不来——而本地链接根本不需要重装，软链一步就够了。

**命令行 profile（`web`）**：

```sh
dsh plugin --profile web add <检出目录>
```

`dsh plugin` 是 pnpm 的转发器；装完它把包名加进该 profile 的 `dsh.profile.bundles` 层栈。
**重启对应进程后生效**——运行中的进程不会重读层栈。

卸载：`dsh plugin --profile <name> remove dsh-theme-cinnabar`，`ctx.effect` 精确回收两层。
desktop profile 同样要走界面或 pnpm。

## 开发时容易踩的三件事

**一、`factory` 必须接收 `require`。** 模块表把 `require` 作为 factory 的参数传进来；
写成 `factory: () => {}` 再在内部调用 `require("react")` 会抛 `ReferenceError`，
而这次异常发生在 `apply` 期间，**直接把整个页面拖垮了**。

```js
// 对
factory: (require) => { const React = require("react"); ... }
// 错——require 不存在
factory: () => { const React = require("react"); ... }
```

**二、`apply` 的每一步都要异常隔离。** 主题是装饰，设置行挂不上也不该让应用起不来。
`apply` 里用 `step(label, fn)` 包住每一段，失败只 `console.warn`。

**三、`ctx.effect` 的返回值才是清理函数。** 它**现在**就执行回调，把回调的返回当作 disposer；
写成 `ctx.effect(() => { style.remove() })` 会在样式注入的同一帧又把它删掉。
本仓库的样式层曾经就是这个写法，玻璃和动效其实一直没上过屏，很容易误判成 HMR 没生效。

前两条由 `tools/check.mjs` 守着（"factory accepts require" / "apply steps are isolated"），
第三条由 `tools/smoke.mjs` 里「unmount removes the stylesheet」守着。

## 动效与质感

全部来自一个 `<style>`（`tools/motion.mjs`），只用标准 CSS 选择器，不碰 DSH 的哈希类名。

| 效果 | 实现 | 退路 |
|---|---|---|
| 主题切换过渡 | `body` 与对话容器的 `background-color`/`color` 180ms 缓动 | 无（纯过渡） |
| 切换交叉淡入 | 优先 View Transitions：整页快照交给合成器做 240ms 交叉；过渡层垫新表面色，回调保持同步；不支持时退回 220ms 颜色过渡 | `prefers-reduced-motion` 时直接切换 |
| 选区色 | `::selection` 用朱砂暖调，替换浏览器默认蓝 | 无 |
| 焦点环 | `:focus-visible` 朱砂描边 + 28% 透明度光晕 | 无 |
| 消息上浮 | `[data-chat-turn]` 6px 上移淡入，220ms | 靠 DSH 属性，属性没了只是不播 |
| 面板弹出 | 菜单/对话框 `scale(.985)` 展开，140ms | 同上 |
| 光标色 | `caret-color` 跟随强调色 | 无 |

**四条硬约束：**

1. **动效不影响可读性。** 选区是"文字背景"，所以它也要过门禁：浅色 `#ffbfb4` 上是
   12.0:1，深色 `#753930` 上是 8.4:1，都高于正文的 4.5 下限。这两个值由
   `deriveMotion()` 算出来并写进 `report.json`，不是手填的。
2. **尊重 reduced-motion。** 所有动画都在 `@media (prefers-reduced-motion: no-preference)`
   里；系统设了减少动效时，一切瞬间完成、无位移。
3. **不要逐元素过渡整棵树。** 第一版给所有元素挂 220ms 过渡，长会话里几百个元素同时
   动 `box-shadow`/`transform`，掉帧明显。现在优先 View Transitions：整页快照在合成器
   上交叉，主线程只做一次 token 写入。退回路径才用颜色过渡，并且必须**先挂属性、强制
   一次样式刷新**——宿主在 `setTheme` 里同步写 token，事后加类会和新值落进同一次样式
   计算，浏览器直接跳变，这就是"生硬"的根因。
4. **过渡层必须垫一块不透明的主题色。** UA 的交叉在中点时两帧各半透明，背后露出的不是
   页面背景而是画布；`color-scheme` 又在切换瞬间就翻了，所以中点会闪一下另一套底色。
   写入偏好后把新的 body 底色挂到 `--cinnabar-vt-bg`、垫在 `::view-transition` 上；
   快照回调必须保持同步——一旦有异步等待，浏览器会先把已更新的页面画出来再接管快照，
   那就是整整一帧的「新主题闪」。

背景图也并进了同一个 `<style>`，卸载时整块回收。

## 液态玻璃（双色）

两套配方共用一份样式表（`tools/glass.mjs` → `lib/client.js` 里的 `GLASS_CSS`），都不新增
token、不改任何一组配对，结构也一样：填充 + 模糊 + 透镜边 + 朱砂辉光。

| 模式 | 填充 | 模糊 | 上下光边 | 辉光 |
|---|---|---|---|---|
| 暗色 · 墨玻璃 | 输入框色 88% | 26px + saturate 160% + brightness 0.94 | 白 26% / 黑 36% | 朱砂 22% |
| 浅色 · 宣纸玻璃 | 45% 纸白 + 55% 白，取 92% | 22px + saturate 130% | 朱砂 20% / 棕黑 10% | 朱砂 10% |

输入框是唯一的主角：它贴在会话底部，消息从它下面滚过。1px 的透镜边（mask 出 content-box）
是"玻璃"和"淡了"的分界：顶部亮边 + 底部暗边，暗示上方有光源。

**两种模式为什么参数不同。** 暗色的上界是纯白——亮照片、满屏白字的代码块被模糊摊平后
就是最坏的底，88% 让正文 7.8:1、次级文字 5.6:1。浅色的上界是纯黑——会话里可能滚过深色
图片；如果照搬 88%，次级文字只有 4.15:1。所以浅色取 92% 的「纸白 + 白」混合：亮度抬一档，
文字过 4.7:1，面板也比纸面略亮，边界清楚。材质感来自模糊、提亮和朱砂描边，不靠加大
透明度。

**浅色为什么在背景图开启时退回实心。** 背景图让输入框下面的底不可控，而浅色的可读性
前提本来就是"不透明纸面"。这时浅色那段选择器（带 `:not([data-dsh-cinnabar-bg])`）整段
失配，座位渐隐保留，输入框回到 `--dsw-specific-input-major`；暗色不受影响。

**为什么撤掉那层渐隐。** 输入框的座位上，DSH 垫了一段 36px 的渐隐（透明 →
`--dsw-alias-bg-base` 不透明），那是给**实心**输入框用的：没有它，滚动文字会直接撞进
输入框。玻璃自己就是可读性措施（填充 + 模糊，见下），留着那段渐隐等于把材质挡在
后面——所以玻璃生效时把它撤掉，文字这才真的从玻璃背面过。

**为什么没碰菜单。** 查基线时发现 `--dsw-menu-backdrop-filter: blur(40px) saturate(150%)`
和 `--dsw-menu-surface-fill` 本来就是 DSH 的菜单材质，菜单早就是雾面的；主题再覆盖一遍
只会把它做糊。`check.mjs` 里有一条专门盯着这件事：玻璃样式里出现菜单变量就报错。

**可读性怎么保证。** 两套配方各自叠在最坏底色上算。暗色取**纯白**：
`--dsw-specific-input-major`（#393733）取 88% 叠在 #fff 上得到 #514f4b，正文 7.78:1、
次级 5.56:1。浅色取**纯黑**：纸白混合色取 92%，正文 15.3:1、次级 4.7:1。
`check.mjs` 每次用 `tokens.json` 的当前值重算这四组，不信任这里写死的数字。

**退路两条**：`@supports not (backdrop-filter…)` 时回到不透明表面；
`prefers-reduced-transparency: reduce` 时整块材质撤掉。两条都只改玻璃自己的声明。

**已知取舍**：设置弹窗（`role=dialog`）和侧栏这一版没做。侧栏根节点没有稳定钩子
（类名哈希，`data-slot=sidebar` 是 `display:contents` 的空壳），而 `role=dialog` 在
DSH 里既可能是面板也可能是全屏遮罩——猜错的代价是整页糊一层。等有确定性钩子再加。
浅色玻璃在开启背景图时不出场，见上一段。

## 怎么切换

设置 → 通用 里有一行「朱砂 · 主题」，标题前有一枚 12px 的朱砂方印（浅深跟随强调色）：

- **开关**：打开即用朱砂，关闭立刻回到 DSH 自带外观（token 层撤掉，动效/玻璃那张样式表整块停用）
- **浅色 / 深色**：开关打开时出现。点它写的就是 DSH 自己的主题偏好，和上方「外观」行是**同一个值**——
  两边谁点都同步，副标题随之显示「已启用「朱砂 · 深色」」
- 偏好是「跟随系统」时两个 chip 都不高亮，副标题写「已启用「朱砂」· 深浅跟随系统」

**装上默认就是开启。** 深浅不由朱砂自己记：DSH 的设置文档只持久化 `light` / `dark` / `system`，
所以朱砂把配色做成 token 层跟着这个偏好走，**选一次深色，之后每次启动都是深色**。

为什么不能像普通主题那样注册 `cinnabar-dark` 再 `setTheme()`：第三方 id 不写进设置文档，
`ThemeRuntime.adopt()` 每次拿到持久化快照都会把 preference 改回 `light`/`dark`/`system`，
启动时切过去的 id 几百毫秒后就被宿主覆盖回来——这就是「每次进来都要重新选」的根因。

## 装好之后怎么确认

控制台执行：

```js
getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base')
```

- `#faf7f2`（浅色）/ `#23201c`（深色）→ 生效
- `#fff` / `#151517` → 未生效，先查是不是装错了 profile

再查链接色 `--dsw-alias-link`：生效时是 `#c41002`（浅）/ `#db6150`（深），
未生效时是基线的 `#4176e6` / `#7aaaff`。

两套玻璃都查输入框：

```js
getComputedStyle(document.querySelector('[data-composer-card]')).backdropFilter
```

- 深色：`blur(26px) saturate(1.6) brightness(0.94)` → 墨玻璃生效
- 浅色：`blur(22px) saturate(1.3)` → 宣纸玻璃生效
- 浅色 + 背景图，或未启用朱砂：`none`


## 开发

```sh
node tools/palette.mjs        # 读基线 → 求解配色 → 跑门禁 → 写 tokens.json / report.json
node tools/build-client.mjs   # tokens.json → lib/client.js
node tools/check.mjs          # 30 项产物检查
node tools/smoke.mjs          # 29 项运行时冒烟（vm 里加载真实 bundle）
node tools/preview.mjs        # → preview.html
node tools/render-preview.mjs # → preview.png（Node 自绘 PNG，不经过浏览器）
npm run verify                # 以上全部
```

**没有打包步骤。** 纯配色主题用不到 React / JSX / 样式表导入，所以 `lib/client.js`
由 `tools/build-client.mjs` 拼装生成，签入仓库。

**改完 `lib/client.js` 要不要重启，取决于构建。** DSH 有 `client-hmr`：它每 500ms
轮询插件 bundle 的 mtime，一变就通过 `/plugins/events` 推 `rebuilt` 帧，浏览器侧调
`entries.reload(id, rev)` 把这个模块重跑一遍。但**在这台桌面构建上实测没有发生**
（控制台诊断显示样式仍没注入），所以现在得**重启客户端**才拿得到新 bundle。
宿主半侧（`lib/index.js`）的改动任何情况下都要重启；装/卸插件同理（层栈在启动时读一次）。

判断到底是"没加载"还是"太淡"，一行就够：

```js
[...document.querySelectorAll('style')].some(s => s.textContent?.includes('liquid glass'))
```

`false` = bundle 还是旧的；`true` 但看不出效果 = 材质需要调强，改 `tools/glass.mjs`
里的数字再重新构建。

### 重新调色

改 `tools/palette.mjs` 顶部的常量，然后重跑 `palette` + `build:client`：

| 常量 | 作用 |
|---|---|
| `FAMILIES` | 各色族的目标 OKLCH 色相、彩度系数、`minChroma`、`lightnessCap` |
| `PRESERVED_FAMILIES` | 保持基线原样的色族（绿/琥珀/红：改状态色是改含义，不是主题化） |
| `TARGETS` | 每个种子要解的对比度比值，可带 `maxLightness`（按模式的明度上限） |
| `SURFACE` | 阅读表面（浅 `#faf7f2` / 深 `#23201c`），也是遮罩色 |
| `OVERLAY` | 背景遮罩强度（浅 0.82 / 深 0.88） |
| `PAIRS` | 门禁配对与下限 |
| `TYPOGRAPHY` / `RADIUS` | 字体栈与圆角 |

**换一个强调色时的顺序**（朱砂就是这么调出来的，换成别的色相同理）：

1. 在 `FAMILIES` 里改色相，先给一个偏低的 `minChroma`（0.1 左右）看基线会产出什么；
2. 跑一次 `palette`，记下强调色在浅/深两侧的实测对比度；
3. 若浅色偏暗（彩度被压掉）→ 提高 `target`；若深色偏荧光 → 降 `maxLightness`；
4. 两者都调到满意，再把 `minChroma` 抬到目标色相在 sRGB 里放得下的值。

彩度上限受色域限制：明度越高，同色相能放下的彩度越小。深色强调色永远比浅色淡一档，
这是几何决定的，不是没调好。

### `check.mjs` 查什么

30 项，只证明磁盘上的产物互相自洽、且与已安装的 DSH 一致，只有玻璃那组会重算颜色：

**产物自洽**

1. `tokens.json` 名字合法、无重复键、每项都有 light/dark；
2. `tokens.json` 与当前生成器输出逐 token 一致；
3. `lib/client.js` 的两份调色板都与 `tokens.json` 完全一致；
4. `package.json` / `cordis.patch.yml` / bundle id 三者同名；
5. `exports` 指向的文件存在。

**与已安装 DSH 一致**

6. 每个 token 在已安装的 DSH 里仍然存在（升级后第一时间发现）；
7. 背景层依赖的四个 DOM 属性仍在对话包里；
8. 被清空背景的容器默认仍是 `var(--dsw-alias-bg-base)`；
9. 玻璃依赖的 `data-composer-card`、`--dsw-specific-menu`、`--dsw-menu-backdrop-filter`
   仍被对话包消费。

**运行时契约**（这几条都是踩过坑补上的）

10. `factory` 接收 `require`（否则整页崩）；
11. `apply` 的每一步都隔离（失败不波及宿主）；
12. 配色是 `overrideTokens` 的一层、不是第三方主题 id（第三方 id 是会话级的，重启会被 adopt 覆盖）；
13. 客户端 inject 了 `theme` 与 `slots`，装 token 层 + 设置行，记开关，写内置深浅偏好，
    迁移旧包开关与 pre-0.4 的 `choice` 键，chip 跟随实时偏好，样式表跟随开关；
14. 切换主题时优先走 View Transition（不支持才挂过渡并强制刷新）；`setTheme` 的包装在卸载时还原；
15. 宿主半侧仍是无副作用的空 `apply()`。

**可读性与动效**

15. 38 组会话配对全 PASS，且报告来自当前基线；
16. 选区色对文字的对比度过 4.5 下限；
17. 动效全部置于 `prefers-reduced-motion` 守卫内；
18. 样式层可回收。

**液态玻璃**

19. `lib/client.js` 里的玻璃样式与 `tools/glass.mjs` 生成的一致（防手改漂移）；
20. 玻璃确实拼进了那个 `<style>`；
21. 每条玻璃规则都限定在明确配色下：暗色带 `data-ds-dark-theme`，浅色带 `:not([data-ds-dark-theme])` 且排除背景图；
22. 有 `@supports` 与 `prefers-reduced-transparency` 两条退路；
23. 两套填充各自叠在最坏底色上（暗色纯白 / 浅色纯黑）后，正文仍 ≥7:1、次级文字仍 ≥4.5:1；
24. 玻璃依赖的输入框钩子（`data-composer-card` / `data-composer-seat` /
    `data-conversation-region`）仍被对话包消费；
25. 玻璃样式里没有出现菜单材质变量（不重写 DSH 自己的雾面菜单）。

（其余为上面的产物/契约检查，合计 30 项。）

`node tools/smoke.mjs` 另跑 29 项运行时断言，`check.mjs` 看不到的那类问题归它：它用 Node 的
`vm` 加载**真实的** `lib/client.js`，配一份会像 `ThemeRuntime` 一样 `adopt()` 持久化偏好的桩，
验证 token 层装上、adopt 之后不被撤掉、开关真的能撤层和停样式表、点「深色」写的是内置偏好、
旧 key 迁移一次，以及卸载后 `<style>` 和层都收回。

## 与基线的差异

| 项 | 结论 |
|---|---|
| 主题选择 | **不注册第三方 id**，改成一层 `overrideTokens`。第三方 id 是会话级的，`ThemeRuntime.adopt()` 会用持久化偏好覆盖它；朱砂的深浅沿用 DSH 的 `light`/`dark`/`system`，所以选择能被设置文档保存，重启即恢复 |
| 液态玻璃 | 两种配色各一层材质（暗色墨玻璃 / 浅色宣纸玻璃），**不新增 token**、不改配对；玻璃生效时撤掉输入框座位那层不透明渐隐；浅色开背景图时退回实心 |
| 状态色阶 | 完全保留基线。状态胶囊底色（`*-tertiary`）跟着色阶走，只换中性阶与强调色 |
| 代码块 | 9 个 Shiki token 对**改色后的代码块**重解对比度，不是复制基线的明度 |
| 字体 | 只覆盖 `--dsh-font-*` 默认栈，不替换成具体字体，机器缺字体时回落到系统栈 |

## 已知限制

- **「跟随系统」不在朱砂这一行里。** 它和上方「外观」行是同一个偏好，去那里选更直接；
  朱砂这行只保留浅色/深色两个 chip，选中状态跟着偏好实时同步。
- **背景层是唯一的脆弱点。** 它依赖 DSH 的 DOM 属性；属性一改，图上不来（会 warn），但配色不受影响。
  `check.mjs` 第 7、9 项就是为了在升级后立刻告诉你。
- **背景图需要手动设置一个全局变量。** 没有设置界面——要的话得先确认 DSH 的设置项 API 再说。
- **浅色玻璃在开启背景图时不出场。** 背景图让输入框下面的底不可控，浅色退回实心纸面；
  暗色玻璃不受影响。
- **系统跟随的切换没有交叉淡入。** 交叉淡入挂在 `setTheme`（用户主动写偏好）上；系统
  配色翻转走的是 `publish()`，到我们手里时已经画完了。宿主若把 `setTheme` 设成不可写，
  包装会安静退回无过渡切换，不影响功能。
- **`--dsw-alias-label-primary` 只有一组值**，深色下要同时读在页面表面（17.8:1）和菜单分组标题、
  提示框这类近白/近黑浮层上。浮层上的配对已经在门禁里覆盖并通过；这不是拆分 token 的问题，
  而是这类浮层本来就该用 `--dsw-alias-tooltip-label` 之类的专用前景色。
- **依赖源码扫描。** 基线从已安装的 `dsh-client-ui-theme` 包里读；bundle 布局一变，
  生成器会**明确报错**而不是产出错色板。
