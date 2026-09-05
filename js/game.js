/* ---------- tapping ---------- */
  var poop = $('#poop'), hint = $('#hint'), comboBadge = $('#comboBadge'), poopWrap = $('#poopWrap');
  var streak = 0, comboTier = 0, lastTap = 0, hintTimer = null, comboTimer = null, tierTimer = null, hitTimer = null, pressedAt = 0;

  function appRect(){ return document.getElementById('app').getBoundingClientRect(); }
  function motionReduced(){ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function squashNow(e){
    if (Math.floor(S.energy) < 1 || motionReduced()) return false;
    pressedAt = (window.performance && performance.now) ? performance.now() : Date.now();
    poop.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(2) + 'deg');
    poop.classList.remove('hit','off'); void poop.offsetWidth; poop.classList.add('hit');
    clearTimeout(hitTimer);
    hitTimer = setTimeout(function(){ poop.classList.remove('hit'); applySkinClass(); }, 270);
    applySkinClass();
    return true;
  }

  function tapPoop(e){
    if (Math.floor(S.energy) < 1){
      S.energy = Math.max(0, S.energy);
      poop.classList.add('off');
      applySkinClass();
      hint.textContent = S.fillDay !== todayUTC() ? 'Кишечник пуст. Жми «Напор»' : 'Кишечник пуст. Подожди';
      hint.classList.add('warn');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function(){ hint.textContent='Тапай по какашечке'; hint.classList.remove('warn'); }, 1600);
      snd.thud();
      return;
    }
    var now = Date.now();
    streak = (now - lastTap < 600) ? streak + 1 : 1;
    lastTap = now;
    var mult = streak >= 25 ? 2 : streak >= 10 ? 1.5 : 1;
    var nextTier = streak >= 25 ? 2 : streak >= 10 ? 1 : 0;
    var tierUp = nextTier > comboTier;
    if (streak >= 10){
      comboBadge.textContent = 'КОМБО ×' + mult;
      comboBadge.classList.add('on');
    }
    if (tierUp){
      poopWrap.classList.remove('tierup'); void poopWrap.offsetWidth; poopWrap.classList.add('tierup');
      clearTimeout(tierTimer);
      tierTimer = setTimeout(function(){ poopWrap.classList.remove('tierup'); }, 980);
      announceGame('Комбо ×' + mult);
    }
    comboTier = nextTier;
    poopWrap.classList.toggle('hot', mult > 1);
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function(){
      comboTier = 0;
      poopWrap.classList.remove('hot','tierup');
      comboBadge.classList.remove('on');
    }, 700);

    var critP = (0.05 * (S.critL || 0)) + ((activeMix() && activeMix().crit) || 0);
    var crit = Math.random() < critP;
    var gain = Math.max(1, Math.round(perTap() * mult * (crit ? 3 : 1) * (turboOn() ? 2 : 1)));
    S.coins += gain; S.energy = Math.max(0, S.energy - 1); S.taps++; S.sinceOpen++;
    S.qTap = (S.qTap || 0) + 1;
    if (streak >= 10) S.qCombo = 1;

    var reduceFx = motionReduced();
    var clock = (window.performance && performance.now) ? performance.now() : Date.now();
    var pressedRecently = e && e.type === 'click' && clock - pressedAt < 400;
    if (!pressedRecently) squashNow(e);
    snd.squish(); haptic(crit || tierUp ? 'medium' : 'light');

    if (!reduceFx){
      var r = appRect(), bx = poop.getBoundingClientRect();
      var x = e && e.clientX ? e.clientX - r.left : bx.left - r.left + bx.width/2;
      var y = e && e.clientY ? e.clientY - r.top  : bx.top - r.top + 30;
      var el = flyText(x + (Math.random()*30 - 15), y, (crit ? 'КРИТ +' : '+') + fmt(gain));
      if (mult > 1 || crit) el.classList.add('big');
      if (crit) el.classList.add('crit');
      shockwave(x, y);
      coinBurst(x, y, crit ? 6 : (mult > 1 ? 4 : 2));
      splatBurst(x, y, crit ? 5 : 3);
      if (mult > 1) sparkBurst(x, y, mult >= 2 ? 8 : 5);
      if (crit){
        sparkBurst(x, y, 10);
        starBurst(x, y, 7);
        poopWrap.classList.remove('crit'); void poopWrap.offsetWidth; poopWrap.classList.add('crit');
      }
    }
    bumpCoins(); renderFast(); saveLocal();

    if (S.sinceOpen >= S.nextOpen) doOpen();
  }

  poop.addEventListener('pointerdown', function(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    squashNow(e);
  });
  poop.addEventListener('click', tapPoop);
  poop.addEventListener('keydown', function(e){
    if ((e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    e.preventDefault();
    tapPoop(e);
  });
  poop.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  /* ---------- poop grown ---------- */
  var overlay = $('#openOverlay'), evolveTimer = null;
  function closeReward(){
    if (!overlay.classList.contains('show')) return;
    var wasEvolution = overlay.classList.contains('evolution');
    overlay.classList.remove('show','gold','evolution');
    overlay.setAttribute('aria-hidden', 'true');
    syncChromeInert();
    if (wasEvolution){
      showScreen('scr-tap', null, true);
      clearTimeout(evolveTimer);
      poopWrap.classList.remove('evolved'); void poopWrap.offsetWidth; poopWrap.classList.add('evolved');
      evolveTimer = setTimeout(function(){ poopWrap.classList.remove('evolved'); }, 900);
    } else {
      poop.classList.remove('spawn'); void poop.offsetWidth; poop.classList.add('spawn');
    }
    poop.focus({ preventScroll:true });
    haptic('success'); render(); saveCloud();
  }
  function showEvolution(stage){
    if (!stage) return;
    overlay.classList.remove('show','gold');
    overlay.classList.add('evolution');
    var oa = $('#openArt'); if (oa) oa.src = stage.art;
    $('#openTag').textContent = 'НОВАЯ ФОРМА';
    $('#openRew').textContent = stage.name;
    $('#openSub').textContent = stage.line;
    var btn = $('#collectBtn');
    btn.textContent = 'Смотреть';
    btn.onclick = closeReward;
    void overlay.offsetWidth;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    syncChromeInert();
    btn.focus({ preventScroll:true });
    announceGame('Новая форма: ' + stage.name);
    snd.open(); haptic('medium');
  }
  function doOpen(){
    S.sinceOpen = 0;
    S.nextOpen = 20 + Math.floor(Math.random() * 16);
    var golden = Math.random() < (0.12 + ((activeMix() && activeMix().gold) || 0));
    if (golden) S.goldOpens = (S.goldOpens || 0) + 1;
    S.qOpen = (S.qOpen || 0) + 1;
    var reward = Math.round((60 + 30 * S.tapL) * (1 + 0.25 * S.friends) * (golden ? 10 : 1));
    S.coins += reward;
    bumpCoins();
    render();
    saveLocal();
    overlay.classList.remove('evolution');
    overlay.classList.toggle('gold', golden);
    var oa = $('#openArt');
    var currentArt = (S.skin || 'basic') === 'basic'
      ? currentEvolution().art
      : (SKIN_ART[S.skin] || currentEvolution().art);
    if (oa) oa.src = golden ? SKIN_ART.gold : currentArt;
    $('#openTag').textContent = golden ? 'ЗОЛОТАЯ КАКАШЕЧКА ×10' : 'КАКАШЕЧКА ВЫРОСЛА';
    $('#openRew').textContent = '+' + fmt(reward);
    $('#openSub').textContent = golden ? 'золотая. сразу ×10' : 'ещё вырастет';
    var btn = $('#collectBtn');
    btn.textContent = 'Продолжить';
    btn.onclick = closeReward;
    overlay.classList.remove('show'); void overlay.offsetWidth;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    syncChromeInert();
    btn.focus({ preventScroll:true });
    golden ? snd.gold() : snd.open();
    haptic('medium');
  }

  /* ---------- upgrades ---------- */
  $('#upList').addEventListener('click', function(e){
    var b = e.target.closest('.buy'); if (!b || b.disabled) return;
    var u = UPS[+b.dataset.i], l = S[u.k], c = u.cost(l);
    if (l >= u.cap || S.coins < c) return;
    var beforeEvolution = currentEvolution();
    S.coins -= c; S[u.k] = l + 1;
    S.qBuy = (S.qBuy || 0) + 1;
    if (u.k === 'enL') S.energy = Math.min(S.energy + 20, maxEnergy());
    var afterEvolution = currentEvolution();
    snd.buy(); haptic('success'); bumpCoins(); render(); saveCloud();
    var freshButton = document.querySelector('.buy[data-i="' + b.dataset.i + '"]');
    var freshRow = freshButton && freshButton.closest('.uprow');
    if (freshButton) freshButton.classList.add('bought');
    if (freshRow) freshRow.classList.add('bought');
    setTimeout(function(){
      if (freshButton) freshButton.classList.remove('bought');
      if (freshRow) freshRow.classList.remove('bought');
    }, 440);
    if (afterEvolution.index > beforeEvolution.index) showEvolution(afterEvolution);
    else announceGame('Куплено: ' + u.name + ', уровень ' + (l + 1));
  });

  document.getElementById('questList').addEventListener('click', function(e){
    var b = e.target.closest('.claim'); if (!b || b.disabled) return;
    ensureQuests();
    var id = b.dataset.q, q = null;
    for (var i=0;i<QUESTS.length;i++) if (QUESTS[i].id === id) q = QUESTS[i];
    if (!q || S.qClaim[id] || (S[q.key]||0) < q.need) return;
    S.qClaim[id] = 1; S.coins += q.rew;
    toast('Задание +' + q.rew); snd.buy(); haptic('success'); bumpCoins(); render(); saveCloud();
  });
  document.getElementById('skinGrid').addEventListener('click', function(e){
    var b = e.target.closest('.skin'); if (!b || b.disabled) return;
    S.skin = b.dataset.skin; render(); saveCloud();
  });

  function buyFood(id){
    var f = foodById(id); if (!f) return false;
    if (hasFood(id)) return true;
    if (S.coins < f.cost){ toast('Мало какоинов'); return false; }
    S.coins -= f.cost;
    S.foods.push(id);
    S.qFood = (S.qFood || 0) + 1;
    return true;
  }
  function togglePlate(id){
    if (!hasFood(id)){
      toast('Сначала купи');
      haptic('light');
      return false;
    }
    var p = (S.plate || []).slice();
    var ix = p.indexOf(id);
    if (ix >= 0) p.splice(ix, 1);
    else {
      if (p.length >= 2){ toast('Тарелка уже полна'); haptic('light'); return false; }
      p.push(id);
    }
    S.plate = p;
    haptic('light');
    render(); saveCloud();
    return true;
  }
  function mixNow(){
    var p = S.plate || [];
    S.qMix = (S.qMix || 0) + 1;
    if (p.length !== 2){ toast('Нужно два на тарелку'); render(); saveCloud(); return false; }
    if (!hasFood(p[0]) || !hasFood(p[1])){ toast('Сначала купи оба'); return false; }
    var rec = findRecipe(p[0], p[1]);
    if (!rec){
      toast(MIX_FAIL[Math.floor(Math.random() * MIX_FAIL.length)]);
      snd.thud(); haptic('light'); render(); saveCloud();
      return false;
    }
    var first = (S.found || []).indexOf(rec.id) < 0;
    if (first){
      S.found.push(rec.id);
      S.qRecipe = (S.qRecipe || 0) + 1;
      S.coins += 80;
    }
    S.mixId = rec.id;
    S.mixUntil = utcDayEnd();
    toast(first ? ('Набор: ' + rec.name) : (rec.name + ' до утра'));
    snd.open(); haptic('success'); bumpCoins(); render(); saveCloud();
    return true;
  }
  document.getElementById('fridge').addEventListener('click', function(e){
    var buy = e.target.closest('.food-buy');
    if (buy){
      if (!buyFood(buy.dataset.food)) { haptic('light'); render(); return; }
      snd.buy(); haptic('success'); bumpCoins(); render(); saveCloud();
      return;
    }
    var pick = e.target.closest('.food-pick');
    if (pick) togglePlate(pick.dataset.food);
  });
  document.getElementById('slot0').addEventListener('click', function(){ if ((S.plate||[])[0]) { S.plate.splice(0,1); render(); saveCloud(); } });
  document.getElementById('slot1').addEventListener('click', function(){ if ((S.plate||[])[1]) { S.plate.splice(1,1); render(); saveCloud(); } });
  document.getElementById('mixBtn').addEventListener('click', mixNow);

  /* ---------- pack ---------- */
  function refLink(){
    var uid = tgUser ? tgUser.id : 'demo';
    return 't.me/kakashechka_dm_bot?startapp=ref_' + uid;
  }
  $('#inviteBtn').addEventListener('click', function(){
    var url = 'https://' + refLink();
    var text = 'тапай какашку со мной';
    if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    else copyRef();
  });
  function copyRef(){
    var link = 'https://' + refLink();
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(function(){ toast('Скопировал'); }, function(){ toast(link); });
    else toast(link);
  }
  $('#copyBtn').addEventListener('click', copyRef);
  $('#starsBtn').addEventListener('click', function(){ toast('пока нет'); haptic('light'); });

  function useTurbo(){
    if (turboOn()){ toast('Турбо уже орёт'); return; }
    if (S.turboDay === todayUTC()){ toast('Турбо завтра'); return; }
    S.turboDay = todayUTC();
    S.turboUntil = Date.now() + 20000;
    toast('Турбо ×2 на 20 сек');
    snd.buy(); haptic('success'); render(); saveCloud();
  }
  function useFill(){
    if (S.energy >= maxEnergy()){ toast('Энергия уже полная'); return; }
    if (S.fillDay === todayUTC()){ toast('Напор завтра'); return; }
    S.fillDay = todayUTC();
    S.energy = maxEnergy();
    if (poop) poop.classList.remove('off');
    toast('Напор полный');
    snd.buy(); haptic('success'); render(); saveCloud();
  }
  $('#boostTurbo').addEventListener('click', useTurbo);
  $('#boostFill').addEventListener('click', useFill);

  var dayMode = 'cipher';
  var guess = [];
  var keyUsed = [];
  var dayKeys = [];
  var dayInvoker = null;
  function setChromeInert(value){
    ['header','main','.tabbar'].forEach(function(selector){
      var el = document.querySelector(selector);
      if (el) el.inert = !!value;
    });
  }
  function syncChromeInert(){
    var rewardOpen = overlay && overlay.classList.contains('show');
    var day = $('#dayOverlay');
    var dayOpen = day && day.classList.contains('show');
    setChromeInert(rewardOpen || dayOpen);
  }
  function showDay(invoker){
    var ov = $('#dayOverlay');
    dayInvoker = invoker || (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
    ov.classList.add('show');
    ov.setAttribute('aria-hidden', 'false');
    syncChromeInert();
    $('#dayClose').focus({ preventScroll:true });
  }
  function closeDay(){
    var ov = $('#dayOverlay');
    if (ov){
      ov.classList.remove('show');
      ov.setAttribute('aria-hidden', 'true');
    }
    syncChromeInert();
    if (overlay && overlay.classList.contains('show')) $('#collectBtn').focus({ preventScroll:true });
    else if (dayInvoker && document.contains(dayInvoker)) dayInvoker.focus({ preventScroll:true });
    dayInvoker = null;
  }
  function drawGuess(){
    var el = $('#dayGuess'); if (!el) return;
    var html = '';
    for (var i = 0; i < dayKeys.length; i++){
      html += '<span class="slot">' + (guess[i] || '') + '</span>';
    }
    el.innerHTML = html;
  }
  function pendingClaim(kind){
    return !!(S.pendingClaim && S.pendingClaim.type === kind);
  }
  function startClaim(kind, proof){
    var day = todayUTC();
    if (S.pendingClaim && S.pendingClaim.status === 'pending') return false;
    S.pendingClaim = Object.assign({
      key:kind + ':' + day,
      type:kind,
      day:day,
      status:'pending'
    }, proof || {});
    drawClaimPending(kind);
    saveCloud();
    return true;
  }
  function drawClaimPending(kind){
    if (!pendingClaim(kind)) return;
    var p = S.pendingClaim;
    if (p.status === 'retryable_error'){
      $('#daySub').textContent = 'Не удалось проверить. Награда не начислена';
      $('#dayGo').textContent = 'Повторить';
      $('#dayGo').disabled = false;
      $('#dayGo').setAttribute('aria-busy', 'false');
      return;
    }
    if (p.status === 'bad_init'){
      $('#daySub').textContent = 'Сессия устарела. Открой игру заново';
      $('#dayGo').textContent = 'Открой заново';
      $('#dayGo').disabled = true;
      $('#dayGo').setAttribute('aria-busy', 'false');
      return;
    }
    $('#daySub').textContent = 'Проверяем награду';
    $('#dayGo').textContent = 'Проверяем';
    $('#dayGo').disabled = true;
    $('#dayGo').setAttribute('aria-busy', 'true');
  }
  function retryPendingClaim(){
    if (!S.pendingClaim || S.pendingClaim.status !== 'retryable_error') return false;
    S.pendingClaim.status = 'pending';
    delete S.pendingClaim.errorCode;
    drawClaimPending(S.pendingClaim.type);
    saveCloud();
    return true;
  }
  function currentPending(){
    var pending = S.pendingClaim;
    if (pending && pending.day !== todayUTC()){
      S.pendingClaim = null;
      saveLocal();
      return null;
    }
    return pending;
  }
  function openCipher(e){
    var pending = currentPending();
    if (pending && pending.type === 'nabor'){ openNabor(e); return; }
    dayMode = 'cipher';
    var d = todayUTC();
    var done = S.cipherDay === d && S.cipherDone;
    var w = cipherWord(d);
    dayKeys = scrambleWord(w, d);
    guess = [];
    keyUsed = [];
    $('#dayTag').textContent = 'НА ДВЕРЦЕ';
    $('#dayScramble').style.display = '';
    $('#dayScramble').textContent = dayKeys.join(' ');
    $('#dayGuess').style.display = '';
    $('#dayEdit').style.display = '';
    $('#dayKeys').style.display = '';
    $('#naborBalance').hidden = true;
    $('#naborList').style.display = 'none';
    $('#daySub').textContent = done ? 'на сегодня хватит' : 'ответ в канале';
    $('#dayGo').textContent = done ? 'завтра' : 'Собрать';
    $('#dayGo').disabled = !!done;
    var keysEl = $('#dayKeys');
    var html = '';
    for (var i = 0; i < dayKeys.length; i++){
      html += '<button type="button" class="key" data-i="' + i + '">' + dayKeys[i] + '</button>';
    }
    keysEl.innerHTML = html;
    drawGuess();
    drawClaimPending('cipher');
    showDay(e && e.currentTarget ? e.currentTarget : $('#dailyCipher'));
    haptic('light');
  }
  function openNabor(e){
    var pending = currentPending();
    if (pending && pending.type === 'cipher'){ openCipher(e); return; }
    dayMode = 'nabor';
    var d = todayUTC();
    var done = S.naborDay === d && S.naborDone;
    var ids = naborFoods(d);
    $('#dayTag').textContent = 'С ПОЛКИ';
    $('#dayScramble').style.display = 'none';
    $('#dayGuess').style.display = 'none';
    $('#dayEdit').style.display = 'none';
    $('#dayKeys').style.display = 'none';
    var balance = $('#naborBalance');
    balance.hidden = false;
    balance.textContent = 'Баланс: ' + fmt(S.coins) + ' какоинов';
    $('#naborList').style.display = '';
    var html = '', allHave = true;
    for (var i = 0; i < ids.length; i++){
      var f = foodById(ids[i]); if (!f) continue;
      var have = hasFood(f.id);
      var afford = S.coins >= f.cost;
      if (!have) allHave = false;
      html += '<div class="nabor-food' + (have ? ' have' : '') + '" data-food="' + f.id + '">'
        + '<span class="ico">' + f.name.slice(0,1) + '</span><span class="nm">' + f.name + '</span>'
        + (have
          ? '<span class="nabor-owned">Есть</span>'
          : '<button type="button" class="nabor-buy" data-food="' + f.id + '" data-cost="' + f.cost
            + '"' + (afford ? '' : ' disabled')
            + ' aria-label="' + (afford
              ? 'Купить ' + f.name + ' за ' + f.cost + ' какоинов'
              : 'Не хватает ' + (f.cost - S.coins) + ' какоинов для ' + f.name)
            + '">' + (afford ? 'Купить · ' + fmt(f.cost) : 'Не хватает · ' + fmt(f.cost - S.coins)) + '</button>')
        + '</div>';
    }
    $('#naborList').innerHTML = html;
    $('#daySub').textContent = done ? 'на сегодня хватит' : 'три штуки с полки';
    $('#dayGo').textContent = done ? 'завтра' : (allHave ? 'Забрать' : 'Собери все три');
    $('#dayGo').disabled = !!done || !allHave;
    drawClaimPending('nabor');
    showDay(e && e.currentTarget ? e.currentTarget : $('#dailyCombo'));
    haptic('light');
  }
  function finishClaim(kind, n){
    var d = todayUTC();
    if (kind === 'cipher'){ S.cipherDay = d; S.cipherDone = 1; }
    if (kind === 'nabor'){ S.naborDay = d; S.naborDone = 1; }
    if (n) { S.coins += n; toast((kind === 'cipher' ? 'Шифр +' : 'Набор +') + n); }
    bumpCoins(); render(); saveLocal();
    closeDay();
  }
  function claimBlocked(kind){
    var pending = currentPending();
    if (!pending) return false;
    drawClaimPending(pending.type === kind ? kind : dayMode);
    toast('Сначала закончи прошлую проверку');
    return true;
  }
  function submitCipher(word){
    var d = todayUTC();
    if (S.cipherDay === d && S.cipherDone){ toast('Завтра'); return false; }
    if (claimBlocked('cipher')) return false;
    var w = String(word || '').toUpperCase().replace(/[^А-ЯЁA-Z]/g, '');
    if (!w || w.length < cipherWord(d).length){ toast('Букв мало'); haptic('light'); return false; }
    if (w !== cipherWord(d)){ toast('Мимо'); snd.thud(); haptic('light'); return false; }
    if (tg && tg.initData){
      if (!startClaim('cipher', { word:w })) return false;
    } else {
      S.pendingClaim = null;
      finishClaim('cipher', CIPHER_REWARD); /* cipher-autosubmit-v1 */
      snd.open(); haptic('success');
    }
    return true;
  }
  function submitNabor(){
    var d = todayUTC();
    if (S.naborDay === d && S.naborDone){ toast('Завтра'); return false; }
    if (claimBlocked('nabor')) return false;
    var ids = naborFoods(d);
    for (var i = 0; i < ids.length; i++){
      if (!hasFood(ids[i])){ toast('Не все три'); return false; }
    }
    if (!tg || !tg.initData){
      finishClaim('nabor', NABOR_REWARD);
      snd.open(); haptic('success');
      return true;
    }
    return startClaim('nabor', { foods:ids.slice() });
  }
  $('#dailyCipher').addEventListener('click', openCipher);
  $('#dailyCombo').addEventListener('click', openNabor);
  $('#dayClose').addEventListener('click', closeDay);
  document.addEventListener('keydown', function(e){
    var rewardOpen = overlay.classList.contains('show');
    if (rewardOpen && e.key === 'Tab'){
      e.preventDefault();
      $('#collectBtn').focus({ preventScroll:true });
      return;
    }
    if (rewardOpen && e.key === 'Escape'){
      e.preventDefault();
      closeReward();
      return;
    }
    var dayOpen = $('#dayOverlay').classList.contains('show');
    if (e.key === 'Tab' && dayOpen){
      var focusable = Array.prototype.filter.call(
        $('#dayOverlay').querySelectorAll('button:not([disabled]), [href], input:not([disabled])'),
        function(el){ return el.offsetWidth > 0 && el.offsetHeight > 0; }
      );
      if (focusable.length){
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      }
    }
    if (e.key === 'Escape' && dayOpen){
      e.preventDefault();
      closeDay();
    }
  });
  $('#dayKeys').addEventListener('click', function(e){
    var b = e.target.closest('.key'); if (!b || b.disabled) return;
    if (guess.length >= dayKeys.length) return;
    var i = +b.dataset.i;
    guess.push(dayKeys[i]);
    b.disabled = true;
    drawGuess();
    haptic('light');
    if (guess.length === dayKeys.length) submitCipher(guess.join(''));
  });
  function syncGuessKeys(){
    var keysEl = $('#dayKeys').querySelectorAll('.key');
    for (var i = 0; i < keysEl.length; i++) keysEl[i].disabled = false;
    var used = guess.slice();
    for (var j = 0; j < keysEl.length; j++){
      var ch = keysEl[j].textContent;
      var ix = used.indexOf(ch);
      if (ix >= 0){ keysEl[j].disabled = true; used.splice(ix, 1); }
    }
  }
  function undoGuess(){
    if (!guess.length) return;
    guess.pop();
    syncGuessKeys();
    drawGuess();
  }
  function resetGuess(){
    guess = [];
    syncGuessKeys();
    drawGuess();
  }
  $('#dayGuess').addEventListener('click', undoGuess);
  $('#dayBack').addEventListener('click', undoGuess);
  $('#dayReset').addEventListener('click', resetGuess);
  $('#naborList').addEventListener('click', function(e){
    var b = e.target.closest('.nabor-buy'); if (!b || b.disabled) return;
    var id = b.dataset.food;
    if (hasFood(id)){ openNabor(); return; }
    if (!buyFood(id)) { haptic('light'); return; }
    snd.buy(); haptic('success'); bumpCoins(); openNabor(); saveCloud();
  });
  $('#dayGo').addEventListener('click', function(){
    if (retryPendingClaim()) return;
    if (dayMode === 'cipher') submitCipher(guess.join(''));
    else submitNabor();
  });
  window.__dayClaim = { cipher: submitCipher, nabor: submitNabor, openC: openCipher, openN: openNabor };

  /* ---------- tabs ---------- */
  function showScreen(id, focusSelector, keepCurrentFocus){
    render();
    var app = $('#app');
    if (app) app.dataset.screen = id;
    document.querySelectorAll('.tab').forEach(function(x){
      var active = x.dataset.scr === id;
      x.classList.toggle('on', active);
      if (active) x.setAttribute('aria-current', 'page');
      else x.removeAttribute('aria-current');
    });
    document.querySelectorAll('.screen').forEach(function(x){
      var active = x.id === id;
      x.classList.toggle('on', active);
      x.setAttribute('aria-hidden', String(!active));
    });
    if (focusSelector){
      var focusTarget = document.querySelector(focusSelector);
      if (focusTarget) focusTarget.focus({ preventScroll:true });
    } else if (!keepCurrentFocus){
      var screen = document.getElementById(id);
      var headingId = screen && screen.getAttribute('aria-labelledby');
      var heading = headingId && document.getElementById(headingId);
      if (heading) heading.focus({ preventScroll:true });
    }
  }
  $('#nextGoalAction').addEventListener('click', function(){
    var action = this.dataset.action;
    if (action === 'focus-fill') showScreen('scr-tap', '#boostFill');
    else if (action === 'job') showScreen('scr-job');
    else if (action === 'up') showScreen('scr-up');
    if (action && action !== 'wait') haptic('light');
  });
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){
      showScreen(t.dataset.scr, null, true);
      t.focus({ preventScroll:true });
      haptic('light');
    });
  });
