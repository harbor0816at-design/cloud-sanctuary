/* 最后的晚餐 · 我们聊会儿天
 * 一个小场景：玩家坐在桌边，通过选项与人物对话；点开人物可看他在福音书里说过的话。
 * 所有台词都来自福音书（和合本 / KJV 意译），标注出处，不由 AI 生成。
 * 结束时派发 'supper:end' 事件，detail.choice 为 pray | confess | sit | leave。
 * 入口：window.SupperScene.open()，或访问 ?scene=supper
 */
(function () {
  'use strict';

  var LANG = window.SANCT_LANG === 'zh' ? 'zh' : 'en'; // 其余语言暂回退英文

  var TX = {
    en: {
      title: 'The Last Supper', sub: 'Let’s talk a while',
      pick: 'Choose what to say', leave: 'Leave the room', cont: 'Continue',
      all: 'What everyone said', back: 'Back to the conversation', tapHint: 'Tap a person to hear what they said.',
      allLabel: 'The disciples'
    },
    zh: {
      title: '最后的晚餐', sub: '我们聊会儿天',
      pick: '选一句你想说的话', leave: '离开房间', cont: '继续',
      all: '大家都说了什么', back: '回到对话', tapHint: '点一点人物，看他说过什么。',
      allLabel: '众门徒'
    }
  };

  var NAME = {
    lord: { en: 'Jesus', zh: '耶稣' },
    peter: { en: 'Peter', zh: '彼得' },
    john: { en: 'John', zh: '约翰' },
    judas: { en: 'Judas', zh: '犹大' },
    thomas: { en: 'Thomas', zh: '多马' },
    philip: { en: 'Philip', zh: '腓力' },
    andrew: { en: 'Andrew', zh: '安德烈' },
    all: { en: 'The disciples', zh: '众门徒' }
  };

  // 座位：耶稣居中，门徒分列两侧。每个座位对应 id。
  var SEATS = [
    [190, 'andrew', false], [255, 'judas', false], [320, 'thomas', false],
    [400, 'lord', true],
    [480, 'peter', false], [545, 'john', false], [610, 'philip', false]
  ];

  // 福音书中的台词，按出处顺序。who 为 all 表示众门徒同说。
  var LINES = [
    { who: 'lord', en: 'One of you shall betray me.', zh: '你们中间有一个人要卖我。', ref: 'Matthew 26:21' },
    { who: 'all', en: 'Lord, is it I?', zh: '主，是我吗？', ref: 'Matthew 26:22' },
    { who: 'judas', en: 'Master, is it I?', zh: '拉比，是我吗？', ref: 'Matthew 26:25' },
    { who: 'lord', en: 'Thou hast said.', zh: '你说的是。', ref: 'Matthew 26:25' },
    { who: 'peter', en: 'Thou shalt never wash my feet.', zh: '你永不可洗我的脚！', ref: 'John 13:8' },
    { who: 'lord', en: 'If I wash thee not, thou hast no part with me.', zh: '我若不洗你，你就与我无分了。', ref: 'John 13:8' },
    { who: 'peter', en: 'Lord, not my feet only, but also my hands and my head.', zh: '主啊，不但我的脚，连手和头也要洗！', ref: 'John 13:9' },
    { who: 'john', en: 'Lord, who is it?', zh: '主啊，是谁呢？', ref: 'John 13:25' },
    { who: 'peter', en: 'Though all men shall be offended because of thee, yet will I never be offended.', zh: '众人为你跌倒，我却永不跌倒。', ref: 'Matthew 26:33' },
    { who: 'all', en: 'Though I should die with thee, yet will I not deny thee.', zh: '我就是必须与你同死，也不能不认你。', ref: 'Matthew 26:35' },
    { who: 'lord', en: 'Let not your heart be troubled. You believe in God; believe also in me.', zh: '你们心里不要忧愁，你们信神，也当信我。', ref: 'John 14:1' },
    { who: 'thomas', en: 'Lord, we know not whither thou goest; and how can we know the way?', zh: '主啊，我们不知道你往哪里去，怎么能知道路呢？', ref: 'John 14:5' },
    { who: 'lord', en: 'I am the way, the truth, and the life.', zh: '我就是道路、真理、生命。', ref: 'John 14:6' },
    { who: 'philip', en: 'Lord, shew us the Father, and it sufficeth us.', zh: '主啊，求你把父指示我们，我们就彀了。', ref: 'John 14:8' },
    { who: 'lord', en: 'Peace I leave with you, my peace I give unto you.', zh: '我留下平安给你们，我将我的平安赐给你们。', ref: 'John 14:27' }
  ];

  // 对话节点。say 为台词（who: lord | thomas | null 为旁白），next 自动继续，
  // ask 为玩家选项（go 跳转，end 结束场景）。
  var N = {
    start: {
      who: null,
      say: { en: 'Peace to you. I have wanted very much to share this meal with you.',
             zh: '愿平安与你们同在。这顿饭，我心里很想和你们一起吃。' },
      next: 'ask'
    },
    ask: {
      who: null, say: null,
      ask: [
        { t: { en: 'Lord, my heart is troubled.', zh: '主啊，我心里很乱。' }, go: 'troubled' },
        { t: { en: 'I am afraid of what is coming.', zh: '我害怕将要发生的事。' }, go: 'afraid' },
        { t: { en: 'I do not know the way.', zh: '我不知道该往哪里走。' }, go: 'way' }
      ]
    },
    troubled: {
      who: 'lord',
      say: { en: 'Let not your heart be troubled. You believe in God; believe also in me.',
             zh: '你们心里不要忧愁，你们信神，也当信我。' },
      next: 'close'
    },
    afraid: {
      who: 'lord',
      say: { en: 'Peace I leave with you. My peace I give unto you, not as the world gives.',
             zh: '我留下平安给你们，我将我的平安赐给你们。我所赐的，不是世人所赐的。' },
      next: 'close'
    },
    way: {
      who: 'thomas',
      say: { en: 'Lord, we do not know where you are going. How can we know the way?',
             zh: '主啊，我们不知道你往哪里去，怎么能知道路呢？' },
      next: 'way2'
    },
    way2: {
      who: 'lord',
      say: { en: 'I am the way, the truth, and the life. No one comes to the Father except through me.',
             zh: '我就是道路、真理、生命。若不藉着我，没有人能到父那里去。' },
      next: 'close'
    },
    close: {
      who: null,
      say: { en: 'The room is quiet. What would you like to do before you go?',
             zh: '屋里很安静。离开之前，你想做什么？' },
      ask: [
        { t: { en: 'Pray together', zh: '一起祷告' }, end: 'pray' },
        { t: { en: 'Make a confession', zh: '做一次忏悔' }, end: 'confess' },
        { t: { en: 'Sit in silence', zh: '安静地坐一会儿' }, end: 'sit' }
      ]
    }
  };

  var cur = null;
  var STYLE_ID = 'supper-style';

  function css() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '#supper{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;color:#f3e6cf;' +
      'background:radial-gradient(ellipse at 50% 25%,#3a2615 0%,#140d08 70%);font-family:inherit}' +
      '#supper .sh{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 18px}' +
      '#supper .sh b{font-size:17px;letter-spacing:.04em}#supper .sh span{display:block;font-size:12px;opacity:.7;margin-top:2px}' +
      '#supper .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
      '#supper .sx{background:none;border:1px solid #8a6a3e;color:#f3e6cf;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}' +
      '#supper .stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 8px}' +
      '#supper svg{width:100%;max-width:820px;height:auto}' +
      '#supper .sf{opacity:.5;transition:opacity .35s;cursor:pointer}#supper .sf.on{opacity:1}' +
      '#supper .sf:focus-visible{outline:none;opacity:1}' +
      '#supper .talk{padding:14px 18px 22px;background:rgba(20,13,8,.85);border-top:1px solid #4a3420;min-height:150px;max-height:42vh;overflow:auto}' +
      '#supper .who{font-size:13px;color:#e8c26a;min-height:18px;margin-bottom:6px}' +
      '#supper .line{font-size:16px;line-height:1.6;margin:0 0 12px}' +
      '#supper .ln{margin-bottom:10px}#supper .ln b{color:#e8c26a;font-weight:600;margin-right:6px}' +
      '#supper .ln i{display:block;font-size:12px;opacity:.6;font-style:normal;margin-top:2px}' +
      '#supper .opts{display:flex;flex-direction:column;gap:8px}' +
      '#supper .opt,#supper .cont{background:#2a1c10;border:1px solid #6b4f2a;color:#f3e6cf;border-radius:10px;' +
      'padding:10px 14px;font-size:15px;text-align:left;cursor:pointer}' +
      '#supper .opt:hover,#supper .cont:hover,#supper .opt:focus-visible,#supper .cont:focus-visible{border-color:#e8c26a;outline:none}' +
      '#supper .cont{align-self:flex-end;width:auto}';
    document.head.appendChild(s);
  }

  function figure(x, id, lord) {
    var s = lord ? 1.25 : 0.9;
    var robes = { lord: '#f1ead8', judas: '#4a3a4a', peter: '#7a2e2e', john: '#2e4a6b',
                  thomas: '#5b4a2a', philip: '#3e5a3a', andrew: '#6b3f5e' };
    var robe = robes[id] || '#4a4a6b';
    var y = lord ? 100 : 120;
    var h = 110 * s;
    var d = 'M' + (x - 22 * s) + ' ' + (y + h) +
      ' Q' + (x - 24 * s) + ' ' + (y + 40 * s) + ' ' + (x - 12 * s) + ' ' + (y + 22 * s) +
      ' L' + (x + 12 * s) + ' ' + (y + 22 * s) +
      ' Q' + (x + 24 * s) + ' ' + (y + 40 * s) + ' ' + (x + 22 * s) + ' ' + (y + h) + ' Z';
    var halo = lord
      ? '<circle cx="' + x + '" cy="' + (y - 2 * s) + '" r="' + (19 * s) + '" fill="none" stroke="#e8c26a" stroke-width="2" opacity=".9"/>'
      : '';
    return '<g class="sf" data-f="' + id + '" role="button" tabindex="0" aria-label="' + NAME[id][LANG] + '">' +
      '<path d="' + d + '" fill="' + robe + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (10 * s) + '" fill="#e9c9a0"/>' + halo + '</g>';
  }

  function sceneSVG() {
    var g = '';
    SEATS.forEach(function (p) { g += figure(p[0], p[1], p[2]); });
    return '<svg viewBox="0 0 800 380" role="img" aria-label="' + (LANG === 'zh' ? '最后的晚餐场景' : 'Scene of the Last Supper') + '">' +
      '<defs><radialGradient id="sg" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".55"/>' +
      '<stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="800" height="380" fill="#1a120c"/>' +
      '<path d="M300 0 L500 0 L500 60 Q400 20 300 60 Z" fill="#2c1f14"/>' +
      '<ellipse cx="400" cy="120" rx="330" ry="180" fill="url(#sg)"/>' +
      g +
      '<rect x="110" y="230" width="580" height="22" rx="4" fill="#5a3a22"/>' +
      '<rect x="100" y="250" width="600" height="110" fill="#2a1a0e"/>' +
      '<path d="M120 252 L680 252 L680 270 L120 270 Z" fill="#8c2f2f" opacity=".85"/>' +
      '</svg>';
  }

  function build() {
    var t = TX[LANG];
    var el = document.createElement('div');
    el.id = 'supper';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t.title);
    el.innerHTML =
      '<div class="sh"><div><b>' + t.title + '</b><span>' + t.sub + '</span></div>' +
      '<div class="acts"><button class="sx" type="button" data-act="all">' + t.all + '</button>' +
      '<button class="sx" type="button" data-act="leave">' + t.leave + '</button></div></div>' +
      '<div class="stage">' + sceneSVG() + '</div>' +
      '<div class="talk"><div class="who"></div><div class="line"></div><div class="opts"></div></div>';

    el.querySelector('[data-act="leave"]').onclick = function () { finish('leave'); };
    el.querySelector('[data-act="all"]').onclick = function () { panel('all'); };

    var fs = el.querySelectorAll('.sf');
    for (var i = 0; i < fs.length; i++) {
      (function (g) {
        var id = g.getAttribute('data-f');
        g.onclick = function () { panel(id); };
        g.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel(id); } };
      })(fs[i]);
    }
    document.body.appendChild(el);
    return el;
  }

  function setSpeaker(id) {
    var el = document.getElementById('supper');
    if (!el) return;
    var fs = el.querySelectorAll('.sf');
    for (var i = 0; i < fs.length; i++) {
      fs[i].classList.toggle('on', !id || fs[i].getAttribute('data-f') === id);
    }
  }

  function backButton(opts) {
    var t = TX[LANG];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cont';
    b.textContent = t.back;
    b.onclick = function () { show(cur); };
    opts.appendChild(b);
    b.focus();
  }

  // 点开人物或“大家都说了什么”时，在对话框里列出台词
  function panel(id) {
    var el = document.getElementById('supper');
    if (!el) return;
    var t = TX[LANG];
    var items = id === 'all'
      ? LINES
      : LINES.filter(function (l) { return l.who === id; });
    if (id !== 'all' && !items.length) return;

    var who = el.querySelector('.who');
    var line = el.querySelector('.line');
    var opts = el.querySelector('.opts');
    who.textContent = id === 'all' ? t.allLabel : NAME[id][LANG];
    line.textContent = '';
    opts.innerHTML = '';
    items.forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'ln';
      var n = document.createElement('b');
      n.textContent = NAME[l.who][LANG];
      var s = document.createElement('span');
      s.textContent = l[LANG];
      var r = document.createElement('i');
      r.textContent = l.ref;
      row.appendChild(n);
      row.appendChild(s);
      row.appendChild(r);
      line.appendChild(row);
    });
    setSpeaker(id === 'all' ? null : id);
    backButton(opts);
  }

  function show(id) {
    var el = document.getElementById('supper');
    if (!el) return;
    var t = TX[LANG];
    var n = N[id];
    cur = id;
    var who = el.querySelector('.who');
    var line = el.querySelector('.line');
    var opts = el.querySelector('.opts');
    opts.innerHTML = '';

    if (n.say) {
      who.textContent = n.who ? NAME[n.who][LANG] : '';
      line.textContent = n.say[LANG];
      setSpeaker(n.who || null);
    } else {
      who.textContent = '';
      line.textContent = n.ask ? t.pick : '';
      setSpeaker(null);
    }

    if (n.ask) {
      n.ask.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.textContent = o.t[LANG];
        b.onclick = function () { o.end ? finish(o.end) : show(o.go); };
        opts.appendChild(b);
      });
      var first = opts.querySelector('button');
      if (first) first.focus();
    } else if (n.next) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'cont';
      c.textContent = t.cont;
      c.onclick = function () { show(n.next); };
      opts.appendChild(c);
      c.focus();
    }
  }

  function finish(choice) {
    var el = document.getElementById('supper');
    if (el) el.remove();
    cur = null;
    document.removeEventListener('keydown', onKey);
    window.dispatchEvent(new CustomEvent('supper:end', { detail: { choice: choice } }));
  }

  function onKey(e) {
    if (e.key === 'Escape') finish('leave');
  }

  function open() {
    if (document.getElementById('supper')) return;
    css();
    build();
    show('start');
    document.addEventListener('keydown', onKey);
  }

  window.SupperScene = { open: open };

  // 场景结束后接入现有功能：祷告走免费的祷告页，忏悔走原有的付费忏悔流程
  window.addEventListener('supper:end', function (e) {
    var c = e.detail && e.detail.choice;
    setTimeout(function () {
      if (c === 'pray' && typeof openPrayer === 'function') openPrayer();
      else if (c === 'confess' && typeof openConfessIntro === 'function') openConfessIntro();
    }, 250);
  });

  // 在首页功能格子里加入口（标题随语言切换，其余语言回退英文）
  function addTile() {
    var tiles = document.querySelector('#intro .tiles');
    if (!tiles || tiles.querySelector('[data-supper]')) return;
    var t = TX[LANG];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.setAttribute('data-supper', '');
    var ic = document.createElement('b');
    ic.textContent = '🍞';
    var st = document.createElement('strong');
    st.textContent = t.title;
    var sm = document.createElement('small');
    sm.textContent = t.sub;
    b.appendChild(ic);
    b.appendChild(st);
    b.appendChild(sm);
    b.onclick = function () { open(); };
    tiles.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addTile);
  else addTile();

  // 直接访问 ?scene=supper 时自动打开
  if (/[?&]scene=supper\b/.test(location.search)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open);
    else open();
  }
})();
