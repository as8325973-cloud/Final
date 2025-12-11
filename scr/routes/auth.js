// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');


const app = express.Router();

// GET /auth/signin  顯示登入頁
app.get('/auth/signin', (req, res) => {
  // 沒有啟用 session 時 req.session 會是 undefined
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }


  res.render('auth/signin', {
    title: 'Sign In',
    partials: { navbar: null },
    error: null,
  });
});

app.post('/auth/signin', (req, res) => {
  const { email, password } = req.body;

  const SQL = `SELECT id, email, password_hash, name 
               FROM User WHERE email = ?`;

  app.connection.execute(SQL, [email], async (err, rows) => {
    if (err) {
      return res.render("auth/signin", {
        error: "系統錯誤，請稍後再試"
      });
    }

    if (rows.length === 0) {
      return res.render("auth/signin", {
        error: "Email 或密碼錯誤"
      });
    }

    const user = rows[0];
    const bcrypt = require("bcryptjs");
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.render("auth/signin", {
        error: "Email 或密碼錯誤"
      });
    }

    // ✔ 登入成功
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    return res.redirect("/dashboard");
  });
})


// POST /auth/signup  處理登入
app.post('/signup', (req, res) => {
  const { email, name, password } = req.body;

  // 1. 先把密碼 hash 起來
  bcrypt.hash(password, 10).then((hash) => {
    const SQL = `
      INSERT INTO User (email, password_hash, name)
      VALUES (?, ?, ?)
    `;

    app.connection.execute(SQL, [email, hash, name], (err, result) => {
      if (err) {
        console.log('Error inserting user: ', err);
        return res.render('auth/signup', {
          title: 'Sign Up',
          error: 'Email 已被使用或系統錯誤。',
        });
      }

      // 2. 註冊完成後可直接幫他登入
      req.session.user = {
        id: result.insertId,
        email,
        name,
      };

      res.redirect('/dashboard');
    });
  });
});

module.exports = app;
