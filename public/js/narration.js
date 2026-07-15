// Locuciones del narrador (modo automático) y ayuda de síntesis de voz.
// El dispositivo del master reproduce estos textos con la Web Speech API.

// Cada locución tiene varias variantes equivalentes: la partida elige una de
// forma determinista (según semilla, noche y paso), así cada partida suena
// distinta pero la voz y el texto en pantalla siempre coinciden.
// Frases COMPUESTAS: apertura × cuerpo × cierre, escritas para combinar bien.
// 6×6×5 piezas ≈ 180 frases distintas por tipo; la elección es determinista
// (semilla+noche+paso), así pantalla y voz coinciden y cada partida es única.
const COMPO = {
  bienvenida: [
    [
      'Bienvenidos a Castronegro.',
      'Forasteros: habéis llegado a Castronegro, y ya no podréis marcharos.',
      'Las campanas de Castronegro doblan al atardecer.',
      'Castronegro os abre sus puertas… y las cierra a vuestra espalda.',
      'La diligencia os deja en la plaza y arranca a toda prisa: el cochero sabe algo que vosotros no.',
      'Abrid bien los oídos, vecinos: esta historia empieza hoy.',
    ],
    [
      'La niebla cubre las calles y los aldeanos se miran con recelo.',
      'Dicen los ancianos que esta noche la bestia camina entre nosotros.',
      'La cosecha fue buena; la vecindad, ya veremos.',
      'Hay pueblos con mala fama, y luego está este. Aun así, le tenemos cariño.',
      'El herrero afila, el cura reza y el tabernero apunta deudas: todo normal… de momento.',
      'Aquí hasta las gallinas duermen con un ojo abierto, y hacen bien.',
    ],
    [
      'Cada uno de vosotros acaba de recibir su destino: miradlo en secreto en vuestro dispositivo y confirmad cuando estéis listos.',
      'Vuestro papel os espera en el dispositivo. En secreto: miradlo, memorizadlo y confirmad.',
      'El pergamino del destino ya está repartido: leedlo a escondidas en vuestro dispositivo y confirmad. Quien enseñe su carta, que no llore luego.',
      'Descubrid vuestro destino en secreto y confirmad cuando lo hayáis memorizado.',
      'Mirad vuestra carta sin que nadie la vea, grabadla en la memoria… y confirmad en el dispositivo.',
    ],
  ],
  noche_cae: [
    [
      'Cae la noche sobre Castronegro.',
      'El sol se esconde tras las colinas.',
      'La luna se alza sobre los tejados.',
      'Un aullido lejano anuncia la llegada de la noche.',
      'Se apaga el último farol de la plaza.',
      'El reloj de la iglesia da las doce, y nadie recuerda haberle dado cuerda.',
    ],
    [
      'El pueblo entero cierra los ojos y solo la luna vigila.',
      'Castronegro queda a merced de la oscuridad.',
      'Las velas se apagan una a una: el pueblo duerme… o finge dormir.',
      'El sereno se mete en casa a toda prisa; él sabrá por qué.',
      'El bosque contiene la respiración y hasta el gato del tabernero busca refugio.',
      'La luna pasa lista y prefiere no contar cuántos faltaréis mañana.',
    ],
    [
      'Que nadie hable hasta el amanecer.',
      'Silencio absoluto: la noche tiene oídos.',
      'Cerrad los ojos… y que la suerte os acompañe.',
      'Ojos cerrados todo el mundo: empieza la función.',
      'Dormid, vecinos… los que podáis.',
    ],
  ],
  ladron: [
    [
      'Ladrón, despierta.',
      'Ladrón, es tu momento.',
      'Ladrón, abre los ojos sin hacer ruido.',
      'Ladrón, la noche te llama por tu oficio.',
      'Ladrón, despierta: el trabajo nocturno es tu especialidad.',
      'Ladrón, en pie, que lo tuyo no espera.',
    ],
    [
      'Dos destinos ajenos te esperan sobre la mesa.',
      'La noche te ofrece dos vidas ajenas, recién barajadas.',
      'Hasta el destino se puede robar, si se tiene maña: ahí tienes dos.',
      'Dicen que lo tuyo no es robar, sino tomar prestado para siempre: sobre la mesa hay dos tentaciones.',
      'En el centro aguardan dos cartas que nadie reclama… todavía.',
      'El azar dejó dos cartas boca abajo, como quien deja la puerta entornada.',
    ],
    [
      'Decide si cambias tu destino… o te quedas como estás.',
      '¿Robarás uno, o la conciencia te puede?',
      'Elige si alguna de esas vidas te conviene más que la tuya.',
      'Mira las dos cartas y elige tu conciencia de esta noche.',
      'Tuya es la decisión: lo propio… o lo ajeno.',
    ],
  ],
  cupido: [
    [
      'Cupido, despierta.',
      'Cupido, abre los ojos.',
      'Cupido, la noche es joven y el amor, ciego.',
      'Cupido, saca tu arco.',
      'Cupido, despierta: hay trabajo para tus flechas.',
      'Cupido, en pie: el corazón de Castronegro late desparejado.',
    ],
    [
      'Tus flechas no entienden de bandos ni de prudencia.',
      'En Castronegro hasta el amor es cosa seria.',
      'Dos vecinos van a quererse sin remedio; ellos aún no lo saben.',
      'El frío de la noche pide corazones calientes.',
      'Tu puntería vale dos vidas: que no te tiemble el pulso.',
      'El amor entra esta noche en el pueblo sin llamar a la puerta.',
    ],
    [
      'Tensa tu arco y une para siempre los corazones de dos habitantes.',
      'Elige a dos corazones y únelos para siempre.',
      'Dispara tus dos flechas… y que sea lo que la luna quiera.',
      'Apunta bien: esos dos latirán juntos, o dejarán de latir juntos.',
      'Une dos destinos… y reza por que sean del mismo bando.',
    ],
  ],
  enamorados: [
    [
      'Enamorados, abrid los ojos.',
      'Dos corazones han quedado unidos por una flecha.',
      'La flecha de Cupido ha encontrado dos pechos.',
      'El amor ha entrado en Castronegro sin llamar a la puerta.',
      'Cupido ya hizo su trabajo; ahora os toca a vosotros.',
      'Hay dos corazones nuevos latiendo al mismo compás.',
    ],
    [
      'Vuestros destinos están unidos: si uno muere, el otro morirá de pena.',
      'Desde hoy compartís la vida… y la muerte.',
      'Vuestra suerte ya es una sola, para lo bueno y para lo terrible.',
      'Donde vaya uno, irá el otro… hasta el final.',
      'Ni la muerte sabrá separaros: lo comprobaréis.',
      'Un solo hilo sostiene ahora dos vidas.',
    ],
    [
      'Reconoceos en silencio.',
      'Miraos, reconoceos… y que nadie más lo note.',
      'Reconoceos: este secreto es solo vuestro.',
      'Buscaos con la mirada y guardad el secreto.',
      'Reconoceos sin ruido, que el pueblo duerme.',
    ],
  ],
  nino_salvaje: [
    [
      'Niño Salvaje, despierta.',
      'Niño Salvaje, abre los ojos.',
      'Niño Salvaje, criado entre zarzas y aullidos: es tu momento.',
      'Niño Salvaje, la noche te pregunta.',
      'Niño Salvaje, despierta: el bosque quiere saber de quién aprenderás.',
      'Niño Salvaje, en pie, pequeño: hay una decisión esperándote.',
    ],
    [
      'Todo cachorro necesita alguien a quien imitar.',
      'Elige un espejo humano en quien mirarte.',
      'Busca a quien admirar entre los vecinos.',
      'Necesitas un modelo a seguir, y esta noche se elige.',
      'De todos los rostros del pueblo, uno será tu guía.',
      'Alguien de esta mesa marcará tu camino.',
    ],
    [
      'Elígelo en silencio… y rézale a la luna para que viva mucho: si muere, la bestia despertará en ti.',
      'Elige con cuidado: su muerte sería tu transformación.',
      'Escoge bien: de su vida cuelga tu piel humana.',
      'Señálalo en tu pantalla… y que no le pase nada, o saldrá el lobo.',
      'Elige a tu modelo sabiendo el precio: si cae, tú cambias de bando.',
    ],
  ],
  perro_lobo: [
    [
      'Perro Lobo, despierta.',
      'Perro Lobo, abre los ojos.',
      'Perro Lobo, la luna te llama y el pueblo te necesita.',
      'Perro Lobo, despierta: dos sangres corren por tus venas.',
      'Perro Lobo, mitad ladrido, mitad aullido: es la hora.',
      'Perro Lobo, ni el collar te queda bien ni el bosque te acaba de aceptar.',
    ],
    [
      'Esta noche eliges tu destino, y no habrá vuelta atrás.',
      'El calor del hogar o el aullido del bosque: no puedes tener ambos.',
      'Castronegro quiere saber cuál de tus dos mitades manda.',
      'La lealtad del pueblo y la llamada salvaje tiran de ti a la vez.',
      'Una decisión, dos vidas posibles: solo una amanecerá contigo.',
      'Tu corazón lleva toda la vida en esta encrucijada.',
    ],
    [
      'Decide de una vez por todas quién eres.',
      'Elige bando en tu pantalla… y cárgalo sobre tu conciencia.',
      'Escoge: ¿pueblo o manada?',
      'Elige tu destino en silencio.',
      'Toma tu decisión… y que la luna te la respete.',
    ],
  ],
  actor: [
    [
      'Actor, despierta.',
      'Actor, se abre el telón.',
      'Actor, la función va a comenzar.',
      'Actor, despierta: Castronegro es tu escenario y la luna, tu candileja.',
      'Actor, el público duerme, que es como mejor se actúa.',
      'Actor, en pie: la noche estrena obra.',
    ],
    [
      'Tres papeles esperan sobre el escenario de la noche.',
      'Tres disfraces cuelgan del perchero de la oscuridad.',
      'Tres máscaras aguardan tu rostro.',
      'El repertorio es corto pero matador: tres papeles.',
      'Esta noche puedes ser quien no eres, que es tu especialidad.',
      'El guion ofrece tres personajes; el resto es interpretación.',
    ],
    [
      'Elige el tuyo e interprétalo con maestría.',
      'Escoge papel y no te salgas del guion.',
      '¿Qué máscara vestirás esta noche? Elige.',
      'Elige tu personaje… y que la crítica te sea leve.',
      'Decide tu papel en la pantalla y actúa en consecuencia.',
    ],
  ],
  defensor: [
    [
      'Defensor, despierta.',
      'Defensor, la noche está llena de colmillos.',
      'Defensor, alza tu escudo.',
      'Defensor, despierta: en Castronegro las murallas las ponen los valientes.',
      'Defensor, tu escudo aún guarda las marcas de otras noches.',
      'Defensor, en pie: hay puertas que no se defienden solas.',
    ],
    [
      'Alguien dormirá tranquilo gracias a ti… si eliges bien.',
      'Los colmillos no avisan, y tu escudo no puede estar en dos puertas.',
      'La noche silba entre las rendijas buscando una casa sin guardia.',
      'La manada ronda, y solo tu acero se interpone.',
      'Una puerta de este pueblo merece tu guardia hasta el alba.',
      'El pueblo duerme confiado en un escudo que no sabe de quién es.',
    ],
    [
      'Elige a quién protegerás esta noche del ataque de las bestias.',
      'Escoge una puerta ante la que montar guardia hasta el alba.',
      '¿A quién protegerás de la manada esta vez? Elige en tu pantalla.',
      'Señala a quien arroparás con tu acero hasta que cante el gallo.',
      'Decide tu guardia de esta noche… y que no se repita la de ayer.',
    ],
  ],
  vidente: [
    [
      'Vidente, despierta.',
      'Vidente, las estrellas están de tu lado esta noche.',
      'Vidente, tu bola de cristal brilla en la oscuridad.',
      'Vidente, despierta: la niebla del cristal se abre solo para ti.',
      'Vidente, abre los ojos: la verdad hace guardia esta noche.',
      'Vidente, el cristal está tibio y las cartas calladas: buena noche para saber.',
    ],
    [
      'En este pueblo todos mienten, pero a tu bola nadie sabe mentirle.',
      'Un rostro del pueblo esconde más de lo que enseña.',
      'La noche guarda secretos que solo tú puedes arrancarle.',
      'Detrás de una de estas sonrisas hay una respuesta esperándote.',
      'Tu don pesa, pero alumbra: úsalo.',
      'Alguien duerme creyendo que su secreto está a salvo. Iluso.',
    ],
    [
      'Elige un rostro y la verdad se te revelará.',
      'Consulta tu bola y descubre el verdadero rostro de un habitante.',
      'Pregunta un nombre en tu pantalla: ella dirá lo que esconde.',
      '¿A quién quieres ver por dentro? Elige.',
      'Escoge a quién mirar con los ojos del cristal.',
    ],
  ],
  zorro: [
    [
      'Zorro, despierta.',
      'Zorro, la brisa nocturna trae olores interesantes.',
      'Zorro, afina tu hocico.',
      'Zorro, despierta: a ti no se te escapa ni el tufillo de una mentira.',
      'Zorro, abre los ojos: la noche huele a algo.',
      'Zorro, en pie: hay rastros que se enfrían.',
    ],
    [
      'La noche huele a leña, a pan dormido… ¿y a lobo? Eso dímelo tú.',
      'En algún vecindario puede esconderse la bestia.',
      'Tres casas seguidas, un solo olfato: el tuyo.',
      'Donde el pueblo ve vecinos, tu nariz ve sospechosos.',
      'El viento sopla a tu favor, astuto.',
      'Alguna madriguera de este pueblo no es lo que parece.',
    ],
    [
      'Elige un rincón del pueblo y husmea en busca de la bestia.',
      'Escoge dónde meter el hocico… sabiendo que si no hay lobos, lo perderás.',
      'Señala a un vecino: olfatearás su casa y las dos de al lado.',
      '¿Dónde olfatearás esta noche? Decide.',
      'Elige tu trío de casas y confía en tu nariz.',
    ],
  ],
  cuervo: [
    [
      'Cuervo, despierta.',
      'Cuervo, despliega tus alas sobre Castronegro.',
      'Cuervo, la noche es tuya.',
      'Cuervo, despierta: tus plumas pesan dos votos y tú lo sabes.',
      'Cuervo, el viento te presta sus alas.',
      'Cuervo, en pie: hay tejados esperando tu sombra.',
    ],
    [
      'Tu graznido vale más que muchos discursos en la plaza.',
      'Una pluma negra sobre un tejado, y mañana el pueblo mirará distinto a su dueño.',
      'La sospecha es tu oficio, y lo ejerces de noche.',
      'Alguien te huele mal, y tu instinto rara vez se equivoca.',
      'Desde el cielo se ven cosas que la plaza no quiere ver.',
      'Tu sombra sabe posarse donde más duele.',
    ],
    [
      'Señala con tus plumas negras a quien consideres sospechoso.',
      '¿Sobre qué tejado dejarás caer tu sombra de sospecha? Elige.',
      'Grazna sobre la casa de quien no te inspire confianza: mañana todos lo sabrán.',
      'Elige un tejado: amanecerá más negro que los demás.',
      'Deja caer tus plumas… con dos votos dentro.',
    ],
  ],
  lobos_noche1: [
    [
      'Hombres lobo, ha llegado vuestro momento.',
      'Llega la hora de la manada.',
      'Primera noche de luna en Castronegro.',
      'Silencio: es la hora de los colmillos.',
      'El pueblo duerme y no sabe lo que ha sembrado.',
      'La luna llena pasa lista a sus criaturas.',
    ],
    [
      'Todo el pueblo duerme con los ojos bien cerrados; quien mire, que se atenga a las consecuencias.',
      'Aldeanos, ojos cerrados: esto no va con vosotros… todavía.',
      'Castronegro sueña, ajeno a lo que despierta entre sus camas.',
      'Nadie os ve, nadie os oye: la noche es toda vuestra.',
      'Los postigos están cerrados y las conciencias, dormidas.',
      'El bosque calla para que se os oiga mejor.',
    ],
    [
      'Lobos, abrid los ojos en silencio, miraos, reconoced a vuestra manada… y elegid juntos a vuestra primera presa.',
      'Lobos, abrid los ojos: saludad a los vuestros con la mirada y señalad en silencio a vuestra primera víctima.',
      'Lobos, abrid los ojos sin ruido: contaos, reconoceos… y estrenad la temporada eligiendo cena.',
      'Lobos, abrid los ojos: mirad quién caza con vosotros y decidid juntos quién no verá el alba.',
      'Lobos, abrid los ojos, reconoceos… y que vuestra primera elección sea digna de leyenda.',
    ],
  ],
  lobos: [
    [
      'Hombres lobo, despertad.',
      'La manada sale de caza.',
      'Hombres lobo, abrid los ojos.',
      'Hombres lobo, el hambre aprieta y la luna está alta.',
      'Se oyen pisadas suaves sobre los tejados: sois vosotros.',
      'Aúlla el viento para disimular vuestros pasos.',
    ],
    [
      'La despensa de Castronegro vuelve a estar abierta.',
      'El pueblo ha cerrado las puertas, pero olvidó cerrar los sueños.',
      'La luna pone la mesa y vosotros ponéis los dientes.',
      'La caza es un arte, y vosotros sois artistas con colmillos.',
      'El pueblo empieza a sospechar, así que elegid con cabeza.',
      'Alguna puerta de este pueblo ya no verá otro amanecer.',
    ],
    [
      'Elegid en silencio a vuestra próxima víctima.',
      '¿Qué puerta derribaréis esta noche? Decidid.',
      'Señalad a vuestra presa, con la mirada primero y con la pantalla después.',
      'Firmad la noche con un nombre.',
      'Escoged plato… con educación y en silencio.',
    ],
  ],
  encantados: [
    [
      'La melodía del Gaitero flota sobre los tejados de Castronegro.',
      'Una música dulce y extraña se cuela por las rendijas de las ventanas.',
      'El Gaitero toca su melodía y las notas reptan por las calles dormidas.',
      'Suena una gaita a lo lejos, tan dulce que hasta la niebla se para a escuchar.',
      'Las notas del Gaitero gotean de tejado en tejado, buscando oídos nuevos.',
      'Una melodía vieja como el bosque se enrosca en las chimeneas.',
    ],
  ],
  lobo_feroz: [
    [
      'Gran Lobo Feroz, despierta otra vez.',
      'Gran Lobo Feroz, tu hambre no conoce límites.',
      'Gran Lobo Feroz, una presa no basta para saciarte.',
      'Gran Lobo Feroz, tu estómago es leyenda en tres condados.',
      'Gran Lobo Feroz, la manada ya cenó… pero tú nunca repites plato: lo doblas.',
      'Gran Lobo Feroz, dicen que soplando derribas casas; esta noche no hará falta tanto.',
    ],
    [
      'La noche te concede un segundo bocado: elige.',
      'Elige una segunda víctima para esta noche.',
      '¿Quién será el segundo plato? Señálalo.',
      'Escoge otra puerta, tú solo, sin compartir.',
      'Tu segunda presa aguarda: decide en silencio.',
    ],
  ],
  lobo_albino: [
    [
      'Hombre Lobo Albino, despierta.',
      'Hombre Lobo Albino, la luna llena ilumina tu pelaje.',
      'Hombre Lobo Albino, blanco como la nieve y frío como ella.',
      'Hombre Lobo Albino, la luna te confunde con su reflejo.',
      'Hombre Lobo Albino, tú no cazas para la manada: cazas para quedarte solo.',
      'Hombre Lobo Albino, tu paciencia es tan blanca como tu piel.',
    ],
    [
      'Esta noche puedes traicionar a tu propia manada, si así lo deseas.',
      '¿Morderás la mano de tu propia manada? Decide.',
      '¿Caerá esta noche un hermano de camada? Tú eliges.',
      'Traición… o paciencia: escoge en silencio.',
      '¿Empiezas esta noche a quedarte solo? Decide.',
    ],
  ],
  bruja: [
    [
      'Bruja, despierta.',
      'Bruja, tu caldero burbujea.',
      'Bruja, los frascos tintinean en tu alacena.',
      'Bruja, despierta: huele a azufre y a decisiones difíciles.',
      'Bruja, tu gato bosteza y el caldero pregunta.',
      'Bruja, abre los ojos: la noche viene a consultarte.',
    ],
    [
      'La noche te muestra su obra.',
      'Contempla lo que han hecho los lobos.',
      'La noche te enseña sus cartas, y tú guardas dos ases embotellados.',
      'En tus manos caben un amanecer más y un funeral más.',
      'Mira el trabajo de los colmillos y pésalo en tu balanza.',
      'La luna te enseña el estropicio de esta noche.',
    ],
    [
      '¿Usarás tu poción de vida? ¿O quizás la de muerte? Decide.',
      'Decide si lo arreglas, lo empeoras… o lo dejas estar.',
      '¿Vida? ¿Muerte? ¿O dejarás que la noche siga su curso?',
      '¿Devuelves un alma, te llevas otra… o cierras la alacena? Elige.',
      'Administra tus pociones… y termina tu turno.',
    ],
  ],
  gaitero: [
    [
      'Gaitero, despierta.',
      'Gaitero, afina tu instrumento.',
      'Gaitero, infla el fuelle.',
      'Gaitero, despierta: tu música no mata, pero tampoco suelta.',
      'Gaitero, tu melodía teje su red nota a nota.',
      'Gaitero, en pie: la noche pide música.',
    ],
    [
      'Castronegro baila dormido y tú llevas el compás.',
      'Donde no llegan los colmillos, llega tu música.',
      'Dos almas más caerán esta noche bajo tu hechizo.',
      'Tu red de notas aún tiene huecos por llenar.',
      'La gaita sabe a quién busca; tú solo tienes que soplar.',
      'Nadie escapa dos veces de tu melodía.',
    ],
    [
      'Encanta a dos nuevos habitantes.',
      'Elige dos oídos nuevos para tu música.',
      'Escoge qué dos vecinos quedarán prendidos en tu red.',
      'Señala a dos almas más en tu pantalla.',
      'Que suene tu melodía hipnótica: dos más esta noche.',
    ],
  ],
  gitana: [
    [
      'Gitana, despierta.',
      'Gitana, el velo entre los mundos es fino esta noche.',
      'Gitana, enciende tus velas.',
      'Gitana, despierta: los espíritus están de tertulia.',
      'Gitana, los muertos se aburren, y a los aburridos se les escapa la verdad.',
      'Gitana, abre los ojos: el más allá tiene línea directa esta noche.',
    ],
    [
      'Los espíritus aguardan tu pregunta desde el más allá.',
      'Los muertos escuchan, que es lo único que ya pueden hacer.',
      'El otro lado admite una pregunta, y solo una.',
      'Los espíritus responderán al amanecer, a coro y sin mentir.',
      'La verdad de los muertos no tiene dueño… pero sí precio: una sola pregunta.',
      'Esta noche los difuntos están habladores.',
    ],
    [
      'Formula tu pregunta.',
      'Elígela con astucia.',
      '¿Qué quieres saber? Escríbelo o escoge una pregunta.',
      'Haz tu pregunta de sí o no.',
      'Pregunta… y mañana escucha.',
    ],
  ],
  amanecer_sin_muertes: [
    [
      'Amanece en Castronegro.',
      'El gallo canta con ganas esta mañana.',
      'Sale el sol sobre los tejados escarchados.',
      'Amanece con niebla y buenas noticias, que aquí es casi lo mismo que un milagro.',
      'Hoy el sol madruga… y la muerte se ha dormido.',
      'Las contraventanas se abren una a una.',
    ],
    [
      'Milagrosamente, esta noche nadie ha perdido la vida.',
      'Contra todo pronóstico, todas las camas amanecen ocupadas.',
      'El recuento es rápido: ni un rasguño.',
      'El enterrador desayuna tranquilo: no hay trabajo.',
      'Ni una silla vacía: la noche fue clemente.',
      'Todos responden al pasar lista. Todos.',
    ],
    [
      'El pueblo respira aliviado… por ahora.',
      'Nadie baja la guardia, y hacen bien.',
      '¿Brujería? ¿Suerte? Mañana se sabrá.',
      'Aprovechad el respiro: no durará.',
      'Que nadie se confíe: los colmillos solo descansan.',
    ],
  ],
  amanecer_con_muertes: [
    [
      'Amanece en Castronegro y el pueblo se reúne en la plaza.',
      'El sol se alza sobre Castronegro, pero no calienta a todos por igual.',
      'Las campanas tocan a difuntos esta mañana.',
      'Amanece con el cielo del color de la ceniza.',
      'El gallo canta a media voz, como pidiendo perdón.',
      'La escarcha de esta mañana no es lo más frío de la plaza.',
    ],
    [
      'La noche ha dejado su huella…',
      'La noche ha pasado factura…',
      'Hay noticias, y no son buenas…',
      'La noche se ha cobrado su parte…',
      'El panadero no silba y el herrero no golpea: mala señal…',
      'Un corrillo y un silencio esperan en la plaza…',
    ],
  ],
  dia_debate: [
    [
      'Es la hora del juicio.',
      'La plaza hierve de acusaciones.',
      'Castronegro exige un culpable.',
      'Se abre la sesión en la plaza.',
      'Hoy se juzga con la lengua lo que anoche se hizo con los dientes.',
      'La horca tiene hambre y el pueblo tiene sospechas: mal día para los tímidos.',
    ],
    [
      'Debatid, acusad y defendeos.',
      'Se admiten pruebas, corazonadas y rencores mal disimulados.',
      'Hablad, señalad, defendeos… con la cabeza fría y el corazón caliente.',
      'El pueblo quiere justicia y, si no la encuentra, se conforma con un culpable.',
      'Hablad ahora o aullad para siempre.',
      'Mirad bien esos rostros: uno de ellos ensaya su cara de inocente.',
    ],
    [
      'Cuando el pueblo haya decidido, que cualquiera registre la decisión final en su dispositivo.',
      'Cuando la decisión esté tomada, que alguien la registre en su dispositivo.',
      'La decisión final se registra en el dispositivo.',
      'Al acabar, registrad la decisión en el dispositivo.',
      'Y que alguien registre después lo que el pueblo decida.',
    ],
  ],
  dia_debate_tranquilo: [
    [
      'Nadie ha muerto esta noche, pero la amenaza sigue entre vosotros.',
      'La noche fue tranquila… demasiado tranquila.',
      'Sin sangre al amanecer, pero los lobos siguen ahí fuera… o aquí dentro.',
      'Ningún muerto que llorar, pero la desconfianza no descansa.',
      'La calma también es sospechosa en Castronegro.',
      'Noche sin dientes, día con lenguas.',
    ],
    [
      'Debatid con calma: ¿quién se esconde tras una sonrisa?',
      'Hablad, sospechad… ¿quién sonríe demasiado esta mañana?',
      'Debatid sin prisa y decidid si hoy la horca ayuna.',
      'Aprovechad las lenguas, que anoche descansaron los dientes.',
      'Pensad bien: la clemencia también es una opción.',
      'Repasad las caras: alguna esconde colmillos.',
    ],
    [
      'La decisión —condena o clemencia— se registra en el dispositivo.',
      'Cuando el pueblo decida, que alguien lo registre en su dispositivo.',
      'La decisión final se registra en el dispositivo.',
      'Registrad al acabar la decisión en el dispositivo.',
      'Y que alguien anote en su dispositivo lo que decidáis.',
    ],
  ],
  fin_partida: [
    [
      'La historia de Castronegro llega a su fin.',
      'Y así termina esta historia de lobos, secretos y vecinos demasiado confiados.',
      'El telón cae sobre Castronegro.',
      'Se cierra el libro de Castronegro… hasta que alguien vuelva a abrirlo.',
      'Fin de la historia: la niebla se retira y los secretos salen al sol.',
      'Y colorín, colorado… en Castronegro nadie ha quedado como esperaba.',
    ],
    [
      'Recordad: en este pueblo, nadie es quien dice ser.',
      'Los pueblos malditos siempre encuentran nuevos lectores.',
      'El pueblo jura que esto no volverá a pasar. Mentira.',
      'La luna apaga su farol: se acabó.',
      'Guardad las antorchas… hasta la próxima.',
      'Que cada cual haga las paces con lo que hizo.',
    ],
  ],
};

