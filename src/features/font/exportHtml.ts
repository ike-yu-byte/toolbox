import { isPrivateUse, toCssEscape, toUnicodeLabel, type ParsedFont } from '@/features/font/parseFont'
import { bytesToBase64, formatBytes } from '@/utils/file'

export interface ExportFontInput {
  fileName: string
  font: ParsedFont
  bytes: Uint8Array
}

export interface GalleryTexts {
  title: string
  total: string
  search: string
  copyHint: string
  copied: string
  noResult: string
  usage: string
  cssClass: string
  file: string
  format: string
  size: string
  glyphs: string
  privateUse: string
  all: string
}

const MIME: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
}

const FORMAT_LABEL: Record<string, string> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'ttf',
  otf: 'otf',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 从字体家族名推导 CSS 类名前缀，例如 "MyIcons" -> "my-icons" */
function toClassPrefix(familyName: string): string {
  const slug = familyName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'iconfont'
}

/** 生成图标 CSS 类列表，例如 .my-icons-home::before { content: '\e600'; } */
export function buildCssClassList(font: ParsedFont): string {
  const prefix = toClassPrefix(font.familyName)
  return font.glyphs
    .map((glyph) => `.${iconClassName(prefix, glyph.codePoint, glyph.name)}::before { content: '${toCssEscape(glyph.codePoint)}'; }`)
    .join('\n')
}

function iconClassName(prefix: string, codePoint: number, name?: string): string {
  return (name ? `${prefix}-${name}` : `${prefix}-${codePoint.toString(16)}`)
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase()
}

/**
 * 生成一个自包含的 HTML 图标展示页：
 * 字体以 base64 内联，双击即可在浏览器中打开、搜索、复制码位。
 */
export function buildIconGalleryHtml(
  fonts: ExportFontInput[],
  texts: GalleryTexts,
  generatedAt: string,
): string {
  const fontFaces: string[] = []
  const usageBlocks: string[] = []
  const sections: string[] = []

  fonts.forEach((item, index) => {
    const family = `IconFontPreview${index}`
    const prefix = toClassPrefix(item.font.familyName)
    const base64 = bytesToBase64(item.bytes)
    const mime = MIME[item.font.format] ?? 'font/ttf'
    const glyphs = item.font.glyphs

    fontFaces.push(`@font-face {
  font-family: '${family}';
  src: url(data:${mime};base64,${base64}) format('${FORMAT_LABEL[item.font.format] ?? 'truetype'}');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}`)

    const classLines = buildCssClassList(item.font)

    const cssSnippet = `.${prefix} {
  font-family: '${family}';
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
}

${classLines}`

    usageBlocks.push(`<section class="usage">
  <div class="usage-head">
    <h3>${escapeHtml(item.font.familyName)} · ${texts.usage}</h3>
    <button class="ghost" data-copy-css="${index}">${texts.cssClass}</button>
  </div>
  <pre id="css-${index}">${escapeHtml(`${fontFaces[index]}\n\n${cssSnippet}`)}</pre>
</section>`)

    const cards = glyphs
      .map((glyph) => {
        const name = glyph.name ?? ''
        const search = `${glyph.codePoint.toString(16)} ${toUnicodeLabel(glyph.codePoint)} ${name}`.toLowerCase()
        return `<button class="icon-card" data-search="${escapeHtml(search)}" data-copy="${toCssEscape(glyph.codePoint)}" title="${escapeHtml(
          `${toUnicodeLabel(glyph.codePoint)}  ${name}`.trim(),
        )}">
      <span class="glyph" style="font-family:'${family}'">&#x${glyph.codePoint.toString(16)};</span>
      <span class="code">${glyph.codePoint.toString(16).toUpperCase()}</span>
      <span class="name">${escapeHtml(name || '—')}</span>
    </button>`
      })
      .join('\n')

    sections.push(`<section class="font-block" data-font="${index}">
  <header class="font-head">
    <h2>${escapeHtml(item.font.familyName)}</h2>
    <div class="meta">
      <span class="tag">${texts.file}: ${escapeHtml(item.fileName)}</span>
      <span class="tag">${texts.format}: ${item.font.format}</span>
      <span class="tag">${texts.size}: ${formatBytes(item.bytes.length)}</span>
      <span class="tag">${texts.glyphs}: ${item.font.numGlyphs}</span>
      <span class="tag">${texts.privateUse}: ${glyphs.filter((g) => isPrivateUse(g.codePoint)).length}</span>
    </div>
  </header>
  <div class="grid">
${cards}
  </div>
</section>`)
  })

  const totalGlyphs = fonts.reduce((sum, item) => sum + item.font.glyphs.length, 0)

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(texts.title)}</title>
<style>
${fontFaces.join('\n\n')}

