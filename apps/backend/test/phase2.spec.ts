import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { DevMailerService } from '../src/adapters/mailer/dev-mailer.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { Role } from '../src/common/types';

describe('Phase 2 Auth and Users Tests', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let prisma: PrismaService;
  let rolesGuard: RolesGuard;
  let jwtAuthGuard: JwtAuthGuard;
  let reflector: Reflector;

  const testEmail = `user_${Date.now()}@hust.edu.vn`;
  const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  let registeredUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const devMailer = new DevMailerService(prisma);
    authService = new AuthService(prisma, devMailer);
    usersService = new UsersService(prisma);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    jwtAuthGuard = new JwtAuthGuard();
  });

  afterAll(async () => {
    // Cleanup created test user
    if (registeredUserId) {
      await prisma.favorite.deleteMany({ where: { userId: registeredUserId } });
      await prisma.notification.deleteMany({ where: { userId: registeredUserId } });
      await prisma.user.deleteMany({ where: { id: registeredUserId } });
    }
    await prisma.user.deleteMany({ where: { phone: testPhone } });
    await prisma.onModuleDestroy();
  });

  describe('Registration & Login with Email + Password', () => {
    it('should register a new customer user and return JWT tokens', async () => {
      const res = await authService.register({
        email: testEmail,
        password: 'Password@123',
        fullName: 'Nguyễn Văn Test',
        phone: testPhone,
      });

      expect(res.user).toBeDefined();
      expect(res.user.email).toBe(testEmail);
      expect(res.user.role).toBe(Role.CUSTOMER);
      expect((res.user as any).passwordHash).toBeUndefined(); // Sanitized!
      expect(res.tokens.accessToken).toBeDefined();
      expect(res.tokens.refreshToken).toBeDefined();

      registeredUserId = res.user.id;
      accessToken = res.tokens.accessToken;
      refreshToken = res.tokens.refreshToken;
    });

    it('should reject duplicate email with ConflictException', async () => {
      await expect(
        authService.register({
          email: testEmail,
          password: 'Password@123',
          fullName: 'Nguyễn Văn Trùng',
        }),
      ).rejects.toThrow('Email này đã được đăng ký trong hệ thống');
    });

    it('should login with correct email and password', async () => {
      const res = await authService.login({
        identifier: testEmail,
        password: 'Password@123',
      });

      expect(res.user.id).toBe(registeredUserId);
      expect(res.tokens.accessToken).toBeDefined();
      accessToken = res.tokens.accessToken;
    });

    it('should login using phone number as identifier', async () => {
      const res = await authService.login({
        identifier: testPhone,
        password: 'Password@123',
      });

      expect(res.user.id).toBe(registeredUserId);
      expect(res.tokens.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      await expect(
        authService.login({
          identifier: testEmail,
          password: 'WrongPassword@999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT Refresh Token Rotation', () => {
    it('should rotate access token and refresh token', async () => {
      const res = await authService.refreshToken({ refreshToken });

      expect(res.user.id).toBe(registeredUserId);
      expect(res.tokens.accessToken).toBeDefined();
      expect(res.tokens.refreshToken).toBeDefined();
      expect(res.tokens.accessToken).not.toBe(accessToken);

      accessToken = res.tokens.accessToken;
      refreshToken = res.tokens.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        authService.refreshToken({ refreshToken: 'invalid.token.here' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Phone + OTP Flow', () => {
    const otpPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    let generatedOtp: string;

    it('should request OTP, print to console and store in DevMail', async () => {
      const res = await authService.requestOtp({ phone: otpPhone });
      expect(res.success).toBe(true);

      const mail = await prisma.devMail.findFirst({
        where: { recipient: otpPhone, category: 'OTP' },
        orderBy: { createdAt: 'desc' },
      });

      expect(mail).not.toBeNull();
      const match = mail!.subject.match(/\d{6}/);
      expect(match).not.toBeNull();
      generatedOtp = match![0];
    });

    it('should reject verification with incorrect OTP', async () => {
      await expect(
        authService.verifyOtp({ phone: otpPhone, otp: '000000' }),
      ).rejects.toThrow('Mã OTP không chính xác');
    });

    it('should verify OTP and log in / create user with tokens', async () => {
      const res = await authService.verifyOtp({
        phone: otpPhone,
        otp: generatedOtp,
        fullName: 'Khách Hàng OTP',
      });

      expect(res.user.phone).toBe(otpPhone);
      expect(res.user.role).toBe(Role.CUSTOMER);
      expect(res.tokens.accessToken).toBeDefined();

      // Clean up otp user
      await prisma.user.deleteMany({ where: { phone: otpPhone } });
    });
  });

  describe('Forgot & Reset Password Flow', () => {
    it('should request forgot password and send reset link to DevMail', async () => {
      const res = await authService.forgotPassword({ email: testEmail });
      expect(res.success).toBe(true);

      const mail = await prisma.devMail.findFirst({
        where: { recipient: testEmail, category: 'PASSWORD_RESET' },
        orderBy: { createdAt: 'desc' },
      });

      expect(mail).not.toBeNull();
      const match = mail!.bodyText.match(/token=([a-f0-9\-]+)/);
      expect(match).not.toBeNull();
      const resetToken = match![1];

      // Reset password with token
      const resetRes = await authService.resetPassword({
        token: resetToken,
        newPassword: 'BrandNewPassword@456',
      });
      expect(resetRes.success).toBe(true);

      // Verify login with new password
      const loginRes = await authService.login({
        identifier: testEmail,
        password: 'BrandNewPassword@456',
      });
      expect(loginRes.user.id).toBe(registeredUserId);
    });
  });

  describe('Guest Checkout', () => {
    it('should create guest checkout payload and temporary guest token', async () => {
      const res = await authService.guestCheckout({
        email: 'guest_buyer@gmail.com',
        phone: '0911223344',
        fullName: 'Khách Đặt Nhanh',
      });

      expect(res.guest.isGuest).toBe(true);
      expect(res.guest.email).toBe('guest_buyer@gmail.com');
      expect(res.guestToken).toBeDefined();
    });
  });

  describe('UsersService & RBAC Protection', () => {
    it('should get profile with tier and loyalty points', async () => {
      const profile = await usersService.getProfile(registeredUserId);
      expect(profile.id).toBe(registeredUserId);
      expect(profile.email).toBe(testEmail);
      expect(profile.loyaltyPoints).toBe(0);
      expect(profile.tier).toBeDefined();
    });

    it('should update profile name', async () => {
      const updated = await usersService.updateProfile(registeredUserId, {
        fullName: 'Nguyễn Văn Đã Đổi Tên',
      });
      expect(updated.fullName).toBe('Nguyễn Văn Đã Đổi Tên');
    });

    it('should manage favorite movies', async () => {
      const movie = await prisma.movie.findFirst();
      expect(movie).not.toBeNull();

      // Add favorite
      const addRes = await usersService.addFavorite(registeredUserId, movie!.id);
      expect(addRes.success).toBe(true);

      // Get favorites
      const list = await usersService.getFavorites(registeredUserId);
      expect(list.length).toBe(1);
      expect(list[0].movie.id).toBe(movie!.id);

      // Remove favorite
      const removeRes = await usersService.removeFavorite(registeredUserId, movie!.id);
      expect(removeRes.success).toBe(true);

      const listAfter = await usersService.getFavorites(registeredUserId);
      expect(listAfter.length).toBe(0);
    });

    it('should enforce RBAC with RolesGuard', () => {
      const mockExecutionContext = (role: string): ExecutionContext =>
        ({
          switchToHttp: () => ({
            getRequest: () => ({ user: { role } }),
          }),
          getHandler: () => ({}),
          getClass: () => ({}),
        } as any);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);

      // Customer trying to access Admin endpoint -> Forbidden
      expect(() => rolesGuard.canActivate(mockExecutionContext('CUSTOMER'))).toThrow(ForbiddenException);

      // Admin access -> Allowed
      expect(rolesGuard.canActivate(mockExecutionContext('ADMIN'))).toBe(true);

      // Manager access -> Allowed
      expect(rolesGuard.canActivate(mockExecutionContext('MANAGER'))).toBe(true);
    });
  });
});
