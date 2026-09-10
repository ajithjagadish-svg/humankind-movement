// Spanish/French translations of "Corporate Wellness Is Being Graded on
// Outcomes Now, Not Attendance" (#7 by real pageviews - philosophy pillar,
// first non-clinical/non-food post translated). Translated by Claude, not a
// native-speaker professional - see notes on the pilot translation
// (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same caveat. No
// internal link in the source post, so none added here either.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>Durante mucho tiempo, un programa de bienestar corporativo podía llamarse exitoso señalando una hoja de cálculo. Cuántas personas asistieron al seminario. Cuántas personas descargaron la aplicación. Cuántas personas usaron el escritorio de pie al menos una vez. La asistencia era todo el marcador.</p><p>Eso está cambiando, y creo que está cambiando por la razón correcta. Los equipos de RRHH ahora se hacen una pregunta más difícil y más honesta: ¿cambió realmente algo para las personas en este programa? ¿Duermen mejor, manejan mejor el estrés, se mueven mejor, faltan menos días, llegan al trabajo con más capacidad? <span class="hl">La participación nunca fue el objetivo. Siempre estuvo pensada como un indicador de algo real</span>, y las organizaciones por fin lo están diciendo en voz alta.</p><p>Recibo esto con agrado, porque se acerca más a cómo ya pienso sobre este trabajo. Un día de bienestar puntual es fácil de medir y fácil de olvidar. Un programa que hace seguimiento de si el estrés, la energía y los patrones de movimiento de las personas realmente cambian a lo largo de meses es más difícil de ejecutar y mucho más útil. Le pide al coach que rinda cuentas más allá de una hoja de firmas.</p><p>Esto también cambia cómo tiene que verse un programa desde el principio. Si el objetivo son los resultados, un solo taller no puede cargar con ese peso. Lo que sí puede hacerlo es un ciclo estructurado: entender dónde está realmente un equipo, diseñar algo que responda a esa realidad, verificar si eso movió los números que importan, y ajustar. Esta no es una idea nueva para mí. Se parece al ciclo de Notar, Entender, Alinear, Practicar, Reflexionar que ya uso en el trabajo individual, solo que aplicado a la escala de un equipo.</p><p>La complicación honesta es que los resultados tardan más en aparecer que la asistencia, y también le exigen más a la organización. Un programa no puede mejorar el sueño o el estrés si la cultura que lo rodea castiga a las personas por desconectarse. El bienestar basado en resultados reales significa que RRHH tiene que mirar la carga de trabajo y las expectativas, no solo sumar otro beneficio encima de un entorno que no ha cambiado. Esa es una conversación más difícil que reservar a un instructor de yoga, pero es la que realmente mueve algo.</p><p>Si tu organización está lista para preguntarse qué está haciendo realmente el apoyo de bienestar por tu gente, en lugar de cuántos asistieron, esa es una conversación que me gustaría tener.</p>`;

const FR_BODY = `<p>Pendant longtemps, un programme de bien-être en entreprise pouvait se déclarer réussi en pointant vers un tableau. Combien de personnes sont venues au séminaire. Combien ont téléchargé l'application. Combien ont utilisé le bureau debout au moins une fois. La présence était tout le tableau de bord.</p><p>Cela change, et je pense que cela change pour la bonne raison. Les équipes RH se posent maintenant une question plus difficile, plus honnête : est-ce que quelque chose a vraiment changé pour les personnes dans ce programme. Dorment-elles mieux, gèrent-elles mieux le stress, bougent-elles mieux, manquent-elles moins de jours, arrivent-elles au travail avec plus de capacité. <span class="hl">La participation n'a jamais été l'objectif. Elle était censée être un indicateur de quelque chose de réel</span>, et les organisations le disent enfin à voix haute.</p><p>J'accueille cela favorablement, car c'est plus proche de la façon dont je pense déjà ce travail. Une journée bien-être ponctuelle est facile à mesurer et facile à oublier. Un programme qui suit si le stress, l'énergie et les habitudes de mouvement des gens changent vraiment sur plusieurs mois est plus difficile à mener et bien plus utile. Il demande au coach de rendre des comptes au-delà d'une feuille de présence.</p><p>Cela change aussi à quoi un programme doit ressembler dès le départ. Si l'objectif est les résultats, un atelier unique ne peut pas porter ce poids. Ce qui le peut, c'est un cycle structuré : comprendre où en est vraiment une équipe, concevoir quelque chose qui répond à cette réalité, vérifier si cela a fait bouger les chiffres qui comptent, et ajuster. Ce n'est pas une idée nouvelle pour moi. C'est proche du cycle Remarquer, Comprendre, Aligner, Pratiquer, Réfléchir que j'utilise déjà en individuel, simplement appliqué à l'échelle d'une équipe.</p><p>La complication honnête, c'est que les résultats mettent plus de temps à apparaître que la présence, et ils demandent aussi plus à l'organisation. Un programme ne peut pas améliorer le sommeil ou le stress si la culture qui l'entoure pénalise les gens pour s'être déconnectés. Un bien-être vraiment fondé sur les résultats signifie que les RH doivent regarder la charge de travail et les attentes, pas seulement ajouter un avantage de plus sur un environnement inchangé. C'est une conversation plus difficile que de réserver un instructeur de yoga, mais c'est celle qui fait vraiment bouger les choses.</p><p>Si votre organisation est prête à se demander ce que le soutien bien-être fait réellement pour vos équipes, plutôt que combien de personnes y ont assisté, c'est une conversation que j'aimerais avoir.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'el-bienestar-corporativo-ahora-se-mide-por-resultados-no-asistencia',
    title: 'El Bienestar Corporativo Ahora Se Mide por Resultados, No Asistencia',
    meta: 'Por qué los equipos de RRHH dejan atrás las métricas de asistencia y qué exige realmente ese cambio a un programa de bienestar.',
    keyword: 'bienestar corporativo resultados',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'le-bien-etre-en-entreprise-se-juge-desormais-aux-resultats',
    title: 'Le Bien-Être en Entreprise Se Juge Désormais aux Résultats',
    meta: "Pourquoi les RH délaissent les métriques de présence, et ce que ce changement exige vraiment d'un programme de bien-être.",
    keyword: 'bien-être en entreprise résultats',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'corporate-wellness-is-being-graded-on-outcomes-now-not-attendance', locale: 'en' });
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
      notes: `Translation of "corporate-wellness-is-being-graded-on-outcomes-now-not-attendance" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
