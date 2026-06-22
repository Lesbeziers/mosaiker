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
  // Fuente única de verdad de proporciones: verticales 9:16, horizontales 16:9.
  const VERT_W  = CELL_H * 1200 / 1800;  // 0.667 — carátula vertical 2:3 (1200×1800)
  const HORIZ_W = CELL_H * 16 / 9;   // 1.7778 — carátula horizontal 16:9 pura

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

  // Textura del sello (banda central de los esqueletos 'stacks'). Se cachea
  // y se invalida en refreshTextures(). userData guarda si es placeholder y
  // a qué bitmap apunta para regenerarla sólo cuando cambia.
  let selloTexture = null;

  // ── Selección / ajuste de encuadre por contenedor ──────────
  // Cada tile recibe una clave estable `${skeletonId}:${índiceDeRender}`.
  // El ajuste (dx, dy en UV + escala) vive en State.imageAdjust[clave].
  let _slotIndex    = 0;     // contador de tiles durante _build()
  let _raycaster    = null;  // THREE.Raycaster (lazy)
  let _highlightKey = null;  // contenedor con foco amarillo (interacción) o null
  let _capturing    = false; // true durante el snapshot de VER TODAS: oculta
                             // ayudas de edición (índices + resalte amarillo)
  let _dropHintKey  = null;  // contenedor resaltado al arrastrar un archivo encima
  let _pulseRAF     = 0;     // bucle de animación del parpadeo de la pista de drop
  let _selectedKeys = new Set(); // celdas seleccionadas (shift+clic) — transitorio
  let _groupSeq     = 1;     // contador para ids de grupo de celdas

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
    _highlightKey = null;  // las claves de contenedor cambian de esqueleto
    _build();
    fitToLienzo();
    render();
  }

  // Llamar cuando cambia el formato activo (lienzo cambia de proporción)
  function setFormat(/* fmt */) {
    fitToLienzo();
    render();
  }

  // Aplica la composición de un formato: carga su transform en params, monta su
  // mosaico y, si es la primera vez (sin encuadre previo), auto-encuadra; si ya
  // estaba trabajado, restaura el encuadre guardado tal cual.
  function applyFormat(comp) {
    if (!mounted || !comp) return;
    const t = comp.transform || {};
    ['rotX', 'rotY', 'camX', 'camY', 'camZ', 'gap', 'radius'].forEach(k => {
      if (typeof t[k] === 'number') params[k] = t[k];
    });
    _highlightKey = null;
    activeSkeleton = (comp.skeletonId && typeof Skeletons !== 'undefined')
      ? Skeletons.getById(comp.skeletonId) : null;

    if (!activeSkeleton) {
      // Formato sin mosaico aún: vacía el pivot.
      while (pivot.children.length > 0) {
        const m = pivot.children[0];
        pivot.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
      _applyTransform();
      render();
      return;
    }

    _build();
    if (comp.fitted) {
      _applyTransform();   // restaura la cámara guardada
      render();
    } else {
      fitToLienzo();       // primer encuadre (escribe en comp.transform vía State)
      comp.fitted = true;
    }
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

    // "Fit" = recentrar + reajustar zoom. El paneo (camX/camY) es global y se
    // recalcula igual que el zoom en cada cambio de formato/esqueleto, para que
    // al entrar a un formato (p.ej. desde VER TODAS) el mosaico salga centrado.
    // Los sliders CÁMARA X/Y siguen permitiendo paneo manual tras el ajuste.
    params.camZ = newZ;
    params.camX = 0;
    params.camY = 0;
    if (typeof State !== 'undefined' && State.transform) {
      State.transform.camZ = newZ;
      State.transform.camX = 0;
      State.transform.camY = 0;
    }
    _applyTransform();

    // El marco blanco de 'stacks' se dimensiona en función de camZ; ahora
    // que la cámara está ajustada, reconstruimos para que salga a 3 px.
    if (activeSkeleton && activeSkeleton.type === 'stacks') {
      _build();
    }

    if (typeof UI !== 'undefined' && UI.syncTransformSliders) {
      UI.syncTransformSliders();
    }

    // Dibuja el resultado del encuadre. Imprescindible: al entrar a un formato
    // NUEVO, applyFormat() llama aquí sin un render() posterior; sin esto el
    // mosaico recién construido se encuadra pero no se pinta y la pantalla
    // conserva el frame del formato anterior (se "arreglaba" al primer clic).
    render();
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

    _slotIndex = 0; // reinicia el contador de claves de contenedor

    if (activeSkeleton.type === 'grid') {
      _buildGrid(activeSkeleton);
    } else if (activeSkeleton.type === 'columns') {
      _buildColumns(activeSkeleton);
    } else if (activeSkeleton.type === 'stacks') {
      _buildStacks(activeSkeleton);
    } else if (activeSkeleton.type === 'rows') {
      _buildRows(activeSkeleton);
    } else if (activeSkeleton.type === 'vcolumns') {
      _buildVColumns(activeSkeleton);
    } else if (activeSkeleton.type === 'free') {
      _buildFree(activeSkeleton);
    }

    // Post-proceso: contenedores virtuales (grupos de celdas que comparten una
    // imagen repartida sobre su bounding box). Se hace tras colocar las celdas
    // porque necesita sus posiciones para calcular el bbox.
    _applyGroups();
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
    const V_H     = CELL_H;                  // alto vertical
    const colW    = VERT_W * 2 + gap;       // ancho de columna (2 verticales + gap)
    const H_H     = colW * 9 / 16;          // alto horizontal 16:9 (ancho = colW)
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

  // Layout 'rows': transpuesto de 'columns'. Cada fila es una hilera de
  // carátulas HORIZONTALES (16:9). Los offsets desplazan la X de cada fila
  // (efecto ladrillo). Reutiliza State.transform.colOffsets como offset por
  // hilera; setColOffset() ya es agnóstico al eje.
  function _buildRows(esq) {
    const gap     = params.gap * 0.01;
    const cellW   = HORIZ_W;            // ancho carátula horizontal
    const cellH   = HORIZ_W * 9 / 16;  // alto 16:9
    const numRows = esq.rows.length;
    const totalH  = numRows * cellH + (numRows - 1) * gap;
    const startY  = totalH / 2 - cellH / 2;

    // Offsets X por fila (runtime → default → ceros)
    const stateOffsets = State?.transform?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numRows)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numRows).fill(0));

    let rowW = 0;
    esq.rows.forEach((row, ri) => {
      const n = row.cells.length;
      rowW = n * cellW + (n - 1) * gap;
      const y = startY - ri * (cellH + gap);
      let x = -rowW / 2 + (offsets[ri] || 0);
      row.cells.forEach(cell => {
        _addMesh({ n: cell.n, ratio: 'H', opacity: cell.opacity ?? 1 }, x, y, cellW, cellH);
        x += cellW + gap;
      });
    });

    const offsetSpread = Math.max(0, ...offsets) - Math.min(0, ...offsets);
    mosaicBounds = { width: rowW + offsetSpread, height: totalH };
  }

  // Layout 'vcolumns': columnas de UNA vertical (9:16) de ancho, con offset
  // Y por columna (cascada). Los sliders mueven la posición vertical de cada
  // columna vía State.transform.colOffsets.
  function _buildVColumns(esq) {
    const gap     = params.gap * 0.01;
    const cellW   = VERT_W;            // 2:3 (1200×1800), misma fuente que el resto
    const numCols = esq.cols.length;
    const totalW  = numCols * cellW + (numCols - 1) * gap;
    const startX  = -totalW / 2;

    const stateOffsets = State?.transform?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numCols)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numCols).fill(0));

    let maxColH = 0;
    esq.cols.forEach((col, ci) => {
      const xCol = startX + ci * (cellW + gap);
      const nCells = col.cells.length;
      const colH = nCells * CELL_H + (nCells - 1) * gap;
      if (colH > maxColH) maxColH = colH;
      let cursorY = colH / 2 + (offsets[ci] || 0);
      col.cells.forEach(cell => {
        const centerY = cursorY - CELL_H / 2;
        _addMesh({ n: cell.n, ratio: 'V', opacity: cell.opacity ?? 1 }, xCol, centerY, cellW, CELL_H);
        cursorY -= CELL_H + gap;
      });
    });

    const offsetSpread = Math.max(...offsets) - Math.min(...offsets);
    mosaicBounds = { width: totalW, height: maxColH + offsetSpread };
  }

  // Layout 'free': teselado libre. Cada celda lleva {x,y,w,h} en unidades de
  // rejilla y su ratio ('H'|'V'|'S'). El eje Y de la rejilla crece hacia abajo.
  // Cada pieza se mete medio gap por lado → separación uniforme entre todas.
  function _buildFree(esq) {
    const gap  = params.gap * 0.01;
    const unit = CELL_H;
    let maxX = 0, maxY = 0;
    esq.cells.forEach(c => { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); });
    const totalW = maxX * unit, totalH = maxY * unit;
    const offX = -totalW / 2, topY = totalH / 2;
    esq.cells.forEach(c => {
      const w = c.w * unit - gap;
      const h = c.h * unit - gap;
      const left = offX + c.x * unit + gap / 2;
      const top  = topY - c.y * unit - gap / 2;
      _addMesh({ n: c.n, ratio: c.r, opacity: 1 }, left, top - h / 2, w, h);
    });
    mosaicBounds = { width: totalW, height: totalH };
  }

  // Layout 'stacks': columnas de UNA vertical de ancho, con escalonado
  // FIJO por columna (drop en pasos de carátula) y una banda central que
  // reserva un hueco más ancho entre dos columnas. Sin sliders de offset.
  // Las celdas marcadas frame (opacidad 1) llevan marco blanco de 3 pt.
  function _buildStacks(esq) {
    const gap       = params.gap * 0.01;
    const step      = CELL_H + gap;
    const bandAfter = esq.band ? esq.band.after : -1;
    const bandW     = (esq.band && esq.band.width) || VERT_W;

    // 1) Calcula posiciones de cada celda y los límites del mosaico.
    //    La banda se inserta como una "calle" entre dos columnas, con su
    //    propio gap a cada lado (igual que la separación entre columnas).
    const cells = [];
    let cursor = 0, maxX = 0, topMost = -Infinity, bottomMost = Infinity;
    let laneX = null;
    esq.cols.forEach((col, ci) => {
      const drop = col.drop || 0;
      let top = -drop * step;
      col.cells.forEach(c => {
        const cy = top - CELL_H / 2;
        cells.push({ x: cursor, cy, n: c.n, opacity: c.opacity ?? 1 });
        if (cursor + VERT_W > maxX)     maxX = cursor + VERT_W;
        if (top > topMost)              topMost = top;
        if (cy - CELL_H / 2 < bottomMost) bottomMost = cy - CELL_H / 2;
        top -= step;
      });
      cursor += VERT_W + gap;
      if (ci === bandAfter) { laneX = cursor; cursor += bandW + gap; }
    });

    const width   = maxX;
    const height  = topMost - bottomMost;
    const offsetX = -width / 2;
    const offsetY = -(topMost + bottomMost) / 2;

    // 2) Crea los meshes de carátulas centrados
    cells.forEach(c => {
      _addMesh(
        { n: c.n, ratio: 'V', opacity: c.opacity, frame: c.opacity >= 0.99 },
        c.x + offsetX, c.cy + offsetY, VERT_W, CELL_H
      );
    });

    // 3) Banda central con el sello repetido en vertical
    if (esq.band && laneX !== null) {
      _addSelloLane(
        laneX + offsetX, bandW,
        topMost + offsetY, bottomMost + offsetY,
        esq.band.opacity ?? 0.2, gap
      );
    }

    mosaicBounds = { width, height };
  }

  // Dibuja la "calle" del sello: una copia centrada a 100% y copias iguales
  // hacia arriba y abajo (misma opacidad reducida) hasta llenar la banda.
  // El sello se escala a `laneW` de ancho; el alto sale de su proporción.
  function _addSelloLane(xLeft, laneW, top, bottom, dimOpacity, gap) {
    const { tex, aspect } = _getSelloTexture();
    const selloH = laneW / aspect;
    if (!(selloH > 0)) return;

    const centerY  = (top + bottom) / 2;
    const bandHalf = (top - bottom) / 2;
    // Paso entre copias = alto del sello + el mismo gap que separa columnas.
    const pitch = selloH + (gap || 0);

    // Copia central a 100%
    _addSelloMesh(xLeft, centerY, laneW, selloH, tex, 1.0);

    // Copias hacia arriba/abajo mientras la copia entre en la banda
    for (let k = 1; k <= 200; k++) {
      const off = k * pitch;
      if (off - selloH / 2 >= bandHalf) break; // ya fuera de la banda
      _addSelloMesh(xLeft, centerY + off, laneW, selloH, tex, dimOpacity);
      _addSelloMesh(xLeft, centerY - off, laneW, selloH, tex, dimOpacity);
    }
  }

  function _addSelloMesh(xLeft, centerY, w, h, tex, opacity) {
    const geo = _makeRoundedRect(w, h, 0, null); // logos sin esquinas redondeadas
    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      side:        THREE.FrontSide,
      transparent: true,
      opacity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xLeft + w / 2, centerY, 0);
    mesh.renderOrder = 1;
    pivot.add(mesh);
  }

  // Devuelve { tex, aspect } del sello. Usa el bitmap cargado (SELLO_*.png)
  // o un placeholder si no hay ninguno. Cachea para no re-subir a GPU.
  function _getSelloTexture() {
    const img = (typeof Images !== 'undefined' && Images.getSello) ? Images.getSello() : null;

    if (!img) {
      if (!selloTexture || !selloTexture.userData || selloTexture.userData.placeholder !== true) {
        if (selloTexture) selloTexture.dispose();
        selloTexture = _makeSelloPlaceholder();
        selloTexture.userData = { placeholder: true };
      }
      return { tex: selloTexture, aspect: 1 };
    }

    if (!selloTexture || !selloTexture.userData || selloTexture.userData.imgRef !== img) {
      if (selloTexture) selloTexture.dispose();
      selloTexture = new THREE.Texture(img);
      selloTexture.colorSpace     = THREE.SRGBColorSpace;
      selloTexture.minFilter      = THREE.LinearMipMapLinearFilter;
      selloTexture.magFilter      = THREE.LinearFilter;
      selloTexture.generateMipmaps = true;
      if (renderer && renderer.capabilities) {
        selloTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      selloTexture.needsUpdate = true;
      selloTexture.userData = { placeholder: false, imgRef: img };
    }
    const aspect = (img.width || 1) / (img.height || 1);
    return { tex: selloTexture, aspect };
  }

  function _makeSelloPlaceholder() {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const cx = c.getContext('2d');
    cx.fillStyle = '#1a1a1a';
    cx.fillRect(0, 0, s, s);
    cx.strokeStyle = '#444';
    cx.lineWidth = 4;
    cx.strokeRect(3, 3, s - 6, s - 6);
    cx.fillStyle = '#f0a500';
    cx.font = `bold ${Math.round(s * 0.16)}px 'Apercu Movistar', sans-serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('SELLO', s / 2, s / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ¿Mostrar el marco blanco de las celdas (stacks) en el formato activo?
  function _stacksBorderVisible() {
    if (typeof State === 'undefined' || !State.stacksBorder) return true;
    const v = State.stacksBorder[State.activeFormatId];
    return v === undefined ? true : !!v;
  }

  function _addMesh(slot, x, centerY, w, h) {
    const r = (params.radius / 1000) * CELL_H;

    // Clave estable del contenedor (orden de render dentro del esqueleto).
    const slotKey = (activeSkeleton ? activeSkeleton.id : '?') + ':' + _slotIndex;
    _slotIndex++;

    // Foco amarillo del contenedor: rectángulo algo mayor por detrás → borde.
    // Si hay una "pista de drop" activa (arrastrando un archivo), tiene
    // prioridad y se marca para animarla (parpadeo suave); si no, es el foco
    // estático de la carátula con la que se interactúa.
    const isDropHint = !_capturing && _dropHintKey && slotKey === _dropHintKey;
    const isFocus    = !_capturing && !_dropHintKey && slotKey === _highlightKey;
    const isSelected = !_capturing && _selectedKeys.has(slotKey);
    if (isDropHint || isFocus || isSelected) {
      const hb   = _borderWorld(3);
      const hGeo = _makeRoundedRect(w + 2 * hb, h + 2 * hb, r + hb, null);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xf0a500, side: THREE.FrontSide, transparent: true, opacity: 1 });
      const hMesh = new THREE.Mesh(hGeo, hMat);
      hMesh.position.set(x + w / 2, centerY, -0.0015);
      hMesh.renderOrder = 0;
      if (isDropHint) hMesh.userData.isDropHint = true;
      pivot.add(hMesh);
    }

    // Marco blanco (3 pt) detrás de los holders marcados frame — sólo
    // las celdas a 100% de los esqueletos que lo piden (p.ej. stacks).
    // Se puede ocultar por formato (switch "Borde blanco" de la bottom-bar).
    if (slot.frame && _stacksBorderVisible()) {
      const b     = _borderWorld(3);
      const wGeo  = _makeRoundedFrame(w + 2 * b, h + 2 * b, w, h, r + b, r);
      const wMat  = new THREE.MeshBasicMaterial({
        color:       0xffffff,
        side:        THREE.FrontSide,
        transparent: true,
        opacity:     1,
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.set(x + w / 2, centerY, -0.002);
      wMesh.renderOrder = 0;
      pivot.add(wMesh);
    }

    // "Cover" centrado: si hay imagen cargada y conocemos su tamaño,
    // recortamos su UV para que rellene el hueco sin deformar (amplía
    // desde el centro). Si no hay imagen, mapeo completo (placeholder).
    // Imagen efectiva: la sustitución se vincula al ÍNDICE de imagen (slot.n),
    // así afecta a TODAS las apariciones de esa imagen en el formato. La clave
    // de caché incluye el formato (formatId::n) para no pisar a otros formatos.
    const bound  = (typeof State !== 'undefined' && State.containerImages && State.containerImages[slot.n]);
    const imgKey = bound ? (State.activeFormatId + '::' + slot.n) : slot.n;

    let coverUV = null;
    const img = (typeof Images !== 'undefined') ? Images.getImage(imgKey) : null;
    if (img) {
      const iw = img.naturalWidth  || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw && ih) coverUV = _coverUVAdjusted(w / h, iw / ih, slotKey);
    }

    const geo = _makeRoundedRect(w, h, r, coverUV);
    const tex = _getOrCreateTexture({ n: imgKey, ratio: slot.ratio });

    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      side:        THREE.FrontSide,
      transparent: true,
      opacity:     slot.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + w / 2, centerY, 0);
    mesh.renderOrder = 1;
    // Identidad del contenedor para picking y ajuste de encuadre.
    // n = número original (para el badge); imgKey = imagen efectiva.
    mesh.userData.slot = { key: slotKey, n: slot.n, imgKey, w, h };

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
    badge.visible = !_capturing && !!(typeof State !== 'undefined' && State.showImagePrefixes);
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
    if (selloTexture) { selloTexture.dispose(); selloTexture = null; }
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

  // Devuelve el rectángulo UV (recorte "cover" centrado) para encajar una
  // imagen de aspecto imgAspect en un hueco de aspecto holderAspect sin
  // deformarla, ampliando desde el centro.
  function _coverUV(holderAspect, imgAspect) {
    let uFrac = 1, vFrac = 1;
    if (imgAspect > holderAspect) {
      uFrac = holderAspect / imgAspect; // imagen más ancha → recorta lados
    } else {
      vFrac = imgAspect / holderAspect; // imagen más alta → recorta arriba/abajo
    }
    const uMin = (1 - uFrac) / 2;
    const vMin = (1 - vFrac) / 2;
    return { uMin, uMax: uMin + uFrac, vMin, vMax: vMin + vFrac };
  }

  // Cover + ajuste de encuadre por contenedor (escala ≥1 y desplazamiento
  // dx/dy en UV). Al ampliar (escala), la ventana de muestreo se encoge; el
  // centro se desplaza y se acota para no salirse de la imagen [0,1].
  function _coverUVAdjusted(holderAspect, imgAspect, key) {
    const base = _coverUV(holderAspect, imgAspect);
    const adj  = (typeof State !== 'undefined' && State.imageAdjust) ? State.imageAdjust[key] : null;
    let uFrac = base.uMax - base.uMin;
    let vFrac = base.vMax - base.vMin;
    if (!adj) return base;
    const s = Math.max(1, adj.scale || 1);
    uFrac /= s; vFrac /= s;
    let cu = 0.5 + (adj.dx || 0);
    let cv = 0.5 + (adj.dy || 0);
    cu = Math.min(Math.max(cu, uFrac / 2), 1 - uFrac / 2);
    cv = Math.min(Math.max(cv, vFrac / 2), 1 - vFrac / 2);
    return { uMin: cu - uFrac / 2, uMax: cu + uFrac / 2, vMin: cv - vFrac / 2, vMax: cv + vFrac / 2 };
  }

  // Grosor en unidades 3D que equivale a `px` píxeles en el render actual
  // (alto del lienzo + distancia de cámara). Se usa para el marco blanco.
  function _borderWorld(px) {
    const lienzo = document.getElementById('lienzo');
    const ch = lienzo ? lienzo.clientHeight : 0;
    if (!ch || !camera) return CELL_H * 0.01;
    const visH = 2 * params.camZ * Math.tan((camera.fov * Math.PI / 180) / 2);
    return (px / ch) * visH;
  }

  function _makeRoundedRect(w, h, r, coverUV) {
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
    const uMin = coverUV ? coverUV.uMin : 0;
    const uMax = coverUV ? coverUV.uMax : 1;
    const vMin = coverUV ? coverUV.vMin : 0;
    const vMax = coverUV ? coverUV.vMax : 1;
    for (let i = 0; i < pos.count; i++) {
      const fx = (pos.getX(i) - x) / w; // 0..1 dentro del hueco
      const fy = (pos.getY(i) - y) / h;
      uvs[i * 2]     = uMin + fx * (uMax - uMin);
      uvs[i * 2 + 1] = vMin + fy * (vMax - vMin);
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }

  // Traza un rectángulo redondeado centrado sobre un Shape/Path.
  function _roundedRectPath(ctx, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const x = -w / 2, y = -h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }

  // Marco redondeado HUECO (anillo): rect exterior con un hueco interior, para
  // que sólo se pinte el borde y no tape el centro de la celda. Imprescindible
  // para que una imagen transparente deje ver el fondo y no el blanco del marco.
  function _makeRoundedFrame(ow, oh, iw, ih, ro, ri) {
    const shape = new THREE.Shape();
    _roundedRectPath(shape, ow, oh, ro);
    const hole = new THREE.Path();
    _roundedRectPath(hole, iw, ih, ri);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 6);
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

  // ── AJUSTE DE ENCUADRE POR CONTENEDOR (drag mover · rueda escalar) ──
  // Sin estado de selección ni modal: las acciones actúan sobre la carátula
  // que hay bajo el cursor (raycast). El ajuste vive en State.imageAdjust[clave].

  // Raycast: devuelve { key, n } de la carátula bajo el punto, o null (hueco).
  function pickKeyAt(clientX, clientY) {
    if (!mounted || !camera || !renderer) return null;
    if (!_raycaster) _raycaster = new THREE.Raycaster();
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    _raycaster.setFromCamera(ndc, camera);
    const hits = _raycaster.intersectObjects(pivot.children, true);
    const hit = hits.find(h => h.object && h.object.userData && h.object.userData.slot);
    return hit ? { key: hit.object.userData.slot.key, n: hit.object.userData.slot.n } : null;
  }

  function _meshByKey(key) {
    let found = null;
    pivot.children.forEach(o => { if (o.userData && o.userData.slot && o.userData.slot.key === key) found = o; });
    return found;
  }

  // Centro del contenedor (key) en px de ventana, para colocar overlays DOM
  // (p.ej. el spinner de carga). Null si no se encuentra.
  function getContainerScreen(key) {
    const mesh = _meshByKey(key);
    if (!mesh || !camera || !renderer) return null;
    const v = new THREE.Vector3();
    mesh.getWorldPosition(v);
    v.project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top  + (-v.y * 0.5 + 0.5) * rect.height,
    };
  }

  // Centros en pantalla de TODOS los contenedores que ahora mismo muestran el
  // índice `n` (y no tienen imagen propia vinculada, que tendría prioridad).
  // Sirve para poner spinners al recargar por índice desde el panel.
  function getIndexScreens(n) {
    const out = [];
    if (!camera || !renderer) return out;
    const rect = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector3();
    pivot.children.forEach(o => {
      if (o.userData && o.userData.slot && o.userData.slot.imgKey === n) {
        o.getWorldPosition(v); v.project(camera);
        out.push({
          x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
          y: rect.top  + (-v.y * 0.5 + 0.5) * rect.height,
        });
      }
    });
    return out;
  }

  function _adjFor(key) {
    if (!State.imageAdjust) State.imageAdjust = {};
    if (!State.imageAdjust[key]) State.imageAdjust[key] = { dx: 0, dy: 0, scale: 1 };
    return State.imageAdjust[key];
  }

  // Foco amarillo sobre un contenedor (key) o nada (null). Reconstruye sólo
  // si cambia, para no redibujar de más.
  function setHighlight(key) {
    if (_highlightKey === key) return;
    _highlightKey = key;
    rebuild();
  }

  // Pista de "drop": al arrastrar un archivo sobre un contenedor, resalta su
  // marco amarillo con un parpadeo suave. key=null la quita. Sólo reconstruye
  // cuando cambia el contenedor objetivo (el parpadeo va por su propio bucle).
  function setDropHint(key) {
    if (_dropHintKey === key) return;
    _dropHintKey = key;
    rebuild();
    if (key) _startPulse(); else _stopPulse();
  }

  function clearDropHint() { setDropHint(null); }

  function _startPulse() {
    if (_pulseRAF) return;
    const loop = () => {
      // Busca el marco de la pista y oscila su opacidad (suave, ~1.1s).
      let hint = null;
      pivot.children.forEach(o => { if (o.userData && o.userData.isDropHint) hint = o; });
      if (hint && hint.material) {
        const t = (typeof performance !== 'undefined' ? performance.now() : 0);
        hint.material.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1100 * Math.PI * 2));
      }
      render();
      _pulseRAF = requestAnimationFrame(loop);
    };
    _pulseRAF = requestAnimationFrame(loop);
  }

  function _stopPulse() {
    if (_pulseRAF) { cancelAnimationFrame(_pulseRAF); _pulseRAF = 0; }
  }

  // Render "limpio" para capturar el snapshot de VER TODAS: oculta los índices
  // y el resalte amarillo (ayudas de edición). Con preserveDrawingBuffer, el
  // buffer queda listo para leerse hasta el próximo render.
  function beginCapture() {
    _capturing = true;
    _build();
    render();
  }

  function endCapture() {
    _capturing = false;
    _build();
    render();
  }

  // Escala la imagen del contenedor por un factor (rueda). Crece/encoge desde
  // el centro del encuadre actual. Acotado a [1, 3] (100%–300%).
  function scaleByFactor(key, factor) {
    // Si la celda pertenece a un grupo, escala la imagen del GRUPO entero.
    const g = _groupForKey(key);
    if (g) {
      if (!g.transform) g.transform = { dx: 0, dy: 0, scale: 1 };
      g.transform.scale = Math.min(3, Math.max(1, (g.transform.scale || 1) * factor));
      rebuild();
      return;
    }
    const adj = _adjFor(key);
    adj.scale = Math.min(3, Math.max(1, (adj.scale || 1) * factor));
    _highlightKey = key;   // foco en la carátula que se escala
    rebuild();
  }

  // Desplaza el encuadre según un delta en PÍXELES de PANTALLA (arrastre).
  // Convierte px pantalla → mundo → UV, compensando la inclinación (rotX).
  function panByScreen(key, dxPx, dyPx) {
    // Si la celda pertenece a un grupo, mueve la imagen del GRUPO dentro de su
    // bbox (cada celda recompone su trozo en el rebuild).
    const gr = _groupForKey(key);
    if (gr) {
      if (!camera || !renderer) return;
      if (!gr.transform) gr.transform = { dx: 0, dy: 0, scale: 1 };
      const gadj = gr.transform;
      const gimg = (typeof Images !== 'undefined') ? Images.getImage(gr.cacheKey) : null;
      if (!gimg) return;
      const giw = gimg.naturalWidth || gimg.width, gih = gimg.naturalHeight || gimg.height;
      const gbw = gr._bw || 1, gbh = gr._bh || 1;
      const grect = renderer.domElement.getBoundingClientRect();
      const gvisH = 2 * params.camZ * Math.tan((camera.fov * Math.PI / 180) / 2);
      const gWorldPerPx = gvisH / Math.max(1, grect.height);
      const gbase = _coverUV(gbw / gbh, giw / gih);
      const gs = Math.max(1, gadj.scale || 1);
      const guFrac = (gbase.uMax - gbase.uMin) / gs;
      const gvFrac = (gbase.vMax - gbase.vMin) / gs;
      const gcosX = Math.max(0.2, Math.cos(params.rotX * Math.PI / 180));
      gadj.dx -= dxPx * gWorldPerPx * (guFrac / gbw);
      gadj.dy += (dyPx * gWorldPerPx / gcosX) * (gvFrac / gbh);
      rebuild();
      return;
    }
    const mesh = _meshByKey(key);
    if (!mesh || !camera || !renderer) return;
    const adj = _adjFor(key);
    const { w, h, imgKey } = mesh.userData.slot;
    const rect = renderer.domElement.getBoundingClientRect();
    const fovRad = camera.fov * Math.PI / 180;
    const visH = 2 * params.camZ * Math.tan(fovRad / 2);
    const worldPerPx = visH / Math.max(1, rect.height);
    const img = (typeof Images !== 'undefined') ? Images.getImage(imgKey) : null;
    const iw = img ? (img.naturalWidth || img.width) : 1;
    const ih = img ? (img.naturalHeight || img.height) : 1;
    const base = _coverUV(w / h, iw / ih);
    const s = Math.max(1, adj.scale || 1);
    const uFrac = (base.uMax - base.uMin) / s;
    const vFrac = (base.vMax - base.vMin) / s;
    const cosX = Math.max(0.2, Math.cos(params.rotX * Math.PI / 180));
    adj.dx -= dxPx * worldPerPx * (uFrac / w);
    adj.dy += (dyPx * worldPerPx / cosX) * (vFrac / h);
    _highlightKey = key;   // foco en la carátula que se mueve
    rebuild();
  }

  function resetSelected() {
    if (!_selectedKey || !State.imageAdjust) return;
    delete State.imageAdjust[_selectedKey];
    rebuild();
  }

  // ── CONTENEDOR VIRTUAL (grupos de celdas con imagen compartida) ──────

  // Cover de un bounding box (igual que _coverUVAdjusted pero con el transform
  // dado en vez de leerlo de State.imageAdjust[key]).
  function _coverUVForBox(boxAspect, imgAspect, transform) {
    const base = _coverUV(boxAspect, imgAspect);
    const adj  = transform || null;
    let uFrac = base.uMax - base.uMin;
    let vFrac = base.vMax - base.vMin;
    if (!adj) return base;
    const s = Math.max(1, adj.scale || 1);
    uFrac /= s; vFrac /= s;
    let cu = 0.5 + (adj.dx || 0);
    let cv = 0.5 + (adj.dy || 0);
    cu = Math.min(Math.max(cu, uFrac / 2), 1 - uFrac / 2);
    cv = Math.min(Math.max(cv, vFrac / 2), 1 - vFrac / 2);
    return { uMin: cu - uFrac / 2, uMax: cu + uFrac / 2, vMin: cv - vFrac / 2, vMax: cv + vFrac / 2 };
  }

  // Tras _build(): para cada grupo, calcula el bbox de sus celdas y reparte la
  // imagen del grupo recomputando el UV de cada celda (su trozo) + su textura.
  function _applyGroups() {
    const groups = (typeof State !== 'undefined' && State.groups) ? State.groups : null;
    if (!groups || !groups.length) return;

    const meshByKey = {};
    pivot.children.forEach(o => { if (o.userData && o.userData.slot) meshByKey[o.userData.slot.key] = o; });

    groups.forEach(g => {
      const cells = (g.cells || []).map(k => meshByKey[k]).filter(Boolean);
      if (!cells.length) return;

      // Bounding box en espacio de layout (mesh.position = centro; w/h del slot)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      cells.forEach(m => {
        const s = m.userData.slot;
        minX = Math.min(minX, m.position.x - s.w / 2);
        maxX = Math.max(maxX, m.position.x + s.w / 2);
        minY = Math.min(minY, m.position.y - s.h / 2);
        maxY = Math.max(maxY, m.position.y + s.h / 2);
      });
      const bw = maxX - minX, bh = maxY - minY;
      if (!(bw > 0 && bh > 0)) return;
      g._bw = bw; g._bh = bh;   // bbox en mundo (transient) — lo usan los gestos

      const img = (typeof Images !== 'undefined') ? Images.getImage(g.cacheKey) : null;
      let adjUV = null, tex = null;
      if (img) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (iw && ih) adjUV = _coverUVForBox(bw / bh, iw / ih, g.transform);
        tex = _getOrCreateTexture({ n: g.cacheKey, ratio: 'group' });
      }

      cells.forEach(m => {
        const s = m.userData.slot;
        // Fracciones normalizadas de la celda dentro del bbox (v en mundo-arriba)
        const un0 = (m.position.x - s.w / 2 - minX) / bw;
        const un1 = (m.position.x + s.w / 2 - minX) / bw;
        const vn0 = (m.position.y - s.h / 2 - minY) / bh;
        const vn1 = (m.position.y + s.h / 2 - minY) / bh;
        let coverUV = null;
        if (adjUV) {
          const U = t => adjUV.uMin + t * (adjUV.uMax - adjUV.uMin);
          const V = t => adjUV.vMin + t * (adjUV.vMax - adjUV.vMin);
          coverUV = { uMin: U(un0), uMax: U(un1), vMin: V(vn0), vMax: V(vn1) };
        }
        const r = (params.radius / 1000) * CELL_H;
        const newGeo = _makeRoundedRect(s.w, s.h, r, coverUV);
        if (m.geometry) m.geometry.dispose();
        m.geometry = newGeo;
        if (tex) { m.material.map = tex; m.material.needsUpdate = true; }
        m.userData.slot.group = g.id;   // marca para picking/gestos (F2)
        // Oculta el badge de prefijo en celdas agrupadas
        m.children.forEach(ch => { if (ch.userData && ch.userData.isPrefixBadge) ch.visible = false; });
      });
    });
  }

  // Grupo (contenedor virtual) al que pertenece una celda, o null.
  function _groupForKey(key) {
    const groups = (typeof State !== 'undefined' && State.groups) ? State.groups : null;
    if (!groups) return null;
    return groups.find(g => g.cells && g.cells.includes(key)) || null;
  }
  function getGroupIdOf(key) { const g = _groupForKey(key); return g ? g.id : null; }

  // Saca una celda de su grupo (al soltarle una imagen suelta encima): "deshacer
  // natural" sin comandos. Si el grupo se queda sin celdas, se elimina. No
  // reconstruye aquí (lo hará el bind/refresh posterior). El bbox del grupo
  // restante se recalcula solo en el próximo _applyGroups.
  function removeKeyFromGroup(key) {
    const g = _groupForKey(key);
    if (!g) return false;
    g.cells = g.cells.filter(k => k !== key);
    if (!g.cells.length) {
      const idx = State.groups.indexOf(g);
      if (idx >= 0) State.groups.splice(idx, 1);
    }
    return true;
  }

  // ── SELECCIÓN DE CELDAS (shift+clic) ─────────────────────────────────
  function toggleSelection(key) {
    if (!key) return;
    if (_selectedKeys.has(key)) _selectedKeys.delete(key);
    else _selectedKeys.add(key);
    rebuild();
  }
  function clearSelection() {
    if (!_selectedKeys.size && !_highlightKey) return;
    _selectedKeys.clear();
    _highlightKey = null;
    rebuild();
  }
  // Reemplaza la selección por las celdas dadas (clic normal = una sola).
  function setSelection(keys) {
    _selectedKeys = new Set(keys || []);
    _highlightKey = null;          // la selección pasa a ser la fuente del foco
    rebuild();
  }
  function getSelection() { return [..._selectedKeys]; }

  // Crea un grupo con las celdas dadas y le vincula la imagen `file`.
  // Una celda pertenece a un grupo como máximo (se retira de grupos previos).
  function createGroup(keys, file) {
    if (!keys || !keys.length || typeof State === 'undefined') return null;
    if (!State.groups) State.groups = [];
    const keySet = new Set(keys);
    // Quita esas celdas de grupos previos y elimina grupos vacíos IN PLACE
    // (no reasignar State.groups: rompería el puntero con comp.groups, y el
    // export/guardado leen comp.groups).
    State.groups.forEach(g => { g.cells = g.cells.filter(k => !keySet.has(k)); });
    for (let i = State.groups.length - 1; i >= 0; i--) {
      if (!State.groups[i].cells.length) State.groups.splice(i, 1);
    }

    // id = mayor existente + 1 (robusto al abrir proyectos con grupos guardados)
    const existing = State.groups.map(g => parseInt(String(g.id || '').replace(/[^0-9]/g, ''), 10) || 0);
    const id = 'g' + ((existing.length ? Math.max(...existing) : 0) + 1);
    const cacheKey = (State.activeFormatId || 'fmt') + '::group::' + id;
    const group = { id, cells: [...keys], image: file ? file.name : null, cacheKey, transform: { dx: 0, dy: 0, scale: 1 } };
    State.groups.push(group);

    if (file && typeof Images !== 'undefined' && Images.bindFileToContainer) {
      Images.bindFileToContainer(file, cacheKey).then(() => refreshTextures()).catch(() => {});
    } else {
      rebuild();
    }
    return group;
  }

  return {
    init, setSkeleton, setFormat, setTransform, setColOffset, resize, render, rebuild,
    fitToLienzo, refreshTextures, setPrefixesVisible, getTHREE,
    pickKeyAt, panByScreen, scaleByFactor, setHighlight, beginCapture, endCapture,
    setDropHint, clearDropHint, getContainerScreen, getIndexScreens, applyFormat,
    toggleSelection, setSelection, clearSelection, getSelection, createGroup, getGroupIdOf, removeKeyFromGroup,
  };
})();
