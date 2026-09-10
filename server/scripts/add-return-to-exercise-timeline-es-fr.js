// Spanish/French translations of "The Return-to-Exercise Timeline Nobody
// Tells You About" (#6 by real pageviews - postpartum pillar). Translated by
// Claude, not a native-speaker professional - see notes on the pilot
// translation (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same
// caveat. Internal link points to /postpartum-recovery-guide, which has no
// es/fr translated version yet - same English-only fallback used by the
// pilot post, with the anchor text still translated.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>La gente quiere un número. Seis semanas, doce semanas, seis meses. Entiendo el atractivo de un cronograma claro, algo que puedas marcar en un calendario e ir contando hasta llegar. Pero en años trabajando con clientas posparto, nunca he encontrado un número fijo que se sostenga entre personas distintas.</p><h2>El Alta Médica y Estar Lista No Son lo Mismo</h2><p>La marca de las seis semanas, en particular, se trata como una línea de meta porque suele ser cuando ocurre el alta médica estándar. Esa alta es importante y necesaria, pero es una revisión para descartar complicaciones inmediatas, no una afirmación de que un cuerpo está listo para las exigencias de un programa de entrenamiento. He trabajado con mujeres con alta a las seis semanas que no estaban ni cerca de poder correr, y con mujeres más avanzadas que todavía necesitaban meses de trabajo de base antes de que su cuerpo pudiera manejar carga real.</p><h2>Qué Determina Realmente Estar Lista</h2><p>Lo que realmente determina si estás lista tiene menos que ver con el calendario y más con un puñado de cosas específicas. Cómo se mueve la respiración por el cuerpo. Si el core profundo y el piso pélvico pueden coordinarse bajo demanda creciente. Si hay abombamiento, protuberancia, pérdidas o pesadez durante el movimiento diario, y ni hablar del ejercicio. Cómo está el sueño, porque un sistema nervioso que funciona con fragmentos de descanso responde al estrés del entrenamiento de forma muy distinta que uno que está descansado. Si el parto fue vaginal o por cesárea, y cómo está sanando ese tejido. Cada una de estas preguntas puede mover el cronograma en cualquier dirección.</p><h2>Dónde Encaja el Coaching, y Dónde No</h2><p>Aquí también quiero ser claro sobre mi propio rol. Soy coach, no médico ni fisioterapeuta. Si hay dolor, una separación significativa, incontinencia, o algo que se sienta mal durante el movimiento, eso necesita una evaluación clínica adecuada antes de construir un plan de vuelta al ejercicio alrededor de eso. Mi trabajo está en el coaching que ocurre una vez que entendemos el panorama, y muchas veces eso significa frenar un plan que una clienta tenía ganas de acelerar.</p><p>Lo que he visto, una y otra vez, es que las mujeres que apuran la vuelta basándose en un cronograma genérico suelen terminar lidiando con retrocesos que les cuestan más tiempo del que un enfoque paciente les habría costado. Aparece un síntoma nuevo, baja la confianza, y todo el proceso pasa a tratarse más de manejar la frustración que de reconstruir coordinación. Mientras que las mujeres que dejan que su propio cuerpo marque el ritmo suelen avanzar sin esas interrupciones, aunque su calendario se vea más lento desde afuera.</p><p><span class="hl">El cronograma no es algo que sigues, es algo que descubres</span>, específico a la sanación, historia y vida de esa persona. Eso es más difícil de vender que un plan de seis semanas, pero está más cerca de cómo funcionan realmente los cuerpos. Mi trabajo es seguir observando, seguir preguntando, y dejar que el ritmo lo marque lo que realmente estoy viendo frente a mí y no lo que un calendario dice que debería estar pasando ya. La <a href="/postpartum-recovery-guide">guía gratuita de recuperación posparto</a> profundiza en este cronograma, si quieres ir más allá.</p>`;

