import { Injectable } from '@nestjs/common'
import * as dayjs from 'dayjs'
import { firstValueFrom } from 'rxjs'
import * as csvtojson from 'csvtojson'
import * as iconv from 'iconv-lite'
import { HttpService } from '@nestjs/axios'
import * as numeral from 'numeral'

/**
 * 負責台灣期貨交易所(TAIFEX)資料爬蟲
 * @class TaifexScraperService
 */
@Injectable()
export class TaifexScraperService {
	constructor(private httpService: HttpService) {}

	/*
	 */
	// async fetchInstInvestorsTxfTrades(date: string) {
	// 	const formatDate = dayjs(date).format('YYYY/MM/DD')
	// 	console.log(date, formatDate)
	// 	const postForm = new URLSearchParams({
	// 		queryDate: formatDate,
	// 		queryType: '1',
	// 	})
	// 	const url = 'https://www.taifex.com.tw/cht/3/totalTableDateExcel'

	// 	const page = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
	// 		iconv.decode(res.data, 'utf-8'),
	// 	)

	// 	// 使用 cheerio 解析 HTML
	// 	const $ = cheerio.load(page)

	// 	// 提取 <table> 元素
	// 	const tables = $('table')

	// 	// 提取表格的行數據
	// 	const rows = tables.find('tr')
	// 	const tableData = []

	// 	rows.each((index, row) => {
	// 		const columns = $(row).find('td')
	// 		const rowData = []

	// 		columns.each((i, column) => {
	// 			rowData.push($(column).text().trim())
	// 		})

	// 		if (rowData.length > 0) {
	// 			tableData.push(rowData)
	// 		}
	// 	})

	// 	const [tableName, desc, dealersTrade, sitcTrade, finiTrade, totalTrade, dealersOi, sitcOi, finiOi] = tableData

	// 	const result = {
	// 		date: formatDate,

	// 		finiLongTradeVolume: numeral(finiTrade[0]).value(),
	// 		finiLongTradeValue: numeral(finiTrade[1]).value(),
	// 		finiShortTradeVolume: numeral(finiTrade[2]).value(),
	// 		finiShortTradeValue: numeral(finiTrade[3]).value(),
	// 		finiNetTradeVolume: numeral(finiTrade[4]).value(),
	// 		finiNetTradeValue: numeral(finiTrade[5]).value(),
	// 		finiLongOiVolume: numeral(finiOi[0]).value(),
	// 		finiLongOiValue: numeral(finiOi[1]).value(),
	// 		finiShortOiVolume: numeral(finiOi[2]).value(),
	// 		finiShortOiValue: numeral(finiOi[3]).value(),
	// 		finiNetOiVolume: numeral(finiOi[4]).value(),
	// 		finiNetOiValue: numeral(finiOi[5]).value(),

	// 		sitcLongTradeVolume: numeral(sitcTrade[0]).value(),
	// 		sitcLongTradeValue: numeral(sitcTrade[1]).value(),
	// 		sitcShortTradeVolume: numeral(sitcTrade[2]).value(),
	// 		sitcShortTradeValue: numeral(sitcTrade[3]).value(),
	// 		sitcNetTradeVolume: numeral(sitcTrade[4]).value(),
	// 		sitcNetTradeValue: numeral(sitcTrade[5]).value(),
	// 		sitcLongOiVolume: numeral(sitcOi[0]).value(),
	// 		sitcLongOiValue: numeral(sitcOi[1]).value(),
	// 		sitcShortOiVolume: numeral(sitcOi[2]).value(),
	// 		sitcShortOiValue: numeral(sitcOi[3]).value(),
	// 		sitcNetOiVolume: numeral(sitcOi[4]).value(),
	// 		sitcNetOiValue: numeral(sitcOi[5]).value(),

	// 		dealersLongTradeVolume: numeral(dealersTrade[0]).value(),
	// 		dealersLongTradeValue: numeral(dealersTrade[1]).value(),
	// 		dealersShortTradeVolume: numeral(dealersTrade[2]).value(),
	// 		dealersShortTradeValue: numeral(dealersTrade[3]).value(),
	// 		dealersNetTradeVolume: numeral(dealersTrade[4]).value(),
	// 		dealersNetTradeValue: numeral(dealersTrade[5]).value(),
	// 		dealersLongOiVolume: numeral(dealersOi[0]).value(),
	// 		dealersLongOiValue: numeral(dealersOi[1]).value(),
	// 		dealersShortOiVolume: numeral(dealersOi[2]).value(),
	// 		dealersShortOiValue: numeral(dealersOi[3]).value(),
	// 		dealersNetOiVolume: numeral(dealersOi[4]).value(),
	// 		dealersNetOiValue: numeral(dealersOi[5]).value(),
	// 	}

	// 	console.log(result)
	// }

	/**
	 * 三大法人臺股期貨未平倉
	 * @param date 日期格式: YYYY-MM-DD
	 */
	async fetchInstInvestorsTxfTrades(date: string) {
		const formatDate = dayjs(date).format('YYYY/MM/DD')
		const url = `https://www.taifex.com.tw/cht/3/futContractsDateDown`
		const postForm = new URLSearchParams({
			queryStartDate: formatDate,
			queryEndDate: formatDate,
			commodityId: 'TXF',
		})
		const response = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
			csvtojson().fromString(iconv.decode(res.data, 'big5')),
		)

		const convertData = (data) => {
			const result = {}

			data.forEach((item) => {
				const categoryMap = {
					自營商: 'dealers',
					外資及陸資: 'fini',
					投信: 'sitc',
				}

				const category = categoryMap[item['身份別']]

				if (category) {
					result[`${category}LongTradeVolume`] = numeral(item['多方交易口數']).value()
					result[`${category}LongTradeValue`] = numeral(item['多方交易契約金額(千元)']).value()
					result[`${category}ShortTradeVolume`] = numeral(item['空方交易口數']).value()
					result[`${category}ShortTradeValue`] = numeral(item['空方交易契約金額(千元)']).value()
					result[`${category}NetTradeVolume`] = numeral(item['多空交易口數淨額']).value()
					result[`${category}NetTradeValue`] = numeral(item['多空交易契約金額淨額(千元)']).value()
					result[`${category}LongOiVolume`] = numeral(item['多方未平倉口數']).value()
					result[`${category}LongOiValue`] = numeral(item['多方未平倉契約金額(千元)']).value()
					result[`${category}ShortOiVolume`] = numeral(item['空方未平倉口數']).value()
					result[`${category}ShortOiValue`] = numeral(item['空方未平倉契約金額(千元)']).value()
					result[`${category}NetOiVolume`] = numeral(item['多空未平倉口數淨額']).value()
					result[`${category}NetOiValue`] = numeral(item['多空未平倉契約金額淨額(千元)']).value()
				}
			})

			return result
		}

		return {
			date: formatDate,
			...convertData(response),
		}
	}
}