export const NARRATION = {
  dos_hermanas: [
    'Dos Hermanas, despertad y reconoceos. Confiad la una en la otra, pase lo que pase.',
    'Dos Hermanas, alzad la vista y encontraos: la misma sangre corre por vuestras venas. Que nada os separe.',
    'Dos Hermanas, abrid los ojos: en un pueblo de mentirosos, tener una hermana es tener la única verdad. Reconoceos.',
    'Dos Hermanas, despertad: la familia es lo único que la niebla no ha podido llevarse. Miraos y confirmadlo.',
  ],
  tres_hermanos: [
    'Tres Hermanos, despertad y reconoceos. La sangre os une frente a la amenaza.',
    'Tres Hermanos, alzad la vista y encontraos: juntos sois más fuertes que cualquier bestia.',
    'Tres Hermanos, abrid los ojos: tres pares de manos, una sola casa. Reconoceos y que nadie os la derribe.',
    'Tres Hermanos, despertad: vuestra madre os hizo prometer que os cuidaríais. Es buen momento para empezar. Reconoceos.',
  ],
  lobos_reconocen: [
    'Hombres lobo, ha llegado vuestro momento. Todo el pueblo duerme con los ojos bien cerrados. Lobos, abrid los ojos en silencio y reconoced a vuestra manada. Cuando os hayáis reconocido, confirmadlo en vuestro dispositivo.',
    'Llega la hora de la manada. Aldeanos, ojos cerrados: quien mire, que se atenga a las consecuencias. Lobos, abrid los ojos, reconoced a vuestros hermanos de caza… y confirmadlo en vuestro dispositivo.',
    'Esta noche no hay caza, pero sí presentaciones. Lobos, abrid los ojos sin ruido, miraos bien: esta es vuestra manada. Confirmadlo en el dispositivo cuando os tengáis vistos.',
    'El bosque quiere saber cuántos sois. Lobos, abrid los ojos con sigilo y reconoceos: mañana empezará lo serio. Confirmadlo en vuestro dispositivo.',
  ],
  cazador: [
    'El Cazador cae, pero con su último aliento tensa el arco. Cazador, elige a quién te llevas contigo.',
    'Ni la muerte detiene al Cazador: su arco ya está tenso. Elige tu última presa… o baja el arma para siempre.',
    'El Cazador se despide como vivió: apuntando. Elige tu último blanco, viejo amigo.',
    'Cae el Cazador, pero su flecha aún no lo sabe. Dinos, Cazador: ¿a quién se lleva tu último disparo?',
    'Un cazador nunca muere del todo mientras le quede una flecha. Es la hora: elige compañía para el viaje.',
  ],
  sirvienta: [
    'La Sirvienta observa el juicio en silencio. ¿Dejará que el condenado se lleve su secreto a la tumba… o tomará su lugar?',
    'Un murmullo recorre la plaza: la Sirvienta da un paso al frente… ¿o quizás no? El destino del condenado pende de un hilo.',
    'Antes de que la carta del condenado vea la luz, una sombra duda junto al cadalso: la Sirvienta puede reclamar ese destino.',
    'La plaza contiene el aliento: ¿asumirá la Sirvienta el papel del condenado, o dejará que caiga el telón?',
  ],
  juez_segunda: [
    'El Juez Tartamudo golpea la mesa: ¡exige una segunda votación inmediata, sin debate!',
    '¡Orden, orden! El Juez Tartamudo invoca su privilegio: habrá una segunda votación ahora mismo, sin más palabras.',
    'El mazo del Juez retumba en la plaza: la justicia de Castronegro repite jugada. ¡Segunda votación, ya!',
    'El Juez Tartamudo se levanta y, sin tartamudear ni una vez, ordena: ¡otra votación, ahora, y sin debate!',
  ],
  alguacil_elige: [
    'El pueblo debe elegir a su Alguacil, cuya palabra valdrá por dos. Debatid y registrad la decisión.',
    'Castronegro necesita una voz que pese el doble: elegid a vuestro Alguacil y registrad la decisión.',
    'Se busca Alguacil: paga escasa, esperanza de vida dudosa, voto doble garantizado. Elegid y registradlo.',
    'La placa del Alguacil brilla sobre la mesa. ¿Qué pecho la lucirá? Debatid y registrad la decisión.',
  ],
  alguacil_hereda: [
    'El Alguacil ha caído. Con su último gesto, señala a su sucesor.',
    'La placa del Alguacil busca un nuevo pecho: que el caído señale a su heredero.',
    'El bastón de mando cae al suelo… pero no llega a tocarlo: el Alguacil, con su último aliento, nombra sucesor.',
    'Muere el Alguacil, no su cargo. Que su dedo, ya frío, elija quién hablará doble desde mañana.',
  ],
  cabeza_pick: [
    'El Cabeza de Turco, con su último aliento, decide quién dirigirá la votación de mañana.',
    'Sacrificado por un empate injusto, el Cabeza de Turco aún tiene un último poder: decidir quién hablará mañana por el pueblo.',
    'Pagó culpas ajenas, como siempre… pero el Cabeza de Turco tiene la última palabra: la de decidir quiénes votarán mañana.',
    'El empate se cobró su chivo expiatorio. Antes de partir, el Cabeza de Turco reparte la voz del día siguiente.',
  ],
};

