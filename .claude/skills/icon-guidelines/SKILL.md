---
name: icon-guidelines
description: Enforce professional icon usage with Lucide React in TypeScript applications. Use this skill when building any UI components, interfaces, or code to ensure icons follow design principles, prevent emoji usage, and maintain consistency. Always use Lucide React icons with proper TypeScript types instead of emojis, unicode characters, or text-based decorations.
---

# Icon & Visual Design Guidelines (TypeScript + React)

## Tech Stack Requirements

**All code must be:**
- ✅ TypeScript (.tsx files)
- ✅ React functional components
- ✅ Fully typed with proper interfaces
- ✅ Using Lucide React icons

## Critical Rule: NO EMOJIS IN CODE OR UI

**NEVER use emojis in:**
- ❌ UI components or user-facing interfaces
- ❌ Code comments or documentation
- ❌ Button labels, headers, or any visible text
- ❌ Loading states, success messages, or notifications
- ❌ Console logs or error messages
- ❌ File names, variable names, or code structure

**Why no emojis:**
- Inconsistent rendering across platforms (Windows, Mac, Linux, mobile)
- Accessibility issues for screen readers
- Unprofessional appearance in production applications
- Font fallback problems
- Size and alignment inconsistencies
- Poor legibility at small sizes
- Breaks design system consistency

**Always use Lucide React icons instead.**

## Lucide React - The Only Icon Library

### Installation

```bash
npm install lucide-react
# or
yarn add lucide-react
# or
pnpm add lucide-react
```

### Basic Usage (TypeScript)

```tsx
import { Camera, User, Settings, Home } from 'lucide-react';

function MyComponent() {
  return (
    <div>
      <Home size={24} color="#1A1A1A" />
      <User size={20} strokeWidth={2} />
      <Settings className="icon-settings" />
    </div>
  );
}

export default MyComponent;
```

### With TypeScript Props

```tsx
import { type LucideIcon } from 'lucide-react';
import { Camera, User } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  onClick?: () => void;
}

function IconButton({ icon: Icon, size = 20, color, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} className="icon-button">
      <Icon size={size} color={color} />
    </button>
  );
}

// Usage
<IconButton icon={Camera} size={24} onClick={() => console.log('clicked')} />
```

### Core Props

- `size`: Number or string (default: 24) - Controls width and height
- `color`: String (default: "currentColor") - Icon color
- `strokeWidth`: Number (default: 2) - Stroke thickness
- `absoluteStrokeWidth`: Boolean - Makes stroke width absolute
- `className`: String - CSS class for styling
- All standard SVG attributes are supported

### Standard Sizes

Always use these predefined sizes from the UI guidelines:
- **16px**: Inline with text, small indicators
- **20px**: Standard buttons, form inputs, table cells
- **24px**: Navigation, headers, prominent UI elements
- **32px**: Feature icons, dashboard cards, hero sections

```tsx
import { FileText, Download, Menu, Rocket } from 'lucide-react';

function SizeExamples() {
  return (
    <>
      <FileText size={16} />  {/* Inline with body text */}
      <Download size={20} />  {/* In a button */}
      <Menu size={24} />      {/* Navigation header */}
      <Rocket size={32} />    {/* Dashboard feature card */}
    </>
  );
}
```

### Color Usage

Follow the UI guidelines color system:

```tsx
import { CheckCircle, XCircle, AlertTriangle, Info, Search, User, Mail, Home, Settings } from 'lucide-react';

function ColorExamples() {
  return (
    <div>
      {/* Semantic colors */}
      <CheckCircle size={20} color="#10B981" />     {/* Success Green */}
      <XCircle size={20} color="#EF4444" />         {/* Error Red */}
      <AlertTriangle size={20} color="#F59E0B" />   {/* Warning Amber */}
      <Info size={20} color="#3B82F6" />            {/* Info Blue */}

      {/* Neutral colors */}
      <Search size={20} color="#6B7280" />          {/* Neutral Gray (inactive) */}
      <User size={20} color="#1A1A1A" />            {/* Primary Black (active) */}
      <Mail size={20} color="#3B82F6" />            {/* Secondary Blue (interactive) */}

      {/* Using CSS variables (recommended) */}
      <Home size={24} className="text-primary-black" />
      <Settings size={20} className="text-secondary-blue" />
    </div>
  );
}
```

