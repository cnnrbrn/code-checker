export class RepoNotFoundError extends Error {
  constructor(message: string = 'Repository not found') {
    super(message);
    this.name = 'RepoNotFoundError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class BrowserError extends Error {
  constructor(message: string = 'Browser error occurred') {
    super(message);
    this.name = 'BrowserError';
  }
}

export class UnknownError extends Error {
  constructor(message: string = 'An unknown error occurred') {
    super(message);
    this.name = 'UnknownError';
  }
}
export class RepoCheckError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'RepoCheckError';
  }
}
