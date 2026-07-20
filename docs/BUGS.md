# Registro de bugs de la mesa

Registro vivo de todo lo que Iván reporta jugando. **Norma de trabajo**: cada
reporte se anota aquí ANTES de arreglarlo y se cierra con el commit del
arreglo. Si un bug vuelve, se **reabre la misma entrada** (nada de duplicados):
así queda a la vista cuántas veces se ha reportado y qué se hizo cada vez.

Estados: 🔴 abierto · 🟢 arreglado (con commit) · 🟡 re-reportado tras un arreglo (en verificación)

---

## B1 · Caballero de la Espada Oxidada: devorado en partida de 4 con 1 lobo, no mata a su lobo
- **2026-07-19 · reporte 1.** «No ha matado a su lobo más cercano al amanecer una vez devorado durante la noche.»
  Diagnóstico: la partida se cerraba en ese mismo amanecer con «ganan los lobos» por **paridad**
  (el lobo sentenciado contaba como fuerza lobuna), así que el óxido nunca llegaba a actuar.
- **2026-07-19 · 🟢 arreglado** en `0265ee8`: el lobo sentenciado es un muerto andante — no cuenta
  para la paridad, la partida sigue y el óxido lo reclama al amanecer siguiente. Test de regresión
  con la partida exacta (4 jugadores, 1 lobo).
- **2026-07-20 · 🟡 re-reportado.** Verificado de punta a punta el flujo real desplegado:
  creación del óxido en la cadena de muertes → persistencia en el doc (`Object.assign(game, gameUpdates)`,
  también con día sin linchamiento) → consumo al amanecer siguiente aunque el lobo muerda esa noche.
  Todo correcto en el código actual; test extra «flujo real» añadido. **La partida reportada es
  anterior al despliegue del arreglo** (e20d361 se desplegó el 19). Si vuelve a pasar en una partida
  jugada a partir del 20-07, reabrir con la crónica y el nombre de la mesa.
- **2026-07-20 · 🟡 re-reportado (3ª vez), con crónica.** La crónica lo aclara: el amanecer 1 anuncia
  al caballero devorado y el lobo sigue vivo — que es EXACTAMENTE la regla oficial («el lobo muere
  la noche siguiente», anunciado al amanecer 2), pero ese retardo es invisible en la app y para la
  mesa equivale a «no funciona». Iván descartó también la hipótesis de la mesa redonda: el recorrido
  hacia la izquierda ya da la vuelta (`(idx+d)%n`, con test).
- **2026-07-20 · 🟢 cerrado como REGLA DE LA MESA** (este commit): el óxido responde EN EL ACTO —
  el primer lobo hacia la izquierda del caballero muere en el MISMO amanecer, dentro de la cadena de
  muertes (como el disparo del cazador). Desviación deliberada del oficial, decidida tras tres
  reportes idénticos. Se desmonta todo el mecanismo demorado (`caballeroRust`) y la excepción de
  paridad que lo acompañaba; textos del rol actualizados; e2e nuevo `e2e-caballero.mjs` que reproduce
  la partida de la crónica contra la app desplegada.

## B2 · Gaitero: llamaba a los mismos encantados con la misma palabra clave cada noche
- **2026-07-19 · reporte.** Repetir la palabra delataba al encantado de noches anteriores.
- **2026-07-19 · 🟢 arreglado** en `97dd711`: todos los encantados despiertan cada noche (como en el
  juego físico), la palabra se **quema al sonar** y rota desde la reserva al confirmar; la llamada
  falsa crece en proporción.

## B3 · Encantados: la palabra clave rota pero el jugador no se entera
- **2026-07-20 · reporte.** «No queda claro, se debe indicar en la pantalla de confirmación.»
  La palabra nueva solo se veía enterrada en la carta de rol (👁 Mostrar mi rol).
- **2026-07-20 · 🟢 arreglado** (este commit): el panel de encantados avisa antes de confirmar
  («tu palabra queda quemada») y, tras confirmar, muestra la palabra **nueva** en grande mientras
  dura el paso. Igual para los enamorados cuando su palabra rota.

## B4 · Final con solo los enamorados vivos: decía «gana el Pueblo» y Cupido sin crédito
- **2026-07-20 · reporte.** Partida real: Cupido devorado, lobo linchado, quedan los dos enamorados
  (ambos del pueblo) → la pancarta decía «¡El Pueblo ha ganado!». Iván: «si quedan solo los
  enamorados, gana Cupido».
- Causa: la auditoría `e20d361` había cambiado a propósito la etiqueta de la pareja del mismo bando
  («ganan CON su bando»). Iván revierte esa decisión.
- **2026-07-20 · 🟢 arreglado** (este commit): si solo quedan los enamorados, gana el amor sea cual
  sea el bando de la pareja, y la pantalla final acredita a Cupido («la pareja fue obra de sus flechas»).

## B5 · Gaitero: no podía encantarse a sí mismo
- **2026-07-20 · reporte.** Regla general de la mesa: **todo rol puede incluirse a sí mismo salvo
  prohibición oficial expresa** (como el Niño Salvaje con «otro jugador» o el Albino con «uno de sus
  compañeros lobos»).
- **2026-07-20 · 🟢 arreglado** (este commit): el gaitero puede auto-encantarse (entra al círculo de
  encantados con palabra clave propia). Su victoria no lo necesita: exige a todos los **demás** vivos.

## B6 · Cuervo (y otros): no podían señalarse/votarse a sí mismos
- **2026-07-19 · reporte.** Misma regla general que B5.
- **2026-07-19 · 🟢 arreglado** en `97dd711`: vidente, zorro, cuervo, actor y feroz pueden elegirse a
  sí mismos; siguen prohibidos los casos con veto oficial (niño salvaje, albino).
