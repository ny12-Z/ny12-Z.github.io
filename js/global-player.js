/* ==========================================================================
   global-player.js
   全站悬浮迷你音乐播放器（APlayer 1.10.1，见 _config.butterfly.yml 的 inject.bottom）

   为什么能"切换页面音乐不断"：
     1. 本脚本和 #global-aplayer 容器都注入在 inject.bottom，位置在 #body-wrap
        之外。pjax 只替换 ['head > title', '#config-diff', '#body-wrap',
        '#rightside-config-hide', '#rightside-config-show', '.js-pjax']，
        所以容器不会被换掉，<audio> 自然也不会被中断。
     2. fixed: true。主题的 pjax 钩子在离开页面时会销毁所有 APlayer 实例，
        但会跳过 options.fixed 为真的（见 theme 的 third-party/aplayer.pug），
        所以必须开 fixed。
     3. 本脚本没有 data-pjax 属性，pjax 不会重新执行它 —— 不会重复初始化。

   加歌：往下面的 PLAYLIST 数组里塞对象即可，加完直接 hexo g 就生效。
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     歌单。目前只有一首本地 mp3（source/music/）。
     加一首就复制一段：

       { name: '歌名', artist: '歌手', url: '/music/文件名.mp3', cover: '/img/封面.jpg', lrc: '/music/歌词.lrc' }

     注意 url 里的空格要写成 %20，否则浏览器取不到文件。
     cover / lrc 都可以不写：
       - 不写 cover 会用下面的 DEFAULT_COVER（音符图标），
         APlayer 在完全没封面时只会渲染一块纯主题色的空方块；
       - 不写 lrc 就是不显示歌词。
     ------------------------------------------------------------------------ */
  var PLAYLIST = [
    {
      name: '3-10',
      artist: 'Musa',
      url: '/music/3-10%20-%20Musa.mp3'
    }
  ];

  /* 没有单独指定封面的歌统一用这张音符图（source/img/music-note.svg）。
     想换图标就换这个路径。 */
  var DEFAULT_COVER = '/img/music-note.svg';

  /* 补上默认封面。复制一份而不是改原数组，免得上面那份声明和实际用的对不上。 */
  var TRACKS = PLAYLIST.map(function (track) {
    return Object.assign({}, track, { cover: track.cover || DEFAULT_COVER });
  });

  /* 暴露给 music-box.js 复用（/music/ 页那个页内播放器），
     这样加歌只需要改上面这一处，不用两个文件各维护一份歌单。 */
  window.MUSIC_PLAYLIST = TRACKS;

  var player = null;

  /* 判断当前是不是 /music/ 音乐页。
     不用 location.pathname 判断，改用 DOM：css 那边也是用 .music-box 做
     :has() 判断的，两边保持一致；pjax 换掉内容后这里再查一次就是新页面。 */
  function onMusicPage() {
    return !!document.querySelector('.music-box');
  }

  function init() {
    // CDN 没加载上（比如断网）就安静退出，不要抛错影响其它脚本
    if (typeof APlayer === 'undefined') return;

    var el = document.getElementById('global-aplayer');
    if (!el) return;

    if (!player) {
      player = new APlayer({
        container: el,
        fixed: true,   // 悬浮吸底（默认左下角）。必须为 true，否则 pjax 时会连同播放一起被销毁
        // ⚠ mini 这里必须写 true，看着反直觉，但 APlayer 1.10.1 的实现就是这样：
        //   固定模式(fixed)的 HTML 模板把信息区写死成 <div class="aplayer-info"
        //   style="display: none;">，而全库唯一一处把它打开的地方是
        //     this.options.mini && (this.setMode("mini"), this.template.info.style.display = "block")
        //   也就是说 mini:false 时信息区【永远是 display:none】—— 标题、作者、
        //   进度条、时间、音量全部不渲染，只剩一个 66px 的封面方块。
        //   （这就是之前"只看到一个蓝色方块、没看到加了什么"的原因。）
        //   所以先让 mini:true 把信息区打开，构造函数返回后马上 setMode('normal')
        //   展开。mini 选项全库只被引用这一处，改完不会有别的副作用；
        //   右侧收起按钮的绑定也不依赖它（initMiniSwitcher 是无条件调用的）。
        mini: true,
        autoplay: false, // 带声音的自动播放会被浏览器拦截，开了也没用
        preload: 'none', // 这首歌本地有 5MB，不要一进站就下载
        loop: 'all',
        order: 'list',
        volume: 0.7,
        mutex: true,
        listFolded: true,
        theme: '#49b1f5',   // 与站点主色一致
        lrcType: 0,         // 没有歌词文件
        audio: TRACKS
      });

      // 接上面 mini 那段：mini:true 只负责把信息区的 display 打开，
      // 但同时也把播放器切成了收起态。这里立刻切回展开态，
      // 默认就是"封面 + 标题 + 进度条 + 音量"的完整样子。
      // 用的是 APlayer 自己的 API，所以内部的 mode 状态和右侧收起按钮是一致的：
      // 现在点收起会切到 mini，再点一下能切回来。
      player.setMode('normal');
    }

    // 在音乐页上让位给页面自带的播放器（css 里已经把它 display:none 了，
    // 但只是藏起来声音还在，所以这里主动暂停，避免两个播放器同时出声）。
    // 离开音乐页后不会自动恢复播放 —— 浏览器要求用户手势才能开始播放，
    // 自动恢复在技术上做不到，需要用户再点一次播放键。
    if (onMusicPage() && !player.paused) {
      player.pause();
    }
  }

  // 首屏
  init();

  // pjax 切换页面后兜底。容器不会被替换，正常不需要重建，
  // 但主题在 pjaxSend 时可能销毁未固定的实例，这里重查一次更稳。
  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'globalPlayerInit');
  } else {
    document.addEventListener('pjax:complete', init);
  }
})();
