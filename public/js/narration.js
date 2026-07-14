// Locuciones del narrador (modo automático) y ayuda de síntesis de voz.
// El dispositivo del master reproduce estos textos con la Web Speech API.

// Cada locución tiene varias variantes equivalentes: la partida elige una de
// forma determinista (según semilla, noche y paso), así cada partida suena
// distinta pero la voz y el texto en pantalla siempre coinciden.
export const NARRATION = {
  bienvenida: [
    'Bienvenidos a Castronegro. La niebla cubre las calles y los aldeanos se miran con recelo. Cada uno de vosotros acaba de recibir su destino. Miradlo en secreto en vuestro dispositivo y confirmad cuando estéis listos.',
    'Forasteros, habéis llegado a Castronegro… y ya no podréis marcharos. El destino de cada uno está escrito en su dispositivo: miradlo en secreto, no se lo enseñéis a nadie, y confirmad cuando estéis listos.',
    'Las campanas de Castronegro doblan al atardecer. Dicen los ancianos que esta noche la bestia camina entre nosotros. Descubrid vuestro destino en secreto y confirmad cuando lo hayáis memorizado.',
  ],
  noche_cae: [
    'Cae la noche sobre Castronegro. El pueblo entero cierra los ojos y solo la luna vigila. Que nadie hable hasta el amanecer.',
    'El sol se esconde tras las colinas y Castronegro queda a merced de la oscuridad. Silencio absoluto: la noche tiene oídos.',
    'La luna se alza sobre los tejados y las velas se apagan una a una. Castronegro duerme… o finge dormir.',
    'Un aullido lejano anuncia la llegada de la noche. Cerrad las puertas, apagad las luces… y que la suerte os acompañe.',
  ],
  ladron: [
    'Ladrón, despierta. Observa las dos cartas del centro de la mesa y decide si cambias tu destino.',
    'Ladrón, es tu momento: dos destinos ajenos te esperan sobre la mesa. ¿Robarás uno… o te quedarás como estás?',
    'Ladrón, despierta sin hacer ruido. La noche te ofrece dos vidas ajenas: elige si alguna te conviene más que la tuya.',
  ],
  cupido: [
    'Cupido, despierta. Tensa tu arco y une para siempre los corazones de dos habitantes del pueblo.',
    'Cupido, abre los ojos: tus flechas no entienden de bandos ni de prudencia. Elige a dos corazones y únelos para siempre.',
    'Cupido, la noche es joven y el amor, ciego. Apunta bien: esos dos corazones latirán juntos… o dejarán de latir juntos.',
  ],
  enamorados: [
    'Enamorados, abrid los ojos y reconoceos. Vuestros destinos están unidos: si uno muere, el otro morirá de pena.',
    'Dos corazones han quedado unidos por una flecha. Enamorados, reconoceos: desde hoy compartís la vida… y la muerte.',
  ],
  nino_salvaje: [
    'Niño Salvaje, despierta. Elige en silencio a tu modelo a seguir. Si algún día muere, la bestia despertará en ti.',
    'Niño Salvaje, abre los ojos y busca a quien admirar. Rézale a la luna para que viva mucho… o la bestia que llevas dentro despertará.',
    'Niño Salvaje, la noche te pregunta: ¿a quién querrás parecerte? Elige con cuidado: su muerte sería tu transformación.',
  ],
  perro_lobo: [
    'Perro Lobo, despierta. Esta noche eliges tu destino: la lealtad del pueblo o la llamada salvaje de la manada.',
    'Perro Lobo, dos sangres corren por tus venas y esta noche debes elegir una: ¿el calor del hogar o el aullido del bosque?',
    'Perro Lobo, la luna te llama y el pueblo te necesita. Decide de una vez por todas quién eres.',
  ],
  dos_hermanas: [
    'Dos Hermanas, despertad y reconoceos. Confiad la una en la otra, pase lo que pase.',
    'Dos Hermanas, alzad la vista y encontraos: la misma sangre corre por vuestras venas. Que nada os separe.',
  ],
  tres_hermanos: [
    'Tres Hermanos, despertad y reconoceos. La sangre os une frente a la amenaza.',
    'Tres Hermanos, alzad la vista y encontraos: juntos sois más fuertes que cualquier bestia.',
  ],
  actor: [
    'Actor, despierta. Elige qué papel interpretarás esta noche y actúa en consecuencia.',
    'Actor, se abre el telón: tres papeles esperan sobre el escenario de la noche. Elige el tuyo e interprétalo con maestría.',
    'Actor, la función va a comenzar. ¿Qué máscara vestirás esta noche?',
  ],
  defensor: [
    'Defensor, despierta. Alza tu escudo y elige a quién protegerás esta noche del ataque de las bestias.',
    'Defensor, la noche está llena de colmillos. Elige una puerta ante la que montar guardia hasta el alba.',
    'Defensor, tu escudo aún guarda las marcas de otras noches. ¿A quién protegerás de la manada esta vez?',
  ],
  vidente: [
    'Vidente, despierta. Consulta tu bola de cristal y descubre el verdadero rostro de un habitante del pueblo.',
    'Vidente, las estrellas están de tu lado esta noche. Elige un rostro y la verdad se te revelará.',
    'Vidente, tu bola de cristal brilla en la oscuridad. ¿Qué secreto quieres arrancarle a la noche?',
  ],
  zorro: [
    'Zorro, despierta. Olfatea con astucia y descubre si la bestia se esconde en el vecindario.',
    'Zorro, la brisa nocturna trae olores interesantes. Elige un rincón del pueblo y husmea en busca de la bestia.',
    'Zorro, afina tu hocico: en algún vecindario puede esconderse el lobo. ¿Dónde olfatearás esta noche?',
  ],
  cuervo: [
    'Cuervo, despierta. Sobrevuela el pueblo y señala con tus plumas negras a quien consideres sospechoso.',
    'Cuervo, despliega tus alas sobre Castronegro. ¿Sobre qué tejado dejarás caer tu sombra de sospecha?',
    'Cuervo, la noche es tuya. Grazna sobre la casa de quien no te inspire confianza: mañana todos lo sabrán.',
  ],
  lobos_reconocen: [
    'Hombres lobo, ha llegado vuestro momento. Todo el pueblo duerme con los ojos bien cerrados. Lobos, abrid los ojos en silencio y reconoced a vuestra manada. Cuando os hayáis reconocido, confirmadlo en vuestro dispositivo.',
    'Llega la hora de la manada. Aldeanos, ojos cerrados: quien mire, que se atenga a las consecuencias. Lobos, abrid los ojos, reconoced a vuestros hermanos de caza… y confirmadlo en vuestro dispositivo.',
  ],
  lobos: [
    'Hombres lobo, despertad. Elegid en silencio a vuestra próxima víctima.',
    'La manada sale de caza. Hombres lobo, elegid en silencio: ¿qué puerta derribaréis esta noche?',
    'Hombres lobo, el hambre aprieta y la luna está alta. Señalad a vuestra presa.',
    'Se oyen pisadas suaves sobre los tejados… Hombres lobo, elegid a vuestra víctima con cuidado: el pueblo empieza a sospechar.',
  ],
  encantados: [
    'La melodía del Gaitero flota sobre los tejados de Castronegro.',
    'Una música dulce y extraña se cuela por las rendijas de las ventanas…',
    'El Gaitero toca su melodía y las notas reptan por las calles dormidas…',
  ],
  lobo_feroz: [
    'Gran Lobo Feroz, tu hambre no conoce límites. Elige una segunda víctima para esta noche.',
    'Gran Lobo Feroz, una presa no basta para saciarte. La noche te concede un segundo bocado: elige.',
  ],
  lobo_albino: [
    'Hombre Lobo Albino, despierta. Esta noche puedes traicionar a tu propia manada, si así lo deseas.',
    'Hombre Lobo Albino, la luna llena ilumina tu pelaje. ¿Morderás esta noche la mano de tu propia manada?',
  ],
  bruja: [
    'Bruja, despierta. Contempla la víctima de los lobos. ¿Usarás tu poción de vida? ¿O quizás la de muerte?',
    'Bruja, tu caldero burbujea. La noche te muestra su obra: decide si la deshaces con una poción… o si añades una víctima más.',
    'Bruja, los frascos tintinean en tu alacena. ¿Vida? ¿Muerte? ¿O dejarás que la noche siga su curso?',
  ],
  gaitero: [
    'Gaitero, despierta. Que suene tu melodía hipnótica y encanta a dos nuevos habitantes.',
    'Gaitero, afina tu instrumento: dos nuevas almas caerán esta noche bajo el hechizo de tu música.',
  ],
  gitana: [
    'Gitana, despierta. Los espíritus aguardan tu pregunta desde el más allá.',
    'Gitana, el velo entre los mundos es fino esta noche. Formula tu pregunta: los muertos escuchan.',
  ],
  amanecer_sin_muertes: [
    'Amanece en Castronegro. Milagrosamente, esta noche nadie ha perdido la vida. El pueblo respira aliviado… por ahora.',
    'El gallo canta y, contra todo pronóstico, todas las camas amanecen ocupadas. Nadie ha muerto esta noche… ¿brujería?',
    'Amanece y el recuento es rápido: ni un rasguño. El pueblo respira, pero nadie baja la guardia.',
  ],
  amanecer_con_muertes: [
    'Amanece en Castronegro y el pueblo se reúne en la plaza. La noche ha dejado su huella…',
    'El sol se alza sobre Castronegro, pero no calienta a todos por igual. La noche ha pasado factura…',
    'Las campanas tocan a difuntos esta mañana. El pueblo se congrega en la plaza con el corazón encogido…',
  ],
  dia_debate: [
    'Es la hora del juicio. Debatid, acusad y defendeos. Cuando el pueblo haya decidido, que cualquiera registre la decisión final en su dispositivo.',
    'La plaza hierve de acusaciones. Hablad, señalad, defendeos… y cuando la decisión esté tomada, que alguien la registre en su dispositivo.',
    'Castronegro exige un culpable. Debatid con la cabeza fría y el corazón caliente; la decisión final se registra en el dispositivo.',
  ],
  dia_debate_tranquilo: [
    'Nadie ha muerto esta noche, pero la amenaza sigue entre vosotros. Debatid con calma: ¿quién se esconde tras una sonrisa? La decisión se registra en el dispositivo.',
    'La noche fue tranquila… demasiado tranquila. Hablad, sospechad, y cuando el pueblo decida —condena o clemencia—, que alguien lo registre en su dispositivo.',
    'Sin sangre al amanecer, pero los lobos siguen ahí fuera… o aquí dentro. Debatid; la decisión final se registra en el dispositivo.',
  ],
  cazador: [
    'El Cazador cae, pero con su último aliento tensa el arco. Cazador, elige a quién te llevas contigo.',
    'Ni la muerte detiene al Cazador: su arco ya está tenso. Elige tu última presa… o baja el arma para siempre.',
  ],
  sirvienta: [
    'La Sirvienta observa el juicio en silencio. ¿Dejará que el condenado se lleve su secreto a la tumba… o tomará su lugar?',
    'Un murmullo recorre la plaza: la Sirvienta da un paso al frente… ¿o quizás no? El destino del condenado pende de un hilo.',
  ],
  juez_segunda: [
    'El Juez Tartamudo golpea la mesa: ¡exige una segunda votación inmediata, sin debate!',
    '¡Orden, orden! El Juez Tartamudo invoca su privilegio: habrá una segunda votación ahora mismo, sin más palabras.',
  ],
  alguacil_elige: [
    'El pueblo debe elegir a su Alguacil, cuya palabra valdrá por dos. Debatid y registrad la decisión.',
    'Castronegro necesita una voz que pese el doble: elegid a vuestro Alguacil y registrad la decisión.',
  ],
  alguacil_hereda: [
    'El Alguacil ha caído. Con su último gesto, señala a su sucesor.',
    'La placa del Alguacil busca un nuevo pecho: que el caído señale a su heredero.',
  ],
  cabeza_pick: [
    'El Cabeza de Turco, con su último aliento, decide quién dirigirá la votación de mañana.',
    'Sacrificado por un empate injusto, el Cabeza de Turco aún tiene un último poder: decidir quién hablará mañana por el pueblo.',
  ],
  fin_partida: [
    'La historia de Castronegro llega a su fin.',
    'Y así termina esta historia de lobos, secretos y vecinos demasiado confiados.',
    'El telón cae sobre Castronegro. Recordad: en este pueblo, nadie es quien dice ser.',
  ],
};

