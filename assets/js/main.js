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
});
