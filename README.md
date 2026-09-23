# DevToolbox · 开发者工具箱

纯前端工具站，所有解析都在浏览器本地完成，文件不会上传到任何服务器。

当前包含两个工具：

- **字体图标查看器**：导入 woff / woff2 / ttf / otf，解析出全部可用图标码位，并导出可单独分享的 HTML 总览页
- **JSON 格式化**：粘贴或导入 JSON，美化 / 压缩 / 校验（含行列定位）、树形查看、导出 json 文件

技术栈：React 19 + TypeScript + Vite 8 + SCSS（手写样式，无 CSS 框架；px → rem 由 `postcss-pxtorem` 在构建期换算）+ react-router 7 + i18next + zustand(persist)

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5273
npm run build      # tsc + vite build，产物在 dist/
npm run preview    # 本地预览生产包 http://localhost:4173
```

## 目录结构

```
src/
  main.tsx            入口：设置根字号 → 初始化 i18n → 同步状态到 DOM → 挂载
  App.tsx             挂载 SVG 精灵图 + <RouterProvider router={router} />（来自 react-router/dom）
  assets/             静态资源
    styles/           全局样式（SCSS）
      index.scss      入口：@use 下面这几个有 CSS 输出的模块
      _tokens.scss    设计令牌 --ui-*（配色、字体、阴影，含明暗两套）
      _reset.scss     基础重置
      _base.scss      html/body/字体/滚动条 + 根字号兜底 + 公共关键帧
      _ui-classes.scss 跨组件复用的基础类（.btn/.input/.chip/.surface…）
      _ui.scss        上面那些基础类的 mixin 版本（供组件 @include）
      _mixins.scss    断点查询、省略号、滚动条、动效
      _variables.scss 断点
      _helper.scss    给 additionalData 注入用的 barrel（只转发无输出的模块）
    svg/              界面图标源文件：一个图标一个 .svg
      index.ts        图标注册表（?raw 读入 + IconName 类型）
      home.svg  font.svg  chevron-right.svg  …
  router/
    routes.tsx        路由唯一配置处：路径常量 ROUTES、导航配置 APP_ROUTES、路由表 childRoutes
    index.tsx         createHashRouter 装配 + 编程式跳转 API
  locales/            国际化
    i18n.ts           i18next 初始化
    locale.ts         语言类型 / 探测
    modules/          zh-CN.ts、en-US.ts 词条
  store/              状态管理
    index.ts          统一出口（barrel）
    appStore.ts       持久化全局状态（语言、主题、侧边栏、两个工具的参数与输入）
    fontStore.ts      字体库（内存态，含 document.fonts 注册）
    uiStore.ts        Toast
    sync.ts           store → DOM/i18n 的单向同步
  features/           业务功能（逻辑 + 组件，组件同样一目录一文件）
    font/            parseFont.ts、exportHtml.ts、galleryTexts.ts
      FontList/      FontList.tsx + FontList.scss
      FontUploader/  FontUploader.tsx + FontUploader.scss
      IconGrid/      IconGrid.tsx + IconGrid.scss
    json/
      JsonTree/      JsonTree.tsx + JsonTree.scss
      jsonUtils.ts
  components/         全局通用组件，每个组件一个目录（.tsx + 同名 .scss）
    AppLayout/  Icon/  IconSprite/  PageHeader/  Sidebar/  Toaster/
  pages/              路由页面，同样一个页面一个目录
    HomePage/  IconFontPage/  JsonFormatterPage/  NotFoundPage/
  utils/              无依赖纯工具（file.ts、theme.ts、rem.ts 尺寸适配运行时）
  types/              全局类型声明
```

**组件目录约定**：一个组件一个文件夹，`Xxx.tsx` 与同名 `Xxx.scss` 放在一起，样式由组件自己 `import './Xxx.scss'`。这样在 DevTools 里看到 `.font-page__search-input` 这类类名就能直接定位到文件，不用再顺着工具类反查。

**资源归 `assets/`**：全局 SCSS 与界面图标源文件都放这里（`assets/styles`、`assets/svg`），组件自己的样式仍跟着组件文件走。

依赖方向是单向的：`utils` → `store` → `features` → `pages`；`components` 只依赖 `store` 与 `utils`。

---

## 一、路由组织

路由表集中在 `src/router/routes.tsx`，一条路由一行，路径、页面组件、导航栏元信息放在一起：

```ts
export const ROUTES = {
  home: '/',
  iconFont: '/icon-font',
  jsonFormatter: '/json-formatter',
} as const

