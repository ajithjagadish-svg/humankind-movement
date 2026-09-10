// Spanish/French translations of "Diastasis Recti: What the Gap Doesn't Tell
// You" (#9 by real pageviews - postpartum pillar). Translated by Claude, not
// a native-speaker professional - see notes on the pilot translation
// (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same caveat.
// Internal link points to the locale-prefixed /es/contact and /fr/contact
// pages, which already exist as translated static pages.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>La primera pregunta que casi toda clienta me hace sobre la diástasis abdominal es cuántos dedos de ancho tiene la separación. Entiendo por qué. Es medible, es concreto, y se siente como algo que se puede arreglar. Pero con los años he llegado a creer que el número de dedos dice mucho menos de lo que la gente supone.</p><p>Una separación es una descripción de la distancia del tejido. No te dice qué tan bien puede alguien generar tensión a través de ese tejido, cómo se mueve su respiración, si su piso pélvico y su diafragma trabajan juntos, o cómo carga su columna durante el movimiento cotidiano, como levantarse del suelo o cargar a un hijo. Dos personas con la misma medida pueden funcionar de forma completamente distinta.</p><h2>Dónde Encaja el Coaching, y Dónde No</h2><p>Quiero tener cuidado aquí, porque no soy fisioterapeuta y esto no es un diagnóstico. Una separación significativa, especialmente si viene acompañada de abombamiento, dolor, o una sensación de que la línea media cede bajo carga, merece una evaluación clínica adecuada. Lo que ofrezco como coach va junto a esa evaluación, trabajando la mecánica respiratoria, la activación del core profundo, la movilidad y la fuerza progresiva una vez que la persona entiende con qué está lidiando realmente.</p><h2>Los Tres Meses de una Clienta</h2><p>Pienso en una clienta en particular, porque su experiencia moldeó cómo hablo de esto ahora. Llegó con una separación de cinco dedos, que según la mayoría de las medidas se considera significativa. A lo largo de tres meses de trabajo de respiración, activación del core profundo, movilidad progresiva, reconstrucción de fuerza, y cambios en cómo se movía durante el día, esa separación se redujo a dos dedos. Quiero ser directo sobre qué es esto y qué no es. Es la experiencia de una persona, no una garantía, no un cronograma que nadie más debería esperar igualar. Su tejido, su historia, su constancia y sus circunstancias de vida moldearon ese resultado, y otra persona haciendo el mismo trabajo podría ver un resultado distinto en un cronograma distinto, o un resultado que se muestre primero como función mejorada antes de mostrarse como una medida más pequeña.</p><p>Ese último punto importa más de lo que la gente reconoce. <span class="hl">Que la separación se cierre no es el objetivo, la capacidad sí lo es</span>, poder confiar en tu línea media bajo carga, sea esa carga una canasta de ropa, un cochecito, o una sentadilla. He trabajado con clientas cuya separación apenas se movió en los números pero que de repente podían hacer cosas que no podían hacer tres meses antes, y he trabajado con clientas cuya separación se cerró considerablemente antes de que su confianza les diera alcance.</p><p>Así que cuando alguien me dice su número de dedos, hago más preguntas. Qué pasa cuando tose. Qué pasa cuando se levanta de la cama. Qué pasa cuando carga a su bebé por un tramo de escaleras. La medida es un solo dato dentro de un panorama mucho más amplio, y tratarla como toda la historia es, creo, parte de la razón por la que tantas mujeres sienten que están fallando en algo que nunca fue un número simple para empezar. Esa es exactamente el tipo de pregunta que una <a href="/es/contact">primera conversación</a> real está hecha para responder.</p>`;

