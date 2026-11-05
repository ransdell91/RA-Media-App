/* R&A apps: how links to other sites open (Claude, Google Drive, sources).
   One choice per device, shared by every R&A app, set in Settings → Display.
     tab    : the browser's normal behaviour (a new tab in the main browser window)
     window : a separate window of its own
     apps   : on a computer, Claude links open in the Claude desktop app and the rest
              in a separate window; on a phone, the link is left for the phone's own
              apps (Drive, Claude) to pick up. */
(function () {
  'use strict';
  var KEY = 'ra-links';
  var MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function get() { try { var v = localStorage.getItem(KEY); return v === 'window' || v === 'apps' ? v : 'tab'; } catch (e) { return 'tab'; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function openWindow(url) {
    var w = Math.min(1280, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80);
    var l = Math.max(0, Math.round((screen.availWidth - w) / 2)), t = Math.max(0, Math.round((screen.availHeight - h) / 2));
    var win = window.open(url, '_blank', 'popup=yes,noopener,width=' + w + ',height=' + h + ',left=' + l + ',top=' + t);
    /* With noopener, window.open returns null even when it worked, so there is no reliable "blocked" signal. */
    return win;
  }
  function claudeApp(u) { return u.hostname === 'claude.ai' ? 'claude://claude.ai' + u.pathname + u.search + u.hash : null; }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.origin === location.origin) return;
    var mode = get(); if (mode === 'tab') return;
    if (MOBILE) { if (mode === 'apps') return; e.preventDefault(); window.open(u.href, '_blank', 'noopener'); return; }
    e.preventDefault();
    if (mode === 'apps') { var c = claudeApp(u); if (c) { location.href = c; return; } }
    openWindow(u.href);
  }, true);
  window.RALinks = {
    get: get, set: set, mobile: MOBILE,
    options: [['tab', 'Tab'], ['window', 'Window'], ['apps', 'Apps']],
    help: MOBILE
      ? 'Tab: a new browser tab. Window: a window of its own. Apps: your phone’s Claude and Drive apps. Only changes this device.'
      : 'Tab: a new tab in your browser. Window: a window of its own. Apps: Claude links in the Claude desktop app, the rest in a window of its own. Only changes this computer.'
  };
})();
