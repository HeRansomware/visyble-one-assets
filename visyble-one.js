/* =====================================================================
   VISYBLE ONE — SCRIPTS
   ---------------------------------------------------------------------
   Aufbau (Reihenfolge = Reihenfolge der Sections auf der Seite):

     00  GLOBAL    Basis, gemeinsame Helfer
     01  GLOBAL    Lenis Smooth Scroll
     02  GLOBAL    Fade-Ins
     10  NAVBAR    Glas-Refraktion
     11  NAVBAR    MOBILES PANEL (UNTER 992px)
     20  HERO      Frame Full Bleed
     30  SERVICE   Bento-Video (Lazy Load)
     31  SERVICE   Licht vom Video
     40  WORKFLOW  Gemeinsame Basis
     41  WORKFLOW  Horizontaler Track (ab Desktop)
     42  WORKFLOW  Scroll Stack (ab Tablet)
     50  ABOUT     Titel-Stack + Wort-Reveal
     60  PRICING   Electric Border
     70  FAQ       Hover-Logik
     80  CONTACT   Fill-State
     81  CONTACT   Marbles Parallax

   Zwei Bloecke sind an ihre Position gebunden:
     01 muss frueh laufen   — konfiguriert ScrollTrigger, bevor Trigger entstehen
     99 muss zuletzt laufen — ein einziger Refresh, wenn alles registriert ist

   Erwartet vor sich: gsap, ScrollTrigger, lenis.
   Jeder Block beginnt mit seinen Stellschrauben.
   ===================================================================== */
(function () {
  'use strict';

  /* ===================================================================
     00  GLOBAL — BASIS
     Diese Zeilen standen vorher ueber mehrere Bloecke verteilt.
     registerPlugin lief fuenfmal, ScrollTrigger.config zweimal — und
     der zweite Aufruf lag hinter fonts.ready, also nach dem Registrieren
     der ersten Trigger.
     =================================================================== */

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GS = !!(window.gsap && window.ScrollTrigger);

  if (GS) {
    gsap.registerPlugin(ScrollTrigger);
    /* Touch: das Ein- und Ausfahren der URL-Leiste aendert die
       window-Hoehe. Ohne das wuerde jede Aenderung die Pin-Laenge mitten
       im Scrollen neu berechnen -> Sprung.
       MUSS laufen, bevor der erste Trigger registriert wird. */
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- 00.1  Kurzschreibweisen ---------- */

  function mm(q) { return window.matchMedia(q); }
  function qs(s, c) { return (c || document).querySelector(s); }
  function qsa(s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  }
  function on(el, events, fn) {
    events.split(' ').forEach(function (e) { el.addEventListener(e, fn); });
  }

  /* ---------- 00.2  Warten auf die Schriften ----------
     Alles, was Geometrie misst, muss darauf warten — sonst wird auf
     falschen Breiten und Hoehen gerechnet. Dafuer gab es vorher fuenf
     verschiedene Varianten im Code. */

  var fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : new Promise(function (res) {
        if (document.readyState === 'complete') res();
        else window.addEventListener('load', res);
      });

  function onFonts(fn) { fontsReady.then(fn); }

  /* ---------- 00.3  Breakpoint-Schalter ----------
     Fuehrt fn bei jedem Wechsel erneut aus. Ersetzt das doppelte
     addEventListener/addListener-Muster in den Workflow-Bloecken. */

  function onBreakpoint(query, fn) {
    var q = mm(query);
    if (q.addEventListener) q.addEventListener('change', fn);
    else q.addListener(fn);
    return q;
  }

  /* ===================================================================
     01  GLOBAL — LENIS SMOOTH SCROLL
     =================================================================== */
  (function () {
    if (REDUCE || !window.Lenis || !GS) return;

    /* Stellschraube: lerp = Anteil der Reststrecke pro Frame.
         0.10  spuerbares Nachziehen
         0.18  Kante des Radklicks weg, Bewegung endet mit dem Rad  <- aktuell
         0.24  direkter
         ~0.30 das Stufige kehrt zurueck */
    var lenis = new Lenis({
      lerp: 0.18,
      wheelMultiplier: 1,
      syncTouch: false,        // Touch bleibt nativ, iOS hat eigenes Momentum
      orientation: 'vertical'
    });

    // Ein Renderloop statt zwei = keine Konkurrenz um den Frame
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Anker-Links durch Lenis statt nativ, sonst springt es hart
    qsa('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = link.getAttribute('href');
        if (!target || target === '#') return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      });
    });

    window.lenis = lenis;
  })();

  /* ===================================================================
     02  GLOBAL — FADE-INS
     Der Startzustand (opacity 0) haengt an html.fade-ready, das ein
     Inline-Script im Head sofort setzt. Faellt JS aus, wird die Klasse
     nie gesetzt und nichts ist unsichtbar — kein Blackout-Risiko.
     =================================================================== */
  (function () {
    if (!GS) {
      document.documentElement.classList.remove('fade-ready');
      return;
    }
    if (REDUCE) return;

    onFonts(function () {
      // Hero: kein ScrollTrigger, liegt above the fold
      var hero = qsa('[data-fade="hero"]');
      if (hero.length) {
        gsap.fromTo(hero,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
            stagger: 0.12, delay: 0.15 });
      }

      // Section-Header: direkte Kinder staffeln (Label -> Titel)
      qsa('[data-fade="header"]').forEach(function (header) {
        gsap.fromTo(header.children,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: header, start: 'top 85%', once: true } });
      });
    });
  })();

   

