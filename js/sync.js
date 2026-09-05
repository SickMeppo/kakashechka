/* ---------- toast ---------- */
  var toastEl = $('#toast'), toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------- sound toggle ---------- */
  function drawSnd(){
    $('#sndOn').style.display = S.muted ? 'none' : '';
    $('#sndOff').style.display = S.muted ? '' : 'none';
    var b = $('#sndBtn');
    b.setAttribute('aria-label', 'Звук');
    b.setAttribute('aria-pressed', String(!S.muted));
  }
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
    var drt = $('#dailyRewardT'); if (drt) drt.textContent = 'авто';
    var tb = $('#boostTurbo');
    if (tb && (turboOn() || tb.classList.contains('on'))) render();
  }, 1000);
  document.addEventListener('visibilitychange', function(){ if (document.hidden) saveCloud(); });
  window.addEventListener('pagehide', saveCloud);

  function saveLocal(){ try { S.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
  var syncing = false;
  var syncQueued = false;
  var cloudDown = false;
  function cloudFail(){
    if (cloudDown) return;
    cloudDown = true;
    toast('Сеть молчит. Какашки на этом телефоне');
  }
  function drawBoard(rows){
    var el = $('#boardList'); if (!el) return;
    el.replaceChildren();
    if (!rows || !rows.length) { el.textContent = 'пока никого'; return; }
    rows.forEach(function(r, i){
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode((i+1) + '. ' + (r.name || '?') + ' — ' + fmt(r.coins)));
    });
  }
  function isAhead(a, b){
    var ax = [a.taps||0, a.tapL||0, a.enL||0, a.autoL||0, a.critL||0, a.regenL||0, (a.foods&&a.foods.length)||0, (a.found&&a.found.length)||0];
    var bx = [b.taps||0, b.tapL||0, b.enL||0, b.autoL||0, b.critL||0, b.regenL||0, (b.foods&&b.foods.length)||0, (b.found&&b.found.length)||0];
    for (var i=0;i<ax.length;i++) if (ax[i] > bx[i]) return true;
    return false;
  }
  function sameStateValue(a, b){
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch(e) { return false; }
  }
  function changedSinceSent(key, sentState){
    return !!(sentState && Object.prototype.hasOwnProperty.call(sentState, key)
      && !sameStateValue(S[key], sentState[key]));
  }
  function applyRemote(st, sentState){
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
    ['coins','tapL','enL','autoL','critL','regenL','energy','taps','muted','sinceOpen','nextOpen','friends','goldOpens','skin','skins','qDay','qTap','qBuy','qOpen','qCombo','qFood','qMix','qRecipe','qClaim','streak','streakDay','turboUntil','turboDay','fillDay','foods','found','plate','mixId','mixUntil','cipherDay','cipherDone','naborDay','naborDone'].forEach(function(k){
      if (st[k] === undefined) return;
      if (k === 'coins' && sentState && Object.prototype.hasOwnProperty.call(sentState, 'coins')){
        var localCoins = Number(S.coins);
        var sentCoins = Number(sentState.coins);
        var serverCoins = Number(st.coins);
        if (Number.isFinite(localCoins) && Number.isFinite(sentCoins) && Number.isFinite(serverCoins)){
          S.coins = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, serverCoins + (localCoins - sentCoins)));
        }
        return;
      }
      if (changedSinceSent(k, sentState)) return;
      if (k === 'coins' && !remoteAhead) return; /* spend-sync-v2 */
      if (localAhead && progress[k]) return;
      S[k] = st[k];
    });
    render();
  }
  function applyClaimCredit(j, sentState){
    var total = Number(j && j.claimCreditTotal);
    if (!Number.isFinite(total) || total < 0) return { supported:false, delta:0 };
    var seen = Math.max(0, Number(S.claimCreditSeen) || 0);
    var delta = Math.max(0, total - seen);
    if (delta && !(sentState && Object.prototype.hasOwnProperty.call(sentState, 'coins'))){
      var serverCoins = Number(j && j.state && j.state.coins);
      if (Number.isFinite(serverCoins) && serverCoins >= 0) S.coins = serverCoins;
    }
    S.claimCreditSeen = Math.max(seen, total);
    return { supported:true, delta:delta };
  }
  function settleClaim(result, creditDelta){
    if (!result || !S.pendingClaim || result.key !== S.pendingClaim.key) return;
    var kind = result.type;
    var day = result.day || result.serverDay || todayUTC();
    if (result.status === 'granted' || result.status === 'already_granted'){
      if (kind === 'cipher'){ S.cipherDay = day; S.cipherDone = 1; }
      if (kind === 'nabor'){ S.naborDay = day; S.naborDone = 1; }
      S.pendingClaim = null;
      closeDay();
      if (result.status === 'granted' && result.reward > 0){
        toast((kind === 'cipher' ? 'Шифр +' : 'Набор +') + result.reward);
      } else if (creditDelta > 0){
        toast('Награда вернулась +' + creditDelta);
      }
      snd.open(); haptic('success');
      return;
    }
    if (result.status === 'expired' || result.status === 'invalid'){
      S.pendingClaim = null;
      closeDay();
      toast(result.status === 'expired' ? 'День сменился. Собери заново' : 'Награда не прошла. Собери заново');
      return;
    }
    S.pendingClaim.status = 'retryable_error';
    S.pendingClaim.errorCode = result.status || 'invalid';
    drawClaimPending(kind);
  }
  function markClaimFailure(code){
    if (!S.pendingClaim || S.pendingClaim.status !== 'pending') return;
    S.pendingClaim.status = code === 'bad_init' ? 'bad_init' : 'retryable_error';
    S.pendingClaim.errorCode = code;
    drawClaimPending(S.pendingClaim.type);
    saveLocal();
  }
  function recoverPendingAfterAuth(serverDay){
    var pending = S.pendingClaim;
    if (!pending) return;
    if (serverDay && pending.day !== serverDay){
      S.pendingClaim = null;
      closeDay();
      return;
    }
    if (pending.status === 'bad_init'){
      pending.status = 'retryable_error';
      pending.errorCode = '';
      drawClaimPending(pending.type);
    }
  }
  function handleServerResponse(j, sentState){
    if (!j || !j.ok) { cloudFail(); return false; }
    cloudDown = false;
    recoverPendingAfterAuth(j.serverDay);
    var remoteAhead = j.state && isAhead(j.state, S);
    var credit = applyClaimCredit(j, sentState);
    if (!credit.supported && j.dailyGranted && !remoteAhead) S.coins += j.dailyGranted;
    if (!credit.supported){
      if (j.cipherGranted){
        var alreadyC = S.cipherDone && S.cipherDay === todayUTC();
        S.cipherDay = todayUTC(); S.cipherDone = 1; S.pendingClaim = null;
        if (!alreadyC && !remoteAhead) S.coins += j.cipherGranted;
        if (!alreadyC) toast('Шифр +' + j.cipherGranted);
        closeDay();
      }
      if (j.naborGranted){
        var alreadyN = S.naborDone && S.naborDay === todayUTC();
        S.naborDay = todayUTC(); S.naborDone = 1; S.pendingClaim = null;
        if (!alreadyN && !remoteAhead) S.coins += j.naborGranted;
        if (!alreadyN) toast('Набор +' + j.naborGranted);
        closeDay();
      }
    }
    applyRemote(j.state, sentState);
    settleClaim(j.claimResult, credit.delta);
    if (j.dailyGranted) toast('Дневная какашка +' + j.dailyGranted);
    drawBoard(j.board);
    bumpCoins(); render(); saveLocal();
    return true;
  }
  function serverSync(){
    if (!tg || !tg.initData || !API || API.indexOf('invalid') !== -1) return;
    if (syncing) { syncQueued = true; return; }
    syncing = true;
    var payload = {
      protocolVersion: 2,
      initData: tg.initData,
      startParam: startParam,
      state: { coins:S.coins, tapL:S.tapL, enL:S.enL, autoL:S.autoL, critL:S.critL, regenL:S.regenL, energy:S.energy, taps:S.taps, muted:S.muted, sinceOpen:S.sinceOpen, nextOpen:S.nextOpen, goldOpens:S.goldOpens, skin:S.skin, skins:S.skins, qDay:S.qDay, qTap:S.qTap, qBuy:S.qBuy, qOpen:S.qOpen, qCombo:S.qCombo, qFood:S.qFood, qMix:S.qMix, qRecipe:S.qRecipe, qClaim:S.qClaim, streak:S.streak, streakDay:S.streakDay, turboUntil:S.turboUntil, turboDay:S.turboDay, fillDay:S.fillDay, foods:S.foods, found:S.found, plate:S.plate, mixId:S.mixId, mixUntil:S.mixUntil, claimCreditSeen:S.claimCreditSeen },
      claim: S.pendingClaim && S.pendingClaim.status === 'pending' ? S.pendingClaim : undefined
    };
    var sentState = JSON.parse(JSON.stringify(payload.state));
    var timeoutMs = Math.max(1, Number(window.__KAKA_SYNC_TIMEOUT_MS) || 12000);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var options = { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) };
    if (controller) options.signal = controller.signal;
    var timerId;
    var request = fetch(API + '/sync', options);
    var guarded = new Promise(function(resolve, reject){
      timerId = setTimeout(function(){
        if (controller) controller.abort();
        var timeoutError = new Error('sync timeout');
        timeoutError.code = 'timeout';
        reject(timeoutError);
      }, timeoutMs);
      request.then(resolve, reject);
    });
    guarded
      .then(function(r){
        if (!r.ok){
          var err = new Error('http');
          err.status = r.status;
          throw err;
        }
        return r.json();
      })
      .then(function(j){
        handleServerResponse(j, sentState);
      })
      .catch(function(err){
        markClaimFailure(err && err.status === 401 ? 'bad_init' : 'network');
        cloudFail();
      })
      .then(function(){
        clearTimeout(timerId);
        syncing = false;
        if (syncQueued){
          syncQueued = false;
          serverSync();
        }
      });
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
  window.__test = { state:S, render:render, tap:tapPoop, save:save, applyRemote:applyRemote, applyServerResponse:handleServerResponse, buyFood:buyFood, mix:mixNow, today:todayUTC, cipherWord:cipherWord, naborFoods:naborFoods, claimCipher:function(w){ return window.__dayClaim.cipher(w); }, claimNabor:function(){ return window.__dayClaim.nabor(); }, openCipher:function(){ window.__dayClaim.openC(); }, openNabor:function(){ window.__dayClaim.openN(); } };
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
