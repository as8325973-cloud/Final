const mmr = {};
let connection;


// 設置資料庫連線
mmr.setConnection = (conn) => {
    connection = conn;
};

// -----------------------------------------------------------
// 輔助與初始化功能
// -----------------------------------------------------------

// 取得所有國家 (用於選單)
mmr.getAllCountries = (callback) => {
    const sql = `
    SELECT DISTINCT C.alpha3, C.name
    FROM Country C
    JOIN CountryMMR M ON M.alpha3 = C.alpha3
    -- 如果你也想排除 mmr 欄位是 NULL 的資料，加這行：
    -- WHERE M.mmr IS NOT NULL
    ORDER BY C.name ASC
  `;
    

    connection.query(sql, callback);
};

// 取得所有次區域 (用於選單)
mmr.getAllSubRegions = (callback) => {
    const sql = `SELECT sub_region_code, sub_region_name FROM SubRegion ORDER BY sub_region_name ASC`;
    connection.query(sql, callback);
};

// 取得所有區域 (用於選單)
mmr.getAllRegions = (callback) => {
    const sql = `SELECT region_code, region_name FROM Region ORDER BY region_name ASC`;
   connection.query(sql, callback);
};

// -----------------------------------------------------------
// 查詢功能 (Function 1 - 4 & 8)
// -----------------------------------------------------------

// 功能 1 — 依國家查詢歷年 MMR (由小到大排序)
mmr.getMmrHistoryByCountry = (alpha3, callback) => {
    const sql = `
        SELECT year, mmr
        FROM CountryMMR
        WHERE alpha3 = ?
        ORDER BY year ASC
    `;
    connection.query(sql, [alpha3], callback);
};

// 功能 2 — 查某 SubRegion 在某年的所有國家 MMR (由大到小排序)
mmr.getMmrBySubRegionAndYear = (subRegionCode, year, callback) => {
    const sql = `
    SELECT C.name AS name, CMMR.mmr, C.alpha3
    FROM Country C
    JOIN CountryMMR CMMR ON C.alpha3 = CMMR.alpha3
    WHERE C.sub_region_code = ? AND CMMR.year = ?
    ORDER BY CMMR.mmr DESC
`;
    connection.query(sql, [subRegionCode, year], callback);
};

// 功能 3 — 查某 Region 在某年的所有 SubRegion「最大 MMR」
mmr.getMaxMmrByRegionAndYear = (regionCode, year, callback) => {
    // 使用 JOIN 串接 Region, SubRegion, Country, CountryMMR
    const sql = `
        SELECT 
            SR.sub_region_name,
            MAX(CMMR.mmr) AS max_mmr
        FROM Region R
        JOIN SubRegion SR ON R.region_code = SR.region_code
        JOIN Country C ON SR.sub_region_code = C.sub_region_code
        JOIN CountryMMR CMMR ON C.alpha3 = CMMR.alpha3
        WHERE R.region_code = ? AND CMMR.year = ?
        GROUP BY SR.sub_region_name
        ORDER BY SR.sub_region_name ASC, max_mmr DESC
    `;
    connection.query(sql, [regionCode, year], callback);
};

// 功能 4 — 國家名稱關鍵字搜尋 (顯示最新年份的 MMR，並依 MMR DESC 排序)
mmr.searchCountryByName = (keyword, callback) => {
   const sql = `
    SELECT 
        C.name AS name,
        C.alpha3,
        CMMR_Latest.mmr
    FROM Country C
    JOIN CountryMMR CMMR_Latest 
        ON C.alpha3 = CMMR_Latest.alpha3 
        AND CMMR_Latest.year = (
            SELECT MAX(year) 
            FROM CountryMMR 
            WHERE alpha3 = C.alpha3
        )
    WHERE C.name LIKE ?
    ORDER BY CMMR_Latest.mmr DESC
`;
connection.query(sql, [`%${keyword}%`], callback);
};

// 功能 8 — 取得全球平均 MMR (用於趨勢圖)
mmr.getGlobalAverageMmr = (callback) => {
    const sql = `
        SELECT year, AVG(mmr) as avg_mmr
        FROM CountryMMR
        GROUP BY year
        ORDER BY year ASC
    `;
    connection.query(sql, callback);
};

// -----------------------------------------------------------
// CRUD 功能 (Function 5 - 7)
// -----------------------------------------------------------

// 輔助功能：取得國家最新年份
mmr.getLatestMmrYear = (alpha3, callback) => {
    const sql = `SELECT MAX(year) as max_year FROM CountryMMR WHERE alpha3 = ?`;
    connection.query(sql, [alpha3], (err, rows) => {
        if (err) return callback(err);
        callback(null, rows[0] ? rows[0].max_year : null);
    });
};

// 功能 5 — 新增某國家下一年度的 MMR
mmr.addNewMmr = (alpha3, year, mmrValue, callback) => {
    const sql = `
        INSERT INTO CountryMMR (alpha3, year, mmr)
        VALUES (?, ?, ?)
    `;
    connection.query(sql, [alpha3, year, mmrValue], callback);
};

// 功能 6 — 更新某國家某年的 MMR
mmr.updateMmr = (alpha3, year, mmrValue, callback) => {
    const sql = `
        UPDATE CountryMMR
        SET mmr = ?
        WHERE alpha3 = ? AND year = ?
    `;
    connection.query(sql, [mmrValue, alpha3, year], callback);
};

// 功能 7 — 刪除某國家某年份區間的 MMR
mmr.deleteMmrRange = (alpha3, yearStart, yearEnd, callback) => {
    const sql = `
        DELETE FROM CountryMMR
        WHERE alpha3 = ? AND year BETWEEN ? AND ?
    `;
    connection.query(sql, [alpha3, yearStart, yearEnd], callback);
};


module.exports = mmr;