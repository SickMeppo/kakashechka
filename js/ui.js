/* ---------- render ---------- */
  var coinsBox = $('#coinsBox');
  function render(){
    $('#coinsVal').textContent = fmt(S.coins);
    $('#perTap').textContent = '+' + fmt(Math.round(perTap() * (turboOn() ? 2 : 1)));
    $('#cps').textContent = fmt(autoPerSec());
    var ot = $('#outbreakTitle'); if (ot) ot.textContent = outbreakTitle();
    var drt = $('#dailyRewardT'); if (drt) drt.textContent = utcLeft();
    var mx = activeMix();
    var mh = $('#mixHud'), mhn = $('#mixHudN'), dct = $('#dailyComboT');
    if (mh){
      mh.style.display = mx ? '' : 'none';
      if (mhn) mhn.textContent = mx ? mx.name : '';
    }
    if (dct) dct.textContent = mx ? mx.name.split(' ')[0] : 'смешай';
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
      fb.disabled = used;
      if (fl) fl.textContent = used ? 'завтра' : 'фулл энергия';
    }
    var max = maxEnergy();
    var pct = Math.max(0, Math.min(100, S.energy / max * 100));
    var fill = $('#energyFill');
    fill.style.width = pct + '%';
    fill.className = pct < 22 ? 'low' : '';
    $('#energyTxt').textContent = Math.floor(S.energy) + '/' + max;

    var html = '';
    for (var i=0;i<UPS.length;i++){
      var u = UPS[i], l = S[u.k], capped = l >= u.cap;
      var c = u.cost(l);
      html += '<div class="uprow">'
        + '<div class="upico">' + ICONS[u.icon] + '</div>'
        + '<div class="upmid"><div class="t">' + u.name + '</div><div class="d">' + u.d(l) + '</div></div>'
        + '<button class="buy" data-i="' + i + '" ' + ((capped || S.coins < c) ? 'disabled' : '') + '>'
        + '<span class="cost">' + (capped ? 'МАКС' : fmt(c)) + '</span>'
        + '<span class="lvl">ур. ' + l + '</span></button></div>';
    }
    $('#upList').innerHTML = html;
    $('#friendsN').textContent = S.friends;
    $('#refLink').textContent = refLink();
    var emp = $('#squadEmpty');
    if (emp) emp.style.display = S.friends > 0 ? 'none' : '';
    renderJobs();
    applySkinClass();
  }
  var QUESTS = [
    { id:'tap', name:'Натопчи 80 раз', need:80, key:'qTap', rew:100 },
    { id:'food', name:'Купи еду в холодильник', need:1, key:'qFood', rew:70 },
    { id:'open', name:'Вырасти какашку', need:1, key:'qOpen', rew:120 },
    { id:'mix', name:'Смешай два продукта', need:1, key:'qMix', rew:80 },
    { id:'recipe', name:'Собери секретный набор', need:1, key:'qRecipe', rew:200 }
  ];
  var SKIN_ART = {
    basic:'img/basic.png', gold:'img/gold.png', spicy:'img/spicy.png',
    sleepy:'img/sleepy.png', fly:'img/fly.png'
  };
  var HIT_ART = {
    basic:'img/basic-hit.png', gold:'img/gold-hit.png', spicy:'img/spicy-hit.png',
    sleepy:'img/sleepy-hit.png', fly:'img/fly-hit.png'
  };
  Object.keys(HIT_ART).forEach(function(k){ var im = new Image(); im.src = HIT_ART[k]; });
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
    var src = (hitting && HIT_ART[id]) ? HIT_ART[id] : (SKIN_ART[id] || SKIN_ART.basic);
    if (art.getAttribute('src') !== src) art.src = src;
    if (wrap) wrap.classList.toggle('empty', !!(btn && btn.classList.contains('off')));
  }
  function renderJobs(){
    ensureQuests();
    unlockSkins();
    var sn = $('#streakN'); if (sn) sn.textContent = S.streak || 0;
    var ql = $('#questList');
    if (ql){
      var h = '';
      for (var i=0;i<QUESTS.length;i++){
        var q = QUESTS[i], have = S[q.key] || 0, done = have >= q.need, claimed = !!S.qClaim[q.id];
        var lab = claimed ? 'ОК' : done ? ('+'+q.rew) : (Math.min(have,q.need)+'/'+q.need);
        h += '<div class="qrow"><div style="flex:1"><div class="t">'+q.name+'</div><div class="d">награда <b>'+q.rew+'</b></div></div>'
          + '<button class="claim" data-q="'+q.id+'" '+(claimed||!done?'disabled':'')+'>'+lab+'</button></div>';
      }
      ql.innerHTML = h;
    }
    var sg = $('#skinGrid');
    if (sg){
      var hs = '';
      SKINS.forEach(function(sk){
        var own = S.skins.indexOf(sk.id) >= 0;
        hs += '<button class="skin'+(S.skin===sk.id?' on':'')+'" data-skin="'+sk.id+'" '+(own?'':'disabled')+'>'
          + '<img src="'+(SKIN_ART[sk.id]||SKIN_ART.basic)+'" alt="">'
          + '<span class="skinlab">'+sk.name+'<small>'+(own?'надеть':sk.how)+'</small></span></button>';
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
        hf += '<button type="button" class="food'+(own?' have':'')+(onp?' on':'')+'" data-food="'+f.id+'">'
          + '<span class="fico">'+f.ico+'</span>'+f.name
          + '<small>'+(own ? (onp ? 'на тарелке' : 'есть') : fmt(f.cost))+'</small></button>';
      }
      fr.innerHTML = hf;
    }
    var p = S.plate || [];
    function slotHtml(i){
      var el = document.getElementById('slot'+i); if (!el) return;
      var f = p[i] ? foodById(p[i]) : null;
      el.textContent = f ? (f.ico+' '+f.name) : 'пусто';
      el.classList.toggle('full', !!f);
    }
    slotHtml(0); slotHtml(1);
    var mb = $('#mixBtn'); if (mb) mb.disabled = p.length !== 2;
    var st = $('#mixStatus');
    if (st){
      var am = activeMix();
      st.textContent = am ? (am.name + ' · до полуночи UTC') : 'Набор действует до полуночи UTC.';
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
    }
  }
  function bumpCoins(){
    coinsBox.classList.remove('bump'); void coinsBox.offsetWidth; coinsBox.classList.add('bump');
  }

  /* ---------- fx ---------- */
  var fx = $('#fx');
  function flyText(x, y, txt){
    var el = document.createElement('div');
    el.className = 'fly'; el.textContent = txt;
    el.style.left = (x - 14) + 'px'; el.style.top = (y - 20) + 'px';
    fx.appendChild(el);
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
      fx.appendChild(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 700); })(el);
    }
    while (fx.children.length > 60) fx.firstChild.remove();
  }
  function shockwave(x, y){
    var el = document.createElement('div');
    el.className = 'wave';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    fx.appendChild(el);
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
      fx.appendChild(el);
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
      fx.appendChild(el);
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
      fx.appendChild(el);
      (function(el){ setTimeout(function(){ el.remove(); }, 650); })(el);
    }
  }
