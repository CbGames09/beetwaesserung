# Design Guidelines: ESP32 Plant Watering System Dashboard

## Design Approach
**System Selected:** Material Design with IoT Dashboard Principles
**Justification:** Utility-focused application requiring clear data visualization, real-time status monitoring, and efficient information display. Material Design provides robust patterns for data-heavy interfaces with strong visual feedback.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 220 15% 12%
- Surface: 220 15% 18%
- Surface Elevated: 220 15% 22%
- Primary (Active/Healthy): 142 71% 45% (Green for healthy plants)
- Warning: 38 92% 50% (Orange for attention needed)
- Error: 0 84% 60% (Red for critical states)
- Success: 142 71% 45% (System OK)
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 70%

**Light Mode**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Primary: 142 71% 40%
- Warning: 38 92% 45%
- Error: 0 72% 51%

### B. Typography
- **Font Families:** Inter (via Google Fonts CDN) for all text
- **Headings:** font-semibold, text-xl to text-3xl
- **Body:** font-normal, text-base
- **Data/Metrics:** font-mono, text-lg to text-2xl for sensor readings
- **Labels:** font-medium, text-sm, uppercase tracking-wide

### C. Layout System
**Spacing Units:** Tailwind primitives: 2, 4, 6, 8, 12, 16, 24
- Card padding: p-6
- Section gaps: gap-6 to gap-8
- Grid spacing: grid gap-4 to gap-6
- Button padding: px-6 py-3

**Grid Structure:**
- Desktop: 2-column layout (main dashboard + sidebar for quick stats)
- Tablet: Single column with stacked sections
- Mobile: Vertical stack, full-width cards

### D. Component Library

**Status Cards (Plant Monitoring)**
- Rounded corners (rounded-xl)
- Subtle shadow (shadow-lg in light, shadow-2xl in dark)
- Large icon at top (96px) using Heroicons
- Plant name as heading (text-xl font-semibold)
- Current moisture level with progress bar
- Color-coded status indicator (green/orange/red dot)
- Last watered timestamp (text-sm text-secondary)

**Sensor Data Display**
- Large numerical value (text-3xl font-mono)
- Unit label (text-sm uppercase)
- Small trend indicator icon (up/down arrow)
- Background gradient for visual interest

**Water Tank Indicator**
- Vertical tank visualization (CSS-based)
- Percentage fill level
- Estimated liters remaining
- Warning threshold indicator

**Settings Panel (PIN-Protected)**
- Modal overlay (backdrop-blur-sm bg-black/50)
- Centered card (max-w-2xl)
- Form inputs with floating labels
- Number inputs for intervals and thresholds
- Toggle switches for 3/4 plant selection
- Plant profile cards (expandable accordions)
- Save/Cancel action buttons

**Navigation**
- Top bar with system name and status icon
- Settings gear icon (top-right)
- Lock icon when settings are locked
- Minimal, unobtrusive

**System Test Results**
- Icon badge (checkmark for passed, warning for issues)
- Expandable details section
- Last test timestamp
- Individual component test results (sensors, pumps, connectivity)

### E. Icon Strategy
**Library:** Heroicons (via CDN)
**Usage:**
- Plant status: potted plant outline icon
- Temperature: sun icon
- Humidity: water droplet icon
- Water tank: beaker icon
- Settings: cog-6-tooth icon
- Test status: shield-check/shield-exclamation
- Manual watering: hand-raised icon
- Pump status: arrow-up-circle for active

**Size Standards:**
- Status cards: w-24 h-24
- Navigation: w-6 h-6
- Inline indicators: w-4 h-4

## Dashboard Layout Structure

**Main View (No Hero)**
1. **Header Bar** (h-16, sticky top-0)
   - System title: "Plant Watering System"
   - Real-time clock
   - System health icon
   - Settings button

2. **Quick Stats Row** (grid grid-cols-3 gap-4)
   - Temperature card
   - Humidity card
   - Water level card

3. **Plant Grid** (grid grid-cols-2 lg:grid-cols-4 gap-6)
   - Individual plant cards (3-4 cards based on setting)
   - Each card shows moisture level, status, last watered

4. **System Status Footer** (mt-12)
   - Last system test result
   - Next test scheduled
   - Connection status indicator

## Responsive Behavior
- Desktop (lg+): 4-column plant grid, sidebar stats
- Tablet (md): 2-column plant grid, stacked stats
- Mobile: Single column, cards stack vertically

## Interaction Patterns
- Real-time data updates (WebSocket or polling every 10 seconds)
- Smooth transitions (transition-all duration-300)
- Hover states on interactive elements (scale-105 on cards)
- Loading skeletons for data fetching states
- Toast notifications for watering events
- PIN pad: numeric keypad interface (grid-cols-3, large touch targets)

## Accessibility
- High contrast mode support
- All icons paired with text labels
- Focus indicators on interactive elements
- Screen reader labels for all sensors
- Keyboard navigation for settings

## Data Visualization
- Progress bars for moisture levels (gradient fills)
- Simple line charts for historical trends (optional future enhancement)
- Color coding consistent across all components
- Large, readable sensor values