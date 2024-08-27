var express = require('express')
var app = express();

app.use(express.static('static_files'))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var hbs = require('hbs')
hbs.registerPartials(__dirname + '/views/partials', function (err) {});
app.set('view engine','hbs')

app.get('/', function(req, res) {
    res.render('index')
})

app.get('/account', function(req, res) {
    res.render('index')
})

app.get('/hire', function(req, res) {
    res.render('index')
})