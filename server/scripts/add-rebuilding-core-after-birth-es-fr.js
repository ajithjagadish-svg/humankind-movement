// Spanish/French translations of "Rebuilding the Core After Birth, Without
// the Crunches" (#10 by real pageviews - postpartum pillar). Translated by
// Claude, not a native-speaker professional - see notes on the pilot
// translation (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same
// caveat. Internal link points to the locale-prefixed /es/services/ and
// /fr/services/ postpartum-support page, which already exists as a
// translated static page.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>Cuando la gente escucha "core", normalmente se imagina un six-pack o un reto de plancha. Esa imagen es parte de por qué tantas mujeres posparto terminan haciendo el trabajo equivocado en el momento equivocado, a veces antes de que su cuerpo esté listo para eso en absoluto.</p><h2>El Core Es un Sistema de Presión, No un Músculo</h2><p>El core no son solo los músculos abdominales visibles. Es un sistema de presión que incluye el diafragma arriba, el piso pélvico abajo, y los músculos abdominales profundos y de la espalda envolviendo el medio. Durante el embarazo, todo ese sistema se estira, se desplaza y se adapta a un bebé que crece. Después del parto, no vuelve simplemente a su antiguo patrón de coordinación. Tiene que reaprender a trabajar en conjunto.</p><h2>Por Qué No los Abdominales</h2><p>Por eso rara vez empiezo con una clienta nueva algo parecido a un abdominal. Un abdominal le pide a la pared abdominal frontal que se acorte y flexione, lo que puede empujar la presión hacia afuera contra una línea media que quizás todavía no puede manejar esa carga. Lo primero que busco es un trabajo mucho más silencioso: puede esta persona respirar de forma que la caja torácica se expanda sin que el vientre se infle hacia adelante, puede llevar suavemente los abdominales profundos hacia adentro sin aguantar la respiración, puede sentir que su piso pélvico responde junto con esa respiración en lugar de trabajar en su contra.</p><p>Nada de esto se ve impresionante desde afuera. Alguien mirando una sesión podría ver a una mujer acostada boca arriba respirando lentamente y preguntarse cuándo empieza el entrenamiento de verdad. Pero esto es el entrenamiento de verdad, al menos al principio, porque sin esa base de respiración y manejo de presión, cualquier fuerza construida encima tiende a construirse sobre terreno inestable.</p><h2>Reconstruir, No Volver</h2><p><span class="hl">Reconstruir no es lo mismo que volver</span>, y lo digo de forma deliberada. No estamos tratando de recrear exactamente lo que existía antes del embarazo. Estamos construyendo un sistema que pueda manejar las exigencias de esta nueva vida, que suele incluir cargar una silla de auto en una cadera, inclinarse sobre una cuna decenas de veces al día, y levantarse del suelo más seguido de lo que la mayoría de los programas de ejercicio jamás contemplan.</p><p>El progreso ocurre en capas. Primero el trabajo de respiración y presión, luego la activación suave del core profundo, después integrar esa activación en movimiento simple, y luego ir agregando carga gradualmente. No soy fisioterapeuta, y si alguien tiene dolor importante, una separación grande, o síntomas como presión o pérdidas, quiero que se evalúe clínicamente antes o junto con cualquier cosa que yo haga. Pero para el trabajo general de reconstrucción, la secuencia importa más que la intensidad.</p><p>Lo que he notado, trabajando así con clienta tras clienta, es que la fuerza que viene de este enfoque más lento tiende a sostenerse. No porque sea espectacular, sino porque se construye sobre un sistema que realmente entiende cómo distribuir la carga, en lugar de una capa superficial de músculo a la que se le pide hacer un trabajo para el que el resto del cuerpo nunca estuvo preparado. Esta secuencia, la respiración primero, es la misma que hay detrás de cada <a href="/es/services/postpartum-support">programa de recuperación posparto</a> que construyo.</p>`;

