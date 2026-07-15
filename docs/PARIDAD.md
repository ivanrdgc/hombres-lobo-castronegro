# Paridad v1 → v2 — inventario de funcionalidades visibles

Inventario exhaustivo elaborado leyendo TODA la v1 (ui.js/main.js/conductor.js/…) antes de la
reescritura. Cada elemento debe existir en la v2. Verificación: **[e2e]** cubierto por los tests
Playwright, **[test]** cubierto por tests unitarios/simulador, **[manual]** requiere comprobación
manual (móvil real), **[voz]** requiere oído.

## Entrada / mesa
- [x] Portada «Juegos digitales» con nombre + nombre de mesa aleatorio (🎲 re-roll) [e2e]
- [x] Crear mesa → `/g/<slug>`; nombre duplicado → modal «ya existe» (entrar / otro nombre) [e2e]
- [x] Unirse por URL (input + lista de jugadores); nombre duplicado → modal takeover [e2e]
- [x] «Sesión ya no válida» tras takeover/expulsión [e2e]
- [x] Pantalla bloqueada con partida en curso + Reintentar + reconectar por nombre [e2e]
- [x] Redirección silenciosa de URLs antiguas `/hombres_lobo/...` [test: parseRoute port]
- [x] Grupo eliminado → aviso y limpieza de sesión [e2e]

## Gestión de la mesa
- [x] Tarjeta de invitación con URL copiable + «✔️ Enlace copiado» [e2e]
- [x] Dispositivos: contador, «M jugarán», orden horario, badges 📺/🔊/Tú [e2e]
- [x] Arrastre ⠿ para ordenar (táctil y ratón, varias columnas) [e2e-seating + manual móvil]
- [x] Flechas ↑↓ en el sub-modal de asientos; orden recordado entre partidas [e2e-seating]
- [x] Menú de jugador: jugador/pantalla, narrador (recordado), expulsar [e2e]
- [x] Catálogo de juegos (1) + «Jugar a esto» + cambiar de juego [e2e]
- [x] Eliminar mesa (libera el nombre) / salir del grupo (promociona máster; borra si queda vacío) [e2e]

## Lobby / configuración
- [x] Modal de explicación (intro + cómo se juega + roles activos + resumen de ajustes) [e2e]
- [x] Lectura en voz alta local (spinner → detener) y en el narrador [manual+voz]
- [x] Modal de roles por expansiones; lobos Auto/± (1–4); aldeanos Auto/±; alguacil; mínimos por rol; restaurar [e2e]
- [x] Ajustes: revealDead, showComposition, primeraNocheTranquila, videnteSoloBando, ocultarCausas, casual + restaurar [e2e]
- [x] NUEVO v2: perfil de ritmo del narrador (rápido/normal/teatral) en Ajustes [manual]
- [x] Mínimo oficial de 8 (casual → 3) [e2e]
- [x] Resumen vivo de lobos/aldeanos/roles en el lobby [e2e]

## Inicio / modos
- [x] Modal de inicio; confirmación de asientos si hay roles de vecindad [e2e-seating]
- [x] Auto: elegir dispositivo narrador (jugador o tele/altavoz) [e2e]
- [x] Guiado / Manual (este dispositivo narra, no juega) [e2e2 / e2e-guiado]

## Reparto (reveal)
- [x] Bienvenida narrada; carta oculta hasta «Ver mi rol»; confirmar; lista de pendientes; «Empezar la noche» [e2e]
- [x] Carta con equipo, descripción y extras privados (palabra clave, visiones, manada, hermanas/os, secta, amor, encantado, modelo, pociones, alguacil, tonto, poderes perdidos) [e2e + manual]

## Noche (los 23 pasos + disimulo)
- [x] Orden de pasos y filtros primera-noche/pares [test: computeNightSteps]
- [x] Ladrón (cartas del centro, cambio forzoso si dos lobos) [e2e2]
- [x] Cupido + enamorados por palabra clave + renovación de palabra [e2e2 + test]
- [x] Niño Salvaje, Perro Lobo, Dos Hermanas, Tres Hermanos [test + e2e2]
- [x] Actor (3 poderes, resultado de vidente con confirmación) [test]
- [x] Defensor (sin repetir), Vidente (rol o solo bando + «lo he visto») [e2e]
- [x] Zorro (trío con vecinos vivos), Cuervo (+2 votos) [test]
- [x] Lobos: reconocimiento (noche tranquila) o caza directa; presa propia; «nadie» [e2e + test]
- [x] Infecto (silencioso), Gran Lobo Feroz, Lobo Albino (noches pares) [test]
- [x] Bruja (curar interruptor + envenenar), Gaitero + encantados por palabra clave [e2e + test]
- [x] Gitana (pregunta propia o sugerida; coro de muertos al alba) [test]
- [x] Roles vivos sin poder SIEMPRE despiertan (panel de disimulo) [test]
- [x] Turnos fantasma indistinguibles (tiempos y audio) — [test simulador: líneas temporales IDÉNTICAS]
- [x] Llamadas falsas con señuelos; v2 unifica las piezas de las llamadas reales y falsas [test]
- [x] Panel neutral «atención al narrador» para no-actores [e2e]
- [x] Repaso de roles (atasco ~2 min → todos revisan carta y palabra) [test simulador + manual]

