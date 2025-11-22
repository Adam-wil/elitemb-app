---
name: ui-guidelines
description: Apply comprehensive UI/UX design guidelines to React + TypeScript + Tailwind applications. Use this skill when building React components, pages, or any UI to ensure consistent styling with Tailwind classes, proper TypeScript types, accessible design, and professional quality following the established design system. All code examples use TypeScript (.tsx), React functional components, and Tailwind CSS.
---

# UI/UX Guidelines - React + TypeScript + Tailwind

Apply these design guidelines to all React applications built with TypeScript and Tailwind CSS to ensure visual consistency, accessibility, and professional quality.

## Tech Stack Requirements

**All code must use:**
- ✅ React 18+ (functional components, hooks)
- ✅ TypeScript (.tsx files with proper interfaces)
- ✅ Tailwind CSS (utility classes, no inline styles)
- ✅ Lucide React icons (see icon-guidelines skill)

## Color System

### Primary Colors
- **Primary Black**: `#1A1A1A` - Headers, primary text, navigation
- **Primary White**: `#FFFFFF` - Clean surfaces, card backgrounds
- **Primary Navy**: `#0F1419` - Deep backgrounds, high-contrast elements

### Secondary Colors
- **Gray Dark**: `#2D3748` - Sidebar backgrounds, secondary navigation
- **Gray Medium**: `#4A5568` - Inactive states, secondary text
- **Gray Light**: `#E2E8F0` - Subtle backgrounds, hover states
- **Blue**: `#3B82F6` - Interactive elements, links, accents

### Accent Colors
- **Teal**: `#14B8A6` - Progress indicators, completion states (OMM)
- **Orange**: `#F97316` - Attention items, HOTO indicators
- **Yellow**: `#FBBF24` - CAD category, warnings, highlights
- **Navy Blue**: `#1E40AF` - GDL category, primary actions

### Functional Colors
- **Success Green**: `#10B981` - Completed tasks, success messages
- **Error Red**: `#EF4444` - Errors, destructive actions
- **Warning Amber**: `#F59E0B` - Warnings, caution messages
- **Info Blue**: `#3B82F6` - Informational messages
- **Neutral Gray**: `#6B7280` - Disabled states, placeholders

### Background Colors
- **Light Primary**: `#FAFAFA` - Main app background
- **Light Secondary**: `#F5F5F5` - Card containers
- **Light Tertiary**: `#FFFFFF` - Pure white for content
- **Dark Primary**: `#0A0A0A` - Dark mode main background
- **Dark Secondary**: `#1A1A1A` - Dark mode cards

### Tailwind Configuration

Add these colors to your `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        'primary-black': '#1A1A1A',
        'primary-white': '#FFFFFF',
        'primary-navy': '#0F1419',
        
        // Secondary
        'secondary-gray-dark': '#2D3748',
        'secondary-gray-medium': '#4A5568',
        'secondary-gray-light': '#E2E8F0',
        'secondary-blue': '#3B82F6',
        
        // Accents
        'accent-teal': '#14B8A6',
        'accent-orange': '#F97316',
        'accent-yellow': '#FBBF24',
        'accent-navy-blue': '#1E40AF',
        
        // Functional
        'success-green': '#10B981',
        'error-red': '#EF4444',
        'warning-amber': '#F59E0B',
        'info-blue': '#3B82F6',
        'neutral-gray': '#6B7280',
        
        // Backgrounds
        'bg-primary': '#FAFAFA',
        'bg-secondary': '#F5F5F5',
        'bg-tertiary': '#FFFFFF',
        'bg-dark-primary': '#0A0A0A',
        'bg-dark-secondary': '#1A1A1A',
      },
      spacing: {
        // 4px grid system
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '40px', letterSpacing: '-0.3px', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '32px', letterSpacing: '-0.2px', fontWeight: '700' }],
        'h3': ['20px', { lineHeight: '28px', letterSpacing: '-0.1px', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-large': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '20px' }],
        'body-small': ['12px', { lineHeight: '18px' }],
        'caption': ['11px', { lineHeight: '16px', letterSpacing: '0.2px', fontWeight: '500' }],
        'stat-large': ['36px', { lineHeight: '44px', letterSpacing: '-0.5px', fontWeight: '700' }],
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
      },
      boxShadow: {
        'card': '0px 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0px 4px 12px rgba(0, 0, 0, 0.08)',
        'stat-card': '0px 1px 4px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
```

## Typography

### Font Families
- **Primary**: Inter (Web, Desktop)
- **Mobile**: SF Pro (iOS) / Roboto (Android)
- **Monospace**: JetBrains Mono (technical data, IDs)

