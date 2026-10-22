import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface SeatStatusUpdate {
  seatId: string;
  status: string; // AVAILABLE, HELD, SOLD
  holdExpiresAt?: Date | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_showtime')
  handleJoinShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showtimeId: string },
  ) {
    if (data && data.showtimeId) {
      const room = `showtime:${data.showtimeId}`;
      client.join(room);
      this.logger.debug(`Client ${client.id} joined room ${room}`);
      return { event: 'joined_showtime', data: { showtimeId: data.showtimeId } };
    }
  }

  @SubscribeMessage('leave_showtime')
  handleLeaveShowtime(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { showtimeId: string },
  ) {
    if (data && data.showtimeId) {
      const room = `showtime:${data.showtimeId}`;
      client.leave(room);
      this.logger.debug(`Client ${client.id} left room ${room}`);
      return { event: 'left_showtime', data: { showtimeId: data.showtimeId } };
    }
  }

  /**
   * Broadcast seat status updates to all clients currently viewing this showtime
   */
  broadcastSeatStatusChanged(showtimeId: string, seats: SeatStatusUpdate[]) {
    if (!this.server) return;
    const room = `showtime:${showtimeId}`;
    this.server.to(room).emit('seat_status_changed', {
      showtimeId,
      seats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast showtime status changes (e.g., OPEN -> CLOSING_SOON -> CLOSED)
   */
  broadcastShowtimeStatusChanged(showtimeId: string, status: string) {
    if (!this.server) return;
    const room = `showtime:${showtimeId}`;
    this.server.to(room).emit('showtime_status_changed', {
      showtimeId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
