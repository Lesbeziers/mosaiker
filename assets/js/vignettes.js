// ============================================================
// VIGNETTES.JS — Selector y render de viñetas por formato
//
// Las viñetas se indexan por RESOLUCIÓN (ej. "3840x2160"), de forma
// que varios formatos con el mismo tamaño comparten las mismas opciones.
// Cada formato recuerda su elección (tipo + transparencia) por separado
// en State.vignettes[formatId].
//
// Render: <img class="lienzo-vignette"> dentro de #lienzo, con z-index
// por debajo de los overlays ZSE/MOK (la viñeta es diseño; ZSE/MOK son
// validación y van por encima).
// ============================================================

const Vignettes = (() => {

  // Catálogo de viñetas disponibles por resolución
  const VIGNETTES = {
    '3840x2160': [
      { id: 'ventana',    label: 'Ventana',    src: 'assets/img/vignette/3840x2160_ventana.png' },
      { id: 'horizontal', label: 'Horizontal', src: 'assets/img/vignette/3840x2160_horizontal.png' },
      { id: 'vertical',   label: 'Vertical',   src: 'assets/img/vignette/3840x2160_vertical.png' },
    ],
    '2160x3840': [
      { id: 'ventana',    label: 'Ventana',    src: 'assets/img/vignette/2160x3840_ventana.png' },
      { id: 'horizontal', label: 'Horizontal', src: 'assets/img/vignette/2160x3840_horizontal.png' },
      { id: 'vertical',   label: 'Vertical',   src: 'assets/img/vignette/2160x3840_vertical.png' },
    ],
    '3840x1200': [
      { id: 'ventana',    label: 'Ventana',    src: 'assets/img/vignette/3840x1200_ventana.png' },
      { id: 'horizontal', label: 'Horizontal', src: 'assets/img/vignette/3840x1200_horizontal.png' },
      { id: 'vertical',   label: 'Vertical',   src: 'assets/img/vignette/3840x1200_vertical.png' },
    ],
    '1536x1536': [
      { id: 'ventana',    label: 'Ventana',    src: 'assets/img/vignette/1536x1536_ventana.png' },
      { id: 'horizontal', label: 'Horizontal', src: 'assets/img/vignette/1536x1536_horizontal.png' },
      { id: 'vertical',   label: 'Vertical',   src: 'assets/img/vignette/1536x1536_vertical.png' },
    ],
    '600x400': [
      { id: 'ventana',    label: 'Ventana',    src: 'assets/img/vignette/600x400_ventana.png' },
      { id: 'horizontal', label: 'Horizontal', src: 'assets/img/vignette/600x400_horizontal.png' },
      { id: 'vertical',   label: 'Vertical',   src: 'assets/img/vignette/600x400_vertical.png' },
    ],
  };

  function init() {
    _bindDropdown();
    _bindSlider();
    update();
  }

  // Llamada por Formats.setActive cuando cambia el formato
  function update() {
    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    _renderUI(fmt);
    _renderOverlay(fmt);
  }

  // ── PRIVADAS ──────────────────────────────────────────────

  function _getAvailable(fmt) {
    if (!fmt) return [];
    const key = `${fmt.width}x${fmt.height}`;
    if (VIGNETTES[key]) return VIGNETTES[key];
    // Sin catálogo PNG (p.ej. formato custom): viñetas generadas al vuelo.
    return [
      { id: 'ventana',    label: 'Ventana',    generated: true },
      { id: 'horizontal', label: 'Horizontal', generated: true },
      { id: 'vertical',   label: 'Vertical',   generated: true },
    ];
  }

  // Devuelve (y crea si hace falta) el estado de viñeta para un formato
  function _getStateForFormat(formatId) {
    if (!State.vignettes[formatId]) {
      State.vignettes[formatId] = { type: null, opacity: 1 };
    }
    return State.vignettes[formatId];
  }

  function _renderUI(fmt) {
    const section   = document.getElementById('section-vignette');
    const optionsEl = document.getElementById('vignette-options');
    const valueEl   = document.getElementById('vignette-value');
    const sliderRow = document.getElementById('vignette-opacity-row');
    const slider    = document.getElementById('vignette-opacity');
    const sliderVal = document.getElementById('vignette-opacity-val');
    if (!section || !optionsEl || !valueEl || !sliderRow || !slider || !sliderVal) return;

    const available = _getAvailable(fmt);

    // Sin viñetas para esta resolución → ocultar sección entera
    if (available.length === 0 || !fmt) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    // Pobla el dropdown: "Ninguna" + opciones disponibles
    optionsEl.innerHTML = '';
    const opts = [{ id: '__none__', label: 'Ninguna' }, ...available];
    opts.forEach(o => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = o.label;
      el.dataset.id = o.id;
      optionsEl.appendChild(el);
    });

    // Sincroniza con el estado del formato actual
    const st = _getStateForFormat(fmt.id);
    const activeOpt = opts.find(o => o.id === (st.type || '__none__')) || opts[0];
    valueEl.textContent = activeOpt.label;
    optionsEl.querySelectorAll('.custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.id === activeOpt.id);
    });

    // Slider de transparencia
    const pct = Math.round((st.opacity ?? 1) * 100);
    slider.value = pct;
    sliderVal.textContent = pct;
    const noneActive = !st.type;
    slider.disabled = noneActive;
    sliderRow.style.opacity = noneActive ? 0.4 : 1;
  }

  function _renderOverlay(fmt) {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;

    // Elimina la viñeta anterior si existía (no toca otros overlays)
    lienzo.querySelectorAll('.lienzo-vignette').forEach(el => el.remove());

    if (!fmt) return;
    const st = _getStateForFormat(fmt.id);
    if (!st.type) return;
    const available = _getAvailable(fmt);
    const vig = available.find(v => v.id === st.type);
    if (!vig) return;

    const img = document.createElement('img');
    img.className = 'lienzo-vignette';
    img.src = vig.generated ? _genOverlaySrc(fmt, vig.id) : vig.src;
    img.alt = vig.label;
    img.style.opacity = (st.opacity ?? 1).toString();
    lienzo.appendChild(img);
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('vignette-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('vignette-options');
    if (!dropdown || !trigger || !optionsEl) return;

    trigger.addEventListener('click', () => dropdown.classList.toggle('open'));

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    optionsEl.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select-option');
      if (!opt) return;
      dropdown.classList.remove('open');

      const fmt = Formats.getActive();
      if (!fmt) return;
      const st = _getStateForFormat(fmt.id);
      st.type = (opt.dataset.id === '__none__') ? null : opt.dataset.id;
      update();
    });
  }

  function _bindSlider() {
    const slider    = document.getElementById('vignette-opacity');
    const sliderVal = document.getElementById('vignette-opacity-val');
    if (!slider) return;

    slider.addEventListener('input', () => {
      const pct = +slider.value;
      sliderVal.textContent = pct;
      const fmt = Formats.getActive();
      if (!fmt) return;
      const st = _getStateForFormat(fmt.id);
      st.opacity = pct / 100;

      // Actualiza opacidad en vivo sin re-renderizar el overlay entero
      const img = document.querySelector('#lienzo .lienzo-vignette');
      if (img) img.style.opacity = st.opacity.toString();
    });
  }

  // ── GENERADOR DE VIÑETAS AL VUELO ─────────────────────────
  // Negro con alpha, a w×h, para el tipo dado. Calibrado muestreando las
  // viñetas reales (perfiles de alpha): ventana = radial elíptico suave
  // (máx ~0.75, sin negro puro), horizontal/vertical = bandas en los bordes.
  // Se adapta a cualquier proporción sin deformar (clave para el custom).
  function generate(w, h, type) {
    const c = document.createElement('canvas');
    c.width  = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const cx = c.getContext('2d');
    const rgba = a => `rgba(0,0,0,${a})`;

    if (type === 'horizontal') {
      const g = cx.createLinearGradient(0, 0, c.width, 0);
      [[0,0.95],[0.10,0.15],[0.18,0],[0.82,0],[0.90,0.15],[1,0.95]]
        .forEach(([o,a]) => g.addColorStop(o, rgba(a)));
      cx.fillStyle = g; cx.fillRect(0, 0, c.width, c.height);
    } else if (type === 'vertical') {
      const g = cx.createLinearGradient(0, 0, 0, c.height);
      [[0,1],[0.10,0.89],[0.20,0.53],[0.30,0.12],[0.42,0],[0.58,0],[0.70,0.12],[0.80,0.53],[0.90,0.89],[1,1]]
        .forEach(([o,a]) => g.addColorStop(o, rgba(a)));
      cx.fillStyle = g; cx.fillRect(0, 0, c.width, c.height);
    } else { // ventana: radial elíptico suave (proporcional al lienzo)
      cx.save();
      cx.translate(c.width / 2, c.height / 2);
      cx.scale(c.width, c.height);                     // espacio unidad → elipse
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, 0.5);
      [[0,0],[0.55,0],[0.8,0.14],[1,0.75]]
        .forEach(([o,a]) => g.addColorStop(o, rgba(a)));
      cx.fillStyle = g; cx.fillRect(-0.5, -0.5, 1, 1);
      cx.restore();
    }
    return c;
  }

  // dataURL para el overlay del editor (capado a la proporción del formato).
  function _genOverlaySrc(fmt, type) {
    const cap = 1400;
    let w = fmt.width, h = fmt.height;
    const m = Math.max(w, h);
    if (m > cap) { const s = cap / m; w = Math.round(w * s); h = Math.round(h * s); }
    return generate(w, h, type).toDataURL('image/png');
  }

  return { init, update, generate };
})();
