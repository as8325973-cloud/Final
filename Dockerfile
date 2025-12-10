#1. 指定基礎映像檔：選擇最新的 Node.js 穩定版

FROM node:latest

#2. 設定工作目錄：設定 /app 為容器內所有操作的預設目錄

WORKDIR /app

#3. 複製應用程式檔案：將專案目錄中的所有檔案複製到容器的 /app 目錄

#假設您的專案原始碼在當前目錄下

COPY . /app

#4. 安裝專案依賴：根據 package.json 安裝所有需要的函式庫

#這會取代您手動執行的 npm i express hjs mysql2 ...

RUN npm install

#5. [可選] 安裝全域工具：安裝 nodemon

#如果您在正式環境部署，通常會使用 node app.js 而不是 nodemon

RUN npm install -g nodemon

#6. 暴露應用程式使用的網路埠 (Port)：您的 Express 應用程式監聽 Port 80

EXPOSE 80

#7. 定義啟動容器時要執行的預設命令

#使用 nodemon -L app.js 來啟動並監聽文件變更（僅適用於開發環境）

#如果是正式部署，建議使用：CMD [ "node", "app.js" ]

CMD ["nodemon", "-L", "app.js"]