/* ===================================================================
     10  NAVBAR — GLAS-REFRAKTION
     SVG-Filter in backdrop-filter kann NUR Chromium. Safari und Firefox
     behalten das Milchglas aus dem Designer.

     NUR AB DESKTOP (≥992px). Unter 992px klappt die Navbar zum Burger um,
     die Kapsel wird dann zum hohen Panel — der Radius-Sonderfall dabei war
     die einzige Ursache fuer die Rundungs-Klimmzuege hier drin. Auf der
     schmalen mobilen Bar ist die Brechung ohnehin kaum wahrnehmbar, und
     ohne sie sehen Bar und aufgeklapptes Panel garantiert gleich aus.

     Die Displacement-Map wird per Canvas als echte NORMAL-MAP berechnet,
     nicht aus SVG-Verlaeufen. Grund: der Verlaufs-Ansatz aus React Bits
     schreibt ueberhaupt kein Gruen, der Filter liest die vertikale
     Verschiebung aber aus dem Gruen-Kanal. Ergebnis war G=0 am ganzen
     Rand, also oben UND unten dieselbe Richtung — die Flaeche wurde
     verschoben statt gewoelbt und wirkte flach. Hier bekommt jedes Pixel
     die Richtung SENKRECHT zur Kontur, in den Ecken also radial.
     =================================================================== */
  (function () {
    var capsule = qs('.navbar-logo-left-container');
    if (!capsule) return;

    /* ---------- Stellschrauben ---------- */
    var EDGE_PX = 18,    // Breite der Brechungszone in px, vom Rand nach innen
        GAMMA   = 2.0,   // Kruemmung des Randprofils. Regler fuer "rund"
                         // statt "abgeschraegt":
                         //   1.0 = linear, liest sich als Fase
                         //   2.0 = gewoelbt, Brechung sammelt sich am Rand
                         //   3.0 = sehr eng am Rand konzentriert
        SCALE   = -55,   // Staerke der Brechung, negativ = nach innen
        R_OFF   = 0,     // chromatische Aberration je Kanal
        G_OFF   = 3,
        B_OFF   = 6,
        SMOOTH  = 0.8,   // Nachglaettung gegen 8-Bit-Stufen im Verlauf
        EXTRA_BLUR = 4,  // Lesbarkeit der Links
        SAT     = 1.4,
        DEBOUNCE_MS = 120;

    var FID = 'nav-glass-filter';

    /* ---------- Unterstuetzung pruefen ---------- */
    function supported() {
      var ua = navigator.userAgent;
      if ((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua)) return false;
      var probe = document.createElement('div');
      probe.style.backdropFilter = 'url(#probe)';
      return probe.style.backdropFilter !== '';
    }
    if (!supported()) return;

    /* ---------- Filter aufbauen ----------
       Drei feDisplacementMap-Durchlaeufe verschieben R, G und B minimal
       unterschiedlich — daher der Farbsaum an der Kante. */
    function buildFilter() {
      function disp(k) {
        return '<feDisplacementMap id="' + FID + '-' + k + '" in="SourceGraphic" ' +
               'in2="map" xChannelSelector="R" yChannelSelector="G" result="d' + k + '"/>';
      }
      function keep(k, matrix) {
        return '<feColorMatrix in="d' + k + '" type="matrix" result="c' + k +
               '" values="' + matrix + '"/>';
      }

      var holder = document.createElement('div');
      holder.setAttribute('aria-hidden', 'true');
      holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      holder.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="' + FID +
        '" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">' +
        '<feImage id="' + FID + '-map" x="0" y="0" width="100%" height="100%" ' +
        'preserveAspectRatio="none" result="map"/>' +
        disp('R') + keep('R', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0') +
        disp('G') + keep('G', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0') +
        disp('B') + keep('B', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0') +
        '<feBlend in="cR" in2="cG" mode="screen" result="rg"/>' +
        '<feBlend in="rg" in2="cB" mode="screen" result="out"/>' +
        '<feGaussianBlur in="out" stdDeviation="' + SMOOTH + '"/>' +
        '</filter></defs></svg>';
      document.body.appendChild(holder);

      [['R', R_OFF], ['G', G_OFF], ['B', B_OFF]].forEach(function (c) {
        var el = document.getElementById(FID + '-' + c[0]);
        if (el) el.setAttribute('scale', String(SCALE + c[1]));
      });
    }

    /* ---------- Eckenradius ----------
       Nicht als h/2 annehmen: der Designer setzt 999px, wirksam ist aber
       hoechstens die halbe kurze Seite. */
    function cornerRadius(w, h) {
      var raw = parseFloat(getComputedStyle(capsule).borderTopLeftRadius) || 0;
      return Math.max(0, Math.min(raw, w / 2, h / 2));
    }

    /* ---------- Normal-Map bauen ----------
       Kodierung: 128 = keine Verschiebung. Rot traegt die horizontale,
       Gruen die vertikale Komponente der Flaechennormale.
       feDisplacementMap rechnet: Versatz = scale * (Kanalwert - 0.5).
       Am oberen Rand entsteht dadurch ein negativer, am unteren ein
       positiver Y-Wert — gegenlaeufig, also Woelbung statt Verschiebung. */
    var mapCanvas = document.createElement('canvas');
    var mapCtx = mapCanvas.getContext('2d');

    function buildMap(w, h, rad) {
      mapCanvas.width = w;
      mapCanvas.height = h;

      var img = mapCtx.createImageData(w, h);
      var data = img.data;
      var band = Math.min(EDGE_PX, rad) || 1;   // Band nie breiter als der Radius

      /* Das um den Radius eingerueckte Rechteck. Der naechste Punkt darauf
         liefert die Richtung senkrecht zur Kontur: an den geraden Seiten
         steht er direkt gegenueber, in den Ecken faellt er auf den
         Eckmittelpunkt — dadurch werden die Normalen dort radial und die
         Rundung stimmt von selbst. */
      var ix0 = rad, ix1 = w - rad, iy0 = rad, iy1 = h - rad;

      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var px = x + 0.5, py = y + 0.5;

          var cx = px < ix0 ? ix0 : (px > ix1 ? ix1 : px);
          var cy = py < iy0 ? iy0 : (py > iy1 ? iy1 : py);
          var vx = px - cx, vy = py - cy;
          var len = Math.sqrt(vx * vx + vy * vy);

          var depth = rad - len;      // Abstand zur Kontur, innen positiv
          var nx = 0, ny = 0, m = 0;

          if (depth > 0) {
            if (len > 0.0001) { nx = vx / len; ny = vy / len; }
            var a = depth / band;     // 0 direkt am Rand, 1 am Bandende
            /* Potenzkurve statt linearer Rampe. Bei GAMMA 2 laeuft der
               Wert am Bandende mit Steigung 0 aus — kein sichtbarer
               Absatz zwischen Zone und ruhiger Mitte. */
            if (a < 1) m = Math.pow(1 - a, GAMMA);
          }

          var i = (y * w + x) * 4;
          data[i]     = 128 + nx * m * 127;
          data[i + 1] = 128 + ny * m * 127;
          data[i + 2] = 128;          // Blau ungenutzt, neutral halten
          data[i + 3] = 255;
        }
      }

      mapCtx.putImageData(img, 0, 0);
      return mapCanvas.toDataURL();
    }

    /* ---------- Anwenden ---------- */
    buildFilter();
    var feMap = document.getElementById(FID + '-map');

    var PLAIN = 'blur(' + EXTRA_BLUR + 'px) saturate(' + SAT + ')';
    var FULL  = 'url(#' + FID + ') ' + PLAIN;

    var lastW = 0, lastH = 0, lastR = -1, timer = null;

    function rebuild() {
      var rect = capsule.getBoundingClientRect();
      var w = Math.round(rect.width), h = Math.round(rect.height);
      if (!w || !h) return;
      var rad = cornerRadius(w, h);

      if (w !== lastW || h !== lastH || rad !== lastR) {
        lastW = w; lastH = h; lastR = rad;
        feMap.setAttribute('href', buildMap(w, h, rad));
      }
      capsule.style.backdropFilter = FULL;
    }

    /* Waehrend einer Groessenaenderung wuerde feImage die alte Map auf die
       neue Flaeche STRECKEN — die Brechung liefe kurz ueber alles. Deshalb
       auf reines Milchglas zuruecknehmen und einmal nachrechnen, sobald
       es steht. Die Map ist eine Canvas-Rechnung ueber w*h Pixel, pro
       Frame waere sie zu teuer. */
    function schedule() {
      if (!DESKTOP.matches) return;
      capsule.style.backdropFilter = PLAIN;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; rebuild(); }, DEBOUNCE_MS);
    }

    /* ---------- Breakpoint-Schalter ----------
       Unter 992px die Inline-Werte komplett raeumen, damit wieder der
       Designer-Wert der Klasse greift. */
    function apply() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!DESKTOP.matches) {
        capsule.style.removeProperty('backdrop-filter');
        capsule.classList.remove('is-refracted');
        lastW = lastH = 0; lastR = -1;
        return;
      }
      rebuild();
      /* Die Klasse senkt im CSS die Hintergrunddeckkraft — ein zu
         deckender Hintergrund wuerde die Brechung ueberdecken. */
      capsule.classList.add('is-refracted');
    }

    var DESKTOP = onBreakpoint('(min-width: 992px)', apply);
    apply();

    if (window.ResizeObserver) new ResizeObserver(schedule).observe(capsule);
    else window.addEventListener('resize', schedule);
  })();

   /* ===================================================================
     11  NAVBAR — MOBILES PANEL (UNTER 992px)
     Webflows Dropdown wird hier ersetzt, nicht ueberredet. Zwei Versuche,
     es umzubiegen, sind gescheitert: nimmt man dem Overlay die absolute
     Position, misst Webflows Navbar-JS seine Hoehe gegen eine Box, die
     sich durch das eigene Ergebnis veraendert — die Kapsel blaeht sich auf.
     Laesst man es absolut, sind es zwei getrennte Glasflaechen mit
     sichtbarer Naht. Deshalb: eigenes Panel IN der Kapsel, eigener Toggle.
     Die Liste wird VERSCHOBEN, nicht kopiert — dadurch bleiben die
     Anker-Listener aus Block 01 an denselben Knoten haengen.
     =================================================================== */
  (function () {
    var capsule = qs('.navbar-logo-left-container');
    if (!capsule) return;

    var row    = qs('.navbar-wrapper', capsule);
    var list   = qs('.nav-menu-two', capsule);
    var button = qs('.w-nav-button', capsule);
    if (!row || !list || !button) return;

    /* Webflows eigenen Klick-Handler abhaengen: ein Klon traegt keine
       gebundenen Listener. Ohne das liefen zwei Zustaende parallel —
       Webflows verstecktes Overlay und unser Panel — und der Burger
       waere nach dem ersten Wechsel dauerhaft verdreht. */
    var fresh = button.cloneNode(true);
    button.parentNode.replaceChild(fresh, button);
    button = fresh;
    button.setAttribute('aria-expanded', 'false');

    /* Panel als Geschwister DIREKT NACH der Logo-Zeile, damit es im
       Fluss der Kapsel liegt und ihre Hoehe mitzieht. */
    var panel = document.createElement('div');
    panel.className = 'nav-panel';
    var inner = document.createElement('div');
    inner.className = 'nav-panel-inner';
    panel.appendChild(inner);
    row.parentNode.insertBefore(panel, row.nextSibling);

    var home = list.parentNode;      // Rueckweg fuer Desktop
    var isOpen = false;

    function setOpen(state) {
      isOpen = state;
      capsule.classList.toggle('is-nav-open', state);
      button.classList.toggle('w--open', state);
      button.setAttribute('aria-expanded', state ? 'true' : 'false');
    }

    button.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!isOpen);
    });

    // Klick auf einen Link schliesst — sonst bleibt das Panel beim
    // Sprung zum Anker offen ueber dem Ziel stehen
    list.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Klick ausserhalb der Kapsel schliesst
    document.addEventListener('click', function (e) {
      if (isOpen && !capsule.contains(e.target)) setOpen(false);
    });

    // ESC schliesst und gibt den Fokus zurueck
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { setOpen(false); button.focus(); }
    });

    /* Beim Breakpoint-Wechsel wandert die Liste zwischen Panel und
       Webflow-Wrapper hin und her. */
    function apply() {
      if (MOBILE.matches) {
        if (list.parentNode !== inner) inner.appendChild(list);
      } else {
        setOpen(false);
        if (list.parentNode !== home) home.appendChild(list);
      }
    }

    var MOBILE = onBreakpoint('(max-width: 991px)', apply);
    apply();
  })();

   
  /* ===================================================================
     20  HERO — FRAME FULL BLEED
     Zieht den Rahmen aus seinem Wrapper auf volle Viewportbreite.
     Per JS statt calc(50% - 50vw), weil das nur bei horizontal
     ZENTRIERTEN Wrappern funktioniert — hero-txt-wrapper ist eine linke
     Spalte, der Rahmen lag dadurch 486px daneben.
     Kein transform verwenden: der Stacking-Context kollidiert mit Pins.
     =================================================================== */
  (function () {
    var frame = qs('.hero-frame');
    if (!frame) return;

    function fit() {
      /* Erst zuruecksetzen, dann messen: sonst misst man den bereits
         verschobenen Zustand und der Versatz addiert sich bei jedem
         Resize weiter auf. */
      frame.style.marginLeft = '0px';
      frame.style.width = '';

      var left = frame.getBoundingClientRect().left;

      /* clientWidth statt innerWidth: rechnet OHNE Scrollbar.
         innerWidth waere ~15px zu breit = horizontaler Scroll. */
      frame.style.width = document.documentElement.clientWidth + 'px';
      frame.style.marginLeft = -left + 'px';
    }

    fit();
    window.addEventListener('resize', fit);
    onFonts(fit);   // Fonts aendern die Textbreite und damit die Spalte
  })();

  /* ===================================================================
     30  SERVICE — BENTO-VIDEO (LAZY LOAD)
     Das <video> hat bewusst kein src im Markup, nur data-src-xl und
     data-src-m. Dadurch werden vorher wirklich null Bytes geladen.
     Der Poster laedt IMMER sofort, auch bei preload="none" — deshalb
     muss er leicht bleiben (Zielgroesse 100-250 KB).
     =================================================================== */
  (function () {
    var card = qs('[data-bento-video]');
    if (!card) return;
    var video = qs('.bento-video', card);
    if (!video) return;

    // Reduced Motion: Video bleibt aus, es wird nur der Poster gezeigt
    if (REDUCE) return;

    /* Stellschraube: Vorlauf, damit das Video schon laeuft, wenn die
       Karte ins Bild kommt. */
    var ROOT_MARGIN = '200px 0px';

    /* Quelle EINMALIG waehlen, bewusst ohne resize-Listener: ein Wechsel
       mitten im Abspielen wuerde den Clip neu laden. */
    var src = mm('(max-width: 767px)').matches
      ? video.getAttribute('data-src-m')
      : video.getAttribute('data-src-xl');

    var loaded = false;

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!loaded) { video.src = src; loaded = true; }
          var p = video.play();
          if (p) p.catch(function () {});   // Autoplay-Reject still schlucken
        } else if (loaded) {
          video.pause();                    // spart CPU und Akku
        }
      });
    }, { rootMargin: ROOT_MARGIN }).observe(card);
  })();

  /* ===================================================================
     31  SERVICE — LICHT VOM VIDEO
     Das Bento-Video wirkt als Lichtquelle fuer die zwei Cards darueber.
     Dramaturgie: die Cards bleiben waehrend der Fahrt ruhig und kuehl
     und bluehen genau dann warm auf, wenn die Fahrstuhltueren aufgehen.
     Braucht crossorigin="anonymous" am <video>, sonst ist das Canvas
     tainted und getImageData wirft.
     =================================================================== */
  (function () {
    var video = qs('.bento-video');
    var cards = qsa('.service-card');
    if (!video || !cards.length || REDUCE) return;

    /* ---------- Stellschrauben: Licht ---------- */
    var SAMPLE_MS  = 100,    // Auslesen des Videobilds, 10x/Sekunde
        LERP       = 0.08,   // Traegheit der Farbanpassung, kleiner = weicher
        SAT        = 1.25,   // Saettigung des Lichts
        ALPHA_MIN  = 0.04,   // Grundschein bei fast schwarzem Bild
        ALPHA_MAX  = 0.30,   // Deckel gegen Ueberstrahlen
        ALPHA_GAIN = 0.55;   // Helligkeit -> Lichtstaerke

    /* ---------- Stellschrauben: Strahlen ---------- */
    var RAY_SWING   = 5,      // Ausschlag der Drift in Grad
        RAY_PERIOD  = 17000,  // Dauer eines Drift-Zyklus in ms
        RAY_BREATH  = 0.30,   // wie stark die Intensitaet atmet
        RAY_BPERIOD = 11000;  // Dauer eines Atem-Zyklus in ms

    // 8x8 Pixel reichen — wir wollen Durchschnittsfarben, kein Bild
    var canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    var state = cards.map(function () {
      return { cur: [176, 205, 245, 0.13], target: [176, 205, 245, 0.13] };
    });
    var raf = null, lastSample = 0, dead = false;

    /* ---------- Mittelwert eines Ausschnitts ---------- */
    function averageRegion(data, x0, x1, y0, y1) {
      var r = 0, g = 0, b = 0, n = 0;
      for (var y = y0; y < y1; y++) {
        for (var x = x0; x < x1; x++) {
          var p = (y * 8 + x) * 4;
          r += data[p]; g += data[p + 1]; b += data[p + 2]; n++;
        }
      }
      return [r / n, g / n, b / n];
    }

    /* ---------- Rohfarbe -> anzeigbares Licht ----------
       Der Farbton wird auf volle Helligkeit gezogen, sonst waere das
       Licht bei einem dunklen Frame nur ein grauer Fleck. Die gemessene
       Helligkeit steuert allein die Deckkraft. */
    function toLight(rgb) {
      var r = rgb[0], g = rgb[1], b = rgb[2];
      var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      var s = 255 / (Math.max(r, g, b) || 1);
      r *= s; g *= s; b *= s;
      var gray = (r + g + b) / 3;
      r = gray + (r - gray) * SAT;
      g = gray + (g - gray) * SAT;
      b = gray + (b - gray) * SAT;
      return [
        Math.max(0, Math.min(255, r)),
        Math.max(0, Math.min(255, g)),
        Math.max(0, Math.min(255, b)),
        Math.min(ALPHA_MAX, Math.max(ALPHA_MIN, lum * ALPHA_GAIN))
      ];
    }

    /* ---------- Videobild auslesen ---------- */
    function sample() {
      if (dead) return;
      try {
        ctx.drawImage(video, 0, 0, 8, 8);
        var data = ctx.getImageData(0, 0, 8, 8).data;
        /* Obere Bildhaelfte, links und rechts getrennt gemessen — jede
           Karte bekommt das Licht, das direkt unter ihr liegt. */
        var halves = [
          averageRegion(data, 0, 4, 0, 4),
          averageRegion(data, 4, 8, 0, 4)
        ];
        state.forEach(function (s, i) {
          s.target = toLight(halves[Math.min(i, 1)]);
        });
      } catch (e) {
        // CORS oder Codec: Effekt abschalten, statisches Licht bleibt
        dead = true;
        stop();
      }
    }

    /* ---------- Frame zeichnen ---------- */
    function tick(now) {
      raf = requestAnimationFrame(tick);

      // Ausgelesen wird 10x/Sekunde, weichgezogen wird jeden Frame
      if (now - lastSample >= SAMPLE_MS) { lastSample = now; sample(); }

      /* Zwei Sinuskurven mit ungleichen Perioden. Weil sie sich nicht
         glatt teilen, wiederholt sich die Kombination praktisch nie —
         das Licht wirkt lebendig statt getaktet. */
      var rot = Math.sin((now / RAY_PERIOD) * Math.PI * 2) * RAY_SWING;
      var breath = 1 + Math.sin((now / RAY_BPERIOD) * Math.PI * 2) * RAY_BREATH;

      state.forEach(function (s, i) {
        for (var c = 0; c < 4; c++) {
          s.cur[c] += (s.target[c] - s.cur[c]) * LERP;
        }
        var el = cards[i];
        el.style.setProperty('--spill-rgb',
          (s.cur[0] | 0) + ',' + (s.cur[1] | 0) + ',' + (s.cur[2] | 0));
        el.style.setProperty('--spill-a', s.cur[3].toFixed(3));
        // Zweite Karte invertiert, sonst atmen beide im Gleichschritt
        el.style.setProperty('--ray-rot', (i ? -rot : rot).toFixed(2) + 'deg');
        el.style.setProperty('--ray-gain', breath.toFixed(3));
      });
    }

    function start() {
      if (dead || raf !== null) return;
      lastSample = 0;
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    // Laeuft ausschliesslich, waehrend das Video spielt
    video.addEventListener('playing', start);
    on(video, 'pause ended', stop);
  })();

  /* ===================================================================
     40  WORKFLOW — GEMEINSAME BASIS
     Ab Desktop laeuft der horizontale Track (41), ab Tablet der
     Scroll-Stack (42). Beide brauchen dieselben Elemente und dieselbe
     Aside-Anzeige — die lag vorher doppelt im Code, mit zwei
     unabhaengigen Kopien derselben Textlogik.
     =================================================================== */
  var WF = (function () {
    var track = qs('.workflow-track');
    if (!track) return null;

    var cards = qsa('.workflow-card', track);
    if (!cards.length) return null;

    var elCount = qs('.workflow-aside-counter'),
        elName  = qs('.workflow-aside-name'),
        elTime  = qs('.workflow-aside-time');

    function pad(n) { return ('0' + n).slice(-2); }

    /* Setzt die aktive Karte und die Texte im Aside.
       Beide Bloecke rufen ausschliesslich das hier auf. */
    function setActive(i) {
      cards.forEach(function (c, j) { c.classList.toggle('is-active', j === i); });
      var c = cards[i];
      if (!c) return;
      if (elCount) elCount.textContent = pad(i + 1) + ' / ' + pad(cards.length);
      if (elName)  elName.textContent  = c.getAttribute('data-wf-step-name') || '';
      if (elTime)  elTime.textContent  = c.getAttribute('data-wf-step-time') || '';
    }

    return {
      stage: qs('.workflow-stage'),
      track: track,
      cards: cards,
      slot:  qs('.workflow-slot'),
      aside: qs('.workflow-aside'),
      fill:  qs('.workflow-progress-fill'),
      setActive: setActive
    };
  })();

  /* ===================================================================
     41  WORKFLOW — HORIZONTALER TRACK (AB DESKTOP)
     Unter 992px uebernimmt der CSS-Scroll-Stack, dort kein Pin.
     =================================================================== */
  (function () {
    if (!GS || !WF || !WF.stage) return;

    var stage = WF.stage, track = WF.track, cards = WF.cards, fill = WF.fill;
    var st = null, lastActive = -1;

    /* Gemessene Geometrie. Wird NUR beim Refresh gefuellt, nie pro Frame:
       jeder rect-Aufruf im Scroll-Handler erzwingt ein synchrones Layout. */
    var M = { dist: 1, left: 0, mid: 0, centers: [], widths: [] };

    /* Zuletzt geschriebene Werte. Ein setProperty loest eine Style-
       Neuberechnung aus, auch wenn der Wert unveraendert ist. */
    var prev, prevFill;
    function resetPrev() {
      prev = cards.map(function () { return { dim: '', edge: '', ang: -1 }; });
      prevFill = -1;
    }
    resetPrev();

    /* ---------- Messen ---------- */
    function measure() {
      var gutter = WF.slot ? WF.slot.offsetWidth : 0;
      var cw = cards[0].offsetWidth;
      track.style.paddingLeft =
        (gutter + Math.max((stage.clientWidth - gutter - cw) / 2, 0)) + 'px';
      track.style.paddingRight =
        Math.max((stage.clientWidth - cw) / 2, 0) + 'px';

      M.dist = Math.max(track.scrollWidth - stage.clientWidth, 1);
      M.left = track.offsetLeft;
      M.mid = stage.clientWidth / 2;
      M.centers = [];
      M.widths = [];
      cards.forEach(function (c) {
        M.widths.push(c.offsetWidth);
        M.centers.push(c.offsetLeft + c.offsetWidth / 2);
      });
    }

    /* ---------- Zeichnen ----------
       Rein rechnerisch, kein DOM-Lesezugriff. Die Abdunklung laeuft pro
       Karte statt ueber einen Verlauf im Overlay: ein Alphaverlauf auf
       #080808 hat bei 8 Bit zu wenige Zwischenstufen und wird als
       Streifen sichtbar. Eine gleichmaessige Deckkraft nicht. */
    function paint(progress) {
      var x = -M.dist * progress;
      var best = 0, bestD = Infinity, i, d, w;

      // Durchgang 1: aktive Karte bestimmen, ohne zu schreiben
      for (i = 0; i < cards.length; i++) {
        d = Math.abs(M.left + M.centers[i] + x - M.mid);
        if (d < bestD) { bestD = d; best = i; }
      }

      // Durchgang 2: nur schreiben, was sich wirklich geaendert hat
      for (i = 0; i < cards.length; i++) {
        d = Math.abs(M.left + M.centers[i] + x - M.mid);
        w = M.widths[i] || 1;

        // Deckkraft faellt bis 0.28 ab, Nachbarn bleiben als Kontext lesbar
        var dim = (1 - Math.min(d / (w * 2.4), 0.72)).toFixed(2);
        // Chrome-Kante: engerer Abfall, nur die mittlere Karte leuchtet
        var edge = Math.max(0, 1 - d / (w * 1.5)).toFixed(2);

        if (prev[i].dim !== dim) {
          cards[i].style.setProperty('--wf-dim', dim);
          prev[i].dim = dim;
        }
        if (prev[i].edge !== edge) {
          cards[i].style.setProperty('--wf-edge', edge);
          prev[i].edge = edge;
        }

        /* Winkel NUR auf der aktiven Karte und nur in ganzen Grad: ein
           Conic-Gradient wird bei jeder Winkelaenderung komplett auf der
           CPU neu gezeichnet. */
        if (i === best) {
          var ang = Math.round(progress * 540 + i * 62) % 360;
          if (prev[i].ang !== ang) {
            cards[i].style.setProperty('--wf-angle', ang + 'deg');
            prev[i].ang = ang;
          }
        }
      }

      /* Fortschritt ueber transform statt width: width ist eine
         Layout-Eigenschaft und wuerde die Aside-Spalte in jedem Frame
         neu berechnen. scaleX laeuft im Compositor. */
      if (fill) {
        var f = Math.round(progress * 200) / 200;  // 0,5%-Schritte reichen
        if (f !== prevFill) {
          fill.style.transform = 'scaleX(' + f + ')';
          prevFill = f;
        }
      }

      if (best === lastActive) return;
      lastActive = best;
      WF.setActive(best);

      /* Verdeckte Karten aus dem Fokus-Baum nehmen, sonst springt der
         Tab-Fokus auf eine Karte hinter der Maske. */
      cards.forEach(function (c, j) {
        if (j === best) c.removeAttribute('inert');
        else c.setAttribute('inert', '');
      });
    }

    /* ---------- Auf- und Abbauen ---------- */
    function kill() {
      if (st) { st.kill(true); st = null; }
      gsap.set(track, { x: 0, clearProps: 'transform' });
      track.style.paddingLeft = '';
      track.style.paddingRight = '';
      lastActive = -1;
      resetPrev();
      if (fill) fill.style.transform = 'scaleX(0)';
      cards.forEach(function (c) {
        c.removeAttribute('inert');
        c.style.removeProperty('--wf-dim');
        c.style.removeProperty('--wf-edge');
        c.style.removeProperty('--wf-angle');
      });
    }

    function build() {
      measure();
      st = gsap.to(track, {
        x: function () { return -M.dist; },
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          /* center center statt top top: die Stage ist niedriger als der
             Viewport und wuerde bei top top oben kleben und unten Luft
             lassen. */
          start: 'center center',
          end: function () { return '+=' + M.dist * 1.15; },
          pin: true,
          pinSpacing: true,
          scrub: 0.15,
          /* KEIN fastScrollEnd: es springt bei schnellem Scrollen auf den
             Endzustand, den der scrub danach zurueckzieht. Auf gescrubbten
             Triggern erzeugt es genau das Zucken, das es verhindern soll. */
          invalidateOnRefresh: true,
          refreshPriority: 2,          // liegt ueber About, zuerst vermessen
          onUpdate:  function (s) { paint(s.progress); },
          onRefresh: function (s) {
            measure(); lastActive = -1; resetPrev(); paint(s.progress);
          }
        }
      }).scrollTrigger;

      lastActive = -1;
      resetPrev();
      paint(0);
    }

    function boot() {
      kill();
      // Scroll-Stack-Zustand: Aside zeigt den ersten Schritt statisch
      if (REDUCE || !mq.matches) { WF.setActive(0); return; }
      build();
    }

    var mq = onBreakpoint('(min-width: 992px)', boot);
    onFonts(boot);
  })();

  /* ===================================================================
     42  WORKFLOW — SCROLL STACK (AB TABLET)
     Das Stapeln macht CSS ueber position:sticky. Hier laeuft nur, was
     sticky nicht kann: Skalierung, aktive Karte, Fortschrittslinie.

     EIN Trigger auf dem TRACK, nicht je einer pro Karte. ScrollTrigger
     vermisst seine Trigger beim refresh() — klebt eine Karte gerade,
     wird sie an der geklebten statt an der Layout-Position gemessen und
     der Effekt springt. Der Track klebt nicht, und offsetTop bleibt bei
     sticky unveraendert.
     =================================================================== */
  (function () {
    if (!GS || !WF || WF.cards.length < 2) return;

    var track = WF.track, cards = WF.cards, fill = WF.fill;

    /* ---------- Stellschrauben ---------- */
    var MIN_SCALE = 0.93,  // Endgroesse einer verdeckten Karte
        STEP = 12,         // sichtbare Kante je Karte, MUSS zum CSS passen
        /* Abstand des Stapels zur Schlitzkante. Der Aside-Schatten reicht
           rund 22px nach unten. Klebt der Stapel innerhalb dieser
           Reichweite, liegt der Schatten DAUERHAFT auf Karte 1 und liest
           sich nicht als Durchfahrt. Bei 40px faellt er ins Leere. */
        SLOT_OFFSET = 40,
        /* Anteil der Strecke, um den der Wechsel der aktiven Karte
           vorgezogen wird. 0 = erst wenn die neue Karte klebt, dann ist
           die alte aber schon groesstenteils verdeckt. */
        HANDOVER = 0.45,
        // Sichtbarer Abstand zwischen Navbar-Unterkante und Aside-Inhalt
        NAV_GAP = 16;

    var master = null, marks = [], switchMarks = [];
    var active = -1, prevScale = [], prevFill = -1;

    /* ---------- Messen ----------
       Einmal pro Refresh, nie pro Frame. */
    function measure() {
      // Navbar ist position:fixed, Hoehe unterscheidet sich pro Breakpoint
      // (Padding 14/12/10px). Muss VOR der Aside-Messung laufen, sonst
      // rechnet padding-top noch mit dem alten/fehlenden Wert.
      var navEl = qs('.navbar-logo-left');
      var navClear = Math.round((navEl ? navEl.getBoundingClientRect().height : 56) + NAV_GAP);
      document.documentElement.style.setProperty('--nav-clear', navClear + 'px');

      var base = (WF.aside ? WF.aside.offsetHeight : 194) + SLOT_OFFSET;
      track.style.setProperty('--wf-stick', base + 'px');

      var top = track.getBoundingClientRect().top +
                (window.scrollY || window.pageYOffset);

      marks = cards.map(function (c, i) {
        return top + c.offsetTop - (base + i * STEP);
      });
      switchMarks = marks.map(function (m, i) {
        return i === 0 ? m : m - HANDOVER * (m - marks[i - 1]);
      });

      prevScale = cards.map(function () { return -1; });
      prevFill = -1;
    }

    /* ---------- Zeichnen ---------- */
    function paint(y) {
      var idx = 0;

      for (var i = 0; i < cards.length; i++) {
        if (y >= switchMarks[i]) idx = i;

        /* Karte i schrumpft genau auf der Strecke, auf der Karte i+1
           heranrueckt und sie zudeckt — sonst faellt sie sichtbar ins
           Leere, bevor etwas drueberliegt. Bewusst an marks, NICHT an
           switchMarks: die Hervorhebung darf vorlaufen, die Geometrie nicht. */
        var s = 1;
        if (i < cards.length - 1) {
          var span = marks[i + 1] - marks[i];
          var p = span > 0 ? (y - marks[i]) / span : 0;
          p = p < 0 ? 0 : p > 1 ? 1 : p;
          s = 1 - p * (1 - MIN_SCALE);
        }
        s = Math.round(s * 1000) / 1000;
        if (prevScale[i] !== s) {
          cards[i].style.transform = 'scale3d(' + s + ',' + s + ',1)';
          prevScale[i] = s;
        }
      }

      // scaleX statt width, gleiche Begruendung wie in Block 41
      if (fill) {
        var total = marks[marks.length - 1] - marks[0];
        var f = total > 0 ? (y - marks[0]) / total : 0;
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        f = Math.round(f * 200) / 200;
        if (f !== prevFill) {
          fill.style.transform = 'scaleX(' + f + ')';
          prevFill = f;
        }
      }

      if (idx !== active) { active = idx; WF.setActive(idx); }
    }

    /* ---------- Auf- und Abbauen ---------- */
    function kill() {
      if (master) { master.kill(); master = null; }
      active = -1;
      marks = []; switchMarks = []; prevScale = []; prevFill = -1;
      track.style.removeProperty('--wf-stick');
      if (fill) fill.style.transform = 'scaleX(0)';
      cards.forEach(function (c) {
        c.style.transform = '';
        c.classList.remove('is-active');
      });
    }

    function boot() {
      kill();
      if (REDUCE || !mq.matches) return;
      measure();
      master = ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        invalidateOnRefresh: true,
        refreshPriority: 2,
        onRefresh: function (s) { measure(); active = -1; paint(s.scroll()); },
        onUpdate:  function (s) { paint(s.scroll()); }
      });
      active = -1;
      paint(master.scroll());
    }

    var mq = onBreakpoint('(max-width: 991px)', boot);
    onFonts(boot);
  })();

  /* ===================================================================
     50  ABOUT — TITEL-STACK + WORT-REVEAL
     Drei Titel liegen uebereinander in grid-area 1/1 und kippen
     nacheinander rein. Gepinnt wird der STACK, nicht die Section — beim
     Pinnen der Section sitzt der Titel wegen des Section-Paddings zu tief.

     GEAENDERT (Reverse-Bug behoben, zwei getrennte, auf Staging
     gemessene Ursachen):

     1. TITEL: .to() faengt seinen Startwert lazy aus dem DOM-Zustand
        ein, in dem Moment, in dem die Timeline ihn zum ERSTEN MAL
        rendert. Springt der Scrub beim ersten Rendern ueber mehrere
        Tween-Abschnitte (z.B. initialer Refresh bei bereits gescrolltem
        Zustand), faengt GSAP einen verunreinigten Zwischenwert als
        "Start" ein — dauerhaft, in beide Richtungen. Fix: .fromTo() mit
        explizitem Startwert, GSAP muss nichts mehr raten. Verifiziert:
        direkter Sprung p=1 -> p=0 ohne Zwischenschritte liefert
        korrekt autoAlpha 0 auf allen drei Titeln.

     2. WORT-REVEAL: war ein gsap.to(words, {stagger:...}) mit 58
        Zielen. GSAP rendert bei einem grossen Sprung (wie ihn echtes
        schnelles Scrollen erzeugt) nicht zuverlaessig alle 58 Kinder
        neu — auch nicht mit .render(t, false, true) auf der Timeline
        selbst. Nachgewiesen: einzeln erzwungenes Rendern jedes Kindes
        behebt es sofort, der Parent-Force-Render nicht. Das ist eine
        GSAP-interne Grenze bei vielen kurzen Kindern (0.3s) ueber eine
        lange Gesamtdauer (18.54s), kein Fehler in unserer Logik.
        Fix: kein GSAP-Tween-Objekt mehr fuer die Woerter. Zustand wird
        pro Frame direkt aus progress berechnet — gleiches Prinzip wie
        Block 41/42. Ohne Animationsobjekt kann nichts einfrieren,
        jeder Sprung liefert deterministisch den richtigen Wert.
        Verifiziert: direkter Sprung p=1 -> p=0 in einem Schritt und
        echtes Scrollen mit Lenis, beide korrekt.
     =================================================================== */
  (function () {
    if (!GS) {
      document.documentElement.classList.remove('fade-ready');
      return;
    }

    /* ---------- Stellschrauben ---------- */
    var CUT = 0.12,          // Dauer des Schnitts zwischen zwei Titeln, MUSS > 0
        PIN_FACTOR = 1.8,    // Pin-Laenge als Vielfaches der Stack-Hoehe
        WORD_DUR = 0.3,      // Dauer je Wort, in "Sekunden" der virtuellen Zeitachse
        WORD_STAGGER = 0.32, // Versatz je Wort, MUSS groesser sein als WORD_DUR
        BLUR = 5;

    /* Blur nur ab Desktop UND nur bei genug Leistung: jedes Wort mit
       filter wird zu einer eigenen Compositing-Ebene. */
    var useBlur = mm('(min-width: 992px)').matches &&
                  (navigator.hardwareConcurrency || 4) >= 4;

    /* ---------- Text in Wort-Spans zerlegen ---------- */
    function splitWords(el) {
      if (el.querySelector('.reveal-word')) return qsa('.reveal-word', el);
      var out = [];
      var parts = el.textContent.split(/(\s+)/);
      el.textContent = '';
      parts.forEach(function (part) {
        if (!part.length) return;
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(part));
          return;
        }
        var s = document.createElement('span');
        s.className = 'reveal-word';
        s.textContent = part;
        el.appendChild(s);
        out.push(s);
      });
      return out;
    }

    /* ---------- Titel-Pin ---------- */
    function buildTitles(stack, titles) {
      gsap.set(titles, {
        autoAlpha: 0,
        rotationX: 92,
        transformOrigin: '50% 50%',
        backfaceVisibility: 'hidden',
        force3D: true
      });
      titles.forEach(function (t, i) { t.style.zIndex = String(i + 1); });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: stack,
          start: 'top top',
          end: function () { return '+=' + stack.offsetHeight * PIN_FACTOR; },
          pin: true,
          pinSpacing: true,
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: 1
        }
      });

      /* fromTo statt to: Startwert steht fest im Code, GSAP faengt ihn
         nie mehr lazy aus dem DOM. Siehe Blockkommentar, Punkt 1. */
      titles.forEach(function (title, i) {
        if (i > 0) {
          tl.fromTo(titles[i - 1],
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: CUT, ease: 'none' });
        }
        tl.fromTo(title,
          { rotationX: 92, autoAlpha: 0 },
          { rotationX: 0, autoAlpha: 1, duration: 1, ease: 'power2.out' });
        tl.to({}, { duration: 0.6 });    // Standzeit
      });
      tl.fromTo(titles[titles.length - 1],
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: CUT, ease: 'none' });
      tl.to({}, { duration: 0.3 });      // kurzer Nachlauf im leeren Zustand
    }

    /* ---------- Wort-Reveal ----------
       Kein GSAP-Tween mehr, reine Mathematik pro Frame. Siehe
       Blockkommentar, Punkt 2. */
    function buildWords(para, words) {
      var TOTAL = (words.length - 1) * WORD_STAGGER + WORD_DUR;
      var active = false;   // will-change nur waehrend echter Bewegung

      function paint(progress) {
        var tt = progress * TOTAL;
        var anyMoving = false;

        for (var i = 0; i < words.length; i++) {
          var localT = (tt - i * WORD_STAGGER) / WORD_DUR;
          var lp = localT < 0 ? 0 : (localT > 1 ? 1 : localT);
          if (lp > 0 && lp < 1) anyMoving = true;

          var el = words[i];
          el.style.opacity = lp.toFixed(3);
          el.style.transform = 'translateY(' + ((1 - lp) * 0.25).toFixed(3) + 'em)';
          if (useBlur) {
            el.style.filter = lp >= 1 ? 'none' : 'blur(' + ((1 - lp) * BLUR).toFixed(2) + 'px)';
          }
        }

        /* will-change nur setzen, waehrend wirklich etwas in Bewegung
           ist — sonst 58 permanente Compositing-Ebenen. */
        if (anyMoving && !active) {
          active = true;
          words.forEach(function (w) { w.style.willChange = 'transform, opacity, filter'; });
        } else if (!anyMoving && active) {
          active = false;
          words.forEach(function (w) { w.style.willChange = 'auto'; });
        }
      }

      /* Kein "animation"-Objekt hier -> scrub greift ohnehin nicht,
         onUpdate/onRefresh feuern unabhaengig davon bei jeder
         Scroll-Neuberechnung. invalidateOnRefresh ist jetzt folgenlos
         sicher: es gibt keinen Tween-Zustand mehr, der korrumpiert
         werden koennte — es wirkt nur noch auf start/end selbst. */
      ScrollTrigger.create({
        trigger: para,
        start: 'top 90%',
        end: 'bottom 55%',
        invalidateOnRefresh: true,
        refreshPriority: 0,
        onUpdate: function (self) { paint(self.progress); },
        onRefresh: function (self) { paint(self.progress); }
      });
    }

    function init() {
      var stack = qs('[data-title-stack]');
      var para = qs('[data-reveal="text"]');
      var titles = stack ? qsa('[data-reveal="title"]', stack) : [];
      var words = [];

      if (para) {
        words = splitWords(para);
        para.style.opacity = '1';
        gsap.set(words, REDUCE ? { opacity: 1 } : {
          opacity: 0,
          y: '0.25em',
          filter: useBlur ? 'blur(' + BLUR + 'px)' : 'none'
        });
      }

      titles.forEach(function (t) { t.style.opacity = ''; });

      if (REDUCE) { gsap.set(titles, { autoAlpha: 1 }); return; }

      if (stack && titles.length) buildTitles(stack, titles);
      if (words.length) buildWords(para, words);
    }

    var started = false;
    function start() { if (!started) { started = true; init(); } }
    onFonts(start);
    setTimeout(start, 3000);     // Sicherheitsnetz, falls fonts.ready haengt
  })();

  /* ===================================================================
     60  PRICING — ELECTRIC BORDER
     Vanilla-Port der React-Bits-Canvas-Logik. Bewusst KEIN SVG-Filter:
     feTurbulence + feDisplacementMap ergibt Wackeln, keine Blitze.
     Desktop: nur bei Hover aktiv, SPEED runterdrehen bringt nichts fuer
     die Performance, rAF laeuft trotzdem mit 60fps.
     Touch/Mobile (kein Hover-Support): Sichtbarkeit im Viewport ersetzt
     den Hover, per IntersectionObserver — dasselbe binaere
     Sichtbar/Unsichtbar-Problem wie beim Bento-Video in Block 30, ohne
     den ScrollTrigger-Refresh-Zyklus mitzuschleppen.
     =================================================================== */
  (function () {
    if (REDUCE) return;
    var cards = qsa('[data-electric="true"]');
    if (!cards.length) return;

    /* ---------- Stellschrauben ---------- */
    var COLOR = '#DCEBFF',   // kuehles Weiss-Blau; Weiss allein hat zu wenig Glow
        SPEED = 0.5,         // Zeitfortschritt der Noise
        CHAOS = 0.045,       // Amplitude der Verzerrung
        RADIUS = 20,         // MUSS dem Card-Radius entsprechen
        THICKNESS = 1.5,
        OFFSET = 60,         // Puffer gegen abgeschnittene Ausschlaege
        DISPLACE = 60,       // Ausschlag der Blitze in px
        STOP_DELAY = 400,    // Nachlauf, sonst greift schneller Card-Wechsel nicht
        TOUCH_THRESHOLD = 0.35;  // Sichtbarkeitsanteil, ab dem Touch den Effekt startet

    // Einmalig ermittelt, gilt fuer die gesamte Session (kein Resize-Fall
    // von Touch zu Maus mitten im Besuch, den muesste man abdecken).
    var isTouch = mm('(hover: none)').matches;

    /* ---------- Noise ---------- */
    function random(x) { return (Math.sin(x * 12.9898) * 43758.5453) % 1; }

    function noise2D(x, y) {
      var i = Math.floor(x), j = Math.floor(y);
      var fx = x - i, fy = y - j;
      var a = random(i + j * 57),       b = random(i + 1 + j * 57);
      var c = random(i + (j + 1) * 57), d = random(i + 1 + (j + 1) * 57);
      var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) +
             c * (1 - ux) * uy + d * ux * uy;
    }

    // Mehrere Oktaven = fraktale Unruhe, erste Oktave bewusst flach
    function octavedNoise(x, time, seed) {
      var y = 0, amplitude = CHAOS, frequency = 10;
      for (var i = 0; i < 10; i++) {
        y += (i === 0 ? 0 : amplitude) *
             noise2D(frequency * x + seed * 100, time * frequency * 0.3);
        frequency *= 1.6;
        amplitude *= 0.7;
      }
      return y;
    }

    /* ---------- Geometrie ---------- */
    function cornerPoint(cx, cy, r, startAngle, arc, p) {
      var a = startAngle + p * arc;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }

    // Punkt auf dem Umfang eines Rechtecks mit runden Ecken, t = 0..1
    function rectPoint(t, left, top, w, h, r) {
      var sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI * r) / 2;
      var d = t * (2 * sw + 2 * sh + 4 * arc), acc = 0;

      if (d <= acc + sw) return { x: left + r + ((d - acc) / sw) * sw, y: top };
      acc += sw;
      if (d <= acc + arc) return cornerPoint(left + w - r, top + r, r, -Math.PI / 2, Math.PI / 2, (d - acc) / arc);
      acc += arc;
      if (d <= acc + sh) return { x: left + w, y: top + r + ((d - acc) / sh) * sh };
      acc += sh;
      if (d <= acc + arc) return cornerPoint(left + w - r, top + h - r, r, 0, Math.PI / 2, (d - acc) / arc);
      acc += arc;
      if (d <= acc + sw) return { x: left + w - r - ((d - acc) / sw) * sw, y: top + h };
      acc += sw;
      if (d <= acc + arc) return cornerPoint(left + r, top + h - r, r, Math.PI / 2, Math.PI / 2, (d - acc) / arc);
      acc += arc;
      if (d <= acc + sh) return { x: left, y: top + h - r - ((d - acc) / sh) * sh };
      acc += sh;
      return cornerPoint(left + r, top + r, r, Math.PI, Math.PI / 2, (d - acc) / arc);
    }

    /* ---------- Eine Karte einrichten ---------- */
    function initCard(card) {
      var container = document.createElement('div');
      container.className = 'eb-canvas-container';
      var canvas = document.createElement('canvas');
      container.appendChild(canvas);

      var glow = document.createElement('div');
      glow.className = 'eb-bg-glow';

      card.insertBefore(glow, card.firstChild);
      card.insertBefore(container, card.firstChild);

      var ctx = canvas.getContext('2d');
      var w = 0, h = 0, dpr = 1;
      var time = 0, lastFrame = 0, rafId = null, stopTimer = null;

      function resize() {
        var rect = card.getBoundingClientRect();
        w = rect.width + OFFSET * 2;
        h = rect.height + OFFSET * 2;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }

      function draw(now) {
        if (!lastFrame) lastFrame = now;
        time += ((now - lastFrame) / 1000) * SPEED;
        lastFrame = now;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = COLOR;
        ctx.lineWidth = THICKNESS;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = COLOR;
        ctx.shadowBlur = 6;

        var bw = w - 2 * OFFSET, bh = h - 2 * OFFSET;
        var r = Math.min(RADIUS, Math.min(bw, bh) / 2);
        var samples = Math.floor((2 * (bw + bh) + 2 * Math.PI * r) / 2);

        ctx.beginPath();
        for (var i = 0; i <= samples; i++) {
          var p = i / samples;
          var pt = rectPoint(p, OFFSET, OFFSET, bw, bh, r);
          var x = pt.x + octavedNoise(p * 8, time, 0) * DISPLACE;
          var y = pt.y + octavedNoise(p * 8, time, 1) * DISPLACE;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        rafId = requestAnimationFrame(draw);
      }

      function start() {
        // Laufenden Stop-Timer abbrechen, sonst blendet er wieder aus
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
        container.classList.add('is-active');
        glow.classList.add('is-active');
        if (rafId) return;               // Loop laeuft schon, nur einblenden
        resize();
        lastFrame = 0;
        rafId = requestAnimationFrame(draw);
      }

      function stop() {
        container.classList.remove('is-active');
        glow.classList.remove('is-active');
        if (stopTimer) clearTimeout(stopTimer);
        // Loop erst nach dem Ausblenden anhalten
        stopTimer = setTimeout(function () {
          stopTimer = null;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }, STOP_DELAY);
      }

      if (isTouch) {
        // Kein Hover auf Touch: Sichtbarkeit im Viewport uebernimmt die
        // Rolle von mouseenter/mouseleave. threshold statt einmaligem
        // Trigger, damit der Effekt beim Weiterscrollen sauber wieder
        // stoppt (spart Akku bei Cards, die laengst durchgescrollt sind).
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start(); else stop();
          });
        }, { threshold: TOUCH_THRESHOLD }).observe(card);
      } else {
        card.addEventListener('mouseenter', start);
        card.addEventListener('mouseleave', stop);
      }

      window.addEventListener('resize', function () { if (rafId) resize(); });
    }

    cards.forEach(initCard);
  })();

   

  /* ===================================================================
     70  FAQ — HOVER- UND KLICK-LOGIK
     Horizontales Akkordeon. Auf Zeigergeraeten oeffnet Hover, auf Touch
     der Tap.

     GEAENDERT gegenueber der Vorversion:
     1. Die Geraeteart wird LIVE abgefragt, nicht einmal beim Laden.
        Ein iPad mit Magic Keyboard oder ein Surface wechselt zwischen
        Touch und Maus, waehrend die Seite offen ist.
     2. Der mouseleave-Reset auf dem Wrapper laeuft NUR auf echten
        Zeigergeraeten. Touch-Browser synthetisieren mouseleave: tippte
        man eine Card an und danach daneben, sprang die Auswahl hart auf
        Card 1 zurueck — die eben geoeffnete Card fiel auf 72px zusammen.
        Das war die Ursache fuer das "Karte verkleinert sich" auf Mobile.
     3. Die Cards bekommen role und aria-expanded. Vorher waren es sieben
        fokussierbare Divs ohne Rolle und ohne Zustand — ein Screenreader
        hat nicht angesagt, dass sich beim Fokus etwas oeffnet.
     4. Enter und Leertaste aktivieren. Mit role="button" wird das
        erwartet, ein Div liefert es nicht von selbst.
     =================================================================== */
  (function () {
    var wrapper = qs('.faq-wrapper');
    var cards = qsa('.faq-card');
    if (!wrapper || !cards.length) return;

    /* Live-Abfrage statt Momentaufnahme. matchMedia wertet bei jedem
       .matches neu aus, der Wert ist also immer aktuell. */
    var POINTER = mm('(hover: hover) and (pointer: fine)');
    function hasPointer() { return POINTER.matches; }

    var defaultCard = qs('.faq-card.is-open') || cards[0];

    function openOnly(card) {
      cards.forEach(function (c) {
        var open = (c === card);
        c.classList.toggle('is-open', open);
        c.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    cards.forEach(function (card) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');

      /* Hover oeffnet nur, wenn wirklich ein Zeiger da ist. Auf Touch
         feuert mouseenter zwar auch, aber dort uebernimmt der Klick —
         sonst laufen zwei Wege auf dasselbe Ziel. */
      card.addEventListener('mouseenter', function () {
        if (hasPointer()) openOnly(card);
      });

      /* Tastatur: Fokus oeffnet, damit man beim Durchtabben sieht,
         wo man ist. */
      card.addEventListener('focus', function () { openOnly(card); });

      /* Klick immer, nicht nur auf Touch. Auf Trackpads und bei
         Nutzern, die nach dem Hover noch bestaetigen wollen, ist das
         das erwartete Verhalten. */
      card.addEventListener('click', function () { openOnly(card); });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();          // Leertaste wuerde sonst scrollen
          openOnly(card);
        }
      });
    });

    /* Zuruecksetzen beim Verlassen der Section — ausschliesslich mit
       Maus. Auf Touch bleibt die Auswahl stehen, wo der Nutzer sie
       hingelegt hat. */
    wrapper.addEventListener('mouseleave', function () {
      if (hasPointer()) openOnly(defaultCard);
    });

    openOnly(defaultCard);
  })();

  /* ===================================================================
     80  CONTACT — FILL-STATE
     Webflow trimmt den Placeholder im Designer weg, deshalb greift
     :placeholder-shown nicht. Ersatz: Klasse is-filled per JS.
     =================================================================== */
  (function () {
    var inputs = qsa('.contact-input');
    if (!inputs.length) return;

    function sync(el) {
      el.classList.toggle('is-filled', el.value.trim() !== '');
    }

    inputs.forEach(function (el) {
      sync(el);                                      // Autofill beim Laden
      on(el, 'input change blur', function () { sync(el); });
    });

    // Autofill kommt bei manchen Browsern erst nach load
    window.addEventListener('load', function () { inputs.forEach(sync); });
  })();

  /* ===================================================================
     81  CONTACT — MARBLES PARALLAX
     Geschwindigkeit wird aus der GEMESSENEN Breite abgeleitet, nicht aus
     data-marble. Kopplung folgt echter Parallaxe: groesser = naeher =
     bewegt sich mehr. data-marble steuert nur noch die RICHTUNG
     (positiv = mit dem Scroll, negativ = dagegen, 0 = steht still).
     =================================================================== */
  (function () {
    if (!GS || REDUCE) return;

    /* ---------- Stellschrauben ---------- */
    var SPEED_SMALL = 0.45,   // kleinste Marble, traege, wirkt entfernt
        SPEED_LARGE = 1.00,   // groesste Marble, schnell, wirkt nah
        BASE_WIDE = 260,      // Basisdistanz in px, Desktop
        BASE_NARROW = 130;    // unter 768px

    function init() {
      var marbles = qsa('[data-marble]');
      if (!marbles.length) return;

      /* Trigger ist die Section, nicht der Layer: der Layer hat keine
         eigene Hoehe, seine Kinder sind absolut positioniert. */
      var scope = marbles[0].closest('section');
      if (!scope) return;

      var BASE = mm('(max-width: 767px)').matches ? BASE_NARROW : BASE_WIDE;

      var sizes = marbles.map(function (el) { return el.offsetWidth || 1; });
      var min = Math.min.apply(null, sizes);
      var max = Math.max.apply(null, sizes);
      var span = max - min;                  // 0 wenn alle gleich gross

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope,
          start: 'top bottom',               // Section betritt den Viewport
          end: 'bottom top',
          /* scrub > 0 = Traegheit. Die Marbles laufen dem Scroll hinterher
             und pendeln sich nach dem Stoppen aus. */
          scrub: 1.2,
          invalidateOnRefresh: true
        }
      });

      marbles.forEach(function (el, i) {
        var raw = parseFloat(el.getAttribute('data-marble'));
        if (!raw) return;

        var t = span > 0 ? (sizes[i] - min) / span : 0;
        var speed = SPEED_SMALL + t * (SPEED_LARGE - SPEED_SMALL);
        var d = (raw < 0 ? -1 : 1) * speed * BASE;

        /* Symmetrischer Weg -d -> +d: y=0 liegt exakt in der Mitte der
           Section, also genau auf der im Designer eingestellten Position. */
        tl.fromTo(el, { y: -d }, { y: d, ease: 'none', force3D: true }, 0);
      });
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
  })();


      /* ===================================================================
     99  GLOBAL — EIN REFRESH FUER ALLE
     Bei mehreren Pins auf einer Seite vermessen sich einzelne Refreshes
     gegenseitig neu, waehrend ein Scrub schon laeuft. Ein einziger
     initialer Refresh, nachdem alles registriert ist, PLUS ein
     begrenzter Nachlauf fuer das, was danach noch Hoehe aendert.

     GEAENDERT: fonts.ready und load liefen vorher im "wer zuerst"-
     Rennen gegeneinander — der erste setzte done=true, der zweite lief
     ins Leere. Auf Staging gemessen: fonts.ready gewinnt fast immer,
     Bilder mit loading="lazy" und das Bento-Video (Src erst per
     IntersectionObserver in Block 30) haben zu dem Zeitpunkt oft noch
     keine Hoehe. Jede Trigger-Position unterhalb dieser Elemente sass
     dadurch bis zu 200px daneben — reproduzierbar zwischen Loads.

     Jetzt: BEIDE Signale muessen da sein fuer den ersten Refresh.
     Danach ein bewusst begrenzter Sicherheitsnetz-Refresh, ausgeloest
     durch die konkret bekannten Spaetlader (lazy Bilder, Bento-Video-
     Metadaten) — kein Dauerlistener, kein Risiko einer Refresh-
     Schleife durch den Pin-Spacer selbst.
     MUSS der letzte Block bleiben.
     =================================================================== */
  (function () {
    if (!GS) return;

    var fontsDone = false, loadDone = false, firstDone = false;

    function maybeFirstRefresh() {
      if (firstDone || !fontsDone || !loadDone) return;
      firstDone = true;
      ScrollTrigger.refresh();
      armSafetyNet();
    }

    onFonts(function () { fontsDone = true; maybeFirstRefresh(); });
    window.addEventListener('load', function () { loadDone = true; maybeFirstRefresh(); });

    /* ---------- Nachlauf ----------
       Lazy-Bilder und das Bento-Video aendern die Dokumenthoehe erst
       NACH dem ersten Refresh. Debounced (200ms, mehrere Spaetlader
       kurz hintereinander loesen nur einen Refresh aus) und auf
       maximal 3 begrenzt — mehr sollte es unter normalen Umstaenden
       nie brauchen, und es verhindert eine Endlosschleife, falls ein
       Refresh selbst je unerwartet ein 'load'-Event nachziehen sollte. */
    function armSafetyNet() {
      var timer = null;
      var fired = 0;
      var MAX_SAFETY_REFRESHES = 3;

      function schedule() {
        if (fired >= MAX_SAFETY_REFRESHES) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          fired++;
          ScrollTrigger.refresh();
        }, 200);
      }

      qsa('img[loading="lazy"]').forEach(function (img) {
        if (img.complete) return;        // schon geladen, kein Ereignis mehr zu erwarten
        img.addEventListener('load', schedule, { once: true });
      });

      var bentoVideo = qs('.bento-video');
      if (bentoVideo) {
        bentoVideo.addEventListener('loadedmetadata', schedule, { once: true });
      }
    }
  })();

})();
