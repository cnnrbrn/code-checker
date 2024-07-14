import { Injectable } from '@nestjs/common';
import { GitService } from './git.service';
import {
  PlaywrightService,
  FileCheckResult,
  CheckResult,
} from './playwright.service';
import { HtmlValidatorService } from './html-validator.service';
import {
  BrowserError,
  NetworkError,
  RepoNotFoundError,
  UnknownError,
} from 'src/errors/app.errors';
import { CHECK_LABELS } from '../constants';

export interface RepoCheckSummary {
  totalFiles: number;
  h1Checks: {
    label: string;
    passed: number;
    failed: number;
  };
  imageAltChecks: {
    label: string;
    passed: number;
    failed: number;
  };
  w3cValidation: {
    label: string;
    passed: number;
    failed: number;
  };
  horizontalScrollbarChecks: {
    label: string;
    passed: number;
    failed: number;
  };
}

export interface RepoCheckResult {
  summary: RepoCheckSummary;
  details: FileCheckResult[];
}

@Injectable()
export class CodeCheckService {
  constructor(
    private gitService: GitService,
    private playwrightService: PlaywrightService,
    private htmlValidatorService: HtmlValidatorService,
  ) {}

  async checkRepo(repoUrl: string): Promise<RepoCheckResult> {
    const [owner, repo] = this.parseGitHubUrl(repoUrl);

    try {
      console.log(`Fetching repo: ${owner}/${repo}`);
      const files = await this.gitService.fetchRepo(owner, repo);
      console.log(`Total files fetched: ${files.length}`);

      const htmlFiles = files.filter((file) => file.type === 'HTML');
      console.log(`HTML files found: ${htmlFiles.length}`);

      const checkResults: FileCheckResult[] = [];
      for (const file of htmlFiles) {
        console.log(`Checking HTML file: ${file.path}, URL: ${file.url}`);
        try {
          const { checkResult, content } =
            await this.playwrightService.checkHtmlFile(file.url, file.path);
          const w3cValidation = await this.validateHtml(content);
          const updatedCheckResult = {
            ...checkResult,
            checks: {
              ...checkResult.checks,
              w3cValidation: {
                label: CHECK_LABELS.W3C_VALIDATION,
                ...w3cValidation,
              },
            },
          };
          const passed = this.allChecksPassed(updatedCheckResult.checks);
          checkResults.push({
            ...updatedCheckResult,
            passed,
          });
        } catch (error) {
          if (error instanceof BrowserError) {
            throw error;
          }
          console.error(`Error checking file ${file.path}:`, error);
          checkResults.push({
            fileName: file.path,
            passed: false,
            checks: {
              singleH1: {
                label: CHECK_LABELS.SINGLE_H1,
                status: 'fail',
                message: `Error: ${error.message}`,
              },
              imageAlts: {
                label: CHECK_LABELS.IMAGE_ALTS,
                status: 'fail',
                message: `Error: ${error.message}`,
              },
              w3cValidation: {
                label: CHECK_LABELS.W3C_VALIDATION,
                status: 'fail',
                message: `Error: ${error.message}`,
              },
              horizontalScrollbar: {
                label: CHECK_LABELS.HORIZONTAL_SCROLLBAR,
                status: 'fail',
                message: `Error: ${error.message}`,
              },
            },
          });
        }
      }

      console.log(`Total files checked: ${checkResults.length}`);
      return this.summarizeResults(checkResults);
    } catch (error) {
      console.error('Error checking repo:', error);
      if (error instanceof BrowserError) {
        throw error;
      } else if (error.response?.status === 404) {
        throw new RepoNotFoundError();
      } else if (error.code === 'ENOTFOUND') {
        throw new NetworkError();
      } else {
        throw new UnknownError(`Failed to check repository: ${error.message}`);
      }
    }
  }

  private async validateHtml(html: string): Promise<CheckResult> {
    try {
      const validationResult =
        await this.htmlValidatorService.validateHtml(html);
      const errors = validationResult.messages.filter(
        (msg) => msg.type === 'error',
      );

      if (errors.length === 0) {
        return { status: 'pass', message: 'HTML is valid according to W3C' };
      } else {
        return {
          status: 'fail',
          message: 'W3C validation errors found',
          details: errors.map((e) => `Line ${e.lastLine}: ${e.message}`),
        };
      }
    } catch (error) {
      console.error('Error in W3C validation:', error);
      return {
        status: 'fail',
        message: `Error in W3C validation: ${error.message}`,
      };
    }
  }

  private parseGitHubUrl(url: string): [string, string] {
    const parts = url.split('/');
    return [parts[parts.length - 2], parts[parts.length - 1]];
  }

  private summarizeResults(results: FileCheckResult[]): RepoCheckResult {
    const summary: RepoCheckSummary = {
      totalFiles: results.length,
      h1Checks: {
        label: CHECK_LABELS.SINGLE_H1,
        passed: results.filter((r) => r.checks.singleH1.status === 'pass')
          .length,
        failed: results.filter((r) => r.checks.singleH1.status === 'fail')
          .length,
      },
      imageAltChecks: {
        label: CHECK_LABELS.IMAGE_ALTS,
        passed: results.filter((r) => r.checks.imageAlts.status === 'pass')
          .length,
        failed: results.filter((r) => r.checks.imageAlts.status === 'fail')
          .length,
      },
      w3cValidation: {
        label: CHECK_LABELS.W3C_VALIDATION,
        passed: results.filter((r) => r.checks.w3cValidation.status === 'pass')
          .length,
        failed: results.filter((r) => r.checks.w3cValidation.status === 'fail')
          .length,
      },
      horizontalScrollbarChecks: {
        label: CHECK_LABELS.HORIZONTAL_SCROLLBAR,
        passed: results.filter(
          (r) => r.checks.horizontalScrollbar.status === 'pass',
        ).length,
        failed: results.filter(
          (r) => r.checks.horizontalScrollbar.status === 'fail',
        ).length,
      },
    };

    console.log('Summary:', JSON.stringify(summary, null, 2));

    return {
      summary,
      details: results,
    };
  }

  private allChecksPassed(checks: FileCheckResult['checks']): boolean {
    return Object.values(checks).every((check) => check.status === 'pass');
  }
}
