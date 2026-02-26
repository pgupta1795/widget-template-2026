# UI Replication Prompt — PLM/Change Governance Application

## Overview
This document captures every visual and structural detail from two application views to enable exact UI replication: a **Product Structure / BOM View** (View 1) and a **Change Governance Dashboard** (View 2). The application resembles an enterprise PLM (Product Lifecycle Management) tool such as 3DEXPERIENCE / Enovia.

---

## Global Design System

### Color Palette

| Token | Hex / Description | Usage |
|---|---|---|
| `--bg-primary` | `#FFFFFF` | Main content background |
| `--bg-secondary` | `#F5F5F5` | Sidebar, panel backgrounds |
| `--bg-header` | `#FFFFFF` | Top header bar |
| `--accent-blue` | `#0070AD` | Links, active states, icon tints |
| `--accent-blue-dark` | `#005A8E` | Hover on links |
| `--badge-inwork` | `#007BC7` (blue filled) | "In Work" maturity state badge |
| `--badge-freeze` | `#888888` (grey outlined) | "Freeze" maturity state badge |
| `--border-color` | `#DCDCDC` | Table borders, panel dividers |
| `--text-primary` | `#333333` | Main body text |
| `--text-secondary` | `#666666` | Labels, secondary info |
| `--text-link` | `#0070AD` | Hyperlinks in tables and panels |
| `--icon-tint` | `#4A90C4` | Toolbar icon color |
| `--checkmark-green` | `#27AE60` | "Is Latest Revision" checkmark |
| `--row-hover` | `#EAF4FB` | Table row hover state |
| `--row-selected` | `#D0E8F5` | Selected row highlight |
| `--sidebar-active` | `#E8F4FC` | Active sidebar nav item background |

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| App title / Panel title | System sans-serif (Segoe UI / Arial) | 700 | 16–18px |
| Table header | Same | 600 | 12px |
| Table body | Same | 400 | 12px |
| Sidebar nav items | Same | 400 | 13px |
| Sidebar section headings | Same | 700 | 12px, uppercase |
| Detail panel labels | Same | 600 | 12px |
| Detail panel values | Same | 400 | 12px |
| Badge text | Same | 700 | 11px |

### Spacing & Layout
- **Border radius:** 2px (sharp/utilitarian)
- **Table row height:** 28–30px
- **Panel padding:** 12px 16px
- **Icon size:** 16px standard, 24px for header product icon
- **Sidebar width:** ~240px
- **Detail panel width:** ~400px (right side flyout)
- **Divider lines:** 1px solid `#DCDCDC`

---

## VIEW 1 — Product Structure / Bill of Materials (BOM)

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TOP HEADER BAR (full width)                                                 │
│  [Home icon] [Product Icon] [Product Title] [Meta info] [Action Buttons]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TOOLBAR ROW (below header, left-aligned)          [8 Items count label]     │
│  [+] [copy] [link] [search] [filter] [expand] [collapse] [list] [grid] [...] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BOM TABLE (left ~65% width)          │  RIGHT DETAIL PANEL (~35% width)     │
│                                       │                                      │
│  [Checkbox] [Expand] [Type icon]      │  [Product icon + title + timestamp]  │
│  Title | Ent# | Rev | Instance | ... │  [Tab icon row]                      │
│                                       │  [Properties list: label + value]    │
│  10 rows of data                      │                                      │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

---

### Header Bar (Top)

**Left section:**
- 🏠 Home icon (grey, 20px)
- Product 3D box icon (blue/grey cube, 48×48px)
- **Product Title:** `Electric Drive A` — bold, 18px, dark
- Below title (small text rows):
  - `Enterprise Item Number : None` — label grey, value is link `None` in blue
  - `Maturity State :` followed by **badge `In Work`** (blue filled pill) + **`Freeze`** (grey text link) + dropdown chevron `▾`
  - `Owner : User1 User1` — link in blue

**Center section:**
- `Modification Date : Jan 8, 2026, 6:50:01 PM` — grey label + value
- `Type : Physical Product` — grey label + value

**Right section of center:**
- `No description` — grey italic text

**Far right action buttons (icon row):**
- Chevron down `˅`
- People/share icon
- Info `ℹ`
- Chevron up `˄`

