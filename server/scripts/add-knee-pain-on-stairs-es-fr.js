// Spanish/French translations of "Why Your Knees Hurt More on the First Few
// Stairs" (#4 by real pageviews - movement pillar, first non-postpartum/sleep
// post translated). Translated by Claude, not a native-speaker professional -
// see notes on the pilot translation (add-pelvic-floor-work-beyond-kegels-es-fr.js)
// for the same caveat. Internal link points to the locale-prefixed
// /es/services/ and /fr/services/ one-to-one-coaching page, which already
// exists as a translated static page.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>Una clienta describió una vez su dolor de rodilla como aleatorio. Bien algunas mañanas, agudo otras, sin ningún patrón que pudiera identificar. No era aleatorio. Era la diferencia entre una articulación que ya había estado en movimiento ese día y una que había estado quieta, y las escaleras tienen una forma de exponer exactamente en cuál de las dos te encuentras.</p><p>El consejo que la mayoría recibe para el dolor de rodilla en las escaleras tiene que ver con la técnica. Gira los pies hacia afuera. Da pasos más amplios. Agárrate del pasamanos. Empieza con la pierna más fuerte. Todo eso puede ayudar de verdad, y yo uso versiones de esto con mis clientes regularmente. Pero trata las escaleras como el problema a resolver, cuando para mucha gente la pregunta más útil es en qué estado estaba la rodilla justo antes de empezar a subir.</p><h2>Por Qué Cambiar Cómo Subes No Es Suficiente</h2><p>El cartílago no tiene suministro de sangre propio. Depende del movimiento de la articulación para distribuir el líquido sinovial por su superficie y mantenerlo lubricado, de la misma forma en que una bisagra necesita moverse un poco antes de dejar de chirriar. Una articulación que ha estado quieta un rato, a primera hora de la mañana, después de un vuelo largo, tras horas frente al escritorio, todavía no ha tenido tiempo de redistribuir ese líquido. Los primeros pasos de una subida suelen cargar la articulación antes de que eso se ponga al día, lo que explica en parte por qué el primer tramo de escaleras puede doler más que el quinto.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p><p><span class="hl">La rodilla que duele en los primeros escalones no es necesariamente más débil que la que no duele. Simplemente está menos preparada.</span> Cambiar cómo subes no resuelve eso. Solo le pide a una articulación que todavía está fría que haga el mismo trabajo con más cuidado.</p><h2>Una Forma Sencilla de Preparar la Rodilla Antes de Moverte</h2><p>Lo que hago con mis clientes en su lugar, antes de una subida que saben que les va a molestar, es algo mucho más pequeño que un ejercicio. Acostada o sentada, levanta la pierna ligeramente del suelo, sin necesidad de altura real, y estira y flexiona la rodilla lentamente unas cuantas veces, sin peso. Hazlo otra vez con los dedos de los pies rotados hacia adentro, y otra vez hacia afuera. Toma menos de un minuto. No es un tratamiento para la artritis y no va a arreglar una articulación que necesita atención médica. Se parece más a estirar los dedos antes de empezar a escribir, un pequeño movimiento que le pide a la articulación que recorra su rango antes de tener que cargar peso.</p><p>La mayoría nota la diferencia ya en el siguiente tramo de escaleras, no porque algo se haya fortalecido en treinta segundos, sino porque la articulación llegó a las escaleras ya en movimiento en lugar de tener que empezar a moverse y cargar peso al mismo tiempo.</p><p>Esta es la misma distinción a la que vuelvo en casi todo lo que hago como coach. Hay dos formas de lidiar con un movimiento que duele. Puedes cambiar el movimiento, o puedes preparar el cuerpo para el movimiento que de todas formas iba a hacer. Ambas son válidas. Pero si la única herramienta que te han dado siempre es la primera, pasos más amplios, un pasamanos, ir más despacio, seguirás manejando el dolor sin llegar a descubrir cuánto de él en realidad no tenía que ver con las escaleras.</p><p><a href="/es/services/one-to-one-coaching">Descubre cómo funciona el coaching individual</a></p><div class="footnotes"><ol><li id="fn1">Ingram KR, Wann AKT, Angel CK, Coleman PJ, Levick JR. Cyclic movement stimulates hyaluronan secretion into the synovial cavity of rabbit joints. <em>J Physiol.</em> 2008;586(6):1715-1729. <a href="https://doi.org/10.1113/jphysiol.2007.146753" target="_blank" rel="noopener">doi:10.1113/jphysiol.2007.146753</a>. El hallazgo proviene de un modelo animal (articulación de conejo); se cita aquí por el mecanismo general (secreción de lubricante ligada al movimiento), no como una afirmación directa sobre resultados de dolor de rodilla en humanos. <a href="#fnref1">↩</a></li></ol></div>`;

