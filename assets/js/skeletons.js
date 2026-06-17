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
      name: 'CLÁSICO',
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
      name: 'COLUMNAS MIXTAS',
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
      name: 'COLUMNAS MIXTAS DESTACADOS',
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

    // ─────────────────────────────────────────────────────
    // ZIG-ZAG — 10 columnas de 1 vertical de ancho, tipo 'stacks'.
    // Es la variante SIN sello: los dos bloques de 5 columnas se juntan
    // sin calle central. Para que las carátulas principales (opacidad 1)
    // nunca caigan dos seguidas a la misma altura, el escalonado de media
    // carátula es CONTINUO a lo largo de las 10 columnas: respecto a
    // 'ZIG-ZAG + SELLO' el bloque derecho invierte su drop (0↔0.5) y mueve
    // la principal de arriba a abajo dentro de cada columna.
    //
    // Particularidades:
    //  - Todas las carátulas son verticales (9:16).
    //  - Posiciones FIJAS (sin sliders de offset). Cada columna se alinea
    //    "arriba" (drop 0) o "media carátula abajo" (drop 0.5), alternando.
    //  - Las celdas a opacidad 1 llevan marco blanco de 3 pt; las demás 0.2.
    // ─────────────────────────────────────────────────────
    horizontal: {
      id:   'horizontal',
      name: 'ZIG-ZAG',
      type: 'stacks',
      cols: [
        // ── bloque izquierdo (igual que ZIG-ZAG + SELLO) ──
        { drop: 0,   cells: [ { n: 10, opacity: 0.2 }, { n: 1,  opacity: 1   } ] },
        { drop: 0.5, cells: [ { n: 2,  opacity: 1   }, { n: 9,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 8,  opacity: 0.2 }, { n: 3,  opacity: 1   }, { n: 1,  opacity: 0.2 } ] },
        { drop: 0.5, cells: [ { n: 4,  opacity: 1   }, { n: 7,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 6,  opacity: 0.2 }, { n: 5,  opacity: 1   }, { n: 3,  opacity: 0.2 } ] },
        // ── bloque derecho (escalonado continuado) ──
        { drop: 0.5, cells: [ { n: 6,  opacity: 1   }, { n: 5,  opacity: 0.2 }, { n: 8,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 4,  opacity: 0.2 }, { n: 7,  opacity: 1   } ] },
        { drop: 0.5, cells: [ { n: 8,  opacity: 1   }, { n: 3,  opacity: 0.2 }, { n: 10, opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 2,  opacity: 0.2 }, { n: 9,  opacity: 1   } ] },
        { drop: 0.5, cells: [ { n: 10, opacity: 1   }, { n: 1,  opacity: 0.2 } ] },
      ],
    },

    // ─────────────────────────────────────────────────────
    // ZIG-ZAG + SELLO — igual que 'ZIG-ZAG' pero con banda negra central:
    // 5 columnas + calle del sello + 5 columnas. Tipo 'stacks'.
    //
    // Particularidades de este esqueleto:
    //  - Todas las carátulas son verticales (9:16).
    //  - Posiciones FIJAS (sin sliders de offset). Cada columna se
    //    alinea "arriba" (drop 0) o "media carátula abajo" (drop 0.5),
    //    alternando, tal cual el esquema de diseño.
    //  - Las celdas a opacidad 1 llevan marco blanco de 3 pt (sobre la
    //    resolución de exportación). Las demás van a 0.2.
    //  - 'band' = banda negra central (PENDIENTE de definir su mecánica:
    //    imagen repetida en horizontal tantas veces como quepa). De
    //    momento sólo reserva el hueco entre la 5ª y la 6ª columna.
    // ─────────────────────────────────────────────────────
    'horizontal-sello': {
      id:   'horizontal-sello',
      name: 'ZIG-ZAG + SELLO',
      type: 'stacks',
      band: { after: 4 }, // ancho de la calle = ancho de carátula (VERT_W)
      cols: [
        { drop: 0,   cells: [ { n: 10, opacity: 0.2 }, { n: 1,  opacity: 1   } ] },
        { drop: 0.5, cells: [ { n: 2,  opacity: 1   }, { n: 9,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 8,  opacity: 0.2 }, { n: 3,  opacity: 1   }, { n: 1,  opacity: 0.2 } ] },
        { drop: 0.5, cells: [ { n: 4,  opacity: 1   }, { n: 7,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 6,  opacity: 0.2 }, { n: 5,  opacity: 1   }, { n: 3,  opacity: 0.2 } ] },
        // ── banda negra central ──
        { drop: 0,   cells: [ { n: 5,  opacity: 0.2 }, { n: 6,  opacity: 1   }, { n: 8,  opacity: 0.2 } ] },
        { drop: 0.5, cells: [ { n: 7,  opacity: 1   }, { n: 4,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 3,  opacity: 0.2 }, { n: 8,  opacity: 1   }, { n: 10, opacity: 0.2 } ] },
        { drop: 0.5, cells: [ { n: 9,  opacity: 1   }, { n: 2,  opacity: 0.2 } ] },
        { drop: 0,   cells: [ { n: 1,  opacity: 0.2 }, { n: 10, opacity: 1   } ] },
      ],
    },

    // ─────────────────────────────────────────────────────
    // FILAS — muro de carátulas HORIZONTALES (16:9) dispuestas en filas.
    // 5 filas × 6 imágenes = 30 (numeradas arriba→abajo, cada fila izq→der).
    // Tipo 'rows': análogo a 'columns' pero transpuesto — los sliders de
    // offset mueven la posición HORIZONTAL (X) de cada fila. El defaultOffsets
    // escalona las filas pares media carátula (efecto ladrillo / running bond).
    // ─────────────────────────────────────────────────────
    filas: {
      id:   'filas',
      name: 'HORIZONTALES',
      type: 'rows',
      defaultOffsets: [0, 0.73, 0, 0.73, 0], // X por fila; media carátula en las pares
      rows: [
        { cells: [ { n: 1,  opacity: 1 }, { n: 2,  opacity: 1 }, { n: 3,  opacity: 1 }, { n: 4,  opacity: 1 }, { n: 5,  opacity: 1 }, { n: 6,  opacity: 1 } ] },
        { cells: [ { n: 7,  opacity: 1 }, { n: 8,  opacity: 1 }, { n: 9,  opacity: 1 }, { n: 10, opacity: 1 }, { n: 11, opacity: 1 }, { n: 12, opacity: 1 } ] },
        { cells: [ { n: 13, opacity: 1 }, { n: 14, opacity: 1 }, { n: 15, opacity: 1 }, { n: 16, opacity: 1 }, { n: 17, opacity: 1 }, { n: 18, opacity: 1 } ] },
        { cells: [ { n: 19, opacity: 1 }, { n: 20, opacity: 1 }, { n: 21, opacity: 1 }, { n: 22, opacity: 1 }, { n: 23, opacity: 1 }, { n: 24, opacity: 1 } ] },
        { cells: [ { n: 25, opacity: 1 }, { n: 26, opacity: 1 }, { n: 27, opacity: 1 }, { n: 28, opacity: 1 }, { n: 29, opacity: 1 }, { n: 30, opacity: 1 } ] },
      ],
    },

    // ─────────────────────────────────────────────────────
    // VERTICALES — rejilla de carátulas VERTICALES (9:16) en columnas.
    // 10 columnas × 4 imágenes = 40 (numeradas POR COLUMNAS: col 1 → 1-4,
    // col 2 → 5-8 … col 10 → 37-40). Tipo 'vcolumns': cada columna es de
    // UNA vertical de ancho. Los 10 sliders de offset mueven la posición
    // VERTICAL (Y) de cada columna. defaultOffsets escalona en cascada.
    // ─────────────────────────────────────────────────────
    verticales: {
      id:   'verticales',
      name: 'VERTICALES',
      type: 'vcolumns',
      defaultOffsets: [0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5], // Y por columna
      cols: [
        { cells: [ { n: 1,  opacity: 1 }, { n: 2,  opacity: 1 }, { n: 3,  opacity: 1 }, { n: 4,  opacity: 1 } ] },
        { cells: [ { n: 5,  opacity: 1 }, { n: 6,  opacity: 1 }, { n: 7,  opacity: 1 }, { n: 8,  opacity: 1 } ] },
        { cells: [ { n: 9,  opacity: 1 }, { n: 10, opacity: 1 }, { n: 11, opacity: 1 }, { n: 12, opacity: 1 } ] },
        { cells: [ { n: 13, opacity: 1 }, { n: 14, opacity: 1 }, { n: 15, opacity: 1 }, { n: 16, opacity: 1 } ] },
        { cells: [ { n: 17, opacity: 1 }, { n: 18, opacity: 1 }, { n: 19, opacity: 1 }, { n: 20, opacity: 1 } ] },
        { cells: [ { n: 21, opacity: 1 }, { n: 22, opacity: 1 }, { n: 23, opacity: 1 }, { n: 24, opacity: 1 } ] },
        { cells: [ { n: 25, opacity: 1 }, { n: 26, opacity: 1 }, { n: 27, opacity: 1 }, { n: 28, opacity: 1 } ] },
        { cells: [ { n: 29, opacity: 1 }, { n: 30, opacity: 1 }, { n: 31, opacity: 1 }, { n: 32, opacity: 1 } ] },
        { cells: [ { n: 33, opacity: 1 }, { n: 34, opacity: 1 }, { n: 35, opacity: 1 }, { n: 36, opacity: 1 } ] },
        { cells: [ { n: 37, opacity: 1 }, { n: 38, opacity: 1 }, { n: 39, opacity: 1 }, { n: 40, opacity: 1 } ] },
      ],
    },

    // ─────────────────────────────────────────────────────
    // FANTASÍA — teselado LIBRE (sin filas/columnas) que mezcla tres
    // formatos: apaisado 'H' (2×1), vertical 'V' (1×2) y cuadrado 'S' (1×1),
    // sobre una rejilla invisible de unidades (aproximación "dominó").
    // 35 piezas que cubren por completo un lienzo 10×6 (apaisado), con las
    // juntas desalineadas a propósito. Generado y verificado (cobertura 100%,
    // sin solapes). Tipo 'free': cada celda lleva su posición/tamaño explícito
    // {x,y,w,h} en unidades; numeración en orden de lectura (y, luego x).
    // ─────────────────────────────────────────────────────
    fantasia: {
      id:   'fantasia',
      name: 'FOTOGRAMAS', // pensado para fotogramas (no carátulas): el recorte no rompe nada
      type: 'free',
      grid: { w: 10, h: 6 },
      cells: [
        { n: 1, r: 'V', x: 0, y: 0, w: 1, h: 2 },
        { n: 2, r: 'V', x: 1, y: 0, w: 1, h: 2 },
        { n: 3, r: 'V', x: 2, y: 0, w: 1, h: 2 },
        { n: 4, r: 'V', x: 3, y: 0, w: 1, h: 2 },
        { n: 5, r: 'H', x: 4, y: 0, w: 2, h: 1 },
        { n: 6, r: 'V', x: 6, y: 0, w: 1, h: 2 },
        { n: 7, r: 'V', x: 7, y: 0, w: 1, h: 2 },
        { n: 8, r: 'H', x: 8, y: 0, w: 2, h: 1 },
        { n: 9, r: 'S', x: 4, y: 1, w: 1, h: 1 },
        { n: 10, r: 'S', x: 5, y: 1, w: 1, h: 1 },
        { n: 11, r: 'V', x: 8, y: 1, w: 1, h: 2 },
        { n: 12, r: 'V', x: 9, y: 1, w: 1, h: 2 },
        { n: 13, r: 'S', x: 0, y: 2, w: 1, h: 1 },
        { n: 14, r: 'H', x: 1, y: 2, w: 2, h: 1 },
        { n: 15, r: 'H', x: 3, y: 2, w: 2, h: 1 },
        { n: 16, r: 'H', x: 5, y: 2, w: 2, h: 1 },
        { n: 17, r: 'V', x: 7, y: 2, w: 1, h: 2 },
        { n: 18, r: 'S', x: 0, y: 3, w: 1, h: 1 },
        { n: 19, r: 'H', x: 1, y: 3, w: 2, h: 1 },
        { n: 20, r: 'V', x: 3, y: 3, w: 1, h: 2 },
        { n: 21, r: 'H', x: 4, y: 3, w: 2, h: 1 },
        { n: 22, r: 'S', x: 6, y: 3, w: 1, h: 1 },
        { n: 23, r: 'V', x: 8, y: 3, w: 1, h: 2 },
        { n: 24, r: 'S', x: 9, y: 3, w: 1, h: 1 },
        { n: 25, r: 'V', x: 0, y: 4, w: 1, h: 2 },
        { n: 26, r: 'S', x: 1, y: 4, w: 1, h: 1 },
        { n: 27, r: 'V', x: 2, y: 4, w: 1, h: 2 },
        { n: 28, r: 'H', x: 4, y: 4, w: 2, h: 1 },
        { n: 29, r: 'H', x: 6, y: 4, w: 2, h: 1 },
        { n: 30, r: 'S', x: 9, y: 4, w: 1, h: 1 },
        { n: 31, r: 'S', x: 1, y: 5, w: 1, h: 1 },
        { n: 32, r: 'H', x: 3, y: 5, w: 2, h: 1 },
        { n: 33, r: 'S', x: 5, y: 5, w: 1, h: 1 },
        { n: 34, r: 'H', x: 6, y: 5, w: 2, h: 1 },
        { n: 35, r: 'H', x: 8, y: 5, w: 2, h: 1 },
      ],
    },

  };

  function init() {
    _bindTrigger();
    _updateButtonLabel(getActive());
  }

  // Aviso "Cargando imágenes" en la parte inferior del viewport (no la bottom
  // bar). Se muestra al elegir mosaico mientras se construye con las imágenes.
  function _showLoading(msg) {
    _hideLoading();
    const el = document.createElement('div');
    el.id = 'mosaic-loading';
    el.className = 'loading-toast';
    el.innerHTML = '<span class="loading-toast-spinner"></span>' +
                   '<span>' + (msg || 'Cargando imágenes…') + '</span>';
    (document.getElementById('canvas-area') || document.body).appendChild(el);
  }

  function _hideLoading() {
    document.getElementById('mosaic-loading')?.remove();
  }

  // Orden de presentación en el selector (independiente del orden de
  // definición del objeto). Los ids no listados se añaden al final.
  const ORDER = ['filas', 'verticales', 'clasico', 'columnas', 'frontal', 'horizontal', 'horizontal-sello', 'fantasia'];

  function getAll() {
    const known = ORDER.map(id => SKELETONS[id]).filter(Boolean);
    const rest  = Object.values(SKELETONS).filter(e => !ORDER.includes(e.id));
    return [...known, ...rest];
  }

  function getById(id) {
    return SKELETONS[id] || null;
  }

  function getActive() {
    return State.activeSkeletonId ? getById(State.activeSkeletonId) : null;
  }

  // Nº de imágenes DISTINTAS que necesita un esqueleto para completarse.
  // OJO: no es el nº de huecos — un esqueleto puede reutilizar la misma
  // imagen en varios huecos (p.ej. 'frontal' tiene 84 huecos pero 19 imágenes).
  function imageCount(esq) {
    return imageStats(esq).total;
  }

  // Desglose de imágenes DISTINTAS por orientación.
  // Cada imagen (prefijo n) tiene un ratio fijo (todas son 9:16 o 16:9),
  // así que mapeamos n→ratio y contamos. Devuelve { total, h, v }.
  function imageStats(esq) {
    const map = new Map(); // n -> 'H' | 'V'
    const put = (n, ratio) => { if (!map.has(n)) map.set(n, ratio); };
    if (esq.type === 'grid') {
      esq.slots.forEach(s => put(s.n, s.ratio));
    } else if (esq.type === 'columns') {
      esq.cols.forEach(c => c.cells.forEach(cell => put(cell.n, cell.type === 'h' ? 'H' : 'V')));
    } else if (esq.type === 'stacks') {
      // Todas las celdas son verticales.
      esq.cols.forEach(c => c.cells.forEach(cell => put(cell.n, 'V')));
    } else if (esq.type === 'rows') {
      // Todas las celdas son horizontales.
      esq.rows.forEach(r => r.cells.forEach(cell => put(cell.n, 'H')));
    } else if (esq.type === 'vcolumns') {
      // Todas las celdas son verticales.
      esq.cols.forEach(c => c.cells.forEach(cell => put(cell.n, 'V')));
    } else if (esq.type === 'free') {
      // Mezcla libre: cada celda declara su ratio ('H' | 'V' | 'S').
      esq.cells.forEach(c => put(c.n, c.r));
    }
    let h = 0, v = 0, s = 0;
    map.forEach(r => { if (r === 'H') h++; else if (r === 'S') s++; else v++; });
    return { total: map.size, h, v, s };
  }

  // Elige un mosaico para el FORMATO ACTIVO. Si es el primer mosaico del
  // proyecto, se fija como default y se propaga a los formatos que aún no
  // tengan uno propio (los demás, ya con su mosaico, no se tocan).
  function setActive(id) {
    const esq = getById(id);
    if (!esq) return;
    const offsets = esq.defaultOffsets ? [...esq.defaultOffsets] : [];

    const fid  = State.activeFormatId;
    const comp = (fid && typeof Formats !== 'undefined' && Formats.ensureComposition)
      ? Formats.ensureComposition(fid) : null;
    if (comp) {
      comp.skeletonId = id;
      comp.transform.colOffsets = offsets;
      comp.fitted = true;            // el picker re-encuadra (Mosaic3D.setSkeleton)
    }

    State.activeSkeletonId = id;
    if (State.transform) State.transform.colOffsets = offsets;

    // Default para formatos sin mosaico propio (solo la primera vez).
    if (!State.defaultSkeletonId) {
      State.defaultSkeletonId = id;
      Object.values(State.compositions || {}).forEach(c => { if (!c.skeletonId) c.skeletonId = id; });
    }

    _updateButtonLabel(esq);
    if (typeof Mosaic3D !== 'undefined') Mosaic3D.setSkeleton(esq);
    if (typeof UI       !== 'undefined' && UI.renderColOffsets) UI.renderColOffsets();
  }

  // Actualiza la etiqueta del botón al esqueleto activo (lo usa Formats.setActive).
  function refreshActiveLabel() {
    _updateButtonLabel(getActive());
  }

  // ── BOTÓN + MODAL ─────────────────────────────────────────

  function _bindTrigger() {
    const trigger = document.getElementById('skeleton-trigger');
    if (trigger) trigger.addEventListener('click', _openModal);
  }

  function _updateButtonLabel(esq) {
    const valueEl = document.getElementById('skeleton-value');
    if (valueEl) valueEl.textContent = esq ? esq.name : 'Selecciona un mosaico';
  }

  function _openModal() {
    document.getElementById('mosaic-picker-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mosaic-picker-modal';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });

    const modal = document.createElement('div');
    modal.className = 'mosaic-modal';

    const header = document.createElement('div');
    header.className = 'mosaic-modal-header';
    const title = document.createElement('div');
    title.className = 'mosaic-modal-title';
    title.textContent = 'Selecciona un mosaico';
    const close = document.createElement('button');
    close.className = 'mosaic-modal-close';
    close.innerHTML = '&times;';
    close.addEventListener('click', _close);
    header.appendChild(title);
    header.appendChild(close);

    const grid = document.createElement('div');
    grid.className = 'mosaic-modal-grid';

    getAll().forEach(esq => {
      const card = document.createElement('div');
      card.className = 'mosaic-card' + (esq.id === State.activeSkeletonId ? ' selected' : '');
      card.dataset.id = esq.id;

      const name = document.createElement('div');
      name.className = 'mosaic-card-name';
      name.textContent = esq.name;

      const thumb = document.createElement('div');
      thumb.className = 'mosaic-card-thumb';
      thumb.innerHTML = _thumbSVG(esq);

      const stats = imageStats(esq);
      const count = document.createElement('div');
      count.className = 'mosaic-card-count';
      count.textContent = stats.total + (stats.total === 1 ? ' imagen' : ' imágenes');

      const breakdown = document.createElement('div');
      breakdown.className = 'mosaic-card-breakdown';
      breakdown.innerHTML =
        `<span class="bd-hor">${stats.h} HOR</span>` +
        `<span class="bd-sep"> - </span>` +
        `<span class="bd-ver">${stats.v} VER</span>` +
        (stats.s ? `<span class="bd-sep"> - </span><span class="bd-cua">${stats.s} CUA</span>` : '');

      card.appendChild(name);
      card.appendChild(thumb);
      card.appendChild(count);
      card.appendChild(breakdown);
      card.addEventListener('click', () => {
        _close();                          // la modal desaparece YA
        // Construir el mosaico con muchas imágenes (subir texturas a GPU) es
        // síncrono y bloquea el repintado. Mostramos "Cargando imágenes" abajo
        // del viewport y diferimos el setActive para que el cierre se pinte.
        const hasImages = (typeof Images !== 'undefined') && Images.getLoadedNumbers().length > 0;
        if (hasImages) _showLoading();
        setTimeout(() => {
          setActive(esq.id);
          if (hasImages) setTimeout(_hideLoading, 0);
        }, hasImages ? 50 : 0);
      });
      grid.appendChild(card);
    });

    modal.appendChild(header);
    modal.appendChild(grid);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Esc cierra la modal
    function _onKey(e) { if (e.key === 'Escape') _close(); }
    function _close() {
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
    }
    document.addEventListener('keydown', _onKey);
  }

  // ── THUMBNAIL SVG ─────────────────────────────────────────
  // Genera un SVG en miniatura del layout leyendo los datos del esqueleto.
  // Replica la geometría de mosaic-3d.js (_buildGrid / _buildColumns) en 2D.
  // Código de color: rojo = horizontal (16:9), verde = vertical (9:16).
  // La opacidad del hueco se traslada a fill-opacity → los huecos atenuados
  // se ven en un tono más apagado sobre el fondo oscuro de la tarjeta.
  function _thumbSVG(esq) {
    const CELL_H = 1.0;
    // Mismas proporciones que el render 3D: verticales 9:16, horizontales 16:9.
    const VERT_W = CELL_H * 1200 / 1800;  // 0.667 — vertical 2:3 (1200×1800)
    const HORIZ_W = CELL_H * 16 / 9;  // 1.7778
    const gap = 0.08;
    const rects = [];

    if (esq.type === 'grid') {
      const { cols, rows, slots } = esq;
      const colWidths = [];
      for (let c = 0; c < cols; c++) {
        const s = slots[c];
        colWidths.push(s && s.ratio === 'H' ? HORIZ_W : VERT_W);
      }
      const rowW = colWidths.reduce((a, b) => a + b, 0) + gap * (cols - 1);
      const totalH = rows * CELL_H + (rows - 1) * gap;
      const startX = -rowW / 2;
      const startY = totalH / 2 - CELL_H / 2;
      for (let row = 0; row < rows; row++) {
        let x = startX;
        const y = startY - row * (CELL_H + gap);
        for (let c = 0; c < cols; c++) {
          const s = slots[row * cols + c];
          if (!s) continue;
          const cw = colWidths[c];
          rects.push({ x, top: y + CELL_H / 2, w: cw, h: CELL_H, ratio: s.ratio, opacity: s.opacity ?? 1 });
          x += cw + gap;
        }
      }
    } else if (esq.type === 'columns') {
      const V_H = CELL_H;
      const colW = VERT_W * 2 + gap;
      const H_H = colW * 9 / 16;   // alto horizontal 16:9 (ancho = colW)
      const numCols = esq.cols.length;
      const totalW = numCols * colW + (numCols - 1) * gap;
      const startX = -totalW / 2;
      const offsets = esq.defaultOffsets || new Array(numCols).fill(0);

      esq.cols.forEach((col, ci) => {
        const xCol = startX + ci * (colW + gap);
        let colH = 0, i = 0;
        while (i < col.cells.length) {
          if (col.cells[i].type === 'h') { colH += H_H; i++; }
          else { colH += V_H; i += 2; }
          if (i < col.cells.length) colH += gap;
        }
        let cursorY = colH / 2 + (offsets[ci] || 0);
        i = 0;
        while (i < col.cells.length) {
          const cell = col.cells[i];
          if (cell.type === 'h') {
            rects.push({ x: xCol, top: cursorY, w: colW, h: H_H, ratio: 'H', opacity: cell.opacity ?? 1 });
            cursorY -= H_H + gap;
            i++;
          } else {
            const cr = col.cells[i + 1];
            rects.push({ x: xCol, top: cursorY, w: VERT_W, h: V_H, ratio: 'V', opacity: cell.opacity ?? 1 });
            if (cr) rects.push({ x: xCol + VERT_W + gap, top: cursorY, w: VERT_W, h: V_H, ratio: 'V', opacity: cr.opacity ?? 1 });
            cursorY -= V_H + gap;
            i += 2;
          }
        }
      });
    } else if (esq.type === 'stacks') {
      // Columnas de 1 vertical de ancho, con escalonado fijo por columna
      // (drop en pasos de carátula) y banda central que reserva un hueco
      // más ancho entre dos columnas.
      const step = CELL_H + gap;
      const bandAfter = esq.band ? esq.band.after : -1;
      const bandW = (esq.band && esq.band.width) || VERT_W;
      let x = 0, laneX = null;
      esq.cols.forEach((col, ci) => {
        const drop = col.drop || 0;
        let top = -drop * step;
        col.cells.forEach(cell => {
          const op = cell.opacity ?? 1;
          rects.push({ x, top, w: VERT_W, h: CELL_H, ratio: 'V', opacity: op, frame: op >= 0.99 });
          top -= step;
        });
        x += VERT_W + gap;
        if (ci === bandAfter) { laneX = x; x += bandW + gap; }
      });
      // Sello repetido en la calle central (placeholder cuadrado): copia
      // central opaca + copias atenuadas arriba/abajo hasta llenar la banda.
      if (esq.band && laneX !== null && rects.length) {
        let tM = -Infinity, bM = Infinity;
        rects.forEach(r => { if (r.top > tM) tM = r.top; if (r.top - r.h < bM) bM = r.top - r.h; });
        const selloH = bandW;
        const cy = (tM + bM) / 2, half = (tM - bM) / 2;
        const pushSello = (centerY, op) =>
          rects.push({ x: laneX, top: centerY + selloH / 2, w: bandW, h: selloH, ratio: 'V', opacity: op, sello: true });
        pushSello(cy, 1);
        const pitch = selloH + gap; // mismo hueco que entre columnas
        for (let k = 1; k <= 30; k++) {
          const off = k * pitch;
          if (off - selloH / 2 >= half) break;
          pushSello(cy + off, 0.25);
          pushSello(cy - off, 0.25);
        }
      }
    } else if (esq.type === 'rows') {
      // Filas de carátulas horizontales (16:9) con offset X por fila.
      const cellW = HORIZ_W;
      const cellH = HORIZ_W * 9 / 16;
      const numRows = esq.rows.length;
      const offsets = esq.defaultOffsets || new Array(numRows).fill(0);
      const totalH = numRows * cellH + (numRows - 1) * gap;
      const startY = totalH / 2 - cellH / 2;
      esq.rows.forEach((row, ri) => {
        const n = row.cells.length;
        const rowW = n * cellW + (n - 1) * gap;
        const centerY = startY - ri * (cellH + gap);
        let x = -rowW / 2 + (offsets[ri] || 0);
        row.cells.forEach(cell => {
          rects.push({ x, top: centerY + cellH / 2, w: cellW, h: cellH, ratio: 'H', opacity: cell.opacity ?? 1 });
          x += cellW + gap;
        });
      });
    } else if (esq.type === 'vcolumns') {
      // Columnas de UNA vertical (2:3) con offset Y por columna.
      const cellW = VERT_W;
      const cellH = CELL_H;
      const numCols = esq.cols.length;
      const totalW = numCols * cellW + (numCols - 1) * gap;
      const startX = -totalW / 2;
      const offsets = esq.defaultOffsets || new Array(numCols).fill(0);
      esq.cols.forEach((col, ci) => {
        const xCol = startX + ci * (cellW + gap);
        const nCells = col.cells.length;
        const colH = nCells * cellH + (nCells - 1) * gap;
        let cursorY = colH / 2 + (offsets[ci] || 0);
        col.cells.forEach(cell => {
          rects.push({ x: xCol, top: cursorY, w: cellW, h: cellH, ratio: 'V', opacity: cell.opacity ?? 1 });
          cursorY -= cellH + gap;
        });
      });
    } else if (esq.type === 'free') {
      // Teselado libre en rejilla de unidades. Cada celda se mete hacia
      // dentro medio gap por lado para mostrar la separación uniforme.
      let maxX = 0, maxY = 0;
      esq.cells.forEach(c => { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); });
      const startX = -maxX / 2, startTop = maxY / 2;
      esq.cells.forEach(c => {
        const x = startX + c.x + gap / 2;
        const top = startTop - c.y - gap / 2;
        rects.push({ x, top, w: c.w - gap, h: c.h - gap, ratio: c.r, opacity: 1 });
      });
    }

    if (!rects.length) return '';

    let minX = Infinity, maxX = -Infinity, maxTop = -Infinity, minBottom = Infinity;
    rects.forEach(r => {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.w);
      maxTop = Math.max(maxTop, r.top);
      minBottom = Math.min(minBottom, r.top - r.h);
    });
    const W = maxX - minX;
    const H = maxTop - minBottom;

    const H_BASE = '#e23b30'; // horizontal 16:9
    const V_BASE = '#23b06e'; // vertical 9:16
    const S_BASE = '#2e6ef0'; // cuadrado 1:1
    const rx = 0.04;

    let body = '';
    rects.forEach(r => {
      const y = maxTop - r.top; // flip eje Y (mundo arriba → SVG abajo)
      const fill = r.sello ? '#cfcfcf' : (r.ratio === 'H' ? H_BASE : r.ratio === 'S' ? S_BASE : V_BASE);
      // Marco blanco (3 pt) en celdas a 100%; trazo tenue en el resto.
      const stroke = r.frame ? '#ffffff' : 'rgba(255,255,255,0.18)';
      const sw     = r.frame ? 0.05 : 0.012;
      body += `<rect x="${r.x.toFixed(3)}" y="${y.toFixed(3)}" width="${r.w.toFixed(3)}" height="${r.h.toFixed(3)}" rx="${rx}" fill="${fill}" fill-opacity="${(r.opacity).toFixed(2)}" stroke="${stroke}" stroke-width="${sw}"/>`;
    });

    return `<svg viewBox="${minX.toFixed(3)} 0 ${W.toFixed(3)} ${H.toFixed(3)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
  }

  return { init, getAll, getById, getActive, setActive, imageCount, refreshActiveLabel };
})();
