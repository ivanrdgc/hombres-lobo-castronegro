// Limpieza de texto de interfaz para leerlo en voz alta: fuera emojis y
// comillas angulares, espacios normalizados (mismo criterio que toSpeech de
// texts/explain.ts). La usan el reproductor local (explain-audio) y las listas
// de piezas pregenerables de cada juego: AMBOS deben limpiar igual, o el clip
// pregenerado no coincidiría con el texto pedido en runtime.
export function cleanForSpeech(t: string): string {
  return String(t)
    // eslint-disable-next-line no-misleading-character-class -- mismo criterio que explain.ts: quita emojis y sus modificadores
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
