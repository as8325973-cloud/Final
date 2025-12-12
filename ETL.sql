/* docker run -it --name Final -p 8080:80 -v .\Final:/app node bash
# 建立並啟動一個名為 Final 的容器，將本機 .\Final 掛載到容器 /app
# 對外開放本機 8080 對應容器 80，使用 node 映像並直接進入 bash 互動模式

docker volume create FinalStorage
# 建立一個名為 FinalStorage 的 Docker volume，用來永久保存 MySQL 資料檔

docker run --name FinalDB -p 3306:3306 -e MYSQL_ROOT_PASSWORD=0000 -v FinalStorage:/var/lib/mysql -v .:/docker-entrypoint-initdb.d -d mysql:latest
# 建立並啟動一個名為 FinalDB 的 MySQL 容器
# 對外開放本機 3306 對應容器 3306
# 設定 root 密碼為 0000
# 將 FinalStorage volume 掛載到 /var/lib/mysql 儲存 MySQL 資料
# 將目前目錄掛載到 /docker-entrypoint-initdb.d，自動執行初始化 SQL/腳本
# 使用 mysql:latest 映像，並以背景模式 (-d) 執行

docker start FinalDB
# 若 FinalDB 容器已存在但停止，啟動 FinalDB 容器

docker exec -it FinalDB mysql -p
# 進入 FinalDB 容器，互動式執行 mysql 客戶端，並從終端輸入 root 密碼

docker cp "C:\Users\417\Documents\data1.csv"     FinalDB:/var/lib/mysql-files/data1.csv
# 將本機 data1.csv 複製到 FinalDB 容器內的 /var/lib/mysql-files/data1.csv

docker cp "C:\Users\417\Documents\data2.csv"     FinalDB:/var/lib/mysql-files/data2.csv
# 將本機 data2.csv 複製到 FinalDB 容器內的 /var/lib/mysql-files/data2.csv */


CREATE DATABASE Final;
-- 建立一個名為 Final 的資料庫

USE Final;
-- 切換目前操作的資料庫為 Final

CREATE USER 'Final'@'172.17.%' IDENTIFIED BY 'FinalPassword';
-- 建立一個名為 Final 的資料庫使用者，限制從 172.17.*.* 網段登入，密碼為 FinalPassword

GRANT ALL ON Final.* TO 'Final'@'172.17.%';
-- 賦予使用者 Final 對 Final 資料庫中所有物件的全部權限

DROP TABLE MMR_DATA_1;
-- 若已存在 MMR_DATA_1 表，先刪除（避免重複建立出錯）

DROP TABLE COUNTRY_REGION_DATA_2;
-- 若已存在 COUNTRY_REGION_DATA_2 表，先刪除

-- SQL for data1.csv (MMR Data)
CREATE TABLE MMR_DATA_1 (
    Entity VARCHAR(50),     -- 政治實體或國家名稱
    Code VARCHAR(50),       -- ISO 3 碼國家代碼
    Year INT,               -- 資料年份
    MMR FLOAT,              -- 每 10 萬活產的孕產婦死亡數
    PRIMARY KEY (Entity, Year)  -- 以 Entity + Year 做組合主鍵（暫時做 staging 用）
);

-- 建立用來暫存 data1.csv 的原始 MMR 資料表
-- SQL for data2.csv (Country Region Data)
CREATE TABLE COUNTRY_REGION_DATA_2 (
    `name` VARCHAR(50),                    -- 國家名稱
    `alpha-2` VARCHAR(50),                 -- ISO alpha-2 兩碼代碼
    `alpha-3` VARCHAR(50),                 -- ISO alpha-3 三碼代碼
    `country-code` INT,                    -- 數值型國家代碼
    `iso_3166-2` VARCHAR(50),              -- ISO 3166-2 代碼
    `region` VARCHAR(50),                  -- 大區名稱（例如 Asia）
    `sub-region` VARCHAR(50),              -- 次區名稱（例如 Eastern Asia）
    `intermediate-region` VARCHAR(50),     -- 中間區名稱（若有）
    `region-code` INT,                     -- 大區代碼
    `sub-region-code` INT,                 -- 次區代碼
    `intermediate-region-code` INT,        -- 中間區代碼
    PRIMARY KEY (`alpha-3`)                -- 以 alpha-3 作為主鍵
);
-- 建立用來暫存 data2.csv 的原始國家與區域資料表

