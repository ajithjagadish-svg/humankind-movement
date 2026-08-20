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

  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link) return;

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
