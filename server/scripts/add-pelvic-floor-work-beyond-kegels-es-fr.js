// Pilot translations of "Pelvic Floor Work Beyond Kegels" (the #1/#2
// highest-pageview post, per real analytics - see the LLM-tracker/blog
// translation planning discussion 2026-09-10). First posts to use the new
// locale/translationOf fields and /es/blog, /fr/blog routes.
//
// Translated by Claude (not a native-speaker professional translator) -
// anatomical/medical terminology (suelo pélvico, diaphragme, prolapsus,
// etc.) was chosen carefully, but this should get a native-speaker pass
// before this scales past a handful of pilot posts, especially since this
// is health-adjacent content.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>A las madres primerizas suele decírseles que los Kegels son lo primero y lo último sobre la recuperación del suelo pélvico. Apretar, sostener, repetir, y con el tiempo las cosas mejorarán. Entiendo por qué este consejo se difunde con tanta facilidad. Es simple, no requiere equipo, y suena como si abordara el problema directamente. Pero en la práctica, es una imagen incompleta de lo que el suelo pélvico realmente necesita.</p><h2>El Suelo Pélvico No Funciona de Forma Aislada</h2><p>El suelo pélvico no funciona de forma aislada. Se mueve en coordinación con el diafragma, respondiendo a cada respiración, y forma parte de un sistema de presión que incluye los abdominales profundos y la espalda. Cuando alguien solo practica el apretar de forma aislada, sin prestar atención a cómo se comporta realmente ese grupo muscular durante la respiración, al levantar peso o en el movimiento diario, el ejercicio puede terminar desconectado de la función real.</p><p>También he trabajado con mujeres cuyo suelo pélvico no está débil de la forma en que los Kegels asumen. Algunos suelos pélvicos ya están agarrotados en exceso, sostenidos en un estado crónico de tensión que más apretar solo empeora. Para esas mujeres, el trabajo más útil es aprender a soltar y alargar el suelo pélvico con la respiración, no tensarlo aún más. Por eso mismo no trato el trabajo del suelo pélvico como un ejercicio único prescrito de la misma manera para todas. Depende por completo de lo que ese cuerpo específico esté haciendo.</p><h2>Cómo Es Realmente la Coordinación</h2><p>En lo que realmente me enfoco con las clientas es en la coordinación. Puede el suelo pélvico alargarse ligeramente al inhalar y elevarse suavemente al exhalar, trabajando junto con el diafragma en lugar de de forma independiente. Puede esa coordinación mantenerse cuando añadimos movimiento, como una bisagra de cadera o subir un escalón, donde el suelo pélvico tiene que responder a la carga y no solo a una indicación. Puede manejar una tos o un estornudo sin una sensación de presión o pérdidas. Estas preguntas importan más que cuántos Kegels pueda hacer alguien seguidos.</p><p><span class="hl">El suelo pélvico no es un músculo para aislar, es un sistema para reintegrar</span>, de vuelta a la respiración, a la postura, a los movimientos cotidianos de agacharse a recoger cosas y volver a dejarlas durante todo el día con un niño pequeño en brazos. Esa reintegración requiere paciencia, y se ve diferente en cada persona según su parto, su historia, y cómo ha respondido su cuerpo hasta ahora.</p><p>Quiero dejar claro que no soy fisioterapeuta, y las molestias del suelo pélvico como pérdidas persistentes, dolor, pesadez, o una sensación de prolapso merecen una evaluación clínica adecuada, a menudo de un especialista en salud pélvica que pueda observar directamente lo que está ocurriendo. Mi función como coach es trabajar junto a esa atención médica, construyendo conciencia respiratoria, coordinación, y fuerza gradual una vez que la clienta entiende su propia situación. Los Kegels no están exactamente mal. Son solo una pequeña pieza de una imagen mucho más grande y personal que la mayoría de los consejos nunca llega a mencionar. Si quieres entender qué necesita realmente tu propio suelo pélvico, eso es exactamente lo que explica la <a href="/postpartum-recovery-guide">guía gratuita de recuperación posparto</a>.</p>`;

