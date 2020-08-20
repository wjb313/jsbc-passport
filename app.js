const express = require('express')
const app = express()
const passport = require('passport')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const LocalStrategy = require('passport-local').Strategy

const User = require('./user.js')
const sequelize = require('./database.js')

const sessionStore = new SequelizeStore({
  db: sequelize,
})
sessionStore.sync()

passport.serializeUser((user, done) => {
  done(null, user.email)
})

passport.deserializeUser((email, done) => {
  User.findOne({ hwere: { email: email } }).then((user) => {
    done(null, user)
  })
})

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async function (email, password, done) {
      if (!email || !password) {
        done('Email and password required', null)
        return
      }

      const user = await User.findOne({ where: { email: email } })

      if (!user) {
        done('User not found', null)
        return
      }

      const valid = await user.isPasswordValid(password)

      if (!valid) {
        done('Email and password do not match', null)
        return
      }

      done(null, user)
    }
  )
)

app.use(
  session({
    secret: '343ji43j4n3jn4jk3n', //enter a random string here
    resave: false,
    saveUninitialized: true,
    name: 'testingpassport',
    cookie: {
      secure: false, //CRITICAL on localhost
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    },
    store: sessionStore,
  }),
  passport.initialize(),
  passport.session()
)

User.sync({ alter: true })
app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) =>
  req.session.passport ? res.render('index') : res.render('signup')
)

app.post('/register', async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.create({ email, password })

    req.login(user, (err) => {
      return res.redirect('/')
    })
  } catch (error) {
    res.statusCode = 500
    let message = "You done fucked up, son"
    if (error.name === "SequelizeUniqueConstraintError") {
      message = "You already signed up once, dipshit"
    }
    res.render('error', { message })
  }
})

app.get('/login', (req, res) => req.session.passport ? res.render('index') : res.render('login'))

app.post('/login', async (req, res) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.render('error', { message: err })
    if (!user) return res.render('error', { message: 'No user matching credentials' })

    req.login(user, (err) => {
      if (err) return res.render('error', { message: err })
      return res.redirect('/')
    })
  })(req, res)
})

app.get('/logout', async (req, res) => {
  req.logout()
  req.session.destroy()
  return res.redirect('/')
})

app.listen(3000, () => console.log('Server ready'));