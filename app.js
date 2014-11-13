var express = require("express")
var session = require('express-session')
var swig = require("swig")
var app = express()
var bodyParser = require("body-parser")

var mongoose = require("mongoose")

var basePath = "./templates/"
var indexPagePath = basePath + "index.html"
var signupPagePath = basePath + "signupform.html"
var loginPagePath = basePath + "loginform.html"

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

//app.use(express.json())
//app.use(express.urlencoded())

app.use(session({secret:"123fantastic",
                 saveUninitialized: true,
                 resave: true}))


//mongoose.connect("mongodb://127.0.0.1/DOT")

mongoose.connect("mongodb://nodejitsu:36026df69744f52ce9a94aa3673d78fd@troup.mongohq.com:10037/nodejitsudb3283738885")

var db = mongoose.connection
db.on("error", console.error.bind(console, "connection error: "))
db.once("open", function(){
    console.log("Succesfully connected to the database...")
})


var userSchema = mongoose.Schema({id:String, username:String, password: String, email: String})
var User = mongoose.model("User", userSchema)

var messageSchema = mongoose.Schema({to:String, from: String, message: String, status:String, date: Date})
var Message = mongoose.model("Message", messageSchema)

var sessionSchema = mongoose.Schema({session_id: String, user_id: String, username: String})
var Session = mongoose.model("Session", sessionSchema)

var ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
}

app.get('/', function(req, res) {
    Session.find({session_id:req.session.session_id}, function(err, data) {
        console.lg
        console.log("Data: " + "\"" + data + "\"")
        if(err) {
            console.log(err)
        } 
        if(data == ""){
           res.send(swig.renderFile(indexPagePath, {title: "DOT"}))
        }
        else {
            res.send(swig.renderFile(indexPagePath, {title: "DOT", welcome_message: "Welcome back " + data[0].username}))
        }
    })
})

app.get('/signupform', function(req, res) {
    res.send(swig.renderFile(signupPagePath, {title: "Sign Up Page"}))
})

app.post('/api/adduser', function(req,res){
    var user = req.body.username
    var pass = req.body.password
    var email_address = req.body.email
    
    User.find({email:email_address}, function (err, data){
        if(err) {
            return console.log(err)
        } 
        if(data == ""){
            var newuser = new User({id:ID(), username:user, password:pass, email:email_address})
            newuser.save()
            res.send("Registered successful")
            console.log("Successfully added user " + user)
        } else {
        //    console.log("Data: " + "\"" + data + "\"")
            res.send("Email already taken")
            console.log("Could not add user, email already taken")
        }
    })
})

function checkAuth(req, res, next) {
    if(!req.session.user_id) {
        res.send("You are not authorized to view this page")
    } else {
        next();
    }
}



app.get('/loginform', function(req, res){
    res.send(swig.renderFile(loginPagePath, {title: "Login In Page"}))
})

app.get('/loginsuccess', function(req, res){
    res.send("You have successfully logged in")
})

app.post('/api/login', function(req, res) {
    User.find({username:req.body.user, password: req.body.pass}, function(err, data) {
        if(err) {
            console.log(err)
        } else {
            console.log("login: " + data)
            if(data == "") {
                res.send("Found no user " + req.body.user)
            } else {
                if(!req.session.session_id) {
                    var sessionid = ID()
                    var newsession = new Session({session_id: sessionid, user_id:data[0].id, username:data[0].username})
                    newsession.save()
                    req.session.session_id = sessionid
                    req.session.user_id = user_data[0].id
                }
                res.send("user authenticated")
            }
        }
    })
})

//app.post('/api/messages/send', function(req, res){
//    if(Session.find({session_id:req.session.session_id, user_id:req.session.user_id}).count())
//    {
//        
//    }
//})

app.get('/api/allusers', function(req, res) {
    User.find({}, {username:1}, function(err, data) {
        if(err) {
            console.log(err)
            res.send("Found no users in our database")
        } else {
            var namesObject = {}
            var names = []
            
            namesObject.names = names
            for(var i = 0; i < data.length; i++) {
                namesObject.names.push(data[i].username)
            }
            res.send(namesObject)
        }
    })

})

var server = app.listen(3000, function() {
    var host = server.address().address
    var port = server.address().port
    
    console.log("Example app listening at http://%s:%s", host, port)
})