import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // --- Local Auth ---

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.provider !== 'local') {
      throw new UnauthorizedException(
        'This account uses GitHub login. Please sign in with GitHub.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueToken(user);
  }

  // --- GitHub OAuth2 (manual flow for Fastify) ---

  getGithubAuthUrl(): string {
    const clientId = process.env.GITHUB_CLIENT_ID || '';
    const callbackUrl =
      process.env.GITHUB_CALLBACK_URL ||
      'http://localhost:3000/api/v1/auth/github/callback';
    const scope = 'user:email';

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}`;
  }

  async exchangeGithubCode(code: string) {
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
          client_id: process.env.GITHUB_CLIENT_ID || '',
          client_secret: process.env.GITHUB_CLIENT_SECRET || '',
          code,
        }),
      },
    );

    const tokenData = (await tokenRes.json()) as GithubTokenResponse;
    if (!tokenData.access_token) {
      throw new UnauthorizedException('Failed to get GitHub access token');
    }

    // 2. Get GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = (await userRes.json()) as GithubUserResponse;

    // 3. Get primary email (might be private)
    let email = githubUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = (await emailsRes.json()) as GithubEmailResponse[];
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email || `${githubUser.login}@github.local`;
    }

    // 4. Find or create user
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: githubUser.name || githubUser.login,
          provider: 'github',
          role: 'VIEWER',
        },
      });
    }

    return this.issueToken(user);
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

