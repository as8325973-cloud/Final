const express = require('express');
const db = require('mysql2');
const session = require('express-session');   // ✅ 新增：session
const path = require('path');

const app = express();

// ✅ 告訴 Express：view 檔在 /scr/views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));



// ✅ 啟用 session（先用預設記憶體即可，之後要用 MySQL store 再說）
app.use(
  session({
    secret: 'someVerySecretString', // 之後可搬到環境變數
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 小時
    },
  })
);

const configs = require('./config');
const connection = db.createConnection(configs.db);

connection.connect((err) => {
  if (err) {
    console.log("Error connecting to database: ", err);
    process.exit();
  } else {
    console.log("Connected to database");
  }
});

// ====== 掛上 router（一定要在 wildcard 之前） ======
const auth = require('./routes/auth');
auth.connection = connection;
app.use('/auth', auth);

const api = require('./routes/api');
api.connection = connection;
app.use('/api', api);

// ====== 首頁 ======
app.get('/', (req, res) => {
  if (req.get("HX-Request")) {
    res.send(
      '<div class="text-center">' +
      '<i class="bi bi-cup-hot" style="font-size: 50vh;"></i>' +
      '</div>'
    );
  } else {
    res.render('layout', {
      title: 'Welcome to Final e-management',
      partials: {
        navbar: 'navbar',
      }
    });
  }
});

// ====== Dashboard（需要登入） ======
app.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/signin');
  }

  res.render('dashboard', {
    title: "MMR Dashboard",
    partials: { navbar: 'navbar' }
  });
});

// ====== wildcard：最後再捕捉其他頁面 ======
app.get(/.*/, (req, res, next) => {
  if (req.get("HX-Request")) {
    next();
  } else {
    res.render('layout', {
      title: 'Welcome to The Final e-management',
      partials: {
        navbar: 'navbar',
      },
      where: req.url
    });
  }
});



app.listen(80, function () {
  console.log('Web server listening on port 80!');
});