// Plantillas para anunciar muertes al amanecer ({name} y {role} se sustituyen).
export const DEATH_LINES = [
  '{name} ha muerto esta noche.{role}',
  'La noche se ha llevado a {name}.{role}',
  '{name} no ha despertado esta mañana.{role}',
  'Encuentran el cuerpo sin vida de {name}.{role}',
  'La puerta de {name} sigue cerrada… y ya nadie la abrirá desde dentro.{role}',
  'La silla de {name} amanece vacía en la taberna.{role}',
  'De {name} solo queda el farol encendido y una puerta que golpea el viento.{role}',
  'El sereno encontró a {name} al pie de la muralla. No hubo nada que hacer.{role}',
  '{name} ya no responde cuando llaman a su puerta.{role}',
  'Esta mañana, el perro de {name} aúlla solo en el portal.{role}',
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
    'En el cementerio, una vela que nadie encendió arde toda la noche.',
    'El pozo devuelve el eco con retraso, como si algo ahí abajo escuchara primero.',
    'Dicen que anoche el espantapájaros amaneció mirando hacia el pueblo.',
    'Las veletas apuntan todas al bosque, y no sopla viento.',
    'Alguien dejó pan en el alféizar… por la mañana solo quedaban las migas y una huella.',
    'Los caballos del establo golpean el suelo, inquietos: ellos siempre lo saben antes.',
    'Una sombra cruza el tejado de la iglesia. El campanero jura que no era suya.',
    'Se oye cantar muy bajito en el lavadero… y no hay nadie en el lavadero.',
  ],
  amanecer: [
    'El panadero es el único que silba esta mañana, ajeno a todo.',
    'Las gallinas no han puesto ni un huevo: ellas también tienen miedo.',
    'La campana de la iglesia suena desafinada, como si estuviera nerviosa.',
    'Huele a pan recién hecho… y a miedo.',
    'Los perros del pueblo no han parado de ladrar en toda la noche.',
    'El herrero afila hachas sin parar. Por si acaso, dice.',
    'La lechera hace su ronda mirando dos veces cada esquina.',
    'En la fuente, el agua sale turbia. Casualidad, seguro.',
    'El cura ha vuelto a dormir en la sacristía, con la puerta atrancada.',
    'Hay huellas en la escarcha que nadie quiere medir.',
    'El sepulturero saluda con demasiada energía esta mañana.',
    'Las viejas del mercado hablan en susurros y callan cuando pasas.',
  ],
  debate: [
    'Se aceptan acusaciones, teorías descabelladas y miradas de sospecha.',
    'Recordad: quien mucho se defiende… algo esconde. ¿O no?',
    'Los más callados a veces son los más peludos. Solo lo dejo caer.',
    'Una lavandera jura haber visto huellas enormes junto al pozo.',
    'El tabernero ofrece una ronda gratis si acertáis hoy.',
    'Consejo de vieja: desconfiad de quien tenga las uñas muy limpias esta mañana.',
    'En el juicio de hoy, como en la sopa de la posada: todo el mundo mete cuchara.',
    'Se recuerda al público que aullar en mitad del debate se considera confesión.',
    'El barbero afirma que a cierto vecino le crece la barba… demasiado rápido.',
    'Quien tenga coartada, que la enseñe; quien no, que la invente rápido.',
    'Hoy el pescadero no ha venido: dice que en la plaza huele peor que en su puesto.',
    'Las apuestas están en la taberna: dos a uno a que hoy el pueblo se equivoca.',
  ],
  ocaso: [
    'El sol se esconde tras el campanario. Volved a vuestras casas… y echad el cerrojo.',
    'Se acaba el día. Que cada cual haga las paces con su conciencia.',
    'Las sombras se alargan en la plaza. La noche no tardará.',
    'Recoged los aperos y cerrad los postigos: la oscuridad vuelve a Castronegro.',
    'El pastor recoge el rebaño a toda prisa: hasta las ovejas saben qué hora es.',
    'Última luz del día. Aprovechadla para mirar bien a vuestros vecinos… por si acaso.',
    'El campanero toca a recogida y no espera propina: hoy tiene prisa por bajar.',
    'Se apagan los oficios, se encienden los miedos. Buenas noches, Castronegro… es un decir.',
    'El horizonte se traga el sol como la noche se tragará vuestras certezas. Adentro todos.',
    'Cae la tarde y suben los cerrojos. Que soñéis con cosas sin colmillos.',
  ],
  pocos: [
    'Quedáis tan pocos que el eco responde en la plaza.',
    'Las calles se ven muy vacías últimamente…',
    'El enterrador pide vacaciones: demasiado trabajo esta semana.',
    'La posada ya no llena ni una mesa. El posadero, aun así, no fía.',
    'Quedan más casas que vecinos: mal negocio para todos, menos para los cuervos.',
    'El coro de la iglesia se ha quedado en un solo: y desafina.',
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
    'El río baja hablando solo, como cada noche.',
    'En algún desván, un reloj olvidado sigue contando para nadie.',
    'La escarcha va cubriendo los tejados sin pedir permiso.',
    'Una lechuza cambia de rama, y el bosque entero lo comenta.',
    'Las brasas del herrero laten en la fragua como un corazón cansado.',
    'Pasa una nube y la luna se toma un descanso.',
  ],
};

