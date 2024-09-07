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

function getBookings(req, res, next) {
    console.log(req.session.userid)
    pool.query("SELECT * FROM hires WHERE user_id = $1", [req.session.userid],
        function(err, results) {
            if (err){
                console.error("select users", err)
                return;
            }
            console.log(results)
            res.locals.bookings = results.rows
            console.log("select bookings successful")
            next()
        }
    )
}

app.get('/account', getBookings, function(req, res) {
    var obj = {
        name : req.session.name,
        arr : res.locals.bookings
    }
    res.render('account', obj)
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

app.get('/hire', function(req, res) {
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

app.get('/hireform/:id', function(req, res) {
    var obj = {
        id: req.params.id
    }
    res.render('hireformdate', obj)
})

// Collect rows that are on the same date and with
// the same actor as the user chose
function getRelevantRows(req, res, next) {
    console.log(req.body.date)
    console.log(req.body.actorid)
    pool.query("SELECT * FROM hires WHERE date = $1 AND actor_id = $2", [req.body.date, req.body.actorid], 
        function(err, results) {
            if (err) {
                console.error("getting relevant rows", err)
                return;
            }
            res.locals.samedate = results.rows
            console.log("got relevant rows yay")
            next()
        })
}

app.post('/hireform/hire-response', getRelevantRows, function(req, res) {
    var arr = [9,10,11,12,13,14,15,16,17]
    const samedate = res.locals.samedate
    for (let i = 0; i < samedate.length; i++) {
        for (let j = 0; j < samedate[i].time.length; j++) {
            if (arr.includes(samedate[i].time[j])) {
                delete arr[samedate[i].time[j] - 9]
            }
        }
    }
    var obj = {
        actorid : req.body.actorid,
        times : arr,
        date : req.body.date
    }
    res.render('hireformrest', obj)
})

app.post('/hireform/hire-response/hire-response-two', function(req, res) {
    console.log(req.body)
    var arr = [];
    for (let i = 9; i <= 17; i++) {
        if (i.toString() in req.body) {
            console.log("found")
            arr.push(i)
        }
    }
    console.log(arr)
    pool.query(`INSERT INTO hires (user_id, actor_id, rating, date, time, request) VALUES
        ($1, $2, 0, $3, $4, $5)`, [req.session.userid, req.body.actorid, req.body.date, arr, req.body.request], 
        function(err, results) {
            if (err) {
                console.error("insert booking", err)
                return;
            }
            res.locals.samedate = results.rows
            console.log("booked yay")
        })
    res.redirect('/account')
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