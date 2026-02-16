import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { locales } from "@/assets/languages";
import { getLocaleInfo } from "@/utils/language";

// Languages
const langCodes = Object.keys(locales);
const resources = Object.fromEntries(
  Object.entries(locales).map((entry) => [entry[0], { translation: entry[1] }]),
);
i18n.use(initReactI18next).init({
  lng: "mn",
  fallbackLng: "mn",
  resources,
  interpolation: {
    escapeValue: false,
  },
});

export const appLanguageOptions = langCodes.map((lang) => {
  const langObj = getLocaleInfo(lang);
  if (!langObj)
    throw new Error(`Language with code ${lang} cannot be found in database`);
  return langObj;
});

export default i18n;
