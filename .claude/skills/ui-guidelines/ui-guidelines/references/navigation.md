# Navigation Sidebar Specifications

## Dimensions
- **Width (Expanded)**: 240px
- **Width (Collapsed)**: 64px
- **Background**: Secondary Gray Dark (#2D3748)
- **Padding**: 16px vertical, 12px horizontal

## Navigation Items
- **Height**: 44px
- **Padding**: 12px 16px
- **Corner Radius**: 8px
- **Icon**: 24px, White (#FFFFFF)
- **Text**: 14px Medium, White (#FFFFFF)
- **Active State**: Background Primary Black (#1A1A1A)
- **Hover State**: Background rgba(255, 255, 255, 0.1)

## Project Status Badge
- **Background**: Success Green (#10B981) or Neutral Gray (#6B7280)
- **Text**: 11px Medium, White
- **Padding**: 4px 12px
- **Corner Radius**: 12px (pill shape)

## Behavior
- Collapse to icon-only mode on tablet (768-1439px)
- Hide completely on mobile (<768px), replace with hamburger menu
- Smooth transition: 250ms cubic-bezier(0.4, 0.0, 0.2, 1)
