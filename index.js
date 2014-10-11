/**
 * session-race
 * Minimal test case for a race condition when using connect-session-sequelize
 * and the current version of express-session. See README for useage and details.
 *
 */
var express = require('express'),
  app = express(),
  session = require('express-session'),
  SequelizeStore = require('connect-session-sequelize')(session.Store),
  Sequelize = require('sequelize'),
  sequelize,
  fs = require('fs');

var connectToDb = function (next) {
  fs.readFile(__dirname + '/secrets.json', 'utf8', function (err, data) {
    if(err) return next(err);
    data = JSON.parse(data);

    //
    // TODO: Update this to your db settings. The issue occurs when connected to a remote DB.
    //
    sequelize = new Sequelize(data.db, data.user, null, {
      dialect: 'postgres',
      host: data.host,
      logging: false
    });
    sequelize.authenticate().nodeify(next);
  });
};

var setupExpress = function (next) {
  var sessionStore = new SequelizeStore({
    db: sequelize
  });
  app.use(require('cookie-parser')('keyboard cat'));
  app.use(require('body-parser').urlencoded({
    extended: true
  }));
  app.use(session({
    secret: 'keyboard cat',
    store: sessionStore,
    resave: true,
    saveUninitialized: true
  }));

  //
  // Start here:
  //
  // This endpoint sets a timestamp variable in the user's session
  // and then redirects to another endpoint
  //
  app.get('/', function (req, res) {
    var time = new Date().getTime();
    console.log('session variable being saved:', time);
    req.session.testVar = time;
    res.redirect('/check');
  });

  //
  // After setting the timestamp, the user is redirected to this endpoint
  // which checks the session variable that was set in the root endpoint.
  // 
  // `req.session.testVar` should equal the timestamp that was set in the
  // '/' endpoint. When using the current version of express-session it
  // does not. The first access of '/' it will be set in the DB, but
  // undefined here. On subsequent requests to '/' this endpoint will report
  // the previous value of `req.session.testVar` which does not agree with
  // the value reported in the '/' endpoing and what is in the DB.
  //
  app.get('/check', function (req, res) {
    console.log('/check req.session', req.session);
    res.send(JSON.stringify(req.session));
  });

  next();
};

connectToDb(function (err) {
  if(err) return console.log('error connecting with sequelize', err);
  setupExpress(function (err) {
    app.listen(3000, 'localhost', function () {
      console.log('Express is listening on localhost:3000');
    });
  });
});
