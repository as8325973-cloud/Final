const express = require('express');
const router = express.Router();
const mmrModel = require('../models/mmr');

// 檢查是否已登入的 Middleware
const requireLogin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        // ✅ 若是 JSON API（/json 路徑 or Accept: application/json），回 JSON，避免前端 res.json() 爆炸
        const accept = (req.get('Accept') || '').toLowerCase();
        const wantsJson = req.originalUrl.includes('/json') || accept.includes('application/json');

        if (wantsJson) {
            return res.status(401).json({ error: "請先登入。", redirect: "/signin" });
        }

        // 原本給 HTMX 用
        res.set('HX-Redirect', '/signin');
        return res.status(401).send('請先登入.');
    }
    next();
};

// -----------------------------------------------------------
// 靜態資料 API (選單用) - JSON
// -----------------------------------------------------------

router.get("/countries", (req, res) => {
    mmrModel.getAllCountries((err, rows) => {
        if (err) {
            console.error('Error fetching countries (SQL Error):', err);
            return res.status(500).json({ error: "Failed to fetch countries." });
        }
        res.json(rows);
    });
});

router.get("/subregions", (req, res) => {
    mmrModel.getAllSubRegions((err, rows) => {
        if (err) {
            console.error('Error fetching subregions (SQL Error):', err);
            return res.status(500).json({ error: "Failed to fetch subregions." });
        }
        res.json(rows);
    });
});

router.get("/regions", (req, res) => {
    mmrModel.getAllRegions((err, rows) => {
        if (err) {
            console.error('Error fetching regions (SQL Error):', err);
            return res.status(500).json({ error: "Failed to fetch regions." });
        }
        res.json(rows);
    });
});

router.get("/years", requireLogin, (req, res) => {
    mmrModel.getAllYears((err, rows) => {
        if (err) {
            console.error('Error fetching years:', err);
            return res.status(500).json({ error: "Failed to fetch years." });
        }
        res.json(rows);
    });
});

// 依 Region 取得「該區域有資料」的年份清單（JSON）
router.get("/years/region", requireLogin, (req, res) => {
    const { regionCode } = req.query;
    if (!regionCode || regionCode === "undefined") {
        return res.json([]);
    }

    mmrModel.getYearsByRegion(regionCode, (err, rows) => {
        if (err) {
            console.error("Error fetching years by region:", err);
            return res.status(500).json({ error: "Failed to fetch years by region." });
        }
        res.json(rows); // [{year: 2020}, {year: 2019}, ...]
    });
});

// （可選但建議）依 SubRegion 取得「該次區域有資料」的年份清單（JSON）
router.get("/years/subregion", requireLogin, (req, res) => {
    const { subRegionCode } = req.query;
    if (!subRegionCode || subRegionCode === "undefined") {
        return res.json([]);
    }

    mmrModel.getYearsBySubRegion(subRegionCode, (err, rows) => {
        if (err) {
            console.error("Error fetching years by subregion:", err);
            return res.status(500).json({ error: "Failed to fetch years by subregion." });
        }
        res.json(rows);
    });
});

// 依國家取得「該國家有資料」的年份清單（JSON）
router.get("/years/country", requireLogin, (req, res) => {
    const { alpha3 } = req.query;

    if (!alpha3 || alpha3 === "undefined") {
        return res.json([]);
    }

    mmrModel.getYearsByCountry(alpha3, (err, rows) => {
        if (err) {
            console.error("Error fetching years by country:", err);
            return res.status(500).json({ error: "Failed to fetch years by country." });
        }
        res.json(rows); // [{year: 2020}, {year: 2019}, ...]
    });
});



// -----------------------------------------------------------
// 功能 1 — 依國家查詢歷年 MMR (✅ JSON 版本給 fetch 用)
// GET /api/mmr/history/json?alpha3=USA
// -----------------------------------------------------------
router.get("/mmr/history/json", requireLogin, (req, res) => {
    const alpha3 = req.query.alpha3;

    // ✅ 任何錯誤狀況都回 JSON，不回 HTML
    if (!alpha3 || alpha3 === 'undefined') {
        return res.status(400).json({ error: "請選擇國家", data: [] });
    }

    mmrModel.getMmrHistoryByCountry(alpha3, (err, rows) => {
        if (err) {
            console.error('Error fetching history (SQL Error):', err);
            return res.status(500).json({ error: "查詢資料庫錯誤", data: [] });
        }
        // rows 直接回傳（前端會 sort）
        return res.json(rows);
    });
});

// -----------------------------------------------------------
// 你原本的功能 1-4（HTMX 片段）我保留，避免破壞你現有 hjs/htmx
// -----------------------------------------------------------

// 功能 1 — 依國家查詢歷年 MMR（HTMX 片段）
router.get("/mmr/history", requireLogin, (req, res) => {
    const alpha3 = req.query.alpha3;
    if (!alpha3 || alpha3 === 'undefined') return res.send('<tr><td colspan="2">請選擇國家</td></tr>');
    console.log(alpha3);

    mmrModel.getMmrHistoryByCountry(alpha3, (err, rows) => {
        if (err) {
            console.error('Error fetching history (SQL Error):', err);
            return res.status(500).send('<tr><td colspan="2">查詢資料庫錯誤</td></tr>');
        }
        res.render('partials/mmr_table_1', { data: rows, alpha3: alpha3 });
    });
});

