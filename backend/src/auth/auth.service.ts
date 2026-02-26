import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // --- Local Auth ---

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      this.logger.warn(
        `Login attempt for non-existent or passwordless user: ${email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.provider !== 'local') {
      throw new UnauthorizedException(
        'This account uses GitHub login. Please sign in with GitHub.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    this.logger.log(`User logged in: ${email}`);
    return this.issueToken(user);
  }

  async register(email: string, password: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'local',
        role: 'VIEWER', // Default role for new users
      },
    });

    this.logger.log(`New user registered: ${email}`);
    return this.issueToken(user);
  }

  // --- GitHub OAuth2 (manual flow for Fastify) ---

  getGithubAuthUrl(): { url: string; state: string } {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');

    if (!clientId) {
      throw new InternalServerErrorException(
        'GitHub OAuth is not properly configured on the server (Missing GITHUB_CLIENT_ID)',
      );
    }

    const callbackUrl =
      this.configService.get<string>('GITHUB_CALLBACK_URL') ||
      'http://localhost:3000/api/v1/auth/github/callback';
    const scope = 'user:email';
    const state = crypto.randomBytes(16).toString('hex');

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${state}`;

    return { url, state };
  }

  async exchangeGithubCode(code: string) {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'GitHub OAuth is not properly configured on the server (Missing credentials)',
      );
    }

    try {
      // 1. Exchange code for access token
      const tokenRes = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        },
      );

      if (!tokenRes.ok) {
        this.logger.error('Failed to exchange GitHub code for token');
        throw new UnauthorizedException('Failed to authenticate with GitHub');
      }

      const tokenData = (await tokenRes.json()) as GithubTokenResponse;
      if (!tokenData.access_token) {
        throw new UnauthorizedException('Failed to get GitHub access token');
      }

      // 2. Get GitHub user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new UnauthorizedException('Failed to authenticate with GitHub');
      }

      const githubUser = (await userRes.json()) as GithubUserResponse;

      // 3. Get primary email (might be private)
      let email = githubUser.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!emailsRes.ok) {
          throw new UnauthorizedException('Failed to authenticate with GitHub');
        }

        const emails = (await emailsRes.json()) as GithubEmailResponse[];
        const primaryVerified = emails.find((e) => e.primary && e.verified);
        const anyVerified = primaryVerified ?? emails.find((e) => e.verified);
        email = anyVerified?.email || null;
      }

      if (!email) {
        throw new UnauthorizedException(
          'No verified email found for your GitHub account. Please make a verified email available in GitHub.',
        );
      }

      // 4. Find or create user
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (user && user.provider !== 'github') {
        throw new UnauthorizedException(
          'An account with this email already exists using password login. Please sign in with your email and password.',
        );
      }

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name: githubUser.name || githubUser.login,
            provider: 'github',
            role: 'VIEWER',
          },
        });
        this.logger.log(`Created new user from GitHub OAuth: ${email}`);
      } else {
        this.logger.log(`Existing user logged in via GitHub: ${email}`);
      }

      return this.issueToken(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Normalize any other fetch/network errors to a generic unauthorized error
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }

  // --- Profile ---

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // --- Helpers ---

  private issueToken(user: { id: number; email: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
