// Hardware Store - Zustand
import { create } from 'zustand';
import type { HardwareProfile } from '../../shared/types/all';
import { zerotweaks } from '../lib/api'; // This would be window.zerotweaks in browser

interface HardwareState {
  hardware: HardwareProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchHardware: () => Promise<void>;
  setHardware: (hardware: HardwareProfile) => void;
}

export const useHardwareStore = create<HardwareState>((set) => ({
  hardware: null,
  isLoading: true,
  error: null,
  fetchHardware: async () => {
    set({ isLoading: true, error: null });
    try {
      const hardware = await window.zerotweaks.system['system:hardware']();
      set({ hardware, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  setHardware: (hardware) => set({ hardware }),
}));