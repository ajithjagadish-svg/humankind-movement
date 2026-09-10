// Small strings dictionary for site chrome that needs to render in the
// visitor's language - header/footer nav, blog listing/post page labels,
// and the blog subscribe widget. NOT for page body content (blog post
// bodyHtml, static marketing page copy) - those are translated in full,
// either as hand-written static HTML (es/, fr/ directories) or as their
// own BlogPost document (see models/BlogPost.js locale field).
//
// Every EJS view that includes header.ejs/footer.ejs/blog-subscribe-widget
// passes a `lang` local ('en' | 'es' | 'fr'); views that don't pass one
// default to 'en' so every existing English page keeps working unchanged.
const STRINGS = {
  en: {
    nav: {
      home: 'Home',
      philosophy: 'Philosophy',
      method: 'The Method',
      whoWeServe: 'Who We Serve',
      services: 'Services',
      journal: 'Journal',
      team: 'Team',
      contact: 'Contact',
    },
    footer: {
      tagline: 'Health before success. Awareness before action.',
      explore: 'Explore',
      contact: 'Contact',
      sendMessage: 'Send a message →',
      builtAlongside: 'Built alongside, not above.',
    },
    blog: {
      title: 'The Humankind Movement Blog',
      kicker: 'Writing',
      lede: 'Essays on movement, sleep, food, and time alone with self, the same four pillars the coaching is built on, worked through in writing. No listicles, no quick fixes, just the thinking behind the work.',
      minRead: 'min read',
      readThePost: 'Read the post',
      seeAll: 'See all',
      posts: 'posts',
      by: 'By',
      relatedPostsKicker: 'More on',
      relatedPostsTitle: 'Related posts',
      seeAllPosts: 'See all posts',
      backToJournal: '← Back to the Journal',
      readyToStart: 'Ready to start?',
      readyToStartSub: 'The thinking is here. The coaching is where it becomes practice.',
      bookIntroCall: 'Book Intro Call — ₹1,000 (~$11)',
      getInTouch: 'Get in touch',
      alsoAvailableIn: 'Also available in',
      noPostsYet: 'No posts here yet - check back soon.',
      allTopics: '← All Journal topics',
      journalKicker: 'Journal',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      philosophy: 'Filosofía',
      method: 'El Método',
      whoWeServe: 'A Quién Servimos',
      services: 'Servicios',
      journal: 'Diario',
      team: 'Equipo',
      contact: 'Contacto',
    },
    footer: {
      tagline: 'La salud antes que el éxito. La conciencia antes que la acción.',
      explore: 'Explorar',
      contact: 'Contacto',
      sendMessage: 'Enviar un mensaje →',
      builtAlongside: 'Construido junto a ti, no por encima.',
    },
    blog: {
      title: 'El Diario de Humankind Movement',
      kicker: 'Escritos',
      lede: 'Ensayos sobre movimiento, sueño, alimentación y tiempo a solas con uno mismo, los mismos cuatro pilares sobre los que se construye el coaching, trabajados por escrito. Sin listas rápidas, sin soluciones instantáneas, solo el pensamiento detrás del trabajo.',
      minRead: 'min de lectura',
      readThePost: 'Leer el artículo',
      seeAll: 'Ver todos los artículos de',
      posts: '',
      by: 'Por',
      relatedPostsKicker: 'Más sobre',
      relatedPostsTitle: 'Artículos relacionados',
      seeAllPosts: 'Ver todos los artículos',
      backToJournal: '← Volver al Diario',
      readyToStart: '¿Listo para empezar?',
      readyToStartSub: 'El pensamiento está aquí. El coaching es donde se convierte en práctica.',
      bookIntroCall: 'Reservar Llamada Inicial — ₹1.000 (~$11)',
      getInTouch: 'Ponte en contacto',
      alsoAvailableIn: 'También disponible en',
      noPostsYet: 'Todavía no hay artículos aquí, vuelve pronto.',
      allTopics: '← Todos los temas del Diario',
      journalKicker: 'Diario',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      philosophy: 'Philosophie',
      method: 'La Méthode',
      whoWeServe: 'À Qui Nous Servons',
      services: 'Services',
      journal: 'Journal',
      team: 'Équipe',
      contact: 'Contact',
    },
    footer: {
      tagline: "La santé avant la réussite. La conscience avant l'action.",
      explore: 'Explorer',
      contact: 'Contact',
      sendMessage: 'Envoyer un message →',
      builtAlongside: 'Construit à vos côtés, pas au-dessus.',
    },
    blog: {
      title: 'Le Journal de Humankind Movement',
      kicker: 'Écrits',
      lede: "Essais sur le mouvement, le sommeil, l'alimentation et le temps seul avec soi-même, les quatre mêmes piliers sur lesquels repose le coaching, développés par écrit. Pas de listes rapides, pas de solutions instantanées, juste la réflexion derrière le travail.",
      minRead: 'min de lecture',
      readThePost: "Lire l'article",
      seeAll: 'Voir tous les articles',
      posts: '',
      by: 'Par',
      relatedPostsKicker: 'Plus sur',
      relatedPostsTitle: 'Articles similaires',
      seeAllPosts: 'Voir tous les articles',
      backToJournal: '← Retour au Journal',
      readyToStart: 'Prêt à commencer ?',
      readyToStartSub: "La réflexion est là. Le coaching, c'est là où elle devient pratique.",
      bookIntroCall: "Réserver l'Appel Initial — ₹1 000 (~11 $)",
      getInTouch: 'Nous contacter',
      alsoAvailableIn: 'Également disponible en',
      noPostsYet: "Aucun article ici pour l'instant, revenez bientôt.",
      allTopics: '← Tous les sujets du Journal',
      journalKicker: 'Journal',
    },
  },
};

function t(lang) {
  return STRINGS[lang] || STRINGS.en;
}

module.exports = { t };
