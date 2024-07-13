import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GitService } from './services/git.service';
import { PlaywrightService } from './services/playwright.service';
import { CodeCheckService } from './services/code-check.service';
import { CodeCheckController } from './controllers/code-check.controller';
import { HtmlValidatorService } from './services/html-validator.service';

@Module({
  imports: [HttpModule],
  controllers: [CodeCheckController],
  providers: [
    GitService,
    PlaywrightService,
    CodeCheckService,
    HtmlValidatorService,
  ],
})
export class AppModule {}
