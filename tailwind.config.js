/** @type {import('tailwindcss').Config} */
function opacityScale(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  const result = { DEFAULT: hex }
  ;[5,10,20,25,30,40,50,60,70,75,80,90,95,100].forEach(op => {
    result[op] = `rgba(${r},${g},${b},${op/100})`
  })
  return result
}

export default {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'space': { black: opacityScale('#000000'), gray: '#0a0a0a', blue: opacityScale('#0b1021') },
        'accent': { blue: opacityScale('#0055ff'), cyan: opacityScale('#00d4ff'), green: opacityScale('#00ff88'), orange: opacityScale('#ff6b00'), purple: opacityScale('#7c4dff') },
      },
      fontFamily: {
        sans: ['Inter','system-ui','sans-serif'],
        mono: ['JetBrains Mono','Consolas','monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'orbit': 'orbit 8s linear infinite',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        glow: {
          '0%': { boxShadow: '0 0 4px rgba(0,85,255,0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(0,85,255,0.8),0 0 40px rgba(0,212,255,0.3)' }
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(24px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(24px) rotate(-360deg)' }
        }
      },
    },
  },
  plugins: [],
}
