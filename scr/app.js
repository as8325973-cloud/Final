const express = require('express');
const db = require('mysql2');
const session = require('express-session');
const path = require('path');

const configs = require('./config');
const mmrModel   = require('./models/mmr');   // MMR 資料存取
const auth = require('./routes/auth');  // 登入/註冊
const apiRouter  = require('./routes/api');   // MMR API
const app = express();


// 設定視圖引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// 啟用 session
app.use(
  session({
    secret: 'someVerySecretString',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 小時
    },
  })
);


const connection = db.createConnection(configs.db);

connection.connect((err) => {
  if (err) {
    console.log("Error connecting to database: ", err);
    process.exit();
  } else {
    console.log("Connected to database");
  }
});



apiRouter.connection = connection;
app.use('/', auth);

auth.connection = connection;
app.use('/api', apiRouter);

mmrModel.setConnection(connection);


// ====== 首頁 (導向 Dashboard 或 登入頁) ======
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  if (req.get("HX-Request")) {
    res.send('<div class="text-center">' + '<i class="bi bi-cup-hot" style="font-size: 50vh;"></i>' + '<p class="mt-4 text-muted">請先登入以存取系統。</p>' + '</div>');
  } else {
    // 未登入，導向登入頁
    return res.redirect('/signin');
  }
});


// ====== Dashboard（需要登入） ======
app.get('/dashboard', (req, res) => {
  // 檢查登入狀態
  if (!req.session || !req.session.user) {
    return res.redirect('/signin');
  }

  res.render('dashboard', {
    title: "MMR Dashboard",
    // 💡 註冊所有必要的 Partial 視圖
    partials: {
      navbar: 'navbar',
      mmr_table_1: 'partials/mmr_table_1',
      mmr_table_2: 'partials/mmr_table_2',
      mmr_table_3: 'partials/mmr_table_3',
      mmr_table_4: 'partials/mmr_table_4',
    },
    user: req.session.user
  });
});

// ====== wildcard：最後再捕捉其他頁面（404 處理） ======
app.get(/.*/, (req, res, next) => {
  if (req.get("HX-Request")) {
    next();
  } else {
    // 💡 修正: 直接回傳一個簡單的 404 HTML 頁面，避免渲染複雜的視圖導致錯誤
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 頁面未找到</title>
            <link rel="stylesheet" href="/bootstrap.min.css">
        </head>
        <body class="d-flex align-items-center justify-content-center" style="height: 100vh; background-color: #f8f9fa;">
            <div class="text-center">
                <h1 class="display-1 text-danger">404</h1>
                <p class="lead"><strong>頁面未找到</strong></p>
                <p>您請求的路徑 <code>${req.url}</code> 不存在。</p>
                <a href="/" class="btn btn-primary mt-3">返回首頁</a>
            </div>
        </body>
        </html>
    `);
  }
});


app.listen(80, function () {
  console.log('Web server listening on port 80!');
});