const FR_BODY = `<p>La première question que presque toutes mes clientes me posent sur la diastasis des grands droits est combien de doigts de large fait l'écart. Je comprends pourquoi. C'est mesurable, c'est concret, et cela donne l'impression d'être quelque chose à réparer. Mais au fil des années, j'en suis venu à croire que le nombre de doigts en dit bien moins que ce que les gens supposent.</p><p>Un écart est une description de la distance des tissus. Il ne dit rien sur la capacité de quelqu'un à générer de la tension à travers ce tissu, sur la façon dont sa respiration circule, sur la coordination entre son plancher pelvien et son diaphragme, ou sur la façon dont sa colonne est chargée pendant les mouvements ordinaires, comme se relever du sol ou porter un enfant. Deux personnes avec la même mesure peuvent fonctionner de façon complètement différente.</p><h2>Où le Coaching a Sa Place, et Où Il Ne l'a Pas</h2><p>Je veux être prudent ici, parce que je ne suis pas kinésithérapeute et ceci n'est pas un diagnostic. Une séparation importante, surtout accompagnée d'un bombement, de douleur, ou d'une sensation que la ligne médiane cède sous la charge, mérite une véritable évaluation clinique. Ce que j'offre en tant que coach vient s'ajouter à cette évaluation, en travaillant la mécanique respiratoire, l'activation du centre profond, la mobilité et le renforcement progressif une fois que la personne comprend ce à quoi elle a vraiment affaire.</p><h2>Les Trois Mois d'une Cliente</h2><p>Je pense à une cliente en particulier, parce que son expérience a façonné la façon dont j'en parle aujourd'hui. Elle est arrivée avec un écart de cinq doigts, ce qui selon la plupart des mesures est considéré comme important. Sur trois mois de travail respiratoire, d'activation du centre profond, de mobilité progressive, de reconstruction de la force, et de changements dans sa façon de bouger au quotidien, cet écart s'est réduit à deux doigts. Je veux être direct sur ce que cela est et n'est pas. C'est l'expérience d'une personne, pas une garantie, pas un calendrier que qui que ce soit d'autre devrait s'attendre à reproduire. Ses tissus, son histoire, sa constance et sa situation de vie ont façonné ce résultat, et quelqu'un d'autre faisant le même travail pourrait voir un résultat différent sur un calendrier différent, ou un résultat qui apparaît d'abord comme une fonction améliorée avant d'apparaître comme une mesure plus petite.</p><p>Ce dernier point compte plus que ce qu'on lui accorde généralement. <span class="hl">La fermeture de l'écart n'est pas l'objectif, la capacité l'est</span>, pouvoir faire confiance à sa ligne médiane sous charge, que cette charge soit un panier de linge, une poussette, ou un squat. J'ai travaillé avec des clientes dont l'écart a à peine bougé dans les chiffres mais qui pouvaient soudain faire des choses qu'elles ne pouvaient pas faire trois mois plus tôt, et j'ai travaillé avec des clientes dont l'écart s'est considérablement refermé avant que leur confiance ne les rattrape.</p><p>Alors quand quelqu'un me donne son nombre de doigts, je pose plus de questions. Que se passe-t-il quand vous toussez. Que se passe-t-il quand vous sortez du lit. Que se passe-t-il quand vous portez votre bébé dans un escalier. La mesure est une donnée parmi un tableau bien plus large, et la traiter comme toute l'histoire est, je pense, en partie la raison pour laquelle tant de femmes ont l'impression d'échouer à quelque chose qui n'a jamais été un simple chiffre au départ. C'est exactement le genre de question qu'une véritable <a href="/fr/contact">première conversation</a> est faite pour éclairer.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'diastasis-abdominal-lo-que-la-separacion-no-te-dice',
    title: 'Diástasis Abdominal: Lo Que la Separación No Te Dice',
    meta: 'Por qué el ancho de la separación abdominal importa menos que la función, y qué me enseñó la recuperación de tres meses de una clienta.',
    keyword: 'diástasis abdominal recuperación',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'diastasis-des-grands-droits-ce-que-lecart-ne-dit-pas',
    title: "Diastasis des Grands Droits : Ce Que l'Écart Ne Dit Pas",
    meta: "Pourquoi la largeur de l'écart compte moins que la fonction, et ce que la récupération de trois mois d'une cliente m'a vraiment appris.",
    keyword: 'diastasis des grands droits récupération',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'diastasis-recti-what-the-gap-doesnt-tell-you', locale: 'en' });
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
      notes: `Translation of "diastasis-recti-what-the-gap-doesnt-tell-you" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
