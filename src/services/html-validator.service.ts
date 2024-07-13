import { Injectable } from '@nestjs/common';

@Injectable()
export class HtmlValidatorService {
  async validateHtml(html: string): Promise<any> {
    // const encodedHtml = encodeURIComponent(html);
    const url = `https://validator.w3.org/nu/?out=json`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'User-Agent':
            'Mozilla/5.0 (compatible; YourApp/1.0; +http://yourapp.com)',
        },
        body: html,
      });

      if (!response.ok) {
        throw new Error(`Validator responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating HTML:', error);
      throw new Error('Failed to validate HTML');
    }
  }
}
