# 🧭 Navigation

Module for global navigation and application preferences.

| Area | Main responsibility |
| --- | --- |
| `components/Navbar.tsx` | Main desktop navigation |
| `components/MobileDrawer.tsx` | Responsive side drawer |
| `components/LanguageSelector.tsx` | Locale switching |
| `components/ThemeMenu.tsx` | Visual theme selection |
| `components/SettingsMenu.tsx` | Application preferences |
| `messages/` | Localized navigation copy |
| `providers/` and `stores/` | Context and persistent preferences |

## 🔄 Main flow

Navigation decides which controls to show based on viewport, session, and locale. Language and theme preferences live outside individual pages so they remain consistent across the application.

## 📱 Responsive behavior

Desktop uses the full navbar. On mobile, `MobileNavigation` and `MobileDrawer` reduce actions to an accessible, touch-friendly menu.
