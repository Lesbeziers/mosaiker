// ============================================================
// BACKGROUND.JS — Fondo del lienzo por formato: color + imagen
//
// Vive en la bottom-bar ("FONDO"): un cuadradito de color, un botón para
// elegir imagen de fondo y una "x" para quitarla. Ambos por formato.
// - El color se guarda en State.backgrounds[id] (hex).
// - La imagen se guarda internamente (File + objectURL) por formato; el
//   nombre se refleja en State.backgroundImages[id] para la persistencia.
// La imagen se dibuja DETRÁS del mosaico (cover) en editor, VER TODAS y export.
// ============================================================

const Background = (() => {

  const DEFAULT = '#0e0e0e';
  const bgFiles = {};  // formatId → File
  const bgUrls  = {};  // formatId → objectURL (para el CSS del editor)

  function init() { update(); }

  // Llamada al cambiar de formato (desde Formats.setActive)
  function update() {
    _render();
    _applyToLienzo();
  }

  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id) return DEFAULT;
    return State.backgrounds[id] || DEFAULT;
  }

  // ── IMAGEN DE FONDO ───────────────────────────────────────

  function getImageFile(formatId) {
    return bgFiles[formatId ?? State.activeFormatId] || null;
  }

  function hasImage(formatId) {
    return !!getImageFile(formatId);
  }

  // URL de objeto para pintar la imagen (editor/snapshot). Null si no hay.
  function getImageUrl(formatId) {
    return bgUrls[formatId ?? State.activeFormatId] || null;
  }

  function setImageFile(file) {
    const id = State.activeFormatId;
    if (!id || !file) return;
    _setImageFor(id, file);
    update();
    if (typeof Layers !== 'undefined' && Layers.update) Layers.update();  // aparece la fila FONDO
  }

  // Sin re-render (para carga de proyecto: aún no hay UI pintada).
  function setImageFileFor(id, file) {
    if (!id || !file) return;
    _setImageFor(id, file);
  }

  function _setImageFor(id, file) {
    if (bgUrls[id]) URL.revokeObjectURL(bgUrls[id]);
    bgFiles[id] = file;
    bgUrls[id]  = URL.createObjectURL(file);
    if (!State.backgroundImages) State.backgroundImages = {};
    State.backgroundImages[id] = file.name;
  }

  function clearImage() {
    const id = State.activeFormatId;
    if (!id) return;
    if (bgUrls[id]) URL.revokeObjectURL(bgUrls[id]);
    delete bgFiles[id];
    delete bgUrls[id];
    if (State.backgroundImages) delete State.backgroundImages[id];
    update();
    if (typeof Layers !== 'undefined' && Layers.update) Layers.update();  // desaparece la fila FONDO
  }

  // ── RENDER (bottom bar) ───────────────────────────────────

  function _render() {
    const container = document.getElementById('bb-background');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const wrap = document.createElement('div');
    wrap.className = 'bb-bg-wrap';

    const label = document.createElement('span');
    label.className = 'bb-slider-label';
    label.textContent = 'Fondo';

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'bb-bg-swatch';
    swatch.value = get(fmt.id);
    swatch.dataset.tooltip = 'Color de fondo del formato';
    swatch.addEventListener('input', () => {
      State.backgrounds[fmt.id] = swatch.value;
      _applyToLienzo();
    });

    // Botón "imagen de fondo" → selector de archivo
    const imgBtn = document.createElement('button');
    imgBtn.className = 'bb-bg-imgbtn' + (hasImage(fmt.id) ? ' active' : '');
    imgBtn.title = 'Imagen de fondo del formato';
    imgBtn.textContent = 'IMG';
    imgBtn.addEventListener('click', () => _pickImage());

    wrap.append(label, swatch, imgBtn);

    // "x" para quitar la imagen, sólo si hay
    if (hasImage(fmt.id)) {
      const clr = document.createElement('button');
      clr.className = 'bb-bg-clear';
      clr.title = 'Quitar imagen de fondo';
      clr.innerHTML = '&times;';
      clr.addEventListener('click', clearImage);
      wrap.append(clr);
    }

    container.appendChild(wrap);
  }

  let _fileInput = null;
  function _pickImage() {
    if (!_fileInput) {
      _fileInput = document.createElement('input');
      _fileInput.type = 'file';
      _fileInput.accept = 'image/*';
      _fileInput.style.display = 'none';
      _fileInput.addEventListener('change', () => {
        const f = _fileInput.files && _fileInput.files[0];
        if (f) setImageFile(f);
        _fileInput.value = '';
      });
      document.body.appendChild(_fileInput);
    }
    _fileInput.click();
  }

  // Visibilidad de la IMAGEN de fondo (toggle 👁 de la fila FONDO en CAPAS). El
  // color de fondo siempre se aplica; esto solo controla la imagen importada.
  function isVisible(formatId) {
    const id = formatId ?? State.activeFormatId;
    const comp = (typeof State !== 'undefined' && State.compositions) ? State.compositions[id] : null;
    return !comp || comp.bgVisible !== false;
  }

  function _applyToLienzo() {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    lienzo.style.backgroundColor = get();
    const url = isVisible() ? getImageUrl() : null;   // la imagen se puede ocultar; el color no
    lienzo.style.backgroundImage    = url ? `url("${url}")` : 'none';
    lienzo.style.backgroundSize     = 'cover';
    lienzo.style.backgroundPosition = 'center';
    lienzo.style.backgroundRepeat   = 'no-repeat';
  }

  return { init, update, get, getImageFile, getImageUrl, hasImage, isVisible, setImageFile, setImageFileFor, clearImage };
})();
