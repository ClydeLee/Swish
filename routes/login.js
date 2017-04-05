var express = require('express');
var router = express.Router();

/* GET users listing. */

router.get('/', function(req, res, next) {
		// Displaying an already made view
		res.sendFile("login.html", {"root": 'public/views/'});
	});

module.exports = router;
