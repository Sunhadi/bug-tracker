import { config } from "@fortawesome/fontawesome-svg-core";

/**
 * Font Awesome: matikan sisipan CSS otomatis.
 *
 * Tanpa ini, core menyuntik style svg sendiri saat modul dimuat, dan icon
 * yang sudah dirender membesar sesaat di load pertama (FOUC). CSS-nya sendiri
 * diimpor di app/layout.tsx.
 *
 * Modul ini harus diimpor sebelum ada <FontAwesomeIcon> yang dirender.
 */
config.autoAddCss = false;

export const FA_CONFIG = config;