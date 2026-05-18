// ============================================================
// SKELETONS.JS — Catálogo declarativo de esqueletos + dropdown
// ============================================================
//
// Cada esqueleto declara sus huecos como datos. Quien renderiza
// (mosaic-3d.js) los traduce a geometrías 3D según el `type`.
//
// Esquema de un esqueleto:
//   {
//     id:    string único
//     name:  nombre legible
//     type:  patrón de layout (por ahora sólo 'grid')
//     cols:  nº de columnas
//     rows:  nº de filas (sólo para type='grid')
//     slots: array de huecos en orden de lectura (col 0..N de row 0,
//            luego col 0..N de row 1, etc.). Cada hueco:
//              n:       número de prefijo del archivo (1-based)
//              ratio:   'V' (9:16) o 'H' (16:9)
//              opacity: 0..1
//   }
// ============================================================

const Skeletons = (() => {

  const SKELETONS = {

    clasico: {
      id:   'clasico',
      name: 'Clásico',
      type: 'grid',
      cols: 5,
      rows: 4,
      slots: [
        // Fila 0
        { n: 1,  ratio: 'V', opacity: 1 },
        { n: 2,  ratio: 'V', opacity: 1 },
        { n: 3,  ratio: 'H', opacity: 1 },
        { n: 4,  ratio: 'V', opacity: 1 },
        { n: 5,  ratio: 'V', opacity: 1 },
        // Fila 1
        { n: 6,  ratio: 'V', opacity: 1 },
        { n: 7,  ratio: 'V', opacity: 1 },
        { n: 8,  ratio: 'H', opacity: 1 },
        { n: 9,  ratio: 'V', opacity: 1 },
        { n: 10, ratio: 'V', opacity: 1 },
        // Fila 2
        { n: 11, ratio: 'V', opacity: 1 },
        { n: 12, ratio: 'V', opacity: 1 },
        { n: 13, ratio: 'H', opacity: 1 },
        { n: 14, ratio: 'V', opacity: 1 },
        { n: 15, ratio: 'V', opacity: 1 },
        // Fila 3
        { n: 16, ratio: 'V', opacity: 1 },
        { n: 17, ratio: 'V', opacity: 1 },
        { n: 18, ratio: 'H', opacity: 1 },
        { n: 19, ratio: 'V', opacity: 1 },
        { n: 20, ratio: 'V', opacity: 1 },
      ],
    },

    // ─────────────────────────────────────────────────────
    // COLUMNAS — 5 columnas × 3 bloques (1H + 2V) = 45 huecos
    // Asset numbering: H = col*3+1..3, VL/VR = 16+col*6+block*2
    // Cada columna tiene su propio offset Y por defecto.
    // ─────────────────────────────────────────────────────
    columnas: {
      id:   'columnas',
      name: 'Columnas',
      type: 'columns',
      defaultOffsets: [0, 0.6, -0.4, 0.8, -0.2],
      cols: [
        // Columna 0
        { cells: [
          { type: 'h', n: 1,  opacity: 1 },
          { type: 'v', n: 16, opacity: 1 },
          { type: 'v', n: 17, opacity: 1 },
          { type: 'h', n: 2,  opacity: 1 },
          { type: 'v', n: 18, opacity: 1 },
          { type: 'v', n: 19, opacity: 1 },
          { type: 'h', n: 3,  opacity: 1 },
          { type: 'v', n: 20, opacity: 1 },
          { type: 'v', n: 21, opacity: 1 },
        ]},
        // Columna 1
        { cells: [
          { type: 'h', n: 4,  opacity: 1 },
          { type: 'v', n: 22, opacity: 1 },
          { type: 'v', n: 23, opacity: 1 },
          { type: 'h', n: 5,  opacity: 1 },
          { type: 'v', n: 24, opacity: 1 },
          { type: 'v', n: 25, opacity: 1 },
          { type: 'h', n: 6,  opacity: 1 },
          { type: 'v', n: 26, opacity: 1 },
          { type: 'v', n: 27, opacity: 1 },
        ]},
        // Columna 2
        { cells: [
          { type: 'h', n: 7,  opacity: 1 },
          { type: 'v', n: 28, opacity: 1 },
          { type: 'v', n: 29, opacity: 1 },
          { type: 'h', n: 8,  opacity: 1 },
          { type: 'v', n: 30, opacity: 1 },
          { type: 'v', n: 31, opacity: 1 },
          { type: 'h', n: 9,  opacity: 1 },
          { type: 'v', n: 32, opacity: 1 },
          { type: 'v', n: 33, opacity: 1 },
        ]},
        // Columna 3
        { cells: [
          { type: 'h', n: 10, opacity: 1 },
          { type: 'v', n: 34, opacity: 1 },
          { type: 'v', n: 35, opacity: 1 },
          { type: 'h', n: 11, opacity: 1 },
          { type: 'v', n: 36, opacity: 1 },
          { type: 'v', n: 37, opacity: 1 },
          { type: 'h', n: 12, opacity: 1 },
          { type: 'v', n: 38, opacity: 1 },
          { type: 'v', n: 39, opacity: 1 },
        ]},
        // Columna 4
        { cells: [
          { type: 'h', n: 13, opacity: 1 },
          { type: 'v', n: 40, opacity: 1 },
          { type: 'v', n: 41, opacity: 1 },
          { type: 'h', n: 14, opacity: 1 },
          { type: 'v', n: 42, opacity: 1 },
          { type: 'v', n: 43, opacity: 1 },
          { type: 'h', n: 15, opacity: 1 },
          { type: 'v', n: 44, opacity: 1 },
          { type: 'v', n: 45, opacity: 1 },
        ]},
      ],
    },

    // ─────────────────────────────────────────────────────
    // FRONTAL — 7 columnas × 12 celdas = 84 huecos visibles
    // Solo se usan 19 assets únicos (img_01..img_19), reutilizados.
    // El bloque central destacado (cols 2-3, ordinales 29-46 + 53-58)
    // va a opacidad 1.0; el resto al 0.2.
    // Los offsets de las columnas 5 y 6 son los de cols 0 y 1 × 0.8.
    // ─────────────────────────────────────────────────────
    frontal: {
      id:   'frontal',
      name: 'Frontal',
      type: 'columns',
      defaultOffsets: [0, 0.6, -0.4, 0.8, -0.2, 0, 0.48],
      cols: [
        // Col A — ordinales 1-12 (todos al 20%)
        { cells: [
          { type: 'h', n: 1,  opacity: 0.2 },
          { type: 'v', n: 10, opacity: 0.2 },
          { type: 'v', n: 11, opacity: 0.2 },
          { type: 'h', n: 2,  opacity: 0.2 },
          { type: 'v', n: 16, opacity: 0.2 },
          { type: 'v', n: 17, opacity: 0.2 },
          { type: 'h', n: 6,  opacity: 0.2 },
          { type: 'v', n: 18, opacity: 0.2 },
          { type: 'v', n: 19, opacity: 0.2 },
          { type: 'h', n: 7,  opacity: 0.2 },
          { type: 'v', n: 8,  opacity: 0.2 },
          { type: 'v', n: 9,  opacity: 0.2 },
        ]},
        // Col B — ordinales 13-24 (todos al 20%)
        { cells: [
          { type: 'h', n: 7,  opacity: 0.2 },
          { type: 'v', n: 14, opacity: 0.2 },
          { type: 'v', n: 15, opacity: 0.2 },
          { type: 'h', n: 4,  opacity: 0.2 },
          { type: 'v', n: 13, opacity: 0.2 },
          { type: 'v', n: 12, opacity: 0.2 },
          { type: 'h', n: 5,  opacity: 0.2 },
          { type: 'v', n: 15, opacity: 0.2 },
          { type: 'v', n: 14, opacity: 0.2 },
          { type: 'h', n: 3,  opacity: 0.2 },
          { type: 'v', n: 12, opacity: 0.2 },
          { type: 'v', n: 13, opacity: 0.2 },
        ]},
        // Col C — ordinales 25-36 (29-34 al 100%)
        { cells: [
          { type: 'h', n: 6,  opacity: 0.2 }, // 25
          { type: 'v', n: 18, opacity: 0.2 }, // 26
          { type: 'v', n: 19, opacity: 0.2 }, // 27
          { type: 'h', n: 7,  opacity: 0.2 }, // 28
          { type: 'v', n: 8,  opacity: 1.0 }, // 29
          { type: 'v', n: 9,  opacity: 1.0 }, // 30
          { type: 'h', n: 1,  opacity: 1.0 }, // 31
          { type: 'v', n: 10, opacity: 1.0 }, // 32
          { type: 'v', n: 11, opacity: 1.0 }, // 33
          { type: 'h', n: 2,  opacity: 1.0 }, // 34
          { type: 'v', n: 16, opacity: 0.2 }, // 35
          { type: 'v', n: 17, opacity: 0.2 }, // 36
        ]},
        // Col D — ordinales 37-48 (40-46 al 100%)
        { cells: [
          { type: 'h', n: 5,  opacity: 0.2 }, // 37
          { type: 'v', n: 15, opacity: 0.2 }, // 38
          { type: 'v', n: 14, opacity: 0.2 }, // 39
          { type: 'h', n: 3,  opacity: 1.0 }, // 40
          { type: 'v', n: 12, opacity: 1.0 }, // 41
          { type: 'v', n: 13, opacity: 1.0 }, // 42
          { type: 'h', n: 4,  opacity: 1.0 }, // 43
          { type: 'v', n: 14, opacity: 1.0 }, // 44
          { type: 'v', n: 15, opacity: 1.0 }, // 45
          { type: 'h', n: 5,  opacity: 1.0 }, // 46
          { type: 'v', n: 13, opacity: 0.2 }, // 47
          { type: 'v', n: 12, opacity: 0.2 }, // 48
        ]},
        // Col E (A') — ordinales 49-60 (53-58 al 100%)
        { cells: [
          { type: 'h', n: 1,  opacity: 0.2 }, // 49
          { type: 'v', n: 10, opacity: 0.2 }, // 50
          { type: 'v', n: 11, opacity: 0.2 }, // 51
          { type: 'h', n: 2,  opacity: 0.2 }, // 52
          { type: 'v', n: 16, opacity: 1.0 }, // 53
          { type: 'v', n: 17, opacity: 1.0 }, // 54
          { type: 'h', n: 6,  opacity: 1.0 }, // 55
          { type: 'v', n: 18, opacity: 1.0 }, // 56
          { type: 'v', n: 19, opacity: 1.0 }, // 57
          { type: 'h', n: 7,  opacity: 1.0 }, // 58
          { type: 'v', n: 8,  opacity: 0.2 }, // 59
          { type: 'v', n: 9,  opacity: 0.2 }, // 60
        ]},
        // Col F (B') — ordinales 61-72 (todos al 20%)
        { cells: [
          { type: 'h', n: 7,  opacity: 0.2 },
          { type: 'v', n: 14, opacity: 0.2 },
          { type: 'v', n: 15, opacity: 0.2 },
          { type: 'h', n: 4,  opacity: 0.2 },
          { type: 'v', n: 13, opacity: 0.2 },
          { type: 'v', n: 12, opacity: 0.2 },
          { type: 'h', n: 5,  opacity: 0.2 },
          { type: 'v', n: 15, opacity: 0.2 },
          { type: 'v', n: 14, opacity: 0.2 },
          { type: 'h', n: 3,  opacity: 0.2 },
          { type: 'v', n: 12, opacity: 0.2 },
          { type: 'v', n: 13, opacity: 0.2 },
        ]},
        // Col G (C') — ordinales 73-84 (todos al 20%)
        { cells: [
          { type: 'h', n: 6,  opacity: 0.2 },
          { type: 'v', n: 18, opacity: 0.2 },
          { type: 'v', n: 19, opacity: 0.2 },
          { type: 'h', n: 7,  opacity: 0.2 },
          { type: 'v', n: 8,  opacity: 0.2 },
          { type: 'v', n: 9,  opacity: 0.2 },
          { type: 'h', n: 1,  opacity: 0.2 },
          { type: 'v', n: 10, opacity: 0.2 },
          { type: 'v', n: 11, opacity: 0.2 },
          { type: 'h', n: 2,  opacity: 0.2 },
          { type: 'v', n: 16, opacity: 0.2 },
          { type: 'v', n: 17, opacity: 0.2 },
        ]},
      ],
    },

  };

  function init() {
    _buildDropdown();
    _bindDropdown();
  }

  function getAll() {
    return Object.values(SKELETONS);
  }

  function getById(id) {
    return SKELETONS[id] || null;
  }

  function getActive() {
    return State.activeSkeletonId ? getById(State.activeSkeletonId) : null;
  }

  function setActive(id) {
    const esq = getById(id);
    if (!esq) return;
    State.activeSkeletonId = id;
    // Inicializa los offsets de columna según el esqueleto activo
    State.transform.colOffsets = esq.defaultOffsets ? [...esq.defaultOffsets] : [];
    _updateTrigger(esq);
    _markSelectedOption(id);
    if (typeof Mosaic3D !== 'undefined') Mosaic3D.setSkeleton(esq);
    if (typeof UI       !== 'undefined' && UI.renderColOffsets) UI.renderColOffsets();
  }

  // ── PRIVADAS ──────────────────────────────────────────────

  function _buildDropdown() {
    const optionsEl = document.getElementById('skeleton-options');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';

    getAll().forEach(esq => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option';
      opt.textContent = esq.name;
      opt.dataset.id = esq.id;
      optionsEl.appendChild(opt);
    });
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('skeleton-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('skeleton-options');
    if (!dropdown || !trigger || !optionsEl) return;

    trigger.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    optionsEl.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select-option');
      if (!opt) return;
      dropdown.classList.remove('open');
      setActive(opt.dataset.id);
    });

    // Al iniciar, sincroniza el trigger con el activo (si lo hay)
    const active = getActive();
    if (active) {
      _updateTrigger(active);
      _markSelectedOption(active.id);
    }
  }

  function _updateTrigger(esq) {
    const valueEl = document.getElementById('skeleton-value');
    if (valueEl) valueEl.textContent = esq.name;
  }

  function _markSelectedOption(id) {
    document.querySelectorAll('#skeleton-options .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.id === id);
    });
  }

  return { init, getAll, getById, getActive, setActive };
})();
