(function() {
  var script = document.currentScript;
  var fallbackRoute = script && script.getAttribute('data-route');
  var pathname = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  var requestedPath = pathname || fallbackRoute || '/about';
  var requestedUrl = requestedPath + window.location.search + window.location.hash;

  window.location.replace('/?route=' + encodeURIComponent(requestedUrl));
}());
