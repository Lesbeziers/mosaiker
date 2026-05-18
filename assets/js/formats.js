// ============================================================
// FORMATS.JS — Catálogo de formatos y dropdown de selección
// ============================================================

const Formats = (() => {

  // Cada formato puede tener un array opcional de overlays:
  //   overlays: [
  //     { id, label, src, blend? }, ...
  //   ]
  // El orden del array determina el stacking visual: primero abajo, último arriba.
  // El campo `blend` es opcional (CSS mix-blend-mode: 'screen', 'multiply', etc.)
  const FORMATS = [
    { id: 'cabecera_detalle_desktop',          name: 'Cabecera detalle desktop',          width: 3840, height: 2160,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_det_des_zse.png' },
      ] },
    { id: 'cabecera_detalle_movil',            name: 'Cabecera detalle móvil',            width: 2160, height: 3840,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_det_mov_zse.png' },
      ] },
    { id: 'landing_central',                   name: 'Landing central',                   width: 3840, height: 2160,
      overlays: [
        { id: 'mok_des', label: 'Mockup desktop', src: 'assets/img/checks/lan_cen_mok_des.png', blend: 'screen',
          group: 'landing_mok', defaultOn: true },
        { id: 'mok_mov', label: 'Mockup móvil',   src: 'assets/img/checks/lan_cen_mok_mov.png',
          group: 'landing_mok' },
      ] },
    { id: 'cabecera_newsletters',              name: 'Cabecera newsletters',              width: 600,  height: 400  },
    { id: 'cabecera_slider_desktop',           name: 'Cabecera slider desktop',           width: 3840, height: 2160,
      overlays: [
        { id: 'mok', label: 'Mockup',            src: 'assets/img/checks/cab_sli_des_mok.png', blend: 'screen' },
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_des_zse.png' },
      ] },
    { id: 'cabecera_slider_movil',             name: 'Cabecera slider móvil',             width: 2160, height: 3840,
      overlays: [
        { id: 'mok', label: 'Mockup',            src: 'assets/img/checks/cab_sli_mov_mok.png' },
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_mov_zse.png' },
      ] },
    { id: 'cabecera_slider_mediano_desktop',   name: 'Cabecera slider mediano desktop',   width: 3840, height: 1200,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_med_des_zse.png' },
      ] },
    { id: 'cabecera_slider_mediano_movil',     name: 'Cabecera slider mediano móvil',     width: 1536, height: 1536,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/cab_sli_med_mov_zse.png' },
      ] },
    { id: 'slider_mediano_desktop',            name: 'Slider mediano desktop',            width: 3840, height: 1200,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/sli_med_des_zse.png' },
      ] },
    { id: 'slider_mediano_movil',              name: 'Slider mediano móvil',              width: 1536, height: 1536,
      overlays: [
        { id: 'zse', label: 'Zona de seguridad', src: 'assets/img/checks/sli_med_mov_zse.png' },
      ] },
  ];

  function init() {
    _buildDropdown();
    _bindDropdown();
  }

  function getAll() {
    return FORMATS;
  }

  function getById(id) {
    return FORMATS.find(f => f.id === id) || null;
  }

  function getActive() {
    return State.activeFormatId ? getById(State.activeFormatId) : null;
  }

  function setActive(id) {
    const fmt = getById(id);
    if (!fmt) return;
    State.activeFormatId = id;
    _updateTrigger(fmt);
    _markSelectedOption(id);
    Canvas.setFormat(fmt);
    if (typeof Overlays   !== 'undefined') Overlays.update();
    if (typeof Vignettes  !== 'undefined') Vignettes.update();
    if (typeof Mosaic3D   !== 'undefined') Mosaic3D.setFormat(fmt);
    if (typeof UI         !== 'undefined' && UI.updateOkButton) UI.updateOkButton();
  }

  // ── PRIVADAS ──────────────────────────────────────────────

  function _buildDropdown() {
    const optionsEl = document.getElementById('format-options');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';

    FORMATS.forEach(f => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option';
      opt.textContent = f.name;
      opt.dataset.id = f.id;
      optionsEl.appendChild(opt);
    });
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('format-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('format-options');
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
  }

  function _updateTrigger(fmt) {
    const valueEl = document.getElementById('format-value');
    if (valueEl) valueEl.textContent = fmt.name;
  }

  function _markSelectedOption(id) {
    document.querySelectorAll('#format-options .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.id === id);
    });
  }

  return { init, getAll, getById, getActive, setActive };
})();
