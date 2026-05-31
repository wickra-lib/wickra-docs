import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
// Brand palette shared with the marketing site (wickra.org) so both render in
// the same Wickra cyan identity — see custom.css.
import './custom.css'

export default {
  extends: DefaultTheme,
} satisfies Theme
