import { Controller, Post, Body, Get, Req, HttpCode, HttpStatus, BadRequestException, UnauthorizedException, Put } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './twofactor.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RegisterDto, Verify2FADto, RefreshTokenDto, UpdateProfileDto, ChangePasswordDto, SetTokensDto } from './dto';
import { RateLimit } from '../rate-limit.decorator';
import { ResponseUtil } from '../common/utils/response.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @RateLimit({ points: 5, duration: 60_000, scope: 'ip' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // If 2FA is required, return the temp token
    if (result.requiresTwoFactor) {
      return ResponseUtil.success(
        {
          requiresTwoFactor: true,
          tempToken: result.tempToken,
        },
        '2FA verification required',
        200,
        '/api/auth/login'
      );
    }
    
    // Set httpOnly cookies for tokens
    if (req.res && 'access' in result) {
      req.res.cookie('access_token', result.access, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });
      
      req.res.cookie('refresh_token', result.refresh, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }
    
    return ResponseUtil.success(
      'user' in result ? result.user : null,
      'Login successful',
      200,
      '/api/auth/login'
    );
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user (admin only)' })
  async register(@CurrentUser() user: { id: string; role: string }, @Body() dto: RegisterDto) {
    // Allow only platform admins or staff to register new users
    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Not allowed');
    }
    const result = await this.authService.register(dto);
    return ResponseUtil.created(result, 'User registered successfully', '/api/auth/register');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return ResponseUtil.success(result, 'Token refreshed successfully', 200, '/api/auth/refresh');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  async logout(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.sessionService.revokeSession(user.id, token || '');
    
    // Clear httpOnly cookies
    req.res.clearCookie('access_token', { path: '/' });
    req.res.clearCookie('refresh_token', { path: '/' });
    req.res.clearCookie('user', { path: '/' });
    
    return ResponseUtil.success(null, 'Logged out successfully', 200, '/api/auth/logout');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async me(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }) {
    const userInfo = await this.authService.getUserInfo(user.id);
    return ResponseUtil.success(userInfo, 'User info retrieved successfully', 200, '/api/auth/me');
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }) {
    return this.sessionService.getUserSessions(user.id);
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() body: { sessionId: string }) {
    await this.sessionService.revokeSessionById(user.id, body.sessionId);
    return { message: 'Session revoked successfully' };
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  async revokeAllSessions(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Req() req: any) {
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    await this.sessionService.revokeAllSessions(user.id, currentToken);
    return { message: 'All other sessions revoked successfully' };
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA for user' })
  async enable2FA(@CurrentUser() user: any) {
    return this.twoFactorService.enableTwoFactor(user.id);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify 2FA setup' })
  async verify2FASetup(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
    const verified = await this.twoFactorService.verifyAndEnable(user.id, dto.token);
    if (!verified) {
      throw new BadRequestException('Invalid 2FA token');
    }
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@CurrentUser() user: any, @Body() dto: Verify2FADto) {
    await this.twoFactorService.disableTwoFactor(user.id, dto.token);
    return { message: '2FA disabled successfully' };
  }

  @Public()
  @Post('resend-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend 2FA code' })
  async resend2FA(@Body() dto: { tempToken: string }) {
    return this.authService.resend2FA(dto.tempToken);
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA token' })
  async login2FA(@Body() dto: { tempToken: string; twoFactorToken: string }, @Req() req: any) {
    const result = await this.authService.completeTwoFactorLogin(dto.tempToken, dto.twoFactorToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // Set httpOnly cookies for tokens
    req.res.cookie('access_token', result.access, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    req.res.cookie('refresh_token', result.refresh, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    
    return {
      data: result.user,
      message: '2FA login successful',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/2fa/login'
    };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUser() user: { id: string; tenantId: string }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateUserProfile(user.id, dto);
  }

  @Put('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Post('set-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set tokens as httpOnly cookies' })
  async setTokens(@Body() dto: SetTokensDto, @Req() req: Request) {
    // Set httpOnly cookies for tokens
    req.res.cookie('access_token', dto.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    req.res.cookie('refresh_token', dto.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      message: 'Tokens set successfully',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/set-tokens'
    };
  }

  @Public()
  @Post('clear-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear httpOnly cookies' })
  async clearTokens(@Req() req: any) {
    // Clear httpOnly cookies
    req.res.clearCookie('access_token', { path: '/' });
    req.res.clearCookie('refresh_token', { path: '/' });
    req.res.clearCookie('user', { path: '/' });

    return {
      message: 'Tokens cleared successfully',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/clear-tokens'
    };
  }

}