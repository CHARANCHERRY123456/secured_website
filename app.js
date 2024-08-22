require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require("mongoose-findorcreate")
const app = express();
const port = 3000;

// Middleware setup
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "its a very little secret",
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Mongoose and Passport setup

  mongoose.connect(process.env.ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId : String,
  facebookId:String,
  secret : String
});
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(findOrCreate)
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id); // Use a unique identifier for the user
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID:process.env.GOOGLE_CLIENT_ID,
  clientSecret:process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://secure-bro.onrender.com/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
passport.use(new FacebookStrategy({
  clientID:process.env.FACEBOOK_APP_ID,
  clientSecret:process.env.FACEBOOK_APP_SECRET,
  callbackURL: "https://secure-bro.onrender.com/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


// Routes
app.get("/", (req, res) => res.render("home"));
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/submit" , (req , res)=>{
  if(req.isAuthenticated()) res.render("submit");
  else res.redirect("/login")
});
app.post("/submit" ,async (req ,res)=>{
  if(req.isAuthenticated()){
    const {secret} = req.body;
    const bro = await User.updateOne({_id : req.user.id} , {secret : secret});
    res.redirect("/secrets");
  }else{
    res.redirect("/login");
  }
})

app.get("/secrets", async(req, res) => {
  if (req.isAuthenticated()) {
    const secrets = await User.find({secret : {$ne:null}});
    console.log(secrets);
    res.render("secrets" , {usersWithSecrets: secrets});
  }else res.redirect("/login");
});
app.get('/auth/facebook',passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get('/auth/google',passport.authenticate('google', { scope: ['profile'] }));
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  User.register(new User({ email }), password, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => res.redirect("/secrets"));
    }
  });
}); 	

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

app.get("/logout", (req, res, next) => {
  req.logout((err) => { 
    if (err) return next(err);
    res.redirect("/");
  });
});

// Server setup
app.listen(port, () => console.log(`Server started on port ${port}.`));
