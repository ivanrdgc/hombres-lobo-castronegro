// Ayuda estructurada de cada rol de Secret Hitler (when + steps + tip).
import type { RoleId } from './roles';

export interface RoleHelp { when: string; steps: string[]; tip?: string }

export const ROLE_HELP: Record<RoleId, RoleHelp> = {
  liberal: {
    when: 'Bando liberal · mayoría a oscuras',
    steps: [
      'No sabes quién es quién: sois mayoría, pero jugáis a ciegas.',
      'Vota gobiernos de confianza, exige decretos liberales y ata cabos con quién descarta qué.',
      'Ganáis con 5 decretos liberales… o ejecutando a Hitler con un poder.',
    ],
    tip: 'Cuidado a partir de 3 decretos fascistas: si dejáis que Hitler sea Canciller, perdéis en el acto.',
  },
  fascist: {
    when: 'Bando fascista · conspirador',
    steps: [
      'La app te muestra a tus compañeros fascistas y a Hitler.',
      'Cuela decretos fascistas, siembra la duda y protege a Hitler sin cantarlo.',
      'Ganáis con 6 decretos fascistas… o logrando que Hitler salga Canciller cuando ya haya 3 decretos fascistas.',
    ],
    tip: 'A veces conviene promulgar un decreto liberal para ganarte la confianza de la mesa.',
  },
  hitler: {
    when: 'Bando fascista · el rostro oculto',
    steps: [
      'Eres fascista, pero tu meta es pasar por liberal. Con 5-6 jugadores conoces a tu fascista; con 7 o más, juegas a ciegas como ellos.',
      'Si te ejecutan, ganan los liberales; si te eligen Canciller con 3+ decretos fascistas, ganan los fascistas.',
    ],
    tip: 'Compórtate como el liberal más ejemplar: tu vida depende de que nadie sospeche.',
  },
};
