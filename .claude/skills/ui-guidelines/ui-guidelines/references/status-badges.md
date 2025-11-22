# Status Badge Specifications

All status badges share common properties with different color schemes.

## Common Properties
- **Padding**: 4px 12px
- **Corner Radius**: 6px
- **Font**: 11px Semibold
- **Text Color**: White (#FFFFFF)
- **Display**: Inline-flex
- **Align Items**: Center
- **Text Transform**: Capitalize or uppercase

## Badge Types

### Required
- **Background**: Error Red (#EF4444)
- **Use Case**: Mandatory tasks, required items
- **Label**: "Required", "Mandatory"

### In Review
- **Background**: Info Blue (#3B82F6)
- **Use Case**: Submitted items awaiting approval
- **Label**: "In Review", "Pending Review"

### Needs Amendment
- **Background**: Warning Amber (#F59E0B)
- **Use Case**: Items requiring revision or correction
- **Label**: "Needs Amendment", "Revision Required"

### Not Submitted
- **Background**: Neutral Gray (#6B7280)
- **Use Case**: Pending items, not yet submitted
- **Label**: "Not Submitted", "Pending"

### Active
- **Background**: Success Green (#10B981)
- **Use Case**: Active projects, approved items, completed tasks
- **Label**: "Active", "Approved", "Complete"

## Additional Status Options

### On Hold
- **Background**: Warning Amber (#F59E0B)
- **Label**: "On Hold", "Paused"

### Cancelled
- **Background**: Error Red (#EF4444)
- **Label**: "Cancelled", "Rejected"

### Draft
- **Background**: Neutral Gray (#6B7280)
- **Label**: "Draft", "In Progress"

## Usage Guidelines
- Always use consistent badge styling across the application
- Provide adequate spacing between badge and adjacent content (minimum 8px)
- Ensure text is concise (1-2 words maximum)
- Use semantic HTML with appropriate ARIA labels for accessibility
