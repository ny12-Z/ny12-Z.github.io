/*
 * 文章浏览量上报（LibreCounter）
 * ----------------------------------------------------------------------
 * 只在正式站点、且当前页面是文章页时，向 LibreCounter 上报一次访问。
 * 首页/归档等列表页不会给文章加计数，避免“刷首页也在涨”。
 * 页面上的数字由构建脚本 scripts/post-views.js 在部署时生成快照。
 */
(function () {
  'use strict';

  // 本地预览不统计，避免污染线上数据
  if (location.hostname !== 'ny12-z.github.io') return;

  // 尊重 Do Not Track
  if (navigator.doNotTrack === '1') return;

  var lastPath = '';

  function record() {
    // #post 只存在于文章详情页
    if (!document.querySelector('#post')) return;

    var pathname = location.pathname;
    if (pathname === lastPath) return; // 防止 pjax 重入导致重复计数
    lastPath = pathname;

    var url = location.origin + pathname;
    var src = 'https://librecounter.org/count?url=' +
      encodeURIComponent(url) +
      '&userAgent=' + encodeURIComponent(navigator.userAgent);

    // /count 不需要读取响应；no-cors 即可，跨域限制不影响上报
    fetch(src, { mode: 'no-cors', keepalive: true }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', record);
  } else {
    record();
  }

  // pjax 切页后重新判断
  document.addEventListener('pjax:complete', record);
})();