// Plantillas para anunciar muertes al amanecer ({name} y {role} se sustituyen).
export const DEATH_LINES = [
  '{name} ha muerto esta noche.{role}',
  'La noche se ha llevado a {name}.{role}',
  '{name} no ha despertado esta mañana.{role}',
  'Encuentran el cuerpo sin vida de {name}.{role}',
];

// Improvisaciones: pinceladas aleatorias que la voz intercala para que cada
// partida suene única (presagios, rumores, ambiente del pueblo…).
export const IMPROV = {
  noche: [
    'Un búho ulula tres veces… dicen que eso nunca trae nada bueno.',
    'La niebla trepa desde el río y se enrosca en las farolas.',
    'A lo lejos retumba un trueno. La tormenta se acerca a Castronegro.',
    'Un gato negro cruza la plaza sin hacer ruido.',
    'Las contraventanas golpean con el viento… ¿o ha sido otra cosa?',
    'Esta noche la luna tiene un halo rojizo. Mal presagio, murmuran las viejas.',
    'Cruje una rama en el bosque. Nadie se atreve a mirar.',
    'El molino gira sin viento. Hay quien dice que eso anuncia desgracia.',
  ],
  amanecer: [
    'El panadero es el único que silba esta mañana, ajeno a todo.',
    'Las gallinas no han puesto ni un huevo: ellas también tienen miedo.',
    'La campana de la iglesia suena desafinada, como si estuviera nerviosa.',
    'Huele a pan recién hecho… y a miedo.',
    'Los perros del pueblo no han parado de ladrar en toda la noche.',
    'El herrero afila hachas sin parar. Por si acaso, dice.',
  ],
  debate: [
    'Se aceptan acusaciones, teorías descabelladas y miradas de sospecha.',
    'Recordad: quien mucho se defiende… algo esconde. ¿O no?',
    'Los más callados a veces son los más peludos. Solo lo dejo caer.',
    'Una lavandera jura haber visto huellas enormes junto al pozo.',
    'El tabernero ofrece una ronda gratis si acertáis hoy.',
  ],
  ocaso: [
    'El sol se esconde tras el campanario. Volved a vuestras casas… y echad el cerrojo.',
    'Se acaba el día. Que cada cual haga las paces con su conciencia.',
    'Las sombras se alargan en la plaza. La noche no tardará.',
    'Recoged los aperos y cerrad los postigos: la oscuridad vuelve a Castronegro.',
  ],
  pocos: [
    'Quedáis tan pocos que el eco responde en la plaza.',
    'Las calles se ven muy vacías últimamente…',
    'El enterrador pide vacaciones: demasiado trabajo esta semana.',
  ],
  relleno: [
    'La noche avanza despacio sobre Castronegro…',
    'Se oye al pueblo respirar en la oscuridad.',
    'Paciencia… las sombras no tienen prisa.',
    'La luna cruza lentamente el cielo.',
    'Ni un alma se mueve en las calles.',
    'El viento arrastra hojas secas por la plaza.',
    'Un perro gime en sueños, muy lejos.',
    'Las velas de la iglesia chisporrotean solas.',
  ],
};