LOAD DATA INFILE '/var/lib/mysql-files/data1.csv'
INTO TABLE MMR_DATA_1
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS
(@Entity, @Code, @Year, @MMR)   -- 先讀入使用者變數，方便後續轉換
SET
    Entity = @Entity,                -- 直接指定 Entity 欄位
    Code   = NULLIF(@Code,''),       -- 若 Code 為空字串則設為 NULL，否則保留原值
    Year   = @Year,                  -- 指定年份
    MMR    = NULLIF(@MMR, '');       -- 若 MMR 為空字串則設為 NULL，避免 FLOAT 轉換錯誤
;
-- 從 data1.csv 載入資料到 MMR_DATA_1，並將空字串轉成 NULL

LOAD DATA INFILE '/var/lib/mysql-files/data2.csv'
INTO TABLE COUNTRY_REGION_DATA_2
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS
(@name, @alpha2, @alpha3, @country_code,
 @iso_3166_2, @region, @sub_region, @intermediate_region,
 @region_code, @sub_region_code, @intermediate_region_code)
-- 先將每欄讀到對應的使用者變數
SET
    `name`                    = @name,                     -- 國家名稱
    `alpha-2`                 = @alpha2,                   -- 兩碼代碼
    `alpha-3`                 = @alpha3,                   -- 三碼代碼
    `country-code`            = @country_code,             -- 數值國碼
    `iso_3166-2`              = @iso_3166_2,               -- ISO 3166-2
    `region`                  = @region,                   -- 大區名稱
    `sub-region`              = @sub_region,               -- 次區名稱
    `intermediate-region`     = @intermediate_region,      -- 中間區名稱
    `region-code`             = NULLIF(@region_code, ''),  -- 空字串轉成 NULL
    `sub-region-code`         = NULLIF(@sub_region_code, ''),  -- 空字串轉成 NULL
    `intermediate-region-code`= NULLIF(@intermediate_region_code, ''); -- 空字串轉成 NULL
;
-- 從 data2.csv 載入資料到 COUNTRY_REGION_DATA_2，並處理空字串為 NULL

CREATE TABLE COUNTRY_MMR (
    country_code VARCHAR(50),   -- 對應 COUNTRY_REGION_DATA_2.`alpha-3`（國家 3 碼代碼）
    year INT,                   -- 年度
    mmr FLOAT,                  -- 當年度 MMR 值
    PRIMARY KEY (country_code, year),
    CONSTRAINT fk_country_mmr_country
        FOREIGN KEY (country_code)
        REFERENCES COUNTRY_REGION_DATA_2(`alpha-3`)
);
-- 建立中繼表 COUNTRY_MMR，將 MMR 與國家分離，並以 alpha-3 做外鍵

INSERT INTO COUNTRY_MMR (country_code, year, mmr)
SELECT
    d1.Code      AS country_code,   -- 取 MMR_DATA_1 中的 ISO 3 碼作為 country_code
    d1.Year      AS year,           -- 年份
    d1.MMR       AS mmr             -- MMR 值
FROM MMR_DATA_1 d1
JOIN COUNTRY_REGION_DATA_2 d2
  ON d1.Code = d2.`alpha-3`;        -- 僅保留在國家表中有對應 alpha-3 的紀錄
-- 將原始 MMR_DATA_1 資料轉入 COUNTRY_MMR，只保留合法國家資料

