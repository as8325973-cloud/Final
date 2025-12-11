const express = require('express');
const router = express.Router();

// 設定 connection 注入
router.connection = null;

// 取得所有國家
router.get("/countries", (req, res) => {
  const sql = `SELECT alpha3, name FROM Country ORDER BY name`;
  router.connection.query(sql, (err, rows) => res.json(rows));
});

// 功能一：該國家歷年 MMR
router.get("/mmr/history/:code", (req, res) => {
  const sql = `
    SELECT year, mmr
    FROM CountryMMR
    WHERE alpha3 = ?
    ORDER BY year ASC
  `;
  router.connection.query(sql, [req.params.code], (err, rows) => res.json(rows));
});

module.exports = router;
