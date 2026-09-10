// Spanish/French translations of "Chrononutrition: It Is Not Just What You
// Eat, It Is When" (#5 by real pageviews - food pillar). Translated by
// Claude, not a native-speaker professional - see notes on the pilot
// translation (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same
// caveat. Internal link points to the locale-prefixed /es/services/ and
// /fr/services/ one-to-one-coaching page, which already exists as a
// translated static page. Study titles/journal names/DOIs kept in English
// per academic citation convention; surrounding text translated.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>Recibo alguna versión de la misma pregunta sobre nutrición de casi todos mis clientes: qué debería comer. Resulta que una pregunta distinta, menos común, importa igual de mucho, y un metaanálisis publicado este año por fin puso números reales detrás de ella: cuándo debería comer.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p><h2>Lo Que Realmente Encontró la Investigación</h2><p>Los investigadores revisaron más de 55.000 publicaciones y se quedaron con 44 estudios de intervención en humanos que comparaban directamente comer más temprano frente a comer más tarde en relación con los resultados de azúcar en sangre. En los estudios más cortos, de hasta una semana, comer más temprano en el día redujo significativamente tanto el pico de glucosa después de la comida como la lectura de glucosa a las dos horas, en comparación con comer la misma comida más tarde en el día. La glucosa en ayunas también tendió a ser más baja al comer más temprano, incluso en el puñado de estudios más largos que duraron varias semanas.</p><p>Quiero ser honesto sobre lo que esto muestra y lo que no. El efecto se mantuvo claro en los estudios cortos, pero se debilitó en los más largos, y los investigadores fueron directos al decir que las diferencias en el diseño de los estudios eran lo bastante grandes como para no llamarlo todavía una base para guías clínicas. Este es un patrón real, fisiológicamente plausible, no una regla establecida sobre la cual construir un plan de alimentación.</p><h2>Por Qué el Momento Importa</h2><p>El mecanismo probable no es un misterio. Tanto la sensibilidad a la insulina como la función de las células beta del páncreas siguen un ritmo diario, ligado al mismo reloj interno que rige el sueño, el cortisol y la melatonina. Un ensayo aleatorizado independiente en adultos con diabetes tipo 2 de inicio reciente encontró que reducir la ventana de alimentación a cuatro horas, ubicada más temprano en el día, mejoró la función de las células beta en un 14 por ciento y redujo la resistencia hepática a la insulina en un margen similar a lo largo de seis semanas, junto con caídas medibles en el azúcar en sangre y la circunferencia de cintura.<sup class="fn"><a href="#fn2" id="fnref2">2</a></sup> Tu cuerpo no está igual de preparado para manejar la misma comida a las 8am que a las 10pm, y hacia la noche esa preparación suele haber disminuido.</p><h2>Qué Significa Esto Realmente Para Cómo Comes</h2><p><span class="hl">Nada de esto es un argumento a favor de un horario de comidas rígido, ni para reducir tu ventana de alimentación a cuatro horas por tu cuenta.</span> Los clientes que más aprovechan esto eligen una sola palanca y la mantienen constante, no cinco a la vez: una primera comida consistente en lugar de saltarse el desayuno algunos días sí y otros no, o adelantar la última comida del día aunque sea 60 a 90 minutos. Los cambios pequeños y consistentes en el horario suelen superar a los cambios ocasionales y agresivos.</p><p>Esto es una de las primeras cosas que reviso con clientes que trabajan en <a href="/es/services/one-to-one-coaching">coaching individual</a> sobre energía, sueño y salud metabólica, mucho antes de hablar de eliminar nada. Si tienes curiosidad por saber dónde está realmente tu propio ritmo de alimentación, ahí es normalmente donde empieza la conversación.</p><div class="footnotes"><ol><li id="fn1">"Effects of timing of meal intake on glucose metabolism: a systematic review and meta-analysis of human intervention studies," Nutrition, Metabolism and Cardiovascular Diseases (2026). <a href="https://doi.org/10.1016/j.numecd.2026.104878" target="_blank" rel="noopener">Leer el estudio</a> <a href="#fnref1">↩</a></li><li id="fn2">"Effect of Time-Restricted Eating on beta-Cell Function in Adults With Type 2 Diabetes," The Journal of Clinical Endocrinology &amp; Metabolism (2025). <a href="https://doi.org/10.1210/clinem/dgae594" target="_blank" rel="noopener">Leer el estudio</a> <a href="#fnref2">↩</a></li></ol></div>`;

