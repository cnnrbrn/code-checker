import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface RepoFile {
  name: string;
  path: string;
  type: 'HTML' | 'CSS' | 'JavaScript';
  url: string;
}

@Injectable()
export class GitService {
  async fetchRepo(owner: string, repo: string): Promise<RepoFile[]> {
    return this.fetchDirectory(owner, repo, '');
  }

  private async fetchDirectory(
    owner: string,
    repo: string,
    path: string,
  ): Promise<RepoFile[]> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`GitHub API responded with status: ${response.status}`);
      }
      const data = await response.json();

      const files: RepoFile[] = [];

      for (const item of data) {
        if (item.type === 'file' && this.isRelevantFile(item.name)) {
          files.push({
            name: item.path,
            path: item.path,
            type: this.getFileType(item.name),
            url: item.download_url,
          });
        } else if (item.type === 'dir') {
          const subDirFiles = await this.fetchDirectory(owner, repo, item.path);
          files.push(...subDirFiles);
        }
      }

      return files;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch repo contents: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private isRelevantFile(filename: string): boolean {
    const relevantExtensions = ['.html', '.css', '.js'];
    return relevantExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext),
    );
  }

  private getFileType(filename: string): 'HTML' | 'CSS' | 'JavaScript' {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'js':
        return 'JavaScript';
      default:
        throw new Error(`Unsupported file type: ${filename}`);
    }
  }
}
