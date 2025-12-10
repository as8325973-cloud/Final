const express = require('express');
const db = require('mysql2');

const app = express();

app.set('view engine', 'hjs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const configs = require('./config');
const connection = db.createConnection(configs.db);

connection.connect((err) => {
  if (err) {
    console.log("Error connecting to database: ", err);
    process.exit();
  }
  else {
    console.log("Connected to database");
  }
});

app.get('/', (req, res) => {
  if (req.get("HX-Request")) {
    res.send(
      '<div class="text-center">' +
      '<i class="bi bi-cup-hot" style="font-size: 50vh;"></i>' +
      '</div>'
    );
  }
  else {
    res.render('layout', {
      title: 'Welcome to McDonald e-management',
      partials: {
        navbar: 'navbar',
      }
    });
  }
});

app.get(/.*/, (req, res, next) => {
  if (req.get("HX-Request")) {
    next();
  }
  else {
    res.render('layout', {
      title: 'Welcome to McDonald e-management',
      partials: {
        navbar: 'navbar',
      },
      where: req.url
    });
  }
});

const categories = require('./routes/categories');
categories.connection = connection;
app.use('/categories', categories);

const products = require('./routes/products');
products.connection = connection;
app.use('/products', products);

const productNutrition = require('./routes/pNutritions');
productNutrition.connection = connection;
app.use('/pNutritions', productNutrition);

app.listen(80, function () {
  console.log('Web server listening on port 80!');
}); 
