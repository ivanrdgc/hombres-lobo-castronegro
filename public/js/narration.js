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
    'Castronegro, año del Señor de mil y pico. La cosecha fue buena; la vecindad, ya veremos. Cada cual tiene su papel esperando en el dispositivo: miradlo a escondidas y confirmad cuando lo sepáis de memoria.',
    'Abrid bien los oídos, vecinos: el pergamino del destino ya está repartido. Quien enseñe su carta, que no llore luego. Miradla en secreto y confirmad cuando estéis listos.',
    'Hay pueblos con mala fama y luego está Castronegro. Aun así, le tenemos cariño. Vuestra suerte espera en el dispositivo: leedla en secreto, memorizadla… y confirmad.',
    'La diligencia os deja en la plaza y arranca a toda prisa: el cochero sabe algo que vosotros no. Vuestro destino aguarda en el dispositivo. En secreto: miradlo y confirmad.',
  ],
  noche_cae: [
    'Cae la noche sobre Castronegro. El pueblo entero cierra los ojos y solo la luna vigila. Que nadie hable hasta el amanecer.',
    'El sol se esconde tras las colinas y Castronegro queda a merced de la oscuridad. Silencio absoluto: la noche tiene oídos.',
    'La luna se alza sobre los tejados y las velas se apagan una a una. Castronegro duerme… o finge dormir.',
    'Un aullido lejano anuncia la llegada de la noche. Cerrad las puertas, apagad las luces… y que la suerte os acompañe.',
    'Se apaga el último farol y el sereno se mete en casa a toda prisa. Ojos cerrados, Castronegro: la noche no perdona a los curiosos.',
    'El cielo se pone del color del carbón y el bosque contiene la respiración. Dormid, vecinos… los que podáis.',
    'Noche cerrada en Castronegro. La luna pasa lista y prefiere no contar cuántos faltaréis mañana. Cerrad los ojos.',
    'Las estrellas se asoman con miedo y hasta el gato del tabernero busca refugio. Ojos cerrados todo el mundo: empieza la función.',
    'El reloj de la iglesia da las doce y nadie recuerda haberle dado cuerda. Mala señal. Cerrad los ojos, Castronegro.',
  ],
  ladron: [
    'Ladrón, despierta. Observa las dos cartas del centro de la mesa y decide si cambias tu destino.',
    'Ladrón, es tu momento: dos destinos ajenos te esperan sobre la mesa. ¿Robarás uno… o te quedarás como estás?',
    'Ladrón, despierta sin hacer ruido. La noche te ofrece dos vidas ajenas: elige si alguna te conviene más que la tuya.',
    'Ladrón, abre los ojos: hasta el destino se puede robar si se tiene maña. Dos cartas esperan… decide.',
    'Ladrón, dicen que lo tuyo no es robar, sino tomar prestado para siempre. Sobre la mesa hay dos vidas: ¿alguna te queda a medida?',
    'Ladrón, despierta. El oficio más viejo de Castronegro te llama: mira las dos cartas del centro y elige tu conciencia de esta noche.',
  ],
  cupido: [
    'Cupido, despierta. Tensa tu arco y une para siempre los corazones de dos habitantes del pueblo.',
    'Cupido, abre los ojos: tus flechas no entienden de bandos ni de prudencia. Elige a dos corazones y únelos para siempre.',
    'Cupido, la noche es joven y el amor, ciego. Apunta bien: esos dos corazones latirán juntos… o dejarán de latir juntos.',
    'Cupido, despierta: en Castronegro hasta el amor es cosa seria. Dispara tus dos flechas y que sea lo que la luna quiera.',
    'Cupido, saca tu arco: dos vecinos van a quererse sin remedio. Tú decides quiénes… ellos ya no podrán decidir nada.',
    'Cupido, el frío de la noche pide corazones calientes. Une dos para siempre… y reza por que sean del mismo bando.',
  ],
  enamorados: [
    'Enamorados, abrid los ojos y reconoceos. Vuestros destinos están unidos: si uno muere, el otro morirá de pena.',
    'Dos corazones han quedado unidos por una flecha. Enamorados, reconoceos: desde hoy compartís la vida… y la muerte.',
    'La flecha de Cupido ha encontrado dos pechos. Enamorados, miraos en silencio: vuestra suerte ya es una sola.',
    'El amor ha entrado en Castronegro sin llamar a la puerta. Enamorados, reconoceos: donde vaya uno, irá el otro… hasta el final.',
  ],
  nino_salvaje: [
    'Niño Salvaje, despierta. Elige en silencio a tu modelo a seguir. Si algún día muere, la bestia despertará en ti.',
    'Niño Salvaje, abre los ojos y busca a quien admirar. Rézale a la luna para que viva mucho… o la bestia que llevas dentro despertará.',
    'Niño Salvaje, la noche te pregunta: ¿a quién querrás parecerte? Elige con cuidado: su muerte sería tu transformación.',
    'Niño Salvaje, criado entre zarzas y aullidos: elige un espejo humano en quien mirarte. Si ese espejo se rompe, saldrá el lobo.',
    'Niño Salvaje, despierta. Todo cachorro necesita alguien a quien imitar. Elígelo bien: de su vida cuelga tu piel humana.',
  ],
  perro_lobo: [
    'Perro Lobo, despierta. Esta noche eliges tu destino: la lealtad del pueblo o la llamada salvaje de la manada.',
    'Perro Lobo, dos sangres corren por tus venas y esta noche debes elegir una: ¿el calor del hogar o el aullido del bosque?',
    'Perro Lobo, la luna te llama y el pueblo te necesita. Decide de una vez por todas quién eres.',
    'Perro Lobo, despierta: ni el collar te queda bien ni el bosque te acaba de aceptar. Esta noche, por fin, eliges bando.',
    'Perro Lobo, mitad ladrido, mitad aullido. Castronegro quiere saber cuál de las dos mitades manda. Decide.',
  ],
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
  actor: [
    'Actor, despierta. Elige qué papel interpretarás esta noche y actúa en consecuencia.',
    'Actor, se abre el telón: tres papeles esperan sobre el escenario de la noche. Elige el tuyo e interprétalo con maestría.',
    'Actor, la función va a comenzar. ¿Qué máscara vestirás esta noche?',
    'Actor, despierta: Castronegro es tu escenario y la luna, tu candileja. Elige papel y no te salgas del guion.',
    'Actor, el público duerme, que es como mejor se actúa. Escoge tu personaje de esta noche.',
    'Actor, tres disfraces cuelgan del perchero de la noche. Ponte uno… y que la crítica te sea leve.',
  ],
  defensor: [
    'Defensor, despierta. Alza tu escudo y elige a quién protegerás esta noche del ataque de las bestias.',
    'Defensor, la noche está llena de colmillos. Elige una puerta ante la que montar guardia hasta el alba.',
    'Defensor, tu escudo aún guarda las marcas de otras noches. ¿A quién protegerás de la manada esta vez?',
    'Defensor, despierta: en Castronegro las murallas las ponen los valientes. ¿Ante qué casa clavarás tu escudo?',
    'Defensor, elige bien tu guardia: los colmillos no avisan y tu escudo no puede estar en dos puertas.',
    'Defensor, la noche silba entre las rendijas. Escoge a quién arropar con tu acero hasta que cante el gallo.',
  ],
  vidente: [
    'Vidente, despierta. Consulta tu bola de cristal y descubre el verdadero rostro de un habitante del pueblo.',
    'Vidente, las estrellas están de tu lado esta noche. Elige un rostro y la verdad se te revelará.',
    'Vidente, tu bola de cristal brilla en la oscuridad. ¿Qué secreto quieres arrancarle a la noche?',
    'Vidente, despierta: la niebla de tu bola se abre solo para ti. Pregunta un nombre y ella dirá lo que esconde.',
    'Vidente, el cristal está tibio y las cartas calladas: buena noche para la verdad. ¿A quién quieres ver por dentro?',
    'Vidente, abre los ojos: en este pueblo todos mienten, pero a tu bola nadie sabe mentirle. Elige a quién mirar.',
  ],
  zorro: [
    'Zorro, despierta. Olfatea con astucia y descubre si la bestia se esconde en el vecindario.',
    'Zorro, la brisa nocturna trae olores interesantes. Elige un rincón del pueblo y husmea en busca de la bestia.',
    'Zorro, afina tu hocico: en algún vecindario puede esconderse el lobo. ¿Dónde olfatearás esta noche?',
    'Zorro, despierta: a ti no se te escapa ni el tufillo de una mentira. Elige tres casas seguidas y husmea.',
    'Zorro, la noche huele a leña, a pan dormido… ¿y a lobo? Eso dímelo tú. Elige dónde meter el hocico.',
  ],
  cuervo: [
    'Cuervo, despierta. Sobrevuela el pueblo y señala con tus plumas negras a quien consideres sospechoso.',
    'Cuervo, despliega tus alas sobre Castronegro. ¿Sobre qué tejado dejarás caer tu sombra de sospecha?',
    'Cuervo, la noche es tuya. Grazna sobre la casa de quien no te inspire confianza: mañana todos lo sabrán.',
    'Cuervo, despierta: tus plumas pesan dos votos y tú lo sabes. ¿Sobre qué conciencia las dejarás caer?',
    'Cuervo, el viento te presta sus alas. Elige un tejado: mañana amanecerá más negro que los demás.',
  ],
  lobos_reconocen: [
    'Hombres lobo, ha llegado vuestro momento. Todo el pueblo duerme con los ojos bien cerrados. Lobos, abrid los ojos en silencio y reconoced a vuestra manada. Cuando os hayáis reconocido, confirmadlo en vuestro dispositivo.',
    'Llega la hora de la manada. Aldeanos, ojos cerrados: quien mire, que se atenga a las consecuencias. Lobos, abrid los ojos, reconoced a vuestros hermanos de caza… y confirmadlo en vuestro dispositivo.',
    'Esta noche no hay caza, pero sí presentaciones. Lobos, abrid los ojos sin ruido, miraos bien: esta es vuestra manada. Confirmadlo en el dispositivo cuando os tengáis vistos.',
    'El bosque quiere saber cuántos sois. Lobos, abrid los ojos con sigilo y reconoceos: mañana empezará lo serio. Confirmadlo en vuestro dispositivo.',
  ],
  lobos_noche1: [
    'Hombres lobo, ha llegado vuestro momento. Todo el pueblo duerme con los ojos bien cerrados. Abrid los ojos en silencio, miraos, reconoced a vuestra manada… y elegid juntos a vuestra primera presa.',
    'Llega la hora de la manada. Aldeanos, ojos cerrados: quien mire, que se atenga a las consecuencias. Lobos, abrid los ojos, reconoced a vuestros hermanos de caza… y señalad en silencio a vuestra primera víctima.',
    'Primera noche de luna en Castronegro. Lobos, abrid los ojos sin ruido: miraos, contaos, reconoceos… y estrenad la temporada eligiendo cena.',
    'El pueblo duerme y no sabe lo que ha sembrado. Lobos, abrid los ojos: saludad a vuestra manada con la mirada… y decidid juntos quién no verá el alba.',
    'Silencio: es la hora de los colmillos. Lobos, abrid los ojos, reconoced a los vuestros… y que vuestra primera elección sea digna de leyenda.',
  ],
  lobos: [
    'Hombres lobo, despertad. Elegid en silencio a vuestra próxima víctima.',
    'La manada sale de caza. Hombres lobo, elegid en silencio: ¿qué puerta derribaréis esta noche?',
    'Hombres lobo, el hambre aprieta y la luna está alta. Señalad a vuestra presa.',
    'Se oyen pisadas suaves sobre los tejados… Hombres lobo, elegid a vuestra víctima con cuidado: el pueblo empieza a sospechar.',
    'Hombres lobo, abrid los ojos: la despensa de Castronegro vuelve a estar abierta. Elegid plato… con educación y en silencio.',
    'La luna pone la mesa y vosotros ponéis los dientes. Manada, elegid a vuestra víctima.',
    'Hombres lobo, despertad: el pueblo ha cerrado las puertas, pero olvidó cerrar los sueños. Escoged por dónde entrar.',
    'Aúlla el viento para disimular vuestros pasos. Manada, abrid los ojos y firmad la noche con un nombre.',
    'Hombres lobo, la caza es un arte y vosotros, artistas con colmillos. Elegid vuestra obra de esta noche.',
  ],
  encantados: [
    'La melodía del Gaitero flota sobre los tejados de Castronegro.',
    'Una música dulce y extraña se cuela por las rendijas de las ventanas…',
    'El Gaitero toca su melodía y las notas reptan por las calles dormidas…',
    'Suena una gaita a lo lejos, tan dulce que hasta la niebla se para a escuchar…',
    'Las notas del Gaitero gotean de tejado en tejado, buscando oídos nuevos…',
    'Una melodía vieja como el bosque se enrosca en las chimeneas de Castronegro…',
  ],
  lobo_feroz: [
    'Gran Lobo Feroz, tu hambre no conoce límites. Elige una segunda víctima para esta noche.',
    'Gran Lobo Feroz, una presa no basta para saciarte. La noche te concede un segundo bocado: elige.',
    'Gran Lobo Feroz, despierta otra vez: tu estómago es leyenda en tres condados. ¿Quién será el segundo plato?',
    'Gran Lobo Feroz, la manada ya cenó… pero tú nunca repites plato: lo doblas. Elige a tu segunda víctima.',
    'Gran Lobo Feroz, dicen que sopló y derribó una casa. Esta noche te basta con elegir otra puerta. Hazlo.',
  ],
  lobo_albino: [
    'Hombre Lobo Albino, despierta. Esta noche puedes traicionar a tu propia manada, si así lo deseas.',
    'Hombre Lobo Albino, la luna llena ilumina tu pelaje. ¿Morderás esta noche la mano de tu propia manada?',
    'Hombre Lobo Albino, blanco como la nieve y frío como ella. ¿Caerá esta noche un hermano de camada?',
    'Hombre Lobo Albino, despierta: tú no cazas para la manada… cazas para quedarte solo. ¿Empiezas esta noche?',
    'Hombre Lobo Albino, la luna te confunde con su reflejo. Aprovecha el disfraz: ¿traición… o paciencia?',
  ],
  bruja: [
    'Bruja, despierta. Contempla la víctima de los lobos. ¿Usarás tu poción de vida? ¿O quizás la de muerte?',
    'Bruja, tu caldero burbujea. La noche te muestra su obra: decide si la deshaces con una poción… o si añades una víctima más.',
    'Bruja, los frascos tintinean en tu alacena. ¿Vida? ¿Muerte? ¿O dejarás que la noche siga su curso?',
    'Bruja, despierta: la noche te enseña sus cartas y tú guardas dos ases embotellados. ¿Juegas alguno?',
    'Bruja, huele a azufre y a decisiones difíciles. Mira lo que han hecho los lobos… y di si lo arreglas, lo empeoras o lo dejas estar.',
    'Bruja, tu gato bosteza y el caldero pregunta. ¿Devuelves un alma, te llevas otra… o cierras la alacena?',
    'Bruja, despierta: en tus manos caben un amanecer más y un funeral más. Administra.',
  ],
  gaitero: [
    'Gaitero, despierta. Que suene tu melodía hipnótica y encanta a dos nuevos habitantes.',
    'Gaitero, afina tu instrumento: dos nuevas almas caerán esta noche bajo el hechizo de tu música.',
    'Gaitero, despierta: tu música no mata, pero tampoco suelta. Elige dos oídos nuevos.',
    'Gaitero, infla el fuelle: Castronegro baila dormido y tú llevas el compás. Dos más esta noche.',
    'Gaitero, tu melodía teje su red nota a nota. Elige qué dos vecinos quedarán prendidos en ella.',
    'Gaitero, despierta: donde no llegan los colmillos llega tu música. Encanta a dos almas más.',
  ],
  gitana: [
    'Gitana, despierta. Los espíritus aguardan tu pregunta desde el más allá.',
    'Gitana, el velo entre los mundos es fino esta noche. Formula tu pregunta: los muertos escuchan.',
    'Gitana, despierta: los espíritus están de tertulia y admiten una pregunta. Elígela con astucia.',
    'Gitana, enciende tus velas: el más allá tiene línea directa esta noche. ¿Qué quieres saber?',
    'Gitana, los muertos se aburren y a los aburridos se les escapa la verdad. Pregunta.',
  ],
  amanecer_sin_muertes: [
    'Amanece en Castronegro. Milagrosamente, esta noche nadie ha perdido la vida. El pueblo respira aliviado… por ahora.',
    'El gallo canta y, contra todo pronóstico, todas las camas amanecen ocupadas. Nadie ha muerto esta noche… ¿brujería?',
    'Amanece y el recuento es rápido: ni un rasguño. El pueblo respira, pero nadie baja la guardia.',
    'Sale el sol y, por una vez, el enterrador desayuna tranquilo: no hay trabajo. Nadie ha muerto esta noche.',
    'Amanece con niebla y buenas noticias, que en Castronegro es casi lo mismo que un milagro: todos siguen vivos.',
    'El gallo canta con ganas, como si lo supiera: esta noche la muerte pasó de largo. Todos en pie… todos.',
    'Amanece. Las puertas se abren una a una… y una a una responden. Ni una silla vacía: la noche fue clemente.',
    'Hoy el sol madruga y la muerte se ha dormido: no falta nadie en Castronegro. Aprovechad el respiro.',
  ],
  amanecer_con_muertes: [
    'Amanece en Castronegro y el pueblo se reúne en la plaza. La noche ha dejado su huella…',
    'El sol se alza sobre Castronegro, pero no calienta a todos por igual. La noche ha pasado factura…',
    'Las campanas tocan a difuntos esta mañana. El pueblo se congrega en la plaza con el corazón encogido…',
    'Amanece con el cielo del color de la ceniza. En la plaza, un corrillo y un silencio: la noche se ha cobrado su parte…',
    'El gallo canta a media voz, como pidiendo perdón. Castronegro despierta… no todos con él.',
    'Sale el sol y encuentra las contraventanas abiertas y los rostros pálidos. Hay noticias, y no son buenas…',
    'Amanece. El panadero no silba, el herrero no golpea, y eso en Castronegro solo significa una cosa…',
    'La escarcha de esta mañana no es lo más frío de la plaza. Reuníos, vecinos: la noche ha hablado…',
  ],
  dia_debate: [
    'Es la hora del juicio. Debatid, acusad y defendeos. Cuando el pueblo haya decidido, que cualquiera registre la decisión final en su dispositivo.',
    'La plaza hierve de acusaciones. Hablad, señalad, defendeos… y cuando la decisión esté tomada, que alguien la registre en su dispositivo.',
    'Castronegro exige un culpable. Debatid con la cabeza fría y el corazón caliente; la decisión final se registra en el dispositivo.',
    'Se abre la sesión en la plaza: se admiten pruebas, corazonadas y rencores mal disimulados. Al acabar, registrad la decisión en el dispositivo.',
    'El pueblo quiere justicia y, si no la encuentra, se conforma con un culpable. Debatid… y registrad después la decisión en el dispositivo.',
    'Hablad ahora o aullad para siempre. Acusaciones al centro de la plaza; la decisión final, al dispositivo.',
    'Hoy se juzga con la lengua lo que anoche se hizo con los dientes. Debatid, decidid… y que alguien lo registre en su dispositivo.',
    'La horca tiene hambre y el pueblo tiene sospechas: mal día para los tímidos. Debatid y registrad la decisión en el dispositivo.',
  ],
  dia_debate_tranquilo: [
    'Nadie ha muerto esta noche, pero la amenaza sigue entre vosotros. Debatid con calma: ¿quién se esconde tras una sonrisa? La decisión se registra en el dispositivo.',
    'La noche fue tranquila… demasiado tranquila. Hablad, sospechad, y cuando el pueblo decida —condena o clemencia—, que alguien lo registre en su dispositivo.',
    'Sin sangre al amanecer, pero los lobos siguen ahí fuera… o aquí dentro. Debatid; la decisión final se registra en el dispositivo.',
    'Ningún muerto que llorar, pero la desconfianza no descansa. Hablad claro: ¿quién sonríe demasiado esta mañana? Registrad luego la decisión.',
    'La calma también es sospechosa en Castronegro. Debatid sin prisa… y decidid si hoy la horca ayuna. La decisión, al dispositivo.',
    'Noche sin dientes, día con lenguas. Aprovechadlas bien, y que alguien registre lo que el pueblo decida.',
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
  fin_partida: [
    'La historia de Castronegro llega a su fin.',
    'Y así termina esta historia de lobos, secretos y vecinos demasiado confiados.',
    'El telón cae sobre Castronegro. Recordad: en este pueblo, nadie es quien dice ser.',
    'Se cierra el libro de Castronegro… hasta que alguien vuelva a abrirlo. Los pueblos malditos siempre encuentran lectores.',
    'Fin de la historia. La niebla se retira, los secretos salen al sol… y el pueblo jura que esto no volverá a pasar. Mentira.',
    'Y colorín, colorado… en Castronegro nadie ha quedado como esperaba. La luna apaga su farol: se acabó.',
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

// Variante de despedida: estable por partida, noche y paso.
export function outro(stepId, salt = '') {
  const v = OUTROS[stepId];
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v[hashStr('outro|' + stepId + '|' + salt) % v.length];
}

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
let voiceCfg = {
  engine: 'cloud', // 'cloud' (neuronal, muy humana) o 'device' (la del móvil)
  cloudVoice: 'es-ES-Chirp3-HD-Charon',
  voiceURI: null, rate: 0.95, pitch: 0.9,
  ambience: true, // paisaje sonoro de fondo en el narrador
};
try { Object.assign(voiceCfg, JSON.parse(localStorage.getItem(VOICE_LS)) || {}); } catch { /* valores por defecto */ }

// Voz neuronal en la nube (Google TTS, Chirp3-HD). La clave está restringida a
// esta API y al dominio del juego, y el audio se cachea en el dispositivo:
// cada frase fija se sintetiza (y factura) una sola vez por narrador.
const TTS_KEY = (typeof window !== 'undefined' && window.TTS_KEY) || null;
export const CLOUD_VOICES = [
  { id: 'es-ES-Chirp3-HD-Charon', label: 'Charon — masculina grave' },
  { id: 'es-ES-Chirp3-HD-Enceladus', label: 'Enceladus — masculina serena' },
  { id: 'es-ES-Chirp3-HD-Algieba', label: 'Algieba — masculina cálida' },
  { id: 'es-ES-Chirp3-HD-Kore', label: 'Kore — femenina clara' },
  { id: 'es-ES-Chirp3-HD-Gacrux', label: 'Gacrux — femenina madura' },
  { id: 'es-ES-Chirp3-HD-Sulafat', label: 'Sulafat — femenina cálida' },
];

const memCache = new Map(); // texto|voz → objectURL
let cloudQueue = [];
let cloudAudio = null;
let cloudBusy = false;

export function cloudAvailable() { return !!TTS_KEY; }

async function synthCloud(text) {
  const k = voiceCfg.cloudVoice + '|' + text;
  if (memCache.has(k)) return memCache.get(k);
  const cacheUrl = 'https://tts.cache.local/' + voiceCfg.cloudVoice + '/' + encodeURIComponent(text).slice(0, 1500);
  let blob = null;
  try {
    const store = await caches.open('tts-v1');
    const hit = await store.match(cacheUrl);
    if (hit) blob = await hit.blob();
    if (!blob) {
      const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + TTS_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'es-ES', name: voiceCfg.cloudVoice },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });
      if (!res.ok) throw new Error('tts ' + res.status);
      const data = await res.json();
      const bytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
      blob = new Blob([bytes], { type: 'audio/mpeg' });
      await store.put(cacheUrl, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
    }
  } catch (e) {
    if (!blob) throw e;
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
  synthCloud(item.text).then((url) => {
    cloudAudio = new Audio(url);
    try { cloudAudio.preservesPitch = true; } catch { /* opcional */ }
    cloudAudio.playbackRate = voiceCfg.rate || 1;
    cloudAudio.onended = finish;
    cloudAudio.onerror = finish;
    cloudAudio.play().catch(() => { speakDevice(item.text, {}); finish(); });
  }).catch(() => {
    // Sin red o sin cuota: cae a la voz del dispositivo y la cola sigue.
    speakDevice(item.text, {});
    finish();
  });
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
  const { muted = false, onend = null, priority = 'normal' } = opts;
  if (muted || !text) {
    if (onend) setTimeout(onend, 800);
    return;
  }
  if (voiceCfg.engine === 'cloud' && TTS_KEY) {
    if (priority === 'low' && (cloudBusy || cloudQueue.length)) {
      if (onend) setTimeout(onend, 400);
      return;
    }
    if (cloudBusy && cloudQueue.length) cloudQueue = []; // suelta el backlog atrasado
    cloudQueue.push({ text, onend });
    pumpCloud();
    return;
  }
  speakDevice(text, opts);
}

function speakDevice(text, { muted = false, onend = null, priority = 'normal' } = {}) {
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
  cloudQueue = [];
  cloudBusy = false;
  if (cloudAudio) { try { cloudAudio.pause(); } catch { /* nada */ } cloudAudio = null; }
}