const FR_BODY = `<p>Une cliente a un jour décrit sa douleur au genou comme aléatoire. Bien certains matins, vive d'autres fois, sans schéma qu'elle pouvait identifier. Ce n'était pas aléatoire. C'était la différence entre une articulation qui avait déjà bougé ce jour-là et une qui était restée immobile, et les escaliers ont une façon de révéler exactement laquelle des deux on a sous les pieds.</p><p>Le conseil que la plupart des gens reçoivent pour la douleur au genou dans les escaliers porte sur la technique. Tournez les pieds vers l'extérieur. Faites des pas plus larges. Tenez la rampe. Commencez par la jambe la plus forte. Tout cela peut vraiment aider, et j'utilise des versions de ces conseils régulièrement avec mes clients. Mais cela traite les escaliers comme le problème à résoudre, alors que pour beaucoup de gens, la question la plus utile est dans quel état se trouvait le genou juste avant de commencer à monter.</p><h2>Pourquoi Changer Sa Façon de Monter Ne Suffit Pas</h2><p>Le cartilage n'a pas son propre apport sanguin. Il dépend du mouvement de l'articulation pour répartir le liquide synovial sur sa surface et le garder lubrifié, un peu comme une charnière doit bouger un peu avant d'arrêter de grincer. Une articulation restée immobile un moment, au réveil, après un long vol, après des heures de bureau, n'a pas encore eu le temps de redistribuer ce liquide. Les premières marches d'une montée sollicitent souvent l'articulation avant que cela ne se mette à jour, ce qui explique en partie pourquoi le premier escalier peut faire plus mal que le cinquième.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p><p><span class="hl">Le genou qui fait mal dans les premières marches n'est pas nécessairement plus faible que celui qui ne fait pas mal. Il est simplement moins préparé.</span> Changer sa façon de monter ne règle pas cela. Cela demande simplement à une articulation encore froide de faire le même travail avec plus de précaution.</p><h2>Une Façon Simple de Préparer le Genou Avant de Bouger</h2><p>Ce que je fais faire à mes clients à la place, avant une montée qu'ils savent susceptible de les gêner, est quelque chose de bien plus modeste qu'un exercice. Allongé ou assis, soulevez légèrement la jambe du sol, sans réelle hauteur nécessaire, et étendez puis pliez lentement le genou quelques fois, sans charge. Refaites-le avec les orteils tournés vers l'intérieur, puis vers l'extérieur. Cela prend moins d'une minute. Ce n'est pas un traitement contre l'arthrite et cela ne réparera pas une articulation qui nécessite une attention médicale. C'est plus proche de ce que fait l'étirement des doigts avant de commencer à taper, un petit mouvement qui demande à l'articulation de parcourir son amplitude avant d'avoir à porter du poids.</p><p>La plupart des gens remarquent la différence dès l'escalier suivant, non pas parce que quelque chose s'est renforcé en trente secondes, mais parce que l'articulation est arrivée aux marches déjà en mouvement, au lieu de devoir commencer à bouger et porter du poids en même temps.</p><p>C'est la même distinction à laquelle je reviens dans presque tout ce que j'enseigne. Il y a deux façons de gérer un mouvement qui fait mal. On peut changer le mouvement, ou préparer le corps au mouvement qu'il allait de toute façon faire. Les deux sont légitimes. Mais si le seul outil qu'on vous a jamais donné est le premier, des pas plus larges, une rampe, aller plus lentement, vous continuerez à gérer la douleur sans jamais découvrir à quel point elle n'avait, en réalité, pas grand-chose à voir avec les escaliers.</p><p><a href="/fr/services/one-to-one-coaching">Découvrez comment fonctionne le coaching individuel</a></p><div class="footnotes"><ol><li id="fn1">Ingram KR, Wann AKT, Angel CK, Coleman PJ, Levick JR. Cyclic movement stimulates hyaluronan secretion into the synovial cavity of rabbit joints. <em>J Physiol.</em> 2008;586(6):1715-1729. <a href="https://doi.org/10.1113/jphysiol.2007.146753" target="_blank" rel="noopener">doi:10.1113/jphysiol.2007.146753</a>. Ce résultat provient d'un modèle animal (articulation de lapin) ; il est cité ici pour le mécanisme général (sécrétion de lubrifiant liée au mouvement), pas comme une affirmation directe sur les résultats de douleur au genou chez l'humain. <a href="#fnref1">↩</a></li></ol></div>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'por-que-duelen-mas-las-rodillas-en-los-primeros-escalones',
    title: 'Por Qué Duelen Más las Rodillas en los Primeros Escalones',
    meta: 'Un coach en biomecánica explica por qué el dolor de rodilla empeora en los primeros escalones y por qué preparar la articulación importa tanto.',
    keyword: 'dolor de rodilla en escaleras',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'pourquoi-les-genoux-font-plus-mal-dans-les-premieres-marches',
    title: 'Pourquoi les Genoux Font Plus Mal dans les Premières Marches',
    meta: "Un coach en biomécanique explique pourquoi la douleur au genou est pire dans les premières marches, et pourquoi préparer l'articulation compte autant.",
    keyword: 'douleur au genou dans les escaliers',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'knee-pain-on-stairs', locale: 'en' });
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
      notes: `Translation of "knee-pain-on-stairs" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