const FR_BODY = `<p>Je reçois une version ou une autre de la même question nutritionnelle de la part de presque tous mes clients : que devrais-je manger. Une question différente, moins courante, s'avère tout aussi importante, et une méta-analyse publiée cette année a enfin apporté de vrais chiffres à l'appui : quand devrais-je manger.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p><h2>Ce Que la Recherche a Vraiment Trouvé</h2><p>Les chercheurs ont examiné plus de 55 000 publications et ont retenu 44 études d'intervention chez l'humain comparant directement une alimentation plus précoce à une alimentation plus tardive en lien avec la glycémie. Dans les essais plus courts, jusqu'à une semaine, manger plus tôt dans la journée réduisait significativement à la fois le pic de glycémie après le repas et la mesure à deux heures, par rapport à un repas identique pris plus tard dans la journée. La glycémie à jeun avait aussi tendance à être plus basse avec une alimentation plus précoce, même dans la poignée d'essais plus longs qui duraient plusieurs semaines.</p><p>Je veux être honnête sur ce que cela montre et ce que cela ne montre pas. L'effet s'est maintenu clairement dans les études courtes, mais s'est affaibli dans les plus longues, et les chercheurs ont clairement indiqué que les différences de conception des études étaient trop importantes pour en faire, à ce stade, une base de recommandations cliniques. C'est un schéma réel, physiologiquement plausible, pas une règle établie sur laquelle construire un plan alimentaire.</p><h2>Pourquoi le Moment Compte</h2><p>Le mécanisme probable n'a rien de mystérieux. La sensibilité à l'insuline et la fonction des cellules bêta du pancréas suivent toutes deux un rythme quotidien, lié à la même horloge interne qui régit le sommeil, le cortisol et la mélatonine. Un essai randomisé distinct chez des adultes atteints de diabète de type 2 récent a montré que réduire la fenêtre alimentaire à quatre heures, positionnée plus tôt dans la journée, améliorait la fonction des cellules bêta de 14 % et réduisait la résistance hépatique à l'insuline dans une marge similaire sur six semaines, avec des baisses mesurables de la glycémie et du tour de taille.<sup class="fn"><a href="#fn2" id="fnref2">2</a></sup> Votre corps n'est pas aussi bien préparé à gérer le même repas à 8h qu'à 22h, et le soir venu, cette préparation a généralement diminué.</p><h2>Ce Que Cela Signifie Vraiment Pour Votre Façon de Manger</h2><p><span class="hl">Rien de tout cela ne plaide pour un horaire de repas rigide, ni pour réduire votre fenêtre alimentaire à quatre heures de votre propre initiative.</span> Les clients qui en tirent le plus choisissent un seul levier et le maintiennent stable, pas cinq à la fois : un premier repas régulier plutôt que sauter le petit-déjeuner certains jours et pas d'autres, ou avancer le dernier repas de la journée, même de 60 à 90 minutes. De petits ajustements constants dans le timing ont tendance à surpasser des changements occasionnels et agressifs.</p><p>C'est l'une des premières choses que j'examine avec les clients qui travaillent en <a href="/fr/services/one-to-one-coaching">coaching individuel</a> sur l'énergie, le sommeil et la santé métabolique, bien avant de parler de supprimer quoi que ce soit. Si vous êtes curieux de savoir où se situe réellement votre propre rythme alimentaire, c'est généralement là que commence la conversation.</p><div class="footnotes"><ol><li id="fn1">"Effects of timing of meal intake on glucose metabolism: a systematic review and meta-analysis of human intervention studies," Nutrition, Metabolism and Cardiovascular Diseases (2026). <a href="https://doi.org/10.1016/j.numecd.2026.104878" target="_blank" rel="noopener">Lire l'étude</a> <a href="#fnref1">↩</a></li><li id="fn2">"Effect of Time-Restricted Eating on beta-Cell Function in Adults With Type 2 Diabetes," The Journal of Clinical Endocrinology &amp; Metabolism (2025). <a href="https://doi.org/10.1210/clinem/dgae594" target="_blank" rel="noopener">Lire l'étude</a> <a href="#fnref2">↩</a></li></ol></div>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'crononutricion-no-es-solo-que-comes-es-cuando',
    title: 'Crononutrición: No Es Solo Qué Comes, Es Cuándo',
    meta: 'Un metaanálisis de 2026 con 44 ensayos en humanos halló que comer más temprano reduce los picos de azúcar en sangre frente a comer tarde.',
    keyword: 'crononutrición horario de comidas',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'chrononutrition-ce-nest-pas-que-quoi-manger-cest-quand',
    title: "Chrononutrition : Ce N'Est Pas Que Quoi Manger, C'Est Quand",
    meta: "Une méta-analyse 2026 de 44 essais chez l'humain montre que manger plus tôt réduit significativement les pics de glycémie par rapport à manger tard.",
    keyword: 'chrononutrition horaire des repas',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'chrononutrition-it-is-not-just-what-you-eat-it-is-when', locale: 'en' });
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
      notes: `Translation of "chrononutrition-it-is-not-just-what-you-eat-it-is-when" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
