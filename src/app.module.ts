import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GitService } from './services/git.service';
import { PlaywrightService } from './services/playwright.service';
import { CodeCheckService } from './services/code-check.service';
import { CodeCheckController } from './controllers/code-check.controller';
import { HtmlValidatorService } from './services/html-validator.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 4,
      },
    ]),
  ],
  controllers: [CodeCheckController],
  providers: [
    GitService,
    PlaywrightService,
    CodeCheckService,
    HtmlValidatorService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
