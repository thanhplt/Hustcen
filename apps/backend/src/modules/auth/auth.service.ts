import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DevMailerService } from '../../adapters/mailer/dev-mailer.service';
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

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

interface ResetTokenEntry {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'hustcine-dev-secret-access-token-key-2026';
  private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'hustcine-dev-secret-refresh-token-key-2026';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // In-memory OTP store (phone -> { otp, expiresAt })
  private otpStore = new Map<string, OtpEntry>();

  // In-memory Password Reset tokens (token -> { userId, expiresAt })
  private resetTokenStore = new Map<string, ResetTokenEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly devMailer: DevMailerService,
  ) {}

  async register(dto: RegisterDto) {
    let email = dto.email?.trim().toLowerCase();
    let phone = dto.phone?.trim() || null;

    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }

    if (email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BadRequestException('Email không đúng định dạng');
      }
    } else if (/^[0-9+ ]{8,15}$/.test(email)) {
      if (!phone) phone = email.replace(/\s+/g, '');
      email = `${phone}@user.hustcine.edu.vn`;
    } else {
      throw new BadRequestException('Email không đúng định dạng');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) {
      if (email && existing.email === email) {
        throw new ConflictException('Email này đã được đăng ký trong hệ thống');
      }
      if (phone && existing.phone === phone) {
        throw new ConflictException('Số điện thoại này đã được liên kết với tài khoản khác');
      }
    }

    // Default to Silver tier
    const silverTier = await this.prisma.membershipTier.findFirst({
      where: { name: { contains: 'Silver' } },
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: phone || null,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: 'CUSTOMER',
        tierId: silverTier?.id || null,
        loyaltyPoints: 0,
      },
      include: { tier: true },
    });

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
      },
      include: { tier: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email / Số điện thoại hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email / Số điện thoại hoặc mật khẩu không chính xác');
    }

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async requestOtp(dto: RequestOtpDto) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    this.otpStore.set(dto.phone, { otp, expiresAt });

    // Send via DevMailer (logs to console and stores in DevMail table)
    await this.devMailer.sendMail({
      to: dto.phone,
      subject: `[HUST Cine] Mã xác thực OTP: ${otp}`,
      bodyText: `Mã xác thực OTP đăng nhập HUST Cine của bạn là: ${otp}. Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
      bodyHtml: `<p>Mã xác thực OTP đăng nhập HUST Cine của bạn là: <strong style="font-size:24px;color:#c8102e;">${otp}</strong></p><p>Mã có hiệu lực trong 5 phút.</p>`,
      category: 'OTP',
    });

    this.logger.log(`Generated OTP for ${dto.phone}: ${otp}`);

    return {
      success: true,
      message: `Mã OTP đã được gửi đến số điện thoại ${dto.phone} (Kiểm tra tại /dev/mailbox)`,
      expiresInSeconds: 300,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const entry = this.otpStore.get(dto.phone);
    if (!entry) {
      throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được yêu cầu');
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(dto.phone);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    if (entry.otp !== dto.otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // OTP verified -> remove from store
    this.otpStore.delete(dto.phone);

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
      include: { tier: true },
    });

    if (!user) {
      const silverTier = await this.prisma.membershipTier.findFirst({
        where: { name: { contains: 'Silver' } },
      });

      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          fullName: dto.fullName || `Thành viên ${dto.phone.slice(-4)}`,
          role: 'CUSTOMER',
          tierId: silverTier?.id || null,
          loyaltyPoints: 0,
        },
        include: { tier: true },
      });
    }

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const decoded = jwt.verify(dto.refreshToken, this.jwtRefreshSecret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { tier: true },
      });

      if (!user) {
        throw new UnauthorizedException('Người dùng không còn tồn tại');
      }

      // Rotate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Return success anyway for security reasons (don't leak user existence)
      return {
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư.',
      };
    }

    const resetToken = uuidv4();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    this.resetTokenStore.set(resetToken, { userId: user.id, expiresAt });

    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.devMailer.sendMail({
      to: user.email!,
      subject: '[HUST Cine] Yêu cầu đặt lại mật khẩu',
      bodyText: `Xin chào ${user.fullName},\n\nBạn vừa yêu cầu đặt lại mật khẩu. Vui lòng bấm vào liên kết sau để tạo mật khẩu mới:\n${resetLink}\n\nLiên kết có hiệu lực trong 15 phút.`,
      bodyHtml: `<p>Xin chào <strong>${user.fullName}</strong>,</p><p>Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng bấm vào liên kết sau để tạo mật khẩu mới:</p><p><a href="${resetLink}" style="color:#c8102e;font-weight:bold;">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 15 phút.</p>`,
      category: 'PASSWORD_RESET',
    });

    this.logger.log(`Generated Password Reset Token for ${user.email}: ${resetToken}`);

    return {
      success: true,
      message: 'Hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư (Xem tại /dev/mailbox)',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const entry = this.resetTokenStore.get(dto.token);
    if (!entry) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng');
    }

    if (Date.now() > entry.expiresAt) {
      this.resetTokenStore.delete(dto.token);
      throw new BadRequestException('Token đặt lại mật khẩu đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: entry.userId },
      data: { passwordHash },
    });

    this.resetTokenStore.delete(dto.token);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
    };
  }

  async guestCheckout(dto: GuestCheckoutDto) {
    // Generate guest pseudo-token valid for 1 hour for booking flow
    const guestPayload = {
      isGuest: true,
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
    };

    const guestToken = jwt.sign(guestPayload, this.jwtSecret, { expiresIn: '1h' });

    return {
      guest: guestPayload,
      guestToken,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tier: true,
        _count: {
          select: {
            bookings: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return this.sanitizeUser(user);
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      jti: uuidv4(),
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, jti: uuidv4() }, this.jwtRefreshSecret, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 mins
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
