import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CheckRepoDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      host_whitelist: ['github.com', 'www.github.com'],
    },
    {
      message:
        'Invalid GitHub URL. Please provide a valid GitHub repository URL.',
    },
  )
  repoUrl: string;
}
