/* ---------- render ---------- */
var coinsBox = $('#coinsBox');
function levelWord(n){
  var n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'уровень';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'уровня';
  return 'уровней';
}
function announceGame(message){
  var live = $('#gameLive');
  if (live) live.textContent = message;
}
function setProgressFill(element, percent){
  if (!element) return;
  var value = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
  element.style.width = '';
  element.style.transform = 'scaleX(' + value + ')';
}
function refreshUpgradeAffordability(){
  document.querySelectorAll('#upList .buy').forEach(function(button){
    var upgrade = UPS[Number(button.dataset.i)];
    if (!upgrade) return;
    var level = S[upgrade.k] || 0;
    button.disabled = level >= upgrade.cap || S.coins < upgrade.cost(level);
  });
}
function refreshJobBadge(ready){
  if (typeof ready !== 'number'){
    ensureQuests();
    ready = 0;
    QUESTS.forEach(function(q){ if (!S.qClaim[q.id] && (S[q.key] || 0) >= q.need) ready++; });
  }
  var badge = $('#jobBadge');
  var tab = document.querySelector('.tab[data-scr="scr-job"]');
  if (badge){
    badge.hidden = ready < 1;
    badge.textContent = String(ready);
  }
  if (tab){
    tab.dataset.ready = ready ? '1' : '0';
    tab.setAttribute('aria-label', ready ? ('Дело, готово заданий: ' + ready) : 'Дело');
  }
}
function renderEvolution(){
  var power = evolutionPower(S), stage = evolutionForPower(power);
  var next = EVOLUTION_STAGES[stage.index + 1] || null;
  var left = next ? Math.max(0, next.min - power) : 0;
  var pct = next ? Math.max(0, Math.min(100, (power - stage.min) / (next.min - stage.min) * 100)) : 100;
  var wrap = $('#poopWrap'), chip = $('#evoChip'), panel = $('#evoPanel');
  if (wrap) wrap.dataset.evo = String(stage.index);
  if (chip){
    chip.setAttribute('aria-label', next
      ? ('Форма ' + stage.name + '. ' + left + ' ' + levelWord(left) + ' до ' + next.name)
      : ('Форма ' + stage.name + '. Последняя форма'));
  }
  var formN = $('#evoFormN'); if (formN) formN.textContent = (stage.index + 1) + '/' + EVOLUTION_STAGES.length;
  var name = $('#evoName'); if (name) name.textContent = stage.name;
  var chipProgress = $('#evoChipProgress'); if (chipProgress) chipProgress.textContent = next ? (power + '/' + next.min + ' ур.') : 'МАКС';
  var stageLabel = $('#evoStageLabel'); if (stageLabel) stageLabel.textContent = 'ФОРМА ' + (stage.index + 1) + ' ИЗ ' + EVOLUTION_STAGES.length;
  var panelName = $('#evoPanelName'); if (panelName) panelName.textContent = stage.name;
  var panelHint = $('#evoPanelHint');
  if (panelHint) panelHint.textContent = next ? (left + ' ' + levelWord(left) + ' до ' + next.name) : 'последняя форма';
  var track = $('#evoTrack');
  if (track){
    track.setAttribute('aria-valuemin', String(next ? stage.min : 0));
    track.setAttribute('aria-valuemax', String(next ? next.min : stage.min));
    track.setAttribute('aria-valuenow', String(next ? power : stage.min));
    track.setAttribute('aria-valuetext', next
      ? (stage.name + '. ' + left + ' ' + levelWord(left) + ' до ' + next.name)
      : (stage.name + '. Последняя форма'));
  }
  setProgressFill($('#evoTrackFill'), pct);
  var thumb = $('#evoThumb'); if (thumb && thumb.getAttribute('src') !== stage.art) thumb.src = stage.art;
  var btn = poop || $('#poop');
  if (btn) btn.setAttribute('aria-label', 'Тапнуть по какашечке. Форма: ' + stage.name);
  if (panel) panel.dataset.evo = String(stage.index);
}
function renderFast(){
    $('#coinsVal').textContent = fmt(S.coins);
    $('#perTap').textContent = '+' + fmt(Math.round(perTap() * (turboOn() ? 2 : 1)));
    $('#cps').textContent = fmt(autoPerSec());
    var ot = $('#outbreakTitle'); if (ot) ot.textContent = outbreakTitle();
    var drt = $('#dailyRewardT'); if (drt) drt.textContent = 'авто';
    var mx = activeMix();
    var mh = $('#mixHud'), mhn = $('#mixHudN'), dct = $('#dailyComboT');
    if (mh){
      mh.style.display = mx ? '' : 'none';
      if (mhn) mhn.textContent = mx ? mx.name : '';
    }
    if (dct){
      if (pendingClaim('nabor')) dct.textContent = 'проверяем';
      else if (S.naborDay === todayUTC() && S.naborDone) dct.textContent = 'готово';
      else {
        var nb = naborFoods(todayUTC()), haveN = 0;
        for (var ni = 0; ni < nb.length; ni++) if (hasFood(nb[ni])) haveN++;
        dct.textContent = haveN + '/3';
      }
    }
    var dct2 = $('#dailyCipherT');
    if (dct2){
      if (pendingClaim('cipher')) dct2.textContent = 'проверяем';
      else dct2.textContent = (S.cipherDay === todayUTC() && S.cipherDone) ? 'готово' : utcLeft();
    }
    var tb = $('#boostTurbo'), tl = $('#turboLeft');
    if (tb){
      var tOn = turboOn();
      tb.classList.toggle('on', tOn);
      tb.disabled = !tOn && S.turboDay === todayUTC();
      if (tl){
        if (tOn) tl.textContent = Math.max(1, Math.ceil((S.turboUntil - Date.now()) / 1000)) + 'с';
        else tl.textContent = (S.turboDay === todayUTC()) ? 'завтра' : '1/день';
      }
    }
    var fb = $('#boostFill'), fl = $('#fillLeft');
    if (fb){
      var used = S.fillDay === todayUTC();
      var full = S.energy >= maxEnergy();
      fb.disabled = used || full;
      if (fl){
        if (used) fl.textContent = 'завтра';
        else if (full) fl.textContent = 'энергия полная';
        else fl.textContent = '+' + Math.max(0, Math.ceil(maxEnergy() - S.energy)) + ' энергии';
      }
    }
    var max = maxEnergy();
    var pct = Math.max(0, Math.min(100, S.energy / max * 100));
    var fill = $('#energyFill');
    setProgressFill(fill, pct);
    fill.className = pct < 22 ? 'low' : '';
    $('#energyTxt').textContent = Math.floor(S.energy) + '/' + max;
    var meter = document.querySelector('.energy');
    if (meter){
      meter.setAttribute('aria-valuemax', String(max));
      meter.setAttribute('aria-valuenow', String(Math.floor(S.energy)));
      meter.setAttribute('aria-valuetext', Math.floor(S.energy) + ' из ' + max);
    }

    renderEvolution();
    renderNextGoal();
    applySkinClass();
    refreshUpgradeAffordability();
    refreshJobBadge();
  }
  function render(){
    renderFast();
    var html = '';
    for (var i=0;i<UPS.length;i++){
      var u = UPS[i], l = S[u.k], capped = l >= u.cap;
      var c = u.cost(l);
      var buyLabel = capped
        ? ('Максимум: ' + u.name + ', уровень ' + l)
        : ('Купить ' + u.name + ' за ' + fmt(c) + ' какоинов, уровень ' + l);
      html += '<div class="uprow">'
        + '<div class="upico">' + ICONS[u.icon] + '</div>'
        + '<div class="upmid"><div class="t">' + u.name + '</div><div class="d">' + u.d(l) + '</div></div>'
        + '<button class="buy" data-i="' + i + '" aria-label="' + buyLabel + '" ' + ((capped || S.coins < c) ? 'disabled' : '') + '>'
        + '<span class="cost">' + (capped ? 'МАКС' : fmt(c)) + '</span>'
        + '<span class="lvl">ур. ' + l + '</span></button></div>';
    }
    $('#upList').innerHTML = html;
    $('#friendsN').textContent = S.friends;
    $('#refLink').textContent = refLink();
    var emp = $('#squadEmpty');
    if (emp) emp.style.display = S.friends > 0 ? 'none' : '';
    renderJobs();
  }
  var QUESTS = [
    { id:'tap', name:'Тапни 80 раз', need:80, key:'qTap', rew:100 },
    { id:'food', name:'Купи еду в холодильник', need:1, key:'qFood', rew:70 },
    { id:'open', name:'Вырасти какашку', need:1, key:'qOpen', rew:120 },
    { id:'mix', name:'Смешай два на тарелке', need:1, key:'qMix', rew:80 },
    { id:'recipe', name:'Собери секретный набор', need:1, key:'qRecipe', rew:200 }
  ];
  var SKIN_ART = {
    basic:'img/basic.webp', gold:'img/gold.webp', spicy:'img/spicy.webp',
    sleepy:'img/sleepy.webp', fly:'img/fly.webp'
  };
  var HIT_ART = {
    basic:'img/basic-hit.webp', gold:'img/gold-hit.webp', spicy:'img/spicy-hit.webp',
    sleepy:'img/sleepy-hit.webp', fly:'img/fly-hit.webp'
  };
  var SKINS = [
    { id:'basic', name:'Обычная', how:'сразу', ok:function(){ return true; } },
    { id:'gold', name:'Золотая', how:'1 золотая', ok:function(){ return (S.goldOpens||0) >= 1; } },
    { id:'spicy', name:'Острая', how:'Фастфуд ур.3', ok:function(){ return S.tapL >= 3; } },
    { id:'sleepy', name:'Сонная', how:'100 тапов', ok:function(){ return S.taps >= 100; } },
    { id:'fly', name:'Мушиная', how:'муха ур.1', ok:function(){ return S.autoL >= 1; } }
  ];
  function unlockSkins(){
    SKINS.forEach(function(sk){
      if (sk.ok() && S.skins.indexOf(sk.id) < 0) S.skins.push(sk.id);
    });
  }
  function applySkinClass(){
    var art = $('#poopArt');
    if (!art) return;
    var btn = poop || $('#poop');
    var wrap = poopWrap || $('#poopWrap');
    var id = S.skin || 'basic';
    if (btn && btn.classList.contains('off') && id === 'basic') id = 'sleepy';
    var hitting = btn && btn.classList.contains('hit');
    var src = id === 'basic'
      ? currentEvolution().art
      : ((hitting && HIT_ART[id]) ? HIT_ART[id] : (SKIN_ART[id] || currentEvolution().art));
    if (art.getAttribute('src') !== src) art.src = src;
    if (wrap) wrap.classList.toggle('empty', !!(btn && btn.classList.contains('off')));
  }
  function renderJobs(){
    ensureQuests();
    unlockSkins();
    var sn = $('#streakN'); if (sn) sn.textContent = S.streak || 0;
    var ql = $('#questList'), ready = 0;
    if (ql){
      var h = '';
      for (var i=0;i<QUESTS.length;i++){
        var q = QUESTS[i], have = S[q.key] || 0, done = have >= q.need, claimed = !!S.qClaim[q.id];
        if (done && !claimed) ready++;
        var lab = claimed ? 'ОК' : done ? ('+'+q.rew) : (Math.min(have,q.need)+'/'+q.need);
        var claimLabel = claimed
          ? ('Получено: ' + q.name + ', ' + q.rew + ' какоинов')
          : done
            ? ('Забрать награду: ' + q.name + ', ' + q.rew + ' какоинов')
            : (q.name + ': ' + Math.min(have,q.need) + ' из ' + q.need + ', награда ' + q.rew + ' какоинов');
        h += '<div class="qrow"><div style="flex:1"><div class="t">'+q.name+'</div><div class="d">за это <b>'+q.rew+'</b></div></div>'
          + '<button class="claim" data-q="'+q.id+'" aria-label="'+claimLabel+'" '+(claimed||!done?'disabled':'')+'>'+lab+'</button></div>';
      }
      ql.innerHTML = h;
      var qr = $('#questReady');
      if (qr) qr.textContent = ready ? (ready + ' готово') : 'нет готовых';
    }
    refreshJobBadge(ready);
    var sg = $('#skinGrid');
    if (sg){
      var hs = '';
      SKINS.forEach(function(sk){
        var own = S.skins.indexOf(sk.id) >= 0;
        var selected = S.skin === sk.id;
        var preview = sk.id === 'basic' ? currentEvolution().art : (SKIN_ART[sk.id] || currentEvolution().art);
        hs += '<button class="skin'+(selected?' on':'')+'" data-skin="'+sk.id+'" aria-pressed="'+(selected?'true':'false')+'" '+(own?'':'disabled')+'>'
          + (own ? '<img src="'+preview+'" alt="" loading="lazy">' : '<span class="skinlock">?</span>')
          + '<span class="skinlab">'+sk.name+'<small>'+(selected?'выбрано':(own?'Выбрать':sk.how))+'</small></span></button>';
      });
      sg.innerHTML = hs;
    }
    renderFridge();
  }
  function renderFridge(){
    var fr = $('#fridge');
    if (fr){
      var hf = '';
      for (var i=0;i<FOODS.length;i++){
        var f = FOODS[i], own = hasFood(f.id), onp = (S.plate||[]).indexOf(f.id)>=0;
        hf += '<div class="food'+(own?' have':'')+(onp?' on':'')+'" data-food="'+f.id+'">'
          + '<span class="fico" aria-hidden="true">'+f.name.slice(0,1)+'</span>'
          + '<span class="foodname">'+f.name+'</span>'
          + (own
            ? '<button type="button" class="food-pick" data-food="'+f.id+'" aria-label="'+(onp?'Убрать с тарелки: ':'Выбрать на тарелку: ')+f.name+'">'+(onp?'Убрать':'Выбрать')+'</button>'
            : '<button type="button" class="food-buy" data-food="'+f.id+'" aria-label="Купить '+f.name+' за '+f.cost+' какоинов">Купить <b>'+fmt(f.cost)+'</b></button>')
          + '</div>';
      }
      fr.innerHTML = hf;
    }
    var p = S.plate || [];
    function slotHtml(i){
      var el = document.getElementById('slot'+i); if (!el) return;
      var f = p[i] ? foodById(p[i]) : null;
      el.textContent = f ? f.name : 'пусто';
      el.classList.toggle('full', !!f);
      el.disabled = !f;
      el.setAttribute('aria-label', f ? ('Убрать с тарелки: ' + f.name) : 'Пустой слот');
    }
    slotHtml(0); slotHtml(1);
    var mb = $('#mixBtn'); if (mb) mb.disabled = p.length !== 2;
    var st = $('#mixStatus');
    if (st){
      var am = activeMix();
      if (am) st.textContent = am.name + ' · до утра';
      else if (p.length === 0) st.textContent = 'Выбери два продукта';
      else if (p.length === 1) st.textContent = 'Ещё один продукт';
      else st.textContent = 'Можно смешать';
    }
    var rl = $('#recipeList');
    if (rl){
      var hr = '';
      for (var j=0;j<RECIPES.length;j++){
        var rec = RECIPES[j], known = (S.found||[]).indexOf(rec.id)>=0;
        var live = !!(activeMix() && activeMix().id === rec.id);
        var fa = foodById(rec.a), fb = foodById(rec.b);
        hr += '<div class="recipe'+(live?' on':'')+'"><div class="t">'+(known ? rec.name : '???')+'</div>'
          + '<div class="d">'+(known ? ((fa?fa.name:'?')+' + '+(fb?fb.name:'?')+' · '+rec.d) : 'ещё не смешали')+'</div></div>';
      }
      rl.innerHTML = hr;
      var rf = $('#recipeFound');
      if (rf) rf.textContent = (S.found || []).length + ' из ' + RECIPES.length;
    }
  }
  function readyQuest(){
    ensureQuests();
    for (var i = 0; i < QUESTS.length; i++){
      var q = QUESTS[i];
      if (!S.qClaim[q.id] && (S[q.key] || 0) >= q.need) return q;
    }
    return null;
  }
  function renderNextGoal(){
    var root = $('#nextGoal'), label = $('#nextGoalLabel'), value = $('#nextGoalValue');
    var bar = $('#nextGoalFill'), action = $('#nextGoalAction');
    if (!root || !label || !value || !bar || !action) return;
    var max = maxEnergy();
    if (Math.floor(S.energy) < 1){
      var fillReady = S.fillDay !== todayUTC();
      var left = Math.max(1, Math.ceil((regenMs() - (window.__regenT || 0)) / 1000));
      label.textContent = fillReady ? 'Кишечник пуст' : ('1 энергия через ' + left + ' с');
      value.textContent = fillReady ? 'Напор вернёт ' + max : 'потом можно тапать';
      setProgressFill(bar, 0);
      action.textContent = fillReady ? 'Показать Напор' : 'Подожди';
      action.dataset.action = fillReady ? 'focus-fill' : 'wait';
      action.disabled = !fillReady;
      return;
    }
    var q = readyQuest();
    if (q){
      label.textContent = 'Задание готово';
      value.textContent = q.name + ' · +' + q.rew;
      setProgressFill(bar, 100);
      action.textContent = 'Забрать';
      action.dataset.action = 'job';
      action.disabled = false;
      return;
    }
    var stage = currentEvolution(), power = evolutionPower(S);
    var nextStage = EVOLUTION_STAGES[stage.index + 1] || null;
    var stageProgress = nextStage ? (power - stage.min) / (nextStage.min - stage.min) : 0;
    if (nextStage && (stageProgress >= .7 || nextStage.min - power === 1)){
      var levelsLeft = Math.max(0, nextStage.min - power);
      label.textContent = 'До новой формы — ' + levelsLeft + ' ' + levelWord(levelsLeft);
      value.textContent = nextStage.name + ' · ' + power + ' из ' + nextStage.min;
      setProgressFill(bar, stageProgress * 100);
      action.textContent = 'Прокачка';
      action.dataset.action = 'up';
      action.disabled = false;
      return;
    }
    var best = null;
    for (var i = 0; i < UPS.length; i++){
      var u = UPS[i], lvl = S[u.k] || 0;
      if (lvl >= u.cap) continue;
      var cost = u.cost(lvl), miss = Math.max(0, cost - S.coins);
      if (!best || miss < best.miss || (miss === best.miss && cost < best.cost)) best = { u:u, cost:cost, miss:miss };
    }
    if (!best){
      label.textContent = 'Всё прокачано';
      value.textContent = 'какашечка легендарна';
      setProgressFill(bar, 100);
      action.textContent = 'Прокачка';
      action.dataset.action = 'up';
      action.disabled = false;
      return;
    }
    label.textContent = best.miss ? ('Ещё ' + fmt(best.miss) + ' до ' + best.u.name) : (best.u.name + ' доступен');
    value.textContent = fmt(Math.min(S.coins, best.cost)) + ' из ' + fmt(best.cost);
    setProgressFill(bar, S.coins / best.cost * 100);
    action.textContent = best.miss ? 'Прокачка' : 'Прокачать';
    action.dataset.action = 'up';
    action.disabled = false;
  }
  function bumpCoins(){
    coinsBox.classList.remove('bump'); void coinsBox.offsetWidth; coinsBox.classList.add('bump');
  }

  /* ---------- fx ---------- */
  var fx = $('#fx');
  var FX_LIMIT = 48;
  function appendFx(element){
    fx.appendChild(element);
    while (fx.children.length > FX_LIMIT) fx.firstChild.remove();
  }
  function flyText(x, y, txt){
    var el = document.createElement('div');
    el.className = 'fly'; el.textContent = txt;
    el.style.left = (x - 14) + 'px'; el.style.top = (y - 20) + 'px';
    appendFx(el);
    setTimeout(function(){ el.remove(); }, 800);
    return el;
  }
  function coinBurst(x, y, n){
    for (var i=0;i<n;i++){
      var el = document.createElement('div');
      el.className = 'coinp';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dx', (Math.random()*130 - 65) + 'px');
      el.style.setProperty('--dy', (-60 - Math.random()*85) + 'px');
      appendFx(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 700); })(el);
    }
  }
  function shockwave(x, y){
    var el = document.createElement('div');
    el.className = 'wave';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    appendFx(el);
    setTimeout(function(){ el.remove(); }, 500);
  }
  function sparkBurst(x, y, n){
    for (var i=0;i<n;i++){
      var el = document.createElement('div'), a = Math.PI * 2 * (i / n) + Math.random();
      var d = 34 + Math.random()*40;
      el.className = 'spark';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dx', Math.cos(a)*d + 'px');
      el.style.setProperty('--dy', Math.sin(a)*d + 'px');
      appendFx(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 600); })(el);
    }
  }
  function splatBurst(x, y, n){
    for (var i=0;i<n;i++){
      var el = document.createElement('div');
      el.className = 'splat';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dx', (Math.random()*90 - 45) + 'px');
      el.style.setProperty('--dy', (18 + Math.random()*72) + 'px');
      appendFx(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 750); })(el);
    }
  }
  function starBurst(x, y, n){
    for (var i=0;i<n;i++){
      var el = document.createElement('div'), a = Math.PI * 2 * (i / n) + Math.random();
      var d = 42 + Math.random()*52;
      el.className = 'starbit';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dx', Math.cos(a)*d + 'px');
      el.style.setProperty('--dy', Math.sin(a)*d + 'px');
      appendFx(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 650); })(el);
    }
  }
