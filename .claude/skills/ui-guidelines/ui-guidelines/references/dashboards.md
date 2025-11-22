# Dashboard KPI Card Specifications

## Layout
- **Display**: Flex column
- **Align**: Left
- **Gap**: 8px between label and value
- **Background**: White (#FFFFFF)
- **Shadow**: 0px 1px 4px rgba(0, 0, 0, 0.04)
- **Corner Radius**: 16px
- **Padding**: 20px
- **Hover Effect**: Elevate shadow to 0px 4px 12px rgba(0, 0, 0, 0.08)

## Value (Large Stat)
- **Font**: 36px Bold, Primary Black (#1A1A1A)
- **Line Height**: 44px
- **Letter Spacing**: -0.5px
- **Purpose**: Display primary metric (e.g., "58%", "14")

## Label
- **Font**: 12px Medium, Secondary Gray Medium (#4A5568)
- **Line Height**: 16px
- **Letter Spacing**: 0.5px
- **Text Transform**: Uppercase
- **Purpose**: Describe the metric (e.g., "OVERALL PROGRESS")

## Icon (Optional)
- **Size**: 20px
- **Color**: Neutral Gray (#6B7280)
- **Position**: Top right corner
- **Purpose**: Visual category indicator

## Example Structure
```jsx
<div className="kpi-card">
  <div className="kpi-label">OVERALL PROGRESS</div>
  <div className="kpi-value">58%</div>
</div>
```
