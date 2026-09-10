// Spanish/French translations of "Postpartum Recovery Isn't About Bouncing
// Back" (#3 by real pageviews, postpartum pillar). Translated by Claude,
// not a native-speaker professional - see the pilot translation
// (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same caveat.
// Internal link points to the LOCALE-PREFIXED services page (/es/services/
// or /fr/services/), which already exists as a translated static page -
// unlike the pilot post, which had to fall back to the English-only
// /postpartum-recovery-guide since no translated version of that exists.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>Casi todas las conversaciones que tengo con una madre primeriza empiezan igual. Quiere saber cuánto tiempo tardará en "recuperar su cuerpo". Entiendo la pregunta. Viene de una cultura que nos ha entrenado a todos para ver la recuperación como una fecha límite en lugar de un proceso.</p><p>Pero el cuerpo que gestó y dio a luz a un bebé no desapareció. Cambió. De lo que en realidad estamos hablando, cuando quitamos el lenguaje de marketing, es de ayudar a un cuerpo que ha pasado por algo enorme a reconstruir fuerza, coordinación y conciencia corporal. Ese es un proyecto distinto a volver a una fotografía de antes.</p><h2>La Salud Antes que el Éxito</h2><p><span class="hl">La salud antes que el éxito</span> es como lo pienso en mi propia práctica, y aquí el éxito no es una cintura más pequeña para cierta semana. El éxito es una mujer que puede cargar a su hijo pequeño sin tensarse por miedo, que puede estornudar sin preocuparse, que se siente estable en su propio cuerpo de nuevo. Eso es tranquilidad, no una foto de antes y después.</p><h2>Dónde Encaja el Coaching, y Dónde No</h2><p>Digo esto como alguien que no es fisioterapeuta ni médico. Soy un coach que ha pasado años trabajando junto a personas que se reconstruyen después del parto, y lo que he aprendido viene sobre todo de prestar mucha atención a cuerpos individuales en lugar de aplicar una plantilla. Si tienes dolor persistente, una separación abdominal significativa, o síntomas como pérdidas o pesadez, eso merece primero una evaluación clínica adecuada. El coaching se ubica junto a ese tipo de atención, no en su lugar.</p><h2>Qué Determina Realmente el Ritmo de Recuperación</h2><p>Lo que me frustra de tanto contenido dirigido a madres primerizas es la suposición de fondo de que el objetivo es reducir el cuerpo de vuelta a donde empezó, en un cronograma que no tiene nada que ver con cómo está sanando realmente ese cuerpo en particular. Dos mujeres que dan a luz el mismo día pueden estar en lugares completamente distintos seis semanas después, seis meses después, un año después. Los tejidos sanan a su propio ritmo. Los sistemas nerviosos se asientan a su propio ritmo. El sueño, el estrés, la historia del parto y el apoyo en casa moldean ese cronograma, y nada de eso es algo que un programa genérico pueda tener en cuenta.</p><p>Así que cuando me siento con una nueva clienta, lo primero que intento entender no es la medida de su cintura. Es su vida real. Cómo durmió anoche. Si está amamantando. Cómo fue su parto. Dónde se siente fuerte y dónde se siente insegura. La programación viene después de eso, no antes.</p><p>No me veo a mí mismo como alguien que ya lo tiene todo resuelto y ahora reparte sabiduría desde arriba. Soy un compañero de camino en esto, sigo aprendiendo de cada clienta con la que trabajo, sigo ajustando mi propia comprensión de lo que realmente significan la fuerza y la recuperación. Si hay algo que quisiera que una madre primeriza se llevara de esto, es el permiso para dejar de medir su recuperación contra una fecha límite que nunca fue realmente suya, y empezar a prestar atención a lo que su propio cuerpo le está diciendo en realidad. Ese es el punto de partida para cada <a href="/es/services/postpartum-support">clienta posparto que acompaño</a>.</p>`;

