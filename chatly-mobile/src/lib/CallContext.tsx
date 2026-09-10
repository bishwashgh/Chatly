import React, { createContext, useContext, useState, useCallback } from 'react';

export type CallPeer = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type ActiveCall = {
  sessionId: string;
  roomToken: string;
  channelName: string;
  callType: 'AUDIO' | 'VIDEO';
  peer: CallPeer;
  /** True when the local user initiated the call, false for incoming calls. */
  isOutgoing: boolean;
};

type CallContextValue = {
  activeCall: ActiveCall | null;
  presentCall: (call: ActiveCall) => void;
  answerCall: (call: ActiveCall) => void;
  dismissCall: () => void;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const presentCall = useCallback((call: ActiveCall) => {
    setActiveCall(call);
  }, []);

  const dismissCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return (
    <CallContext.Provider value={{ activeCall, presentCall, answerCall: presentCall, dismissCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}