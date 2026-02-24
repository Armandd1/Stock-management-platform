import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successful login. Returns access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Token is missing or invalid.' })
  async getProfile(
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.authService.getProfile(user.userId);
  }

  @Get('github')
  @ApiOperation({ summary: 'Redirect to GitHub OAuth2 login' })
  async githubLogin(@Res() res: FastifyReply) {
    const { url, state } = this.authService.getGithubAuthUrl();
    
    // Store CSRF state as a secure, http-only cookie
    res.setCookie('github_oauth_state', state, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000, // 10 minutes session for login
    });

    return res.status(302).redirect(url);
  }

  @Get('github/callback')
  @ApiExcludeEndpoint()
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const storedState = req.cookies['github_oauth_state'];
    
    // CSRF verification check
    if (!state || !storedState || state !== storedState) {
      return res.status(403).send({ message: 'Invalid or missing CSRF state token' });
    }

    // Clear the consumed state cookie
    res.clearCookie('github_oauth_state', { path: '/' });
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).send({ message: 'Invalid or missing code parameter' });
    }
    const result = await this.authService.exchangeGithubCode(code);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    // Validate the redirect URL against allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      this.configService.get<string>('FRONTEND_URL'),
    ].filter(Boolean);

    try {
      const redirectOrigin = new URL(frontendUrl).origin;
      if (!allowedOrigins.some((origin) => new URL(origin!).origin === redirectOrigin)) {
        return res.status(400).send({ message: 'Invalid redirect URL' });
      }
    } catch {
      return res.status(400).send({ message: 'Invalid redirect URL' });
    }

    // Store the access token in a secure, HTTP-only cookie
    res.setCookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(302).redirect(`${frontendUrl}/auth/callback`);
  }
}