## Día
- [x] Debate (con/sin muertes), votación primero-gana, perdonar, empate [e2e]
- [x] Muertos y tonto revelado no votan; voto restringido del Cabeza [test]
- [x] Juez (segunda votación), Cazador (disparo), Sirvienta (25 s con cuenta atrás), Alguacil (elección/sucesión), Cabeza de Turco [test + e2e2]
- [x] Revelación del linchado + muerte por amor anunciada [test]
- [x] «Empezar la noche» manual [e2e]

## Fin
- [x] Banner con los 8 desenlaces; parrilla de roles; volver al lobby [e2e]

## Transversales en partida
- [x] Barra del máster: Voz / Cartas / Repetir / Fin (auto); Cartas (guiado/manual) [e2e]
- [x] Modal fin de partida con desenlaces relevantes o cálculo automático [e2e2]
- [x] Chuleta de cartas (composición pública o roles activados) [e2e]
- [x] Pausa/reanudar global con nombre de quien pausó [e2e]
- [x] Repetir última locución [manual+voz]
- [x] Vista de muertos (dead-peek) [e2e-deadpeek]
- [x] Roles del máster (view-roles) [e2e]
- [x] Crónica con colores [e2e]

## Voz / audio
- [x] Modal de voz con sello de versión [manual]
- [x] Relevo de narrador en plena partida («Tomar la narración») [manual]
- [x] NUEVO v2: latido de presencia + banner si el narrador se cae [manual]
- [x] Mute sin pausar; ambiente procedural con atenuación bajo la voz [manual+voz]
- [x] Motor neuronal/dispositivo; 8 voces nube; voces del sistema ordenadas; velocidad (y tono en dispositivo) [manual]
- [x] Probar voz + diagnóstico neuronal [manual]
- [x] Caché de síntesis (SHA-256 completo, bug del truncado corregido) [test]
- [x] NUEVO v2: 872 clips pre-generados → noche sin llamadas a la API [test completitud + voz]
- [x] Narración determinista por semilla (golden-masters bit-idénticos con la v1) [test]
- [x] Desbloqueo de audio iOS por gesto + Wake Lock del narrador [manual iPhone]
- [x] Panel del narrador: rol esperado (no nombre) + «¿quién es?» (8 s) [e2e]

## Modos manual / guiado
- [x] Panel del máster con roles; marcar muerto/revivir; carta a pantalla completa; enamorados; cambio del Ladrón [e2e2]
- [x] Guion por pasos con registro por el máster; saltar; amanecer/noche manuales [e2e-guiado]

## Fiabilidad / UX
- [x] «📡 Enviando…» / «✔️ Recibido»; aviso de red lenta (15 s); anti doble-toque [e2e]
- [x] Inputs y scroll sobreviven a los snapshots (Svelte lo garantiza de serie) [e2e]
- [x] Carta auto-oculta a los 12 s; Enter envía el formulario de la tarjeta [e2e]
- [x] Reconexión tras recargar en plena partida [e2e2]

## Diferencias deliberadas v2 (no son regresiones)
- Estética renovada (lavado de cara sobre las mismas clases/pantallas).
- Assets con hash + `Cache-Control: immutable` (adiós a «versión vieja en el móvil»).
- Improvisaciones y «listos» ahora deterministas por semilla (pre-generables y estables al repetir).
- Llamadas por palabra clave: piezas idénticas para reales y falsas (en la v1 diferían: un tell).
- Espera de confirmación falsa 4–9 s (v1: ~3 s fijos, tell estadístico).
- Ventana de la sirvienta acotada en el narrador (reloj desviado inofensivo).
- El diagnóstico de voz muestra 4 filas (circuito v2) en vez de 6.