const FR_BODY = `<p>Presque toutes les conversations que j'ai avec une nouvelle mère commencent de la même façon. Elle veut savoir combien de temps il lui faudra pour "retrouver son corps". Je comprends la question. Elle vient d'une culture qui nous a tous entraînés à voir la récupération comme une échéance plutôt que comme un processus.</p><p>Mais le corps qui a porté et mis au monde un bébé n'a pas disparu. Il a changé. Ce dont il est réellement question, une fois qu'on retire le langage marketing, c'est d'aider un corps qui a traversé quelque chose d'immense à reconstruire sa force, sa coordination et sa conscience corporelle. C'est un projet différent de revenir à une photo d'avant.</p><h2>La Santé Avant la Réussite</h2><p><span class="hl">La santé avant la réussite</span>, c'est ainsi que je vois les choses dans ma propre pratique, et ici la réussite n'est pas un tour de taille plus fin d'ici une certaine semaine. La réussite, c'est une femme capable de porter son enfant en bas âge sans se crisper de peur, qui peut éternuer sans s'inquiéter, qui se sent de nouveau stable dans son propre corps. C'est la tranquillité d'esprit, pas une photo avant-après.</p><h2>Où le Coaching a Sa Place, et Où Il Ne l'a Pas</h2><p>Je dis cela en tant que personne qui n'est ni kinésithérapeute ni médecin. Je suis un coach qui a passé des années à travailler aux côtés de personnes en reconstruction après l'accouchement, et ce que j'ai appris vient surtout du fait de prêter une attention minutieuse à chaque corps plutôt que d'appliquer un modèle unique. Si vous avez une douleur persistante, une séparation abdominale importante, ou des symptômes comme des fuites ou une sensation de lourdeur, cela mérite d'abord une véritable évaluation clinique. Le coaching se place aux côtés de ce type de suivi, pas à sa place.</p><h2>Ce Qui Détermine Vraiment le Rythme de la Récupération</h2><p>Ce qui me frustre dans une grande partie du contenu destiné aux nouvelles mères, c'est l'hypothèse sous-jacente selon laquelle l'objectif est de faire rétrécir le corps jusqu'à son état initial, selon un calendrier qui n'a rien à voir avec la façon dont ce corps en particulier guérit réellement. Deux femmes qui accouchent le même jour peuvent se trouver dans des situations complètement différentes six semaines plus tard, six mois plus tard, un an plus tard. Les tissus guérissent à leur propre rythme. Les systèmes nerveux se stabilisent à leur propre rythme. Le sommeil, le stress, l'histoire de l'accouchement et le soutien à la maison façonnent tous ce calendrier, et rien de tout cela ne peut être pris en compte par un programme générique.</p><p>Alors, quand je m'assois avec une nouvelle cliente, la première chose que j'essaie de comprendre, ce n'est pas la mesure de sa taille. C'est sa vie réelle. Comment elle a dormi la nuit dernière. Si elle allaite. Comment s'est passé son accouchement. Où elle se sent forte et où elle se sent incertaine. La programmation vient après cela, pas avant.</p><p>Je ne me considère pas comme quelqu'un qui a tout compris et qui distribue maintenant sa sagesse d'en haut. Je suis un compagnon de route dans tout cela, j'apprends encore de chaque cliente avec qui je travaille, j'ajuste encore ma propre compréhension de ce que signifient réellement la force et la récupération. S'il y a une chose que je voudrais qu'une nouvelle mère retienne de tout cela, c'est la permission d'arrêter de mesurer sa récupération par rapport à une échéance qui n'a jamais vraiment été la sienne, et de commencer à prêter attention à ce que son propre corps lui dit réellement. C'est le point de départ pour chaque <a href="/fr/services/postpartum-support">cliente post-partum que j'accompagne</a>.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'la-recuperacion-posparto-no-es-volver-al-cuerpo-de-antes',
    title: 'La Recuperación Posparto No Es Volver al Cuerpo de Antes',
    meta: 'Una reflexión sobre por qué la recuperación posparto no es una carrera de vuelta al cuerpo anterior, sino reconstruir capacidad a tu propio ritmo.',
    keyword: 'recuperación posparto mentalidad',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'la-recuperation-post-partum-nest-pas-un-retour-en-arriere',
    title: "La Récupération Post-Partum N'Est Pas un Retour en Arrière",
    meta: "Une réflexion sur le fait que la récupération post-partum n'est pas une course pour retrouver son ancien corps, mais reconstruire sa capacité.",
    keyword: 'récupération post-partum mentalité',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'postpartum-recovery-is-not-bouncing-back', locale: 'en' });
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
      notes: `Translation of "postpartum-recovery-is-not-bouncing-back" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