CREATE TABLE Region (
    region_code INT PRIMARY KEY,         -- 大區代碼（來自 region-code）
    region_name VARCHAR(100) NOT NULL    -- 大區名稱（例如 Asia）
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 建立 Region 表保存大區代碼與名稱

CREATE TABLE SubRegion (
    sub_region_code INT PRIMARY KEY,     -- 次區代碼
    sub_region_name VARCHAR(100) NOT NULL, -- 次區名稱
    region_code INT NOT NULL,            -- 對應上層的大區代碼
    CONSTRAINT fk_subregion_region
        FOREIGN KEY (region_code)
        REFERENCES Region(region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 建立 SubRegion 表，並以 region_code 外鍵連到 Region

CREATE TABLE IntermediateRegion (
    intermediate_region_code INT PRIMARY KEY,         -- 中間區代碼
    intermediate_region_name VARCHAR(100) NOT NULL,   -- 中間區名稱
    sub_region_code INT NOT NULL,                     -- 對應上層次區代碼
    CONSTRAINT fk_intermediate_subregion
        FOREIGN KEY (sub_region_code)
        REFERENCES SubRegion(sub_region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 建立 IntermediateRegion 表，並以 sub_region_code 外鍵連到 SubRegion

CREATE TABLE Country (
    alpha3 CHAR(3) PRIMARY KEY,          -- ISO alpha-3 國家代碼
    name VARCHAR(100) NOT NULL,          -- 國家名稱
    alpha2 CHAR(2) UNIQUE,               -- ISO alpha-2 兩碼代碼，設為唯一
    country_code INT UNIQUE,             -- 數字國碼，設為唯一
    iso_3166_2 VARCHAR(50),              -- ISO-3166-2 代碼，可視需求加 UNIQUE
    sub_region_code INT NOT NULL,        -- 所屬次區代碼
    intermediate_region_code INT NULL,   -- 所屬中間區代碼（可能沒有）
    CONSTRAINT fk_country_subregion
        FOREIGN KEY (sub_region_code)
        REFERENCES SubRegion(sub_region_code),
    CONSTRAINT fk_country_intermediate
        FOREIGN KEY (intermediate_region_code)
        REFERENCES IntermediateRegion(intermediate_region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 建立 Country 表，保存國家基本資訊並連結到次區與中間區

CREATE TABLE CountryMMR (
    alpha3 CHAR(3) NOT NULL,              -- 對應 Country.alpha3 的外鍵
    year INT NOT NULL,                    -- 年度
    mmr FLOAT NULL,                       -- 當年度 MMR（可為 NULL 表示缺值）
    PRIMARY KEY (alpha3, year),
    CONSTRAINT fk_countrymmr_country
        FOREIGN KEY (alpha3)
        REFERENCES Country(alpha3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 建立最終正規化的國家年度 MMR 表，以 alpha3 + year 為主鍵

INSERT INTO Region (region_code, region_name)
SELECT DISTINCT `region-code`, `region`
FROM COUNTRY_REGION_DATA_2
WHERE `region` IS NOT NULL;
-- 從暫存表中抓出不重複的大區代碼與名稱，匯入 Region 表

INSERT INTO SubRegion (sub_region_code, sub_region_name, region_code)
SELECT DISTINCT `sub-region-code`, `sub-region`, `region-code`
FROM COUNTRY_REGION_DATA_2
WHERE `sub-region` IS NOT NULL;
-- 從暫存表中抓出次區代碼、名稱與對應的大區代碼，匯入 SubRegion 表

INSERT INTO IntermediateRegion (intermediate_region_code, intermediate_region_name, sub_region_code)
SELECT DISTINCT `intermediate-region-code`, `intermediate-region`, `sub-region-code`
FROM COUNTRY_REGION_DATA_2
WHERE `intermediate-region-code` IS NOT NULL;
-- 從暫存表中抓出中間區資料，匯入 IntermediateRegion 表（排除沒有中間區的列）

INSERT INTO Country (
    alpha3, name, alpha2, country_code, iso_3166_2,
    sub_region_code, intermediate_region_code
)
SELECT DISTINCT
    `alpha-3`,
    `name`,
    `alpha-2`,
    `country-code`,
    `iso_3166-2`,
    `sub-region-code`,
    `intermediate-region-code`
FROM COUNTRY_REGION_DATA_2;
-- 從暫存表中抓出各國家資訊，匯入 Country 表

INSERT INTO CountryMMR (alpha3, year, mmr)
SELECT
    country_code,   -- 這裡假設 COUNTRY_MMR.country_code = Country.alpha3（三碼代碼）
    year,
    mmr
FROM COUNTRY_MMR;
-- 將 COUNTRY_MMR 中的資料轉入最終的 CountryMMR 表

CREATE TABLE User (
    id            INT AUTO_INCREMENT PRIMARY KEY,                   -- 自動遞增的使用者 ID
    email         VARCHAR(255) NOT NULL UNIQUE,                     -- 使用者 Email，必填且不可重複
    password_hash VARCHAR(255) NOT NULL,                            -- 使用者密碼雜湊值（實務上不應存明碼）
    name          VARCHAR(100) NOT NULL,                            -- 使用者名稱
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,              -- 建立時間，預設為現在時間
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    -- 更新時間，每次更新記錄時自動改為當前時間
);
-- 建立 User 資料表，用於登入與帳號管理

INSERT INTO User (email, password_hash, name)
VALUES ('test@example.com', 'password123', 'Demo User');
-- 新增一筆測試用帳號（注意：目前 password_hash 只是示範文字，實務上應該存加密後的雜湊值）
