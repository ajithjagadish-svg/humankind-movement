// Progressive-enhancement submit handler for forms posting JSON to our own
// /api/* endpoints (replaces the old @formspree/ajax client-side library).
// Expects: a hidden honeypot input named "_gotcha", and .form-status.ok /
// .form-status.err elements for success/error messaging.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("form[data-ajax-form]").forEach(function (form) {
    var statusOk = form.querySelector(".form-status.ok");
    var statusErr = form.querySelector(".form-status.err");
    var submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (statusOk) statusOk.removeAttribute("data-active");
      if (statusErr) {
        statusErr.removeAttribute("data-active");
        statusErr.textContent = "";
      }

      var honeypot = form.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        form.reset();
        if (statusOk) statusOk.setAttribute("data-active", "");
        return;
      }

      // Fields with multiple inputs sharing a name (checkbox groups) collect
      // into an array; everything else stays a plain string.
      var data = {};
      new FormData(form).forEach(function (value, key) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = [].concat(data[key], value);
        } else {
          data[key] = value;
        }
      });

      if (submitBtn) submitBtn.disabled = true;

      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
            return body;
          });
        })
        .then(function () {
          form.reset();
          if (statusOk) statusOk.setAttribute("data-active", "");
          if (form.dataset.gaEvent && typeof gtag === "function") gtag("event", form.dataset.gaEvent);
          if (form.dataset.gaEvent && window.posthog && typeof window.posthog.capture === "function") {
            window.posthog.capture(form.dataset.gaEvent, { form_action: form.getAttribute("action"), page_path: window.location.pathname });
          }
        })
        .catch(function (err) {
          if (statusErr) {
            statusErr.textContent = err.message || "Something went wrong. Please try again.";
            statusErr.setAttribute("data-active", "");
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  });
});