const FR_BODY = `<p>On dit généralement aux jeunes mères que les Kegels sont la première et la dernière chose à savoir sur la récupération du plancher pelvien. Serrer, tenir, répéter, et avec le temps les choses s'amélioreront. Je comprends pourquoi ce conseil se propage aussi facilement. C'est simple, cela ne nécessite aucun équipement, et cela semble aborder le problème directement. Mais en pratique, c'est une image incomplète de ce dont le plancher pelvien a réellement besoin.</p><h2>Le Plancher Pelvien Ne Fonctionne Pas de Façon Isolée</h2><p>Le plancher pelvien ne fonctionne pas de façon isolée. Il bouge en coordination avec le diaphragme, répondant à chaque respiration, et il fait partie d'un système de pression qui inclut les abdominaux profonds et le dos. Quand quelqu'un ne pratique que la contraction isolée, sans attention à la façon dont ce groupe musculaire se comporte réellement pendant la respiration, le port de charges ou le mouvement quotidien, l'exercice peut finir déconnecté de la fonction réelle.</p><p>J'ai aussi travaillé avec des femmes dont le plancher pelvien n'est pas faible de la façon dont les Kegels le supposent. Certains planchers pelviens sont déjà trop contractés, maintenus dans un état de tension chronique que davantage de contractions ne fait qu'aggraver. Pour ces femmes, le travail le plus utile consiste à apprendre à relâcher et allonger le plancher pelvien avec la respiration, pas à le contracter davantage. C'est exactement pourquoi je ne traite pas le travail du plancher pelvien comme un exercice unique prescrit de la même façon à toutes. Cela dépend entièrement de ce que ce corps spécifique est en train de faire.</p><h2>À Quoi Ressemble Vraiment la Coordination</h2><p>Ce sur quoi je me concentre réellement avec mes clientes, c'est la coordination. Le plancher pelvien peut-il s'allonger légèrement à l'inspiration et se soulever doucement à l'expiration, en travaillant avec le diaphragme plutôt qu'indépendamment de lui. Cette coordination tient-elle quand on ajoute du mouvement, comme une charnière de hanche ou monter une marche, où le plancher pelvien doit répondre à une charge plutôt qu'à une simple consigne. Peut-il gérer une toux ou un éternuement sans sensation de pression ou de fuite. Ces questions comptent plus que le nombre de Kegels que quelqu'un peut enchaîner.</p><p><span class="hl">Le plancher pelvien n'est pas un muscle à isoler, c'est un système à réintégrer</span>, dans la respiration, dans la posture, dans les mouvements ordinaires consistant à se pencher pour ramasser des choses et les reposer toute la journée avec un jeune enfant. Cette réintégration demande de la patience, et elle se présente différemment pour chaque personne selon son accouchement, son histoire, et la façon dont son corps a répondu jusqu'à présent.</p><p>Je tiens à préciser que je ne suis pas kinésithérapeute, et que les problèmes du plancher pelvien comme des fuites persistantes, des douleurs, une sensation de lourdeur ou de prolapsus méritent une véritable évaluation clinique, souvent par un ou une spécialiste de la santé pelvienne capable d'observer directement ce qui se passe. Mon rôle de coach est de travailler aux côtés de ce suivi médical, en construisant la conscience respiratoire, la coordination, et une force progressive une fois que la cliente comprend sa propre situation. Les Kegels ne sont pas vraiment faux. Ils ne sont qu'une petite pièce d'une image bien plus large et personnelle que la plupart des conseils n'abordent jamais. Si vous voulez comprendre ce dont votre propre plancher pelvien a réellement besoin, c'est exactement ce qu'explique le <a href="/postpartum-recovery-guide">guide gratuit de récupération post-partum</a>.</p>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'trabajo-de-piso-pelvico-mas-alla-de-los-kegels',
    title: 'Trabajo de Piso Pélvico Más Allá de los Kegels',
    meta: 'La recuperación del suelo pélvico tras el parto implica mucho más que los Kegels. La respiración y la coordinación importan igual.',
    keyword: 'recuperación suelo pélvico posparto',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'le-travail-du-plancher-pelvien-au-dela-des-kegels',
    title: 'Le Travail du Plancher Pelvien Au-Delà des Kegels',
    meta: 'La récupération du plancher pelvien après l’accouchement va bien au-delà des Kegels. La respiration et la coordination comptent autant.',
    keyword: 'récupération plancher pelvien post-partum',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'pelvic-floor-work-beyond-kegels', locale: 'en' });
  if (!english) throw new Error('English source post not found - run this only after confirming the slug.');

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
      categoryLabel: english.categoryLabel, // English label as a placeholder - the site's category system isn't locale-aware yet, matching the existing header/footer nav dropdown which also stays English for category names
      bodyHtml: tr.bodyHtml,
      readMins: english.readMins,
      status: 'draft',
      notes: `Pilot translation of "pelvic-floor-work-beyond-kegels" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
