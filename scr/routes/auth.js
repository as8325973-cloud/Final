// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');

const app = express.Router();

// GET /auth/signin  顯示登入頁
app.get('/signin', (req, res) => {
  // 已登入就直接丟回首頁
  if (req.session.user) {
    return res.redirect('/');
  }

  res.render('auth/signin', {
    title: 'Sign In - FlowBuilder',
    partials: { navbar: null }, // 登入頁通常不顯示 navbar
    error: null,
  });
});

// POST /auth/signin  處理登入
app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  const SQL = 'SELECT id, email, password_hash, name FROM User WHERE email = ?';

  app.connection.execute(SQL, [email], async (err, rows) => {
    if (err) {
      console.log('Error querying user: ', err);
      return res.render('auth/signin', {
        title: 'Sign In - FlowBuilder',
        partials: { navbar: null },
        error: '系統發生錯誤，請稍後再試。',
      });
    }

    if (rows.length === 0) {
      // 找不到這個 email
      return res.render('auth/signin', {
        title: 'Sign In - FlowBuilder',
        partials: { navbar: null },
        error: 'Email 或密碼錯誤。',
      });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.render('auth/signin', {
        title: 'Sign In - FlowBuilder',
        partials: { navbar: null },
        error: 'Email 或密碼錯誤。',
      });
    }

    // 比對成功 → 設定 session
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    res.redirect('/');
  });
});

// GET /auth/signout  登出
app.get('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/signin');
  });
});

module.exports = app;
