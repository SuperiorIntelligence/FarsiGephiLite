import dev from "./dev.json";
import en from "./en.json";
import fr from "./fr.json";

export const LOCALES = {
  dev: {
    translation: dev,
    label: "زبان برنامه نویس",
  },
  en: {
    translation: en,
    label: "انگلیسی",
  },
  fr: {
    translation: fr,
    label: "فرانسه",
  },
};

export const DEFAULT_LOCALE = process.env.NODE_ENV !== "production" ? "dev" : "en";
