function rot13(s) {
	return s.replace(/[a-zA-Z]/g, function(c) {return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);});
}

var email = rot13("avfgngu@zvg.rqh");

$("#email").html(function() { return $(this).html().replace("Turn on JavaScript!", email); })
	.attr("href", "mailto:" + email);

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
