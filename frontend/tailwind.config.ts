import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				brand: {
					yellow: 'hsl(var(--brand-yellow))',
					'yellow-hover': 'hsl(var(--brand-yellow-hover))',
					dark: 'hsl(var(--brand-dark))'
				},
				navbar: {
					DEFAULT: 'hsl(var(--navbar-background))',
					foreground: 'hsl(var(--navbar-foreground))'
				},
				'hover-bg': 'hsl(var(--hover-background))',
				'active-bg': 'hsl(var(--active-background))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'bounce-custom': {
					'0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
					'50%': { transform: 'translateY(-8px)', opacity: '1' },
				},
				'dot-spin': {
					'0%': { transform: 'rotate(var(--initial-rotation)) translate(150px)', opacity: '0.5' },
					'30%': { opacity: '0.8' },
					'50%': { opacity: '1' },
					'60%': { opacity: '0.8' },
					'100%': { transform: 'rotate(calc(var(--initial-rotation) + 360deg)) translate(150px)', opacity: '0.5' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 1s ease-in forwards',
				'bounce-custom': 'bounce-custom 1.5s ease-in-out infinite',
				'dot-spin': 'dot-spin 2.8s cubic-bezier(0.4,0,0.6,1) infinite',
			},
			transitionDelay: {
				1000: '1000ms',
				2000: '2000ms'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		require('tailwind-scrollbar')({ nocompatible: true }),
	],
} satisfies Config;
