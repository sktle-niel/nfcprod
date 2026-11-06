import { DEFAULT_THEME, isTemplateStyle, type Theme } from '@/entities/theme/theme'

/**
 * The theme as the menus are drawn. A page template (`isTemplateStyle`) draws itself, from the owner's colors, font, menu
 * layout and page photo. Every other style, Classic too, is retired: its choices (card, picture shape, titles, header, line art, textures,
 * corners, the featured best seller) stay in the stored theme but are not drawn, and the menu is drawn by Daybreak, so a saved
 * menu never shows a look nobody can pick any more. The public page, the owner's preview and the Design preview all reach the
 * menu through `MenuFrame` or `MenuPreviewFrame`, which apply it, so the three always agree.
 */
export function plainTheme(theme: Theme): Theme {
  const { card, photo, title, header, decor, spotlight, buttonStyle, backdrop } = DEFAULT_THEME
  const pagePhoto = theme.backdrop === 'picture' || theme.backdrop === 'stock'
  return { ...theme, style: isTemplateStyle(theme.style) ? theme.style : 'daybreak', card, photo, title, header, decor, spotlight, buttonStyle, backdrop: pagePhoto ? theme.backdrop : backdrop }
}
