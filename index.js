var express = require('express')
var app = express();

const PORT = process.env.PORT || 4000;

app.use(express.static('static_files'))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var hbs = require('hbs')
hbs.registerPartials(__dirname + '/views/partials', function (err) {});
app.set('view engine','hbs')

app.use(require('cookie-parser')());

var cookieSession  = require('cookie-session')
app.use( cookieSession ({
  name: 'premium',
  keys: ['superdupersecret'],
}));

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const bcrypt = require('bcrypt')
const saltRounds = 10;

app.get('/', function(req, res) {
    res.render('index')
})

app.get('/account', function(req, res) {
    res.render('index')
})

app.get('/hire', function(req, res) {
    res.render('index')
})

app.get('/login', function(req, res) {
    res.render('login')
})

function getExpectedPW(req, res, next) {
    pool.query("SELECT * FROM users WHERE username = "+req.body.username, 
        function(err, result) {
            console.log('done')
            if(err) {
                console.log('error')
                console.log(err)
            } else {
                if (result[0].hasOwnProperty("password")) {
                    res.locals.name = result[0].name
                    res.locals.userid = result[0].user_id
                    res.locals.expectedpw = result[0].password
                } else {
                    res.redirect('/login')
                }
            }
            next()
        }
    )
}

app.post('/login-response', getExpectedPW, function(req, res) {
    const expected = res.locals.expectedpw;
    const input = req.body.password;

    bcrypt.compare(input, expected, (err, result) => {
        if (err) {
            console.error('Comparing passwords error', err);
            return;
        }

        if (result) {
            req.session.loggedin = true
            req.session.name = res.locals.name
            req.session.userid = res.locals.userid
            res.redirect('/account')
        } else {
            res.redirect('/login')
        }
    });
})

function generateSalt(req, res, next) {
    bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) {
            console.error("gen salt error: ", err);
            return;
        }
        res.locals.salt = salt
        console.log("salt successful")
        next();
    });
}

function hashPassword(req, res, next) {
    bcrypt.hash(req.body.password, res.locals.salt, (err, hash) => {
        if (err) {
            console.error("hash password error: ", err)
            return;
        }
        res.locals.newpw = hash
        console.log("password hashed")
        next()
    });
}

app.get('/signup', function(req, res) {
    res.render('signup')
})

app.post('/signup-response', generateSalt, hashPassword, function(req, res) {
    pool.query(`INSERT INTO users (username, password, name) VALUES ($1, $2, $3)`,
        [req.body.username, res.locals.newpw, req.body.name], function(err, result) {
            if(err) {
                console.log('insert user error')
                console.log(err)
            } else {
                console.log("insert user successful")
            }
        }
    )
    res.redirect('/account')
})

app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
  });