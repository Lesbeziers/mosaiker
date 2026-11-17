// ============================================================
// BLEND-MODE.JS — Modo de capa (blend mode) del MOSAICO por formato
//
// Fase 1: el modo se aplica al MOSAICO ENTERO contra el fondo del lienzo.
// - Editor: CSS mix-blend-mode sobre el canvas WebGL (#lienzo .mosaic-canvas),
//   que se mezcla con el fondo (color/imagen) que vive detrás en #lienzo.
// - Export: globalCompositeOperation antes de dibujar el mosaico sobre el fondo.
//
// El valor se guarda por formato en State.mosaicBlendMode[id]. Vive en la
// bottom-bar (#bb-blendmode), botón "Modo capa" (contextual: de momento
// ámbito Mosaico; la Fase 2 añadirá modo POR CELDA con selección).
//
// Modos incluidos: los soportados por CSS mix-blend-mode Y por canvas
// globalCompositeOperation con el MISMO nombre (paridad editor/export).
// "Pass Through" = normal (composición normal sobre el fondo).
// ============================================================

const BlendMode = (() => {

  const MODES = [
    // Normal (default) y Pass Through. En Fase 1 (mosaico entero) ambos componen
    // igual sobre el fondo; su diferencia real (grupo aislado vs dejar pasar los
    // modos por celda hasta el fondo) cobrará sentido en la Fase 2 por celda.
    { id: 'normal',      label: 'Normal',              css: 'normal',      canvas: 'source-over' },
    { id: 'pass-through',label: 'Pass Through',        css: 'normal',      canvas: 'source-over' },
    { id: 'multiply',    label: 'Multiplicar',         css: 'multiply',    canvas: 'multiply' },
    { id: 'screen',      label: 'Trama',               css: 'screen',      canvas: 'screen' },
    { id: 'overlay',     label: 'Superponer',          css: 'overlay',     canvas: 'overlay' },
    { id: 'darken',      label: 'Oscurecer',           css: 'darken',      canvas: 'darken' },
    { id: 'lighten',     label: 'Aclarar',             css: 'lighten',     canvas: 'lighten' },
    { id: 'color-dodge', label: 'Sobreexponer color',  css: 'color-dodge', canvas: 'color-dodge' },
    { id: 'color-burn',  label: 'Subexponer color',    css: 'color-burn',  canvas: 'color-burn' },
    { id: 'hard-light',  label: 'Luz intensa',         css: 'hard-light',  canvas: 'hard-light' },
    { id: 'soft-light',  label: 'Luz suave',           css: 'soft-light',  canvas: 'soft-light' },
    { id: 'difference',  label: 'Diferencia',          css: 'difference',  canvas: 'difference' },
    { id: 'exclusion',   label: 'Exclusión',           css: 'exclusion',   canvas: 'exclusion' },
    { id: 'hue',         label: 'Tono',                css: 'hue',         canvas: 'hue' },
    { id: 'saturation',  label: 'Saturación',          css: 'saturation',  canvas: 'saturation' },
    { id: 'color',       label: 'Color',               css: 'color',       canvas: 'color' },
    { id: 'luminosity',  label: 'Luminosidad',         css: 'luminosity',  canvas: 'luminosity' },
  ];

  function init() { update(); }

  // Llamada al cambiar de formato o de selección (Formats.setActive / selección).
  function update() { _render(); }

  // Modo POR DEFECTO del formato (fallback de las celdas sin override).
  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id || !State.mosaicBlendMode) return 'normal';
    return State.mosaicBlendMode[id] || 'normal';
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _selection() {
    return (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
  }

  // Modo efectivo de una celda (override o default de formato) — para la UI.
  function _effForKey(key) {
    const ov = State.cellBlendMode && State.cellBlendMode[key];
    if (ov) return ov;
    return get(State.activeFormatId);
  }

  // Valor a mostrar en el selector según el ámbito. Si las celdas del ámbito no
  // tienen todas el mismo modo → '__mixed__' (para que elegir cualquier opción,
  // incluida Normal, dispare el cambio y se aplique a TODAS).
  function _uniformOr(keys) {
    if (!keys.length) return get(State.activeFormatId);
    const first = _effForKey(keys[0]);
    return keys.every(k => _effForKey(k) === first) ? first : '__mixed__';
  }
  function _currentValue() {
    const sel = _selection();
    if (sel.length) return _uniformOr(sel);
    const all = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getAllCellKeys) ? Mosaic3D.getAllCellKeys() : [];
    return _uniformOr(all);
  }

  // Aplica el modo al ámbito: selección → celdas; sin selección → default del
  // formato + limpia overrides por celda (como el "reset a todas" de Sombra).
  function _applyMode(modeId) {
    const sel = _selection();
    if (sel.length) {
      if (!State.cellBlendMode) State.cellBlendMode = {};
      sel.forEach(k => {
        if (!modeId || modeId === 'normal') delete State.cellBlendMode[k];
        else State.cellBlendMode[k] = modeId;
      });
    } else {
      const fmt = State.activeFormatId;
      if (!State.mosaicBlendMode) State.mosaicBlendMode = {};
      if (!modeId || modeId === 'normal') delete State.mosaicBlendMode[fmt];
      else State.mosaicBlendMode[fmt] = modeId;
      // Reset a "todas": quita overrides por celda de este mosaico.
      if (State.cellBlendMode && typeof Mosaic3D !== 'undefined' && Mosaic3D.getAllCellKeys) {
        Mosaic3D.getAllCellKeys().forEach(k => { delete State.cellBlendMode[k]; });
      }
    }
    if (typeof Mosaic3D !== 'undefined' && Mosaic3D.rebuild) Mosaic3D.rebuild();
  }

  function _render() {
    const container = document.getElementById('bb-blendmode');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const sel = document.createElement('select');
    sel.className = 'bb-blend-select';
    const cur = _currentValue();
    // Estado mixto: opción informativa "(Mixto)" seleccionada, para que elegir
    // cualquier modo (incluido Normal) dispare el cambio y afecte a todas.
    if (cur === '__mixed__') {
      const mix = document.createElement('option');
      mix.value = '__mixed__';
      mix.textContent = '— Mixto —';
      mix.selected = true;
      sel.appendChild(mix);
    }
    MODES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (m.id === cur) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      if (sel.value === '__mixed__') return;   // no-op si vuelven a "Mixto"
      _applyMode(sel.value);
    });

    container.appendChild(sel);
  }

  // Índice de un modo (posición en MODES) para el shader por celda.
  function modeIndex(id) {
    const i = MODES.findIndex(m => m.id === id);
    return i < 0 ? 0 : i;
  }

  // ── SHADER POR CELDA ──────────────────────────────────────
  // Cada celda con modo != normal se dibuja con este material: muestrea su
  // textura (vUv) y el FONDO en espacio de pantalla (gl_FragCoord/uRes) y aplica
  // el modo de fusión de Photoshop, componiendo como PS: bg*(1-a)+blend(bg,src)*a.
  const _VERT = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `;

  const _FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D map;       // textura de la celda
    uniform sampler2D fondoTex;  // fondo en espacio de pantalla
    uniform vec2  uRes;          // tamaño del framebuffer en px
    uniform float uOpacity;      // opacidad efectiva de la celda
    uniform int   uMode;         // índice de modo (MODES)
    uniform float uFlipY;        // 1.0 = voltear Y al muestrear el fondo

    // ── separables (por canal) ──
    float bOverlay(float b, float s){ return b < 0.5 ? 2.0*b*s : 1.0 - 2.0*(1.0-b)*(1.0-s); }
    float bDodge(float b, float s){ return s >= 1.0 ? 1.0 : min(1.0, b/(1.0-s)); }
    float bBurn(float b, float s){ return s <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0-b)/s); }
    float bSoft(float b, float s){
      if (s < 0.5) return b - (1.0-2.0*s)*b*(1.0-b);
      float d = (b < 0.25) ? ((16.0*b-12.0)*b+4.0)*b : sqrt(b);
      return b + (2.0*s-1.0)*(d-b);
    }
    vec3 sep(vec3 b, vec3 s, int m){
      if (m==2) return b*s;                              // multiply
      if (m==3) return b+s-b*s;                          // screen
      if (m==4) return vec3(bOverlay(b.r,s.r),bOverlay(b.g,s.g),bOverlay(b.b,s.b));
      if (m==5) return min(b,s);                         // darken
      if (m==6) return max(b,s);                         // lighten
      if (m==7) return vec3(bDodge(b.r,s.r),bDodge(b.g,s.g),bDodge(b.b,s.b));
      if (m==8) return vec3(bBurn(b.r,s.r),bBurn(b.g,s.g),bBurn(b.b,s.b));
      if (m==9) return vec3(bOverlay(s.r,b.r),bOverlay(s.g,b.g),bOverlay(s.b,b.b)); // hard light
      if (m==10) return vec3(bSoft(b.r,s.r),bSoft(b.g,s.g),bSoft(b.b,s.b));
      if (m==11) return abs(b-s);                        // difference
      if (m==12) return b+s-2.0*b*s;                     // exclusion
      return s;
    }
    // ── no separables (HSL/luminosidad) ──
    float lum(vec3 c){ return dot(c, vec3(0.3,0.59,0.11)); }
    vec3 clipColor(vec3 c){
      float l = lum(c);
      float n = min(min(c.r,c.g),c.b);
      float x = max(max(c.r,c.g),c.b);
      if (n < 0.0) c = l + (c-l)*l/max(l-n, 1e-5);
      if (x > 1.0) c = l + (c-l)*(1.0-l)/max(x-l, 1e-5);
      return c;
    }
    vec3 setLum(vec3 c, float l){ return clipColor(c + (l - lum(c))); }
    float sat(vec3 c){ return max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b); }
    vec3 setSat(vec3 c, float s){
      float mn = min(min(c.r,c.g),c.b);
      float mx = max(max(c.r,c.g),c.b);
      vec3 r = vec3(0.0);
      if (mx > mn) r = (c - mn) / (mx - mn) * s;
      return r;
    }
    vec3 nonSep(vec3 b, vec3 s, int m){
      if (m==13) return setLum(setSat(s, sat(b)), lum(b)); // hue
      if (m==14) return setLum(setSat(b, sat(s)), lum(b)); // saturation
      if (m==15) return setLum(s, lum(b));                 // color
      if (m==16) return setLum(b, lum(s));                 // luminosity
      return s;
    }

    void main(){
      vec4 src = texture2D(map, vUv);
      vec2 scr = gl_FragCoord.xy / uRes;
      if (uFlipY > 0.5) scr.y = 1.0 - scr.y;
      vec3 bg = texture2D(fondoTex, scr).rgb;
      vec3 blended;
      if (uMode <= 1) blended = src.rgb;         // normal / pass-through
      else if (uMode <= 12) blended = sep(bg, src.rgb, uMode);
      else blended = nonSep(bg, src.rgb, uMode);
      float a = src.a * uOpacity;
      vec3 outRgb = mix(bg, blended, a);         // PS: bg*(1-a) + blend*a
      gl_FragColor = vec4(outRgb, src.a);        // alpha = cobertura de la celda
    }
  `;

  // Crea el ShaderMaterial de una celda con modo de fusión.
  function makeMaterial(THREE, opts) {
    return new THREE.ShaderMaterial({
      uniforms: {
        map:      { value: opts.map },
        fondoTex: { value: opts.fondoTex },
        uRes:     { value: opts.resolution },
        uOpacity: { value: (typeof opts.opacity === 'number') ? opts.opacity : 1 },
        uMode:    { value: opts.modeIndex | 0 },
        uFlipY:   { value: opts.flipY ? 1.0 : 0.0 },
      },
      vertexShader:   _VERT,
      fragmentShader: _FRAG,
      transparent:    true,
      depthWrite:     false,
    });
  }

  return { init, update, get, modeIndex, makeMaterial, MODES };
})();
