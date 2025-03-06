export interface StockStrategy {
	/**
	 * 爬取上市櫃股票清單，僅適用於台灣證券交易所(TWSE)
	 * @param options 選項
	 * @param options.market 市場類型，預設為 TSE (上市)
	 * @returns 上市櫃股票清單
	 */
	fetchListedStocks(options?: { market: 'TSE' | 'OTC' }): Promise<any>

	/**
	 * 爬取市場交易量
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 市場交易量
	 */
	fetchMarketTrades(date: string): Promise<any>

	/**
	 * 爬取市場寬幅
	 * @param date 日期格式: YYYY-MM-DD
	 * @returns 市場寬幅
	 */
	fetchMarketBreadth(date: string): Promise<any>

	/**
	 * 爬取法人買賣超
	 * @param date 日期
	 * @returns 機構投資人交易量
	 */
	fetchInstInvestorsTrades(date: string): Promise<any>

	/**
	 * 爬取融資融券餘額
	 * @param date 日期
	 * @returns 融資融券餘額
	 */
	fetchMarginTransactions(date: string): Promise<any>
}
