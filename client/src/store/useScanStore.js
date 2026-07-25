import { create } from "zustand";

const useScanStore = create((set) => ({
  imageBase64: null,
  sessionData: null,

  setImageBase64: (image) => set({ imageBase64: image }),
  setSessionData: (data) => set({ sessionData: data }),

  clearScanData: () =>
    set({
      imageBase64: null,
      sessionData: null,
    }),
}));

export default useScanStore;