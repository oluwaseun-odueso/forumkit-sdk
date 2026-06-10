import type { WebSocket } from 'ws';
import type { WSMessage } from '@forumkit/types';

const rooms = new Map<string, Set<WebSocket>>();

export function joinRoom(threadId: string, socket: WebSocket): void {
  let room = rooms.get(threadId);
  if (!room) {
    room = new Set();
    rooms.set(threadId, room);
  }
  room.add(socket);
}

export function leaveRoom(threadId: string, socket: WebSocket): void {
  const room = rooms.get(threadId);
  if (!room) return;
  room.delete(socket);
  if (room.size === 0) rooms.delete(threadId);
}

export function broadcast(threadId: string, message: WSMessage): void {
  const room = rooms.get(threadId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const socket of room) {
    if (socket.readyState === 1 /* OPEN */) {
      socket.send(payload);
    } else {
      room.delete(socket);
    }
  }
  if (room.size === 0) rooms.delete(threadId);
}
