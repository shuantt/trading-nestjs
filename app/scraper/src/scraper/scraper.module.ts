import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { TwseScraperService } from './services/twse-scraper.service'
import { TpexScraperService } from './services/tpex-scraper.service'

@Module({
	imports: [HttpModule],
	providers: [TwseScraperService, TpexScraperService],
})
export class ScraperModule {
	constructor(
		private twseScraperService: TwseScraperService,
		private tpexScraperService: TpexScraperService,
	) {}

	async onApplicationBootstrap() {
		console.log('ScraperModule has been initialized.')
		// console.log('ScarperModule Print:', await this.twseScraperService.fetchMarginTransactions('2022-07-01'))
		// console.log('ScarperModule Print:', await this.tpexScraperService.fetchMarginTransactions('2022-07-01'))
	}
}
