import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { CheckRepoDto } from '../dtos/check-repo.dto';
import {
  CodeCheckService,
  RepoCheckResult,
} from '../services/code-check.service';
import {
  BrowserError,
  NetworkError,
  RepoNotFoundError,
  UnknownError,
} from 'src/errors/app.errors';

@Controller('check')
export class CodeCheckController {
  constructor(private codeCheckService: CodeCheckService) {}

  @Post()
  @HttpCode(200)
  async checkRepo(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    checkRepoDto: CheckRepoDto,
  ): Promise<RepoCheckResult> {
    try {
      return await this.codeCheckService.checkRepo(checkRepoDto.repoUrl);
    } catch (error) {
      if (error instanceof RepoNotFoundError) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      } else if (error instanceof NetworkError) {
        throw new HttpException(error.message, HttpStatus.BAD_GATEWAY);
      } else if (error instanceof BrowserError) {
        console.log('dd');
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } else if (error instanceof UnknownError) {
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } else {
        throw new HttpException(
          'An unexpected error occurred',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
