# Quick Start (5 Minutes)

Get a DataGrid running in 5 minutes.

## 1. Import and Data

```tsx
import { DataGrid } from "@/components/data-grid";
import { stringColumn, numberColumn } from "@/components/data-grid/columns";

// Simple in-memory data
const data = [
  { id: 1, name: "Alice Chen", age: 30, department: "Engineering" },
  { id: 2, name: "Bob Smith", age: 25, department: "Design" },
  { id: 3, name: "Carol White", age: 35, department: "Sales" },
  { id: 4, name: "David Johnson", age: 28, department: "Engineering" },
  { id: 5, name: "Eve Brown", age: 32, department: "Marketing" },
];
```

## 2. Define Columns

```tsx
const columns = [
  stringColumn("name", "Name"),
  numberColumn("age", "Age"),
  stringColumn("department", "Department"),
];
```

## 3. Render

```tsx
export default function App() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      mode="flat"
    />
  );
}
```

**That's it!** You now have:
- ✅ 5 rows rendering
- ✅ Column headers
- ✅ Sortable columns (click header)
- ✅ Scrollable body

## Next Steps

- **See all features?** → [Progressive Walkthrough](02-progressive-walkthrough.md)
- **Customize columns?** → [Sorting](03-features/sorting.md), [Filtering](03-features/filtering.md)
- **Use config?** → [Config Basics](05-config-driven-tables/config-basics.md)
- **All options?** → [API Reference](07-api-reference.md)

## Troubleshooting

**"DataGrid not found"** — Make sure you're importing from the right path:
```tsx
import { DataGrid } from "@/components/data-grid";
```

**"No data showing"** — Check that `data` is not empty and `columns` match your data keys.

**"Columns look wrong"** — Use the correct column factory for your data type:
```tsx
stringColumn("fieldName", "Display Label")  // text
numberColumn("fieldName", "Display Label")  // numbers
dateColumn("fieldName", "Display Label")    // dates
selectColumn("fieldName", "Display Label", options) // dropdowns
```

Ready to add more features? Continue to [Progressive Walkthrough](02-progressive-walkthrough.md).