### Typed Color Props

```tsx
import { type LucideIcon } from 'lucide-react';

type SemanticColor = 'success' | 'error' | 'warning' | 'info';

interface SemanticIconProps {
  icon: LucideIcon;
  variant: SemanticColor;
  size?: number;
}

const colorMap: Record<SemanticColor, string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

function SemanticIcon({ icon: Icon, variant, size = 20 }: SemanticIconProps) {
  return <Icon size={size} color={colorMap[variant]} />;
}

// Usage
<SemanticIcon icon={CheckCircle} variant="success" />
<SemanticIcon icon={XCircle} variant="error" />
```

### Styling with Tailwind/CSS (TypeScript)

```tsx
import { ChevronDown, Calendar, Trash2 } from 'lucide-react';

function StyledIcons() {
  return (
    <div>
      {/* Tailwind classes */}
      <ChevronDown className="w-5 h-5 text-neutral-gray hover:text-secondary-blue transition-colors" />

      {/* CSS modules */}
      <Calendar className="icon-calendar" />

      {/* Inline styles (avoid if possible) */}
      <Trash2 size={20} style={{ color: '#EF4444' }} />
    </div>
  );
}
```

## Icon Design Principles (from Lucide)

All Lucide icons follow these design rules:

1. **24×24px canvas** - All icons designed on consistent grid
2. **1px padding minimum** - Within the canvas bounds
3. **2px stroke width** - Consistent visual weight (matches UI guidelines)
4. **Round joins & caps** - Smooth, consistent appearance
5. **Centered strokes** - Proper alignment
6. **Similar optical volume** - Visual balance with base shapes
7. **Pixel perfect** - Sharp on low DPI displays

**What this means for you:**
- Icons are visually consistent across the entire library
- They match the 2px stroke width in the UI guidelines
- They're designed to work at standard sizes (16, 20, 24, 32px)
- No need to manually adjust or compensate

## Common Icon Patterns

### Buttons with Icons (TypeScript)

```tsx
import { Settings, Download, ChevronRight, type LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes } from 'react';

// Icon only button
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: number;
  'aria-label': string; // Required for accessibility
}

function IconButton({ icon: Icon, size = 20, 'aria-label': ariaLabel, ...props }: IconButtonProps) {
  return (
    <button className="icon-button" aria-label={ariaLabel} {...props}>
      <Icon size={size} />
    </button>
  );
}

// Icon with label button
interface ButtonWithIconProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

function ButtonWithIcon({ 
  icon: Icon, 
  iconPosition = 'left', 
  children, 
  ...props 
}: ButtonWithIconProps) {
  return (
    <button className="button-primary" {...props}>
      {iconPosition === 'left' && <Icon size={20} />}
      <span>{children}</span>
      {iconPosition === 'right' && <Icon size={20} />}
    </button>
  );
}

// Usage
<IconButton icon={Settings} aria-label="Open settings" />
<ButtonWithIcon icon={Download}>Download Report</ButtonWithIcon>
<ButtonWithIcon icon={ChevronRight} iconPosition="right">Next</ButtonWithIcon>
```

### Form Inputs with Icons (TypeScript)

```tsx
import { Search, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

// Search input component
interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
}

function SearchInput({ onSearch, ...props }: SearchInputProps) {
  return (
    <div className="input-wrapper">
      <Search size={20} className="input-icon-left" />
      <input 
        type="text" 
        placeholder="Search..." 
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    </div>
  );
}

// Password input with toggle
interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

function PasswordInput(props: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="input-wrapper">
      <input type={showPassword ? 'text' : 'password'} {...props} />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="input-icon-right"
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

// Select dropdown
interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

function SelectInput({ options, value, onChange, placeholder }: SelectInputProps) {
  return (
    <div className="select-wrapper">
      <select 
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={20} className="select-icon" />
    </div>
  );
}
```

