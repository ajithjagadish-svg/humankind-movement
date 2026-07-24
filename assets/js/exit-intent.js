// Reusable exit-intent popup. Drop this script tag on any landing page with
// data attributes to configure it - no markup duplication, no page-specific
// code required.
//
// <script src="assets/js/exit-intent.js"
//   data-storage-key="exit-intent-seen-<resource>"
//   data-headline="Wait, don't leave without your free guide"
//   data-body="Enter your email and it's yours."
//   data-cta-text="Get My Free Guide"
//   data-scroll-target="#guide-form"
//   data-success-selector="#guide-form .form-status.ok"
// ></script>
//
// Behaviour: on desktop, shows once per session when the cursor leaves
// toward the top of the viewport (the standard "about to close the tab"
// signal). Skips entirely if the visitor already converted on this page
// (data-success-selector already has [data-active]).
(function () {
  var script = document.currentScript;
  if (!script) return;

  var storageKey = script.dataset.storageKey || "exit-intent-seen";
  var headline = script.dataset.headline || "Wait, don't leave empty-handed";
  var body = script.dataset.body || "";
  var ctaText = script.dataset.ctaText || "Take Me Back";
  var scrollTarget = script.dataset.scrollTarget || null;
  var successSelector = script.dataset.successSelector || null;

  if (sessionStorage.getItem(storageKey)) return;

  function alreadyConverted() {
    if (!successSelector) return false;
    var el = document.querySelector(successSelector);
    return !!(el && el.hasAttribute("data-active"));
  }

  function markSeen() {
    sessionStorage.setItem(storageKey, "1");
  }

  function buildOverlay() {
    var style = document.createElement("style");
    style.textContent =
      ".exit-intent-overlay { position: fixed; inset: 0; background: rgba(26,26,26,0.55); z-index: 9999; " +
      "display: flex; align-items: center; justify-content: center; padding: 20px; }" +
      ".exit-intent-card { background: var(--white, #fff); border-radius: 14px; max-width: 440px; width: 100%; " +
      "padding: 36px 32px; text-align: center; box-shadow: 0 24px 60px -20px rgba(0,0,0,0.4); position: relative; }" +
      ".exit-intent-card h3 { margin: 0 0 12px; font-size: 1.4rem; color: var(--ink, #1a1a1a); }" +
      ".exit-intent-card p { margin: 0 0 22px; color: var(--muted, #6e6d66); font-size: 0.98rem; line-height: 1.5; }" +
      ".exit-intent-close { position: absolute; top: 14px; right: 16px; background: none; border: none; " +
      "font-size: 1.3rem; line-height: 1; cursor: pointer; color: var(--muted, #6e6d66); }" +
      ".exit-intent-cta { display: inline-block; background: var(--ink, #1a1a1a); color: #fff; border: none; " +
      "padding: 13px 26px; border-radius: 999px; font-weight: 700; font-size: 0.95rem; cursor: pointer; " +
      "text-decoration: none; }" +
      ".exit-intent-cta:hover { background: var(--accent, #c0392b); }";
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.className = "exit-intent-overlay";
    overlay.innerHTML =
      '<div class="exit-intent-card" role="dialog" aria-modal="true">' +
      '<button type="button" class="exit-intent-close" aria-label="Close">&times;</button>' +
      "<h3></h3>" +
      "<p></p>" +
      '<button type="button" class="exit-intent-cta"></button>' +
      "</div>";

    overlay.querySelector("h3").textContent = headline;
    if (body) overlay.querySelector("p").textContent = body;
    else overlay.querySelector("p").remove();
    overlay.querySelector(".exit-intent-cta").textContent = ctaText;

    function close() {
      overlay.remove();
    }

    overlay.querySelector(".exit-intent-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    overlay.querySelector(".exit-intent-cta").addEventListener("click", function () {
      close();
      if (scrollTarget) {
        var target = document.querySelector(scrollTarget);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          var firstField = target.matches("form") ? target.querySelector("input") : target.querySelector("form input");
          if (firstField) setTimeout(function () { firstField.focus(); }, 400);
        }
      }
    });

    document.body.appendChild(overlay);
    markSeen();
  }

  function onMouseOut(e) {
    if (e.clientY > 0) return;
    if (alreadyConverted()) return;
    document.removeEventListener("mouseout", onMouseOut);
    buildOverlay();
  }

  document.addEventListener("mouseout", onMouseOut);
})();
