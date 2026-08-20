import { create } from 'zustand';
import { api, User } from '../services/api';

export type FriendRelation = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self';

interface FriendsState {
  friends: User[];
  requests: User[];
  outgoing: User[];
  statuses: Record<string, FriendRelation>;
  isLoading: boolean;
  loadAll: () => Promise<void>;
  setStatus: (userId: string, status: FriendRelation) => void;
  sendRequest: (userId: string) => Promise<FriendRelation>;
  acceptRequest: (userId: string) => Promise<void>;
  declineRequest: (userId: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  requests: [],
  outgoing: [],
  statuses: {},
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [friends, requests, outgoing] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
        api.getOutgoingFriendRequests(),
      ]);
      set({ friends, requests, outgoing, isLoading: false });
    } catch (e) {
      console.error('load friends error', e);
      set({ isLoading: false });
    }
  },

  setStatus: (userId, status) => {
    set((state) => ({ statuses: { ...state.statuses, [userId]: status } }));
  },

  sendRequest: async (userId) => {
    const res = await api.sendFriendRequest(userId);
    const status = res.status as FriendRelation;
    get().setStatus(userId, status);
    await get().loadAll();
    return status;
  },

  acceptRequest: async (userId) => {
    await api.acceptFriendRequest(userId);
    get().setStatus(userId, 'friends');
    await get().loadAll();
  },

  declineRequest: async (userId) => {
    await api.declineFriendRequest(userId);
    get().setStatus(userId, 'none');
    await get().loadAll();
  },
}));