### Navigation (TypeScript)

```tsx
import { LayoutDashboard, FolderKanban, Settings, Home, ChevronRight, FileText, Code } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

// Sidebar navigation
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
}

interface SidebarNavProps {
  items: NavItem[];
}

function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav>
      {items.map((item) => (
        <a 
          key={item.href}
          href={item.href} 
          className={`nav-item ${item.isActive ? 'active' : ''}`}
        >
          <item.icon size={24} />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// Usage
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isActive: true },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/settings', label: 'Settings', icon: Settings },
];

<SidebarNav items={navItems} />

// Breadcrumbs
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Home size={16} />
      {items.map((item, index) => (
        <div key={index} className="breadcrumb-item">
          <ChevronRight size={16} />
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Tabs
interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <tab.icon size={20} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Usage
const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'code', label: 'Code', icon: Code },
];

<Tabs tabs={tabs} activeTab="overview" onTabChange={(id) => console.log(id)} />
```

### Status & Feedback (TypeScript)

```tsx
import { CheckCircle, XCircle, AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';

// Toast notification component
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  variant: ToastVariant;
  message: string;
  onClose?: () => void;
}

const toastConfig: Record<ToastVariant, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle, className: 'toast-success' },
  error: { icon: XCircle, className: 'toast-error' },
  warning: { icon: AlertTriangle, className: 'toast-warning' },
  info: { icon: CheckCircle, className: 'toast-info' },
};

function Toast({ variant, message, onClose }: ToastProps) {
  const { icon: Icon, className } = toastConfig[variant];
  
  return (
    <div className={`toast ${className}`}>
      <Icon size={20} />
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Close">
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}

// Usage
<Toast variant="success" message="Changes saved successfully" />
<Toast variant="error" message="Failed to save changes" />

// Alert banner
interface AlertProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  onClose?: () => void;
}

function Alert({ variant, title, description, onClose }: AlertProps) {
  const icons: Record<typeof variant, LucideIcon> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: CheckCircle,
  };
  
  const Icon = icons[variant];
  
  return (
    <div className={`alert alert-${variant}`}>
      <Icon size={20} />
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Close alert">
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}

// Empty state
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon size={48} className="empty-icon" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}

// Usage
<EmptyState 
  icon={Inbox}
  title="No messages"
  description="Your inbox is empty"
  action={{ label: 'Compose', onClick: () => console.log('compose') }}
/>
```

### Loading States (TypeScript)

```tsx
import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes } from 'react';

// Spinner icon (animated with CSS)
interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  children: React.ReactNode;
}

function LoadingButton({ isLoading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <button disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 size={20} className="animate-spin" />}
      <span>{children}</span>
    </button>
  );
}

// Usage
<LoadingButton isLoading={true}>Loading...</LoadingButton>

// Standalone loading indicator
interface LoadingProps {
  size?: number;
  message?: string;
}

function Loading({ size = 24, message }: LoadingProps) {
  return (
    <div className="loading">
      <Loader2 size={size} className="animate-spin" />
      {message && <span>{message}</span>}
    </div>
  );
}

// ❌ BAD: Never use emojis for loading
// <div>⏳ Loading...</div>

// ✅ GOOD: Use Lucide icon
<Loading message="Loading..." />
```

### Tailwind Animation (add to tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      animation: {
        spin: 'spin 1s linear infinite',
      },
    },
  },
};

export default config;
```

### Data Tables (TypeScript)

```tsx
import { Edit, Trash2, MoreVertical, ChevronUp, ChevronDown, type LucideIcon } from 'lucide-react';

// Action buttons in tables
interface TableAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface TableRowProps {
  id: string;
  name: string;
  actions: TableAction[];
}

