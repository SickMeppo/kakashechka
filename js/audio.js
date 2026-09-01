/* ---------- sound ---------- */
  var actx = null;
  function ac(){
    if (S.muted) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq, dur, type, gain, delay, slideTo){
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain || .12, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + .02);
  }
  var snd = {
    squish: function(){ beep(160 + Math.random()*80, .09, 'triangle', .11, 0, 90); },
    thud:   function(){ beep(70, .1, 'triangle', .2); },
    buy:    function(){ beep(520,.08,'sine',.14); beep(680,.1,'sine',.14,.09); },
    open:   function(){ [392,523,659].forEach(function(f,i){ beep(f,.14,'sine',.15,i*.09); }); },
    gold:   function(){ [523,659,784,1046].forEach(function(f,i){ beep(f,.16,'sine',.16,i*.09); }); }
  };
  function haptic(kind, notif){
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (notif) tg.HapticFeedback.notificationOccurred(kind);
      else tg.HapticFeedback.impactOccurred(kind);
    } catch(e){}
  }
