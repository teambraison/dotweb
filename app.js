var express = require("express")
var session = require('express-session')
var swig = require("swig")
var app = express()
var bodyParser = require("body-parser")
var http = require("http").Server(app)
var io = require("socket.io")(http)

var mongoose = require("mongoose")

var basePath = "./templates/"
var indexPagePath = basePath + "index.html"
var signupPagePath = basePath + "signupform.html"
var loginPagePath = basePath + "loginform.html"
var instantChatPath = basePath + "instantchat.html"

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

//app.use(express.json())
//app.use(express.urlencoded())

app.use(session({secret:"123fantastic",
                 saveUninitialized: true,
                 resave: true}))


mongoose.connect("mongodb://127.0.0.1/DOT")

//mongoose.connect("mongodb://nodejitsu:8cc92c89a6d28f4b9ff33365f37a5627@troup.mongohq.com:10022/nodejitsudb6070036496")

//mongoose.connect("mongodb://nodejitsu:36026df69744f52ce9a94aa3673d78fd@troup.mongohq.com:10037/nodejitsudb3283738885")

var db = mongoose.connection
db.on("error", console.error.bind(console, "connection error: "))
db.once("open", function(){
    console.log("Succesfully connected to the database...")
})


var userSchema = mongoose.Schema({id:String, username:String, password: String, email: String})
var User = mongoose.model("User", userSchema)

var messageSchema = mongoose.Schema({sender_id:String, receipient_id: String, message: String, status:String, date: Date})
var Message = mongoose.model("Message", messageSchema)

var sessionSchema = mongoose.Schema({session_id: String, user_id: String, username: String})
var Session = mongoose.model("Session", sessionSchema)
Session.remove({}, function(err) {
    console.log("Sessions cache cleared")
})

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

app.get('/instantchat', function(req, res) {
    res.send(swig.renderFile(instantChatPath))
})

app.post('/api/message/get', function(req, res) {
    var session_id = req.body.session_id
    var user_id = req.body.user_id
    var contact_id = req.body.contact_id
    var orderBy = 1
    Session.find({session_id:session_id}, {user_id:1}, function(err,data) {
        if(err) {
            console.log(err)
        }
        if(data != ""){
            Message.find({$or: [{$and: [{sender_id: user_id}, {receipient_id: contact_id}]}, {$and: [{sender_id: contact_id}, {receipient_id: user_id}]}]}, function(err, data){
                if(err) {
                    console.log(err)
                }
                if(data != "") {
                    var contents = {}
                    var messages = []
                    contents.messages = messages
                    
                    for(var i = 0; i < data.length; i++) {
                        var message = {}
                        message.sender = data[i].sender_id
                        message.content = data[i].message
                        messages.push(message)
                        console.log(message.sender + ": " + message.content)
                    }
                    res.send(contents)
                }
            }).sort({date: orderBy});
        } else {
            var contents = {}
            var messages = []
            contents.messages = messages
            res.send(contents)
        }
    })
})

var connections = {}

io.on("connection", function(socket) {
    socket.on("join", function (data) {
        console.log(data.user_name + " joined a room")
        socket.join(data.user_id)
        connections[data.user_id] = socket
    })
})

app.post('/api/message/send', function(req, res){
    var session_id = req.body.session_id
    var sender_id = req.body.sender_id
    var receiver_id = req.body.receiver_id
    var message = req.body.message
    
    var response = {}
    
    console.log("Receiving message from " + sender_id + " to " + receiver_id + " with message\"" + message + "\"")
    
    Session.find({session_id:session_id}, function(err,data) {
        if(err) {
            console.log(err)
        }
        if(data != ""){
            var newmessage = new Message({sender_id:sender_id, receipient_id:receiver_id, message:message, status:"", date: new Date()})
            newmessage.save()
            console.log("Successfully saved message")
            
            response.error = ""
            response.content = "Message sent"
            connections[receiver_id].emit("new_msg", {username:sender_id, message:message})
            res.send(response)
    
        } else {
            console.log("The user " + sender_id  + " is currently not logged in")
            
            response.error = ""
            response.content = "User not logged in"
            res.send(response)
        }
    })
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
    console.log("Attempting to login with username: " + req.body.user + " password: " + req.body.pass)
    User.find({username:req.body.user, password: req.body.pass}, function(err, data) {
        
        var response = {}
        
        if(err) {
            console.log(err)
        } else {
            if(data == "") {
                response.error = "Found no user"
                response.user_id = ""
                response.user_sessionid = ""
                console.log("Found no user")
            } else {
                console.log("session id: " + req.session.session_id)
                if(!req.session.session_id) {
                    var sessionid = ID()
                    var newsession = new Session({session_id: sessionid, user_id:data[0].id, username:data[0].username})
                    newsession.save()
                    
                    response.error = ""
                    response.user_id = data[0].id
                    response.user_sessionid = sessionid
                    
                    req.session.session_id = sessionid
                    req.session.user_id = data[0].id
                } 
                console.log("Found user")
            }
        }
        res.send(response)
    })
})


app.post('/api/allusers', function(req, res) {
    
    Session.find({session_id:req.body.session_id}, {user_id:1}, function(err, data){
        if(err) {
            console.log(err)
        }
        //User is found in database, allowed access to other users
        if(data != "") {
            User.find({id: {$ne: data[0].user_id}}, {username:1, id:1}, function(err, data) {
                if(err) {
                    console.log(err)
                    res.send("Found no users in our database")
                } else {
                    var namesObject = {}
                    var contacts = []

                    namesObject.contacts = contacts
                    for(var i = 0; i < data.length; i++) {
                        var contact = {}
                        contact.username = data[i].username
                        contact.userid = data[i].id
                        namesObject.contacts.push(contact)
                    }
                    res.send(namesObject)
                }
            })
        } else {
            var namesObject = {}
            var contacts = []

            namesObject.contacts = contacts
            res.send(namesObject)
            for(var i = 0; i < data.length; i++) {
                var contact = {}
                contact.username = data[i].username
                contact.userid = data[i].id
                namesObject.contacts.push(contact)
            }
            res.send(namesObject)
        }
    })
})

http.listen(3000, function() {
    console.log("Listening on port 3000")
})

