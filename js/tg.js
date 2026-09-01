/* ---------- Telegram ---------- */
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    try { tg.ready(); } catch(e){}
    try { tg.expand(); } catch(e){}
    try { if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes(); } catch(e){}
    try { tg.setHeaderColor('#d7ece8'); tg.setBackgroundColor('#d7ece8'); } catch(e){}
    try { if (tg.setBottomBarColor) tg.setBottomBarColor('#c9e0db'); } catch(e){}
    function pinH(){
      var h = Math.round(tg.viewportStableHeight || tg.viewportHeight || window.innerHeight);
      if (h > 0) document.documentElement.style.setProperty('--app-h', h + 'px');
    }
    pinH();
    try {
      if (tg.onEvent) tg.onEvent('viewportChanged', function(){
        pinH();
        if (!tg.isExpanded) { try { tg.expand(); } catch(e){} }
      });
    } catch(e){}
    document.addEventListener('touchmove', function(e){
      var n = e.target;
      while (n && n !== document.body){
        if (n.classList && n.classList.contains('scr-pad')){
          if (n.scrollHeight > n.clientHeight) return;
        }
        n = n.parentNode;
      }
      e.preventDefault();
    }, { passive:false });
  }
  var tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  var startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ? tg.initDataUnsafe.start_param : '';
  var API = 'https://kakashechka.com';
  $('#userName').textContent = tgUser ? (tgUser.first_name || 'Игрок') : 'Демо';
  $('.ava').textContent = tgUser ? ((tgUser.first_name || 'И')[0].toUpperCase()) : 'Д';
