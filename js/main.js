function rot13(s) {
  return s.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}

var email = rot13("avfgngu@zvg.rqh");

var emailEl = document.getElementById('email');
if (emailEl) {
  var span = emailEl.querySelector('span');
  if (span) span.textContent = email;
  emailEl.href = 'mailto:' + email;
}
