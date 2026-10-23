# Hoja de personaje D&D 2024 (app para el móvil)

Web instalable (PWA) para que cada jugador cree y lleve sus hojas de personaje en el móvil.
Funciona sin internet una vez abierta y guarda los datos solo en ese dispositivo.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de las pantallas |
| `estilos.css` | Aspecto (modo claro y oscuro automático) |
| `app.js` | Lógica: guardado, cálculos, descansos, importar/exportar, partidas y visor del DM |
| `nube.js` | Conexión con Firebase (solo para partidas) |
| `firestore.rules` | Reglas de seguridad que hay que pegar en Firebase (no las usa la web) |
| `sw.js` | Hace que funcione sin conexión |
| `manifest.webmanifest`, `iconos/` | Datos para instalarla en la pantalla de inicio |

## Qué calcula sola

- Modificador de cada característica: (puntuación − 10) / 2, redondeando hacia abajo.
- Bonificador por competencia según el nivel: +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20).
- Salvaciones y habilidades: modificador + competencia (×2 con pericia).
- Iniciativa: Destreza + «extra». Percepción pasiva: 10 + Percepción.
- Magia: CD = 8 + mod. de aptitud + competencia; ataque = mod. + competencia.
- Daño: se resta primero de los PG temporales. Curar desde 0 PG reinicia las salvaciones contra muerte.
- Descanso corto: apunta los dados de golpe gastados y los PG recuperados (los dados se tiran en físico). Descanso largo: PG al máximo, dados de golpe y espacios de conjuro recuperados.

## Imagen del personaje

En **Ficha → Aspecto** se puede subir una imagen, escribir una descripción o las dos cosas.
El recuadro tiene tamaño fijo (3:4). Con **Encuadrar** se arrastra la imagen y se acerca o aleja
(barra de zoom, pellizco con dos dedos o rueda del ratón). La misma imagen sale en la lista de personajes.
Al subirla se reduce (lado mayor 1000 px, JPEG) para no llenar el almacenamiento del móvil; va incluida al exportar.

## Partidas y visor del DM

- **DM:** en la lista, **Visor del DM → Crear partida**. La app da un código de 6 caracteres (p. ej. `ABC-234`).
  Se ven las hojas de los jugadores en directo, solo para leer. Tocando una tarjeta se abre la hoja completa.
- **Jugador:** en su hoja, **Ficha → Partida**, escribe el código y pulsa **Unirse**. Cada cambio se envía solo
  (sin conexión, se envía al recuperarla). **Salir de la partida** deja de compartirla.
- Solo las hojas unidas a una partida se guardan en la nube; el resto sigue solo en el móvil.
- Firebase (proyecto `hoja-personaje-dnd`, plan gratuito): Firestore + inicio de sesión anónimo.
  Las reglas de `firestore.rules` impiden que nadie salvo el propio jugador cambie su hoja.
- Si un jugador cambia de móvil o borra los datos del navegador, tiene que volver a unirse; el DM puede quitar la tarjeta antigua.

## Probarla en el ordenador

Abrir `index.html` con doble clic ya funciona (sin modo sin conexión). Para probarla completa:

```
python -m http.server 8765
```

desde esta carpeta y abrir http://localhost:8765

## Usarla en el móvil

Tiene que estar publicada en una dirección **https** (p. ej. GitHub Pages o Netlify). Después:

- **Android (Chrome):** menú ⋮ → «Instalar aplicación» / «Añadir a pantalla de inicio».
- **iPhone (Safari):** botón Compartir → «Añadir a pantalla de inicio».

## Copias de seguridad

Los datos viven solo en el navegador del móvil. Si se borran los datos del navegador o se desinstala, se pierden.
«Copia de seguridad» descarga un `.json` con todos los personajes; «Importar archivo» lo recupera.
Así también se puede pasar un personaje al DM.

## Actualizar la app

Al cambiar archivos, el móvil descarga la versión nueva en segundo plano y la muestra **la siguiente vez** que se abre.
Si se añade un archivo nuevo, hay que añadirlo a la lista de `sw.js` y cambiar `CACHE` (p. ej. `hoja-pj-v2`).
Subir también `VERSION` en `app.js` para ver en la lista qué versión se tiene.
