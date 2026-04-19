import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './types/authenticated-request';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

const REFRESH_COOKIE = 'sh_refresh_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày

@ApiTags('Auth - Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Đăng nhập — Lấy JWT access token + refresh token (cookie)',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({
    status: 401,
    description: 'Sai tài khoản/mật khẩu hoặc tài khoản bị khoá',
  })
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(
      dto.username,
      dto.password,
      ip,
      userAgent,
    );

    // Set refresh token vào HttpOnly cookie
    res.cookie(REFRESH_COOKIE, result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/api/auth',
    });

    // Chỉ trả access_token + user ra response body (không trả refresh_token)
    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @ApiOperation({ summary: 'Refresh access token bằng refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Token mới' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token hết hạn hoặc bị thu hồi',
  })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({
        status: false,
        message: 'Không tìm thấy refresh token',
        data: null,
      });
    }

    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refreshTokens(
      refreshToken,
      ip,
      userAgent,
    );

    res.cookie(REFRESH_COOKIE, result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/api/auth',
    });

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @ApiOperation({ summary: 'Đăng xuất — Thu hồi refresh token' })
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await this.authService.logout(
      req.user.userId,
      refreshToken,
      ip,
      userAgent,
      req.user.jti,
      req.user.exp,
    );

    // Xoá cookie
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });

    return { message: 'Đã đăng xuất thành công' };
  }

  @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu — gửi email reset link' })
  @ApiResponse({
    status: 200,
    description: 'Luôn trả thành công (không tiết lộ user tồn tại)',
  })
  @Throttle({ auth: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.forgotPassword(dto.username, ip, userAgent);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng reset token từ email' })
  @ApiResponse({ status: 200, description: 'Đặt lại thành công' })
  @ApiResponse({ status: 401, description: 'Token hết hạn hoặc đã dùng' })
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPassword(
      dto.token,
      dto.new_password,
      ip,
      userAgent,
    );
  }

  @ApiOperation({ summary: 'Xác thực token + trả thông tin user hiện tại' })
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }
}
