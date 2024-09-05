var express = require('express')
var app = express();

const PORT = process.env.PORT || 4000;

app.use(express.static('static_files'))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var hbs = require('hbs')
hbs.registerPartials(__dirname + '/views/partials', function (err) {});
app.set('view engine','hbs')

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get('/', function(req, res) {
    console.log("here!")
    pool.query("CREATE TABLE IF NOT EXISTS users (user_id INT GENERATED ALWAYS AS IDENTITY, username VARCHAR(70), password VARCHAR(70), name VARCHAR(70)", 
        function(err, result) {
            console.log('done')
            if(err) {
                console.log('error')
                console.log(err)
            }
    })
    res.render('index')
})

app.get('/account', function(req, res) {
    res.render('index')
})

app.get('/hire', function(req, res) {
    res.render('index')
})

app.get('/login', function(req, res) {
    res.render('index')
})

app.get('/form-response', function(req, res) {

}) 

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });