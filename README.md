# Grammar Games

Web para repasar la gramática de **Inglés I** (unidades 1, 2 y 3) jugando.
Todo ocurre en el navegador: no necesita instalación, servidor ni Internet.

## Abrirla

1. Descomprime el zip entero (no abras `index.html` desde dentro del zip).
2. Haz doble clic en `index.html`.

Funciona en Windows, macOS y Linux con un navegador actual (Chrome, Edge, Firefox, Brave, Safari) y también en el móvil.

## Qué tiene

- **18 lecciones**, una por cada página de los apuntes: ficha con la regla, la tabla, un truco y ejemplos que se pueden escuchar.
  - Unit 1 · Daily-life routine: pronombres y contables, present simple, past simple, will / going to, rutina diaria, carta informal.
  - Unit 2 · Culture and society: in/on/at y this/that, presente simple y continuo, past simple y present perfect, familia, casa y ciudad, conectores.
  - Unit 3 · Free time and travelling: question words, pasado simple y continuo, past perfect, vocabulario de viajes, trip/journey/travel, redacción formal.
- **161 ejercicios** de seis tipos: elegir, escribir el hueco, ordenar la frase, encontrar y corregir el error, unir parejas y clasificar.
- **Minijuegos**: un contrarreloj y una caza de errores por unidad, más la Forja de verbos irregulares (U1), la Lluvia de preposiciones (U2) y Formal o informal (U3).
- **Extra**: repaso de fallos (lo que fallas vuelve hasta que lo aciertas a la primera) y dictado con la voz del navegador.
- Chuleta con buscador (todas las tablas y 57 verbos irregulares), puntos, rangos, logros, tema claro y oscuro.

## Dónde tocar

| Archivo | Contenido |
| --- | --- |
| `js/content.js` | Teoría, ejercicios, textos de la caza de errores, verbos, frases de la lluvia y de Formal o informal |
| `js/app.js` | Interfaz, motor de ejercicios, minijuegos, puntos, logros, voz y chuleta |
| `css/style.css` | Diseño y colores (variables al principio del archivo) |

Para añadir un ejercicio basta con copiar otro del mismo tipo en `js/content.js` (el formato está explicado al principio del archivo).

## Privacidad

La página lleva una política de seguridad estricta: solo carga sus propios archivos y no se conecta a nada.
El progreso se guarda en el navegador de cada persona (`localStorage`). La voz usa la síntesis del propio navegador:
si no hay ninguna voz en inglés instalada, los botones 🔊 y el dictado se ocultan o lo avisan.
