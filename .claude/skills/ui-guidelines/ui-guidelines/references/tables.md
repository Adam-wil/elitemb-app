# Data Table Specifications

## Table Structure
- **Background**: White (#FFFFFF)
- **Border**: 1px solid Secondary Gray Light (#E2E8F0)
- **Corner Radius**: 12px
- **Overflow**: Hidden (to maintain border radius)

## Header Row
- **Background**: Background Secondary (#F5F5F5)
- **Text**: 12px Semibold, Secondary Gray Medium (#4A5568)
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid Secondary Gray Light (#E2E8F0)
- **Text Transform**: Uppercase or sentence case

## Data Rows
- **Height**: 56px
- **Text**: 14px Regular, Primary Black (#1A1A1A)
- **Padding**: 12px 16px
- **Border Bottom**: 1px solid Secondary Gray Light (#E2E8F0)
- **Hover**: Background rgba(59, 130, 246, 0.05)
- **Transition**: 150ms ease

## Dropdown Cells
- **Icon**: Chevron down, 16px, Neutral Gray (#6B7280)
- **Clickable Area**: Full cell
- **Hover**: Background Secondary Gray Light (#E2E8F0)
- **Active State**: Rotate chevron 180deg

## Responsive Behavior
- **Desktop**: Full table with all columns
- **Tablet**: Hide non-essential columns, maintain key data
- **Mobile**: Convert to card-based list view

## Accessibility
- Use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<tr>`, `<td>` semantic HTML
- Add `aria-label` to action buttons
- Ensure keyboard navigation works for interactive cells
- Maintain 4.5:1 contrast ratio for all text
