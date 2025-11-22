# Progress Donut Chart Specifications

## Dimensions
- **Outer Diameter**: 120px
- **Stroke Width**: 12px
- **Inner Circle Diameter**: 96px (for center label area)
- **View Box**: "0 0 120 120" for SVG

## Colors by Category
- **HOTO**: Accent Orange (#F97316)
- **OMM**: Accent Teal (#14B8A6)
- **GDL**: Accent Navy Blue (#1E40AF)
- **CAD**: Accent Yellow (#FBBF24)
- **Background Track**: Secondary Gray Light (#E2E8F0)

## Center Label
- **Percentage**: 24px Bold, Primary Black (#1A1A1A)
- **"Complete" Text**: 10px Medium, Secondary Gray Medium (#4A5568)
- **Text Transform**: Uppercase for "COMPLETE"
- **Alignment**: Center, vertically and horizontally

## SVG Structure
```svg
<svg viewBox="0 0 120 120" width="120" height="120">
  <!-- Background circle -->
  <circle
    cx="60"
    cy="60"
    r="54"
    fill="none"
    stroke="#E2E8F0"
    stroke-width="12"
  />
  <!-- Progress circle -->
  <circle
    cx="60"
    cy="60"
    r="54"
    fill="none"
    stroke="#F97316"
    stroke-width="12"
    stroke-dasharray="339.29" <!-- 2 * PI * 54 -->
    stroke-dashoffset="135.72" <!-- Based on percentage -->
    transform="rotate(-90 60 60)"
    stroke-linecap="round"
  />
  <!-- Center text -->
  <text x="60" y="55" text-anchor="middle" class="percentage">58%</text>
  <text x="60" y="70" text-anchor="middle" class="label">COMPLETE</text>
</svg>
```

## Animation
- **Duration**: 800ms ease-out
- **Property**: stroke-dashoffset
- **Effect**: Animate from full (339.29) to calculated value on load
- **Timing**: cubic-bezier(0.0, 0.0, 0.2, 1)

## Card Integration
When used in Category Progress Cards:
- **Card Background**: White (#FFFFFF)
- **Card Shadow**: 0px 2px 8px rgba(0, 0, 0, 0.06)
- **Card Radius**: 16px
- **Card Padding**: 32px
- **Chart Position**: Center or left-aligned
- **Additional Stats**: Display below or to the right of chart

## Calculation
```javascript
const circumference = 2 * Math.PI * 54; // 339.29
const offset = circumference - (percentage / 100) * circumference;
```

## Accessibility
- Include `aria-label` describing the progress (e.g., "HOTO category 58% complete")
- Provide text alternative for screen readers
- Ensure sufficient color contrast for center text
