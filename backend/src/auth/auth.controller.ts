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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successful login. Returns access token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid credentials.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    // Set HTTP-only cookie for consistency with GitHub OAuth flow
    res.setCookie('auth_token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'Successful registration. Returns access token.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Validation failed.' })
  @ApiResponse({ status: 409, description: 'Conflict. Email already in use.' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );

    res.setCookie('auth_token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear authentication cookie' })
  @ApiResponse({ status: 200, description: 'Successful logout.' })
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie('auth_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Token is missing or invalid.',
  })
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
    if (typeof code !== 'string' || !code.trim()) {
      return res
        .status(400)
        .send({ message: 'Invalid or missing code parameter' });
    }

    if (typeof state !== 'string' || !/^[0-9a-f]{32}$/i.test(state)) {
      return res
        .status(400)
        .send({ message: 'Invalid or missing state parameter' });
    }

    const storedState = req.cookies['github_oauth_state'];

    // CSRF verification check
    if (!storedState || state !== storedState) {
      return res
        .status(403)
        .send({ message: 'Invalid or missing CSRF state token' });
    }

    // Clear the consumed state cookie
    res.clearCookie('github_oauth_state', { path: '/' });
    const result = await this.authService.exchangeGithubCode(code);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    // Validate the redirect URL against allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      this.configService.get<string>('FRONTEND_URL'),
    ].filter(Boolean);

    // Ensure there is at least one allowed origin configured
    if (allowedOrigins.length === 0) {
      return res.status(500).send({
        message: 'No allowed redirect origins are configured on the server',
      });
    }

    try {
      const redirectOrigin = new URL(frontendUrl).origin;
      const isAllowed = allowedOrigins.some((origin) => {
        const allowedOrigin = new URL(origin as string).origin;
        return allowedOrigin === redirectOrigin;
      });

      if (!isAllowed) {
        return res.status(400).send({
          message: 'Redirect origin is not allowed by server configuration',
        });
      }
    } catch (error) {
      return res.status(400).send({
        message: 'Invalid redirect URL configuration',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Store the access token in a secure, HTTP-only cookie
    res.setCookie('auth_token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(302).redirect(`${frontendUrl}/auth/callback`);
  }
}
