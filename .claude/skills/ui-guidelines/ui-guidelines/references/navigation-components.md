# Navigation Components Specifications

## Tabs

### Horizontal Tabs (Default)

**Container**:
- **Border Bottom**: 2px solid Secondary Gray Light (#E2E8F0)
- **Height**: 48px
- **Display**: Flex, align items center

**Tab Item**:
- **Padding**: 12px 20px
- **Font**: 14px Medium, Secondary Gray Medium (#4A5568)
- **Min Width**: 80px
- **Height**: 48px
- **Position**: Relative
- **Cursor**: Pointer

**Tab Hover** (inactive):
- **Background**: rgba(59, 130, 246, 0.05)
- **Text Color**: Primary Black (#1A1A1A)

**Tab Active**:
- **Font**: 14px Semibold, Primary Black (#1A1A1A)
- **Border Bottom**: 3px solid Secondary Blue (#3B82F6)
- **Margin Bottom**: -2px (to overlap container border)

**Tab Disabled**:
- **Text Color**: Neutral Gray (#6B7280) at 50% opacity
- **Cursor**: not-allowed
- **No hover effect**

**With Icons**:
- Icon: 20px, left of text, 8px gap
- Icon color matches text color

**With Badges**:
- Badge: Right of text, 8px gap
- Badge: 20px height, 4px 8px padding

### Vertical Tabs

**Container**:
- **Width**: 200px
- **Border Right**: 1px solid Secondary Gray Light (#E2E8F0)

**Tab Item**:
- **Padding**: 12px 16px
- **Font**: 14px Medium
- **Full Width**: 100%
- **Text Align**: Left

**Tab Active**:
- **Border Left**: 3px solid Secondary Blue (#3B82F6)
- **Background**: rgba(59, 130, 246, 0.05)
- **Padding Left**: 13px (to account for border)

### Pill Tabs

**Tab Item**:
- **Padding**: 8px 16px
- **Corner Radius**: 6px
- **No bottom border on container**
- **Gap**: 8px between tabs

**Tab Active**:
- **Background**: Secondary Blue (#3B82F6)
- **Text**: White (#FFFFFF)
- **No border**

**Tab Hover** (inactive):
- **Background**: Secondary Gray Light (#E2E8F0)

### Segmented Control (Tight Pills)

**Container**:
- **Background**: Background Secondary (#F5F5F5)
- **Padding**: 4px
- **Corner Radius**: 8px
- **Display**: Inline-flex
- **Gap**: 4px

**Segment Item**:
- **Padding**: 8px 16px
- **Corner Radius**: 6px
- **Font**: 14px Medium
- **Transition**: 150ms

**Segment Active**:
- **Background**: White (#FFFFFF)
- **Shadow**: 0px 1px 2px rgba(0, 0, 0, 0.1)
- **Font**: 14px Semibold

## Breadcrumbs

### Structure
- **Display**: Flex, align items center
- **Gap**: 8px
- **Wrap**: Wrap for long paths

### Breadcrumb Item
- **Font**: 14px Regular, Secondary Gray Medium (#4A5568)
- **Max Width**: 200px (truncate with ellipsis)
- **Hover**: Text color Secondary Blue (#3B82F6), underline

### Current/Last Item
- **Font**: 14px Semibold, Primary Black (#1A1A1A)
- **No hover effect**
- **Not clickable**

### Separator
- **Icon**: Chevron right, 16px
- **Color**: Neutral Gray (#6B7280)
- **Margin**: 0 8px

### With Icons
- **Home Icon**: First item can be just icon (20px)
- **Folder Icons**: Optional before each item (16px)

### Collapsed Breadcrumbs
When too many items:
- Show: First item > ... > Last 2 items
- "..." is clickable dropdown showing hidden items

### Example Structure
```
Home > Projects > Frontend > Components > Buttons
```

## Pagination

### Standard Pagination

**Container**:
- **Display**: Flex, align items center, justify center
- **Gap**: 8px
- **Padding**: 16px 0

**Page Button**:
- **Size**: 40px × 40px
- **Corner Radius**: 6px
- **Font**: 14px Medium, Primary Black (#1A1A1A)
- **Background**: Transparent
- **Border**: 1px transparent

**Page Button Hover**:
- **Background**: Secondary Gray Light (#E2E8F0)

**Page Button Active** (current page):
- **Background**: Secondary Blue (#3B82F6)
- **Text**: White (#FFFFFF)
- **Font**: 14px Semibold
- **Border**: None

**Previous/Next Buttons**:
- **Width**: Auto (fit content)
- **Padding**: 10px 16px
- **Icon**: Chevron, 20px
- **Text**: "Previous" / "Next" (optional)

**Previous/Next Disabled**:
- **Opacity**: 50%
- **Cursor**: not-allowed
- **No hover effect**

### Compact Pagination

**Structure**: "Page 3 of 10"
- **Font**: 14px Regular
- **Arrows**: Both sides
- **Total Width**: ~180px

### Simple Pagination (Load More)

**Button**:
- **Style**: Secondary Button
- **Text**: "Load More" or "Show More"
- **Width**: Auto or full width
- **Icon**: Chevron down (optional)

### Infinite Scroll Indicator

**Spinner**:
- **Position**: Bottom center
- **Size**: 32px
- **Color**: Secondary Blue (#3B82F6)
- **Margin**: 32px 0

## Stepper / Progress Indicator

### Horizontal Stepper

**Container**:
- **Display**: Flex, align items center, justify space-between
- **Width**: 100%
- **Max Width**: 800px

**Step Item**:
- **Display**: Flex, flex direction column, align items center
- **Gap**: 8px

**Step Circle**:
- **Size**: 40px × 40px
- **Corner Radius**: 50%
- **Border**: 2px solid Secondary Gray Light (#E2E8F0)
- **Background**: White (#FFFFFF)
- **Font**: 16px Semibold, Neutral Gray (#6B7280)

**Step Circle - Active**:
- **Border**: 2px solid Secondary Blue (#3B82F6)
- **Background**: Secondary Blue (#3B82F6)
- **Text**: White (#FFFFFF)
- **Icon**: Optional (instead of number)

**Step Circle - Completed**:
- **Border**: 2px solid Success Green (#10B981)
- **Background**: Success Green (#10B981)
- **Icon**: Check mark (20px), White

**Step Circle - Error**:
- **Border**: 2px solid Error Red (#EF4444)
- **Background**: Error Red (#EF4444)
- **Icon**: X mark (20px), White

**Step Label**:
- **Font**: 12px Medium, Secondary Gray Medium (#4A5568)
- **Active**: 12px Semibold, Primary Black (#1A1A1A)
- **Max Width**: 100px
- **Text Align**: Center

**Step Description** (optional):
- **Font**: 11px Regular, Neutral Gray (#6B7280)
- **Max Width**: 120px

**Connector Line**:
- **Height**: 2px
- **Background**: Secondary Gray Light (#E2E8F0)
- **Completed**: Success Green (#10B981)
- **Position**: Between circles, flex grow
- **Max Width**: 120px

### Vertical Stepper

**Step Circle**:
- **Left-aligned**
- **Connector**: Vertical line, left side

**Step Content**:
- **Left margin**: 56px (circle + gap)
- **Padding bottom**: 24px

## Accordion

### Accordion Item

**Header**:
- **Height**: 56px
- **Padding**: 16px 20px
- **Background**: White (#FFFFFF)
- **Border**: 1px solid Secondary Gray Light (#E2E8F0)
- **Border Radius**: 8px (when collapsed)
- **Cursor**: Pointer
- **Display**: Flex, justify space-between, align items center

**Header Hover**:
- **Background**: rgba(59, 130, 246, 0.02)

**Header Title**:
- **Font**: 16px Semibold, Primary Black (#1A1A1A)

**Header Icon**:
- **Icon**: Chevron down, 20px, Neutral Gray (#6B7280)
- **Rotate**: 180deg when expanded
- **Transition**: 200ms

**Content Panel**:
- **Padding**: 20px
- **Background**: White (#FFFFFF)
- **Border**: 1px solid Secondary Gray Light (#E2E8F0) (left, right, bottom)
- **Border Top**: None
- **Border Radius**: 0 0 8px 8px
- **Animation**: Slide down + fade in, 200ms ease-out

**Collapsed State**:
- **Content Height**: 0
- **Overflow**: Hidden
- **Padding**: 0 20px (horizontal only)

### Accordion Group

**Spacing**: 8px between items

**Single Expand** (default):
- Only one item open at a time
- Opening another closes the current

**Multi Expand**:
- Multiple items can be open
- Each toggles independently

## Menu / Dropdown Menu

### Trigger Button
- **Style**: Any button variant
- **Icon**: Chevron down or menu icon (20px)
- **Active State**: Keep active styling while menu is open

### Menu Container
- **Min Width**: 200px
- **Max Width**: 320px
- **Max Height**: 400px (scrollable)
- **Background**: White (#FFFFFF)
- **Border**: 1px Secondary Gray Light (#E2E8F0)
- **Corner Radius**: 8px
- **Shadow**: 0px 4px 12px rgba(0, 0, 0, 0.1)
- **Padding**: 8px 0
- **Z-Index**: 1500

### Menu Item
- **Height**: 40px
- **Padding**: 10px 16px
- **Font**: 14px Regular, Primary Black (#1A1A1A)
- **Display**: Flex, align items center
- **Gap**: 12px (icon to text)

**Menu Item Hover**:
- **Background**: rgba(59, 130, 246, 0.05)
- **Cursor**: Pointer

**Menu Item Active** (selected):
- **Background**: rgba(59, 130, 246, 0.1)
- **Font**: 14px Semibold

**Menu Item Disabled**:
- **Opacity**: 50%
- **Cursor**: not-allowed

**Menu Item Icon**:
- **Size**: 20px
- **Color**: Neutral Gray (#6B7280) or semantic color

**Menu Item Shortcut**:
- **Font**: 12px Regular, Neutral Gray (#6B7280)
- **Position**: Right side
- **Example**: "⌘K", "Ctrl+S"

### Menu Divider
- **Height**: 1px
- **Background**: Secondary Gray Light (#E2E8F0)
- **Margin**: 8px 0

### Menu Section Header
- **Padding**: 8px 16px 4px
- **Font**: 11px Semibold, Secondary Gray Medium (#4A5568)
- **Text Transform**: Uppercase
- **Letter Spacing**: 0.5px

### Context Menu (Right-Click)
- **Same styling as dropdown menu**
- **Position**: At cursor location
- **Close**: On click outside or item selection

## Link

### Default Link
- **Font**: 14px Regular (or inherit)
- **Color**: Secondary Blue (#3B82F6)
- **Text Decoration**: None
- **Cursor**: Pointer

**Hover**:
- **Text Decoration**: Underline
- **Color**: Darken 10%

**Active** (clicked):
- **Color**: Darken 20%

**Visited**:
- **Color**: Accent Navy Blue (#1E40AF) (optional)

### Link with Icon
- **Icon**: 16px, inline with text
- **Gap**: 4px
- **Icon Position**: Before or after text
- **External Link**: External link icon (arrow-up-right)

### Disabled Link
- **Color**: Neutral Gray (#6B7280)
- **Cursor**: not-allowed
- **No hover effects**
