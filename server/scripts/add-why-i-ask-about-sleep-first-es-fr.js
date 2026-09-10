// Spanish/French translations of "Why I Ask About Sleep Before I Ask About
// Training" (#1 by real pageviews - sleep pillar, diversifying the
// translation batch beyond postpartum-only). Translated by Claude, not a
// native-speaker professional - see notes on the pilot translation
// (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same caveat.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>A los clientes nuevos suele sorprenderles el orden de nuestra primera conversación. Llegan preparados para hablar de su historial de entrenamiento, lesiones, objetivos. Eventualmente pregunto sobre esas cosas. Pero la primera pregunta real suele ser sobre su sueño, y no solo cuántas horas duermen.</p><p>Quiero saber a qué hora realmente se calma su mente, si se despiertan por ruido o por pensamientos, si se sienten descansados o simplemente dejaron de moverse. Estas no son preguntas de calentamiento antes de llegar al coaching "de verdad". Son el coaching de verdad.</p><p>Un programa de entrenamiento construido sobre un sueño deficiente es un programa construido sobre una base inestable, y he aprendido esto por el camino difícil, viendo fallar planes por razones que no tenían nada que ver con el plan. Alguien sigue cada instrucción y aun así no mejora. Alguien se vuelve más fuerte sobre el papel pero reporta sentirse peor. Casi en todos los casos puedo rastrearlo hasta un sistema nervioso que nunca recibió la señal de que era seguro descansar.</p><p>Para mí, hacer coaching significa entender a una persona antes de intentar cambiar algo en ella. El sueño me dice cosas que el historial de entrenamiento no dice. Me habla de la carga de estrés, de cómo el cuerpo de alguien maneja la transición de la actividad a la quietud, de si están cargando una tensión que aún no han nombrado. El patrón de sueño de una persona suele ser un reporte más honesto que el que me darían verbalmente.</p><p><span class="hl">No puedes construir capacidad sobre un sistema nervioso al que nunca se le ha preguntado cómo está.</span> Esa no es una metáfora que use para causar efecto. Es la razón por la que espero antes de prescribir nada hasta entender cómo se está recuperando realmente alguien, no solo cómo está entrenando.</p><p>Esto también cambia el ritmo del trabajo. Si el sueño es inestable, no voy a añadir intensidad y esperar que se resuelva solo. Muchas veces le pido a alguien que se mantenga estable, a veces incluso que reduzca, mientras vemos qué está interrumpiendo su descanso. Eso es difícil de aceptar para alguien que vino a mí queriendo un programa más exigente. Pero forzar volumen sobre un cuerpo que no se está recuperando es simplemente pedir prestado a un futuro que aún no se ha ganado.</p><p>He entrenado a personas que representaron a su país y a personas que nunca han hecho ejercicio con intención en su vida, y la pregunta es la misma para ambas: cómo está tu sueño, de verdad. No porque el sueño sea todo el panorama, sino porque suele ser el primer dato honesto que obtengo. Todo lo demás que construyo viene después de eso.</p>`;

const FR_BODY = `<p>Les nouveaux clients sont souvent surpris par l'ordre de notre première conversation. Ils viennent prêts à parler de leur historique d'entraînement, de leurs blessures, de leurs objectifs. Je finis par poser ces questions. Mais la première vraie question porte généralement sur leur sommeil, et pas seulement sur le nombre d'heures.</p><p>Je veux savoir à quelle heure leur esprit se calme réellement, s'ils se réveillent à cause du bruit ou à cause de leurs pensées, s'ils se sentent reposés ou s'ils ont simplement arrêté de bouger. Ce ne sont pas des questions d'échauffement avant d'aborder le "vrai" coaching. Elles sont le vrai coaching.</p><p>Un programme d'entraînement construit sur un sommeil de mauvaise qualité est un programme construit sur une base instable, et j'ai appris cela lentement, en observant des plans échouer pour des raisons qui n'avaient rien à voir avec le plan lui-même. Quelqu'un suit chaque instruction et ne progresse toujours pas. Quelqu'un devient plus fort sur le papier mais dit se sentir plus mal. Dans presque tous les cas, je peux en retrouver la cause dans un système nerveux qui n'a jamais reçu le signal qu'il était en sécurité pour se reposer.</p><p>Pour moi, faire du coaching, c'est comprendre une personne avant d'essayer de changer quoi que ce soit chez elle. Le sommeil me dit des choses que l'historique d'entraînement ne dit pas. Il me renseigne sur la charge de stress, sur la façon dont le corps de quelqu'un gère la transition entre l'activité et l'immobilité, sur les tensions qu'il porte peut-être sans les avoir encore nommées. Le rythme de sommeil d'une personne est souvent un compte-rendu plus honnête que celui qu'elle me donnerait verbalement.</p><p><span class="hl">On ne peut pas construire de capacité sur un système nerveux à qui l'on n'a jamais demandé comment il allait.</span> Ce n'est pas une métaphore que j'utilise pour l'effet. C'est la raison pour laquelle j'attends avant de prescrire quoi que ce soit, jusqu'à ce que je comprenne comment quelqu'un récupère réellement, pas seulement comment il s'entraîne.</p><p>Cela change aussi le rythme du travail. Si le sommeil est instable, je ne vais pas ajouter de l'intensité en espérant que cela se résolve tout seul. Je demande souvent à la personne de rester stable, parfois même de réduire, pendant que nous regardons ce qui perturbe son repos. C'est difficile à accepter pour quelqu'un venu me voir en voulant un programme plus dur. Mais imposer du volume à un corps qui ne récupère pas revient simplement à emprunter à un avenir qui n'a pas encore été mérité.</p><p>J'ai entraîné des personnes qui ont représenté leur pays et des personnes qui n'ont jamais fait d'exercice avec intention de leur vie, et la question est la même pour les deux : comment va vraiment votre sommeil. Pas parce que le sommeil est toute l'histoire, mais parce que c'est généralement la première donnée honnête que j'obtiens. Tout ce que je construis ensuite vient après cela.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'por-que-pregunto-sobre-el-sueno-antes-de-entrenar',
    title: 'Por Qué Pregunto Sobre el Sueño Antes de Entrenar',
    meta: 'Ajith Jagadish explica por qué el sueño, no el historial de entrenamiento, es lo primero que pregunta a sus nuevos clientes de coaching.',
    keyword: 'sueño y coaching preguntas',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'pourquoi-je-demande-le-sommeil-avant-lentrainement',
    title: "Pourquoi Je Demande le Sommeil Avant l'Entraînement",
    meta: "Ajith Jagadish explique pourquoi le sommeil, et non l'historique d'entraînement, est la première chose qu'il demande à ses nouveaux clients.",
    keyword: 'sommeil coaching questions',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'why-i-ask-about-sleep-first', locale: 'en' });
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
      notes: `Translation of "why-i-ask-about-sleep-first" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
