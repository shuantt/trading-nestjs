import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { TwseScraperService } from './services/twse-scraper.service'
import { TpexScraperService } from './services/tpex-scraper.service'
import { TaifexScraperService } from './services/taifex-scraper.service'

@Module({
	imports: [HttpModule],
	providers: [TwseScraperService, TpexScraperService, TaifexScraperService],
})
export class ScraperModule {
	constructor(
		private twseScraperService: TwseScraperService,
		private tpexScraperService: TpexScraperService,
		private taifexScraperService: TaifexScraperService,
	) {}

	async onApplicationBootstrap() {
		console.log('ScraperModule has been initialized.')
		// console.log('ScarperModule Print:', await this.twseScraperService.fetchMarginTransactions('2022-07-01'))
		// console.log('ScarperModule Print:', await this.tpexScraperService.fetchMarginTransactions('2022-07-01'))
		// console.log('ScarperModule Print:', await this.taifexScraperService.fetchInstInverstorsTxoTrades('2022-07-01'))
		// console.log('ScarperModule Print:', await this.taifexScraperService.fetchTxoPutCallRatio('2022-07-01'))
		// console.log('ScarperModule Print:', await this.taifexScraperService.fetchLargeTradersTxfPosition('2022-07-01'))
		// console.log('ScarperModule Print:', await this.taifexScraperService.fetchLargeTradersTxoPosition('2022-07-01'))
	}
}
