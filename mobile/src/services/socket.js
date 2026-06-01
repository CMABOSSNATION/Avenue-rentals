// mobile/src/services/socket.js
import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', reason => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', err => console.warn('[Socket] Error:', err.message));

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinInquiry(inquiryId) {
  socket?.emit('join_inquiry', inquiryId);
}

export function leaveInquiry(inquiryId) {
  socket?.emit('leave_inquiry', inquiryId);
}

export function sendTyping(inquiryId) {
  socket?.emit('typing', { inquiryId });
}
