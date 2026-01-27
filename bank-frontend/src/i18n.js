import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import th from "./Language/th.json";
import en from "./Language/en.json";

const savedLng = localStorage.getItem("lng") || "th";

i18n.use(initReactI18next).init({
  resources: {
    th: { translation: th },
    en: { translation: en },
  },
  lng: savedLng,
  fallbackLng: "th",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lng", lng);
});

export default i18n;