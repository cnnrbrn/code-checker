import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Browser, chromium, Page } from 'playwright';
import { BrowserError } from 'src/errors/app.errors';
import { CHECK_LABELS } from '../constants';

export interface CheckResult {
  status: 'pass' | 'fail';
  message?: string;
  details?: string[];
}

export interface FileCheckResult {
  fileName: string;
  passed: boolean;
  checks: {
    singleH1: { label: string } & CheckResult;
    imageAlts: { label: string } & CheckResult;
    w3cValidation: { label: string } & CheckResult;
    horizontalScrollbar: { label: string } & CheckResult;
  };
}

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    try {
      this.browser = await chromium.launch();
    } catch (error) {
      console.log(error);
      throw new BrowserError('Failed to launch browser');
    }
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async checkHtmlFile(
    fileUrl: string,
    filePath: string,
  ): Promise<{ checkResult: FileCheckResult; content: string }> {
    let page: Page | null = null;
    try {
      page = await this.browser.newPage();
      console.log(`Checking file: ${filePath} at URL: ${fileUrl}`);

      const response = await page.goto(fileUrl, { waitUntil: 'networkidle' });
      console.log(`Page loaded: ${filePath}`);

      if (!response.ok()) {
        throw new Error(`Failed to load page: ${response.statusText()}`);
      }

      const rawContent = await response.text();
      const decodedContent = this.decodeHtmlEntities(rawContent);
      await page.setContent(decodedContent);

      const checkResult = await this.runChecks(page, filePath);
      console.log(
        `Check results for ${filePath}:`,
        JSON.stringify(checkResult, null, 2),
      );

      return {
        checkResult,
        content: decodedContent,
      };
    } catch (error) {
      console.error(`Error checking ${filePath}:`, error);
      if (error instanceof Error && error.message.includes('Target closed')) {
        throw new BrowserError('Browser instance is not available');
      }
      throw error;
    } finally {
      await page?.close();
    }
  }

  private async runChecks(
    page: Page,
    fileName: string,
  ): Promise<FileCheckResult> {
    const checks = {
      singleH1: {
        label: CHECK_LABELS.SINGLE_H1,
        ...(await this.checkSingleH1(page)),
      },
      imageAlts: {
        label: CHECK_LABELS.IMAGE_ALTS,
        ...(await this.checkImageAlts(page)),
      },
      w3cValidation: {
        label: CHECK_LABELS.W3C_VALIDATION,
        status: 'pass' as const,
        message: 'W3C validation not performed in this service',
      },
      horizontalScrollbar: {
        label: CHECK_LABELS.HORIZONTAL_SCROLLBAR,
        ...(await this.checkHorizontalScrollbar(page)),
      },
    };

    return {
      fileName,
      passed: Object.values(checks).every((check) => check.status === 'pass'),
      checks,
    };
  }

  private decodeHtmlEntities(encodedString: string): string {
    const entities = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
    };
    return encodedString.replace(
      /&lt;|&gt;|&amp;|&quot;|&#39;/g,
      (match) => entities[match],
    );
  }

  private async checkSingleH1(page: Page): Promise<CheckResult> {
    try {
      const h1Count = await page.$$eval('h1', (elements) => elements.length);
      console.log(`H1 count: ${h1Count}`);

      if (h1Count === 1) {
        return { status: 'pass' };
      } else if (h1Count === 0) {
        return { status: 'fail', message: 'No h1 found' };
      } else {
        return {
          status: 'fail',
          message: `More than one h1 found (${h1Count})`,
        };
      }
    } catch (error) {
      console.error('Error in checkSingleH1:', error);
      return { status: 'fail', message: `Error checking h1: ${error.message}` };
    }
  }

  private async checkImageAlts(page: Page): Promise<CheckResult> {
    try {
      const imageAlts = await page.$$eval('img', (images) =>
        images.map((img) => ({
          src: img.src,
          alt: img.alt,
          hasAlt: img.hasAttribute('alt'),
        })),
      );

      const issues: string[] = [];
      let hasFailure = false;

      imageAlts.forEach((img, index) => {
        if (!img.hasAlt) {
          issues.push(`Image #${index + 1} is missing alt attribute`);
          hasFailure = true;
        } else if (img.alt.trim() === '') {
          issues.push(`Image #${index + 1} has an empty alt attribute`);
          hasFailure = true;
        } else if (
          img.alt.toLowerCase().includes('image') ||
          img.alt.toLowerCase().includes('picture')
        ) {
          issues.push(
            `Image #${index + 1} has alt text containing "image" or "picture": "${img.alt}"`,
          );
          hasFailure = true;
        }
      });

      if (hasFailure) {
        return {
          status: 'fail',
          message: 'Some images have issues with alt attributes',
          details: issues,
        };
      } else {
        return {
          status: 'pass',
          message: `All ${imageAlts.length} images have appropriate alt attributes`,
        };
      }
    } catch (error) {
      console.error('Error in checkImageAlts:', error);
      return {
        status: 'fail',
        message: `Error checking image alts: ${error.message}`,
      };
    }
  }

  private async checkHorizontalScrollbar(page: Page): Promise<CheckResult> {
    const minWidth = 320;
    const maxWidth = 1920;
    const height = 1080;

    try {
      let scrollbarDetected = false;
      let detectedWidth = 0;

      for (let width = minWidth; width <= maxWidth; width += 10) {
        await page.setViewportSize({ width, height });

        const hasScrollbar = await page.evaluate(() => {
          return (
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth
          );
        });

        if (hasScrollbar) {
          scrollbarDetected = true;
          detectedWidth = width;
          break;
        }
      }

      if (scrollbarDetected) {
        return {
          status: 'fail',
          message: `Horizontal scrollbar detected at ${detectedWidth}px width`,
        };
      } else {
        return {
          status: 'pass',
          message:
            'No horizontal scrollbar detected for widths 320px and above',
        };
      }
    } catch (error) {
      console.error('Error in checkHorizontalScrollbar:', error);
      return {
        status: 'fail',
        message: `Error checking for horizontal scrollbar: ${error.message}`,
      };
    }
  }
}