// 功能 2 — 查某 SubRegion 在某年的所有國家 MMR（HTMX 片段）
router.get("/mmr/subregion", requireLogin, (req, res) => {
    const { subRegionCode, year } = req.query;
    if (!subRegionCode || !year || subRegionCode === 'undefined' || year === 'undefined') {
        return res.send('<tr><td colspan="2">請選擇次區域和年份</td></tr>');
    }

    mmrModel.getMmrBySubRegionAndYear(subRegionCode, year, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('<tr><td colspan="2">查詢資料庫錯誤</td></tr>');
        }
        res.render('partials/mmr_table_2', { data: rows });
    });
});

// 功能 3 — 查某 Region 在某年的所有 SubRegion「最大 MMR」（HTMX 片段）
router.get("/mmr/regionmax", requireLogin, (req, res) => {
    const { regionCode, year } = req.query;
    if (!regionCode || !year || regionCode === 'undefined' || year === 'undefined') {
        return res.send('<tr><td colspan="2">請選擇區域和年份</td></tr>');
    }

    mmrModel.getMaxMmrByRegionAndYear(regionCode, year, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('<tr><td colspan="2">查詢資料庫錯誤</td></tr>');
        }
        res.render('partials/mmr_table_3', { data: rows });
    });
});

// 功能 4 — 國家名稱關鍵字搜尋（HTMX 片段）
router.get("/search/country", requireLogin, (req, res) => {
    const keyword = req.query.keyword;
    if (!keyword || keyword.length < 2) return res.send('<tr><td colspan="3">請輸入至少 2 個字元</td></tr>');

    mmrModel.searchCountryByName(keyword, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('<tr><td colspan="3">查詢資料庫錯誤</td></tr>');
        }
        res.render('partials/mmr_table_4', { data: rows });
    });
});

// -----------------------------------------------------------
// CRUD 功能 (Function 5-7) - 原樣保留
// -----------------------------------------------------------

router.post("/mmr/add", requireLogin, async (req, res) => {
    const { alpha3, mmr: mmrValue } = req.body;
    if (!alpha3 || !mmrValue || isNaN(parseFloat(mmrValue))) {
        return res.status(400).send('國家和 MMR 值為必填項。');
    }

    try {
        let maxYear = await new Promise((resolve, reject) => {
            mmrModel.getLatestMmrYear(alpha3, (err, year) => {
                if (err) return reject(err);
                resolve(year);
            });
        });

        const newYear = (maxYear ? maxYear : 2020) + 1;

        mmrModel.addNewMmr(alpha3, newYear, parseFloat(mmrValue), (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send(`新增資料失敗：${newYear} 年份的 MMR 已存在。`);
                }
                console.error(err);
                return res.status(500).send('新增資料失敗。');
            }
            res.set('HX-Trigger', 'mmrUpdated');
            res.send(`<div class="alert alert-success alert-dismissible fade show" role="alert">
                  <strong>✅ 成功新增!</strong> ${alpha3} ${newYear} 年度 MMR: ${parseFloat(mmrValue)}。
                  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`);
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('處理新增請求時發生錯誤。');
    }
});

router.post("/mmr/update", requireLogin, (req, res) => {
    const { alpha3, year, mmr: mmrValue } = req.body;

    if (!alpha3 || !year || !mmrValue || isNaN(parseFloat(mmrValue))) {
        return res.status(400).send('國家、年份和 MMR 值為必填項。');
    }

    mmrModel.updateMmr(alpha3, parseInt(year), parseFloat(mmrValue), (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('更新資料失敗。');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('更新失敗：找不到該國家該年份的資料。');
        }

        res.set('HX-Trigger', 'mmrUpdated');
        res.send(`<div class="alert alert-warning alert-dismissible fade show" role="alert">
                <strong>🔄 成功更新!</strong> ${alpha3} ${year} 年度 MMR: ${parseFloat(mmrValue)}。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>`);
    });
});

router.delete("/mmr/delete", requireLogin, (req, res) => {
    const alpha3 = req.body?.alpha3 ?? req.query?.alpha3;
    const year_start = req.body?.year_start ?? req.query?.year_start;
    const year_end = req.body?.year_end ?? req.query?.year_end;

    if (!alpha3 || !year_start || !year_end) {
        return res.status(400).send('國家和年份區間為必填項。');
    }

    const start = parseInt(year_start);
    const end = parseInt(year_end);

    if (start > end) {
        return res.status(400).send('起始年份不能大於結束年份。');
    }

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return res.status(400).send('年份格式錯誤。');
    }

    mmrModel.deleteMmrRange(alpha3, start, end, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('刪除資料失敗。');
        }

        res.set('HX-Trigger', 'mmrUpdated');
        res.send(`<div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong>🗑️ 成功刪除!</strong> ${alpha3} 國家從 ${start} 到 ${end} 年度的 ${result.affectedRows} 筆資料。
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>`);
    });
});

// -----------------------------------------------------------
// 視覺化功能 (Function 8, 回傳 JSON)
// -----------------------------------------------------------

router.get("/mmr/global-average", requireLogin, (req, res) => {
    mmrModel.getGlobalAverageMmr((err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch global average MMR." });
        }
        res.json(rows);
    });
});

module.exports = router;
