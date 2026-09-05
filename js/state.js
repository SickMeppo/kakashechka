/* ---------- state ---------- */
  var KEY = 'poop_clicker_v1';
  var DEF = { coins:0, tapL:0, enL:0, autoL:0, critL:0, regenL:0, energy:100, muted:false, taps:0, sinceOpen:0, nextOpen: 20 + Math.floor(Math.random()*16), lastSeen: Date.now(), friends:0, goldOpens:0, skin:'basic', skins:['basic'], qDay:'', qTap:0, qBuy:0, qOpen:0, qCombo:0, qFood:0, qMix:0, qRecipe:0, qClaim:{}, streak:0, streakDay:'', turboUntil:0, turboDay:'', fillDay:'', foods:[], found:[], plate:[], mixId:'', mixUntil:0, cipherDay:'', cipherDone:0, naborDay:'', naborDone:0, pendingClaim:null, claimCreditSeen:0 };
  var S;
  try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch(e){ S = Object.assign({}, DEF); }
  if (!Array.isArray(S.foods)) S.foods = [];
  if (!Array.isArray(S.found)) S.found = [];
  if (!Array.isArray(S.plate)) S.plate = [];

  var CIPHER_WORDS = ['СМЫТЬ','ЗАСОР','СЛИВ','МУХА','БАЧОК','СМРАД','ПЛИТКА','ТУАЛЕТ','КЛОЗЕТ','ДВЕРКА','ВАННА','МЫЛО'];
  var CIPHER_REWARD = 1000;
  var NABOR_REWARD = 800;
  function fnv1a(s){
    var h = 2166136261;
    for (var i = 0; i < s.length; i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function cipherWord(day){
    return CIPHER_WORDS[fnv1a('c:' + day) % CIPHER_WORDS.length];
  }
  function naborFoods(day){
    var s = fnv1a('n:' + day);
    var ids = [];
    for (var i = 0; i < FOODS.length; i++) ids.push(FOODS[i].id);
    var out = [];
    for (var i = 0; i < 3; i++){
      s = (Math.imul(s, 16777619) + Math.imul(i + 1, 2654435761)) >>> 0;
      out.push(ids.splice(s % ids.length, 1)[0]);
    }
    return out;
  }
  function scrambleWord(w, day){
    var chars = w.split('');
    var s = fnv1a('s:' + day);
    for (var i = chars.length - 1; i > 0; i--){
      s = Math.imul(s, 16777619) >>> 0;
      var j = s % (i + 1);
      var t = chars[i]; chars[i] = chars[j]; chars[j] = t;
    }
    if (chars.join('') === w && chars.length > 1){ var t0 = chars[0]; chars[0] = chars[1]; chars[1] = t0; }
    return chars;
  }
  var FOODS = [
    { id:'milk', name:'Молоко', ico:'🥛', cost:40 },
    { id:'cuke', name:'Огурцы', ico:'🥒', cost:35 },
    { id:'seeds', name:'Семечки', ico:'🌻', cost:25 },
    { id:'garlic', name:'Чеснок', ico:'🧄', cost:30 },
    { id:'kefir', name:'Кефир', ico:'🍶', cost:50 },
    { id:'cola', name:'Кола', ico:'🥤', cost:55 },
    { id:'herring', name:'Селёдка', ico:'🐟', cost:90 },
    { id:'beer', name:'Пиво', ico:'🍺', cost:80 },
    { id:'pelmeni', name:'Пельмени', ico:'🥟', cost:70 },
    { id:'melon', name:'Арбуз', ico:'🍉', cost:65 },
    { id:'shashlik', name:'Шашлык', ico:'🍖', cost:140 },
    { id:'vodka', name:'Водка', ico:'🥃', cost:160 }
  ];
  var RECIPES = [
    { id:'village', a:'milk', b:'cuke', name:'Деревенский взрыв', d:'тап ×2 до утра', tap:2 },
    { id:'grandpa', a:'herring', b:'milk', name:'Закуска от деда', d:'энергия быстрее', regen:400 },
    { id:'bench', a:'beer', b:'seeds', name:'Лавочка', d:'муха +2/сек', auto:2 },
    { id:'baba', a:'kefir', b:'garlic', name:'Бабушкин курс', d:'+40 к напору', en:40 },
    { id:'dorm', a:'cola', b:'pelmeni', name:'Общага', d:'крит с тапа', crit:0.12 },
    { id:'dacha', a:'vodka', b:'melon', name:'Дачный закат', d:'чаще золотая', gold:0.20 }
  ];
  var MIX_FAIL = ['Мимо. Какашечка молчит.','Не дружит. Даже муха отвернулась.','Так себе тарелка.','Кишечник сказал нет.','Ничего. Другая пара.'];
  function foodById(id){ for (var i=0;i<FOODS.length;i++) if (FOODS[i].id===id) return FOODS[i]; return null; }
  function hasFood(id){ return (S.foods||[]).indexOf(id) >= 0; }
  function findRecipe(a,b){
    for (var i=0;i<RECIPES.length;i++){
      var r = RECIPES[i];
      if ((r.a===a && r.b===b) || (r.a===b && r.b===a)) return r;
    }
    return null;
  }

  /* формулы */
  function todayUTC(){ return new Date().toISOString().slice(0,10); }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function utcLeft(){
    var n = new Date();
    var end = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
    var s = Math.max(0, Math.floor((end - n.getTime()) / 1000));
    return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60));
  }
  function utcDayEnd(){
    var n = new Date();
    return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
  }
  function turboOn(){ return Date.now() < (S.turboUntil || 0); }
  function activeMix(){
    if (!S.mixId || Date.now() >= (S.mixUntil || 0)) return null;
    for (var i=0;i<RECIPES.length;i++) if (RECIPES[i].id === S.mixId) return RECIPES[i];
    return null;
  }
  function perTap(){
    var m = activeMix();
    return (2 + S.tapL) * (1 + 0.25 * S.friends) * (m && m.tap ? m.tap : 1);
  }
  function maxEnergy(){ return 100 + 20 * S.enL + ((activeMix() && activeMix().en) || 0); }
  function autoPerSec(){ return S.autoL + ((activeMix() && activeMix().auto) || 0); }
  function regenMs(){
    var cut = (activeMix() && activeMix().regen) || 0;
    return Math.max(400, 1500 - 80 * (S.regenL || 0) - cut);
  }
  var EVOLUTION_STAGES = [
    { index:0, min:0,   id:'crumb',  name:'Комочек', art:'img/evo-0.webp', line:'только появилась' },
    { index:1, min:3,   id:'pile',   name:'Кучка', art:'img/evo-1.webp', line:'теперь держит форму' },
    { index:2, min:12,  id:'heap',   name:'Кучища', art:'img/evo-2.webp', line:'трубы это заметили' },
    { index:3, min:30,  id:'clog',   name:'Засор', art:'img/evo-3.webp', line:'вода напряглась' },
    { index:4, min:50,  id:'tank',   name:'Хозяин бачка', art:'img/evo-4.webp', line:'бачок слушается' },
    { index:5, min:70,  id:'legend', name:'Легенда канализации', art:'img/evo-5.webp', line:'дальше только легенды' }
  ];
  function evolutionPower(st){
    st = st || S || {};
    return ['tapL','enL','autoL','critL','regenL'].reduce(function(total, key){
      var value = Number(st[key]);
      return total + (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
    }, 0);
  }
  function evolutionForPower(power){
    power = Number(power);
    if (!Number.isFinite(power) || power < 0) power = 0;
    var stage = EVOLUTION_STAGES[0];
    for (var i = 1; i < EVOLUTION_STAGES.length; i++){
      if (power < EVOLUTION_STAGES[i].min) break;
      stage = EVOLUTION_STAGES[i];
    }
    return stage;
  }
  function currentEvolution(st){ return evolutionForPower(evolutionPower(st || S)); }

  var RANKS = [
    [0, 'Засор'],
    [50, 'Запах в подъезде'],
    [200, 'Скрин в семейном чате'],
    [500, 'Репост у тёти'],
    [1500, 'Тренд в двух пабликах'],
    [5000, 'Федеральный слив'],
    [15000, 'Мем вне контроля']
  ];
  function outbreakTitle(){
    var t = S.taps || 0, name = RANKS[0][1];
    for (var i = 0; i < RANKS.length; i++) if (t >= RANKS[i][0]) name = RANKS[i][1];
    return name;
  }
  function ensureQuests(){
    var d = todayUTC();
    if (S.qDay !== d){ S.qDay = d; S.qTap=0; S.qBuy=0; S.qOpen=0; S.qCombo=0; S.qFood=0; S.qMix=0; S.qRecipe=0; S.qClaim={}; }
    if (!S.qClaim || typeof S.qClaim !== 'object') S.qClaim = {};
    if (!S.skins || !S.skins.length) S.skins = ['basic'];
  }

  var UPS = [
    { k:'tapL', cap:100, name:'Фастфуд',       icon:'food', cost:function(l){ return Math.floor(25 * Math.pow(1.6, l)); },  d:function(l){ return '+1 какоин за тап · сейчас <b>' + perTap() + '</b>'; } },
    { k:'enL', cap:50,  name:'Кишечник',      icon:'gut',  cost:function(l){ return Math.floor(50 * Math.pow(1.7, l)); },  d:function(l){ return '+20 к энергии · сейчас <b>' + maxEnergy() + '</b>'; } },
    { k:'autoL',cap:15, name:'Муха-помощник', icon:'fly',  cost:function(l){ return Math.floor(200 * Math.pow(2, l)); },  d:function(l){ return 'тапает сама · сейчас <b>' + autoPerSec() + '/сек</b>'; } },
    { k:'critL', cap:20, name:'Острое',        icon:'food', cost:function(l){ return Math.floor(80 * Math.pow(1.75, l)); }, d:function(l){ return 'шанс крита ×3 · сейчас <b>' + Math.round((0.05*S.critL)*100) + '%</b>'; } },
    { k:'regenL',cap:10, name:'Кофе',          icon:'gut',  cost:function(l){ return Math.floor(60 * Math.pow(1.8, l)); },  d:function(l){ return 'энергия наползает быстрее'; } }
  ];
  var ICONS = {
    food:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3v8a3 3 0 0 0 6 0V3"/><path d="M9 11v10"/><path d="M17 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6z"/><path d="M17 12v9"/></svg>',
    gut:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8c0-2.5 2-4 4.5-4S13 5.5 13 8s-2 3.5-2 5.5 1.5 3.5 4 3.5 4.5-1.5 4.5-4"/><path d="M4 8v5c0 3 2 5 5 5"/></svg>',
    fly:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="10" cy="14" rx="5" ry="4"/><circle cx="15.5" cy="9.5" r="2"/><path d="M15 5.5l1.2-1-.3 2.2.8.8-1.6.4"/><path d="M5 4.5Q3 6.5 5 8.5"/><path d="M8 3.5Q5.5 6 8 8.5"/></svg>'
  };

  function fmt(n){
    n = Math.floor(n);
    if (n < 1000) return String(n);
    var units = [[1e24,'Sp'],[1e21,'Sx'],[1e18,'Qi'],[1e15,'Qa'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']];
    for (var i=0;i<units.length;i++){
      if (n >= units[i][0]){
        var v = n / units[i][0];
        return (v >= 100 ? Math.floor(v) : v.toFixed(1).replace(/\.0$/,'')) + units[i][1];
      }
    }
    return String(n);
  }
