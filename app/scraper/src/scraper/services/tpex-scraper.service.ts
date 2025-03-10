import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import * as dayjs from 'dayjs'
import * as numeral from 'numeral'
import { isWeekend } from '@trading-nestjs/common'

/**
 * 負責櫃買中心(TPEx)資料爬蟲
 * @class TpexScraperService
 */
@Injectable()
export class TpexScraperService {
	constructor(private httpService: HttpService) {}

	/**
	 * 爬取上市櫃股票清單，僅台灣證券交易所(TWSE)有實作
	 * @param options 選項
	 * @param options.market 市場類型，預設為 TSE (上市)
	 * @returns 上市櫃股票清單
	 */
	async fetchListedStocks(options?: { market: 'TSE' | 'OTC' }) {
		// 空實作
		return null
	}

	/**
	 * 爬取市場交易量
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 市場交易量
	 */
	async fetchMarketTrades(date: string) {
		const formattedDate = dayjs(date).format('YYYY/MM/DD')
		const queryParams = new URLSearchParams({
			date: formattedDate,
			response: 'json',
		})
		const url = 'https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingIndex?' + queryParams.toString()

		const response = await firstValueFrom(this.httpService.get(url)).then((res) => {
			if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
				return res.data.tables[0].data
			} else {
				return null
			}
		})

		const data = response
			.map((row) => {
				const [date, ...values] = row
				const [year, month, day] = date.split('/')
				const formattedDate = dayjs(`${parseInt(year) + 1911}-${month}-${day}`).format('YYYY-MM-DD')

				const [tradeVolumn, tradeValue, transaction, price, change] = values.map((value) => numeral(value).value())

				return {
					date: formattedDate,
					tradeVolumn,
					tradeValue,
					transaction,
					price,
					change,
				}
			})
			.find((data) => data.date === date)