const FR_BODY = `<p>Les gens veulent un chiffre. Six semaines, douze semaines, six mois. Je comprends l'attrait d'un calendrier clair, quelque chose que l'on peut entourer sur un calendrier et compter jusqu'à atteindre. Mais après des années à travailler avec des clientes post-partum, je n'ai jamais trouvé de chiffre fixe qui tienne d'une personne à l'autre.</p><h2>L'Autorisation Médicale et Être Prête Ne Sont Pas la Même Chose</h2><p>Le cap des six semaines, en particulier, est traité comme une ligne d'arrivée parce que c'est souvent le moment où intervient l'autorisation médicale standard. Cette autorisation est importante et nécessaire, mais c'est un contrôle des complications immédiates, pas une déclaration comme quoi un corps est prêt pour les exigences d'un programme d'entraînement. J'ai travaillé avec des femmes autorisées à six semaines qui étaient loin d'être prêtes à courir, et des femmes plus avancées qui avaient encore besoin de mois de travail de base avant que leur corps puisse supporter une charge réelle.</p><h2>Ce Qui Détermine Vraiment Si l'on Est Prête</h2><p>Ce qui détermine vraiment si l'on est prête a moins à voir avec le calendrier qu'avec quelques éléments précis. Comment la respiration circule dans le corps. Si le centre profond et le plancher pelvien peuvent se coordonner sous une demande croissante. S'il y a un bombement, une saillie, des fuites ou une lourdeur pendant le mouvement quotidien, sans même parler de l'exercice. Comment est le sommeil, car un système nerveux qui fonctionne sur des fragments de repos réagit au stress de l'entraînement très différemment d'un système reposé. Si l'accouchement était vaginal ou par césarienne, et comment ce tissu cicatrise. Chacune de ces questions peut faire bouger le calendrier dans un sens ou dans l'autre.</p><h2>Où le Coaching a Sa Place, et Où Il Ne l'a Pas</h2><p>C'est aussi ici que je veux être clair sur mon propre rôle. Je suis coach, pas médecin ni kinésithérapeute. S'il y a de la douleur, une séparation importante, de l'incontinence, ou quoi que ce soit qui semble anormal pendant le mouvement, cela nécessite une véritable évaluation clinique avant de construire un plan de reprise du sport autour de cela. Mon travail se situe dans le coaching qui intervient une fois que nous comprenons la situation, et cela signifie souvent ralentir un plan qu'une cliente avait envie d'accélérer.</p><p>Ce que j'ai vu, à répétition, c'est que les femmes qui précipitent la reprise en se basant sur un calendrier générique finissent souvent par gérer des revers qui leur coûtent plus de temps qu'une approche patiente ne leur en aurait coûté. Un nouveau symptôme apparaît, la confiance baisse, et tout le processus devient davantage une gestion de la frustration qu'une reconstruction de la coordination. Alors que les femmes qui laissent leur propre corps donner le rythme ont tendance à avancer sans ces interruptions, même si leur calendrier paraît plus lent de l'extérieur.</p><p><span class="hl">Le calendrier n'est pas quelque chose que l'on suit, c'est quelque chose que l'on découvre</span>, propre à la guérison, à l'histoire et à la vie de cette personne. C'est plus difficile à vendre qu'un plan de six semaines, mais c'est plus proche de la façon dont les corps fonctionnent réellement. Mon travail est de continuer à observer, à poser des questions, et de laisser le rythme être déterminé par ce que je vois réellement devant moi plutôt que par ce qu'un calendrier dit qui devrait se passer maintenant. Le <a href="/postpartum-recovery-guide">guide gratuit de récupération post-partum</a> approfondit ce calendrier, si vous voulez aller plus loin.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'el-cronograma-de-vuelta-al-ejercicio-que-nadie-te-cuenta',
    title: 'El Cronograma de Vuelta al Ejercicio Que Nadie Te Cuenta',
    meta: 'Por qué no existe un cronograma universal de vuelta al ejercicio después del parto, y qué determina realmente si estás lista.',
    keyword: 'vuelta al ejercicio posparto',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'le-calendrier-de-reprise-du-sport-que-personne-ne-vous-dit',
    title: 'Le Calendrier de Reprise du Sport Que Personne Ne Vous Dit',
    meta: "Pourquoi il n'existe pas de calendrier universel de reprise du sport après l'accouchement, et ce qui détermine vraiment si vous êtes prête.",
    keyword: 'reprise du sport post-partum',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'return-to-exercise-timeline', locale: 'en' });
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
      notes: `Translation of "return-to-exercise-timeline" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