export const APP_ROUTES: AppRoute[] = [
  { key: 'home', path: ROUTES.home, labelKey: 'nav.home', icon: 'home', element: <HomePage /> },
  { key: 'iconFont', path: ROUTES.iconFont, labelKey: 'nav.iconFont', icon: 'font', element: <IconFontPage /> },
  { key: 'jsonFormatter', path: ROUTES.jsonFormatter, labelKey: 'nav.json', icon: 'braces', element: <JsonFormatterPage /> },
]
```

侧边栏、移动端导航、`document.title` 都读 `APP_ROUTES`，所以新增一个工具页只要改这一个数组 + 加词条。

两条约定（同时写在 `routes.tsx` 头部注释里）：

1. `routes.tsx` **不 import** `AppLayout`，布局装配放在 `router/index.tsx`，否则会形成 `routes ↔ AppLayout` 循环依赖；
2. 被 `routes.tsx` 引用的模块（各页面、`AppLayout`、`Sidebar`）**不要在模块顶层读** `ROUTES` / `APP_ROUTES`——`routes.tsx` 求值时它们还在 TDZ。渲染期读、或调用 `pathOf()` 都没问题。

路由用 hash 模式（`createHashRouter`），部署到任意静态目录都不需要配 nginx rewrite。要换成 history 模式，把 `index.tsx` 里的 `createHashRouter` 换成 `createBrowserRouter`，并给服务器加 `try_files $uri /index.html`。

**依赖包说明**：react-router v7 起不再需要 `react-router-dom`——它的全部内容就是 `export * from 'react-router'` 再加上把 `react-router/dom` 的 `RouterProvider` 转发出来。所以本项目直接依赖 `react-router`，只有 `RouterProvider` 从 `react-router/dom` 引入（DOM 版只是给基础版多传了一个 `flushSync: ReactDOM.flushSync`）：

```tsx
// src/App.tsx
import { RouterProvider } from 'react-router/dom'
// 其余所有 API：Link / NavLink / useNavigate / createHashRouter … 全部来自 react-router
```

---

## 二、路由跳转

### 方式 1：JSX 声明式（`<Link>` / `<NavLink>` / `<Navigate>`）

```tsx
import { Link, NavLink, Navigate } from 'react-router'
import { ROUTES } from '@/router/routes'

<Link to={ROUTES.iconFont}>字体图标</Link>

// 需要「当前项高亮」时用 NavLink，isActive 由路由状态给出
<NavLink to={ROUTES.iconFont} className={({ isActive }) => (isActive ? 'text-indigo-600' : '')}>
  字体图标
</NavLink>

// 渲染即跳转（升级路径、权限兜底）
<Navigate to={ROUTES.home} replace />
```

优点：真实 `<a>` 标签，可中键 / Ctrl+点击新窗口打开，对键盘与爬虫友好。**能用 `Link` 就优先用 `Link`**——本项目 `HomePage` 的工具卡片、`NotFoundPage` 的「返回首页」都是它。

### 方式 2：组件内命令式（`useNavigate`）

```tsx
import { useNavigate } from 'react-router'

const navigate = useNavigate()

navigate(ROUTES.jsonFormatter)                    // 跳转
navigate(ROUTES.home, { replace: true })          // 替换历史，不留返回栈
navigate(-1)                                      // 后退一步
navigate('..')                                    // 相对当前路由上退一级
navigate('?indent=4')                             // 只改查询串（原地更新，不刷新）
```

适合「表单提交成功后跳转」「先判断条件再决定去哪」等场景。

### 方式 3：任意 TS / TSX 模块里跳转（不依赖 DOM 与 React 上下文）

`createHashRouter` 返回的 `router` 是个普通对象，`router.navigate()` 在任何模块、任何时刻都能调，**不需要** React 组件、不需要 hook（`createHashRouter` 内部已经 `initialize()`，import 之后立刻调用也没问题）：

```ts
import { router } from '@/router'

router.navigate('/json-formatter')
router.navigate(-1)
router.navigate('/home', { replace: true, state: { from: 'callback' } })  // 返回 Promise<void>
```

项目里再包了一层，支持直接传路由 key，并统一做路径解析：

```ts
import { navigateTo, replaceTo, goBack } from '@/router'   // 跳转 API
import { pathOf, ROUTES } from '@/router/routes'           // 路径常量（放在 routes.tsx）