---

### Toolbar (Below Header)

Left-aligned icon buttons with hover tooltip:

| Icon | Action |
|---|---|
| `+` | Add item |
| Copy icon | Duplicate |
| Link/chain icon | Insert existing |
| Magnifier + list | Search/find |
| Funnel | Filter |
| Grid/expand icon | Expand structure |
| Collapse icon | Collapse |
| List view | Switch to list |
| Grid view | Switch to grid |
| Export/download icon | Export |

---

### BOM Table

**Column headers (12px, bold, border-bottom):**

| # | Column | Width | Notes |
|---|---|---|---|
| — | Checkbox | 24px | Select all |
| — | Title | ~200px | Tree expand `[+]`/`[-]`, type icon before text |
| 1 | Enterprise Ite... | 100px | Truncated |
| 2 | Revision | 70px | Single letter (A) |
| 3 | Title (Instance) | 120px | Truncated |
| 4 | Is Latest Revis... | 80px | Green ✓ checkmark |
| 5 | Maturity State | 80px | Colored badge |
| 6 | Owner | 90px | Truncated link |
| 7 | Lock | 60px | 🔒 icon |
| 8 | Modification D... | 100px | Date truncated |
| 9 | Type | 120px | "Physical Product" |
| 10 | Name | ~160px | `prd-9327401-0...` |

**Row Data (10 rows):**

| Row | Expand | Title | Ent# | Rev | Is Latest | Maturity | Owner | Lock |
|---|---|---|---|---|---|---|---|---|
| 1 | `[+]` | EI_001120_Motor 170 | None | A | ✓ | In Work | User1 U... | 🔓 |
| 2 | `[-]` | EI_001210_Inverter | None | A | ✓ | In Work | User1 U... | 🔓 |
| 3 | — | 00332_Inverter | None | A | ✓ | In Work | User1 U... | 🔓 |
| 4 | `[+]` | Physical Product000025... | None | A | ✓ | In Work | User1 U... | 🔓 |
| 5 | `[+]` | EI_001310_Reducer | None | A | ✓ | In Work | User1 U... | 🔓 |
| 6 | `[+]` | EI_002110_Transmission | None | A | ✓ | In Work | User1 U... | 🔓 |
| 7 | `[+]` | EI_007190_Chassis Motor Bracket | None | A | ✓ | In Work | User1 U... | 🔓 |
| 8 | `[+]` | EI_007210_Chassis Inverter Bra... | None | A | ✓ | In Work | User1 U... | 🔓 |
| 9 | `[+]` | EI_007310_Fix Chassis Motor | None | A | ✓ | In Work | User1 U... | 🔓 |
| 10 | `[+]` | EI_007410_Fix Chassis Inverter | None | A | ✓ | In Work | User1 U... | 🔓 |

**Tree Indentation:** Row 3 and 4 are children of row 2 (indented ~16px). Row 4's children are further indented.

**Row 3 special:** Has a different sub-icon (component type icon — small grey box) instead of the 3D cube.

**"In Work" Badge styling:**
```css
background-color: #007BC7;
color: #FFFFFF;
border-radius: 3px;
padding: 2px 6px;
font-size: 11px;
font-weight: 700;
```

---

### Right Detail Panel

**Panel header:**
- Same 3D cube product icon (48×48px)
- Title: `Electric Drive A` — bold 16px
- Subtitle: `User1 User1  Jan 8, 2026, 6:50:01 PM` — small grey text
- Top-right corner: `▲` (collapse) and `✕` (close) icons

**Tab Row (icon-only tabs, 16px icons, horizontal):**
- Properties tab (active — underlined in blue)
- Structure tab
- Share/connections tab
- Table/list tab
- Cut/scissors tab
- Chart/data tab
- Comment/chat tab
- Clock/history tab
- More tabs `>` chevron
- Triple bar `≡` menu

**Properties List (label + value, alternating white rows, 28px height):**