export function improv(kind) {
  const v = IMPROV[kind] || [];
  return v.length ? v[Math.floor(Math.random() * v.length)] : '';
}

// Despedidas de cada paso: se pronuncian SIEMPRE al terminar (real o fingido),
// seguidas de unos segundos para que quien actuó bloquee el móvil y cierre los ojos.
export const OUTROS = {
  ladron: 'El Ladrón vuelve a cerrar los ojos, satisfecho o no con su suerte.',
  cupido: 'Cupido guarda su arco y vuelve a dormir.',
  enamorados: 'Los enamorados vuelven a cerrar los ojos, soñando el uno con el otro.',
  nino_salvaje: 'El Niño Salvaje vuelve a dormir, admirando a su modelo… en sueños.',
  perro_lobo: 'El Perro Lobo cierra los ojos, con su decisión ya tomada.',
  dos_hermanas: 'Las hermanas vuelven a dormir, tranquilas de saberse cerca.',
  tres_hermanos: 'Los hermanos vuelven a dormir, más tranquilos.',
  actor: 'El Actor cierra los ojos y el telón cae.',
  defensor: 'El Defensor vuelve a dormir, con el escudo junto a la cama.',
  vidente: 'La Vidente cierra los ojos y su bola de cristal se apaga.',
  zorro: 'El Zorro se enrosca y vuelve a dormir.',
  cuervo: 'El Cuervo pliega las alas y cierra los ojos.',
  lobos_reconocen: 'La manada vuelve a cerrar los ojos… por ahora.',
  lobos: 'Los hombres lobo vuelven a cerrar los ojos y se relamen en silencio.',
  infecto_decision: 'Los hombres lobo vuelven a cerrar los ojos y se relamen en silencio.',
  lobo_feroz: 'El Gran Lobo Feroz vuelve a cerrar los ojos, saciado… ¿o no?',
  lobo_albino: 'El Lobo Albino cierra los ojos, rumiando sus propios planes.',
  bruja: 'La Bruja tapa su caldero y vuelve a dormir.',
  gaitero: 'El Gaitero deja su instrumento y cierra los ojos.',
  gitana: 'La Gitana apaga las velas y vuelve a dormir.',
};

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Devuelve la variante de una locución, estable para una misma sal
// (p. ej. semilla+noche+paso) y distinta entre partidas y noches.
export function narr(key, salt = '') {
  const v = NARRATION[key];
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[hashStr(key + '|' + salt) % v.length];
}

