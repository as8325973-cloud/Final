# Final
```mermaid
erDiagram
    REGION {
        int    region_code PK
        string region_name
    }

    SUBREGION {
        int    sub_region_code PK
        string sub_region_name
        int    region_code FK
    }

    INTERMEDIATEREGION {
        int    intermediate_region_code PK
        string intermediate_region_name
        int    sub_region_code FK
    }

    COUNTRY {
        string alpha3 PK
        string name
        string alpha2
        int    country_code
        string iso_3166_2
        int    sub_region_code FK
        int    intermediate_region_code FK
    }

    COUNTRYMMR {
        string alpha3 PK,FK
        int    year   PK
        float  mmr
    }

    REGION ||--o{ SUBREGION          : "has"
    SUBREGION ||--o{ INTERMEDIATEREGION : "has"
    SUBREGION ||--o{ COUNTRY          : "contains"
    INTERMEDIATEREGION ||--o{ COUNTRY : "contains"
    COUNTRY ||--o{ COUNTRYMMR         : "has"

# Final
資料表說明與用途
1. Region（大區）

欄位

region_code：大區代碼（主鍵）

region_name：大區名稱（例如：Asia, Europe）

用途

儲存最高層級的地理區域資訊（Region）。

作為 SubRegion 的上層分類，方便做「依地區統整」的查詢。

關聯

一個 Region 對多個 SubRegion：Region ||--o{ SubRegion

2. SubRegion（次區 / 子區域）

欄位

sub_region_code：子區域代碼（主鍵）

sub_region_name：子區域名稱（例如：Eastern Asia, Western Europe）

region_code：對應的大區代碼（外鍵 → Region.region_code）

用途

表示每個子區域隸屬哪一個大區。

之後在網頁功能中，可用來實作：

「選擇子區域 + 年份 → 顯示該子區域內所有國家的 MMR」

「選擇地區 + 年份 → 依子區域的最高 MMR 排序」

關聯

Region 一對多 SubRegion

SubRegion 一對多 Country

SubRegion 一對多 IntermediateRegion

3. IntermediateRegion（中間區域，可選）

欄位

intermediate_region_code：中間區代碼（主鍵）

intermediate_region_name：中間區名稱

sub_region_code：所屬子區域（外鍵 → SubRegion.sub_region_code）

用途

有些地理分類會在子區域下再多一層中間區，例如某些國際統計的細分區。

串接 SubRegion 與 Country，讓層級更精細（如果原始資料有提供）。

關聯

SubRegion 一對多 IntermediateRegion

IntermediateRegion 一對多 Country（國家可選擇是否有中間區）

4. Country（國家基本資料）

欄位

alpha3：3 碼國家代碼（主鍵，對應 ISO alpha-3）

name：國家名稱（例如：Taiwan, Japan）

alpha2：2 碼國家代碼（唯一）

country_code：數字國碼（唯一）

iso_3166_2：ISO 3166-2 代碼

sub_region_code：所屬子區域（外鍵 → SubRegion.sub_region_code）

intermediate_region_code：所屬中間區（可為 NULL，外鍵 → IntermediateRegion.intermediate_region_code）

用途

儲存所有「國家層級」的靜態資訊，作為整個 schema 的核心實體。

所有與「國家」相關的操作（搜尋國家、下拉選單、區域分析）都透過這張表。

關聯

一個 SubRegion 可以包含多個 Country

一個 IntermediateRegion 可以包含多個 Country

一個 Country 對多個 CountryMMR：Country ||--o{ CountryMMR

5. CountryMMR（國家歷年 MMR 資料）

欄位

alpha3：國家代碼（外鍵 → Country.alpha3，為複合主鍵的一部分）

year：年份（複合主鍵的一部分）

mmr：該國家在該年份的孕產婦死亡率（Maternal Mortality Ratio）

主鍵

複合主鍵：(alpha3, year)
→ 同一國家同一年只有一筆 MMR 資料。

用途

儲存每個國家在各年份的 MMR 數據。

直接支援你規劃的功能，例如：

顯示單一國家 MMR 歷年趨勢

依子區域 + 年份排序各國 MMR

搜尋國家名稱 + 顯示最近年份的 MMR

新增 / 更新 / 刪除某國家在特定年份的 MMR 紀錄

關聯

Country 一對多 CountryMMR

透過 Country → SubRegion / Region 可以做跨區域統計與比較
