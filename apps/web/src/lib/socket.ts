import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4000';
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socket;
}
