// ============================================================
// UI.JS — Eventos generales del chasis (sidebar, modos, tooltips)
// ============================================================

const UI = (() => {

  function init() {
    _bindSidebarCollapse();
    _initTooltips();
    _bindModeButtons();
    _bindTopBarActions();
    _bindDropZone();
    _bindShowPrefixesToggle();
    _bindTransformSliders();
    _bindCanvasOkButton();
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _initTooltips() {
    document.querySelectorAll('[title]').forEach(el => {
      const text = el.getAttribute('title');
      if (!text) return;
      el.removeAttribute('title');
      el.dataset.tooltip = text;
    });

    const tooltip = document.getElementById('custom-tooltip') || document.createElement('div');
    tooltip.id = 'custom-tooltip';
    if (!tooltip.parentNode) document.body.appendChild(tooltip);

    let timer = null;

    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tooltip]');
      if (!el) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        tooltip.textContent = el.dataset.tooltip;
        tooltip.style.left = (e.clientX - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top  = (e.clientY - 32) + 'px';
        tooltip.classList.add('visible');
      }, 300);
    });

    document.addEventListener('mousemove', e => {
      if (!tooltip.classList.contains('visible')) return;
      tooltip.style.left = (e.clientX - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top  = (e.clientY - 32) + 'px';
    });

    document.addEventListener('mouseout', e => {
      if (!e.target.closest('[data-tooltip]')) return;
      clearTimeout(timer);
      tooltip.classList.remove('visible');
    });

    document.addEventListener('mousedown', () => {
      clearTimeout(timer);
      tooltip.classList.remove('visible');
    });
  }

  function _bindSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const btn     = document.getElementById('btn-collapse');
    if (!sidebar || !btn) return;

    btn.addEventListener('click', () => {
      const closing = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');
      btn.style.left        = closing ? '0px' : 'var(--sidebar-width)';
      btn.textContent       = closing ? '›' : '‹';
      btn.style.borderLeft  = closing ? '1px solid #2e2e2e' : 'none';
      btn.style.borderRight = closing ? 'none'              : '1px solid #2e2e2e';
      // Recalcular el lienzo tras la animación
      setTimeout(() => Canvas.render(), 260);
    });
  }

  function _bindModeButtons() {
    document.querySelectorAll('.btn-mode').forEach(b => {
      b.addEventListener('click', async () => {
        // Antes de cambiar a VER TODAS, refrescamos el snapshot del formato
        // actual SI está marcado OK — así cualquier cambio (viñeta, sliders,
        // imágenes) hecho después del OK queda reflejado.
        // GUARDA: sólo recapturamos si hay imágenes cargadas en el cache.
        // Si está vacío (típico al abrir un JSON sin imágenes), no tocamos
        // los snapshots guardados — si no, se perderían al navegar.
        if (b.id === 'btn-ver-todas') {
          const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
          const hasImages = (typeof Images !== 'undefined') && Images.getLoadedNumbers().length > 0;
          if (fmt && State.formatsOk[fmt.id] && hasImages) {
            State.formatSnapshots[fmt.id] = await _captureSnapshot();
          }
        }

        document.querySelectorAll('.btn-mode').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        State.view = b.id === 'btn-editor' ? 'editor' : 'all';
        document.body.classList.toggle('view-all', State.view === 'all');
        if (State.view === 'all') renderVerTodas();
        else _recenterAfterLayout();   // volver a editor → re-centrar tras la transición
      });
    });
  }

  // Cambia a modo EDITOR (utilidad llamada desde click en thumbnail)
  function _enterEditor() {
    document.querySelectorAll('.btn-mode').forEach(x => x.classList.remove('active'));
    const editorBtn = document.getElementById('btn-editor');
    if (editorBtn) editorBtn.classList.add('active');
    State.view = 'editor';
    document.body.classList.remove('view-all');
    _recenterAfterLayout();
  }

  // Al volver a editor desde VER TODAS, el sidebar pasa de width:0 a su ancho
  // con una transición (~260ms). Si recolocamos el lienzo antes de que termine,
  // canvas-area se mide demasiado ancho y el lienzo queda ladeado a la derecha.
  // Re-centramos cuando la transición de anchura del sidebar acaba (con fallback).
  function _recenterAfterLayout() {
    const sidebar = document.getElementById('sidebar');
    const doFit = () => {
      if (typeof Canvas    !== 'undefined') Canvas.render();      // reposiciona/redimensiona lienzo
      if (typeof Mosaic3D  !== 'undefined') Mosaic3D.fitToLienzo(); // re-encuadra y centra
    };
    if (!sidebar) { setTimeout(doFit, 320); return; }
    let done = false;
    const onEnd = (e) => {
      if (e.propertyName !== 'width') return;
      done = true;
      sidebar.removeEventListener('transitionend', onEnd);
      doFit();
    };
    sidebar.addEventListener('transitionend', onEnd);
    // Fallback por si no se dispara transitionend (sin transición, reduced-motion…)
    setTimeout(() => { if (!done) { sidebar.removeEventListener('transitionend', onEnd); doFit(); } }, 360);
  }

  function _bindTopBarActions() {
    // btn-guardar y btn-abrir los gestiona Project.init()
    // btn-exportar lo gestiona Export.init()
  }

  function _bindDropZone() {
    const zone  = document.getElementById('drop-zone');
    const input = document.getElementById('file-input');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      _loadFilesWithSpinners(e.dataTransfer.files);
    });

    input.addEventListener('change', e => {
      _loadFilesWithSpinners(e.target.files);
      input.value = '';
    });
  }

  // Carga por índice desde el panel mostrando un spinner sobre los contenedores
  // que se van a actualizar (los que ahora muestran ese índice), hasta que la
  // imagen esté decodificada.
  function _loadFilesWithSpinners(files) {
    if (typeof Images === 'undefined') return;
    const spinners = _spinnersForFiles(files);
    Promise.resolve(Images.loadFiles(files)).finally(() => spinners.forEach(s => s.remove()));
  }

  function _spinnersForFiles(files) {
    const els = [];
    if (typeof Mosaic3D === 'undefined' || !Mosaic3D.getIndexScreens) return els;
    const indices = new Set();
    Array.from(files || []).forEach(f => {
      const m = f.name && f.name.match(/^(\d+)/);
      if (m) indices.add(parseInt(m[1], 10));
    });
    indices.forEach(n => {
      Mosaic3D.getIndexScreens(n).forEach(scr => {
        const el = document.createElement('div');
        el.className = 'drop-spinner';
        el.style.left = scr.x + 'px';
        el.style.top  = scr.y + 'px';
        document.body.appendChild(el);
        els.push(el);
      });
    });
    return els;
  }

  function _bindShowPrefixesToggle() {
    document.getElementById('toggle-show-prefixes')?.addEventListener('change', e => {
      State.showImagePrefixes = e.target.checked;
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.setPrefixesVisible(e.target.checked);
    });
  }

  // Definición compartida de sliders (usada por bind y por syncTransformSliders).
  // `inverted: true` hace que el slider vaya al revés del valor de estado:
  //   - el slider visualmente va 0→max de izq a der
  //   - el valor real se calcula como (min + max) - sliderValue
  //   - así "derecha = más zoom" aunque el camZ de Three.js sea menor.
  const TRANSFORM_SLIDERS = [
    { id: 'tr-rotX',   key: 'rotX',   precision: 0 },
    { id: 'tr-rotY',   key: 'rotY',   precision: 0 },
    { id: 'tr-camX',   key: 'camX',   precision: 1 },
    { id: 'tr-camY',   key: 'camY',   precision: 1 },
    { id: 'tr-camZ',   key: 'camZ',   precision: 1, inverted: true },
    { id: 'tr-gap',    key: 'gap',    precision: 0 },
    { id: 'tr-radius', key: 'radius', precision: 0 },
  ];

  function _bindTransformSliders() {
    TRANSFORM_SLIDERS.forEach(({ id, key, precision, inverted }) => {
      const slider = document.getElementById(id);
      const valEl  = document.getElementById(id + '-val');
      if (!slider) return;

      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);

      // Sincroniza valor inicial con State
      if (State.transform && key in State.transform) {
        const stateValue = State.transform[key];
        const sliderValue = inverted ? (min + max) - stateValue : stateValue;
        slider.value = Math.max(min, Math.min(max, sliderValue));
        if (valEl) valEl.textContent = (+slider.value).toFixed(precision);
      }

      slider.addEventListener('input', () => {
        const sliderValue = +slider.value;
        const stateValue  = inverted ? (min + max) - sliderValue : sliderValue;
        State.transform[key] = stateValue;
        if (valEl) valEl.textContent = sliderValue.toFixed(precision);
        if (typeof Mosaic3D !== 'undefined') {
          Mosaic3D.setTransform({ [key]: stateValue });
        }
      });
    });
  }

  // Re-lee State.transform y refresca todos los sliders.
  // La llama Mosaic3D.fitToLienzo() cuando recalcula camZ automáticamente.
  function syncTransformSliders() {
    TRANSFORM_SLIDERS.forEach(({ id, key, precision, inverted }) => {
      const slider = document.getElementById(id);
      const valEl  = document.getElementById(id + '-val');
      if (!slider || !State.transform || !(key in State.transform)) return;
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const stateValue = State.transform[key];
      const sliderValue = inverted ? (min + max) - stateValue : stateValue;
      const clamped = Math.max(min, Math.min(max, sliderValue));
      slider.value = clamped;
      if (valEl) valEl.textContent = clamped.toFixed(precision);
    });
  }

  function _bindCanvasOkButton() {
    const btn = document.getElementById('btn-canvas-ok');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
      if (!fmt) return;
      const wasOk = !!State.formatsOk[fmt.id];
      if (wasOk) {
        delete State.formatsOk[fmt.id];
        delete State.formatSnapshots[fmt.id];
        updateOkButton();
        updateExportButton();
      } else {
        // Capturamos antes de marcar para que si la captura tarda
        // (esperando a que la viñeta decodifique), no haya un parpadeo
        // donde el botón se vea OK sin snapshot guardada.
        const snap = await _captureSnapshot();
        State.formatsOk[fmt.id] = true;
        State.formatSnapshots[fmt.id] = snap;
        updateOkButton();
        updateExportButton();
      }
    });
  }

  // Refleja el estado OK del formato activo en el botón
  function updateOkButton() {
    const btn = document.getElementById('btn-canvas-ok');
    if (!btn) return;
    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    const isOk = fmt ? !!State.formatsOk[fmt.id] : false;
    btn.classList.toggle('done', isOk);
    btn.disabled = !fmt;
  }

  // Habilita/deshabilita el botón EXPORTAR MOSAICOS según haya OKs
  function updateExportButton() {
    const btn = document.getElementById('btn-exportar');
    if (!btn) return;
    const anyOk = Object.values(State.formatsOk).some(v => v === true);
    btn.disabled = !anyOk;
  }

  // Garantiza que una <img> está decodificada antes de usarla en canvas.
  // Resuelve incluso si la imagen falla, para no bloquear la captura.
  function _ensureImageReady(img) {
    if (!img) return Promise.resolve(false);
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
    return new Promise(resolve => {
      const done = () => {
        img.removeEventListener('load',  onLoad);
        img.removeEventListener('error', onErr);
        resolve(img.naturalWidth > 0);
      };
      const onLoad = () => done();
      const onErr  = () => done();
      img.addEventListener('load',  onLoad, { once: true });
      img.addEventListener('error', onErr,  { once: true });
    });
  }

  // Captura una snapshot del lienzo actual: canvas WebGL + viñeta.
  // NO incluye ZSE/MOK porque son guías de validación, no creatividad.
  // Async porque puede tener que esperar a que la viñeta decodifique.
  async function _captureSnapshot() {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return null;
    const w = lienzo.clientWidth;
    const h = lienzo.clientHeight;
    if (w === 0 || h === 0) return null;

    // Render "limpio" del WebGL (sin índices ni resalte amarillo: son ayudas
    // solo del editor). Se restaura al final con endCapture().
    if (typeof Mosaic3D !== 'undefined') {
      if (Mosaic3D.beginCapture) Mosaic3D.beginCapture();
      else Mosaic3D.render();
    }

    const out = document.createElement('canvas');
    out.width  = w;
    out.height = h;
    const ctx = out.getContext('2d');

    // Fondo del formato (color elegido en la bottom-bar; default #0e0e0e)
    ctx.fillStyle = (typeof Background !== 'undefined') ? Background.get() : '#0e0e0e';
    ctx.fillRect(0, 0, w, h);

    // Imagen de fondo (cover), por detrás del mosaico
    if (typeof Background !== 'undefined' && Background.hasImage && Background.hasImage()) {
      const url = Background.getImageUrl();
      if (url) {
        const bgImg = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
        if (bgImg) {
          const iw = bgImg.naturalWidth || bgImg.width, ih = bgImg.naturalHeight || bgImg.height;
          if (iw && ih) { const s = Math.max(w / iw, h / ih); ctx.drawImage(bgImg, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s); }
        }
      }
    }

    // 1) Mosaico WebGL — respeta la opacidad y el desenfoque del formato
    const webGL = lienzo.querySelector('.mosaic-canvas');
    if (webGL) {
      const mosOp   = (typeof MosaicOpacity !== 'undefined') ? MosaicOpacity.get() : 1;
      const blurPx  = (typeof MosaicBlur    !== 'undefined') ? MosaicBlur.blurPxFor(h) : 0;
      ctx.globalAlpha = mosOp;
      ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
      ctx.drawImage(webGL, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }

    // Restaura las ayudas de edición (índices/resalte) en el lienzo en vivo.
    if (typeof Mosaic3D !== 'undefined' && Mosaic3D.endCapture) Mosaic3D.endCapture();

    // 2) Viñeta (si está activa) — esperamos a que esté decodificada
    const vig = lienzo.querySelector('.lienzo-vignette');
    if (vig) {
      const ready = await _ensureImageReady(vig);
      if (ready) {
        const op = parseFloat(vig.style.opacity);
        ctx.globalAlpha = isNaN(op) ? 1 : op;
        ctx.drawImage(vig, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }

    return out.toDataURL('image/jpeg', 0.85);
  }

  // Renderiza el grid de VER TODAS con las creatividades OK
  function renderVerTodas() {
    const area = document.getElementById('ver-todas-area');
    if (!area) return;
    area.innerHTML = '';

    const okIds = Object.keys(State.formatsOk).filter(id => State.formatsOk[id]);

    if (okIds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vt-empty';
      empty.textContent = 'Marca formatos con OK para verlos aquí';
      area.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'vt-grid';
    area.appendChild(grid);

    okIds.forEach(formatId => {
      const fmt = (typeof Formats !== 'undefined') ? Formats.getById(formatId) : null;
      if (!fmt) return;
      const snapshot = State.formatSnapshots[formatId];

      const card = document.createElement('div');
      card.className = 'vt-card';
      card.dataset.formatId = formatId;

      const thumb = document.createElement('div');
      thumb.className = 'vt-thumb';
      thumb.style.aspectRatio = `${fmt.width} / ${fmt.height}`;
      if (snapshot) {
        const img = document.createElement('img');
        img.src = snapshot;
        thumb.appendChild(img);
      }

      const name = document.createElement('div');
      name.className = 'vt-card-name';
      name.textContent = fmt.name;

      card.appendChild(thumb);
      card.appendChild(name);

      card.addEventListener('click', () => {
        _enterEditor();
        if (typeof Formats !== 'undefined') Formats.setActive(formatId);
      });

      grid.appendChild(card);
    });
  }

  // Genera los sliders verticales OFFSET COLUMNAS según el esqueleto activo.
  // Si el esqueleto no tiene defaultOffsets, oculta el bloque entero.
  function renderColOffsets() {
    const block = document.getElementById('col-offsets-block');
    const row   = document.getElementById('col-offsets-row');
    if (!block || !row) return;

    const esq = (typeof Skeletons !== 'undefined') ? Skeletons.getActive() : null;
    if (!esq || !esq.defaultOffsets) {
      block.style.display = 'none';
      row.innerHTML = '';
      return;
    }

    // 'columns' → un slider (vertical) por columna; 'rows' → un slider
    // (horizontal) por fila. En ambos casos el offset vive en colOffsets.
    const isRows = esq.type === 'rows';
    const numLanes = isRows
      ? (esq.rows ? esq.rows.length : 0)
      : ((esq.type === 'columns' || esq.type === 'vcolumns') && esq.cols ? esq.cols.length : 0);
    if (numLanes === 0) {
      block.style.display = 'none';
      row.innerHTML = '';
      return;
    }

    block.style.display = 'block';
    row.innerHTML = '';
    row.classList.toggle('rows-mode', isRows);
    const titleEl = document.getElementById('col-offsets-title');
    if (titleEl) titleEl.textContent = isRows ? 'Offset filas' : 'Offset columnas';

    const offsets = (State.transform && State.transform.colOffsets) || [];

    for (let ci = 0; ci < numLanes; ci++) {
      const wrap = document.createElement('div');
      wrap.className = 'col-offset' + (isRows ? ' rows-mode' : '');

      const sliderWrap = document.createElement('div');
      sliderWrap.className = 'col-offset-slider-wrap';

      const slider = document.createElement('input');
      slider.type  = 'range';
      slider.min   = -3;
      slider.max   = 3;
      slider.step  = 0.1;
      slider.value = offsets[ci] !== undefined ? offsets[ci] : 0;
      slider.className = 'col-offset-slider' + (isRows ? ' rows-mode' : '');
      slider.dataset.col = ci;

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.setColOffset(ci, v);
      });

      sliderWrap.appendChild(slider);

      const label = document.createElement('div');
      label.className = 'col-offset-label';
      label.textContent = isRows ? `Fila ${ci + 1}` : `Col ${ci + 1}`;

      // En filas, etiqueta a la izquierda del slider; en columnas, debajo.
      if (isRows) { wrap.appendChild(label); wrap.appendChild(sliderWrap); }
      else        { wrap.appendChild(sliderWrap); wrap.appendChild(label); }

      row.appendChild(wrap);
    }
  }

  return { init, syncTransformSliders, renderColOffsets, updateOkButton, updateExportButton, renderVerTodas };
})();
