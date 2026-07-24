// Limpieza de texto de interfaz para leerlo en voz alta: fuera emojis (también
// en MEDIO del texto: la síntesis los leería por su nombre), abreviaturas
// expandidas y números legibles. La usan el reproductor local (explain-audio),
// las piezas pregenerables de cada juego Y los narradores de diario: TODOS
// deben limpiar igual, o el clip pregenerado no coincidiría con el texto pedido
// en runtime. (El toSpeech del corpus/explicación de Hombres Lobo va aparte:
// contrato golden de la v1.)
export function cleanForSpeech(t: string): string {
  return String(t)
    // eslint-disable-next-line no-misleading-character-class -- mismo criterio que explain.ts: quita emojis y sus modificadores
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2B50}\u{2764}]/gu, '')
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
    .replace(/\s+/g, ' ')
    .trim();
}
