import { create } from 'zustand';
import { api, StoryGroup } from '../services/api';

interface StoriesState {
  groups: StoryGroup[];
  isLoading: boolean;
  loadStories: () => Promise<void>;
  postStory: (mediaUrl: string, mediaType?: string, fileName?: string, caption?: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  groups: [],
  isLoading: false,

  loadStories: async () => {
    try {
      const groups = await api.getStories();
      set({ groups });
    } catch (e) {
      console.error('load stories error', e);
    }
  },

  postStory: async (mediaUrl, mediaType, fileName, caption) => {
    await api.createStory({
      media_url: mediaUrl,
      media_type: mediaType || 'image',
      file_name: fileName,
      caption,
    });
    await get().loadStories();
  },

  deleteStory: async (storyId) => {
    await api.deleteStory(storyId);
    await get().loadStories();
  },
}));