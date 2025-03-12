import { Injectable } from '@nestjs/common'
import * as dayjs from 'dayjs'
import { firstValueFrom } from 'rxjs'
import * as csvtojson from 'csvtojson'
import * as iconv from 'iconv-lite'
import { HttpService } from '@nestjs/axios'
import * as numeral from 'numeral'
import { isWeekend } from '@trading-nestjs/common'
import { lookupService } from 'dns'
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
	 * 三大法人臺指期貨未平倉
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

	/**
	 * 三大法人臺指選擇權
	 * 買權未平倉淨口數增加代表看漲，賣權未平倉淨口數增加代表看跌
	 * 淨金額增加代表短期看漲，淨金額減少代表短期看跌
	 * 搭配期貨觀察，如果期貨選擇權方向不一致，選擇權可能是用於避險
	 * @param date 日期格式: YYYY-MM-DD
	 */
	async fetchInstInverstorsTxoTrades(date: string) {
		const queryDate = dayjs(date).format('YYYY/MM/DD')
		if (isWeekend(date)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}

		const url = `https://www.taifex.com.tw/cht/3/callsAndPutsDateDown`
		const postForm = new URLSearchParams({
			queryStartDate: queryDate,
			queryEndDate: queryDate,
			commodityId: 'TXO', // 契約-台指選擇權
		})

		const response = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
			csvtojson().fromString(iconv.decode(res.data, 'big5')),
		)

		const fields = [
			{ name: '身份別', key: 'identity' },
			{ name: '商品名稱', key: 'commodityName' },
			{ name: '買賣權別', key: 'callOrPut' },
			{ name: '買方交易口數', key: 'LongTradeVolume' },
			{ name: '買方交易契約金額(千元)', key: 'LongTradeValue' },
			{ name: '賣方交易口數', key: 'ShortTradeVolume' },
			{ name: '賣方交易契約金額(千元)', key: 'ShortTradeValue' },
			{ name: '交易口數買賣淨額', key: 'NetTradeVolume' },
			{ name: '交易契約金額買賣淨額(千元)', key: 'NetTradeValue' },
			{ name: '買方未平倉口數', key: 'LongOiVolume' },
			{ name: '買方未平倉契約金額(千元)', key: 'LongOiValue' },
			{ name: '賣方未平倉口數', key: 'ShortOiVolume' },
			{ name: '賣方未平倉契約金額(千元)', key: 'ShortOiValue' },
			{ name: '未平倉口數買賣淨額', key: 'NetOiVolume' },
			{ name: '未平倉契約金額買賣淨額(千元)', key: 'NetOiValue' },
		]

		const result = response.map((row) => {
			let item: any = {}
			fields.forEach((field) => {
				item[field.key] = row[field.name]
				if (field.key === 'identity') {
					let identityEN = ''
					switch (row[field.name]) {
						case '自營商':
							identityEN = 'dealers'
							break
						case '外資及陸資':
							identityEN = 'fini'
							break
						case '投信':
							identityEN = 'sitc'
							break
						default:
							identityEN = row[field.name]
							break
					}
					item[field.key] = identityEN
				}
				if (field.key === 'callOrPut') {
					let formatCallOrPut = ''
					switch (row[field.name]) {
						case 'CALL':
							formatCallOrPut = 'Calls'
							break
						case 'PUT':
							formatCallOrPut = 'Puts'
							break
						default:
							formatCallOrPut = row[field.name]
							break
					}
					item[field.key] = formatCallOrPut
				}
			})
			return item
		})

		// 個人喜歡上述物件格式，但避免和筆者的程式差太多不好除錯，因此跟著筆者的輸出格式，key = identity + callOrPut + key
		const finalResult: any = { date: queryDate } //保留 date
		result.forEach((item) => {
			const identity = item.identity
			for (const key of fields.map((field) => field.key)) {
				if (item[key] !== undefined && key !== 'identity' && key !== 'callOrPut' && key !== 'commodityName') {
					finalResult[`${identity}${item.callOrPut}${key}`] = numeral(item[key]).value()
				}
			}
		})

		return finalResult
	}

	/**
	 * 臺指選擇權買賣權比 (Put/Call Ratio)
	 * put / call > 100% 代表避險需求大 => 市場看跌
	 * put / call < 100% 代表避險需求小 => 市場看漲
	 * 當日極端值: 150%空方過熱，可能接近短期底部 和 70 % 多方過熱，可能接近短期高點
	 * 10日均線(波段更適合用): 120%(偏空過熱) 和 80%(偏多過熱)
	 * 外資與自營如果比例同步升高，代表有強力避險需求
	 * 注意: 注意: 行情可能與市場情緒相反，因此市場看跌價格反而可能是上漲的，反之亦然
	 * @param date 日期格式: YYYY-MM-DD
	 */
	async fetchTxoPutCallRatio(date: string) {
		const queryDate = dayjs(date).format('YYYY/MM/DD')
		if (isWeekend(date)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}

		const url = 'https://www.taifex.com.tw/cht/3/pcRatioDown'
		const postForm = new URLSearchParams({
			queryStartDate: queryDate,
			queryEndDate: queryDate,
		})

		const response = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
			csvtojson().fromString(iconv.decode(res.data, 'big5')),
		)

		const [data] = response
		const fieldsMap = [
			{ name: '賣權成交量', key: 'txoPutVolume' },
			{ name: '買權成交量', key: 'txoCallVolume' },
			{ name: '買賣權成交量比率%', key: 'txoPutCallVolumeRatioPercent' },
			{ name: '賣權未平倉量', key: 'txoPutOi' },
			{ name: '買權未平倉量', key: 'txoCallOi' },
			{ name: '買賣權未平倉量比率%', key: 'txoPutCallOiRatioPercent' },
		]
		const result = { date: queryDate }
		fieldsMap.forEach((field) => {
			if (field.key === 'txoPutCallVolumeRatioPercent' || field.key === 'txoPutCallOiRatioPercent') {
				result[field.key] = numeral(data[field.name]).value() / 100
			} else {
				result[field.key] = numeral(data[field.name]).value()
			}
		})

		return result
	}

	/**
	 * 臺指期貨大額交易人未沖銷部位
	 * 查詢交易法人和非法人市場大戶未沖銷部位
	 * 遠月淨部位為正代表看多，淨部位為負代表看空
	 * 主要觀察前十大特定法人在結算日前後的部位消長
	 * @param date 日期格式: YYYY-MM-DD
	 */
	async fetchLargeTradersTxfPosition(date: string) {
		const queryDate = dayjs(date).format('YYYY/MM/DD')
		if (isWeekend(date)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}

		const url = 'https://www.taifex.com.tw/cht/3/largeTraderFutDown'
		const postForm = new URLSearchParams({
			queryStartDate: queryDate,
			queryEndDate: queryDate,
		})

		const response = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
			csvtojson().fromString(iconv.decode(res.data, 'big5')),
		)

		const fieldsMap = [
			{ name: '日期', key: 'date' },
			{ name: '到期月份(週別)', key: 'expiryMonth' },
			{ name: '交易人類別', key: 'traderType' },
			{ name: '前五大交易人買方', key: 'top5MonthLongOi' },
			{ name: '前五大交易人賣方', key: 'top5MonthShortOi' },
			{ name: '前十大交易人買方', key: 'top10MonthLongOi' },
			{ name: '前十大交易人賣方', key: 'top10MonthShortOi' },
			{ name: '全市場未沖銷部位數', key: 'marketOi' },
		]

		// 0: 全部交易人 1: 特定交易人，如果要知道非特定交易人，則用 0 減去 1
		const txTopTraderData = response.filter((item) => item['商品(契約)'] === 'TX' && item['交易人類別'] === '0') // 全部交易人
		const txTopSpecificTraderData = response.filter((item) => item['商品(契約)'] === 'TX' && item['交易人類別'] === '1') // 特定交易人

		const getDataByExpiryMonth = (data, expiryMonthType) => {
			console.log(340, data, expiryMonthType)
			const yyyyMM = dayjs(queryDate).format('YYYYMM')
			const expiryMonth = expiryMonthType === 'month' ? yyyyMM : expiryMonthType === 'all' ? '999999' : '666666'
			const selectedData = data.filter((item) => item['到期月份(週別)'] === expiryMonth)
			return selectedData.map((item) => {
				return {
					date: item['日期'],
					expiryMonth: item['到期月份(週別)'] === '999999' ? 'all' : item['到期月份(週別)'] === '666666' ? 'week' : 'month',
					traderType: item['交易人類別'] === '0' ? 'all' : 'specific',
					top5LongOi: numeral(item['前五大交易人買方']).value(),
					top5ShortOi: numeral(item['前五大交易人賣方']).value(),
					top5NetOi: numeral(item['前五大交易人買方']).value() - numeral(item['前五大交易人賣方']).value(),
					top10LongOi: numeral(item['前十大交易人買方']).value(),
					top10ShortOi: numeral(item['前十大交易人賣方']).value(),
					top10NetOi: numeral(item['前十大交易人買方']).value() - numeral(item['前十大交易人賣方']).value(),
					marketOi: numeral(item['全市場未沖銷部位數']).value(),
				}
			})
		}

		const calculateNoneSpecificTrader = (allData, specificData) => {
			console.log(360, allData)
			const backMonth = allData.map((item) => {
				return {
					date: item['date'],
					expiryMonth: item['expiryMonth'],
					traderType: item['traderType'] === '0' ? 'all' : item['traderType'] === '1' ? 'specific' : 'noneSpecific',
					top5LongOi: item['top5LongOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5LongOi'] || 0,
					top5ShortOi: item['top5ShortOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5ShortOi'] || 0,
					top5NetOi: item['top5NetOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5NetOi'] || 0,
					top10LongOi: item['top10LongOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10LongOi'] || 0,
					top10ShortOi: item['top10ShortOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10ShortOi'] || 0,
					top10NetOi: item['top10NetOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10NetOi'] || 0,
					marketOi: item['marketOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['marketOi'] || 0,
				}
			})
			return backMonth
		}

		// 全部交易人
		const traderFrontMonth = getDataByExpiryMonth(txTopTraderData, 'month') // 全部交易人近月
		const traderAllMonth = getDataByExpiryMonth(txTopTraderData, 'all') // 全部交易人全部
		const traderBackMonth = calculateNoneSpecificTrader(traderAllMonth, traderFrontMonth) // 全部交易人全部 - 全部交易人近月

		// 特定交易人
		const specificTraderFrontMonth = getDataByExpiryMonth(txTopSpecificTraderData, 'month') // 特定交易人近月
		const specificTraderAllMonth = getDataByExpiryMonth(txTopSpecificTraderData, 'all') // 特定交易人全部
		const specificTraderBackMonth = calculateNoneSpecificTrader(specificTraderAllMonth, specificTraderFrontMonth) // 特定交易人全部 - 特定交易人近月

		// 非特定交易人: 全部交易人 - 特定交易人
		const noneSpecificTraderFrontMonth = calculateNoneSpecificTrader(traderFrontMonth, specificTraderFrontMonth) // 全部交易人近月 - 特定交易人近月
		const noneSpecificTraderBackMonth = calculateNoneSpecificTrader(traderBackMonth, specificTraderBackMonth) // 全部交易人全部 - 特定交易人全部

		const result = {
			date: queryDate,
			top5SpecificFrontMonthLongOi: specificTraderFrontMonth[0].top5LongOi,
			top5SpecificFrontMonthShortOi: specificTraderFrontMonth[0].top5ShortOi,
			top5SpecificFrontMonthNetOi: specificTraderFrontMonth[0].top5NetOi,
			top5SpecificBackMonthsLongOi: specificTraderBackMonth[0].top5LongOi,
			top5SpecificBackMonthsShortOi: specificTraderBackMonth[0].top5ShortOi,
			top5SpecificBackMonthsNetOi: specificTraderBackMonth[0].top5NetOi,
			top5NonSpecificFrontMonthLongOi: noneSpecificTraderFrontMonth[0].top5LongOi,
			top5NonSpecificFrontMonthShortOi: noneSpecificTraderFrontMonth[0].top5ShortOi,
			top5NonSpecificFrontMonthNetOi: noneSpecificTraderFrontMonth[0].top5NetOi,
			top5NonSpecificBackMonthsLongOi: noneSpecificTraderBackMonth[0].top5LongOi,
			top5NonSpecificBackMonthsShortOi: noneSpecificTraderBackMonth[0].top5ShortOi,
			top5NonSpecificBackMonthsNetOi: noneSpecificTraderBackMonth[0].top5NetOi,
			top10SpecificFrontMonthLongOi: specificTraderFrontMonth[0].top10LongOi,
			top10SpecificFrontMonthShortOi: specificTraderFrontMonth[0].top10ShortOi,
			top10SpecificFrontMonthNetOi: specificTraderFrontMonth[0].top10NetOi,
			top10SpecificBackMonthsLongOi: specificTraderBackMonth[0].top10LongOi,
			top10SpecificBackMonthsShortOi: specificTraderBackMonth[0].top10ShortOi,
			top10SpecificBackMonthsNetOi: specificTraderBackMonth[0].top10NetOi,
			top10NonSpecificFrontMonthLongOi: noneSpecificTraderFrontMonth[0].top10LongOi,
			top10NonSpecificFrontMonthShortOi: noneSpecificTraderFrontMonth[0].top10ShortOi,
			top10NonSpecificFrontMonthNetOi: noneSpecificTraderFrontMonth[0].top10NetOi,
			top10NonSpecificBackMonthsLongOi: noneSpecificTraderBackMonth[0].top10LongOi,
			top10NonSpecificBackMonthsShortOi: noneSpecificTraderBackMonth[0].top10ShortOi,
			top10NonSpecificBackMonthsNetOi: noneSpecificTraderBackMonth[0].top10NetOi,
			frontMonthMarketOi: specificTraderFrontMonth[0].marketOi,
			backMonthsMarketOi: specificTraderBackMonth[0].marketOi,
		}

		return result
	}

	/**
	 * 臺指選擇權大額交易人未沖銷部位
	 * 觀察大額交易人持有的選擇權部位，這個指標幫助判斷市場的情緒趨勢：
	 * - 偏多頭：當買權（Call）部位較多，顯示市場預期上漲。
	 * - 偏空頭：當賣權（Put）部位較多，顯示市場預期下跌。
	 * - 中立：部位比例相近，顯示市場情緒中立。
	 *
	 * 選擇權是基於 "部位數量" 分析，建議與其他指標搭配使用，因為選擇權的權利金價值會因履約價格不同而有所差異。
	 * @param date 日期格式: YYYY-MM-DD
	 */
	async fetchLargeTradersTxoPosition(date: string) {
		const queryDate = dayjs(date).format('YYYY/MM/DD')
		if (isWeekend(date)) {
			console.log('The date is a weekend, no trading data available.')
			return null
		}

		const url = 'https://www.taifex.com.tw/cht/3/largeTraderOptDown'
		const postForm = new URLSearchParams({
			queryStartDate: queryDate,
			queryEndDate: queryDate,
		})

		const response = await firstValueFrom(this.httpService.post(url, postForm, { responseType: 'arraybuffer' })).then((res) =>
			csvtojson().fromString(iconv.decode(res.data, 'big5')),
		)

		// 0: 全部交易人 1: 特定交易人，如果要知道非特定交易人，則用 0 減去 1
		const txoTopTraderData = response.filter((item) => item['商品(契約)'] === 'TXO' && item['交易人類別'] === '0') // 全部交易人
		const txoTopSpecificTraderData = response.filter((item) => item['商品(契約)'] === 'TXO' && item['交易人類別'] === '1') // 特定交易人

		const getDataByCallOrPut = (data, callOrPut) => {
			const type = callOrPut === 'call' ? '買權' : '賣權'
			return data.filter((item) => item['買賣權'] === type)
		}

		const getDataByExpiryMonth = (data, expiryMonthType) => {
			console.log(340, data, expiryMonthType)
			const yyyyMM = dayjs(queryDate).format('YYYYMM')
			const expiryMonth = expiryMonthType === 'month' ? yyyyMM : expiryMonthType === 'all' ? '999999' : '666666'
			const selectedData = data.filter((item) => item['到期月份(週別)'] === expiryMonth)
			return selectedData.map((item) => {
				return {
					date: item['日期'],
					expiryMonth: item['到期月份(週別)'] === '999999' ? 'all' : item['到期月份(週別)'] === '666666' ? 'week' : 'month',
					traderType: item['交易人類別'] === '0' ? 'all' : 'specific',
					top5LongOi: numeral(item['前五大交易人買方']).value(),
					top5ShortOi: numeral(item['前五大交易人賣方']).value(),
					top5NetOi: numeral(item['前五大交易人買方']).value() - numeral(item['前五大交易人賣方']).value(),
					top10LongOi: numeral(item['前十大交易人買方']).value(),
					top10ShortOi: numeral(item['前十大交易人賣方']).value(),
					top10NetOi: numeral(item['前十大交易人買方']).value() - numeral(item['前十大交易人賣方']).value(),
					marketOi: numeral(item['全市場未沖銷部位數']).value(),
				}
			})
		}

		console.log(340, txoTopTraderData)

		const calculateNoneSpecificTrader = (allData, specificData) => {
			return allData.map((item) => {
				return {
					...item,
					top5LongOi: item['top5LongOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5LongOi'] || 0,
					top5ShortOi: item['top5ShortOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5ShortOi'] || 0,
					top5NetOi: item['top5NetOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top5NetOi'] || 0,
					top10LongOi: item['top10LongOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10LongOi'] || 0,
					top10ShortOi: item['top10ShortOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10ShortOi'] || 0,
					top10NetOi: item['top10NetOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['top10NetOi'] || 0,
					marketOi: item['marketOi'] - specificData.find((specificItem) => specificItem['date'] === item['date'])?.['marketOi'] || 0,
				}
			})
		}

		// 全部交易人(Call)
		const traderFrontMonthCall = getDataByExpiryMonth(getDataByCallOrPut(txoTopTraderData, 'call'), 'month') // 全部交易人近月
		const traderAllMonthCall = getDataByExpiryMonth(getDataByCallOrPut(txoTopTraderData, 'call'), 'all') // 全部交易人全部
		const traderBackMonthCall = calculateNoneSpecificTrader(traderAllMonthCall, traderFrontMonthCall) // 全部交易人全部 - 全部交易人近月

		// 全部交易人(Put)
		const traderFrontMonthPut = getDataByExpiryMonth(getDataByCallOrPut(txoTopTraderData, 'put'), 'month') // 全部交易人近月
		const traderAllMonthPut = getDataByExpiryMonth(getDataByCallOrPut(txoTopTraderData, 'put'), 'all') // 全部交易人全部
		const traderBackMonthPut = calculateNoneSpecificTrader(traderAllMonthPut, traderFrontMonthPut) // 全部交易人全部 - 全部交易人近月

		// 特定交易人(Call)
		const specificTraderFrontMonthCall = getDataByExpiryMonth(getDataByCallOrPut(txoTopSpecificTraderData, 'call'), 'month') // 特定交易人近月
		const specificTraderAllMonthCall = getDataByExpiryMonth(getDataByCallOrPut(txoTopSpecificTraderData, 'call'), 'all') // 特定交易人全部
		const specificTraderBackMonthCall = calculateNoneSpecificTrader(specificTraderAllMonthCall, specificTraderFrontMonthCall) // 特定交易人全部 - 特定交易人近月

		// 特定交易人(Put)
		const specificTraderFrontMonthPut = getDataByExpiryMonth(getDataByCallOrPut(txoTopSpecificTraderData, 'put'), 'month') // 特定交易人近月
		const specificTraderAllMonthPut = getDataByExpiryMonth(getDataByCallOrPut(txoTopSpecificTraderData, 'put'), 'all') // 特定交易人全部
		const specificTraderBackMonthPut = calculateNoneSpecificTrader(specificTraderAllMonthPut, specificTraderFrontMonthPut) // 特定交易人全部 - 特定交易人近月

		// 非特定交易人(Call): 全部交易人 - 特定交易人
		const noneSpecificTraderFrontMonthCall = calculateNoneSpecificTrader(traderFrontMonthCall, specificTraderFrontMonthCall) // 全部交易人近月 - 特定交易人近月
		const noneSpecificTraderBackMonthCall = calculateNoneSpecificTrader(traderBackMonthCall, specificTraderBackMonthCall) // 全部交易人全部 - 特定交易人全部

		// 非特定交易人(Put): 全部交易人 - 特定交易人
		const noneSpecificTraderFrontMonthPut = calculateNoneSpecificTrader(traderFrontMonthPut, specificTraderFrontMonthPut) // 全部交易人近月 - 特定交易人近月
		const noneSpecificTraderBackMonthPut = calculateNoneSpecificTrader(traderBackMonthPut, specificTraderBackMonthPut) // 全部交易人全部 - 特定交易人全部

		const result = {
			date: queryDate,
			top5SpecificTxoCallFrontMonthLongOi: specificTraderFrontMonthCall[0].top5LongOi,
			top5SpecificTxoCallFrontMonthShortOi: specificTraderFrontMonthCall[0].top5ShortOi,
			top5SpecificTxoCallFrontMonthNetOi: specificTraderFrontMonthCall[0].top5NetOi,
			top5SpecificTxoCallBackMonthsLongOi: specificTraderBackMonthCall[0].top5LongOi,
			top5SpecificTxoCallBackMonthsShortOi: specificTraderBackMonthCall[0].top5ShortOi,
			top5SpecificTxoCallBackMonthsNetOi: specificTraderBackMonthCall[0].top5NetOi,
			top5NonSpecificTxoCallFrontMonthLongOi: noneSpecificTraderFrontMonthCall[0].top5LongOi,
			top5NonSpecificTxoCallFrontMonthShortOi: noneSpecificTraderFrontMonthCall[0].top5ShortOi,
			top5NonSpecificTxoCallFrontMonthNetOi: noneSpecificTraderFrontMonthCall[0].top5NetOi,
			top5NonSpecificTxoCallBackMonthsLongOi: noneSpecificTraderBackMonthCall[0].top5LongOi,
			top5NonSpecificTxoCallBackMonthsShortOi: noneSpecificTraderBackMonthCall[0].top5ShortOi,
			top5NonSpecificTxoCallBackMonthsNetOi: noneSpecificTraderBackMonthCall[0].top5NetOi,
			top10SpecificTxoCallFrontMonthLongOi: specificTraderFrontMonthCall[0].top10LongOi,
			top10SpecificTxoCallFrontMonthShortOi: specificTraderFrontMonthCall[0].top10ShortOi,
			top10SpecificTxoCallFrontMonthNetOi: specificTraderFrontMonthCall[0].top10NetOi,
			top10SpecificTxoCallBackMonthsLongOi: specificTraderBackMonthCall[0].top10LongOi,
			top10SpecificTxoCallBackMonthsShortOi: specificTraderBackMonthCall[0].top10ShortOi,
			top10SpecificTxoCallBackMonthsNetOi: specificTraderBackMonthCall[0].top10NetOi,
			top10NonSpecificTxoCallFrontMonthLongOi: noneSpecificTraderFrontMonthCall[0].top10LongOi,
			top10NonSpecificTxoCallFrontMonthShortOi: noneSpecificTraderFrontMonthCall[0].top10ShortOi,
			top10NonSpecificTxoCallFrontMonthNetOi: noneSpecificTraderFrontMonthCall[0].top10NetOi,
			top10NonSpecificTxoCallBackMonthsLongOi: noneSpecificTraderBackMonthCall[0].top10LongOi,
			top10NonSpecificTxoCallBackMonthsShortOi: noneSpecificTraderBackMonthCall[0].top10ShortOi,
			top10NonSpecificTxoCallBackMonthsNetOi: noneSpecificTraderBackMonthCall[0].top10NetOi,
			top5SpecificTxoPutFrontMonthLongOi: specificTraderFrontMonthPut[0].top5LongOi,
			top5SpecificTxoPutFrontMonthShortOi: specificTraderFrontMonthPut[0].top5ShortOi,
			top5SpecificTxoPutFrontMonthNetOi: specificTraderFrontMonthPut[0].top5NetOi,
			top5SpecificTxoPutBackMonthsLongOi: specificTraderBackMonthPut[0].top5LongOi,
			top5SpecificTxoPutBackMonthsShortOi: specificTraderBackMonthPut[0].top5ShortOi,
			top5SpecificTxoPutBackMonthsNetOi: specificTraderBackMonthPut[0].top5NetOi,
			top5NonSpecificTxoPutFrontMonthLongOi: noneSpecificTraderFrontMonthPut[0].top5LongOi,
			top5NonSpecificTxoPutFrontMonthShortOi: noneSpecificTraderFrontMonthPut[0].top5ShortOi,
			top5NonSpecificTxoPutFrontMonthNetOi: noneSpecificTraderFrontMonthPut[0].top5NetOi,
			top5NonSpecificTxoPutBackMonthsLongOi: noneSpecificTraderBackMonthPut[0].top5LongOi,
			top5NonSpecificTxoPutBackMonthsShortOi: noneSpecificTraderBackMonthPut[0].top5ShortOi,
			top5NonSpecificTxoPutBackMonthsNetOi: noneSpecificTraderBackMonthPut[0].top5NetOi,
			top10SpecificTxoPutFrontMonthLongOi: specificTraderFrontMonthPut[0].top10LongOi,
			top10SpecificTxoPutFrontMonthShortOi: specificTraderFrontMonthPut[0].top10ShortOi,
			top10SpecificTxoPutFrontMonthNetOi: specificTraderFrontMonthPut[0].top10NetOi,
			top10SpecificTxoPutBackMonthsLongOi: specificTraderBackMonthPut[0].top10LongOi,
			top10SpecificTxoPutBackMonthsShortOi: specificTraderBackMonthPut[0].top10ShortOi,
			top10SpecificTxoPutBackMonthsNetOi: specificTraderBackMonthPut[0].top10NetOi,
			top10NonSpecificTxoPutFrontMonthLongOi: noneSpecificTraderFrontMonthPut[0].top10LongOi,
			top10NonSpecificTxoPutFrontMonthShortOi: noneSpecificTraderFrontMonthPut[0].top10ShortOi,
			top10NonSpecificTxoPutFrontMonthNetOi: noneSpecificTraderFrontMonthPut[0].top10NetOi,
			top10NonSpecificTxoPutBackMonthsLongOi: noneSpecificTraderBackMonthPut[0].top10LongOi,
			top10NonSpecificTxoPutBackMonthsShortOi: noneSpecificTraderBackMonthPut[0].top10ShortOi,
			top10NonSpecificTxoPutBackMonthsNetOi: noneSpecificTraderBackMonthPut[0].top10NetOi,
			txoCallFrontMonthMarketOi: specificTraderFrontMonthCall[0].marketOi,
			txoCallBackMonthsMarketOi: specificTraderBackMonthCall[0].marketOi,
			txoPutFrontMonthMarketOi: specificTraderFrontMonthPut[0].marketOi,
			txoPutBackMonthsMarketOi: specificTraderBackMonthPut[0].marketOi,
		}

		return result
	}
}