| Label | Value |
|---|---|
| Type | Physical Product |
| Title | Electric Drive |
| Name | prd-9327401-00000024 |
| Revision | A |
| Revision Comment | *(empty)* |
| Description | *(empty)* |
| Creation Date | Jan 8, 2026, 6:49:53 PM |
| Created From | prd-41123823-00001991 A.1 |
| Design Range | Normal Range |
| Collaborative Policy | Engineering Definition |
| Modification Date | Jan 8, 2026, 6:50:01 PM |
| Maturity State | **In Work** (blue link/badge) |
| Owner | **User1 User1** (blue link) |
| Organization | Company Name |
| Collaborative Space | Test |
| Locked By | *(empty)* |
| Manufacturable/Procurable | **True** (blue link) |

**Edit icon:** ✏️ pencil icon top right of properties tab area.

---

## VIEW 2 — Change Governance Dashboard

### Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  SIDEBAR (left, ~240px wide, white bg, light border)   │
├─────────────────────────┬──────────────────────────────┤
│  SIDEBAR                │  MAIN CONTENT AREA           │
│                         │                              │
│  [Section heading]      │  [Section header: Recents]   │
│  [Nav items list]       │  [Card grid — 3 columns]     │
│                         │                              │
│  [Section heading]      │                              │
│  [Nav items list]       │                              │
│                         │                              │
│  [Section heading]      │                              │
│  [Nav items list]       │                              │
└─────────────────────────┴──────────────────────────────┘
```

---

### Sidebar

**Top section — App Info Block:**
- **Header text:** `Change Governance` — bold 13px dark
- **Description:** `Use Change Management solution to create changes, manage changes with governance and implement your changes.` — grey 12px, wraps 3 lines

---

**Section: Access Your Work**

Nav items (icon + label, 13px):

| Icon | Label | State |
|---|---|---|
| 🕐 clock icon | **Recents** | **Active** (blue text, blue left border, light blue bg `#E8F4FC`) |
| → arrow | Open | Default |
| 📋 | My Investigation Requests | Default |
| 📋 | My Change Requests | Default |
| 📋 | My Change Orders | Default |
| 📋 | My Change Actions | Default |

---

**Section: Start a New Activity**

Nav items:

| Icon | Label |
|---|---|
| 📋+ | New Investigation Request |
| 📋+ | New Change Request |
| 📋+ | New Change Order |
| 📋+ | New Change Action |

---

**Sidebar Styling:**
```css
sidebar {
  width: 240px;
  background: #FFFFFF;
  border-right: 1px solid #DCDCDC;
  padding: 12px 0;
}
section-heading {
  font-size: 12px;
  font-weight: 700;
  color: #333333;
  padding: 12px 16px 6px;
}
nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 13px;
  color: #333333;
  cursor: pointer;
}
nav-item.active {
  background: #E8F4FC;
  color: #0070AD;
  border-left: 3px solid #0070AD;
}
nav-item:hover {
  background: #F5F5F5;
}
```

---

### Main Content Area

**Section Header Row:**
- `◀` left collapse arrow icon — grey, 16px (collapses sidebar panel)
- `Recents` — section title, bold 14px
- `ℹ` info icon — far right

---

### Recents Card Grid

3-column grid layout, cards are equal width (~300px), gap ~12px.

#### Card Structure (each card):

```
┌──────────────────────────────────────────┐
│  [Type icon 32px] [Title — blue link]    [˅ chevron] │
│               [ID | Owner name]                      │
│               [Status badge]                         │
├──────────────────────────────────────────────────────│
│  [🗑 trash icon]                                     │
└──────────────────────────────────────────────────────┘
```

**Card data:**

| Field | Card 1 | Card 2 | Card 3 |
|---|---|---|---|
| Type Icon | CO (Change Order — orange/red document icon) | CA (Change Action — blue/teal document icon) | CA (same as CA) |
| Title | **PG-CO-001** | **CA-TEST** | **PG-CA-001** |
| ID | CO-0000203 | CA-TechnaUK-00002410 | CA-TechnaUK-00002110 |
| Owner | Pallav Gupta | Pallav Gupta | Pallav Gupta |
| Status Badge | `Draft` (grey text, no bg) | `In Work` (blue text or badge) | `Draft` (grey text) |
| Bottom action | 🗑 green/teal trash icon | 🗑 green/teal trash icon | 🗑 green/teal trash icon |