export function improv(kind) {
  const v = IMPROV[kind] || [];
  return v.length ? v[Math.floor(Math.random() * v.length)] : '';
}

// Despedidas de cada paso: se pronuncian SIEMPRE al terminar (real o fingido),
// seguidas de unos segundos para que quien actuó bloquee el móvil y cierre los ojos.
export const OUTROS = {
  ladron: [
    'El Ladrón vuelve a cerrar los ojos, satisfecho o no con su suerte.',
    'El Ladrón cierra los ojos: lo robado, robado está.',
    'El Ladrón se acomoda de nuevo en la sombra y cierra los ojos.',
  ],
  cupido: [
    'Cupido guarda su arco y vuelve a dormir.',
    'Cupido cierra los ojos, orgulloso de su puntería.',
    'Cupido cuelga el arco del cabecero y se duerme sonriendo.',
  ],
  enamorados: [
    'Los enamorados vuelven a cerrar los ojos, soñando el uno con el otro.',
    'Los enamorados cierran los ojos: ahora sueñan por partida doble.',
    'Los enamorados vuelven a dormir, con el corazón en otra almohada.',
  ],
  nino_salvaje: [
    'El Niño Salvaje vuelve a dormir, admirando a su modelo… en sueños.',
    'El Niño Salvaje se enrosca y cierra los ojos, medio niño, medio promesa.',
    'El Niño Salvaje vuelve a dormir; que su modelo viva muchos años.',
  ],
  perro_lobo: [
    'El Perro Lobo cierra los ojos, con su decisión ya tomada.',
    'El Perro Lobo vuelve a dormir: ya sabe a quién ladrará mañana.',
    'El Perro Lobo cierra los ojos, en paz por fin con sus dos mitades.',
  ],
  dos_hermanas: [
    'Las hermanas vuelven a dormir, tranquilas de saberse cerca.',
    'Las hermanas cierran los ojos, cada una velando el sueño de la otra.',
    'Las hermanas vuelven a dormir: la familia, primero.',
  ],
  tres_hermanos: [
    'Los hermanos vuelven a dormir, más tranquilos.',
    'Los hermanos cierran los ojos, espalda con espalda como cuando eran niños.',
    'Los hermanos vuelven a dormir: tres puertas, un solo apellido.',
  ],
  actor: [
    'El Actor cierra los ojos y el telón cae.',
    'El Actor saluda a un público dormido y cierra los ojos.',
    'Fin de la función: el Actor se retira a su camerino de sueños.',
  ],
  defensor: [
    'El Defensor vuelve a dormir, con el escudo junto a la cama.',
    'El Defensor cierra los ojos, con el oído puesto en la puerta que eligió.',
    'El Defensor vuelve a dormir: su guardia, sin embargo, continúa.',
  ],
  vidente: [
    'La Vidente cierra los ojos y su bola de cristal se apaga.',
    'La Vidente cubre su bola con un paño y vuelve a dormir, sabiendo más que ayer.',
    'La Vidente cierra los ojos; el cristal guarda el secreto hasta mañana.',
  ],
  zorro: [
    'El Zorro se enrosca y vuelve a dormir.',
    'El Zorro esconde el hocico bajo la cola y cierra los ojos.',
    'El Zorro vuelve a su madriguera con las respuestas que buscaba… o sin ellas.',
  ],
  cuervo: [
    'El Cuervo pliega las alas y cierra los ojos.',
    'El Cuervo regresa a su rama y esconde la cabeza bajo el ala.',
    'El Cuervo cierra los ojos; sus plumas ya están donde debían.',
  ],
  lobos_reconocen: [
    'La manada vuelve a cerrar los ojos… por ahora.',
    'La manada se ha visto las caras: vuelve a cerrar los ojos, y a esperar.',
    'Los lobos cierran los ojos de nuevo; ya saben con quién cazan.',
  ],
  lobos: [
    'Los hombres lobo vuelven a cerrar los ojos y se relamen en silencio.',
    'La manada cierra los ojos, con la elección hecha y el hambre en pausa.',
    'Los hombres lobo vuelven a dormir; el bosque guarda su secreto.',
    'La manada se retira sin ruido: los colmillos, hasta mañana.',
  ],
  infecto_decision: [
    'Los hombres lobo vuelven a cerrar los ojos y se relamen en silencio.',
    'La manada cierra los ojos, con la elección hecha y el hambre en pausa.',
    'Los hombres lobo vuelven a dormir; el bosque guarda su secreto.',
  ],
  lobo_feroz: [
    'El Gran Lobo Feroz vuelve a cerrar los ojos, saciado… ¿o no?',
    'El Gran Lobo Feroz se relame y cierra los ojos: por hoy, basta.',
    'El Gran Lobo Feroz vuelve a dormir, soñando con despensas ajenas.',
  ],
  lobo_albino: [
    'El Lobo Albino cierra los ojos, rumiando sus propios planes.',
    'El Lobo Albino vuelve a dormir, blanco por fuera, insondable por dentro.',
    'El Lobo Albino cierra los ojos; sus planes no necesitan luz.',
  ],
  bruja: [
    'La Bruja tapa su caldero y vuelve a dormir.',
    'La Bruja cierra la alacena, cuenta sus frascos y vuelve a dormir.',
    'La Bruja apaga el fuego del caldero y cierra los ojos.',
  ],
  gaitero: [
    'El Gaitero deja su instrumento y cierra los ojos.',
    'El Gaitero afloja el fuelle y se duerme con la última nota.',
    'El Gaitero cuelga la gaita del clavo y vuelve a dormir.',
  ],
  encantados: [
    'Los encantados vuelven a cerrar los ojos, con la melodía aún dando vueltas en su cabeza.',
    'Los encantados cierran los ojos; la música seguirá sonando en sus sueños.',
    'Los encantados vuelven a dormir, tarareando por dentro sin querer.',
  ],
  gitana: [
    'La Gitana apaga las velas y vuelve a dormir.',
    'La Gitana recoge sus cartas, sopla las velas y cierra los ojos.',
    'La Gitana despide a los espíritus con un gesto y vuelve a dormir.',
  ],
};

