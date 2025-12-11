const express = require('express');
const router = express.Router();
const mmrModel = require('../models/mmr'); 

// 檢查是否已登入的 Middleware
const requireLogin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        // 使用 HTMX 重新導向標頭
        res.set('HX-Redirect', '/signin');
        return res.status(401).send('請先登入.');
    }
    next();
};

// -----------------------------------------------------------
// 靜態資料 API (選單用)
// -----------------------------------------------------------

router.get("/countries", (req, res) => {
    mmrModel.getAllCountries((err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch countries." });
        res.json(rows);
    });
});

router.get("/subregions", (req, res) => {
    mmrModel.getAllSubRegions((err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch subregions." });
        res.json(rows);
    });
});

router.get("/regions", (req, res) => {
    mmrModel.getAllRegions((err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch regions." });
        res.json(rows);
    });
});

// -----------------------------------------------------------
// 查詢功能 (Function 1-4, 回傳 HTMX 片段)
// -----------------------------------------------------------

// 功能 1 — 依國家查詢歷年 MMR 
router.get("/mmr/history/:alpha3", requireLogin, (req, res) => {
    const alpha3 = req.params.alpha3;
    if (!alpha3 || alpha3 === 'undefined') return res.send('<tr><td colspan="2">請選擇國家</td></tr>');

    mmrModel.getMmrHistoryByCountry(alpha3, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('<tr><td colspan="2">查詢資料庫錯誤</td></tr>');
        }
        // 回傳 HJS 渲染片段
        res.render('partials/mmr_table_1', { data: rows, alpha3: alpha3 });
    });
});

// 功能 2 — 查某 SubRegion 在某年的所有國家 MMR 
router.get("/mmr/subregion/:subRegionCode/:year", requireLogin, (req, res) => {
    const { subRegionCode, year } = req.params;
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

// 功能 3 — 查某 Region 在某年的所有 SubRegion「最大 MMR」
router.get("/mmr/regionmax/:regionCode/:year", requireLogin, (req, res) => {
    const { regionCode, year } = req.params;
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

// 功能 4 — 國家名稱關鍵字搜尋
router.get("/search/country", requireLogin, (req, res) => {
    const keyword = req.query.keyword;
    // 關鍵字長度檢查
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
// CRUD 功能 (Function 5-7)
// -----------------------------------------------------------

// 功能 5 — 新增某國家下一年度的 MMR (POST)
router.post("/mmr/add", requireLogin, async (req, res) => {
    const { alpha3, mmr: mmrValue } = req.body;
    
    if (!alpha3 || !mmrValue || isNaN(parseFloat(mmrValue))) {
        return res.status(400).send('國家和 MMR 值為必填項。');
    }

    try {
        // 1. 找到最新年份 + 1
        let maxYear = await new Promise((resolve, reject) => {
            mmrModel.getLatestMmrYear(alpha3, (err, year) => {
                if (err) return reject(err);
                resolve(year);
            });
        });

        // 預設從 2021 開始，否則加 1
        const newYear = (maxYear ? maxYear : 2020) + 1; 

        // 2. 插入新資料
        mmrModel.addNewMmr(alpha3, newYear, parseFloat(mmrValue), (err, result) => {
            if (err) {
                // MySQL 錯誤碼 1062 代表 PRIMARY KEY 重複 (該年已存在)
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send(`新增資料失敗：${newYear} 年份的 MMR 已存在。`);
                }
                console.error(err);
                return res.status(500).send('新增資料失敗。');
            }
            // 使用 HTMX 回傳訊息並觸發事件，讓依賴的區塊重新載入
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

// 功能 6 — 更新某國家某年的 MMR (POST)
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

// 功能 7 — 刪除某國家某年份區間的 MMR (DELETE)
router.delete("/mmr/delete", requireLogin, (req, res) => {
    const { alpha3, year_start, year_end } = req.body;
    
    if (!alpha3 || !year_start || !year_end) {
        return res.status(400).send('國家和年份區間為必填項。');
    }
    
    const start = parseInt(year_start);
    const end = parseInt(year_end);
    
    if (start > end) {
        return res.status(400).send('起始年份不能大於結束年份。');
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

// 功能 8 — 全球平均 MMR 趨勢圖資料
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