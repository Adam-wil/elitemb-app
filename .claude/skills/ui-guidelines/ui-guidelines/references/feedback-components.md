# Feedback Components Specifications

## Modal / Dialog

### Overlay
- **Background**: rgba(0, 0, 0, 0.5) - Semi-transparent black
- **Z-Index**: 1000
- **Animation**: Fade in 200ms

### Modal Container
- **Max Width**: 600px (small), 800px (medium), 1000px (large)
- **Background**: White (#FFFFFF)
- **Corner Radius**: 16px
- **Shadow**: 0px 20px 60px rgba(0, 0, 0, 0.3)
- **Padding**: 32px
- **Position**: Centered on screen
- **Animation**: Fade + scale from 0.95 to 1.0, 300ms spring

### Modal Header
- **Padding Bottom**: 20px
- **Border Bottom**: 1px solid Secondary Gray Light (#E2E8F0)
- **Title Font**: 24px Bold, Primary Black (#1A1A1A)
- **Close Button**: Top right, 24px icon, hover background rgba(0, 0, 0, 0.05)

### Modal Body
- **Padding**: 24px 0
- **Max Height**: 60vh (scrollable)
- **Font**: 14px Regular, Primary Black (#1A1A1A)
- **Line Height**: 20px

### Modal Footer
- **Padding Top**: 20px
- **Border Top**: 1px solid Secondary Gray Light (#E2E8F0)
- **Button Layout**: Flex, justify right, 12px gap
- **Primary Action**: Right-most button
- **Secondary Action**: Left of primary

### Modal Variants

**Alert Modal**:
- Icon: Warning/Error/Info/Success (32px)
- Icon Colors: Match functional colors
- Icon Position: Left of title or centered above title

**Confirmation Modal**:
- Destructive action uses Error Red button
- Clear "Cancel" and "Confirm" actions

**Form Modal**:
- Form fields follow standard input styling
- Submit button in footer

## Toast Notification

### Dimensions
- **Width**: 360px (desktop), 100% - 32px (mobile)
- **Min Height**: 64px
- **Corner Radius**: 12px
- **Padding**: 16px
- **Position**: Top right corner, 16px from edges (or bottom right)

### Structure
- **Icon**: Left side, 20px
- **Content**: Middle, flexible width
- **Close Button**: Right side, 16px icon (optional)

### Variants

**Success Toast**:
- Background: Success Green (#10B981)
- Text: White (#FFFFFF)
- Icon: Check circle, White

**Error Toast**:
- Background: Error Red (#EF4444)
- Text: White (#FFFFFF)
- Icon: X circle, White

**Warning Toast**:
- Background: Warning Amber (#F59E0B)
- Text: White (#FFFFFF)
- Icon: Alert triangle, White

**Info Toast**:
- Background: Info Blue (#3B82F6)
- Text: White (#FFFFFF)
- Icon: Info circle, White

**Neutral Toast**:
- Background: Primary Black (#1A1A1A)
- Text: White (#FFFFFF)
- Icon: Optional

### Animation
- **Enter**: Slide in from right + fade, 300ms ease-out
- **Exit**: Slide out to right + fade, 200ms ease-in
- **Auto Dismiss**: 5 seconds default (adjustable)
- **Hover**: Pause auto-dismiss timer

### Stacking
- Multiple toasts stack vertically, 8px gap
- Max visible: 3 toasts, older ones fade out
- Queue additional toasts

## Alert / Banner

### Inline Alert
- **Width**: 100% of container
- **Min Height**: 48px
- **Corner Radius**: 8px
- **Padding**: 12px 16px
- **Border**: 1px solid (varies by type)

### Variants

**Success Alert**:
- Background: rgba(16, 185, 129, 0.1)
- Border: 1px Success Green (#10B981)
- Text: Success Green (#10B981) or Primary Black
- Icon: Check circle, Success Green

**Error Alert**:
- Background: rgba(239, 68, 68, 0.1)
- Border: 1px Error Red (#EF4444)
- Text: Error Red (#EF4444) or Primary Black
- Icon: X circle, Error Red

**Warning Alert**:
- Background: rgba(245, 158, 11, 0.1)
- Border: 1px Warning Amber (#F59E0B)
- Text: Warning Amber (#F59E0B) or Primary Black
- Icon: Alert triangle, Warning Amber

**Info Alert**:
- Background: rgba(59, 130, 246, 0.1)
- Border: 1px Info Blue (#3B82F6)
- Text: Info Blue (#3B82F6) or Primary Black
- Icon: Info circle, Info Blue

### Structure
- **Icon**: Left side, 20px, 16px from left edge
- **Title**: 14px Semibold (optional)
- **Description**: 14px Regular
- **Action Button**: Text button, right side (optional)
- **Close Button**: Top right corner, 16px icon (optional)

### Banner Alert (Full Width)
- No border radius
- Fixed to top or bottom of viewport
- Higher z-index (900)
- Dismiss button required

## Tooltip

### Dimensions
- **Max Width**: 240px
- **Padding**: 8px 12px
- **Corner Radius**: 6px
- **Arrow Size**: 6px

### Styling
- **Background**: Primary Black (#1A1A1A)
- **Text**: 12px Regular, White (#FFFFFF)
- **Shadow**: 0px 2px 8px rgba(0, 0, 0, 0.15)
- **Arrow**: Matches background color

### Positions
- Top (default)
- Bottom
- Left
- Right
- Auto (adjust based on viewport)

### Behavior
- **Trigger**: Hover (desktop), tap (mobile)
- **Show Delay**: 200ms
- **Hide Delay**: 0ms (instant on mouse leave)
- **Animation**: Fade in 150ms, slide 4px towards target
- **Z-Index**: 2000

### Variations

**Simple Tooltip**:
- Single line text
- No formatting

**Rich Tooltip**:
- Multiple lines
- Bold text supported
- Small icons (16px)
- Max width: 320px

## Popover

### Dimensions
- **Min Width**: 200px
- **Max Width**: 400px
- **Max Height**: 400px (scrollable)
- **Corner Radius**: 12px
- **Padding**: 16px
- **Arrow Size**: 8px

### Styling
- **Background**: White (#FFFFFF)
- **Border**: 1px Secondary Gray Light (#E2E8F0)
- **Shadow**: 0px 4px 12px rgba(0, 0, 0, 0.1)
- **Arrow**: Matches background and border

### Positions
- Top, Bottom, Left, Right
- Auto-adjust based on viewport

### Behavior
- **Trigger**: Click or hover
- **Close**: Click outside, ESC key, or close button
- **Animation**: Fade + scale from 0.95, 200ms
- **Z-Index**: 1500

### Header (Optional)
- **Title**: 16px Semibold, Primary Black
- **Close Button**: Top right, 20px icon
- **Border Bottom**: 1px Secondary Gray Light
- **Padding**: 12px 16px

### Content
- **Padding**: 16px
- **Font**: 14px Regular
- **Can contain**: Text, lists, buttons, forms

## Loading Spinner

### Sizes
- **Small**: 16px - Inline with text
- **Medium**: 32px - Standard loading indicator
- **Large**: 48px - Page/section loading

### Styling
- **Color**: Secondary Blue (#3B82F6) or context-appropriate
- **Stroke Width**: 3px
- **Animation**: Rotate 360deg, 1s linear infinite

### Variants

**Circular Spinner**:
- SVG circle with rotating animation
- Partial arc (270deg), rotates continuously

**Dots Spinner**:
- 3 dots, 8px diameter
- Sequential bounce animation
- 12px gap between dots

**Bar Spinner**:
- Horizontal bar that fills left to right
- Good for progress indication

### Overlay Spinner
- **Background**: rgba(255, 255, 255, 0.8) or rgba(0, 0, 0, 0.5)
- **Spinner**: Centered in overlay
- **Z-Index**: 1000
- **Covers**: Entire component or page

## Progress Bar

### Dimensions
- **Height**: 8px (thin), 16px (medium), 24px (thick)
- **Width**: 100% of container
- **Corner Radius**: 4px (thin), 8px (medium), 12px (thick)

### Styling
- **Background** (track): Secondary Gray Light (#E2E8F0)
- **Fill**: Secondary Blue (#3B82F6) or context color
- **Animation**: Smooth transition, 300ms ease-out

### Variants

**Determinate** (known progress):
- Fill width represents percentage
- Show percentage text above or inside bar

**Indeterminate** (unknown progress):
- Animated gradient sweep
- Continuous animation, 1.5s duration

**Segmented**:
- Multiple sections with different colors
- Good for multi-step processes

### With Label
- **Position**: Above bar, left-aligned
- **Font**: 12px Medium, Secondary Gray Medium
- **Percentage**: Right-aligned, 14px Semibold

## Skeleton Screen

### Purpose
Loading placeholder that mimics content structure

### Styling
- **Background**: Secondary Gray Light (#E2E8F0)
- **Shimmer**: Linear gradient animation
- **Corner Radius**: Match final content radius
- **Animation**: Shimmer 1.5s linear infinite

### Shimmer Gradient
```css
background: linear-gradient(
  90deg,
  #E2E8F0 0%,
  #F5F5F5 50%,
  #E2E8F0 100%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

### Common Patterns

**Text Line**:
- Height: 16px
- Width: 100% or random (60%-100%)
- Corner Radius: 4px
- Multiple lines: 8px gap

**Card Skeleton**:
- Match card dimensions
- Include placeholders for image, title, text

**Table Skeleton**:
- Header rows: Lighter shimmer
- Data rows: Standard shimmer
- Maintain column structure

## Empty State

### Dimensions
- **Min Height**: 200px
- **Padding**: 48px 24px

### Structure
- **Icon**: 48px, Neutral Gray (#6B7280), centered
- **Title**: 18px Semibold, Primary Black, centered
- **Description**: 14px Regular, Secondary Gray Medium, centered
- **Action Button**: Primary or Secondary, centered below description
- **Spacing**: 16px between elements

### Styling
- **Background**: Optional light background (#FAFAFA)
- **Text Alignment**: Center
- **Max Width**: 400px (centered in container)

### Variants

**No Data**:
- Icon: Database or table icon
- Title: "No data available"
- Action: "Add new item" button

**No Results**:
- Icon: Search icon
- Title: "No results found"
- Description: "Try adjusting your search"

**No Connection**:
- Icon: Wifi off icon
- Title: "No internet connection"
- Action: "Retry" button

## Badge / Chip

### Dimensions
- **Height**: 24px
- **Padding**: 4px 8px
- **Corner Radius**: 12px (pill)
- **Font**: 11px Semibold

### Variants
See `status-badges.md` for status-specific badges

**Count Badge** (notification):
- Size: 20px circle (or 24px × 20px pill for 10+)
- Background: Error Red (#EF4444)
- Text: 10px Bold, White
- Position: Top right of icon (absolute)

**Removable Chip**:
- Add close icon (X), 16px, right side
- Hover: Background darken 10%
- Click area: Entire chip

**Avatar Badge**:
- Size: 16px × 16px
- Border: 2px White
- Colors: Success Green (online), Neutral Gray (offline), Warning Amber (away)