### Font Weights
- Regular: 400, Medium: 500, Semibold: 600, Bold: 700

### Text Styles
- **H1**: 32px/40px Bold, -0.3px letter-spacing
- **H2**: 24px/32px Bold, -0.2px letter-spacing
- **H3**: 20px/28px Semibold, -0.1px letter-spacing
- **H4**: 18px/24px Semibold
- **Body Large**: 16px/24px Regular
- **Body**: 14px/20px Regular
- **Body Small**: 12px/18px Regular
- **Caption**: 11px/16px Medium, 0.2px letter-spacing
- **Button**: 14px/20px Semibold, 0.1px letter-spacing
- **Stat Large**: 36px/44px Bold, -0.5px letter-spacing
- **Stat Label**: 12px/16px Medium, 0.5px letter-spacing (uppercase)

## Component Patterns

### Buttons (React + TypeScript + Tailwind)

All button examples use TypeScript interfaces and Tailwind classes.

**Base Button Component:**

```tsx
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'success' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  icon: Icon,
  iconPosition = 'left',
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary-black text-primary-white hover:opacity-90 active:scale-98 active:opacity-85',
    secondary: 'border-1.5 border-primary-black text-primary-black bg-transparent hover:bg-secondary-gray-light active:scale-98',
    accent: 'bg-secondary-blue text-primary-white hover:bg-blue-600 active:scale-98',
    destructive: 'bg-error-red text-primary-white hover:bg-red-600 active:scale-98',
    success: 'bg-success-green text-primary-white hover:bg-green-600 active:scale-98',
    text: 'text-secondary-blue hover:underline active:text-blue-700',
  };
  
  const sizeClasses = {
    small: 'h-9 px-4 text-[13px]',
    medium: 'h-11 px-5 text-[14px]',
    large: 'h-[52px] px-6 text-[16px]',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={20} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon size={20} />}
        </>
      )}
    </button>
  );
}
```

**Usage Examples:**

```tsx
import { Download, ChevronRight, Trash2, Check } from 'lucide-react';

// Primary button
<Button variant="primary">Save Changes</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// With icon
<Button variant="accent" icon={Download}>
  Download Report
</Button>

// Icon on right
<Button variant="primary" icon={ChevronRight} iconPosition="right">
  Next Step
</Button>

// Different sizes
<Button variant="primary" size="small">Small</Button>
<Button variant="primary" size="medium">Medium</Button>
<Button variant="primary" size="large">Large</Button>

// Destructive action
<Button variant="destructive" icon={Trash2}>
  Delete Project
</Button>

// Loading state
<Button variant="primary" isLoading>
  Saving...
</Button>

// Disabled
<Button variant="primary" disabled>
  Disabled Button
</Button>
```

**Icon-Only Button:**

```tsx
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  'aria-label': string; // Required for accessibility
  variant?: 'default' | 'primary' | 'danger';
  size?: number;
}

export function IconButton({
  icon: Icon,
  'aria-label': ariaLabel,
  variant = 'default',
  size = 20,
  className = '',
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: 'hover:bg-secondary-gray-light text-neutral-gray hover:text-primary-black',
    primary: 'hover:bg-blue-50 text-secondary-blue',
    danger: 'hover:bg-red-50 text-error-red',
  };
  
  return (
    <button
      aria-label={ariaLabel}
      className={`w-10 h-10 inline-flex items-center justify-center rounded-md transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <Icon size={size} />
    </button>
  );
}

// Usage
<IconButton icon={Settings} aria-label="Open settings" />
<IconButton icon={Trash2} aria-label="Delete item" variant="danger" />
```

**Button Group:**

```tsx
interface ButtonGroupProps {
  children: ReactNode;
}

export function ButtonGroup({ children }: ButtonGroupProps) {
  return (
    <div className="inline-flex rounded-lg border border-secondary-gray-light">
      {children}
    </div>
  );
}

// Usage
<ButtonGroup>
  <button className="px-4 py-2 border-r border-secondary-gray-light hover:bg-secondary-gray-light">
    Left
  </button>
  <button className="px-4 py-2 border-r border-secondary-gray-light hover:bg-secondary-gray-light">
    Middle
  </button>
  <button className="px-4 py-2 hover:bg-secondary-gray-light">
    Right
  </button>
