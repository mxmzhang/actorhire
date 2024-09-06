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

// function insertInitialActors(req, res, next) {
//     pool.query(`INSERT INTO actors (fName, lName, descrip) VALUES
//         ('Sarah', 'Zheng', 'I graduated from Boston University with a Bachelor''s in drama. I''ve had 6+ years of experience in acting, including a stint in Sponge Bob the Musical, and I specialize in break-ups, crazy cat ladies, and distressed friend'),
//         ('Jonah', 'Higgins', 'Hello! I''m Jonah, and I''m a budding Off-Broadway actor. You may recognize me at 00:45:02 of Legally Blonde. I specialize in dramatic distractions and scaring people.')`,
//         function(err, results) {
//             if (err) {
//                 console.error("insert actors ", err);
//                 return;
//             }
//             console.log("insert actor success")
//             next()
//         }
//     )
// }

function deleteActors(req, res, next) {
    pool.query("DELETE FROM actors WHERE actor_id = 4", function(err, results) {
        if (err) {
            console.error("delete", err)
            return;
        }
        console.log("delete success")
        next()
    })
}

app.get('/hire', deleteActors, function(req, res) {
    if (!req.session.loggedin) {
        res.redirect('/login')
    }
    pool.query("SELECT * FROM actors", function(err, results) {
        if (err) {
            console.error("getting actors ", err)
            return;
        }
        console.log(results)
        var obj = {
            arr: results.rows
        }
        console.log("got actors success!")
        res.render('actors', obj)
    })
})

app.get('/login', function(req, res) {
    res.render('login')
})

function getExpectedPW(req, res, next) {
    pool.query("SELECT * FROM users WHERE username = $1", [req.body.username], 
        function(err, result) {
            console.log('done')
            if(err) {
                console.log('error')
                console.log(err)
            } else {
                console.log(result)
                if (result.rows[0].hasOwnProperty("password")) {
                    res.locals.name = result.rows[0].name
                    res.locals.userid = result.rows[0].user_id
                    res.locals.expectedpw = result.rows[0].password
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

    bcrypt.compare(input, expected, function(err, result) {
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
    bcrypt.genSalt(saltRounds, function(err, salt) {
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
    console.log(req.body)
    console.log(res.locals.salt)
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