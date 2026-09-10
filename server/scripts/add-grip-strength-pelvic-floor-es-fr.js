// Spanish/French translations of "What Grip Strength Reveals About Pelvic
// Floor Recovery" (#8 by real pageviews - postpartum pillar). Translated by
// Claude, not a native-speaker professional - see notes on the pilot
// translation (add-pelvic-floor-work-beyond-kegels-es-fr.js) for the same
// caveat. Internal link points to the locale-prefixed /es/services/ and
// /fr/services/ postpartum-support page, which already exists as a
// translated static page. Study citation (author names, journal, DOI) kept
// in English per academic convention; surrounding text translated.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ES_BODY = `<p>¿Haces todos los ejercicios posparto correctos y aun así sientes que falta algo? Esa pieza que falta podría estar, en realidad, en tus manos.</p><p>Una clienta me preguntó por qué su fisioterapeuta le midió la fuerza de agarre durante un seguimiento del piso pélvico. Pensó que era un error, ficha equivocada, parte del cuerpo equivocada. No lo era. La fuerza de agarre de la mano y la fuerza del piso pélvico aparecen juntas en la investigación con la frecuencia suficiente como para que algunas clínicas usen una prueba de agarre como filtro rápido antes de un examen pélvico más detallado.</p><h2>Qué Es lo Que Realmente Conecta a Ambas</h2><p>La explicación intuitiva a la que la gente recurre es algún tipo de conexión mecánica directa, tensión que viaja de la mano a través de la fascia hasta la pelvis. Ese mecanismo específico no es lo que muestra la investigación. En el estudio más grande sobre esto, que examinó a 929 mujeres en una clínica ambulatoria de ginecología, la fuerza de agarre estuvo asociada de forma independiente con una fuerza normal del piso pélvico, incluso después de tener en cuenta el historial de partos, la circunferencia de cintura y cuánto tiempo del día pasaba sentada la persona.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup> Estudios más pequeños han encontrado el mismo patrón usando distintas herramientas de medición, incluida la electromiografía directa del piso pélvico.</p><p><span class="hl">La conexión no es que tu mano le hable a tu pelvis. Es que ambas están reportando lo mismo, la fuerza neuromuscular general de tu cuerpo.</span> Una lectura más baja de fuerza de agarre y una menor fuerza del piso pélvico tienden a aparecer juntas no porque una cause la otra, sino porque ambas dependen de la misma reserva de fuerza de todo el cuerpo, la misma razón por la que la fuerza de agarre ya se usa como marcador general de fragilidad y pérdida muscular en adultos mayores, muy lejos de cualquier conversación sobre la pelvis.</p><h2>Para Qué Sirve Realmente Esto</h2><p>Ninguno de los estudios detrás de esto se hizo específicamente en mujeres posparto, y ninguno midió la fuerza de agarre en un momento dado para predecir problemas del piso pélvico más adelante. Lo que muestran es una correlación puntual, no una predicción. Pero el posparto es exactamente el periodo en el que la fatiga neuromuscular de todo el cuerpo es común, el sueño está alterado, y la fuerza general normalmente ha bajado desde donde estaba. Ese es el mismo estado que la investigación asocia con una menor fuerza del piso pélvico.</p><p>Así que una simple prueba de agarre es un dato legítimo y de bajo esfuerzo en el coaching posparto, una cosa más que vale la pena observar junto con cómo respira alguien, cómo carga una sentadilla, cómo responde su core bajo carga. Nunca iba a reemplazar una evaluación real del piso pélvico, y no lo intenta. Es una señal honesta más sobre cómo está el sistema completo, no un diagnóstico por sí sola.</p><p>Si estás reconstruyendo fuerza en el posparto y quieres esa mirada de todo el sistema en lugar de un solo músculo evaluado de forma aislada, eso es justamente lo que trabaja el <a href="/es/services/postpartum-support">coaching posparto</a>.</p><div class="footnotes"><ol><li id="fn1">Zhu HM, Gao L, Xie B, Jiao W, Sun XL. [Investigation and influencing factors on pelvic floor muscle strength of 929 adult females in gynecological outpatient department]. <em>Zhonghua Fu Chan Ke Za Zhi.</em> 2023;58(5):351-358. <a href="https://doi.org/10.3760/cma.j.cn112141-20230306-00100" target="_blank" rel="noopener">doi:10.3760/cma.j.cn112141-20230306-00100</a>. Una asociación transversal en pacientes ambulatorias de ginecología general, no un estudio específico posparto ni predictivo, citado aquí por la correlación en sí, no como evidencia de un vínculo causal o prospectivo. <a href="#fnref1">↩</a></li></ol></div>`;