</ButtonGroup>
```

**Tailwind Classes Reference:**

- **Primary**: `bg-primary-black text-primary-white hover:opacity-90`
- **Secondary**: `border border-primary-black bg-transparent hover:bg-secondary-gray-light`
- **Accent**: `bg-secondary-blue text-white hover:bg-blue-600`
- **Destructive**: `bg-error-red text-white hover:bg-red-600`
- **Text**: `text-secondary-blue hover:underline`
- **Sizes**: `h-9` (small), `h-11` (medium), `h-[52px]` (large)
- **Padding**: `px-4` (small), `px-5` (medium), `px-6` (large)

### Cards (React + TypeScript + Tailwind)

**Standard Card Component:**

```tsx
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'standard' | 'stat' | 'category';
  className?: string;
  hover?: boolean;
}

export function Card({ 
  children, 
  variant = 'standard', 
  className = '',
  hover = false 
}: CardProps) {
  const baseClasses = 'bg-white rounded-xl';
  
  const variantClasses = {
    standard: 'shadow-card p-6 border border-secondary-gray-light',
    stat: 'shadow-stat-card p-5 rounded-2xl',
    category: 'shadow-card p-8 rounded-2xl',
  };
  
  const hoverClass = hover ? 'hover:shadow-card-hover transition-shadow duration-250' : '';
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
```

**Usage Examples:**

```tsx
// Standard card
<Card variant="standard">
  <h3 className="text-h3 text-primary-black mb-2">Card Title</h3>
  <p className="text-body text-secondary-gray-medium">Card content goes here</p>
</Card>

// Stat card with hover
<Card variant="stat" hover>
  <div className="flex flex-col gap-2">
    <span className="text-caption text-secondary-gray-medium uppercase tracking-wider">
      TOTAL USERS
    </span>
    <span className="text-stat-large text-primary-black">
      1,284
    </span>
  </div>
</Card>

// Category progress card
<Card variant="category">
  <div className="flex items-center gap-8">
    <div className="donut-chart">
      {/* Donut chart component */}
    </div>
    <div className="flex-1">
      <h3 className="text-h3 text-primary-black mb-1">HOTO Category</h3>
      <p className="text-body-small text-secondary-gray-medium">Progress tracking</p>
    </div>
  </div>
</Card>
```

**Tailwind Classes:**
- **Standard**: `bg-white rounded-xl shadow-card p-6 border border-secondary-gray-light`
- **Stat**: `bg-white rounded-2xl shadow-stat-card p-5`
- **Hover**: `hover:shadow-card-hover transition-shadow duration-250`

### Inputs (React + TypeScript + Tailwind)

**Text Input Component:**

```tsx
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-body-small font-medium text-primary-black">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            h-12 px-4 rounded-lg border
            ${error ? 'border-error-red' : 'border-neutral-gray'}
            ${error ? 'focus:border-error-red' : 'focus:border-secondary-blue'}
            focus:border-2 focus:outline-none
            text-body text-primary-black
            placeholder:text-neutral-gray
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-body-small text-error-red">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-body-small text-secondary-gray-medium">{helperText}</span>
        )}
      </div>
    );
  }
);
```

**Textarea Component:**

```tsx
import { type TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextareaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextareaElement, TextareaProps>(
  ({ label, error, maxLength, showCount, className = '', value, ...props }, ref) => {
    const currentLength = value?.toString().length || 0;
    
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-body-small font-medium text-primary-black">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          maxLength={maxLength}
          value={value}
          className={`
            min-h-24 max-h-96 px-4 py-3 rounded-lg border
            ${error ? 'border-error-red' : 'border-neutral-gray'}
            ${error ? 'focus:border-error-red' : 'focus:border-secondary-blue'}
            focus:border-2 focus:outline-none
            text-body text-primary-black
            placeholder:text-neutral-gray
            resize-y
            ${className}
          `}
          {...props}
        />
        <div className="flex justify-between items-center">
          {error && (
            <span className="text-body-small text-error-red">{error}</span>
          )}
          {showCount && maxLength && (
            <span className={`text-body-small ml-auto ${
              currentLength >= maxLength ? 'text-error-red' : 'text-secondary-gray-medium'
            }`}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);
```

**Usage Examples:**

```tsx
// Basic input
<Input 
  label="Email" 
  type="email" 
  placeholder="you@example.com"
/>

// Input with error
<Input 
  label="Password" 
  type="password" 
  error="Password must be at least 8 characters"
/>

// Input with helper text
<Input 
  label="Username" 
  helperText="Choose a unique username"
/>

// Textarea with character count
<Textarea 
  label="Description" 
  maxLength={500} 
  showCount 
  placeholder="Enter description..."
/>

// Disabled input
<Input 
  label="Locked Field" 
  disabled 
  value="Cannot edit"
/>
```

**Tailwind Classes:**
- **Base**: `h-12 px-4 rounded-lg border border-neutral-gray`
- **Focus**: `focus:border-2 focus:border-secondary-blue focus:outline-none`
- **Error**: `border-error-red focus:border-error-red`
- **Disabled**: `opacity-50 cursor-not-allowed`

### Icons
- **Sizes**: 16px (inline), 20px (standard), 24px (navigation), 32px (features)
- **Style**: Outline/line icons (2px stroke), filled only for active nav
- **Colors**: Black/blue (active), gray (inactive), white (dark bg)

## Spacing System (4px Grid)
Use multiples of 4px for all spacing: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px

## Layout Grid
- **Desktop (1440px+)**: 240px sidebar, 48px content padding, 1200px max width, 12 columns, 24px gutter
- **Tablet (768-1439px)**: 64px collapsible sidebar, 32px padding, 8 columns, 20px gutter
- **Mobile (<768px)**: Hidden sidebar, 16px padding, 4 columns, 16px gutter

## Animation & Motion

### Timing Functions
- **Standard**: `cubic-bezier(0.0, 0.0, 0.2, 1)` 200ms - Hovers, focus, simple changes
- **Emphasis Spring**: `cubic-bezier(0.34, 1.56, 0.64, 1)` 300ms - Modals, dropdowns
- **Smooth**: `cubic-bezier(0.4, 0.0, 0.2, 1)` 250ms - Page transitions, sidebar
- **Quick Snap**: `cubic-bezier(0.4, 0.0, 1, 1)` 150ms - Toggles, micro-interactions

### Common Patterns
- Button hover: Scale 1.02, opacity 0.9, 200ms
- Card hover: Elevate shadow, 250ms
- Modal: Fade + scale 0.95→1.0, 300ms spring
- Dropdown: Fade + slide down 8px, 200ms

## Interaction States
- **Hover**: Opacity 90% or darken 10%, elevate shadows on cards, underline links
- **Active**: Scale 0.98, opacity 0.85, 100ms
- **Focus**: 2px blue outline (#3B82F6), 2px offset
- **Disabled**: 50% opacity, not-allowed cursor

## Accessibility (WCAG 2.1 AA Minimum)
- Normal text: 4.5:1 contrast
- Large text (18px+): 3:1 contrast
- Interactive elements: 3:1 against background
- Keyboard navigation: All interactive elements, visible focus (2px blue outline)
- Touch targets: 44px minimum (mobile), 8px spacing
- Semantic HTML: nav, main, section, article
- ARIA: Labels for icon buttons, live regions for updates, alt text for images

## Dark Mode
When implementing dark mode:
- Background Primary: #0A0A0A, Secondary: #1A1A1A, Tertiary: #2D2D2D
- Text Primary: #FFFFFF, Secondary: #A0A0A0, Tertiary: #6B6B6B
- Borders: #2D2D2D (default), #404040 (emphasis)
- Replace shadows with subtle 1px borders
- Elevated cards: 0px 4px 12px rgba(0,0,0,0.4)
- Increase chart stroke width by 1px
- Brighten accent colors by 10% lightness

## Implementation Notes

### CSS Variables Pattern
Store all tokens as CSS variables:

```css
:root {
  --color-primary-black: #1A1A1A;
  --color-secondary-blue: #3B82F6;
  --spacing-md: 16px;
  --font-size-body: 14px;
  --border-radius-default: 8px;
  --transition-standard: 200ms cubic-bezier(0.0, 0.0, 0.2, 1);
}
```

### Component Library Approach
- Use atomic design methodology (atoms → molecules → organisms)
- Test with axe-core for accessibility
- Lazy load heavy components (charts, dashboards)
- Use CSS transforms for GPU-accelerated animations
- Implement skeleton screens for loading states
- Debounce search/filters at 300ms

## Specialized Components

For detailed specifications on all component types, see the references folder:

### Core Components
- **Form Controls**: `references/form-controls.md` - Toggles, checkboxes, radio buttons, sliders, selects, file uploads, date pickers, textareas
- **Feedback Components**: `references/feedback-components.md` - Modals, toasts, alerts, tooltips, popovers, spinners, progress bars, skeletons, empty states, badges
- **Navigation Components**: `references/navigation-components.md` - Tabs, breadcrumbs, pagination, steppers, accordions, menus, links

### Domain-Specific Components
- **Navigation Sidebar**: `references/navigation.md` - App sidebar with project status
- **Dashboard KPIs**: `references/dashboards.md` - Stat cards and metrics
- **Data Tables**: `references/tables.md` - Interactive data tables
- **Status Badges**: `references/status-badges.md` - Workflow status indicators
- **Progress Charts**: `references/charts.md` - Donut charts for category progress
