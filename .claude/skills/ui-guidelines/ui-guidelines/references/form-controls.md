# Form Controls Specifications

## Toggle Switch

### Dimensions
- **Width**: 44px
- **Height**: 24px
- **Toggle Circle**: 20px diameter
- **Padding**: 2px internal padding
- **Corner Radius**: 12px (pill shape)

### States
**Off State**:
- Background: Neutral Gray (#6B7280)
- Circle: White (#FFFFFF)
- Circle Position: Left (2px from edge)
- Transition: 150ms cubic-bezier(0.4, 0.0, 1, 1)

**On State**:
- Background: Secondary Blue (#3B82F6)
- Circle: White (#FFFFFF)
- Circle Position: Right (2px from edge)

**Disabled State**:
- Background: Secondary Gray Light (#E2E8F0)
- Circle: White (#FFFFFF) at 50% opacity
- Cursor: not-allowed

**Hover State** (when enabled):
- Background: Darken by 10%
- Circle: Scale 1.05

### With Label
- Label Position: Right of toggle, 12px gap
- Label Font: 14px Regular, Primary Black (#1A1A1A)
- Vertical Alignment: Center

### Code Example
```jsx
<label className="toggle-container">
  <input type="checkbox" className="toggle-input" />
  <span className="toggle-slider"></span>
  <span className="toggle-label">Enable notifications</span>
</label>
```

## Checkbox

### Dimensions
- **Size**: 20px × 20px
- **Border**: 2px solid Neutral Gray (#6B7280)
- **Corner Radius**: 4px
- **Checkmark**: 12px Lucide check icon

### States
**Unchecked**:
- Background: White (#FFFFFF)
- Border: 2px Neutral Gray (#6B7280)

**Checked**:
- Background: Secondary Blue (#3B82F6)
- Border: 2px Secondary Blue (#3B82F6)
- Checkmark: White (#FFFFFF)
- Animation: Scale from 0.8 to 1.0, 150ms

**Indeterminate** (partial selection):
- Background: Secondary Blue (#3B82F6)
- Border: 2px Secondary Blue (#3B82F6)
- Icon: Horizontal line (minus), White (#FFFFFF)

**Disabled**:
- Background: Secondary Gray Light (#E2E8F0)
- Border: Neutral Gray (#6B7280) at 50% opacity
- Cursor: not-allowed

**Hover** (when enabled):
- Border: 2px Secondary Blue (#3B82F6)
- Background: rgba(59, 130, 246, 0.05)

**Focus**:
- Outline: 2px Secondary Blue (#3B82F6)
- Outline Offset: 2px

### With Label
- Label Position: Right of checkbox, 8px gap
- Label Font: 14px Regular, Primary Black (#1A1A1A)
- Clickable Area: Entire label and checkbox

## Radio Button

### Dimensions
- **Size**: 20px × 20px
- **Border**: 2px solid Neutral Gray (#6B7280)
- **Corner Radius**: 50% (circle)
- **Inner Dot**: 10px diameter

### States
**Unselected**:
- Background: White (#FFFFFF)
- Border: 2px Neutral Gray (#6B7280)

**Selected**:
- Background: White (#FFFFFF)
- Border: 2px Secondary Blue (#3B82F6)
- Inner Dot: 10px circle, Secondary Blue (#3B82F6)
- Animation: Scale from 0 to 1.0, 150ms

**Disabled**:
- Background: Secondary Gray Light (#E2E8F0)
- Border: Neutral Gray (#6B7280) at 50% opacity

**Hover** (when enabled):
- Border: 2px Secondary Blue (#3B82F6)

**Focus**:
- Outline: 2px Secondary Blue (#3B82F6)
- Outline Offset: 2px

### With Label
- Label Position: Right of radio, 8px gap
- Label Font: 14px Regular, Primary Black (#1A1A1A)

## Slider (Range Input)

### Dimensions
- **Track Height**: 6px
- **Track Width**: 100% (or specified width, min 200px)
- **Thumb Size**: 20px × 20px (circle)
- **Corner Radius**: 3px (track)

### States
**Track**:
- Background (unfilled): Secondary Gray Light (#E2E8F0)
- Background (filled): Secondary Blue (#3B82F6)
- Height: 6px
- Corner Radius: 3px

**Thumb**:
- Background: White (#FFFFFF)
- Border: 2px Secondary Blue (#3B82F6)
- Size: 20px × 20px
- Shadow: 0px 2px 4px rgba(0, 0, 0, 0.1)

**Thumb Hover**:
- Scale: 1.1
- Shadow: 0px 3px 6px rgba(0, 0, 0, 0.15)

**Thumb Active** (dragging):
- Scale: 1.15
- Shadow: 0px 4px 8px rgba(0, 0, 0, 0.2)

**Disabled**:
- Track: Secondary Gray Light (#E2E8F0)
- Thumb: Neutral Gray (#6B7280) at 50% opacity
- Cursor: not-allowed

### With Labels
- Min/Max Labels: 12px Regular, Secondary Gray Medium (#4A5568)
- Value Display: 14px Medium, Primary Black (#1A1A1A)
- Position: Above slider, centered over thumb

## Select Dropdown (Enhanced)

### Dimensions
- **Height**: 48px
- **Min Width**: 200px
- **Max Height** (dropdown): 320px (scrollable)
- **Corner Radius**: 8px
- **Padding**: 12px 16px

### Trigger (Closed State)
- Background: White (#FFFFFF)
- Border: 1px Neutral Gray (#6B7280)
- Text: 14px Regular, Primary Black (#1A1A1A)
- Icon: Chevron down, 20px, Neutral Gray (#6B7280)
- Icon Position: Right side, 12px from edge

### Trigger Hover
- Border: 1px Secondary Blue (#3B82F6)
- Icon Color: Secondary Blue (#3B82F6)

### Trigger Focus/Open
- Border: 2px Secondary Blue (#3B82F6)
- Outline: None (border serves as focus indicator)
- Icon: Rotate 180deg (chevron up)

### Dropdown Menu
- Background: White (#FFFFFF)
- Border: 1px Secondary Gray Light (#E2E8F0)
- Shadow: 0px 4px 12px rgba(0, 0, 0, 0.1)
- Corner Radius: 8px
- Max Height: 320px
- Overflow: Auto scroll
- Z-Index: 1000

### Dropdown Options
- Height: 40px
- Padding: 10px 16px
- Font: 14px Regular, Primary Black (#1A1A1A)
- Hover Background: rgba(59, 130, 246, 0.05)
- Selected Background: rgba(59, 130, 246, 0.1)
- Selected Font: 14px Semibold

### Multi-Select
- Show selected count in trigger: "3 selected"
- Selected items have checkmarks (16px icon)
- Clear all button in dropdown header

## Search Input

### Dimensions
- **Height**: 48px
- **Min Width**: 280px
- **Corner Radius**: 8px
- **Icon Size**: 20px

### Components
- Search Icon: Left side, 16px from edge, Neutral Gray (#6B7280)
- Input Padding: 12px 16px 12px 44px (to account for icon)
- Clear Button: Right side (when value present), 16px from edge

### States
**Default**:
- Background: White (#FFFFFF)
- Border: 1px Neutral Gray (#6B7280)
- Placeholder: Neutral Gray (#6B7280)

**Focus**:
- Border: 2px Secondary Blue (#3B82F6)
- Search Icon: Secondary Blue (#3B82F6)

**With Value**:
- Show clear button (X icon, 16px)
- Clear button hover: Background rgba(0, 0, 0, 0.05)

### Search Suggestions Dropdown
- Appears below input
- Same styling as Select dropdown
- Highlight matching text in bold
- Recent searches section (optional)

## File Upload

### Drag & Drop Area
- **Height**: 200px (or variable)
- **Border**: 2px dashed Neutral Gray (#6B7280)
- **Corner Radius**: 8px
- **Padding**: 32px

**Default State**:
- Background: Background Secondary (#F5F5F5)
- Border: 2px dashed Neutral Gray (#6B7280)
- Icon: Upload cloud, 32px, Neutral Gray (#6B7280)
- Text: 14px Regular, Secondary Gray Medium (#4A5568)

**Hover/Drag Over State**:
- Background: rgba(59, 130, 246, 0.05)
- Border: 2px dashed Secondary Blue (#3B82F6)
- Icon Color: Secondary Blue (#3B82F6)
- Text Color: Secondary Blue (#3B82F6)

**Loading State**:
- Show progress bar
- Disable interaction
- Progress bar: Full width, 6px height

### File Input Button
- Style as Secondary Button
- Icon: Paperclip or upload, 20px
- Text: "Choose file" or "Browse"

### File List (After Upload)
- Item Height: 48px
- Item Background: White (#FFFFFF)
- Item Border: 1px Secondary Gray Light (#E2E8F0)
- File Icon: 20px, by file type
- File Name: 14px Regular, Primary Black
- File Size: 12px Regular, Secondary Gray Medium
- Remove Button: X icon, 16px, Error Red on hover

## Date Picker

### Input Field
- Same as standard text input (48px height, 8px radius)
- Calendar icon: Right side, 20px, Neutral Gray (#6B7280)
- Icon hover: Secondary Blue (#3B82F6)

### Calendar Dropdown
- Width: 320px
- Background: White (#FFFFFF)
- Shadow: 0px 4px 12px rgba(0, 0, 0, 0.1)
- Corner Radius: 8px
- Padding: 16px

**Header**:
- Month/Year: 16px Semibold, Primary Black
- Nav Arrows: 20px, hover background rgba(0, 0, 0, 0.05)

**Day Cells**:
- Size: 40px × 40px
- Corner Radius: 50%
- Font: 14px Regular
- Hover Background: rgba(59, 130, 246, 0.1)
- Selected Background: Secondary Blue (#3B82F6)
- Selected Text: White (#FFFFFF)
- Today: Border 1px Secondary Blue
- Other Month: 50% opacity

## Textarea

### Dimensions
- **Min Height**: 96px (4 rows)
- **Max Height**: 400px (then scroll)
- **Corner Radius**: 8px
- **Padding**: 12px 16px
- **Resize**: Vertical only

### States
- Same border/focus states as text input
- Character counter: Bottom right, 12px Regular, Secondary Gray Medium
- Character limit warning: Turn Error Red when near/at limit

## Accessibility Notes

All form controls must:
- Have visible focus indicators (2px blue outline)
- Be keyboard navigable (Tab, Space, Enter, Arrow keys)
- Have associated labels (visible or aria-label)
- Support screen readers with proper ARIA attributes
- Meet 4.5:1 contrast ratio for text
- Have 44px minimum touch targets on mobile
