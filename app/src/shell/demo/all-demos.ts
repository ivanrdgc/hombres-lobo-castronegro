// Índice de los tutoriales de todos los juegos: lo usan la pre-generación de
// clips (scripts/build-clips.mts) y el test de cobertura (cada pieza del
// tutorial debe tener clip pregenerado).
import { DEMO as hombresLobo } from '../../games/hombres-lobo/demo';
import { DEMO as unaNoche } from '../../games/una-noche/demo';
import { DEMO as avalon } from '../../games/avalon/demo';
import { DEMO as secretHitler } from '../../games/secret-hitler/demo';
import { DEMO as chameleon } from '../../games/chameleon/demo';
import { DEMO as insider } from '../../games/insider/demo';
import { DEMO as coup } from '../../games/coup/demo';
import { DEMO as twoRooms } from '../../games/two-rooms/demo';
import { DEMO as wavelength } from '../../games/wavelength/demo';
import { DEMO as codenames } from '../../games/codenames/demo';
import { DEMO as skull } from '../../games/skull/demo';
import { DEMO as loveLetter } from '../../games/love-letter/demo';
import { DEMO as decrypto } from '../../games/decrypto/demo';
import { DEMO as espia } from '../../games/espia/demo';
import { demoSpeechPieces } from './types';
import type { DemoScript } from './types';

export const ALL_DEMOS: DemoScript[] = [
  hombresLobo, unaNoche, avalon, secretHitler, chameleon, insider, coup, twoRooms, codenames, decrypto, wavelength, skull, loveLetter, espia,
];

/** Todas las piezas de voz de todos los tutoriales (pregenerables). */
export function allDemoStaticPieces(): string[] {
  return [...new Set(ALL_DEMOS.flatMap((d) => demoSpeechPieces(d)))];
}