const FR_BODY = `<p>Faites-vous tous les bons exercices post-partum et avez-vous quand même l'impression qu'il manque quelque chose ? Ce qui manque pourrait bien se trouver dans vos mains.</p><p>Une cliente m'a demandé pourquoi sa kinésithérapeute avait testé sa force de préhension pendant un suivi du plancher pelvien. Elle pensait à une erreur, mauvais dossier, mauvaise partie du corps. Ce n'en était pas une. La force de préhension de la main et la force du plancher pelvien apparaissent ensemble dans la recherche assez souvent pour que certaines cliniques utilisent un test de préhension comme dépistage rapide avant un examen pelvien plus approfondi.</p><h2>Ce Qui Relie Vraiment les Deux</h2><p>L'explication intuitive à laquelle les gens pensent est un lien mécanique direct, une tension qui voyagerait de la main jusqu'au bassin via le fascia. Ce mécanisme précis n'est pas ce que montre la recherche. Dans la plus grande étude sur le sujet, portant sur 929 femmes dans une clinique gynécologique ambulatoire, la force de préhension était associée de manière indépendante à une force normale du plancher pelvien, même après avoir tenu compte des antécédents d'accouchement, du tour de taille et du temps passé assise dans la journée.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup> Des études plus petites ont trouvé le même schéma avec d'autres outils de mesure, y compris l'électromyographie directe du plancher pelvien.</p><p><span class="hl">Le lien, ce n'est pas que la main parle au bassin. C'est que les deux rendent compte de la même chose, la force neuromusculaire globale du corps.</span> Une force de préhension plus faible et une force du plancher pelvien plus faible ont tendance à apparaître ensemble non pas parce que l'une cause l'autre, mais parce que les deux dépendent de la même réserve de force globale du corps, la même raison pour laquelle la force de préhension sert déjà de marqueur général de fragilité et de perte musculaire chez les personnes âgées, bien loin de toute conversation sur le bassin.</p><h2>À Quoi Cela Sert Vraiment</h2><p>Aucune des études derrière cela n'a été menée spécifiquement chez des femmes post-partum, et aucune n'a suivi la force de préhension à un moment donné pour prédire des problèmes de plancher pelvien plus tard. Ce qu'elles montrent, c'est une corrélation à un instant donné, pas une prédiction. Mais le post-partum est exactement la période où la fatigue neuromusculaire globale est fréquente, le sommeil est perturbé, et la force globale a généralement baissé par rapport à avant. C'est le même état que la recherche associe à une force du plancher pelvien plus faible.</p><p>Un simple test de préhension est donc une donnée légitime et peu coûteuse en coaching post-partum, une chose de plus qui vaut la peine d'être observée aux côtés de la respiration, de la façon de charger un squat, de la réponse du centre sous charge. Il n'a jamais eu vocation à remplacer une véritable évaluation du plancher pelvien, et ce n'est pas son but. C'est un signal honnête de plus sur l'état du système dans son ensemble, pas un diagnostic à lui seul.</p><p>Si vous reconstruisez votre force en post-partum et souhaitez cette vision globale plutôt qu'un seul muscle évalué isolément, c'est exactement ce sur quoi repose le <a href="/fr/services/postpartum-support">coaching post-partum</a>.</p><div class="footnotes"><ol><li id="fn1">Zhu HM, Gao L, Xie B, Jiao W, Sun XL. [Investigation and influencing factors on pelvic floor muscle strength of 929 adult females in gynecological outpatient department]. <em>Zhonghua Fu Chan Ke Za Zhi.</em> 2023;58(5):351-358. <a href="https://doi.org/10.3760/cma.j.cn112141-20230306-00100" target="_blank" rel="noopener">doi:10.3760/cma.j.cn112141-20230306-00100</a>. Une association transversale chez des patientes de gynécologie générale en ambulatoire, pas une étude spécifiquement post-partum ni prédictive, citée ici pour la corrélation elle-même, pas comme preuve d'un lien causal ou prospectif. <a href="#fnref1">↩</a></li></ol></div>`;

const TRANSLATIONS = [
  {
    locale: 'es',
    slug: 'lo-que-la-fuerza-de-agarre-revela-sobre-el-piso-pelvico',
    title: 'Lo Que la Fuerza de Agarre Revela Sobre el Piso Pélvico',
    meta: 'Un coach explica qué muestra realmente la investigación que vincula la fuerza de agarre con la fuerza del piso pélvico posparto.',
    keyword: 'fuerza de agarre piso pélvico',
    bodyHtml: ES_BODY,
  },
  {
    locale: 'fr',
    slug: 'ce-que-la-force-de-prehension-revele-sur-le-plancher-pelvien',
    title: 'Ce Que la Force de Préhension Révèle Sur le Plancher Pelvien',
    meta: 'Un coach explique ce que montre vraiment la recherche reliant la force de préhension à la force du plancher pelvien post-partum.',
    keyword: 'force de préhension plancher pelvien',
    bodyHtml: FR_BODY,
  },
];

async function main() {
  await connectDB();

  const english = await BlogPost.findOne({ slug: 'what-grip-strength-reveals-about-pelvic-floor-recovery', locale: 'en' });
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
      notes: `Translation of "what-grip-strength-reveals-about-pelvic-floor-recovery" (English, published post ${english._id}). Translated by Claude, not yet reviewed by a native speaker - hold at draft until reviewed.`,
    });

    console.log(`Created ${tr.locale} translation:`, post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