export function deathLine(name, roleName, salt = '') {
  const tpl = DEATH_LINES[hashStr('death|' + salt + name) % DEATH_LINES.length];
  return tpl.replace('{name}', name).replace('{role}', roleName ? ` Era ${roleName}.` : '');
}

let watchdog = null;
const VOICE_LS = 'hlc_voice_v1';
let voiceCfg = { voiceURI: null, rate: 0.92, pitch: 0.9 };
try { Object.assign(voiceCfg, JSON.parse(localStorage.getItem(VOICE_LS)) || {}); } catch { /* valores por defecto */ }

export function getVoiceConfig() { return { ...voiceCfg }; }
export function setVoiceConfig(patch) {
  Object.assign(voiceCfg, patch);
  try { localStorage.setItem(VOICE_LS, JSON.stringify(voiceCfg)); } catch { /* sin storage */ }
}

// Voces en español disponibles, de mejor a peor calidad estimada.
export function listSpanishVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('es'))
    .sort((a, b) => rankVoice(b) - rankVoice(a));
}

// Heurística de calidad: las voces "naturales/neuronales" (Edge), las de Google
// (Chrome/Android) y las mejoradas (iOS) suenan mucho mejor que las locales básicas.
function rankVoice(v) {
  const name = `${v.name} ${v.voiceURI || ''}`.toLowerCase();
  const lang = v.lang.toLowerCase().replace('_', '-');
  let s = 0;
  if (lang.startsWith('es-es')) s += 30;
  else if (lang.startsWith('es')) s += 15;
  if (/natural|neural|online/.test(name)) s += 60;
  if (/google/.test(name)) s += 40;
  if (/premium|enhanced|mejorada|plus/.test(name)) s += 25;
  if (/siri/.test(name)) s += 20;
  if (/espeak|eloquence|compact|robot/.test(name)) s -= 80;
  return s;
}