navigateTo('iconFont')                        // 传 RouteKey
navigateTo('/icon-font')                      // 传路径，效果相同
navigateTo('/icon-font?keyword=e600')         // 带查询串
replaceTo('home', { state: { toast: 'ok' } }) // 不留返回栈
goBack()                                      // 后退；无历史时兜底回首页
pathOf('jsonFormatter')                       // 只取路径字符串，不跳转
```

> 路径常量只在 `@/router/routes` 导出，不在 `@/router` 上再导出一次——`index.tsx` 会 import `AppLayout`，如果 `AppLayout` / `Sidebar` 反过来从 `@/router` 取东西就形成循环依赖。

**典型用途**：store action、请求回调、定时器、埋点、第三方 SDK 回调里跳转（这些位置拿不到 hook）。本项目 `goBack()`、`NotFoundPage` 的返回按钮都是这么用的。

`useNavigate()` 与 `router.navigate()` 的关系：前者是后者的 hook 包装。组件里用 `useNavigate()`（跟随路由上下文、相对路径语义正确），组件外一律用 `router.navigate()` / `navigateTo()`。

### 方式 4：不使用 react-router 的原生方式（应急）

```ts
window.location.hash = '#/json-formatter?indent=2'   // hash 模式：不刷新页面，浏览器历史会新增一条
window.location.href = '/json-formatter'             // 整页刷新，状态全丢
```

只在做协议兼容或极简脚本时用。缺点：绕过 react-router 的记录（该次导航被当作一次 pop），`goBack()` 的「是否有上一页」判断会退化成兜底分支，也拿不到 `state`。本项目内部不使用。

### 该用哪种

| 场景 | 用法 |
|---|---|
| 用户点击的链接、菜单 | `<Link>` / `<NavLink>` |
| 按钮点击、表单提交后 | `useNavigate()` |
| 组件外逻辑（store、回调、定时器） | `navigateTo()` / `replaceTo()` / `goBack()` |
| 渲染即跳转、权限兜底 | `<Navigate replace />` |
| 只改查询串 / 筛选条件 | `useSearchParams()` |

---

## 三、传参方式

### 方式 1：路径参数（动态段）

适合「资源 ID」这类必填、语义清晰的参数。本项目目前没有动态路由，需要时这样加：

```ts
// 1) routes.tsx：不进导航栏的路由直接加进 childRoutes
export const ROUTES = {
  // ...
  iconFontDetail: '/icon-font/:fontId',
} as const

export const childRoutes: RouteObject[] = [
  ...APP_ROUTES.map(/* ... */),
  { path: 'icon-font/:fontId', element: <IconFontDetailPage /> }, // 相对父级，不要带前导 /
  { path: '*', element: <NotFoundPage /> },
]
```

```tsx
// 2) 跳转
<Link to={`/icon-font/${font.id}`}>查看</Link>
navigateTo(`/icon-font/${encodeURIComponent(font.id)}`)
```

```tsx
// 3) 目标页接收
import { useParams } from 'react-router'

const { fontId } = useParams<{ fontId: string }>()
```

注意：`useParams` 拿到的永远是**字符串**，且已自动解码，不需要再 `decodeURIComponent`。

### 方式 2：查询参数（search / query string）

适合「可选、可分享、可回填到 UI 的筛选条件」：搜索词、分页、开关。

```tsx
// 1) 跳转：拼字符串
<Link to={`/icon-font?keyword=${encodeURIComponent(keyword)}&pua=1`}>筛选</Link>
navigateTo(`/icon-font?keyword=${encodeURIComponent(keyword)}&pua=1`)

// 2) 跳转：用 URLSearchParams 拼（推荐，自动转义）
const query = new URLSearchParams({ keyword, pua: '1' }).toString()
navigateTo(`/icon-font?${query}`)
```

```tsx
// 3) 目标页接收 / 修改（setSearchParams 就地更新地址栏，不刷新页面）
import { useSearchParams } from 'react-router'

const [searchParams, setSearchParams] = useSearchParams()
const keyword = searchParams.get('keyword') ?? ''
const onlyPua = searchParams.get('pua') === '1'

setSearchParams({ keyword: 'home' })
```

非组件内读取当前查询串：

```ts
import { router } from '@/router'

const params = new URLSearchParams(router.state.location.search)
const keyword = params.get('keyword')
```

### 方式 3：`location.state`（不出现在 URL）

适合「不便暴露在地址栏、只在这两个页面之间传」的数据。本项目 `navigateTo` 的第二个参数直接透传给 react-router，已支持。

```tsx
// 1) 跳转（两种写法等价）
<Link to={ROUTES.jsonFormatter} state={{ input: text, from: 'icon-font' }}>粘贴过去</Link>
navigateTo('jsonFormatter', { state: { input: text, from: 'icon-font' } })
```

```tsx
// 2) 目标页接收
import { useLocation } from 'react-router'

