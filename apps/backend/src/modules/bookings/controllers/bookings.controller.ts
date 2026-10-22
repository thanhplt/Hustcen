import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { BookingsService } from '../services/bookings.service';
import { HoldSeatsDto, ReleaseHoldDto } from '../dto/hold-seats.dto';
import { CreateBookingDto, CalculatePriceDto } from '../dto/create-booking.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';

function extractUserIdFromReq(req: any): string | undefined {
  if (req?.user?.id) return req.user.id;
  if (req?.user?.sub) return req.user.sub;
  const authHeader = req?.headers?.['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const jwtSecret = process.env.JWT_SECRET || 'hustcine-dev-secret-access-token-key-2026';
      const decoded: any = jwt.verify(token, jwtSecret);
      return decoded.id || decoded.sub;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

@ApiTags('Bookings - Hold & Checkout')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  @ApiOperation({ summary: 'Giữ ghế nguyên tử (Atomic Seat Hold 10 phút, kiểm tra cutoff, orphan seat, Whole-Room)' })
  holdSeats(@Body() dto: HoldSeatsDto, @Req() req: any) {
    const userId = extractUserIdFromReq(req);
    const sessionId = dto.sessionId || req.headers['x-session-id'];
    return this.bookingsService.holdSeats(dto, userId, sessionId);
  }

  @Post('release')
  @ApiOperation({ summary: 'Nhả ghế đang giữ trước thời hạn' })
  releaseHold(@Body() dto: ReleaseHoldDto, @Req() req: any) {
    const userId = extractUserIdFromReq(req);
    const sessionId = dto.sessionId || req.headers['x-session-id'];
    return this.bookingsService.releaseHold(dto, userId, sessionId);
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Tính toán giá vé tạm tính kèm phụ thu phòng/ghế/định dạng, combo bắp nước và mã voucher' })
  calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.bookingsService.calculatePrice(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo đơn đặt vé từ ghế đang giữ (hỗ trợ cả khách đăng nhập lẫn khách vãng lai)' })
  createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    const userId = extractUserIdFromReq(req);
    const sessionId = dto.sessionId || req.headers['x-session-id'];
    return this.bookingsService.createBooking(dto, userId, sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn đặt vé theo ID' })
  getBookingById(@Param('id') id: string, @Req() req: any) {
    const userId = extractUserIdFromReq(req);
    return this.bookingsService.getBookingById(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn đặt vé (tối đa trước giờ chiếu 10 phút, tự động hoàn tiền và mở lại ghế)' })
  cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: any,
  ) {
    const userId = extractUserIdFromReq(req);
    const userRole = req?.user?.role;
    return this.bookingsService.cancelBooking(id, dto, userId, userRole);
  }
}