// Coletillas genéricas de despedida: combinadas con las bases dan 20-30
// despedidas distintas por rol (la vacía deja la base sola).
const OUTRO_TAILS = [
  '',
  'La noche sigue su curso.',
  'Que nadie se mueva todavía.',
  'La oscuridad vuelve a espesarse.',
  'El silencio recupera su trono.',
  'La luna sigue contando pasos.',
  'Castronegro sigue durmiendo… o eso parece.',
];

// Variante de despedida: estable por partida, noche y paso.
export function outro(stepId, salt = '') {
  const v = OUTROS[stepId];
  if (!v) return null;
  const rnd = seededRnd(hashStr('outro|' + stepId + '|' + salt));
  const base = typeof v === 'string' ? v : v[Math.floor(rnd() * v.length)];
  const tail = OUTRO_TAILS[Math.floor(rnd() * OUTRO_TAILS.length)];
  return tail ? `${base} ${tail}` : base;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Devuelve la variante de una locución, estable para una misma sal
// (p. ej. semilla+noche+paso) y distinta entre partidas y noches.
// Las locuciones compuestas combinan apertura × cuerpo × cierre: con ~17
// piezas escritas a mano salen 100-180 frases distintas por tipo.
// Generador determinista pequeño para decorrelacionar las elecciones de cada
// pieza (un hash directo por pieza produce índices que se mueven en bloque).
function seededRnd(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function narr(key, salt = '') {
  const c = COMPO[key];
  if (c) {
    const rnd = seededRnd(hashStr(key + '|' + salt));
    return c.map((parts) => parts[Math.floor(rnd() * parts.length)]).join(' ');
  }
  const v = NARRATION[key];
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[hashStr(key + '|' + salt) % v.length];
}

export function deathLine(name, roleName, salt = '') {
  const tpl = DEATH_LINES[hashStr('death|' + salt + name) % DEATH_LINES.length];
  return tpl.replace('{name}', name).replace('{role}', roleName ? ` Era ${roleName}.` : '');
}

// Muerte en cadena de los enamorados: al caer {a}, su pareja {b} muere de amor.
// Se anuncia siempre (la muerte es visible), pase lo que pase con revelar roles.
const LOVE_DEATH_LINES = [
  'Pero la horca se cobra dos vidas: {b}, unido a {a} por el flechazo de Cupido, no soporta perderle y cae muerto de amor a su lado.',
  'Y el amor es cruel: al ver caer a {a}, su pareja secreta {b} se derrumba sin vida, muerto de pena.',
  '{b}, enamorado en secreto de {a}, lanza un último suspiro y se apaga de amor junto a su cuerpo.',
  'Cupido cobra su precio: {b} no puede seguir viviendo sin {a} y muere de pena en el acto.',
  'La flecha de Cupido los unió en vida y en muerte: con {a} en la hoguera, {b} cae fulminado de amor.',
];
export function loveDeathLine(a, b, salt = '') {
  const tpl = LOVE_DEATH_LINES[hashStr('love|' + salt + b) % LOVE_DEATH_LINES.length];
  return ' ' + tpl.replace('{a}', a || 'su amor').replace('{b}', b);
}

let watchdog = null;
const VOICE_LS = 'hlc_voice_v3'; // v3: por defecto Studio (locutor); la latencia se cubre pre-generando
let voiceCfg = {
  engine: 'cloud', // 'cloud' (neuronal, muy humana) o 'device' (la del móvil)
  cloudVoice: 'es-ES-Studio-F', // voz «Studio» de Google: calidad de locutor profesional
  voiceURI: null, rate: 0.95, pitch: 0.9,
  ambience: true, // paisaje sonoro de fondo en el narrador
};
try { Object.assign(voiceCfg, JSON.parse(localStorage.getItem(VOICE_LS)) || {}); } catch { /* valores por defecto */ }

// Voz neuronal en la nube (Google TTS). La clave está restringida a esta API y al
// dominio del juego, y el audio se cachea en el dispositivo: cada frase fija se
// sintetiza (y factura) una sola vez por narrador. Las voces «Studio» son las de
// mayor calidad (locución profesional) pero lentas de sintetizar (~1,5 s); no
// pasa nada porque el conductor PRE-GENERA las locuciones de la noche mientras la
// gente mira su carta, así suenan al instante. Neural2 queda como opción ágil por
// si algún dispositivo no alcanza a pre-generar.
const TTS_KEY = (typeof window !== 'undefined' && window.TTS_KEY) || null;
export const CLOUD_VOICES = [
  { id: 'es-ES-Studio-F', label: '🎙️ Studio · masculina (locutor, recomendada)' },
  { id: 'es-ES-Studio-C', label: '🎙️ Studio · femenina (locutora)' },
  { id: 'es-ES-Chirp3-HD-Charon', label: '🎬 HD · masculina grave' },
  { id: 'es-ES-Chirp3-HD-Enceladus', label: '🎬 HD · masculina serena' },
  { id: 'es-ES-Chirp3-HD-Kore', label: '🎬 HD · femenina clara' },
  { id: 'es-ES-Chirp3-HD-Sulafat', label: '🎬 HD · femenina cálida' },
  { id: 'es-ES-Neural2-F', label: '⚡ Ágil · masculina (sin pre-generar)' },
  { id: 'es-ES-Neural2-A', label: '⚡ Ágil · femenina' },
];

const memCache = new Map(); // texto|voz → objectURL
let cloudQueue = [];
let cloudAudio = null;
let cloudBusy = false;

// iOS solo permite reproducir audio nacido de un gesto del usuario. Se
// desbloquea UNA VEZ un elemento (reproduciendo un wav silencioso dentro del
// gesto) y se reutiliza después para todas las frases: cambiar su src
// conserva el permiso. En escritorio no molesta.
let sharedAudio = null;
let audioUnlocked = false; // true cuando una reproducción ha SALIDO bien
let lastCloudError = null; // último fallo del circuito neuronal (diagnóstico)
export function getLastCloudError() { return lastCloudError; }

// Prueba integral del circuito neuronal: clave → síntesis → reproducción.
// Pensada para ejecutarse desde el modal de Voz y ver dónde rompe (iOS…).
export async function testCloudVoice() {
  const report = { key: !!TTS_KEY, engine: voiceCfg.engine, unlockedBefore: audioUnlocked };
  if (!TTS_KEY) { report.synth = 'sin clave TTS en este despliegue'; return report; }
  try {
    const url = await synthCloud('Prueba de voz neuronal completada. Castronegro te oye alto y claro.');
    report.synth = 'ok';
    try {
      if (!sharedAudio) sharedAudio = new Audio();
      sharedAudio.onended = null;
      sharedAudio.onerror = null;
      sharedAudio.src = url;
      await sharedAudio.play();
      audioUnlocked = true;
      report.play = 'ok';
    } catch (e) {
      report.play = `${(e && e.name) || 'Error'}: ${(e && e.message) || e}`;
      lastCloudError = `reproducción — ${report.play}`;
    }
  } catch (e) {
    report.synth = report.synth === 'ok' ? report.synth : `${(e && e.message) || e}`;
    if (lastCloudError) report.synthDetail = lastCloudError;
  }
  report.unlockedAfter = audioUnlocked;
  return report;
}
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';

export function unlockAudioPlayback() {
  try {
    if (!sharedAudio) sharedAudio = new Audio();
    // Se reintenta en cada gesto hasta que una reproducción silenciosa
    // funcione de verdad (iOS solo valida click/touchend, no pointerdown).
    if (!audioUnlocked && !cloudBusy) {
      sharedAudio.src = SILENT_WAV;
      sharedAudio.play().then(() => {
        audioUnlocked = true;
        try { sharedAudio.pause(); } catch { /* nada */ }
      }).catch(() => { /* gesto no válido aún: se reintentará */ });
    }
    if (typeof speechSynthesis !== 'undefined' && !speechSynthesis.speaking && !speechSynthesis.pending) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u); // desbloquea también la voz del dispositivo
    }
  } catch { /* sin audio disponible */ }
}

