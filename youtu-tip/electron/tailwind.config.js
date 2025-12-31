/** @type {import('tailwindcss').Config} 
 * File: electron/tailwind.config.js
 * Project: Tip Desktop Assistant
 * Description: Tailwind CSS configuration for the renderer process, 
 * defining custom themes and disabling preflight styles.
 * 
 * Copyright (C) 2025 Tencent. All rights reserved.
 * License: Licensed under the License Terms of Youtu-Tip (see license at repository root).
*/
export default {
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'tip-bg-from': '#E8F4FF',
        'tip-bg-to': '#F3EBFF',
        'tip-highlight-from': '#60D1FF',
        'tip-highlight-to': '#8C7BFF',
        'tip-overlay-dark': '#12151E',
      },
      backgroundImage: {
        'tip-overlay-shimmer': 'linear-gradient(120deg, rgba(96,209,255,0.4), rgba(140,123,255,0.35), rgba(99,240,219,0.25))',
        'tip-overlay-radial': 'radial-gradient(circle at top, rgba(96,209,255,0.25), transparent 60%)',
      },
      boxShadow: {
        'tip-card': '0 20px 80px rgba(18,23,35,0.35)',
        'tip-selection': '0 0 30px rgba(140,123,255,0.35)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
