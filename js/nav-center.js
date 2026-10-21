/* ==========================================================================
   nav-center.js
   导航栏居中标题 —— 复刻 fomal.cc 的那个小动画：
   滚过首屏之后，左上角的站名淡出，导航正中淡入「当前页面标题」。
   再往下滚时标题留在顶部导航条里，往上滚导航条连同标题一起滑下来。

   主题模板 nav.pug 里本来没有这个元素，所以这里是用 JS 建出来的，
   这样升级主题（themes/butterfly 是上游的干净克隆）不会冲突。
   样式在 source/css/fomal-style.css 的 H 节。
   ========================================================================== */

(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;

  var header = document.getElementById('page-header');

  /* ---- 建 DOM ---- */
  var box = document.createElement('div');
  box.id = 'name-container';

  var icon = document.createElement('i');
  icon.className = 'fas fa-rocket';

  var link = document.createElement('a');
  link.id = 'page-name';
  link.href = '/';

  box.appendChild(icon);
  box.appendChild(link);
  nav.appendChild(box);

  /* ---- 取当前页标题 ----
     文章页 / 独立页优先用页面自己的一级标题，
     首页和列表页退回 <title> 的第一段（Butterfly 的格式是「标题 | 站点名」）。 */
  function textOf(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function pageName() {
    var candidates = [
      '#page-header .post-title',
      '#page-header .page-title',
      '#page-header #site-title'
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      var text = textOf(el);
      if (text) return text;
    }
    return document.title.split(/\s*[|｜]\s*/)[0];
  }

  link.textContent = pageName();
  link.title = link.textContent;

  /* ---- 跟随滚动切换显隐 ----
     用主题自己打的 class 判断，不用重新算滚动距离：
     滚过首屏后 #page-header 会带上 .nav-fixed（nav.fixed: true 时是 .fixed）。 */
  function update() {
    // 没有 #page-header 的页面（比如音乐页）退回用滚动距离判断
    var scrolled = header
      ? (header.classList.contains('nav-fixed') || header.classList.contains('fixed'))
      : (window.scrollY || document.documentElement.scrollTop) > 200;
    nav.classList.toggle('name-show', scrolled);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* 用了 pjax 的话页面切换不会重新执行这段脚本，得自己刷新标题 */
  if (window.btf && typeof window.btf.addEventListenerPjax === 'function') {
    window.btf.addEventListenerPjax(document, 'pjax:complete', function () {
      link.textContent = pageName();
      link.title = link.textContent;
      update();
    });
  }
})();
