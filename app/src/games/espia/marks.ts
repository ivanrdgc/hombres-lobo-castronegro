// Tachones LOCALES sobre la lista de localizaciones: viven en el localStorage
// de ESTE móvil (nunca en Firestore). Son deducciones privadas —el «papel y
// boli» del espía y de quien quiera seguirle la pista—, no estado de la
// partida: nadie más las ve y no viajan por la red.
export type EspiaMarks = Record<string, boolean>;

const PREFIX = 'hlc_espia_marks_';

/** Una libreta por partida y ronda: cada reparto empieza en blanco solo. */
export const marksKey = (startedAt: number, round: number): string => `${PREFIX}${startedAt}_${round}`;

/** Lee las marcas de una ronda y barre las de rondas ya jugadas. */
export function loadMarks(key: string): EspiaMarks {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== key) localStorage.removeItem(k);
    }
    return (JSON.parse(localStorage.getItem(key) || '{}') as EspiaMarks) || {};
  } catch {
    return {}; // sin storage (modo privado): las marcas viven solo en memoria
  }
}

export function saveMarks(key: string, marks: EspiaMarks): void {
  try {
    if (Object.keys(marks).length) localStorage.setItem(key, JSON.stringify(marks));
    else localStorage.removeItem(key);
  } catch {
    /* sin storage */
  }
}
