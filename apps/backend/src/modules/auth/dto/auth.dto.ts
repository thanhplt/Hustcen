import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'nguyenvanb@hust.edu.vn' })
  @IsString({ message: 'Email không được để trống' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'MatKhau@123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  @ApiPropertyOptional({ example: '0988776655' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'customer@hust.edu.vn', description: 'Email hoặc Số điện thoại' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập Email hoặc Số điện thoại' })
  identifier: string;

  @ApiProperty({ example: 'Customer@123' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '0988776655' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0988776655' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  otp: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@hust.edu.vn' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-uuid' })
  @IsString()
  @IsNotEmpty({ message: 'Token đặt lại mật khẩu không được để trống' })
  token: string;

  @ApiProperty({ example: 'NewMatKhau@123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}

export class GuestCheckoutDto {
  @ApiProperty({ example: 'guest@gmail.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '0977889900' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ example: 'Khách Vãng Lai' })
  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  fullName: string;
}
