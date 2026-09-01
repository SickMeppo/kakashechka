/* ---------- toast ---------- */
  var toastEl = $('#toast'), toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------- sound toggle ---------- */
  function drawSnd(){ $('#sndOn').style.display = S.muted ? 'none' : ''; $('#sndOff').style.display = S.muted ? '' : 'none'; }
  $('#sndBtn').addEventListener('click', function(){ S.muted = !S.muted; drawSnd(); save(); if (!S.muted) snd.buy(); });

  /* ---------- loops & save ---------- */
  setInterval(function(){
    var need = regenMs();
    if (!window.__regenT) window.__regenT = 0;
    window.__regenT += 500;
    if (window.__regenT < need) return;
    window.__regenT = 0;
    if (S.energy < maxEnergy()){ S.energy = Math.min(maxEnergy(), S.energy + 1); render(); }
    if (S.energy >= 1){ poop.classList.remove('off'); if (poopWrap) poopWrap.classList.remove('empty'); applySkinClass(); }
  }, 500);
  setInterval(function(){
    if (autoPerSec() > 0){ S.coins += autoPerSec(); bumpCoins(); render(); }
  }, 1000);
  setInterval(saveLocal, 3000);
  setInterval(saveCloud, 20000);
  setInterval(function(){
    var drt = $('#dailyRewardT'); if (drt) drt.textContent = utcLeft();
    var tb = $('#boostTurbo');
    if (tb && (turboOn() || tb.classList.contains('on'))) render();
  }, 1000);
  document.addEventListener('visibilitychange', function(){ if (document.hidden) saveCloud(); });
  window.addEventListener('pagehide', saveCloud);

  function saveLocal(){ try { S.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
  var syncing = false;
  var cloudDown = false;
  function cloudFail(){
    if (cloudDown) return;
    cloudDown = true;
    toast('облако молчит, прогресс на этом телефоне');
  }
  function drawBoard(rows){
    var el = $('#boardList'); if (!el) return;
    if (!rows || !rows.length) { el.textContent = 'Пока пусто — зайди из Telegram.'; return; }
    el.innerHTML = rows.map(function(r, i){ return (i+1) + '. ' + (r.name || '?') + ' — ' + fmt(r.coins); }).join('<br>');
  }
  function isAhead(a, b){
    var ax = [a.taps||0, a.tapL||0, a.enL||0, a.autoL||0, a.critL||0, a.regenL||0, (a.foods&&a.foods.length)||0, (a.found&&a.found.length)||0];
    var bx = [b.taps||0, b.tapL||0, b.enL||0, b.autoL||0, b.critL||0, b.regenL||0, (b.foods&&b.foods.length)||0, (b.found&&b.found.length)||0];
    for (var i=0;i<ax.length;i++) if (ax[i] > bx[i]) return true;
    return false;
  }
  function applyRemote(st){
    if (!st) return;
    var localAhead = isAhead(S, st);
    var remoteAhead = isAhead(st, S);
    var progress = {
      coins:1, tapL:1, enL:1, autoL:1, critL:1, regenL:1, energy:1, taps:1,
      sinceOpen:1, nextOpen:1, goldOpens:1, skin:1, skins:1,
      qDay:1, qTap:1, qBuy:1, qOpen:1, qCombo:1, qFood:1, qMix:1, qRecipe:1, qClaim:1,
      streak:1, streakDay:1, turboUntil:1, turboDay:1, fillDay:1,
      foods:1, found:1, plate:1, mixId:1, mixUntil:1
    };
    ['coins','tapL','enL','autoL','critL','regenL','energy','taps','muted','sinceOpen','nextOpen','friends','goldOpens','skin','skins','qDay','qTap','qBuy','qOpen','qCombo','qFood','qMix','qRecipe','qClaim','streak','streakDay','turboUntil','turboDay','fillDay','foods','found','plate','mixId','mixUntil'].forEach(function(k){
      if (st[k] === undefined) return;
      if (k === 'coins' && !remoteAhead) return; /* spend-sync-v1 */
      if (localAhead && progress[k]) return;
      S[k] = st[k];
    });
    render();
  }
  function serverSync(){
    if (!tg || !tg.initData || !API || API.indexOf('invalid') !== -1) return;
    if (syncing) return;
    syncing = true;
    var payload = {
      initData: tg.initData,
      startParam: startParam,
      state: { coins:S.coins, tapL:S.tapL, enL:S.enL, autoL:S.autoL, critL:S.critL, regenL:S.regenL, energy:S.energy, taps:S.taps, muted:S.muted, sinceOpen:S.sinceOpen, nextOpen:S.nextOpen, goldOpens:S.goldOpens, skin:S.skin, skins:S.skins, qDay:S.qDay, qTap:S.qTap, qBuy:S.qBuy, qOpen:S.qOpen, qCombo:S.qCombo, qFood:S.qFood, qMix:S.qMix, qRecipe:S.qRecipe, qClaim:S.qClaim, streak:S.streak, streakDay:S.streakDay, turboUntil:S.turboUntil, turboDay:S.turboDay, fillDay:S.fillDay, foods:S.foods, found:S.found, plate:S.plate, mixId:S.mixId, mixUntil:S.mixUntil }
    };
    fetch(API + '/sync', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      .then(function(r){
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .then(function(j){
        if (!j || !j.ok) { cloudFail(); return; }
        cloudDown = false;
        var remoteAhead = j.state && isAhead(j.state, S);
        if (j.dailyGranted && !remoteAhead) S.coins += j.dailyGranted;
        applyRemote(j.state);
        if (j.dailyGranted) toast('Дневная какашка +' + j.dailyGranted);
        drawBoard(j.board);
        saveLocal();
      })
      .catch(function(){ cloudFail(); })
      .then(function(){ syncing = false; });
  }
  function save(){ saveLocal(); }
  function saveCloud(){ saveLocal(); serverSync(); }

  /* offline energy */
  (function(){
    var elapsed = Math.min(Date.now() - (S.lastSeen || Date.now()), 8*3600*1000);
    var gained = Math.floor(elapsed / 1500);
    if (gained > 0) S.energy = Math.min(maxEnergy(), S.energy + gained);
  })();

  /* test handles */
  window.__test = { state:S, render:render, tap:tapPoop, save:save, applyRemote:applyRemote, buyFood:buyFood, mix:mixNow };
  window.__verify = function(){
    var r = [];
    r.push(['монеты ≥ 0', S.coins >= 0, 'coins=' + fmt(S.coins)]);
    r.push(['тап-кнопка ≥ 44px', (function(){ var b = document.getElementById('poop').getBoundingClientRect(); return b.width >= 44 && b.height >= 44; })(), Math.round(document.getElementById('poop').getBoundingClientRect().width) + 'px']);
    r.push(['нет горизонтального скролла', document.documentElement.scrollWidth <= window.innerWidth, '']);
    return r;
  };

  function bumpStreak(){
    var d = todayUTC();
    if (S.streakDay === d) return;
    var y = new Date(); y.setUTCDate(y.getUTCDate()-1);
    var yest = y.toISOString().slice(0,10);
    S.streak = (S.streakDay === yest) ? (S.streak || 0) + 1 : 1;
    S.streakDay = d;
  }
  ensureQuests(); bumpStreak();
  drawSnd(); render(); serverSync();