export function cloudAvailable() { return !!TTS_KEY; }

async function synthCloud(text, ssml) {
  const k = voiceCfg.cloudVoice + '|' + (ssml || text);
  if (memCache.has(k)) return memCache.get(k);
  const cacheUrl = 'https://tts.cache.local/' + voiceCfg.cloudVoice + '/' + encodeURIComponent(ssml || text).slice(0, 1500);
  let blob = null;
  let store = null;
  try {
    store = await caches.open('tts-v1');
    const hit = await store.match(cacheUrl);
    if (hit) blob = await hit.blob();
  } catch { store = null; /* Cache API no disponible (p. ej. navegación privada) */ }
  if (!blob) {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + TTS_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: ssml ? { ssml } : { text },
        voice: { languageCode: 'es-ES', name: voiceCfg.cloudVoice },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      lastCloudError = `síntesis ${res.status}: ${detail}`;
      console.warn('TTS neuronal falló:', res.status, detail);
      throw new Error('tts ' + res.status);
    }
    const data = await res.json();
    const bytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
    blob = new Blob([bytes], { type: 'audio/mpeg' });
    if (store) await store.put(cacheUrl, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })).catch(() => { /* caché llena */ });
  }
  const url = URL.createObjectURL(blob);
  memCache.set(k, url);
  return url;
}

