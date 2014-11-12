var express = require("express")
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


mongoose.connect("mongodb://127.0.0.1/DOT")

var db = mongoose.connection
db.on("error", console.error.bind(console, "connection error: "))
db.once("open", function(){
    console.log("Succesfully connected to the database...")
})


var userSchema = mongoose.Schema({id:String, username:String, password: String, email: String})
var User = mongoose.model("User", userSchema)

var messageSchema = mongoose.Schema({to:String, from: String, message: String, status:String, date: Date})
var Message = mongoose.model("Message", messageSchema)

var ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
}

app.get('/', function(req, res) {
    res.send(swig.renderFile(indexPagePath, {title: "DOT"}))
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

app.get('/loginform', function(req, res){
    res.send(swig.renderFile(loginPagePath, {title: "Login In Page"}))
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
                res.send("User authenticated - authorize access")
            }
        }
    })
})

app.get('/api/allusers', function(req, res) {
    User.find({}, {username:1}, function(err, data) {
        if(err) {
            console.log(err)
            res.send("Found no users in our database")
        } else {
            var usernames = []
            for(var i = 0; i < data.length; i++) {
                usernames.push(data[i].username)
            }
            res.send(usernames.join())
        }
    })

})

var server = app.listen(3000, function() {
    var host = server.address().address
    var port = server.address().port
    
    console.log("Example app listening at http://%s:%s", host, port)
})