function TableRow({ id, name, actions }: TableRowProps) {
  return (
    <tr>
      <td>{name}</td>
      <td className="actions">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            aria-label={action.label}
            className={action.variant === 'danger' ? 'action-danger' : ''}
          >
            <action.icon size={16} />
          </button>
        ))}
      </td>
    </tr>
  );
}

// Usage
const actions: TableAction[] = [
  { icon: Edit, label: 'Edit project', onClick: () => console.log('edit') },
  { icon: Trash2, label: 'Delete project', onClick: () => console.log('delete'), variant: 'danger' },
  { icon: MoreVertical, label: 'More options', onClick: () => console.log('more') },
];

<TableRow id="1" name="Project Alpha" actions={actions} />

// Sortable table header
interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort: (key: string) => void;
}

function SortableHeader({ label, sortKey, currentSort, onSort }: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const Icon = isActive && currentSort.direction === 'asc' ? ChevronUp : ChevronDown;
  
  return (
    <th>
      <button onClick={() => onSort(sortKey)} className="sort-button">
        {label}
        <Icon size={16} className={`sort-icon ${isActive ? 'active' : ''}`} />
      </button>
    </th>
  );
}
```

## Icon Selection Guide

### Use Semantic Icons

Choose icons that clearly represent their function:

```jsx
// ✅ GOOD - Clear semantic meaning
<button><Download size={20} /> Download</button>
<button><Trash2 size={20} /> Delete</button>
<button><Plus size={20} /> Add New</button>

// ❌ BAD - Unclear or generic
<button><Circle size={20} /> Download</button>
<button><Square size={20} /> Delete</button>
```

### Common Icon Mappings

See `references/icon-mappings.md` for comprehensive list of recommended icons for common actions.

## Dynamic Icons (TypeScript - When Needed)

For rare cases where icon name is dynamic:

```tsx
import { icons, type LucideIcon } from 'lucide-react';

interface DynamicIconProps {
  name: keyof typeof icons;
  size?: number;
  color?: string;
  className?: string;
}

function DynamicIcon({ name, size = 24, color, className }: DynamicIconProps) {
  const LucideIcon = icons[name] as LucideIcon;
  
  if (!LucideIcon) {
    console.error(`Icon "${name}" not found`);
    return null;
  }
  
  return <LucideIcon size={size} color={color} className={className} />;
}

// Usage with type safety
<DynamicIcon name="Camera" size={20} />
<DynamicIcon name="User" size={24} className="text-primary-black" />

// Type-safe icon mapping
type IconName = 'home' | 'user' | 'settings';

const iconMap: Record<IconName, LucideIcon> = {
  home: icons.Home,
  user: icons.User,
  settings: icons.Settings,
} as const;

interface MappedIconProps {
  name: IconName;
  size?: number;
}

function MappedIcon({ name, size = 24 }: MappedIconProps) {
  const Icon = iconMap[name];
  return <Icon size={size} />;
}
```

**Note:** Prefer direct imports for better tree-shaking and type safety. Only use dynamic icons when absolutely necessary.

## Accessibility (TypeScript)

### Always Include Proper ARIA Labels

```tsx
import { X, Edit, Download, CheckCircle } from 'lucide-react';

// Icon-only buttons MUST have aria-label
function IconOnlyButtons() {
  return (
    <>
      <button aria-label="Close dialog">
        <X size={20} />
      </button>

      <button aria-label="Edit profile">
        <Edit size={20} />
      </button>
    </>
  );
}

// Icons with text labels don't need aria-label
function ButtonWithText() {
  return (
    <button>
      <Download size={20} />
      <span>Download</span>
    </button>
  );
}

// Decorative icons should be hidden from screen readers
function DecorativeIcon() {
  return (
    <div>
      <CheckCircle size={16} aria-hidden="true" />
      <span>Success</span>
    </div>
  );
}

// Type-safe icon button component
interface AccessibleIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  'aria-label': string; // Required!
  size?: number;
}

