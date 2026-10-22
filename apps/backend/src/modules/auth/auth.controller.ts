import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GuestCheckoutDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth & Users')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, trả về thông tin và tokens' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập bằng Email/SĐT và Mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về tokens' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('otp/request')
  @ApiOperation({ summary: 'Yêu cầu mã OTP qua số điện thoại' })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được tạo và gửi đến hòm thư /dev/mailbox' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Xác thực mã OTP và đăng nhập/tạo tài khoản' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, description: 'Cấp token mới' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu qua email' })
  @ApiResponse({ status: 200, description: 'Đã gửi liên kết đặt lại mật khẩu' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Xác nhận đổi mật khẩu mới bằng token' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('guest')
  @ApiOperation({ summary: 'Đăng ký thông tin khách vãng lai (Guest Checkout)' })
  @ApiResponse({ status: 200, description: 'Cấp token tạm thời cho khách vãng lai' })
  guestCheckout(@Body() dto: GuestCheckoutDto) {
    return this.authService.guestCheckout(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Thông tin cá nhân, hạng thẻ, điểm HUST Club' })
  getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
