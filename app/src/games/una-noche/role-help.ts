// Ayuda estructurada de cada rol de Una Noche: cuándo actúa y CÓMO funciona
// paso a paso con la app. Mismo formato que games/hombres-lobo/texts/role-help.ts
// (when + steps + tip). Material de INTERFAZ (la voz del narrador no lo lee).
import type { RoleId } from './types';

export interface RoleHelp {
  /** Cuándo actúa (chip): «De noche, el primero», «Si te linchan»… */
  when: string;
  /** Cómo funciona, en segunda persona y por orden. */
  steps: string[];
  /** Matiz o consejo final (opcional). */
  tip?: string;
}

export const ROLE_HELP: Record<RoleId, RoleHelp> = {
  doble: {
    when: 'De noche, el primero',
    steps: [
      'La voz te llama la PRIMERA de la noche: toca la carta de otro jugador para mirarla. A partir de ese momento ERES ese rol para el resto de la partida.',
      'Si el rol copiado actúa en su turno, lo haces tú AHORA: como Vidente miras una carta; como Ladrón robas y miras; como Alborotadora intercambias dos ajenas; como Borracho cambias tu carta por una del centro.',
      'Si copiaste a un rol que despierta EN GRUPO (Lobo, Masón, Esbirro) o AL FINAL (Insomne), no actúas ahora: la voz te despertará otra vez en el paso de ese rol.',
      'A efectos de bando y victoria cuentas como el rol copiado: un Doble-Lobo caza con la manada, un Doble-Curtidor gana si lo linchan, etc.',
    ],
    tip: 'Si de noche alguien roba o intercambia TU carta, al final serás la carta que acabes teniendo (no la copiada). Y quien reciba tu carta «Doble» sin haber copiado nada cuenta como Aldeano.',
  },
  lobo: {
    when: 'De noche, con la manada',
    steps: [
      'La voz despierta a los hombres lobo: abrid los ojos y reconoceos. La app te muestra quiénes son tus compañeros de manada.',
      'Si eres el ÚNICO lobo (los demás están en el centro), puedes mirar una de las tres cartas del centro para orientarte.',
      'No devoras a nadie: en Una Noche la noche no mata. Tu misión es sobrevivir al juicio del día sin que te descubran.',
      'De día disimula: acusa, defiéndete y vota como un vecino más.',
    ],
    tip: 'Al amanecer tu carta puede haber cambiado (el Ladrón, la Alborotadora, el Borracho…). Lo que cuenta para ganar es la carta que tengas DELANTE al final, no con la que empezaste.',
  },
  esbirro: {
    when: 'De noche, tras los lobos',
    steps: [
      'La voz te despierta después de los lobos: la app te muestra quiénes son los hombres lobo. Ellos NO saben que existes.',
      'Juegas para el bando de los lobos: ganas si ellos ganan, es decir, si ningún lobo cae en la votación.',
      'Si no hay lobos en la mesa (ambas cartas cayeron en el centro), lo verás: tú solo defiendes su causa. En ese caso ganas con que caiga cualquiera que no seas tú… pero si el único condenado eres TÚ, gana el Pueblo.',
      'De día, protege a los lobos y desvía las sospechas.',
    ],
    tip: 'Sacrifícate si hace falta: mientras HAYA lobos en la mesa, que el pueblo te linche a TI en lugar de a uno de ellos hace ganar a tu bando (matarte a ti no cuenta como matar a un lobo).',
  },
  mason: {
    when: 'De noche, tras el Esbirro',
    steps: [
      'La voz despierta a los masones: abrid los ojos y reconoceos. La app te muestra a tu hermano masón.',
      'Sois del pueblo y sabéis con TOTAL certeza que el otro es inocente: es vuestra mayor baza en el debate.',
      'Si solo hay un masón en la mesa (el otro está en el centro), lo verás: nadie te confirmará.',
    ],
    tip: 'Dos masones que se declaran suelen ser creíbles… salvo que alguien les haya cambiado la carta durante la noche. Al final manda la carta que tengáis delante.',
  },
  vidente: {
    when: 'De noche',
    steps: [
      'La voz te llama: elige entre mirar la carta de OTRO jugador, o mirar DOS de las tres cartas del centro.',
      'La app te enseña lo que ves; memorízalo y confirma con «Lo he visto».',
      'De día usa esa información sin cantar demasiado: revelar que eres la Vidente te pinta una diana.',
    ],
    tip: 'Mirar dos cartas del centro es muy potente: te dice qué roles NO están en juego entre los jugadores y estrecha el cerco.',
  },
  ladron: {
    when: 'De noche, tras la Vidente',
    steps: [
      'La voz te llama: puedes cambiar tu carta por la de otro jugador… o no robar a nadie.',
      'Si robas, la app te enseña tu NUEVA carta: desde ese momento ERES ese rol. El otro jugador se queda tu antigua carta de Ladrón (y no se entera).',
      'De día defiende tu nuevo bando: si robaste a un lobo, ¡ahora el lobo eres tú!',
    ],
    tip: 'Robar te lleva también el bando: robar a un lobo te convierte en lobo para la victoria; robar a un aldeano te vuelve un simple aldeano.',
  },
  alborotadora: {
    when: 'De noche, tras el Ladrón',
    steps: [
      'La voz te llama: elige a DOS jugadores (que no seas tú) e intercambia sus cartas… o decide no tocar nada.',
      'No miras ninguna de las dos cartas: solo las cambias de sitio. Ellos no se enteran de nada.',
      'Tu propia carta no cambia: sigues siendo la Alborotadora, del bando del pueblo.',
    ],
    tip: 'Puedes hacer que un lobo acabe, sin saberlo, con una carta inocente… o cargarle un rol peligroso a un aldeano. El caos controlado es tu arma.',
  },
  borracho: {
    when: 'De noche, tras la Alborotadora',
    steps: [
      'La voz te llama: cambia OBLIGATORIAMENTE tu carta por una de las tres del centro… sin mirarla.',
      'Ni tú sabes en qué te has convertido: al final tendrás la carta del centro que cogiste, sea la que sea.',
      'De día tendrás que deducir tu propio rol por lo que vaya saliendo en el debate.',
    ],
    tip: 'Podrías haberte vuelto lobo sin saberlo: cuida a quién votas, no vayas a condenarte a ti mismo… o a salvarte sin querer.',
  },
  insomne: {
    when: 'De noche, la última',
    steps: [
      'La voz te despierta al FINAL de la noche, cuando ya todos han actuado: mira tu propia carta.',
      'Así descubres si alguien te la ha cambiado durante la noche (el Ladrón, la Alborotadora, el Borracho…).',
      'De día es información valiosísima: sabes qué eres AHORA, no con lo que empezaste.',
    ],
    tip: 'Si tu carta cambió, alguien te tocó: cruza esa pista con quién pudo hacerlo para desenmascararlo.',
  },
  aldeano: {
    when: 'Nunca de noche',
    steps: [
      'No actúas de noche: la voz no te llama.',
      'De día debates, acusas y votas: tu instinto y tu voto son tu única arma.',
    ],
    tip: 'Aunque empieces de Aldeano, alguien pudo cambiarte la carta mientras dormías. Lo que cuenta al final es la que tengas delante.',
  },
  cazador: {
    when: 'Si te linchan',
    steps: [
      'No actúas de noche.',
      'Si el pueblo te condena, tu flecha aún vuela: la app te pide (a ti, o a quien narra) señalar a quién te llevas por delante antes de cerrar la partida.',
      'La regla de la mesa manda: te llevas a quien TÚ señalaste en la votación. La app te deja elegirlo para poder registrarlo… y también permite no disparar.',
      'Cuenta la carta que tengas al final: si acabaste de Cazador (aunque empezaras siendo otro), tu disparo se cumple.',
    ],
    tip: 'Apunta tu voto a quien más sospeches: si caes, te lo llevas contigo. Puede darle la vuelta a la partida.',
  },
  tanner: {
    when: 'Objetivo propio (en solitario)',
    steps: [
      'No actúas de noche. Odias tu vida de curtidor: tu ÚNICA meta es que el pueblo te linche.',
      'Ganas en solitario si mueres en la votación. Si caes tú, ni el pueblo ni los lobos ganan… salvo que además caiga un lobo (entonces el pueblo también gana).',
      'Si NO te linchan, no ganas: la partida la deciden pueblo y lobos como si no estuvieras.',
    ],
    tip: 'Hazte el sospechoso: contradícete, ponte nervioso, defiéndete mal… lo justo para que voten por ti sin oler el truco.',
  },
};
