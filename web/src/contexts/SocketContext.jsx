import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { info, success, warning } = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let s;
    try {
      s = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        timeout: 4000,
      });

      s.on('connect', () => {
        setConnected(true);
        if (user) {
          s.emit('subscribe', {
            role: user.role_name || user.role,
            user_id: user.id,
          });
        }
      });

      s.on('connect_error', () => {
        // Silently mark disconnected when realtime server is not yet started
        setConnected(false);
      });

      s.on('disconnect', () => {
        setConnected(false);
      });

      // Global Notification Event Handlers
      s.on('application_submitted', (data) => {
        info(data.message || 'New permit application submitted!');
      });

      s.on('permit_release_ready', (data) => {
        success(data.message || 'Application payment verified and ready for release!');
      });

      s.on('permit_released', (data) => {
        success(data.message || 'Permit officially released!');
      });

      s.on('treasury_payment_pending', (data) => {
        info(data.message || 'Application approved by Sanitary, ready for payment assessment.');
      });

      s.on('violation_issued', (data) => {
        warning(data.message || 'A new violation has been recorded.');
      });

      s.on('arkabala_collected', (data) => {
        info(data.message || 'Weekly Arkabala collection recorded.');
      });

      setSocket(s);
    } catch {
      // Socket server may be offline
    }

    return () => {
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  return useContext(SocketContext) || { socket: null, connected: false };
};
