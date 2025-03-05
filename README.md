# 投資系統開發專案

此專案為 [IT 鐵人賽：從 Node.js 開發者到量化交易者：打造屬於自己的投資系統](https://ithelp.ithome.com.tw/articles/10287218) 的實作練習。使用 NestJS 開發一套投資系統，包含爬蟲、分析、回測、通知等功能。有自行調整一些 API 和使用與筆者不同的套件，並嘗試以 npm workspaces 建立 monorepo 來管理模組化開發。專案撰寫目的為學習 NestJS 框架、學習股市分析以及如何建立一套程式交易系統。

## 執行
``` bash
npm run install 
npm run start:dev
```
已設置 postinstall，但如果 packages/common 沒有正確建置，須確保 ts 檔案經過編譯
``` bash
npm cd packages/common 
npm run build
```
## 實作內容進度

- [x] Day 01 - 環境建立
- [x] Day 02 - 股票清單
- [x] Day 03 - 市場成交資訊
- [x] Day 04 - 三大法人買賣超
- [x] Day 05 - 融資融券餘額
- [ ] Day 06 - 三大法人期貨未平倉


## 參考資料

- [IT 鐵人賽：從 Node.js 開發者到量化交易者](https://ithelp.ithome.com.tw/articles/10287218)

## 授權

此專案採用 MIT 授權條款。詳情請參閱 [LICENSE](LICENSE) 文件。