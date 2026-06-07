import { tokens } from "@fluentui/react-components";
import type { Finding } from "@/types/api";

/** Dark-theme-safe surfaces for finding status cards (webDarkTheme). */
export function getFindingStatusSurface(status: Finding["status"]) {
  switch (status) {
    case "vulnerable":
      return {
        borderColor: tokens.colorPaletteRedBorder1,
        backgroundColor: tokens.colorPaletteRedBackground1,
        iconColor: tokens.colorPaletteRedForeground1,
      };
    case "defended":
      return {
        borderColor: tokens.colorPaletteGreenBorder1,
        backgroundColor: tokens.colorPaletteGreenBackground1,
        iconColor: tokens.colorPaletteGreenForeground1,
      };
    default:
      return {
        borderColor: tokens.colorPaletteDarkOrangeBorder1,
        backgroundColor: tokens.colorPaletteDarkOrangeBackground1,
        iconColor: tokens.colorPaletteDarkOrangeForeground1,
      };
  }
}
