# Grammar Games

Web para repasar la gramática de inglés de **1º ASIR (Inglés I)** y **2º ASIR (Inglés II)** jugando.
El selector «1º | 2º» de la cabecera cambia de curso; cada uno tiene sus lecciones, juegos, repaso y chuleta, y los puntos y logros son comunes.
Todo ocurre en el navegador: no necesita instalación, servidor ni Internet.

## Abrirla

1. Descomprime el zip entero (no abras `index.html` desde dentro del zip).
2. Haz doble clic en `index.html`.

Funciona en Windows, macOS y Linux con un navegador actual (Chrome, Edge, Firefox, Brave, Safari) y también en el móvil.

## Qué tiene

### 1º ASIR · Inglés I

- **18 lecciones**, una por cada página de los apuntes: ficha con la regla, la tabla, un truco y ejemplos que se pueden escuchar.
  - Unit 1 · Daily-life routine: pronombres y contables, present simple, past simple, will / going to, rutina diaria, carta informal.
  - Unit 2 · Culture and society: in/on/at y this/that, presente simple y continuo, past simple y present perfect, familia, casa y ciudad, conectores.
  - Unit 3 · Free time and travelling: question words, pasado simple y continuo, past perfect, vocabulario de viajes, trip/journey/travel, redacción formal.
- **161 ejercicios** de seis tipos: elegir, escribir el hueco, ordenar la frase, encontrar y corregir el error, unir parejas y clasificar.
- **Minijuegos**: un contrarreloj y una caza de errores por unidad, más la Forja de verbos irregulares (U1), la Lluvia de preposiciones (U2) y Formal o informal (U3).
- **Extra**: repaso de fallos (lo que fallas vuelve hasta que lo aciertas a la primera) y dictado con la voz del navegador.
### 2º ASIR · Inglés II

- **24 lecciones**, una por página de los apuntes:
  - Unit 1 · Present verb tenses: presente simple y continuo, preguntas y tiempo, present perfect, present perfect continuous, los cuatro tiempos y cómo elegir.
  - Unit 2 · Past verb tenses: pasado simple y continuo, used to y would, past perfect, past perfect continuous, todos los tiempos y cómo elegir.
  - Unit 3 · Future verb tenses: going to, will, condicionales 0-1 y 2-3, adjetivos -ed / -ing, verbos modales, todas las formas de futuro y cómo elegir condicional.
- **190 ejercicios** con los mismos seis tipos.
- **Minijuegos**: contrarreloj y caza de errores por unidad, Detective de tiempos (U1 y U2), Condicionales (U3) y la Forja de verbos en Extra.

### Común

- Chuleta con buscador (todas las tablas y 57 verbos irregulares), puntos, rangos, logros, tema claro y oscuro.

## Dónde tocar

| Archivo | Contenido |
| --- | --- |
| `js/content.js` | 1º ASIR: teoría, ejercicios, textos de la caza de errores, verbos, frases de la lluvia y de Formal o informal |
| `js/content2.js` | 2º ASIR: teoría, ejercicios, caza de errores, Detective de tiempos y Condicionales |
| `js/app.js` | Interfaz, motor de ejercicios, minijuegos, puntos, logros, voz y chuleta |
| `css/style.css` | Diseño y colores (variables al principio del archivo) |

Para añadir un ejercicio basta con copiar otro del mismo tipo en `js/content.js` o `js/content2.js` (el formato está explicado al principio del archivo).

## Privacidad

La página lleva una política de seguridad estricta: solo carga sus propios archivos y no se conecta a nada.
El progreso se guarda en el navegador de cada persona (`localStorage`). La voz usa la síntesis del propio navegador:
si no hay ninguna voz en inglés instalada, los botones 🔊 y el dictado se ocultan o lo avisan.