*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#f1f5f9;color:#0f172a;padding:24px 20px 60px}
.wrap{max-width:1280px;margin:0 auto}
.page-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:18px}
.page-head h1{margin:0;font-size:22px}
.page-head p{margin:4px 0 0;font-size:13px;color:#64748b}
.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:10;padding:12px;border-radius:14px;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border:1px solid #e2e8f0;margin-bottom:18px}
input[type=search]{flex:1;min-width:220px;padding:9px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:14px;outline:none}
input[type=search]:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.filter{display:flex;gap:6px}
.filter button{border:1px solid #cbd5e1;background:#fff;color:#475569;padding:8px 12px;border-radius:9px;cursor:pointer;font-size:13px}
.filter button.active{background:#4f46e5;border-color:#4f46e5;color:#fff}
.count{font-size:13px;color:#64748b}
.hint{font-size:12px;color:#94a3b8}
.font-block{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:22px}
.font-head h2{margin:0 0 8px;font-size:17px}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.tag{font-size:12px;color:#475569;background:#f1f5f9;border-radius:6px;padding:3px 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
.icon-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 6px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;transition:.15s;overflow:hidden}
.icon-card:hover{border-color:#6366f1;box-shadow:0 6px 16px rgba(79,70,229,.12);transform:translateY(-1px)}
.icon-card .glyph{font-size:26px;line-height:1;color:#0f172a}
.icon-card .code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;color:#4f46e5}
.icon-card .name{font-size:11px;color:#94a3b8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.usage{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:22px}
.usage-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.usage-head h3{margin:0;font-size:15px}
.usage pre{margin:0;max-height:320px;overflow:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:14px;font-size:12px;line-height:1.6}
.ghost{border:1px solid #cbd5e1;background:#fff;color:#475569;padding:7px 12px;border-radius:9px;cursor:pointer;font-size:13px}
.ghost:hover{background:#f8fafc}
.empty{display:none;text-align:center;color:#94a3b8;padding:40px 0;font-size:14px}
.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);background:#0f172a;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;opacity:0;transition:.2s;pointer-events:none}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media (prefers-color-scheme:dark){
  body{background:#020617;color:#e2e8f0}
  .toolbar{background:rgba(15,23,42,.9);border-color:#1e293b}
  input[type=search]{background:#0f172a;border-color:#334155;color:#e2e8f0}
  .font-block,.usage,.icon-card{background:#0f172a;border-color:#1e293b}
  .icon-card .glyph{color:#e2e8f0}
  .tag{background:#1e293b;color:#94a3b8}
  .filter button,.ghost{background:#0f172a;border-color:#334155;color:#94a3b8}
  .page-head p,.count{color:#94a3b8}
  .hint{color:#64748b}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="page-head">
    <div>
      <h1>${escapeHtml(texts.title)}</h1>
      <p>${escapeHtml(texts.total)} · ${fonts.length} fonts · ${totalGlyphs} glyphs · ${escapeHtml(generatedAt)}</p>
    </div>
  </div>

  <div class="toolbar">
    <input type="search" id="search" placeholder="${escapeHtml(texts.search)}">
    <div class="filter">
      <button class="active" data-filter="all">${escapeHtml(texts.all)}</button>
      <button data-filter="pua">${escapeHtml(texts.privateUse)}</button>
    </div>
    <span class="count" id="count"></span>
    <span class="hint">${escapeHtml(texts.copyHint)}</span>
  </div>

${sections.join('\n')}
  <div class="empty" id="empty">${escapeHtml(texts.noResult)}</div>

${usageBlocks.join('\n')}
</div>
<div class="toast" id="toast">${escapeHtml(texts.copied)}</div>
<script>
(function(){
  var cards = Array.prototype.slice.call(document.querySelectorAll('.icon-card'));
  var puaRanges = [[0xE000,0xF8FF],[0xF0000,0xFFFFD],[0x100000,0x10FFFD]];
  var searchInput = document.getElementById('search');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var toastEl = document.getElementById('toast');
  var filter = 'all';
  var toastTimer = null;

  function isPua(cp){
    return puaRanges.some(function(r){ return cp >= r[0] && cp <= r[1]; });
  }

  function apply(){
    var keyword = searchInput.value.trim().toLowerCase();
    var visible = 0;
    cards.forEach(function(card){
      var okKeyword = !keyword || card.getAttribute('data-search').indexOf(keyword) >= 0;
      var code = card.querySelector('.code').textContent.trim();
      var okFilter = filter === 'all' || isPua(parseInt(code, 16));
      var show = okKeyword && okFilter;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    countEl.textContent = visible + ' / ' + cards.length;
    emptyEl.style.display = visible === 0 ? 'block' : 'none';
  }

  function toast(message){
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1400);
  }

  function copy(text){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ toast('${escapeHtml(texts.copied)}: ' + text); }, function(){});
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast('${escapeHtml(texts.copied)}: ' + text);
  }

  document.addEventListener('click', function(event){
    var card = event.target.closest('.icon-card');
    if (card) { copy(card.getAttribute('data-copy')); return; }
    var cssBtn = event.target.closest('[data-copy-css]');
    if (cssBtn) {
      copy(document.getElementById('css-' + cssBtn.getAttribute('data-copy-css')).textContent);
      return;
    }
    var filterBtn = event.target.closest('[data-filter]');
    if (filterBtn) {
      document.querySelectorAll('[data-filter]').forEach(function(btn){ btn.classList.remove('active'); });
      filterBtn.classList.add('active');
      filter = filterBtn.getAttribute('data-filter');
      apply();
    }
  });

  searchInput.addEventListener('input', apply);
  apply();
})();
</script>
</body>
</html>`
}
