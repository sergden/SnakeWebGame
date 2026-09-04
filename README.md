# SnakeWebGame

A modern, retro-styled Snake game built with React, TypeScript, and Canvas. Features smooth animations, multiple difficulty levels, touch controls, and persistent high scores.

![Snake Game](https://img.shields.io/badge/React-18-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?style=flat&logo=vite)

## ✨ Features

- **Classic Snake Gameplay** - Guide your snake to eat apples and grow longer
- **Multiple Difficulty Levels** - 4 speed settings to challenge yourself
- **Gold Fruit Bonus** - Every 5th apple spawns a golden fruit worth 5x points (disappears in 6.5s!)
- **Retro CRT Aesthetic** - Scanlines, glow effects, and ambient spore animations
- **Responsive Controls**
  - Keyboard: WASD or Arrow keys to steer
  - Touch: Swipe on canvas or use the D-Pad
  - Mobile-friendly with on-screen controls
- **Persistent High Scores** - Best score saved per difficulty level
- **Session Statistics** - Track runs, apples eaten, and longest snake
- **Sound Effects** - Toggle audio with the mute button

## 🎮 Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Steer | `WASD` / `Arrow Keys` | Swipe or D-Pad |
| Pause/Resume | `Space` / `P` | Center D-Pad button |
| Restart | `R` | Restart button |
| Mute Sound | `M` | Mute button |
| Change Difficulty | `1-4` | Difficulty selector |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **Canvas API** - Game rendering
- **Framer Motion** - Animations
- **Lucide React** - Icons

## 📁 Project Structure

```
/workspace
├── src/
│   ├── App.tsx          # Main game component
│   ├── components/      # UI components (Overlays, DPad, Icons)
│   ├── game/
│   │   ├── engine.ts    # Game logic and state management
│   │   └── audio.ts     # Sound effects
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.js       # Vite configuration
```

## 🎯 Gameplay Tips

1. **Plan Ahead** - Don't trap yourself by chasing apples into corners
2. **Gold Fruits** - Time your approach to catch the disappearing bonus fruits
3. **Speed Matters** - Higher difficulties mean faster gameplay but more challenge
4. **Use Pause** - Strategically pause to plan your next moves

## 🏆 Scoring

- Regular Apple: 10 points
- Gold Fruit: 50 points (5x multiplier)
- High scores are saved locally per difficulty level

## 📱 Browser Support

Works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

Touch controls optimized for mobile devices.

## 📄 License

MIT

---

*Hand-rolled canvas · No snakes were harmed*
