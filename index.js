var express = require('express')
var app = express();

const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });