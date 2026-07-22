(function () {
  var PREF_KEY = "hk_lang_pref";
  if (localStorage.getItem(PREF_KEY)) return;

  var page = window.location.pathname.split("/").pop() || "";

  fetch("https://ipapi.co/json/")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var country = data && data.country_code;
      var target = null;
      if (country === "ES") target = "es";
      else if (country === "FR") target = "fr";
      if (!target) return;
      localStorage.setItem(PREF_KEY, target);
      window.location.href = page ? "/" + target + "/" + page : "/" + target + "/";
    })
    .catch(function () { /* geolocation unavailable, stay on English */ });
})();
