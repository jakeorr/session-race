/**
 * session-race
 * Minimal test case for a race condition when using connect-session-sequelize,
 * the current version of express-session, and passportjs. See README for useage and details.
 *
 */
var express = require('express'),
  app = express(),
  session = require('express-session'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
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
      // logging: false
    });
    sequelize.authenticate().nodeify(next);
  });
};

var setupExpress = function (next) {
  app.set('view engine', 'ejs');

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
    resave: false,
    saveUninitialized: true
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(new LocalStrategy(
    function (username, password, done) {
      return done(null, {name: 'tester', id: 1234});
    }));
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(function (id, done) {
    done(null, {name: 'tester-deserialize', id: id});
  });

  app.get('/', function (req, res) {
    res.render('index');
  });

  app.post('/', passport.authenticate('local'), function (req, res) {
    // A solution to the problem
    req.session.save(function (err) {
      if(err) return res.status(500).end();
      res.redirect('/check');
    });
  });

  app.get('/check', function (req, res) {
    res.render('check', {
      session: req.session
    });
  });

  app.get('/signout', function (req, res) {
    req.logout();
    res.redirect('/');
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