const location = useLocation()
const { input, from } = (location.state ?? {}) as { input?: string; from?: string }
```

特点：不写进 URL，但会存进浏览器的 history state（刷新后还在，直接改 hash 或新标签打开就没了），所以只适合放小对象。类型是 `any`，需要自己断言，建议约定一个 `state` 类型并写好兜底（`?? {}`）。

### 方式 4：全局状态（本项目跨页传参的实际做法）

两个工具页之间真正的数据传递都走 store，因为要求「刷新后仍然在」，而 URL 装不下也不该装：

```ts
// 传：写进持久化 store，再跳转
import { navigateTo } from '@/router'
import { useAppStore } from '@/store'

useAppStore.getState().updateJson({ input: text })
navigateTo('jsonFormatter')
```

```tsx
// 收：目标页直接订阅
const input = useAppStore((state) => state.json.input)
```

`store/appStore.ts` 走 `persist` 落到 localStorage，刷新后仍在；`store/fontStore.ts` 是内存态——字体二进制体积大、还绑定了 `document.fonts` 注册，不适合序列化，这正是「大对象 / 不可序列化对象不要走 URL 和 state，走 store」的例子。

### 方式 5：storage / 模块单例（纯逻辑之间交接）

完全不涉及路由时，用 storage 做一次性交接：

```ts
// 传
sessionStorage.setItem('dev-toolbox:pending', JSON.stringify(payload))
navigateTo('jsonFormatter')

// 收（用完即删，避免下次误读）
const raw = sessionStorage.getItem('dev-toolbox:pending')
const payload = raw ? (JSON.parse(raw) as Payload) : null
sessionStorage.removeItem('dev-toolbox:pending')
```

- `sessionStorage`：只在当前标签页有效，关掉即清，适合一次性交接；
- `localStorage`：跨标签页、跨会话保留，适合用户偏好（本项目存语言、主题、工具参数）；
- 模块级变量（内存单例）：只在当前页面生命周期内有效，刷新即丢。

### 各种方式对比

| 方式 | 出现在 URL | 刷新后保留 | 适合的数据 | 接收 API |
|---|---|---|---|---|
| 路径参数 | 是 | 是 | 资源 ID 等必填标识 | `useParams()` |
| 查询参数 | 是 | 是 | 可选筛选、分页、搜索词 | `useSearchParams()` |
| `location.state` | 否 | 是（历史记录还在时） | 小对象、一次性来源标记 | `useLocation().state` |
| 全局 store | 否 | 取决于是否 persist | 任意（本项目大文本走这里） | store selector |
| storage | 否 | 看用哪种 storage | 一次性交接数据 | `sessionStorage` / `localStorage` |
| 原生 hash 拼串 | 是 | 是 | 应急、极短的键值 | 手工解析 `location.hash` |

### 目标页接收参数汇总

```tsx
import { useParams, useSearchParams, useLocation } from 'react-router'

const { fontId } = useParams<{ fontId: string }>()   // 路径参数
const [searchParams] = useSearchParams()             // 查询参数
const keyword = searchParams.get('keyword')
const location = useLocation()                       // state
const state = (location.state ?? {}) as MyState
```

**组件外接收**（同样的数据，不走 hook）：

```ts
import { router } from '@/router'

const { pathname, search, state } = router.state.location
const params = router.state.matches.at(-1)?.params   // 当前匹配到的动态段
```

**在 loader 里接收**（本项目暂未使用，但路由是 `createHashRouter`，能力已具备）：

```tsx
{ path: 'icon-font/:fontId', loader: ({ params }) => loadFont(params.fontId), element: <Page /> }

