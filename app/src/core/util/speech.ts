// Limpieza de texto de interfaz para leerlo en voz alta: fuera emojis (también
// en MEDIO del texto: la síntesis los leería por su nombre), abreviaturas
// expandidas, números legibles y la puntuación RECOMPUESTA — al quitar un emoji
// queda un hueco («un transeúnte ⬜)» → «un transeúnte )») que se oye fatal.
// La usan el reproductor local (explain-audio), las piezas pregenerables de
// cada juego Y los narradores de diario: TODOS deben limpiar igual, o el clip
// pregenerado no coincidiría con el texto pedido en runtime. (El toSpeech del
// corpus/explicación de Hombres Lobo va aparte: contrato golden de la v1.)
//
// OJO: esto quita el emoji, no lo traduce. Si el emoji ES el contenido de la
// frase («Tus cartas: 👮 👮 🦹»), la voz se queda coja: hay que redactar la
// frase para que se sostenga sola. Lo vigila speech-lint.test.ts (B23).
export function cleanForSpeech(t: string): string {
  return String(t)
    // Símbolos que SÍ significan algo: se traducen ANTES de la purga de emojis
    // (si no, «G3→F3→E3» se leería «G3F3E3» y «Frío ↔ Caliente», «Frío Caliente»).
    .replace(/\s*[→⟶]\s*/g, ', ')
    .replace(/\s*↔\s*/g, ' frente a ')
    .replace(/(\d)\s*[×x]\s*(?=\d)/g, '$1 por ')
    // Purga de pictogramas: los rangos explícitos (flechas, relojes, triángulos
    // de reproducción…) MÁS la propiedad Unicode, que cubre el resto y los que
    // vengan. Sin ella se colaban ⏱ ⏫ ▶ y la voz los leía o los mascullaba.
    // eslint-disable-next-line no-misleading-character-class -- se quitan emojis y sus modificadores
    .replace(/[\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{22EF}]|\p{Extended_Pictographic}/gu, '')
    .replace(/[«»""]/g, '')
    // Abreviaturas que la voz lee mal.
    .replace(/\bp\.\s*ej\./gi, 'por ejemplo')
    .replace(/\bnº/gi, 'número ')
    .replace(/(\d)\s*min\b\.?/g, '$1 minutos')
    .replace(/\b1 minutos\b/g, '1 minuto')
    // Números compuestos: «4-2-1» → «4, 2, 1»; «3/5» → «3 de 5»; «+2» → «más 2»;
    // «·» separador → coma.
    .replace(/(\d)\s*-\s*(?=\d)/g, '$1, ')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 de $2')
    .replace(/\+\s*(\d)/g, 'más $1')
    .replace(/\s*·\s*/g, ', ')
    // Recomposición: los huecos y los signos huérfanos que deja la purga.
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/([,;:])\s*[—–]\s*/g, '$1 ')
    .replace(/([(¡¿[])\s+/g, '$1')
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([,;:])\s*([,.;:])/g, '$2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s,.;:]+/, '');
}
