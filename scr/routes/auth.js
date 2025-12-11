// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');

const app = express.Router();

// GET /auth/signin  顯示登入頁
app.get('/signin', (req, res) => {
  // 沒有啟用 session 時 req.session 會是 undefined
  if (req.session && req.session.user) {
    return res.redirect('/');
  }

  res.render('auth/signin', {
    title: 'Sign In',
    partials: { navbar: null },
    error: null,
  });
});


// POST /auth/signin  處理登入
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

      res.redirect('/');
    });
  });
});

module.exports = app;
