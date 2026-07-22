// Ayuda estructurada de cada rol: cuándo actúa y CÓMO se desarrolla paso a
// paso con la app (llamadas de la voz, toques en pantalla, palabras clave).
// Se muestra en el detalle de rol (tira de cartas, ℹ️ de la configuración) y
// en tu propia carta («Qué harás»). Es material de INTERFAZ: la voz del
// narrador no lee estos textos (su corpus tiene golden test aparte).
import type { RoleId } from '../roles';

export interface RoleHelp {
  /** Cuándo actúa (chip): «Cada noche», «Solo la primera noche», «Al morir»… */
  when: string;
  /** Cómo se desarrolla, en segunda persona y por orden. */
  steps: string[];
  /** Matiz o consejo final (opcional). */
  tip?: string;
}

export const ROLE_HELP: Record<RoleId, RoleHelp> = {
  hombre_lobo: {
    when: 'Cada noche',
    steps: [
      'La primera noche la voz pedirá a la manada reconocerse: abrid los ojos en silencio, miraos… y confirmadlo cada uno en su móvil.',
      'Cada noche, cuando la voz despierte a los lobos, tocad a la víctima en la lista: el primero que confirme decide por toda la manada.',
      'De día, disimula: acusa, defiéndete y vota como un vecino más.',
    ],
    tip: 'Ganáis cuando los lobos igualan en número a los demás vivos.',
  },
  aldeano: {
    when: 'Solo de día',
    steps: [
      'De noche duermes: la voz nunca te llamará.',
      'De día, debate, acusa y vota: tu voto es tu única arma.',
    ],
    tip: 'Fíjate en cómo vota cada cual: los lobos también votan… y a veces se protegen.',
  },
  vidente: {
    when: 'Cada noche',
    steps: [
      'Cada noche la voz te llama: abre los ojos y toca a la persona que quieras investigar.',
      'Tu móvil te enseña su carta (o solo su bando, según los ajustes): memorízala y confirma con «Lo he visto».',
      'De día, usa lo que sabes sin delatarte: si cantas demasiado, los lobos irán a por ti.',
    ],
  },
  bruja: {
    when: 'Cada noche, tras los lobos',
    steps: [
      'Te despiertas después de los lobos: la app te dice a quién acaban de atacar.',
      'Puedes salvarlo con la poción de vida (interruptor) y/o envenenar a alguien tocándolo en la lista. Cada poción se usa UNA vez por partida.',
      'Cuando se gasten, la voz seguirá llamándote cada noche: disimula y termina tu turno como si nada.',
    ],
  },
  cazador: {
    when: 'Al morir',
    steps: [
      'No actúas de noche.',
      'Si mueres (devorado o linchado), la app te da tu momento: toca a quien se llevará tu última flecha… o decide no disparar.',
    ],
    tip: 'La flecha también dispara cadenas: si matas a un enamorado, su pareja muere de pena.',
  },
  cupido: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche la voz te llama: toca a las dos personas que quedarán enamoradas (puedes incluirte).',
      'Cierras los ojos y la voz llamará a los enamorados por sus PALABRAS CLAVE: cada uno verá en su móvil quién es su pareja y lo confirmará. Nadie más sabrá quiénes son.',
      'El resto de la partida eres un aldeano normal.',
    ],
    tip: 'Si los enamorados son de bandos distintos, su meta pasa a ser quedar los dos últimos.',
  },
  ladron: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche verás en tu móvil las dos cartas que sobraron del reparto: toca una para quedártela, o quédate la tuya.',
      'Si las dos son de lobo, las reglas te obligan a coger una.',
      'Desde ese momento juegas con tu nueva carta (la app te la cambia al instante).',
    ],
  },
  nina: {
    when: 'Cada noche (por tu cuenta)',
    steps: [
      'Cuando los lobos abran los ojos para cazar, tú puedes entreabrir los tuyos y espiar.',
      'La app no te ayuda ni te delata: espía de verdad, con muchísimo cuidado.',
    ],
    tip: 'Si la manada te pilla mirando, esa noche la cena eres tú.',
  },
  defensor: {
    when: 'Cada noche',
    steps: [
      'Cada noche la voz te llama: toca a quién proteger del ataque de los lobos (puedes protegerte a ti).',
      'No puedes repetir a la misma persona dos noches seguidas (la app no te deja).',
      'Tu protegido no muere esta noche por los lobos; contra el veneno de la Bruja no hay escudo.',
    ],
  },
  anciano: {
    when: 'Nunca (resistencia pasiva)',
    steps: [
      'No actúas: aguantas el PRIMER ataque de los lobos sin morir (la app lo descuenta sola).',
      'Pero si te matan el pueblo, la Bruja o el Cazador, TODOS los aldeanos pierden sus poderes para siempre.',
    ],
    tip: 'Que el pueblo se lo piense dos veces antes de linchar a un anciano…',
  },
  cabeza_turco: {
    when: 'Si hay empate',
    steps: [
      'No actúas de noche.',
      'Si la votación del día acaba en empate, mueres tú en lugar del empatado.',
      'Como último acto, la app te pide señalar quién registrará la votación de mañana (y en la mesa anuncias quiénes tienen derecho a votar).',
    ],
  },
  tonto: {
    when: 'Si te linchan',
    steps: [
      'No actúas de noche.',
      'Si el pueblo te lincha, tu carta se revela y TE SALVAS… pero pierdes el derecho a voto el resto de la partida (la app te lo marca).',
    ],
  },
  gaitero: {
    when: 'Cada noche, el último',
    steps: [
      'Cada noche, al final, la voz te llama: toca a dos jugadores para encantarlos con tu música (puedes encantarte a ti mismo).',
      'Cierras los ojos y la voz llamará a los encantados por sus PALABRAS CLAVE: cada uno lo confirma en su móvil sin saber quién eres. Cada palabra pronunciada se quema, y la nueva aparece en esa misma pantalla al confirmar.',
      'Ganas en solitario si todos los DEMÁS vivos acaban encantados.',
    ],
  },
  gitana: {
    when: 'Cada noche',
    steps: [
      'Cada noche eliges una pregunta de sí o no (o escribes la tuya) en tu móvil.',
      'Al amanecer, la voz pedirá a un espíritu (un jugador muerto) que la responda ante todo el pueblo.',
    ],
  },
  cuervo: {
    when: 'Cada noche',
    steps: [
      'Cada noche la voz te llama: toca a un sospechoso.',
      'Al amanecer todos sabrán que esa persona carga con 2 votos extra en el juicio de hoy.',
    ],
  },
  aldeano_aldeano: {
    when: 'Nunca (inocencia pública)',
    steps: [
      'No actúas: tus dos caras muestran un aldeano y la app lo anuncia al empezar.',
      'Eres el único inocente certificado del pueblo: úsalo para ordenar el debate.',
    ],
  },
  dos_hermanas: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche la voz os llama a las dos: abrid los ojos con disimulo y reconoceos.',
      'Confirmadlo cada una en su móvil y volved a dormir. Sabéis que la otra es de fiar; nadie más lo sabe.',
    ],
  },
  tres_hermanos: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche la voz os llama a los tres: abrid los ojos con disimulo y reconoceos.',
      'Confirmadlo cada uno en su móvil y volved a dormir. Tenéis dos aliados seguros; nadie más lo sabe.',
    ],
  },
  angel: {
    when: 'Nunca (objetivo propio)',
    steps: [
      'No actúas de noche. Tu meta es MORIR pronto: ganas en solitario si caes la primera noche o en la primera votación.',
      'Si sobrevives a ambas, pasas a ser un aldeano más (la app te lo recuerda) y ganas con el pueblo.',
    ],
    tip: 'Hazte sospechoso… pero no tanto como para que huelan el truco.',
  },
  zorro: {
    when: 'Cada noche (hasta fallar)',
    steps: [
      'Cuando la voz te llame, toca una casa: olfatearás a ese jugador y a sus dos vecinos vivos según el orden de la mesa.',
      'La app te dice si hay rastro de lobo en ese trío. Si no lo hay, pierdes el olfato para siempre (y la voz seguirá llamándote para disimular).',
    ],
    tip: 'Por eso importa que el orden de la mesa en la app sea el de verdad.',
  },
  caballero: {
    when: 'Al morir devorado',
    steps: [
      'No actúas: tu espada oxidada trabaja sola.',
      'Si los lobos te devoran, el primer lobo hacia tu izquierda cae infectado por el óxido en ese MISMO amanecer (la app lo resuelve y lo anuncia). La mesa es un círculo: la izquierda sigue el orden de asientos y da la vuelta si hace falta.',
    ],
  },
  juez: {
    when: 'De día (una vez)',
    steps: [
      'No te despiertas de noche.',
      'De día, tu botón secreto está DENTRO de tu carta: abre «👁 Mostrar mi rol» con disimulo (todas las pantallas se ven iguales) y púlsalo ANTES de que acabe el juicio para exigir una segunda votación inmediata (una vez por partida).',
      'Nadie sabrá que fuiste tú: la app lo anuncia como caído del cielo.',
    ],
  },
  sirvienta: {
    when: 'Cuando linchan a alguien',
    steps: [
      'No actúas de noche.',
      'Cuando el pueblo condena a alguien, la aldea se detiene unos segundos: abre tu carta con disimulo («👁 Mostrar mi rol» — todas las pantallas se ven iguales) y decide AHÍ dentro, antes de que acabe la cuenta atrás, si sacrificas tu carta y asumes su rol.',
      'Si aceptas, se anuncia tu sacrificio (no el rol heredado) y empiezas de cero con la carta del condenado.',
    ],
  },
  actor: {
    when: 'Cada noche',
    steps: [
      'Cada noche la voz te llama y eliges papel: ver un rol (Vidente), proteger (Defensor) o señalar +2 votos (Cuervo).',
      'Después tocas a tu objetivo y confirmas. Cada noche puedes cambiar de papel… o no actuar.',
    ],
  },
  sectario: {
    when: 'Nunca (objetivo propio)',
    steps: [
      'No actúas de noche. La app divide la mesa en dos mitades y tu carta te dice quién está en la tuya.',
      'Ganas en solitario si eliminan a TODOS los de la otra mitad: dirige los linchamientos hacia allí sin que se note.',
    ],
  },
  domador: {
    when: 'Cada amanecer (automático)',
    steps: [
      'No tocas nada: al amanecer, si alguno de tus vecinos vivos es un hombre lobo, la voz hará gruñir a tu oso ante todo el pueblo.',
      'Un gruñido dice «hay lobo a mi lado»; el silencio, que tus vecinos son limpios: el cerco se estrecha cada mañana.',
    ],
    tip: 'También aquí importa que el orden de la mesa en la app sea el real.',
  },
  nino_salvaje: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche la voz te llama: toca a tu modelo a seguir.',
      'Mientras tu modelo viva, eres del pueblo. Si muere (de noche o linchado), te transformas en hombre lobo EN SECRETO. Nadie te avisará: solo tú sabes quién era tu modelo, así que solo tú lo sabes.',
      'Desde la noche siguiente, cuando la voz despierte a los hombres lobo, abre los ojos con ellos: tu móvil te enseñará a tu nueva manada y os reconoceréis en silencio.',
    ],
    tip: 'Tu carta (👁 Mostrar mi rol) te recuerda si ya estás transformado.',
  },
  lobo_albino: {
    when: 'Cada noche (traición alterna)',
    steps: [
      'Cazas cada noche con la manada, como un lobo más.',
      'Una noche de cada dos, la voz te despierta a ti solo: puedes devorar a un miembro de tu propia manada.',
      'Ganas en solitario si quedas como único superviviente.',
    ],
  },
  lobo_feroz: {
    when: 'Cada noche (mientras la manada esté intacta)',
    steps: [
      'Cazas con la manada como un lobo más.',
      'Mientras no haya muerto ningún lobo, la voz te despierta justo después: eliges tú solo una SEGUNDA víctima.',
    ],
  },
  perro_lobo: {
    when: 'Solo la primera noche',
    steps: [
      'La primera noche la voz te llama: elige en tu móvil ser aldeano fiel o unirte a los lobos.',
      'Si eliges a los lobos, la manada te reconocerá esa misma noche y cazarás con ellos. Nadie más sabrá jamás tu elección.',
    ],
  },
  infecto: {
    when: 'Cada noche, tras la caza',
    steps: [
      'Cazas con la manada como un lobo más.',
      'Elegida la víctima, la app te pregunta a ti solo (sin locución): puedes INFECTARLA en vez de devorarla (una sola vez por partida).',
      'Si infectas, esa misma noche la voz despierta al mordido por su PALABRA CLAVE y le cuenta en secreto que ahora es un hombre lobo: conserva su carta y sus poderes, pero desde la noche siguiente despierta, caza y gana con vosotros.',
    ],
    tip: 'Las noches sin infección la voz llama una palabra señuelo y espera igualmente: nadie sabrá si usaste tu poder. Ojo: si la víctima estaba protegida por el Defensor, no hay mordisco… y tu poder se pierde en vano.',
  },
};

/** El Alguacil no es una carta: es un cargo electo. Mismo formato de ayuda. */
export const ALGUACIL_HELP: { name: string; emoji: string; desc: string; help: RoleHelp } = {
  name: 'El Alguacil',
  emoji: '⭐',
  desc: 'Cargo electo el primer día: su voz vale por dos en las votaciones.',
  help: {
    when: 'Cargo electo (día 1)',
    steps: [
      'El primer día el pueblo debate y elige Alguacil: cualquiera registra el resultado tocándolo en la lista.',
      'Su voto vale doble en cada juicio (la app lo aplica sola).',
      'Al morir, señala a su sucesor desde su móvil.',
    ],
  },
};