**Card Styling:**
```css
.card {
  background: #FFFFFF;
  border: 1px solid #DCDCDC;
  border-radius: 4px;
  padding: 12px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.card-title {
  color: #0070AD;
  font-weight: 700;
  font-size: 13px;
  text-decoration: none;
}
.card-meta {
  color: #666666;
  font-size: 12px;
}
.badge-draft {
  color: #888888;
  font-size: 12px;
}
.badge-inwork {
  color: #007BC7;
  font-size: 12px;
  font-weight: 600;
}
.card-footer {
  border-top: 1px solid #EEEEEE;
  margin-top: 8px;
  padding-top: 6px;
}
```

---

### Type Icons Description

**CO icon (Change Order):**
- Document shape with folded corner
- Background: warm orange `#E8812A` or light brown
- Text overlay: `CO` in white bold
- 32×32px with slight rounded corners

**CA icon (Change Action):**
- Same document shape
- Background: blue `#0070AD` or teal
- Text overlay: `CA` in white bold
- 32×32px

---

## Shared Component Patterns

### Maturity State Badges

```css
/* In Work */
.badge-inwork {
  background: #007BC7;
  color: #fff;
  border-radius: 3px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 700;
  display: inline-block;
}

/* Freeze */
.badge-freeze {
  background: transparent;
  color: #888;
  border: 1px solid #AAAAAA;
  border-radius: 3px;
  padding: 2px 7px;
  font-size: 11px;
}

/* Draft (card badge) */
.badge-draft {
  color: #888888;
  font-size: 12px;
  font-weight: 400;
}
```

### Expand/Collapse Tree Controls

```html
<!-- Plus button -->
<span class="tree-toggle expand">+</span>
<!-- Minus button -->
<span class="tree-toggle collapse">-</span>
```

```css
.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid #AAAAAA;
  border-radius: 2px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  margin-right: 4px;
}
```

### Link Style

```css
a, .link {
  color: #0070AD;
  text-decoration: none;
  cursor: pointer;
}
a:hover, .link:hover {
  text-decoration: underline;
  color: #005A8E;
}
```

### Table Base

```css
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
th {
  background: #F0F0F0;
  border-bottom: 2px solid #CCCCCC;
  padding: 6px 8px;
  text-align: left;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
td {
  padding: 5px 8px;
  border-bottom: 1px solid #E8E8E8;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
tr:hover td {
  background: #EAF4FB;
}
```

---

## Icons Reference

Use standard 16px SVG icons from a system icon set (e.g. Phosphor Icons, Feather Icons, or Material Icons):

| Icon | Usage |
|---|---|
| `home` | Top-left navigation |
| `plus` | Add row toolbar |
| `copy` | Duplicate toolbar |
| `link` | Insert existing |
| `search` | Find toolbar |
| `filter` | Filter toolbar |
| `expand` | Expand all |
| `list` | List view |
| `grid` | Grid view |
| `download` | Export |
| `lock` / `unlock` | Row lock state |
| `check` | Is Latest Revision |
| `chevron-down` | Dropdowns, card collapse |
| `info` | Info button |
| `pencil` | Edit in detail panel |
| `trash` | Delete card |
| `clock` | Recents nav |
| `arrow-right` | Open nav item |
| `file-text` + overlay | CO, CA type icons |

---

## Implementation Notes

1. **Split pane layout** for View 1: use CSS `display: flex` with `flex: 0 0 65%` on table pane and `flex: 0 0 35%` on detail panel, separated by 1px solid `#DCDCDC` divider.
2. **Sticky header** for both the top header bar and the table column headers.
3. **Tree indentation:** Each nested level adds `padding-left: 16px` to the title cell content.
4. **Right detail panel** scrolls independently if content overflows.
5. **Sidebar** in View 2 is fixed width and full height; main content scrolls.
6. **Cards** in View 2 use CSS Grid: `grid-template-columns: repeat(3, 1fr)`.
7. No rounded cards — only `border-radius: 2–4px` for sharp enterprise feel.
8. No shadows on table rows — rely on borders only.
9. All fonts: system stack `"Segoe UI", Arial, sans-serif`.
10. No gradient backgrounds — flat white/light grey only.