function pumpCloud() {
  if (cloudBusy || !cloudQueue.length) return;
  const item = cloudQueue.shift();
  cloudBusy = true;
  const finish = () => {
    cloudBusy = false;
    if (item.onend) item.onend();
    pumpCloud();
  };
  synthCloud(item.text, item.ssml).then((url) => {
    // Reutiliza el elemento desbloqueado por gesto (imprescindible en iOS).
    cloudAudio = sharedAudio || new Audio();
    try { cloudAudio.preservesPitch = true; cloudAudio.webkitPreservesPitch = true; } catch { /* opcional */ }
    cloudAudio.playbackRate = voiceCfg.rate || 1;
    cloudAudio.onended = finish;
    cloudAudio.onerror = finish;
    cloudAudio.src = url;
    cloudAudio.play().then(() => { audioUnlocked = true; if (item.onstart) item.onstart(); }).catch((e) => {
      lastCloudError = `reproducción — ${(e && e.name) || 'Error'}: ${(e && e.message) || e}`;
      cloudAudio.onended = null;
      cloudAudio.onerror = null;
      speakDevice(item.text, { onstart: item.onstart });
      finish();
    });
    // Adelanta la síntesis del siguiente en cola mientras suena el actual: cuando
    // termine, ya estará en caché y sonará sin espera (locuciones encadenadas).
    if (cloudQueue.length) { const nx = cloudQueue[0]; synthCloud(nx.text, nx.ssml).catch(() => { /* se reintenta al tocar */ }); }
  }).catch(() => {
    // Sin red o sin cuota: cae a la voz del dispositivo y la cola sigue.
    speakDevice(item.text, { onstart: item.onstart });
    finish();
  });
}

