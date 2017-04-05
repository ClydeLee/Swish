// Dependencies
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var morgan = require('morgan');
//New variable creations 3.22.17


var passport	  = require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var port        = process.env.PORT || 8080;
var jwt         = require('jwt-simple');


var Yelp        = require('yelp-api-v3');
var yelp = new Yelp({
  app_id: 't2JUgxbWRUb4Ei7nJ13ZRA',
  app_secret: 'pxueNABGB88sFtEvwGwLiwgYKbyuUwesuZDiMNdnPPKLFReq6V6QJa8GVLDZYl6d'
});
//new variables for login and register 3.23.17
var index = require('./routes/index');
var register = require('./routes/register');
var login = require('./routes/login');

// Initialize the Express App
var app = express();



//test code 3.23.17
var testFunction = function(req, res, next) {
res.setHeader('Content-Type', 'text/plain');
res.end('Hello World');
};

//prototype code to link login and registration

app.use('/login', login);
app.use('/register', register);
app.use('/index', index);


//new code 3.23.17



//end of test code 3.23.17



//Initializing Passport
app.use(passport.initialize()); 



// Configs
var db = require('./config/db');





// Connect to the DB
//mongoose.connect(db.url);
mongoose.connect(config.database); //switched from db.url 3.22.17


// pass passport for configuration
require('./config/passport')(passport); 


// bundle our routes
var apiRoutes = express.Router();


// Configure 

// To expose public assets to the world
app.use(express.static(__dirname + '/public'));

// log every request to the console
app.use(morgan('dev'));

// For parsing HTTP responses
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true   //Note:  Maroof's extended is 'false' in the sample server.js.
}));   

// Express Routes
require('./app/routes/api')(app);
require('./app/routes/routes')(app);






// create a new user account (POST http://localhost:8080/signup)
apiRoutes.post('/signup', function(req, res) {
  if (!req.body.name || !req.body.password) {
    res.json({success: false, msg: 'Please pass name and password.'});
  } else {
    var newUser = new User({
      name: req.body.name,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

// route to authenticate a user (POST http://localhost:8080/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

// route to a restricted info (GET http://localhost:8080/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          res.json({success: true, msg: 'Welcome in the member area ' + user.name + '!'});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};













//
// TODO: USE CUSTOM DATA IN EACH AND USE ROUTES
// route to a restricted info (GET http://localhost:8080/search)
apiRoutes.get('/search/:location', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // price is an optional parameter that users can filter by
          if (req.query.price) {
            yelp.search({term: req.query.term, location: req.params.location, price: req.query.price})
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                console.error(err);
            });
          } else {
            yelp.search({term: req.query.term, location: req.params.location})
            .then(function (data) {
                res.send(data);
            })
            .catch(function (err) {
                console.error(err);
            });
          }
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

apiRoutes.get('/business/:id', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // price is an optional parameter that users can filter by
          yelp.business(req.params.id)
          .then(function (data) { res.json(data); })
          .catch(function (err) { console.error(err);});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

apiRoutes.get('/reviews/:id', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      name: decoded.name
    }, function(err, user) {
        if (err) throw err;

        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // price is an optional parameter that users can filter by
          yelp.reviews(req.params.id)
          .then(function (data) { res.json(data); })
          .catch(function (err) { console.error(err);});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

// connect the api routes under /*
app.use('/', apiRoutes);














// Start the app with listen and a port number
app.listen(3000);
console.log('Server up and running at http://localhost:3000/');