// 组件内
const data = useLoaderData()
```

数据路由还能在路由对象上直接写 `loader`（取数）、`action`（表单提交）、`errorElement`（错误兜底）、`lazy`（按需加载页面），比在组件里 `useEffect` 取数更干净。

---

## 四、样式体系与尺寸适配（SCSS）

### 尺寸适配：设计稿 1920px

样式里**一律按设计稿写 px**，缩放由三段配合完成：

| 阶段 | 做什么 | 位置 |
|---|---|---|
| 构建期 | 把样式里的 `Npx` 编译成 rem（1920 稿下 1rem = 16px） | `vite.config.ts` 里 `pxtorem` 的 `rootValue` |
| 运行期 | 监听窗口变化，按当前视口宽度算出根元素 `font-size` 写进 `<html>` | `src/utils/rem.ts` 的 `setupRootFontSize()` |
| 兜底 | JS 未执行 / 被禁用时，CSS 里的 `clamp` 先顶住（公式与上面一致） | `_base.scss` |

运行期的核心逻辑（用 `clientWidth` 而不是 `100vw`，不含滚动条宽度、更准）：

```ts
// src/utils/rem.ts
function resolveRootFontSize(): number {
  const width = document.documentElement.clientWidth || window.innerWidth
  const size = (width / DESIGN_WIDTH) * DESIGN_ROOT_FONT_SIZE // 1920 稿：width / 1920 * 16
  return Math.min(ROOT_FONT_SIZE_MAX, Math.max(ROOT_FONT_SIZE_MIN, size))
}

apply() // 首屏渲染前先算一次，避免尺寸跳动
window.addEventListener('resize', schedule, { passive: true })
window.addEventListener('orientationchange', schedule, { passive: true })
window.addEventListener('pageshow', schedule, { passive: true })
// 滚动条出现时 clientWidth 会变但 resize 不一定触发，交给 ResizeObserver 兜住
new ResizeObserver(schedule).observe(document.documentElement)
```

在 `main.tsx` 里于 `createRoot().render()` **之前**调用：

```ts
setupRootFontSize()
setupAppSync()
```

实测（只改窗口大小、不刷新页面）：

| 视口宽 | `<html>` 内联 `font-size` | `.btn` 内边距（设计稿 8px 12px） |
|---|---|---|
| 1280 / 1440 | 15px（下限） | 7.5px 11.25px |
| **1920** | **16px（设计稿基准）** | **8px 12px** |
| 2200 | 18.3333px（等比） | 9.16667px 13.75px |
| 2560 | 20px（上限） | 10px 15px |

上下限（默认 15px / 20px）是为了可读性：纯等比会让 1280 屏的 14px 字变成 9.3px。要改就在 `src/utils/rem.ts` 里改 `ROOT_FONT_SIZE_MIN` / `ROOT_FONT_SIZE_MAX`。

### 构建期换算：postcss-pxtorem

CSS / SCSS 的 px → rem 交给 `postcss-pxtorem`（挂在 `vite.config.ts` 的 `css.postcss`，与构建工具解耦）：

```ts
// vite.config.ts
pxtorem({
  rootValue: 16,                     // 1920 稿下 1rem = 16px
  unitPrecision: 5,
  propList: ['*'],                   // 所有属性（插件默认只处理 font-* 那几个）
  minPixelValue: 2,                  // 小于它的 px 保持真实像素（1px 细边框）
  selectorBlackList: ['html:root'],  // 兜底根字号那条规则不换算
  mediaQuery: false,                 // @media 里的 px 是视口宽度，不换算
})
```

```scss
// SCSS 里直接写设计稿 px
.font-page__search-input {
  padding: 8px 12px; // → 0.5rem 0.75rem
  border: 1px solid var(--ui-control-border); // 1px 不换算（minPixelValue = 2）
}
```

**行内样式不参与构建期替换**。PostCSS 只看得到 CSS 文件，React 的 `style={{}}` 写在 tsx 里；要覆盖它就得再写一个 Vite 插件、赶在 React 插件编译 JSX 之前扫源码解析 `style={{ ... }}`——为此长期维护一个解析器不划算，所以约定：**行内样式只放动态值，尺寸一律用 `toRem()`**。

```tsx
import { toRem } from '@/utils/rem'