// Pre-generación: sintetiza en segundo plano (puebla la caché) SIN reproducir,
// para adelantar las locuciones previsibles de la noche. Cuando el conductor las
// pida, ya estarán en caché y sonarán al instante, aunque la voz sea de las
// lentas (Studio). Cola con poca concurrencia para no competir con lo que suena.
let prewarmQueue = [];
let prewarmActive = 0;
export function prewarm(text, ssml) {
  if (!text || voiceCfg.engine !== 'cloud' || !TTS_KEY) return;
  const k = voiceCfg.cloudVoice + '|' + (ssml || text);
  if (memCache.has(k)) return; // ya sintetizada
  if (prewarmQueue.some((q) => (q.ssml || q.text) === (ssml || text))) return; // ya en cola
  prewarmQueue.push({ text, ssml });
  pumpPrewarm();
}
function pumpPrewarm() {
  while (prewarmActive < 3 && prewarmQueue.length) {
    const it = prewarmQueue.shift();
    prewarmActive++;
    synthCloud(it.text, it.ssml).catch(() => { /* se sintetizará al pedirla */ })
      .finally(() => { prewarmActive--; pumpPrewarm(); });
  }
}

// ¿Está sonando (o pendiente) la narración? Para atenuar el ambiente y para
// que las transiciones del juego esperen a que la voz termine.
export function isNarratorSpeaking() {
  if (cloudBusy || cloudQueue.length > 0) return true;
  try {
    return typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending);
  } catch { return false; }
}

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
// priority 'low' (murmullos, recordatorios): si la voz está ocupada, se omite.
// onend se llama también si la síntesis no está disponible.
export function speak(text, opts = {}) {
  const { muted = false, onend = null, priority = 'normal', ssml = null, onstart = null, chain = false } = opts;
  if (muted || !text) {
    if (onstart) onstart();
    if (onend) setTimeout(onend, 800);
    return;
  }
  if (voiceCfg.engine === 'cloud' && TTS_KEY) {
    if (priority === 'low' && (cloudBusy || cloudQueue.length)) {
      if (onend) setTimeout(onend, 400);
      return;
    }
    // Descarta lo atrasado en cola, salvo cuando encadenamos a propósito varios
    // segmentos de una misma locución larga (p. ej. la explicación).
    if (!chain && cloudBusy && cloudQueue.length) cloudQueue = [];
    cloudQueue.push({ text, ssml, onstart, onend });
    pumpCloud();
    return;
  }
  speakDevice(text, opts); // la voz del dispositivo no entiende SSML: texto plano
}

function speakDevice(text, { muted = false, onend = null, priority = 'normal', onstart = null } = {}) {
  if (muted || typeof speechSynthesis === 'undefined' || !text) {
    if (onstart) onstart();
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
    let started = false;
    const start = () => { if (!started) { started = true; if (onstart) onstart(); } };
    const finish = () => { if (!done) { done = true; if (onend) onend(); } };
    u.onstart = start;
    u.onend = finish;
    u.onerror = finish;
    // Cinturón de seguridad: algunos navegadores no disparan onend.
    setTimeout(finish, Math.max(4000, text.length * 110));
    speechSynthesis.speak(u);
    setTimeout(start, 300); // por si el navegador no dispara onstart
  } catch {
    if (onstart) onstart();
    if (onend) setTimeout(onend, 800);
  }
}

export function stopSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  cloudQueue = [];
  cloudBusy = false;
  if (cloudAudio) {
    try { cloudAudio.onended = null; cloudAudio.onerror = null; cloudAudio.pause(); } catch { /* nada */ }
    cloudAudio = null; // el elemento compartido sigue desbloqueado para la próxima
  }
}
