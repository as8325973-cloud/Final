// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');


const app = express.Router();

// 設定 connection 注入 (從 app.js 注入)
app.connection = null;

// GET /signin  顯示登入頁
app.get('/signin', (req, res) => {
  // 如果已登入，導向 Dashboard
  if (req.session && req.session.user) {
    return res.redirect('/dashboard'); 
  }
  
  // 💡 修正: 從 Session 中取出錯誤訊息 (如果有)
  const errorMessage = req.session.error;
  // 💡 清除 Session 中的錯誤，確保只顯示一次
  delete req.session.error;

  // 渲染登入頁
  res.render('signin', { 
    title: 'Sign In',
    error: errorMessage, // 傳遞 Session 中取出的錯誤
  });
});

// GET /signup 顯示註冊頁
app.get('/signup', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('signup', { 
    title: 'Sign Up',
    error: null,
  });
});

// POST /signin 處理登入
app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  const SQL = `SELECT id, email, password_hash, name 
               FROM User WHERE email = ?`;

  // 💡 修正：確保這裡使用 app.connection.execute
  app.connection.execute(SQL, [email], async (err, rows) => {
    if (err) {
      console.error('Database error during signin:', err);
      // 💡 修正: 登入失敗時，將錯誤存入 Session 並重定向
      req.session.error = "系統錯誤，請稍後再試";
      return res.redirect("/signin");
    }

    if (rows.length === 0) {
      // 💡 修正: 登入失敗時，將錯誤存入 Session 並重定向
      req.session.error = "Email 或密碼錯誤";
      return res.redirect("/signin");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash); 

    if (!match) {
      // 💡 修正: 登入失敗時，將錯誤存入 Session 並重定向
      req.session.error = "Email 或密碼錯誤";
      return res.redirect("/signin");
    }

    // ✔ 登入成功
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    // 重導向到 /dashboard
    return res.redirect("/dashboard");
  });
})


// POST /signup  處理註冊
app.post('/signup', (req, res) => {
  // 💡 修正：取得 company_name 欄位
  const { email, name, password } = req.body; 

  // 1. 先把密碼 hash 起來
  bcrypt.hash(password, 10).then((hash) => {
    // 💡 修正：User Table 必須包含 company_name
    const SQL = `
      INSERT INTO User (email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `;

    app.connection.execute(SQL, [email, hash, name], (err, result) => {
      if (err) {
        console.log('Error inserting user: ', err);
        // 💡 修正: 註冊失敗時，將錯誤存入 Session 並重定向
        req.session.error = 'Email 已被使用或系統錯誤。';
        return res.redirect("/signup");
      }

      // 2. 註冊完成後可直接幫他登入
      req.session.user = {
        id: result.insertId,
        email,
        name,        
      };

      // 重導向到 /dashboard
      res.redirect('/dashboard');
    });
  });
});

// GET /signout  處理登出
app.get('/signout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    // 導回 /signin
    res.redirect('/signin');
  });
});

module.exports = app;