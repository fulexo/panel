import { Controller, Post, Body, Get, Req, HttpCode, HttpStatus, BadRequestException, UnauthorizedException, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './twofactor.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RegisterDto, Verify2FADto, RefreshTokenDto } from './dto';
import { RateLimit } from '../rate-limit.decorator';

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
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const result = await this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // If 2FA is required, return the temp token
    if (result.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        tempToken: result.tempToken,
        message: '2FA verification required',
        statusCode: 200,
        timestamp: new Date().toISOString(),
        path: '/api/auth/login'
      };
    }
    
    // Set httpOnly cookies for tokens
    req.res.cookie('access_token', result.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    req.res.cookie('refresh_token', result.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    
    return {
      data: result.user,
      message: 'Login successful',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/login'
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user (admin only)' })
  async register(@CurrentUser() user: any, @Body() dto: RegisterDto) {
    // Allow only platform admins or staff to register new users
    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Not allowed');
    }
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  async logout(@CurrentUser() user: any, @Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.sessionService.revokeSession(user.id, token);
    
    // Clear httpOnly cookies
    req.res.clearCookie('access_token', { path: '/' });
    req.res.clearCookie('refresh_token', { path: '/' });
    req.res.clearCookie('user', { path: '/' });
    
    return { 
      message: 'Logged out successfully',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/logout'
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async me(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }) {
    const userInfo = await this.authService.getUserInfo(user.id);
    return {
      data: userInfo,
      message: 'User info retrieved successfully',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/auth/me'
    };
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    req.res.cookie('refresh_token', result.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
  async updateProfile(@CurrentUser() user: any, @Body() dto: any) {
    return this.authService.updateUserProfile(user.id, dto);
  }

  @Put('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@CurrentUser() user: any, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

}