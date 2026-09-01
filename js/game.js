/* ---------- tapping ---------- */
  var poop = $('#poop'), hint = $('#hint'), comboBadge = $('#comboBadge'), poopWrap = $('#poopWrap');
  var streak = 0, lastTap = 0, hintTimer = null, comboTimer = null, hitTimer = null;

  function appRect(){ return document.getElementById('app').getBoundingClientRect(); }

  function tapPoop(e){
    if (Math.floor(S.energy) < 1){
      S.energy = Math.max(0, S.energy);
      poop.classList.add('off');
      applySkinClass();
      hint.textContent = 'Кишечник пуст — энергия восстановится сама';
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
    if (streak >= 10){
      comboBadge.textContent = 'КОМБО ×' + mult;
      comboBadge.classList.add('on');
    }
    poopWrap.classList.toggle('hot', mult > 1);
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function(){ poopWrap.classList.remove('hot'); comboBadge.classList.remove('on'); }, 700);

    var critP = (0.05 * (S.critL || 0)) + ((activeMix() && activeMix().crit) || 0);
    var crit = Math.random() < critP;
    var gain = Math.max(1, Math.round(perTap() * mult * (crit ? 3 : 1) * (turboOn() ? 2 : 1)));
    S.coins += gain; S.energy = Math.max(0, S.energy - 1); S.taps++; S.sinceOpen++;
    S.qTap = (S.qTap || 0) + 1;
    if (streak >= 10) S.qCombo = 1;

    poop.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(2) + 'deg');
    poop.classList.remove('hit','off'); void poop.offsetWidth; poop.classList.add('hit');
    applySkinClass();
    clearTimeout(hitTimer);
    hitTimer = setTimeout(function(){ poop.classList.remove('hit'); applySkinClass(); }, 300);
    snd.squish(); haptic(crit ? 'medium' : (mult > 1 ? 'medium' : 'light'));

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
    bumpCoins(); render(); saveLocal();

    if (S.sinceOpen >= S.nextOpen) doOpen();
  }

  poop.addEventListener('pointerdown', tapPoop);
  poop.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  /* ---------- poop grown ---------- */
  var overlay = $('#openOverlay');
  function doOpen(){
    S.sinceOpen = 0;
    S.nextOpen = 20 + Math.floor(Math.random() * 16);
    var golden = Math.random() < (0.12 + ((activeMix() && activeMix().gold) || 0));
    if (golden) S.goldOpens = (S.goldOpens || 0) + 1;
    S.qOpen = (S.qOpen || 0) + 1;
    var reward = Math.round((60 + 30 * S.tapL) * (1 + 0.25 * S.friends) * (golden ? 10 : 1));
    overlay.classList.toggle('gold', golden);
    var oa = $('#openArt'); if (oa) oa.src = golden ? SKIN_ART.gold : SKIN_ART.basic;
    $('#openTag').textContent = golden ? 'ЗОЛОТАЯ КАКАШЕЧКА ×10' : 'КАКАШЕЧКА ВЫРОСЛА';
    $('#openRew').textContent = '+' + fmt(reward);
    $('#openSub').textContent = golden ? 'Редкая удача — десятка сверху!' : 'Забирай и корми дальше — она бесконечная';
    overlay.classList.remove('show'); void overlay.offsetWidth;
    overlay.classList.add('show');
    golden ? snd.gold() : snd.open();
    haptic('medium');
    var btn = $('#collectBtn');
    btn.onclick = function(){
      S.coins += reward;
      overlay.classList.remove('show','gold');
      poop.classList.remove('spawn'); void poop.offsetWidth; poop.classList.add('spawn');
      haptic('success'); bumpCoins(); render(); saveCloud();
    };
  }

  /* ---------- upgrades ---------- */
  $('#upList').addEventListener('click', function(e){
    var b = e.target.closest('.buy'); if (!b || b.disabled) return;
    var u = UPS[+b.dataset.i], l = S[u.k], c = u.cost(l);
    if (l >= u.cap || S.coins < c) return;
    S.coins -= c; S[u.k] = l + 1;
    S.qBuy = (S.qBuy || 0) + 1;
    if (u.k === 'enL') S.energy = Math.min(S.energy + 20, maxEnergy());
    snd.buy(); haptic('success'); bumpCoins(); render(); saveCloud();
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
      if (!buyFood(id)) { haptic('light'); render(); return; }
      snd.buy(); haptic('success'); bumpCoins();
    }
    var p = (S.plate || []).slice();
    var ix = p.indexOf(id);
    if (ix >= 0) p.splice(ix, 1);
    else {
      if (p.length >= 2) p.shift();
      p.push(id);
    }
    S.plate = p;
    render(); saveCloud();
  }
  function mixNow(){
    var p = S.plate || [];
    S.qMix = (S.qMix || 0) + 1;
    if (p.length !== 2){ toast('Два продукта на тарелку'); render(); saveCloud(); return false; }
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
    toast(first ? ('НАБОР: ' + rec.name) : (rec.name + ' до полуночи'));
    snd.open(); haptic('success'); bumpCoins(); render(); saveCloud();
    return true;
  }
  document.getElementById('fridge').addEventListener('click', function(e){
    var b = e.target.closest('.food'); if (!b) return;
    togglePlate(b.dataset.food);
  });
  document.getElementById('slot0').addEventListener('click', function(){ if ((S.plate||[])[0]) { S.plate.splice(0,1); render(); } });
  document.getElementById('slot1').addEventListener('click', function(){ if ((S.plate||[])[1]) { S.plate.splice(1,1); render(); } });
  document.getElementById('mixBtn').addEventListener('click', mixNow);

  /* ---------- pack ---------- */
  function refLink(){
    var uid = tgUser ? tgUser.id : 'demo';
    return 't.me/kakashechka_dm_bot?startapp=ref_' + uid;
  }
  $('#inviteBtn').addEventListener('click', function(){
    var url = 'https://' + refLink();
    var text = 'Тапай какашечку со мной — за каждого в стае +25% к тапу';
    if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    else copyRef();
  });
  function copyRef(){
    var link = 'https://' + refLink();
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(function(){ toast('Ссылка скопирована'); }, function(){ toast(link); });
    else toast(link);
  }
  $('#copyBtn').addEventListener('click', copyRef);
  $('#starsBtn').addEventListener('click', function(){ toast('Монетизация — после MVP ;)'); haptic('light'); });

  function useTurbo(){
    if (turboOn()){ toast('Турбо уже орёт'); return; }
    if (S.turboDay === todayUTC()){ toast('Турбо завтра'); return; }
    S.turboDay = todayUTC();
    S.turboUntil = Date.now() + 20000;
    toast('ТУРБО ×2 на 20 сек');
    snd.buy(); haptic('success'); render(); saveCloud();
  }
  function useFill(){
    if (S.fillDay === todayUTC()){ toast('Напор завтра'); return; }
    S.fillDay = todayUTC();
    S.energy = maxEnergy();
    if (poop) poop.classList.remove('off');
    toast('Напор полный');
    snd.buy(); haptic('success'); render(); saveCloud();
  }
  $('#boostTurbo').addEventListener('click', useTurbo);
  $('#boostFill').addEventListener('click', useFill);
  $('#dailyReward').addEventListener('click', function(){ toast('Дневная какашка капает при входе из Telegram'); haptic('light'); });
  $('#dailyCipher').addEventListener('click', function(){ toast('Шифр дня — следующая волна'); haptic('light'); });
  $('#dailyCombo').addEventListener('click', function(){
    document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('on'); });
    document.querySelectorAll('.screen').forEach(function(x){ x.classList.remove('on'); });
    document.querySelector('.tab[data-scr="scr-job"]').classList.add('on');
    document.getElementById('scr-job').classList.add('on');
    var fr = $('#fridge');
    if (fr && fr.scrollIntoView) try { fr.scrollIntoView({ block:'start' }); } catch(e){}
    haptic('light');
  });

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('on'); });
      document.querySelectorAll('.screen').forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      document.getElementById(t.dataset.scr).classList.add('on');
      haptic('light');
    });
  });