<span style={{ fontSize: toRem(previewSize), lineHeight: 1 }} />
```

**别在行内样式里写死尺寸**：React 的 `fontSize: 28` 等于 `28px`，写成 `'28px'` 字符串也不会被换算（它构不成 CSS 文件），两者都不会跟着视口缩放。

### 例外与边界

| 情况 | 行为 |
|---|---|
| `1px` 细边框、box-shadow 里的 1px | 不换算（`minPixelValue = 2`），保持真实像素 |
| CSS 兜底的根字号 | 只有它必须保留 px（rem 表达不了根字号本身）。单独写成 `html:root` 一条规则，并加进 `selectorBlackList` |
| **负值 px** | **不换算** —— 插件判的是 `pixels < minPixelValue`、不取绝对值，负号会让任何阈值都成立。要缩放的负偏移写成 `calc(-1 * 96px)`（见 `.home__glow`） |
| `var()` / `url()` 里的内容 | 插件自动跳过。令牌在 `_tokens.scss` 定义处换算，引用处不用管 |
| `@media` 断点 | 不是声明值，保持 px，断点依旧跟视口走 |
| 以后引入第三方 CSS | 要给插件加 `exclude: /node_modules/i`（现在项目没有第三方样式，所以没配） |
| 想关掉适配 | 把 `src/utils/rem.ts` 里的上下限设成同一个值（等于固定根字号） |

改设计稿宽度时有三处标着同一个基准，需要一起改：`vite.config.ts` 里 `pxtorem` 的 `rootValue`、`src/utils/rem.ts` 的 `DESIGN_WIDTH` / `DESIGN_ROOT_FONT_SIZE`、`_base.scss` 兜底 `clamp` 里的 `0.833333vw`（= 16 ÷ 1920）。

### 样式写法：语义类名 + 令牌 + mixin

不用任何 CSS 框架，全部手写 SCSS。三层结构：

| 层 | 文件 | 写什么 |
|---|---|---|
| 令牌 | `_tokens.scss` | 颜色、字体、阴影等所有「值」，`--ui-*` 变量，明暗两套 |
| 基础类 | `_ui-classes.scss` + `_ui.scss` | 跨组件复用的按钮/输入框/标签/卡片，同一套定义提供两种用法 |
| 组件样式 | 各组件同目录的 `.scss` | 该组件的结构样式，类名用 `.块__元素--修饰` |

颜色一律走令牌，所以**暗色只在一个文件里切换**，组件样式里没有任何 `dark` 分支：

```scss
// _tokens.scss
:root { --ui-surface: #ffffff; --ui-surface-border: #e2e8f0; }
.dark { --ui-surface: #0f172a; --ui-surface-border: #1e293b; }

// FontList/FontList.scss
.font-list__item {
  background-color: var(--ui-surface);
  border: 1px solid var(--ui-surface-border);
}
```

按钮这类到处都用的东西有两种用法，按场景选：

```scss
/* 1. 标准按钮直接挂全局类名 */
<button className="btn btn-primary">导出</button>

/* 2. 需要换个语义类名时用 mixin，样式依然写在组件自己的 .scss 里 */
.sidebar__action { @include btn-ghost; }
```

需要局部微调（比如更紧凑的按钮）就直接在组件的类里覆盖，组件样式加载在全局样式之后，同优先级下后者生效：

```scss
.json-page__sort {
  @include btn-base;

  padding: 6px 10px;
  font-size: 12px;
}
```

断点用 `@include media('lg')`（`_mixins.scss`），媒体查询里的 px 是视口宽度、不参与换算。变量与 mixin 通过 `vite.config.ts` 的 `additionalData` 自动注入到每个被 JS 引入的 .scss，所以组件样式文件里不用写 `@use`（被 Sass 内部引用的 partial 需要自己写，见 `_helper.scss` 注释）。

### 新增样式写哪里

| 要写的东西 | 放哪 |
|---|---|
| 某个组件的样式 | 该组件同目录的 `Xxx.scss`，类名 `.xxx__元素` |
| 新组件的样式文件 | 新目录 `Xxx/Xxx.scss`，在 `Xxx.tsx` 里 `import './Xxx.scss'` |
| 跨组件复用的按钮/输入框 | 用 `@include btn-ghost` 等（`_ui.scss`）；定义在 `_ui.scss` 里改 |
| 全局默认值（字体、滚动条、重置…） | `_base.scss` / `_reset.scss` |
| 新增颜色 | 加到 `_tokens.scss` 的明暗两套里，组件里只引 `var(--ui-xxx)` |
| 动态尺寸（行内样式） | `toRem()`（`@/utils/rem`） |

### 界面图标：SVG 精灵图

界面图标不是内联 path，而是 `src/assets/svg/` 下的独立 `.svg` 文件：构建时由 `<IconSprite />`（挂在 `App.tsx`，全应用只挂一次）编译成 `<symbol>` 精灵图，`<Icon>` 只写引用。

```tsx
// 用法
<Icon name="chevron-right" size={15} className="home__card-arrow" />

// 实际渲染
<svg width="15" height="15"><use href="#icon-chevron-right" /></svg>
```

好处：图标能单独打开预览、改路径数据只动 `.svg`；页面里不重复内联 path，一份 `<symbol>` 多处引用；`<Icon>` 保持精简。

**新增图标**两步：

1. 放一个 `.svg` 到 `src/assets/svg/`（多单词用连字符，如 `chevron-right.svg`）
2. 在 `src/assets/svg/index.ts` 加一行 `import` + 一行映射

`IconName` 类型从注册表推导，所以名字写错直接编译报错；引用 id 固定为 `icon-<文件名>`。

**几条约定**：

| 事项 | 说明 |
|---|---|
| 表现属性 | 写在 `.svg` 自己身上（`fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"`），`IconSprite` 会把它们搬到 `<symbol>` 上；改描边粗细改 `.svg` |
| 颜色 | 走 `currentColor`，在父级或 `Icon` 的 className 上设 `color`（如 `.font-page__search-icon { color: var(--ui-text-subtle) }`） |
| 尺寸 | 用 `<Icon size>`，缩放由 symbol 的 `viewBox` 负责，`<Icon>` 自己不设 `viewBox` |
| 精灵图容器 | `.icon-sprite` 是 `position:absolute; width:0; height:0`，**不能用 `display:none`**（部分浏览器会让 `<use>` 一起失效） |

> 注意与「七、字体图标工具」区分：那是业务功能（解析用户导入的字体文件）；这里说的是项目自己的界面图标。

## 五、状态管理

`src/store` 用 zustand，所有 store 从统一出口引入：

```ts
import { useAppStore, useFontLibrary, useUiStore, toast, setupAppSync } from '@/store'
```

| store | 持久化 | 存什么 |
|---|---|---|
| `appStore` | 是（localStorage，key `dev-toolbox:app`） | 语言、主题、侧边栏折叠、JSON 工具参数与输入、字体工具筛选参数 |
| `fontStore` | 否（内存） | 已导入的字体、解析结果、`FontFace` 注册 |
| `uiStore` | 否 | Toast 队列 |

约定：**目录内模块之间直接引具体文件**（`./appStore`），只有外部消费者用 `@/store`，否则会形成 `index → 模块 → index` 的循环依赖。持久化状态到 DOM / i18n 的同步统一放在 `store/sync.ts`（首屏执行一次 + 订阅变更）。

## 六、国际化

词条在 `src/locales/modules/` 下，一个语言一个文件。新增语言：加词条文件 → 在 `locales/i18n.ts` 的 `resources` 注册 → 在 `locales/locale.ts` 的 `SUPPORTED_LOCALES` 与 `LOCALE_LABELS` 登记。

组件里用 `useTranslation()` 的 `t`：

```tsx
const { t } = useTranslation()
<h1>{t('iconFont.title')}</h1>
```

语言本身是 `appStore` 里的持久化状态，切换由 `locales/locale.ts` 探测首屏语言、`store/sync.ts` 负责调 `i18n.changeLanguage` 并同步 `<html lang>`。

## 七、字体图标工具的实现

`features/font/parseFont.ts` 是纯前端字体解析器，零后端：

- 容器层：sfnt(TTF/OTF)、WOFF、WOFF2 三种格式统一解析成「表名 → 表数据」；
- WOFF 的表用 zlib 压缩，交给浏览器原生 `DecompressionStream('deflate')`；
- WOFF2 整包用 brotli 压缩，用 `brotli` 解码后按目录顺序切片（**解压后的表数据是紧密排列的，不做 4 字节对齐**）；brotli 解码器按需动态 import，不拖慢首屏；
- 表层：读 `cmap`（format 0/4/6/12）拿码位、`post`(2.0) 拿字形名、`name` 拿字体名、`maxp`/`head` 拿字形数与 em 单位；
- 预览用 `FontFace` API 注册真实字体；导出 HTML 时把字体 base64 内联，生成可单独分享、自带搜索与复制功能的单文件页面。

## 八、构建与部署

```bash
npm run build     # 先 tsc 类型检查，再 vite build
```

产物在 `dist/`，`vite.config.ts` 里 `base: './'`，可直接丢到任意静态目录 / 子路径（CDN、OSS、GitHub Pages）访问。hash 路由无需任何服务器 rewrite 配置。

### 自动部署：GitHub Actions → Vercel

`.github/workflows/deploy.yml`：**推送到 `master`**（包括其它分支合并进 master 产生的推送）或手动触发时，依次执行

```
npx tsc --noEmit → vercel pull → vercel build --prod → vercel deploy --prebuilt --prod
```

构建在 runner 上按 Vercel 项目的 install / build / output 设置完成，`--prebuilt` 只上传产物、不在 Vercel 端重复构建；部署地址会写进 Actions 的运行摘要。同一时刻只跑一个生产部署（`concurrency`），连续合并时排队而不是交叉发布。

**一次性配置（4 步）**

1. 建 Vercel 项目并关联本地目录，拿到项目 id：
   ```bash
   npx vercel@59 link         # 在项目根目录执行，选 team 与项目名（框架识别为 Vite，产物 dist）
   cat .vercel/project.json   # 里面的 orgId / projectId 下一步要用
   ```
2. Vercel → Account Settings → **Tokens** → Create（scope 选对应 team），得到 `VERCEL_TOKEN`。
3. 仓库 → Settings → Secrets and variables → Actions → New repository secret，加三个：

   | Secret | 值 |
   |---|---|
   | `VERCEL_TOKEN` | 第 2 步生成的 token |
   | `VERCEL_ORG_ID` | `.vercel/project.json` 里的 `orgId` |
   | `VERCEL_PROJECT_ID` | `.vercel/project.json` 里的 `projectId` |

4. Vercel 项目 → Settings → General → **Node.js Version** 选 22.x，与 workflow 里的 `node-version` 保持一致（Vite 8 要求 `^20.19 || >=22.12`）。

**与 Vercel 的「Git 集成自动部署」二选一**：项目若已连了 Git 集成，每次 push 会先由 Vercel 自动部署一次、Action 再部署一次。要用 Action 就断开 Git 集成（Vercel → Settings → Git → Disconnect，或在 `vercel.json` 里写 `{"git":{"deploymentEnabled":false}}`）；只想用 Vercel 自带的，删掉这个 workflow 即可。

`.vercel/`（本地与 CI 拉取项目配置时生成）已在 `.gitignore` 里。

---

## 常见坑与约定

| 现象 | 原因与做法 |
|---|---|
| 用 `window.location.hash = '...'` 跳转后 `goBack()` 行为不符预期 | 原生改 hash 不经过 react-router，是一次不带路由 key 的 pop，「有没有上一页」的判定会退化。统一用 `navigateTo()` 代替 |
| 页面白屏、报 `Cannot access 'ROUTES' before initialization` | 被 `routes.tsx` 引用的模块在**顶层**读了 `ROUTES`/`APP_ROUTES`。改成渲染期读或调用 `pathOf()` |
| 循环依赖警告 | `AppLayout` / `Sidebar` 必须从 `@/router/routes` 取 `APP_ROUTES`，不能从 `@/router` 取 |
| 行内样式写了数字（`fontSize: 28`）不缩放 | React 把数字当 px；行内样式不参与构建期换算，写 `'28px'` 字符串也一样。统一用 `toRem(28)` |
| 负偏移（`top: -96px`）不缩放 | `postcss-pxtorem` 不换算负值，写成 `calc(-1 * 96px)` |
| 换了设计稿宽度但尺寸没跟着变 | 三处标着基准的地方要一起改：`pxtorem.rootValue`（vite.config.ts）、`DESIGN_*`（utils/rem.ts）、`_base.scss` 兜底 clamp 的 `vw` |
| 图标空白（页面上留个空位） | 名字没对上：文件名 `chevron-right.svg` ↔ `name="chevron-right"`；新增 `.svg` 后要在 `assets/svg/index.ts` 里注册 |
| 动画/变换作用在图标上无效 | 类名挂在 `<Icon>` 生成的 `<svg>` 上，旋转用 CSS `transform` 没问题；但别去改 `<use>` 内部（symbol 内容在 shadow tree 里，页面选择器取不到、只能改 `.svg` 文件） |
| 暗色下某处颜色没跟着变 | 多半是写了具体色值（`#fff`）。改成 `_tokens.scss` 里的 `--ui-*` 令牌 |
| 组件样式被全局基础类覆盖 | 全局样式先加载、组件样式后加载，同优先级组件生效；若选择器权重更低，改用 `@include btn-*` 而不是挂全局类名 |
| 导入字体报「不支持的字体格式」 | 用二进制工具确认前 4 字节是 `wOFF` / `wOF2`；常见于下载被重定向到登录页，存下来的是 HTML |
| `location.state` 刷新后没了 | 直接改地址栏或新标签打开会丢；需要可靠跨页就放 store |
| push 之后 Vercel 部署了两次 | Vercel 的 Git 集成与 `.github/workflows/deploy.yml` 同时生效，二选一（见「八、构建与部署」） |
| Action 报 `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` 缺失 | 三个 secrets 缺一不可，后两个来自 `npx vercel link` 后 `.vercel/project.json` 的 `orgId` / `projectId` |
| Action 构建失败、提示 Node 版本不满足 | workflow 的 `node-version` 与 Vercel 项目的 Node.js Version 都要满足 Vite 8 的 `^20.19 \|\| >=22.12` |
