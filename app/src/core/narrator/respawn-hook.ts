// Punto de contacto UI ↔ narrador instalado: el modal de voz necesita
// re-arrancar la escena en curso al (de)silenciar, sin conocer al narrador
// del juego activo (lo asigna installNarrator; sin narrador, no-op).
export const narratorHook: { respawn: () => void } = { respawn: () => {} };
