import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret = process.env.JWT_SECRET || 'hustcine-dev-secret-access-token-key-2026';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Yêu cầu xác thực tài khoản (Thiếu Bearer Token)');
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      request.user = {
        ...decoded,
        id: decoded.id || decoded.sub,
      };
      return true;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng làm mới token.');
      }
      throw new UnauthorizedException('Token xác thực không hợp lệ');
    }
  }
}