		return data
	}

	/**
	 * 爬取市場寬幅
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 市場寬幅
	 */
	async fetchMarketBreadth(date: string) {
		const formattedDate = dayjs(date).format('YYYY/MM/DD')
		const queryParams = new URLSearchParams({
			date: formattedDate,
			response: 'json',
		})
		const url = 'https://www.tpex.org.tw/www/zh-tw/afterTrading/highlight?' + queryParams.toString()

		const response = await firstValueFrom(this.httpService.get(url)).then((res) => {
			if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
				return res.data.tables[0].data
			} else {
				return null
			}
		})

		const [, , , , , , , up, limitUp, down, limitDown, unchanged, unmatched] = response[0]
		const marketBreadthData = {
			date: formattedDate,
			up,
			limitUp,
			down,
			limitDown,
			unchanged,
			unmatched: unmatched,
		}

		return marketBreadthData
	}

	/**
	 * 爬取法人買賣超
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 法人買賣超
	 */
	async fetchInstInvestorsTrades(date: string) {
		// 檢查日期是否為周末
		const dayOfWeek = dayjs(date).day()
		if (isWeekend(dayOfWeek)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}
		const formattedDate = dayjs(date).format('YYYY/MM/DD')
		const queryParams = new URLSearchParams({
			date: formattedDate,
			type: 'Daily',
			response: 'json',
		})
		const url = 'https://www.tpex.org.tw/www/zh-tw/insti/summary?' + queryParams.toString()

		const response = await firstValueFrom(this.httpService.get(url)).then((res) => {
			if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].data) {
				return res.data.tables[0].data
			} else {
				return null
			}
		})

		const data = response.map((row) => {
			const parseValue = (row: string[]) => {
				return {
					type: row[0].trim(),
					buy: numeral(row[1]).value(),
					sell: numeral(row[2]).value(),
					netBuySell: numeral(row[3]).value(),
				}
			}
			return parseValue(row)
		})

		const findValue = (type: string, key: keyof (typeof data)[0]) => data.find((item) => item.type === type)?.[key] || 0

		// prettier-ignore
		const result = {
			date: dayjs(date).format('YYYY-MM-DD'),
			foreignDealersExcludedBuy: findValue('外資及陸資(不含自營商)', 'buy'),                 // 外資及陸資(不含外資自營商)買進金額
			foreignDealersExcludedSell: findValue('外資及陸資(不含自營商)', 'sell'),               // 外資及陸資(不含外資自營商)賣出金額
			foreignDealersExcludedNetBuySell: findValue('外資及陸資(不含自營商)', 'netBuySell'),   // 外資及陸資(不含外資自營商)買賣超
			foreignDealersBuy: findValue('外資自營商', 'buy'),                                    // 外資自營商買進金額
			foreignDealersSell: findValue('外資自營商', 'sell'),                                  // 外資自營商賣出金額
			foreignDealersNetBuySell: findValue('外資自營商', 'netBuySell'),                      // 外資自營商買賣超
			foreignInvestorsBuy: findValue('外資及陸資合計', 'buy'),                              // 外資及陸資合計買進金額
			foreignInvestorsSell: findValue('外資及陸資合計', 'sell'),                            // 外資及陸資合計賣出金額
			foreignInvestorsNetBuySell: findValue('外資及陸資合計', 'netBuySell'),                // 外資及陸資合計買賣超
			sitcBuy: findValue('投信', 'buy'),                                                   // 投信買進金額
			sitcSell: findValue('投信', 'sell'),                                                 // 投信賣出金額
			sitcNetBuySell: findValue('投信', 'netBuySell'),                                     // 投信買賣超
			dealersProprietaryBuy: findValue('自營商(自行買賣)', 'buy'),                          // 自營商(自行買賣)買進金額
			dealersProprietarySell: findValue('自營商(自行買賣)', 'sell'),                        // 自營商(自行買賣)賣出金額
			dealersProprietaryNetBuySell: findValue('自營商(自行買賣)', 'netBuySell'),            // 自營商(自行買賣)買賣超
			dealersHedgeBuy: findValue('自營商(避險)', 'buy'),                                   // 自營商(避險)買進金額
			dealersHedgeSell: findValue('自營商(避險)', 'sell'),                                 // 自營商(避險)賣出金額
			dealersHedgeNetBuySell: findValue('自營商(避險)', 'netBuySell'),                     // 自營商(避險)買賣超
			dealersBuy: findValue('自營商合計', 'buy'),                                          // 自營商合計買進金額
			dealersSell: findValue('自營商合計', 'sell'),                                        // 自營商合計賣出金額
			dealersNetBuySell: findValue('自營商合計', 'netBuySell'),                            // 自營商合計買賣超
		}

		return result
	}

	/**
	 * 爬取融資融券餘額
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 融資融券餘額
	 */
	async fetchMarginTransactions(date: string) {
		// 檢查日期是否為周末
		if (isWeekend(date)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}
		const formattedDate = dayjs(date).format('YYYY/MM/DD')
		const queryParams = new URLSearchParams({
			date: formattedDate,
			response: 'json',
		})
		const url = 'https://www.tpex.org.tw/www/zh-tw/margin/balance?' + queryParams.toString()

		const response = await firstValueFrom(this.httpService.get(url)).then((res) => {
			if (res.data.stat.toUpperCase() === 'OK' && res.data.tables[0].summary) {
				return res.data.tables[0].summary
			}
		})

		const sharesRawData = response.filter((row) => row[1] == '合計(張)').flat()

		// prettier-ignore
		const sharesData = {
			date: dayjs(date).format('YYYY-MM-DD'),
			marginBalancePrev: numeral(sharesRawData[2]).value(),     // 融資(張)-前日餘額
			marginPurchase: numeral(sharesRawData[3]).value(),        // 融資(張)-買進
			marginSale: numeral(sharesRawData[4]).value(),            // 融資(張)-賣出
			cashRedemption: numeral(sharesRawData[5]).value(),        // 融資(張)-現金(券)償還
			marginBalance: numeral(sharesRawData[6]).value(),         // 融資(張)-今日餘額
			shortBalancePrev: numeral(sharesRawData[10]).value(),     // 融券(張)-前日餘額
			shortCovering: numeral(sharesRawData[11]).value(),        // 融券(張)-買進
			shortSale: numeral(sharesRawData[12]).value(),            // 融券(張)-賣出
      stockRedemption: numeral(sharesRawData[13]).value(),      // 融券(張)-現金(券)償還
			shortBalance: numeral(sharesRawData[14]).value(),         // 融券(張)-今日餘額
		}

		const marginValueRawData = response.filter((row) => row[1] == '融資金(仟元)').flat()

		// prettier-ignore
		const marginValueData = {
			date: dayjs(date).format('YYYY-MM-DD'),
			marginValueBalancePrev: numeral(marginValueRawData[2]).value(),   // 融資金額(仟元)-前日餘額
			marginValuePurchase: numeral(marginValueRawData[3]).value(),      // 融資金額(仟元)-買進
			marginValueSale: numeral(marginValueRawData[4]).value(),          // 融資金額(仟元)-賣出
			cashRedemptionValue: numeral(marginValueRawData[5]).value(),      // 融資(仟元)-現金(券)償還
      marginBalanceValue: numeral(marginValueRawData[6]).value(),       // 融資(仟元)-今日餘額
		}

		const result = {
			date: dayjs(date).format('YYYY-MM-DD'),
			marginBalance: sharesData.marginBalance,
			marginBalanceChange: sharesData.marginBalance - sharesData.marginBalancePrev,
			marginBalanceValue: marginValueData.marginBalanceValue,
			marginBalanceValueChange: marginValueData.marginBalanceValue - marginValueData.marginValueBalancePrev,
			shortBalance: sharesData.shortBalance,
			shortBalanceChange: sharesData.shortBalance - sharesData.shortBalancePrev,
		}

		return result
	}

	
}
