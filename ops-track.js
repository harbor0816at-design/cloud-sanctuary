/*
 * ops-track.js — 海外产品统一埋点 SDK（河牌实验室 / Cloud Mecca / Cloud Sanctuary 通用）
 *
 * 用法（在页面最早的位置引入一次）：
 *   <script src="/ops-track.js"></script>
 *   <script>
 *     OpsTrack.init({
 *       product: 'mecca',                       // 'riverlab' | 'mecca' | 'sanct'
 *       supabaseUrl: 'https://smwqqiebkdaheikihbrg.supabase.co',
 *       anonKey: '<项目现有的 publishable / anon key>',
 *       getToken: () => localStorage.getItem('mecca_token'),  // 返回当前登录 token，没登录返回 null
 *     });
 *     OpsTrack.track('pricing_view', { plan: 'hajj_course' });
 *   </script>
 *
 * 自动上报：page_view（首访带 utm 来源）、engage（停留秒数）、js_error（页面报错）、带 data-track 属性的点击。
 * 注册、登录、下单、付款、续费等环节已经由数据库自动记录，前端不用再报，
 * 也报不进去（这些名字是服务端保留的）。前端只需要报“页面上看得到、数据库看不到”的动作。
 */
(function (w) {
  'use strict';
  var cfg = null, queue = [], timer = null, KEY = 'ops_anon_id', FIRST = 'ops_first_touch';

  function store(k, v) {
    try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function rid() {
    var a = new Uint8Array(12);
    (w.crypto || w.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function anonId() {
    var id = store(KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) { id = rid(); store(KEY, id); }
    return id;
  }
  function utm() {
    var q = new URLSearchParams(w.location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k).slice(0, 60); });
    if (document.referrer) { try { o.referrer = new URL(document.referrer).hostname; } catch (e) {} }
    return o;
  }
  function base() {
    return { path: w.location.pathname.slice(0, 120), lang: (navigator.language || '').slice(0, 10), w: w.innerWidth };
  }
  function flush(useBeacon) {
    if (!cfg || !queue.length) return;
    var batch = queue.splice(0, 50), token = null;
    try { token = cfg.getToken ? cfg.getToken() : null; } catch (e) {}
    var body = JSON.stringify({ p_product: cfg.product, p_anon: anonId(), p_events: batch, p_token: token || null });
    var headers = { 'Content-Type': 'application/json', apikey: cfg.anonKey };
    // 旧版 anon key 是 JWT（含两个点），需要同时放进 Authorization；新版 sb_publishable_ key 只放 apikey
    if (cfg.anonKey.split('.').length === 3) headers.Authorization = 'Bearer ' + cfg.anonKey;
    try {
      w.fetch(cfg.supabaseUrl + '/rest/v1/rpc/ops_track', {
        method: 'POST', keepalive: !!useBeacon, body: body, headers: headers,
      }).catch(function () {});
    } catch (e) {}
    if (queue.length) flush(useBeacon);
  }
  function schedule() { if (!timer) timer = setTimeout(function () { timer = null; flush(false); }, 2000); }

  function track(name, props) {
    if (!cfg) return;
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(name)) return;
    var p = Object.assign(base(), props || {});
    queue.push({ n: name, p: p });
    if (queue.length >= 20) flush(false); else schedule();
  }

  function init(c) {
    if (cfg) return;
    if (!c || !c.product || !c.supabaseUrl || !c.anonKey) { console.warn('[ops-track] 缺少 product / supabaseUrl / anonKey'); return; }
    cfg = c;
    var first = !store(FIRST);
    if (first) store(FIRST, String(Date.now()));
    track('page_view', Object.assign({ first: first }, first ? utm() : {}));
    if (c.spa !== false) {
      var push = history.pushState;
      history.pushState = function () { var r = push.apply(this, arguments); track('page_view', {}); return r; };
      w.addEventListener('popstate', function () { track('page_view', {}); });
    }
    // 停留时长：页面在前台的秒数，切到后台或关闭时上报一次
    var shown = document.visibilityState === 'visible' ? Date.now() : 0, acc = 0;
    function engage() {
      if (shown) { acc += Date.now() - shown; shown = 0; }
      var sec = Math.round(acc / 1000);
      if (sec >= 3) { track('engage', { sec: Math.min(sec, 7200) }); acc = 0; }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { engage(); flush(true); } else { shown = Date.now(); }
    });
    w.addEventListener('pagehide', function () { engage(); flush(true); });
    // 自动采集页面报错（每页最多 5 条）
    var errs = 0;
    function err(msg, where) {
      if (errs >= 5 || !msg) return; errs++;
      track('js_error', { msg: String(msg).slice(0, 200), at: String(where || '').slice(0, 120) });
    }
    w.addEventListener('error', function (e) { err(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')); });
    w.addEventListener('unhandledrejection', function (e) { var r = e.reason; err('rejection: ' + (r && r.message ? r.message : r), ''); });
    // 带 data-track 属性的元素被点击时自动上报，例如 <button data-track="pricing_view" data-track-plan="monthly">
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
      if (!el) return;
      var p = {};
      for (var k in el.dataset) if (k.indexOf('track') === 0 && k.length > 5) p[k.charAt(5).toLowerCase() + k.slice(6)] = String(el.dataset[k]).slice(0, 60);
      track(el.dataset.track, p);
    }, true);
  }

  w.OpsTrack = { init: init, track: track, flush: function () { flush(false); }, anonId: anonId };
})(window);
