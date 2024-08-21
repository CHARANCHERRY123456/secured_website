require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
// var bcrypt = require('bcryptjs');
// var salt = bcrypt.genSaltSync(10);
// const md5 = require('md5');
// const encrypt = require('mongoose-encryption');
const app = express();
const port = 3000;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret : "its a very little secret",
  resave : false,
  saveUninitialized:true,
}));
app.use(passport.initialize())
app.use(passport.session());


mongoose.connect(process.env.COMPASS_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>{console.log("mango connected succesfully");}).catch(()=>{console.log("sorry man mango is not connected");})
mongoose.set("useCreateIndex" , true)
const userSchema = new mongoose.Schema( {
  email : String,
  password : String
});
userSchema.plugin(passportLocalMongoose,{ usernameField: 'email' });
const User = new mongoose.model("User" , userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const crypto = require('crypto');

const encKey = process.env.ENCRYPTION_KEY;  // 32-byte base64 string
const sigKey = process.env.SIGNING_KEY;     // 64-byte base64 string



const secret = "Thisisalittlesecret"
// userSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['password'] });


app.get("/" , (req , res)=>{
  res.render("home");
});
app.get("/login" , (req , res)=>{
  res.render("login");
});
app.get("/register" , (req , res)=>{
  res.render("register");
});
app.get("/secrets",(req ,res)=>{
  if(req.isAuthenticated()) res.render("secrets");
  else res.redirect("/login");
})

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  User.register(new User({ email : email }), password, (err, user) => {
    if (err) {
      console.log(err);  // Log the actual error
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect("/");
  });
});


app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));


// app.post("/login", (req, res) => {
//   const {email , password} = req.body
//   const user = new User({email : email ,password : password})
//   req.login(user ,(err)=>{
//     if(err) console.log(err);
//     else{
//       passport.authenticate("local")(req , res , ()=>{
//         res.redirect("/secrets");
//       })
//     }
//   })

  

//   // passport.authenticate("local", (err, user, info) => {
//   //   if (err) return next(err); 
//   //   if (!user) return res.redirect("/login"); 
//   //   req.logIn(user, (err) => {
//   //     if (err) return next(err); 
//   //     return res.redirect("/secrets");
//   //   });
//   // })(req, res, next);
// });
  

















app.listen(port, function() {
  console.log("Server started on port port.");
});
