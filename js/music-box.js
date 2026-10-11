/* ==========================================================================
   music-box.js
   /music/ 页面的页内播放器（大时钟 + 封面 + 进度条 + 音量）。

   这个脚本通过 _config.butterfly.yml 的 inject.bottom 注入到【每一页】，
   但页面元素只存在于 /music/，所以 init() 里第一件事就是查元素、查不到直接退出。

   歌单复用 global-player.js 暴露的 window.MUSIC_PLAYLIST，
   加歌只改 global-player.js 一处即可。

   关于 pjax：开启 pjax 后，切到 /music/ 是替换 #body-wrap 而不是整页刷新，
   旧的节点和监听器会全部作废。所以这里：
     - 监听器一律用 on* 属性赋值（不用 addEventListener），节点复用也不会叠加；
     - 时钟的 setInterval 存在模块级的 timer 里，离开页面时清掉，避免每次进入都泄漏一个；
     - 在 pjaxComplete 上重新 init，在 pjaxSend 上 teardown。
   不做这些的话，会是"第一次进 /music/ 能放，点别的页再点回来就失灵"。
   ========================================================================== */

(function () {
  'use strict';

  var timer = null;

  /* 兜底歌单：万一 global-player.js 没加载成功（比如 CDN 挂了），
     这里也能放歌，不至于整个页面空掉。内容要和那边保持一致。 */
  var FALLBACK_PLAYLIST = [
    { name: '3-10', artist: 'Musa', url: '/music/3-10%20-%20Musa.mp3' }
  ];

  function fmt(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function init() {
    var clock = document.getElementById('music-time');

    // 不是 /music/ 页 —— 直接退出。
    // 这就是之前那个 bug 的修复：原来这里没判断，导致其它每一页
    // 都在 #music-time 上取 null.textContent 而抛错。
    if (!clock) return;

    var dateEl = document.getElementById('music-date');
    var cover = document.querySelector('.music-cover');
    var placeholder = document.querySelector('.music-cover-placeholder');
    var titleEl = document.querySelector('.music-title');
    var artistEl = document.querySelector('.music-artist');
    var audio = document.getElementById('music-audio');
    var playBtn = document.getElementById('music-play');
    var prevBtn = document.getElementById('music-prev');
    var nextBtn = document.getElementById('music-next');
    var bar = document.getElementById('music-progress');
    var curEl = document.getElementById('music-current');
    var durEl = document.getElementById('music-duration');
    var volEl = document.getElementById('music-volume');

    if (!audio || !playBtn) return;

    var playlist = (window.MUSIC_PLAYLIST && window.MUSIC_PLAYLIST.length)
      ? window.MUSIC_PLAYLIST
      : FALLBACK_PLAYLIST;
    var index = 0;

    /* —— 时钟 —— */
    function tick() {
      var n = new Date();
      clock.textContent =
        String(n.getHours()).padStart(2, '0') + ':' +
        String(n.getMinutes()).padStart(2, '0') + ':' +
        String(n.getSeconds()).padStart(2, '0');

      if (dateEl) {
        dateEl.textContent =
          n.getFullYear() + '.' +
          String(n.getMonth() + 1).padStart(2, '0') + '.' +
          String(n.getDate()).padStart(2, '0');
      }
    }

    tick();
    clearInterval(timer);          // 防止重复 init 时叠加定时器
    timer = setInterval(tick, 1000);

    /* —— 加载某首歌 —— */
    function load(i) {
      index = (i + playlist.length) % playlist.length;
      var track = playlist[index];

      audio.src = track.url;
      audio.volume = volEl ? Number(volEl.value) : 0.7;

      if (titleEl) titleEl.textContent = track.name || '';
      if (artistEl) artistEl.textContent = track.artist || '';

      // 有封面就贴上去，没有就显示那个 ♫ 占位符
      if (placeholder) {
        placeholder.style.display = track.cover ? 'none' : '';
      }
      if (cover) {
        cover.style.backgroundImage = track.cover ? 'url("' + track.cover + '")' : '';
        cover.style.backgroundSize = 'cover';
        cover.style.backgroundPosition = 'center';
      }

      playBtn.textContent = '▶';
      if (bar) bar.value = 0;
      if (curEl) curEl.textContent = '0:00';
      if (durEl) durEl.textContent = '0:00';
    }

    /* —— 控制 —— */
    playBtn.onclick = function () {
      if (audio.paused) {
        audio.play();
        playBtn.textContent = 'Ⅱ';
      } else {
        audio.pause();
        playBtn.textContent = '▶';
      }
    };

    // 只有一首歌时，上一首/下一首本来就是取模回到同一首，行为不会出错
    if (prevBtn) prevBtn.onclick = function () { load(index - 1); };
    if (nextBtn) nextBtn.onclick = function () { load(index + 1); };

    if (bar) {
      bar.oninput = function () {
        if (audio.duration) audio.currentTime = (bar.value / 100) * audio.duration;
      };
    }

    if (volEl) {
      volEl.oninput = function () { audio.volume = Number(volEl.value); };
    }

    audio.onloadedmetadata = function () {
      if (durEl) durEl.textContent = fmt(audio.duration);
    };

    audio.ontimeupdate = function () {
      if (curEl) curEl.textContent = fmt(audio.currentTime);
      if (bar && audio.duration) bar.value = (audio.currentTime / audio.duration) * 100;
    };

    audio.onended = function () {
      playBtn.textContent = '▶';
      if (bar) bar.value = 0;
      if (curEl) curEl.textContent = '0:00';
    };

    load(0);
  }

  function teardown() {
    // 离开页面时清掉时钟，否则每进一次 /music/ 就多一个每秒跑一次的定时器
    clearInterval(timer);
    timer = null;
  }

  init();

  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxSend', teardown, 'musicBoxTeardown');
    window.btf.addGlobalFn('pjaxComplete', init, 'musicBoxInit');
  } else {
    document.addEventListener('pjax:complete', init);
  }
})();