function AccessibleIconButton({ 
  icon: Icon, 
  'aria-label': ariaLabel, 
  size = 20,
  ...props 
}: AccessibleIconButtonProps) {
  return (
    <button aria-label={ariaLabel} {...props}>
      <Icon size={size} />
    </button>
  );
}
```

### Focus States

Ensure icon buttons have visible focus indicators:

```jsx
// CSS for focus state
.icon-button:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 6px;
}
```

## Performance Best Practices (TypeScript)

### Tree Shaking

Import only the icons you use:

```tsx
// ✅ GOOD - Tree-shakeable
import { Camera, User, Settings } from 'lucide-react';

// ❌ BAD - Imports entire library
import * as Icons from 'lucide-react';
```

### Reusable Icon Components

Create wrapper components for commonly used icon patterns:

```tsx
// components/IconButton.tsx
import { type LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: number;
  variant?: 'default' | 'primary' | 'danger';
}

export function IconButton({ 
  icon: Icon, 
  label, 
  size = 20,
  variant = 'default',
  className = '',
  ...props 
}: IconButtonProps) {
  return (
    <button 
      aria-label={label}
      className={`icon-button icon-button-${variant} ${className}`}
      {...props}
    >
      <Icon size={size} />
    </button>
  );
}

// Usage
import { Trash2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

<IconButton 
  icon={Trash2} 
  label="Delete item" 
  variant="danger"
  onClick={handleDelete} 
/>

// Generic icon wrapper with consistent styling
interface IconProps {
  icon: LucideIcon;
  size?: 16 | 20 | 24 | 32;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  className?: string;
}

const variantColors: Record<NonNullable<IconProps['variant']>, string> = {
  primary: '#1A1A1A',
  secondary: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export function Icon({ icon: IconComponent, size = 20, variant = 'primary', className = '' }: IconProps) {
  return (
    <IconComponent 
      size={size} 
      color={variantColors[variant]}
      className={className}
    />
  );
}
```

## Migration from Emojis (TypeScript)

### Common Emoji → Icon Replacements

```tsx
import {
  CheckCircle, Check, XCircle, X, AlertTriangle, Info,
  Folder, FileText, Search, Settings, BarChart, TrendingUp,
  Save, Trash2, Edit, User, Home, Mail, Bell, Star, Heart,
  Calendar, Clock, Link, Download, Upload, Lock, Unlock
} from 'lucide-react';

// ❌ Emojis to remove → ✅ Lucide icons to use

// Success/Error
"✅" → <CheckCircle /> or <Check />
"❌" → <XCircle /> or <X />
"⚠️" → <AlertTriangle />
"ℹ️" → <Info />

// Files/Documents
"📁" → <Folder />
"📄" → <FileText />
"🔍" → <Search />
"⚙️" → <Settings />

// Charts/Data
"📊" → <BarChart />
"📈" → <TrendingUp />

// Actions
"💾" → <Save />
"🗑️" → <Trash2 />
"✏️" → <Edit />

// User/Social
"👤" → <User />
"🏠" → <Home />
"📧" → <Mail />
"🔔" → <Bell />
"⭐" → <Star />
"❤️" → <Heart />

// Time/Date
"📅" → <Calendar />
"⏰" → <Clock />

// Links/Transfer
"🔗" → <Link />
"📥" → <Download />
"📤" → <Upload />

// Security
"🔒" → <Lock />
"🔓" → <Unlock />

// Example: Before and After
// ❌ BEFORE (Bad - Using emojis)
function OldNotification() {
  return (
    <div className="notification">
      ✅ Success! Your changes were saved
    </div>
  );
}

// ✅ AFTER (Good - Using Lucide icons)
function NewNotification() {
  return (
    <div className="notification">
      <CheckCircle size={20} color="#10B981" />
      <span>Success! Your changes were saved</span>
    </div>
  );
}
```

## References

For more detailed icon usage patterns, see:
- `references/icon-mappings.md` - Comprehensive action → icon mappings
- `references/icon-examples.md` - Real-world component examples