const FR_BODY = `<p>Quand les gens entendent « centre », ils imaginent généralement des abdominaux dessinés ou un défi de gainage. Cette image explique en partie pourquoi tant de femmes post-partum finissent par faire le mauvais travail au mauvais moment, parfois avant même que leur corps ne soit prêt pour cela.</p><h2>Le Centre Est un Système de Pression, Pas un Muscle</h2><p>Le centre n'est pas seulement les muscles abdominaux visibles. C'est un système de pression qui comprend le diaphragme en haut, le plancher pelvien en bas, et les muscles abdominaux profonds et dorsaux qui enveloppent le milieu. Pendant la grossesse, tout ce système s'étire, se déplace et s'adapte à un bébé qui grandit. Après l'accouchement, il ne revient pas simplement à son ancien schéma de coordination. Il doit réapprendre à travailler ensemble.</p><h2>Pourquoi Pas les Crunchs</h2><p>C'est pourquoi je commence rarement avec une nouvelle cliente par quelque chose qui ressemble à un crunch. Un crunch demande à la paroi abdominale avant de se raccourcir et de fléchir, ce qui peut pousser la pression vers l'extérieur contre une ligne médiane qui n'est peut-être pas encore capable de gérer cette charge. Ce que je recherche d'abord est un travail beaucoup plus discret : cette personne peut-elle respirer de façon à laisser la cage thoracique s'ouvrir sans que le ventre ne se gonfle vers l'avant, peut-elle rentrer doucement les abdominaux profonds sans retenir son souffle, peut-elle sentir son plancher pelvien répondre avec cette respiration plutôt que de travailler contre elle.</p><p>Rien de tout cela n'impressionne de l'extérieur. Quelqu'un observant une séance pourrait voir une femme allongée sur le dos, respirant lentement, et se demander quand le véritable entraînement commence. Mais c'est bien le véritable entraînement, du moins au début, car sans cette base de respiration et de gestion de la pression, toute force construite par-dessus tend à reposer sur un terrain instable.</p><h2>Reconstruire, Pas Revenir</h2><p><span class="hl">Reconstruire n'est pas la même chose que revenir</span>, et je le dis délibérément. Nous n'essayons pas de recréer exactement ce qui existait avant la grossesse. Nous construisons un système capable de gérer les exigences de cette nouvelle vie, qui inclut généralement porter un siège auto sur une hanche, se pencher sur un berceau des dizaines de fois par jour, et se relever du sol plus souvent que la plupart des programmes d'exercice ne le prévoient jamais.</p><p>Les progrès se construisent par couches. D'abord le travail de respiration et de pression, puis l'activation douce du centre profond, ensuite l'intégration de cette activation dans un mouvement simple, puis l'ajout progressif de charge. Je ne suis pas kinésithérapeute, et si quelqu'un présente une douleur importante, une grande séparation, ou des symptômes comme une pression ou des fuites, je veux qu'elle soit évaluée cliniquement avant ou parallèlement à tout ce que je fais. Mais pour le travail général de reconstruction, la séquence compte plus que l'intensité.</p><p>Ce que j'ai remarqué, en travaillant ainsi cliente après cliente, c'est que la force issue de cette approche plus lente a tendance à tenir dans le temps. Pas parce qu'elle est spectaculaire, mais parce qu'elle se construit sur un système qui comprend réellement comment répartir la charge, plutôt qu'une couche superficielle de muscle à qui l'on demande un travail pour lequel le reste du corps n'a jamais été préparé. Cette séquence, la respiration d'abord, est la même qui se trouve derrière chaque <a href="/fr/services/postpartum-support">programme de récupération post-partum</a> que je construis.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'reconstruir-el-core-despues-del-parto-sin-abdominales',
    title: 'Reconstruir el Core Después del Parto, Sin Abdominales',
    meta: 'Reconstruir la fuerza del core después del parto no se trata de abdominales ni retos de six-pack. Empieza con respiración y conciencia.',
    keyword: 'reconstruir core posparto',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'reconstruire-le-centre-apres-laccouchement-sans-crunchs',
    title: "Reconstruire le Centre Après l'Accouchement, Sans Crunchs",
    meta: "Reconstruire la force du centre après l'accouchement ne passe pas par les crunchs. Cela commence par la respiration et la conscience.",
    keyword: 'reconstruire le centre post-partum',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'rebuilding-the-core-after-birth', locale: 'en' });
  if (!english) throw new Error('English source post not found.');

  for (const tr of TRANSLATIONS) {
    const existingDupe = await BlogPost.findOne({ slug: tr.slug });
    if (existingDupe) {
      console.log(`Skipping ${tr.locale}: slug "${tr.slug}" already exists.`);
      continue;
    }

    const post = await BlogPost.create({
      slug: tr.slug,
      locale: tr.locale,
      translationOf: english._id,
      title: tr.title,
      meta: tr.meta,
      keyword: tr.keyword,
      category: english.category,
      categoryLabel: english.categoryLabel,
      bodyHtml: tr.bodyHtml,
      readMins: english.readMins,
      status: 'draft',
      notes: `Translation of "rebuilding-the-core-after-birth" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
