import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.authService.getProfile(user.userId);
  }

  @Get('github')
  @ApiOperation({ summary: 'Redirect to GitHub OAuth2 login' })
  async githubLogin(@Res() res: any) {
    const url = this.authService.getGithubAuthUrl();
    return res.status(302).redirect(url);
  }

  @Get('github/callback')
  @ApiExcludeEndpoint()
  async githubCallback(
    @Query('code') code: string,
    @Res() res: any,
  ) {
    const result = await this.authService.exchangeGithubCode(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.status(302).redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
  }
}

