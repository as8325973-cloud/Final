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
