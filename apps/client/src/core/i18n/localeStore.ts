import { create } from "zustand";

import type { Locale } from "./routing";

type LocaleStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleStore>()((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));
