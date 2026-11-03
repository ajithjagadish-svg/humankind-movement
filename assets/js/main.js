(function () {
  var posthogScript = document.createElement("script");
  posthogScript.src = "/assets/js/posthog-init.js";
  document.head.appendChild(posthogScript);
}());

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.primary");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  document.querySelectorAll(".lang-switch a[data-lang]").forEach(function (a) {
    a.addEventListener("click", function () {
      localStorage.setItem("hk_lang_pref", a.dataset.lang);
    });
  });

  // Conversion tracking, delegated so it covers every "Book a Discovery
  // Call" link and blog-to-coaching-page link sitewide without having to
  // wire up each one individually.
  var CORE_PATHS = ["/about", "/philosophy", "/the-method", "/who-we-serve", "/services", "/services/one-to-one-coaching", "/services/postpartum-support", "/services/neurodivergent-coaching", "/services/workshops", "/services/corporate-wellbeing", "/contact", "/intake"];

  function trackEvent(name, params) {
    if (typeof gtag === "function") gtag("event", name, params);
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(name, params);
    }
  }

  function audienceFor(path) {
    if (path.indexOf("/services/postpartum-support") === 0 || path.indexOf("/postpartum-recovery-guide") === 0) return "postpartum";
    if (path.indexOf("/services/neurodivergent-coaching") === 0) return "neurodivergent";
    if (path.indexOf("/services/corporate-wellbeing") === 0) return "corporate";
    if (path.indexOf("/services/one-to-one-coaching") === 0) return "one_to_one";
    return "general";
  }

  // Sticky "Book an intro call" bar for phones, on English service pages and
  // blog posts. Reuses the page's own intro-call WhatsApp link so each page
  // sends its own message. Appears after a scroll, hides while the page's
  // own button is on screen.
  (function () {
    var p = window.location.pathname.replace(/\.html$/, "");
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var isService = /^\/services\/(index|one-to-one-coaching|postpartum-support|neurodivergent-coaching)?\/?$/.test(p) || p === "/services";
    var isPost = /^\/blog\/[^\/]+$/.test(p);
    if (lang !== "en" || !(isService || isPost)) return;
    if (!window.matchMedia || !window.IntersectionObserver) return;
    var sources = [].slice.call(document.querySelectorAll('a.btn[href*="wa.me/919844059292"][href*="1%2C000"]'));
    if (!sources.length) return;
    var source = sources[sources.length - 1];
    var bar = document.createElement("div");
    bar.className = "sticky-cta";
    var a = document.createElement("a");
    a.className = "btn";
    a.href = source.href;
    a.target = "_blank";
    a.rel = "noopener";
    a.dataset.gaEvent = "sticky_intro_call_click";
    a.dataset.audience = source.dataset.audience || audienceFor(p);
    a.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413A11.815 11.815 0 0012.05 0zm0 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm5.422-7.403c-.298-.149-1.759-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg> Book an intro call: ₹1,000';
    bar.appendChild(a);
    document.body.appendChild(bar);
    var scrolled = false, ownVisible = false, inView = new Set();
    function update() { bar.classList.toggle("is-visible", scrolled && !ownVisible); }
    window.addEventListener("scroll", function () { scrolled = window.scrollY > 500; update(); }, { passive: true });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) inView.add(en.target); else inView.delete(en.target); });
      ownVisible = inView.size > 0;
      update();
    });
    sources.forEach(function (s) { io.observe(s); });
  })();

  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link) return;

    if (link.href.indexOf("wa.me/") !== -1) {
      trackEvent("generate_lead", { page_path: window.location.pathname, audience: link.dataset.audience || audienceFor(window.location.pathname), method: "whatsapp" });
    }

    if (link.dataset.gaEvent) {
      trackEvent(link.dataset.gaEvent, { link_page: window.location.pathname });
      return;
    }

    if (link.href.indexOf("calendar.app.google") !== -1) {
      trackEvent("book_call_click", { link_page: window.location.pathname });
      return;
    }

    if (window.location.pathname.indexOf("/blog/") === 0 && CORE_PATHS.indexOf(link.pathname) !== -1) {
      trackEvent("blog_to_coaching_click", { link_path: link.pathname, from_path: window.location.pathname });
    }
  });
});
