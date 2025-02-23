import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import * as numeral from 'numeral';
import * as dayjs from 'dayjs';

/**
 * TwseScraperService 負責台灣證券交易所(TWSE)資料爬蟲
 * @class TwseScraperService
 */
@Injectable()
export class TwseScraperService implements OnApplicationBootstrap {
  constructor(private httpService: HttpService) {}

  /*
   * 在 NestJS 中，OnApplicationBootstrap 是一個 lifecycle hook，當應用程序啟動時，會調用 onApplicationBootstrap 方法
   * 這個鉤子可以用於在應用程序啟動時執行一些初始化操作，例如：
   * 1. 在應用程序啟動時，初始化一些配置
   * 2. 在應用程序啟動時，初始化一些設定
   * ...其他設定
   * 由於只是用於監測，因此確認完可移除，避免每次啟動時都執行
   */
  async onApplicationBootstrap() {}

  /**
   * 取得上市上櫃股票清單
   * @param {Object} options
   * @param {string} options.market 市場類型，預設為 TSE (上市)
   * @returns {Promise<any>}
   */
  async fetchListedStocks(options?: { market: 'TSE' | 'OTC' }) {
    // 根據市場類型選擇不同的 URL
    const url =
      options?.market === 'OTC'
        ? 'https://isin.twse.com.tw/isin/class_main.jsp?market=2&issuetype=4' //上櫃
        : 'https://isin.twse.com.tw/isin/class_main.jsp?market=1&issuetype=1'; //上市

    // 取得網頁 promise，並用 iconv 編碼
    const page = await firstValueFrom(
      this.httpService.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      }),
    ).then((res) => iconv.decode(res.data, 'big5'));

    /*  詳細說明：    
        - nestjs 受到 angular 影響而依賴 RxJS， RxJS 用於處理非同步事件
        - firstValueFrom 是 RxJS 的函數，由於 axios 回傳的是 Observable，所以需要用 firstValueFrom 將其轉換為 Promise
        - observable 和 promise 的不同是，observable 可以返回複數的結果(或錯誤)，並且可以停止或重啟數據流，而 promise 只能回傳單一結果(或錯誤)
        - 在處理 WebSocket、用戶交互事件、定時事件、非同步操作等情況更靈活
        - 並且 observable 可以方便的進行鏈式的處理，更直觀進行過濾、映射、合併、重試等操作，容易閱讀
    */

    // 回應資料為 html 格式，用 cheerio 載入 html 內容
    const $ = cheerio.load(page);

    // 選取表格中的所有列
    const rows = $('table.h4').find('tr');

    // 將每一列轉換為需要的格式
    const stockData = rows
      .slice(1)
      .map((index, element) => {
        const td = $(element).find('td');
        return {
          stockCode: td.eq(2).text().trim(), //股票代碼
          stockName: td.eq(3).text().trim(), //股票名稱
          marketType: td.eq(4).text().trim(), //市場類型
          industryType: td.eq(6).text().trim(), //產業類型
        };
      })
      .toArray();

    return stockData;
  }

  /**
   * 取得上市股票交易資料
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchTSEMarketTrades(date: string) {
    // 檢查日期是否為周末
    const dayOfWeek = dayjs(date).day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('The date is a weekend, no trading data available.');
      return null;
    }

    const formattedDate = dayjs(date).format('YYYYMMDD');
    const queryParams = new URLSearchParams({
      response: 'json',
      date: formattedDate,
    });
    const url = `https://www.twse.com.tw/exchangeReport/FMTQIK?${queryParams.toString()}`;

    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'json' }),
    ).then((res) => {
      if (res.data.stat === 'OK' && res.data.data) {
        return res.data.data;
      } else {
        return null;
      }
    });

    // data 回傳資料格式範例
    /* "data": [
            [
                "114/02/03",
                "7,689,151,963",
                "525,040,931,202",
                "3,784,130",
                "22,694.71",
                "-830.70"
            ],
        ]
    */

    const data = response
      .map((row) => {
        const [date, ...values] = row;
        const [year, month, day] = date.split('/');
        const formattedDate = dayjs(
          `${parseInt(year) + 1911}-${month}-${day}`,
        ).format('YYYY-MM-DD');

        // 將每一個值轉換為數字，去掉逗號
        const [tradeVolumn, tradeValue, transaction, price, change] =
          values.map((value) => numeral(value).value());

        return {
          date: formattedDate,
          tradeVolumn,
          tradeValue,
          transaction,
          price,
          change,
        };
      })
      .find((data) => data.date === date);

    return data;
  }

  /**
   * 取得上市股票市場寬幅
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchMarketBreadth(date: string) {
    //www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20250217&type=MS&response=html
    const formattedDate = dayjs(date).format('YYYYMMDD');
    const queryParams = new URLSearchParams({
      date: formattedDate,
      type: 'MS',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?${queryParams.toString()}`;

    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'json' }),
    ).then((res) => {
      if (res.data.stat === 'OK') {
        return res.data.tables.filter((row) => row.title === '漲跌證券數合計');
      } else {
        return null;
      }
    });

    if (response.length > 0) {
      // 解構函式
      const parseValue = (str: string) => {
        const [value, limit] = str.replace(')', '').split('(');
        return {
          value: numeral(value).value(),
          limit: numeral(limit).value(),
        };
      };

      const [
        { value: up, limit: limitUp },
        { value: down, limit: limitDown },
        { value: unchanged },
        { value: unmatched1 },
        { value: unmatched2 },
      ] = response[0].data.map((row) => parseValue(row[2]));

      const marketBreadthData = {
        date: formattedDate,
        up,
        limitUp,
        down,
        limitDown,
        unchanged,
        unmatched: unmatched1 + unmatched2,
      };

      return marketBreadthData;
    }
  }

  /**
   * 取得三大法人買賣超
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchInstInvestorsTrades(date: string) {
    const formattedDate = dayjs(date).format('YYYYMMDD');
    const queryParams = new URLSearchParams({
      response: 'json',
      dayDate: formattedDate,
      type: 'day',
    });
    const url = `https://www.twse.com.tw/rwd/zh/fund/BFI82U?${queryParams.toString()}`;

    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'json' }),
    ).then((res) => {
      if (res.data.stat === 'OK') {
        return res.data.data;
      } else {
        return null;
      }
    });

    if (!response) {
      console.log('No data available');
      return null;
    }

    const parseValue = (arr: string[]) => {
      const [type, buy, sell, netBuySell] = arr;
      return {
        type,
        buy: numeral(buy).value(),
        sell: numeral(sell).value(),
        netBuySell: numeral(netBuySell).value(),
      };
    };

    const data = response.map(parseValue);

    const findValue = (type: string, key: keyof (typeof data)[0]) =>
      data.find((item) => item.type === type)?.[key] || 0;

    const result = {
      date: dayjs(date).format('YYYY-MM-DD'),
      dealersProprietaryBuy: findValue('自營商(自行買賣)', 'buy'),
      dealersProprietarySell: findValue('自營商(自行買賣)', 'sell'),
      dealersProprietaryNetBuySell: findValue('自營商(自行買賣)', 'netBuySell'),
      dealersHedgeBuy: findValue('自營商(避險)', 'buy'),
      dealersHedgeSell: findValue('自營商(避險)', 'sell'),
      dealersHedgeNetBuySell: findValue('自營商(避險)', 'netBuySell'),
      sitcBuy: findValue('投信', 'buy'),
      sitcSell: findValue('投信', 'sell'),
      sitcNetBuySell: findValue('投信', 'netBuySell'),
      foreignDealersExcludedBuy: findValue('外資及陸資(不含外資自營商)', 'buy'),
      foreignDealersExcludedSell: findValue(
        '外資及陸資(不含外資自營商)',
        'sell',
      ),
      foreignDealersExcludedNetBuySell: findValue(
        '外資及陸資(不含外資自營商)',
        'netBuySell',
      ),
      foreignDealersBuy: findValue('外資自營商', 'buy'),
      foreignDealersSell: findValue('外資自營商', 'sell'),
      foreignDealersNetBuySell: findValue('外資自營商', 'netBuySell'),
      dealersBuy: 0,
      dealersSell: 0,
      dealersNetBuySell: 0,
      foreignInverstorsBuy: 0,
      foreignInverstorsSell: 0,
      foreignInverstorsNetBuySell: 0,
    };

    // 自營商合計(自行買賣+避險)
    result.dealersBuy = result.dealersProprietaryBuy + result.dealersHedgeBuy;
    result.dealersSell =
      result.dealersProprietarySell + result.dealersHedgeSell;
    result.dealersNetBuySell =
      result.dealersProprietaryNetBuySell + result.dealersHedgeNetBuySell;

    // 外資合計(外資及陸資 + 外資自營商)
    result.foreignInverstorsBuy =
      result.foreignDealersExcludedBuy + result.foreignDealersBuy;
    result.foreignInverstorsSell =
      result.foreignDealersExcludedSell + result.foreignDealersSell;
    result.foreignInverstorsNetBuySell =
      result.foreignDealersExcludedNetBuySell + result.foreignDealersNetBuySell;

    return result;
  }
}
