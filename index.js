var RiveScript = require("rivescript");
var bot = new RiveScript({ debug: false });
var user = 'Jaydson';

bot.loadDirectory("../rivescript-js/eg/terra", function(data) {
	bot.sortReplies();
	var reply = bot.reply(user, "quem é voce?");
	console.log(reply);
}, function(e) {
	console.log(e);
});