function currentVoice() {
  const voices = listSpanishVoices();
  if (!voices.length) return null;
  if (voiceCfg.voiceURI) {
    const v = voices.find((x) => x.voiceURI === voiceCfg.voiceURI);
    if (v) return v;
  }
  return voices[0];
}

export function initVoice() {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.getVoices(); // fuerza la carga inicial
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  // Chrome tiene un bug que congela la síntesis en locuciones largas (~15 s):
  // un resume() periódico la mantiene viva y evita que la cola se bloquee.
  if (!watchdog) {
    watchdog = setInterval(() => {
      try { if (speechSynthesis.speaking) speechSynthesis.resume(); } catch { /* sin voz */ }
    }, 4000);
  }
}

// Habla un texto. Las locuciones se encolan (no se interrumpen entre sí).
// priority 'low' (murmullos, recordatorios): si la voz está ocupada, se omite
// sin tocar la cola — un relleno JAMÁS debe cancelar una narración principal.
// priority normal: solo descarta backlog si ya hay retraso real acumulado
// (algo sonando Y algo más en cola), para que el audio nunca frene la partida.
// onend se llama también si la síntesis no está disponible.
export function speak(text, { muted = false, onend = null, priority = 'normal' } = {}) {
  if (muted || typeof speechSynthesis === 'undefined' || !text) {
    if (onend) setTimeout(onend, 800);
    return;
  }
  try {
    if (priority === 'low' && (speechSynthesis.speaking || speechSynthesis.pending)) {
      if (onend) setTimeout(onend, 400);
      return;
    }
    if (speechSynthesis.speaking && speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = voiceCfg.rate;
    u.pitch = voiceCfg.pitch;
    u.volume = 1;
    let done = false;
    const finish = () => { if (!done) { done = true; if (onend) onend(); } };
    u.onend = finish;
    u.onerror = finish;
    // Cinturón de seguridad: algunos navegadores no disparan onend.
    setTimeout(finish, Math.max(4000, text.length * 110));
    speechSynthesis.speak(u);
  } catch {
    if (onend) setTimeout(onend, 800);
  }
}

export function stopSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
