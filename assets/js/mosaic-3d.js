// ============================================================
// MOSAIC-3D.JS — Render del esqueleto en 3D dentro del lienzo
//
// - Carga Three.js (módulo ES6) de forma dinámica para mantener
//   el resto del código en patrón IIFE clásico.
// - Monta el <canvas> WebGL dentro de #lienzo.
// - Lee esqueletos declarativos de Skeletons y los traduce a
//   geometrías 3D (ShapeGeometry con esquinas redondeadas).
// - Acepta cambios de parámetros vía setTransform() — los
//   slidersTRANSFORMAR del sidebar lo llaman en tiempo real.
// ============================================================

const Mosaic3D = (() => {

  // Constantes geométricas (heredadas del prototipo)
  const CELL_H  = 1.0;
  const VERT_W  = 0.65;
  const HORIZ_W = VERT_W * 2 + 0.08;

  // Parámetros de transformación (espejo de State.transform)
  // Los inicializamos en init() leyendo de State.
  const params = {
    rotX:   35,
    rotY:    0,
    camX:    0,
    camY:    0,
    camZ:   10,
    gap:     8,
    radius: 12,
  };

  let THREE          = null;
  let scene          = null;
  let camera         = null;
  let renderer       = null;
  let pivot          = null;
  let mounted        = false;
  let activeSkeleton = null;
  let mosaicBounds   = null; // { width, height } en unidades 3D del mosaico actual

  // Cache de THREE.Texture indexado por `${n}_${ratio}`. Evita re-subir
  // la imagen a la GPU en cada rebuild (el mayor coste de los sliders
  // de gap/esquinas). Se invalida en refreshTextures().
  const textureCache = {};

  // Cache de THREE.CanvasTexture de badges de prefijo, indexado por nº.
  // El badge es una etiqueta circular con el nº del hueco que se superpone
  // en cada mesh para identificar visualmente qué prefijo le corresponde.
  const badgeCache = {};

  // ── INICIALIZACIÓN ───────────────────────────────────────

  async function init() {
    if (mounted) return;
    THREE = await import('./three/three.module.min.js');

    // Sincroniza parámetros con el estado global si ya está poblado
    if (typeof State !== 'undefined' && State.transform) {
      Object.assign(params, State.transform);
    }

    renderer = new THREE.WebGLRenderer({
      antialias:           true,
      alpha:               true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);

    const lienzo = document.getElementById('lienzo');
    if (lienzo) {
      renderer.domElement.classList.add('mosaic-canvas');
      lienzo.appendChild(renderer.domElement);
    }

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    pivot = new THREE.Group();
    scene.add(pivot);

    mounted = true;
    _applyTransform();
  }

  // ── API PÚBLICA ──────────────────────────────────────────

  function setSkeleton(esqueleto) {
    activeSkeleton = esqueleto;
    _build();
    fitToLienzo();
    render();
  }

  // Llamar cuando cambia el formato activo (lienzo cambia de proporción)
  function setFormat(/* fmt */) {
    fitToLienzo();
    render();
  }

  // Calcula la cámara Z para que el mosaico llene el lienzo CON DESBORDE
  // (las carátulas de los bordes se cortan parcialmente).
  // Sincroniza el valor con State.transform.camZ y avisa a UI.
  function fitToLienzo() {
    if (!mounted || !mosaicBounds || !camera) return;
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    const lienzoW = lienzo.clientWidth;
    const lienzoH = lienzo.clientHeight;
    if (lienzoW === 0 || lienzoH === 0) return;

    const aspect = lienzoW / lienzoH;
    const fovRad = camera.fov * Math.PI / 180;
    const halfTan = Math.tan(fovRad / 2);

    // Corrección por inclinación: con rotX>0 el mosaico se proyecta más bajo
    const rotXRad   = params.rotX * Math.PI / 180;
    const effHeight = mosaicBounds.height * Math.cos(rotXRad);

    const dForHeight = (effHeight           / 2) / halfTan;
    const dForWidth  = (mosaicBounds.width  / 2) / (halfTan * aspect);

    // Factor < 1 acerca la cámara → el mosaico desborda los bordes
    const overflow = 0.62;
    const newZ = Math.max(dForHeight, dForWidth) * overflow;

    params.camZ = newZ;
    if (typeof State !== 'undefined' && State.transform) {
      State.transform.camZ = newZ;
    }
    _applyTransform();

    if (typeof UI !== 'undefined' && UI.syncTransformSliders) {
      UI.syncTransformSliders();
    }
  }

  function setTransform(updates) {
    let needsRebuild = false;
    for (const key in updates) {
      if (!(key in params)) continue;
      if (params[key] === updates[key]) continue;
      params[key] = updates[key];
      if (key === 'gap' || key === 'radius') needsRebuild = true;
    }
    if (needsRebuild) _build();
    _applyTransform();
    render();
  }

  // Cambia el offset Y de una columna (sólo type='columns').
  // Modifica State.transform.colOffsets y reconstruye el mosaico.
  function setColOffset(ci, value) {
    if (!mounted || !activeSkeleton) return;
    if (typeof State === 'undefined' || !State.transform || !State.transform.colOffsets) return;
    State.transform.colOffsets[ci] = value;
    _build();
    render();
  }

  function resize() {
    if (!mounted) return;
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    const w = lienzo.clientWidth;
    const h = lienzo.clientHeight;
    if (w === 0 || h === 0) return;

    renderer.setSize(w, h, false);
    renderer.domElement.style.width  = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    if (!mounted || !scene || !camera || !renderer) return;
    renderer.render(scene, camera);
  }

  // Rebuild de geometría sin tocar texturas ni cámara. Útil cuando cambian
  // parámetros que no están en `params` pero sí afectan al _build (como
  // colOffsets en State.transform).
  function rebuild() {
    if (!mounted || !activeSkeleton) return;
    _build();
    render();
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _applyTransform() {
    if (!mounted || !pivot || !camera) return;
    pivot.rotation.x = -THREE.MathUtils.degToRad(params.rotX);
    pivot.rotation.y =  THREE.MathUtils.degToRad(params.rotY);
    camera.position.set(params.camX, params.camY, params.camZ);
    camera.updateProjectionMatrix();
  }

  function _build() {
    if (!mounted || !activeSkeleton) return;

    // Limpia meshes anteriores. NO disponemos de las texturas — viven
    // en textureCache para reutilizarse entre rebuilds.
    while (pivot.children.length > 0) {
      const m = pivot.children[0];
      pivot.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    }

    if (activeSkeleton.type === 'grid') {
      _buildGrid(activeSkeleton);
    } else if (activeSkeleton.type === 'columns') {
      _buildColumns(activeSkeleton);
    }
  }

  function _buildGrid(esq) {
    const { cols, rows, slots } = esq;
    const gap = params.gap * 0.01;

    // Determinar ratio de cada columna a partir de la primera fila
    const colWidths = [];
    for (let c = 0; c < cols; c++) {
      const slot = slots[c];
      colWidths.push(slot && slot.ratio === 'H' ? HORIZ_W : VERT_W);
    }

    const rowW   = colWidths.reduce((a, b) => a + b, 0) + gap * (cols - 1);
    const totalH = rows * CELL_H + (rows - 1) * gap;
    const startX = -rowW  / 2;
    const startY =  totalH / 2 - CELL_H / 2;

    // Guarda bounds para fitToLienzo()
    mosaicBounds = { width: rowW, height: totalH };

    for (let row = 0; row < rows; row++) {
      let xCursor = startX;
      const y = startY - row * (CELL_H + gap);
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const slot = slots[idx];
        if (!slot) continue;
        const cw = colWidths[col];
        _addMesh(slot, xCursor, y, cw, CELL_H);
        xCursor += cw + gap;
      }
    }
  }

  // Layout 'columns': cada columna lista celdas en orden vertical.
  // Cada celda es type 'h' (horizontal a ancho de columna) o 'v' (vertical,
  // pareada con la siguiente para llenar el ancho de columna).
  // Soporta defaultOffsets[col] para desplazamiento Y por columna.
  function _buildColumns(esq) {
    const gap     = params.gap * 0.01;
    const H_H     = CELL_H * 0.5625;        // alto horizontal (16:9)
    const V_H     = CELL_H;                  // alto vertical
    const colW    = VERT_W * 2 + gap;       // ancho de columna (2 verticales + gap)
    const numCols = esq.cols.length;
    const totalW  = numCols * colW + (numCols - 1) * gap;
    const startX  = -totalW / 2;
    // Lee offsets del estado runtime; si no coinciden con el nº de columnas,
    // cae al defaultOffsets del esqueleto, y si tampoco hay, ceros.
    const stateOffsets = State?.transform?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numCols)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numCols).fill(0));

    let maxColH = 0;

    esq.cols.forEach((col, ci) => {
      const xCol = startX + ci * (colW + gap);

      // Calcula altura total de la columna
      let colH = 0;
      let i = 0;
      while (i < col.cells.length) {
        const cell = col.cells[i];
        if (cell.type === 'h') {
          colH += H_H;
          i++;
        } else {
          colH += V_H;
          i += 2; // par de verticales
        }
        if (i < col.cells.length) colH += gap;
      }
      if (colH > maxColH) maxColH = colH;

      // Coloca celdas de arriba abajo desde el centro + offset
      let cursorY = colH / 2 + (offsets[ci] || 0);
      i = 0;
      while (i < col.cells.length) {
        const cell = col.cells[i];
        if (cell.type === 'h') {
          const centerY = cursorY - H_H / 2;
          _addMesh(
            { n: cell.n, ratio: 'H', opacity: cell.opacity ?? 1 },
            xCol, centerY, colW, H_H
          );
          cursorY -= H_H + gap;
          i++;
        } else {
          const cellR   = col.cells[i + 1];
          const centerY = cursorY - V_H / 2;
          _addMesh(
            { n: cell.n, ratio: 'V', opacity: cell.opacity ?? 1 },
            xCol, centerY, VERT_W, V_H
          );
          if (cellR) {
            _addMesh(
              { n: cellR.n, ratio: 'V', opacity: cellR.opacity ?? 1 },
              xCol + VERT_W + gap, centerY, VERT_W, V_H
            );
          }
          cursorY -= V_H + gap;
          i += 2;
        }
      }
    });

    // Bounds conservadores incorporando el rango de offsets
    const offsetSpread = Math.max(...offsets) - Math.min(...offsets);
    mosaicBounds = { width: totalW, height: maxColH + offsetSpread };
  }

  function _addMesh(slot, x, centerY, w, h) {
    const r   = (params.radius / 1000) * CELL_H;
    const geo = _makeRoundedRect(w, h, r);
    const tex = _getOrCreateTexture(slot);

    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      side:        THREE.FrontSide,
      transparent: true,
      opacity:     slot.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + w / 2, centerY, 0);

    // Badge de prefijo (Sprite — siempre mira a cámara, máxima legibilidad).
    // Se añade como hijo del mesh para que herede su posición y opacidad
    // implícita (transformaciones del pivot), pero el Sprite ignora la
    // rotación 3D, así que el número se lee SIEMPRE de frente.
    const badgeTex = _getOrCreateBadgeTexture(slot.n);
    const badgeMat = new THREE.SpriteMaterial({
      map:        badgeTex,
      depthTest:  false,
      transparent:true,
    });
    const badge = new THREE.Sprite(badgeMat);
    const badgeSize = Math.min(w, h) * 0.28; // proporcional al hueco
    badge.scale.set(badgeSize, badgeSize, 1);
    badge.position.set(0, 0, 0.01); // ligeramente por delante del mesh
    badge.renderOrder = 10;          // asegura que se pinta después del mesh
    badge.visible = !!(typeof State !== 'undefined' && State.showImagePrefixes);
    badge.userData.isPrefixBadge = true;
    mesh.add(badge);

    pivot.add(mesh);
  }

  // Devuelve la textura para un slot. Cache por `${n}_${ratio}` —
  // si el mismo prefijo aparece con distinto ratio en otro esqueleto,
  // se cachea independientemente para que el placeholder coincida.
  function _getOrCreateTexture(slot) {
    const key = `${slot.n}_${slot.ratio}`;
    if (textureCache[key]) return textureCache[key];

    let tex;
    const loadedImg = (typeof Images !== 'undefined') ? Images.getImage(slot.n) : null;
    if (loadedImg) {
      tex = new THREE.Texture(loadedImg);
      tex.colorSpace = THREE.SRGBColorSpace;
    } else {
      tex = _makePlaceholder(slot.ratio === 'H', slot.n);
    }
    // Calidad de muestreo: mipmaps trilineares + anisotropy máxima.
    // - Mipmaps eliminan el aliasing al ver la textura downsampled.
    // - Anisotropy compensa el blur de mipmap en ángulos oblicuos
    //   (clave porque el mosaico está inclinado en 3D).
    // - LinearFilter al magnificar suaviza el upscale en zoom cerrado.
    tex.minFilter       = THREE.LinearMipMapLinearFilter;
    tex.magFilter       = THREE.LinearFilter;
    tex.generateMipmaps = true;
    if (renderer && renderer.capabilities) {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    tex.needsUpdate = true;
    textureCache[key] = tex;
    return tex;
  }

  // Invalidación total del cache de texturas. Se llama cuando cambia
  // el contenido del cache de Images (carga/borrado de imágenes).
  function refreshTextures() {
    if (!mounted) return;
    Object.values(textureCache).forEach(tex => tex.dispose());
    Object.keys(textureCache).forEach(k => delete textureCache[k]);
    if (activeSkeleton) {
      _build();
      render();
    }
  }

  // Crea (o reutiliza) la textura del badge para un prefijo dado.
  // Círculo amarillo con borde negro y nº centrado en negro — alto contraste
  // garantizado sobre cualquier fondo (claro u oscuro).
  function _getOrCreateBadgeTexture(n) {
    if (badgeCache[n]) return badgeCache[n];

    const size = 128;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cx = c.getContext('2d');

    // Sombra suave para separar del fondo (clave ahora que no hay borde)
    cx.shadowColor   = 'rgba(0,0,0,0.55)';
    cx.shadowBlur    = 10;
    cx.shadowOffsetY = 2;

    // Círculo amarillo sólido (sin borde)
    cx.fillStyle = '#f0a500';
    cx.beginPath();
    cx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
    cx.fill();

    // Desactivamos sombra para que el número no la herede
    cx.shadowColor = 'transparent';

    // Número centrado en negro
    cx.fillStyle    = '#000';
    cx.font         = `bold ${Math.round(size * 0.46)}px "Apercu Movistar", sans-serif`;
    cx.textAlign    = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(String(n).padStart(2, '0'), size / 2, size / 2 + 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    badgeCache[n] = tex;
    return tex;
  }

  // Muestra/oculta los badges de prefijo de todos los meshes.
  // Lo llama UI cuando el usuario marca/desmarca "Mostrar prefijos".
  function setPrefixesVisible(visible) {
    if (!mounted || !pivot) return;
    pivot.traverse(obj => {
      if (obj.userData && obj.userData.isPrefixBadge) {
        obj.visible = !!visible;
      }
    });
    render();
  }

  function _makeRoundedRect(w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y,     x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h,     x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y,         x + r, y);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape, 4);
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2]     = (pos.getX(i) - x) / w;
      uvs[i * 2 + 1] = (pos.getY(i) - y) / h;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }

  function _makePlaceholder(isHoriz, n) {
    const pw = isHoriz ? 640 : 320;
    const ph = 480;
    const c  = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const cx = c.getContext('2d');
    cx.fillStyle = '#1a1a1a';
    cx.fillRect(0, 0, pw, ph);
    cx.strokeStyle = '#333';
    cx.lineWidth = 2;
    cx.strokeRect(2, 2, pw - 4, ph - 4);
    cx.fillStyle = '#f0a500';
    cx.font = `bold ${Math.round(ph * 0.13)}px 'Apercu Movistar', sans-serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(`img_${String(n).padStart(2, '0')}`, pw / 2, ph / 2 - 22);
    cx.fillStyle = '#666';
    cx.font = `${Math.round(ph * 0.085)}px 'Apercu Movistar', sans-serif`;
    cx.fillText(isHoriz ? '16:9' : '9:16', pw / 2, ph / 2 + 26);
    return new THREE.CanvasTexture(c);
  }

  // Expone la instancia de Three.js (importada perezosamente en init).
  // Lo usa Export para crear su propio renderer offscreen a resolución real
  // sin tener que volver a importar el módulo.
  function getTHREE() {
    return THREE;
  }

  return { init, setSkeleton, setFormat, setTransform, setColOffset, resize, render, rebuild, fitToLienzo, refreshTextures, setPrefixesVisible, getTHREE };
})();
