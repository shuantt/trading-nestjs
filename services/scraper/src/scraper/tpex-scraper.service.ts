import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as dayjs from 'dayjs';
import * as numeral from 'numeral';
import { isWeekend } from '@trading-nestjs/common';

/**
 * TpexScraperService 負責櫃買中心(TPEx)資料爬蟲
 * @class TpexScraperService
 */
@Injectable()
export class TpexScraperService implements OnApplicationBootstrap {
  constructor(private httpService: HttpService) {}

  async onApplicationBootstrap() {
    console.log('TpexScraperService has been initialized.');
    const date = dayjs().format('YYYY-MM-DD');
    const test = isWeekend(date);
    console.log(test);
  }

  /**
   * 取得上櫃股票交易資料
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchOTCMarketTrades(date: string) {
    const formattedDate = dayjs(date).format('YYYY/MM/DD');
    const queryParams = new URLSearchParams({
      date: formattedDate,
      response: 'json',
    });
    const url =
      'https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingIndex?' +
      queryParams.toString();

    const response = await firstValueFrom(this.httpService.get(url)).then(
      (res) => {
        if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
          return res.data.tables[0].data;
        } else {
          return null;
        }
      },
    );

    const data = response
      .map((row) => {
        const [date, ...values] = row;
        const [year, month, day] = date.split('/');
        const formattedDate = dayjs(
          `${parseInt(year) + 1911}-${month}-${day}`,
        ).format('YYYY-MM-DD');

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
   * 取得上櫃股票市場寬幅
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchOTCMarketBreadth(date: string) {
    const formattedDate = dayjs(date).format('YYYY/MM/DD');
    console.log(formattedDate);
    const queryParams = new URLSearchParams({
      date: formattedDate,
      response: 'json',
    });
    const url =
      'https://www.tpex.org.tw/www/zh-tw/afterTrading/highlight?' +
      queryParams.toString();

    const response = await firstValueFrom(this.httpService.get(url)).then(
      (res) => {
        if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
          return res.data.tables[0].data;
        } else {
          return null;
        }
      },
    );

    const [, , , , , , , up, limitUp, down, limitDown, unchanged, unmatched] =
      response[0];

    const marketBreadthData = {
      date: formattedDate,
      up,
      limitUp,
      down,
      limitDown,
      unchanged,
      unmatched: unmatched,
    };

    return marketBreadthData;
  }

  /**
   * 取得上櫃法人買賣超
   * @param {string} date 格式為 YYYY-MM-DD
   * @returns {Promise<any>}
   */
  async fetchOTCInstInvestorsTrades(date: string) {
    const formattedDate = dayjs(date).format('YYYY/MM/DD');
    const queryParams = new URLSearchParams({
      date: formattedDate,
      type: 'Daily',
      response: 'json',
    });
    const url =
      'https://www.tpex.org.tw/www/zh-tw/insti/summary?' +
      queryParams.toString();

    const response = await firstValueFrom(this.httpService.get(url)).then(
      (res) => {
        if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
          return res.data.tables[0].data;
        } else {
          return null;
        }
      },
    );

    const data = response.map((row) => {
      const parseValue = (row: string[]) => {
        return {
          type: row[0].trim(),
          buy: numeral(row[1]).value(),
          sell: numeral(row[2]).value(),
          netBuySell: numeral(row[3]).value(),
        };
      };
      return parseValue(row);
    });

    const findValue = (type: string, key: keyof (typeof data)[0]) =>
      data.find((item) => item.type === type)?.[key] || 0;

    const result = {
      date: dayjs(date).format('YYYY-MM-DD'),
      foreignDealersExcludedBuy: findValue('外資及陸資(不含自營商)', 'buy'), // 外資及陸資(不含外資自營商)買進金額
      foreignDealersExcludedSell: findValue('外資及陸資(不含自營商)', 'sell'), // 外資及陸資(不含外資自營商)賣出金額
      foreignDealersExcludedNetBuySell: findValue(
        '外資及陸資(不含自營商)',
        'netBuySell',
      ), // 外資及陸資(不含外資自營商)買賣超
      foreignDealersBuy: findValue('外資自營商', 'buy'), // 外資自營商買進金額
      foreignDealersSell: findValue('外資自營商', 'sell'), // 外資自營商賣出金額
      foreignDealersNetBuySell: findValue('外資自營商', 'netBuySell'), // 外資自營商買賣超
      foreignInvestorsBuy: findValue('外資及陸資合計', 'buy'), // 外資及陸資合計買進金額
      foreignInvestorsSell: findValue('外資及陸資合計', 'sell'), // 外資及陸資合計賣出金額
      foreignInvestorsNetBuySell: findValue('外資及陸資合計', 'netBuySell'), // 外資及陸資合計買賣超
      sitcBuy: findValue('投信', 'buy'), // 投信買進金額
      sitcSell: findValue('投信', 'sell'), // 投信賣出金額
      sitcNetBuySell: findValue('投信', 'netBuySell'), // 投信買賣超
      dealersProprietaryBuy: findValue('自營商(自行買賣)', 'buy'), // 自營商(自行買賣)買進金額
      dealersProprietarySell: findValue('自營商(自行買賣)', 'sell'), // 自營商(自行買賣)賣出金額
      dealersProprietaryNetBuySell: findValue('自營商(自行買賣)', 'netBuySell'), // 自營商(自行買賣)買賣超
      dealersHedgeBuy: findValue('自營商(避險)', 'buy'), // 自營商(避險)買進金額
      dealersHedgeSell: findValue('自營商(避險)', 'sell'), // 自營商(避險)賣出金額
      dealersHedgeNetBuySell: findValue('自營商(避險)', 'netBuySell'), // 自營商(避險)買賣超
      dealersBuy: findValue('自營商合計', 'buy'), // 自營商合計買進金額
      dealersSell: findValue('自營商合計', 'sell'), // 自營商合計賣出金額
      dealersNetBuySell: findValue('自營商合計', 'netBuySell'), // 自營商合計買賣超
    };

    return result;
  }
}
