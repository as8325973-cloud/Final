const config = {
  db: {
    host: "172.17.0.2",
    user: "Final",
    password: "FinalPassword",
    database: "Final",
    connectTimeout: 60000
  },
};

module.exports = config;
/* // 確保連線資訊從環境變數中讀取
const config = {
    db: {
        // 在 Docker Compose 網路中，服務名稱 'mysql' 即為資料庫主機名稱
        host: "mysql", 
        // 從環境變數中讀取使用者帳號，若無則為空字串 (安全考量)
        user: process.env.MYSQL_USER || "", 
        // 從環境變數中讀取密碼
        password: process.env.MYSQL_PASSWORD || "", 
        // 從環境變數中讀取資料庫名稱
        database: process.env.MYSQL_DATABASE || "",
        connectTimeout: 60000
    },
};

module.exports = config; */