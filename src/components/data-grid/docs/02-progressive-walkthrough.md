# Progressive Walkthrough

Learn DataGrid by adding features one at a time. One example, six steps.

## Step 1: Flat Grid with Sorting

**What it is:** Local data, clickable headers to sort.

```tsx
import { DataGrid } from "@/components/data-grid";
import { stringColumn, numberColumn } from "@/components/data-grid/columns";

const data = [
  { id: 1, name: "Alice", age: 30, active: true },
  { id: 2, name: "Bob", age: 25, active: false },
  { id: 3, name: "Carol", age: 35, active: true },
];

const columns = [
  stringColumn("name", "Name"),
  numberColumn("age", "Age"),
];

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

**Try:** Click "Name" or "Age" header to sort ascending/descending. Click again to reverse.

---

## Step 2: Add Filtering

**What changed:** Filter UI appears in column headers.

```tsx
<DataGrid
  data={data}
  columns={columns}
  mode="flat"
  features={{
    filtering: { enabled: true }
  }}
/>
```

**Try:** Click the filter icon in a header. Type a value to filter rows.

---

## Step 3: Add Selection

**What changed:** Checkboxes appear. Select rows with Ctrl+click.

```tsx
<DataGrid
  data={data}
  columns={columns}
  mode="flat"
  features={{
    filtering: { enabled: true },
    selection: { enabled: true }
  }}
/>
```

**Try:** Click row checkboxes. Click the header checkbox to select all.

---

## Step 4: Switch to Tree Mode

**What changed:** Add a hierarchy. Rows have expand buttons.

```tsx
const treeData = [
  {
    id: 1,
    name: "Alice",
    age: 30,
    children: [
      { id: 11, name: "Alice Child 1", age: 5 },
      { id: 12, name: "Alice Child 2", age: 3 },
    ],
  },
  {
    id: 2,
    name: "Bob",
    age: 25,
    children: [
      { id: 21, name: "Bob Child 1", age: 2 },
    ],
  },
];

<DataGrid
  data={treeData}
  columns={columns}
  mode="tree"
  getSubRows={(row) => row.children}
  features={{
    filtering: { enabled: true },
    selection: { enabled: true },
  }}
/>
```

**Try:** Click the expand arrow to show/hide children.

---

## Step 5: Switch to Infinite Mode

**What changed:** Rows load on demand as you scroll down.

```tsx
const fetchMore = async (pageParam = 0) => {
  // Simulate server fetch
  const offset = pageParam * 10;
  return {
    rows: data.slice(offset, offset + 10),
    nextPage: offset + 10 < data.length ? offset + 10 : null,
  };
};

<DataGrid
  queryFn={fetchMore}
  columns={columns}
  mode="infinite"
  features={{
    filtering: { enabled: true },
    selection: { enabled: true },
  }}
/>
```

**Try:** Scroll to the bottom; more rows load automatically.

---

## Step 6: Switch to Paginated Mode

**What changed:** Pagination controls appear at the bottom.

```tsx
const fetchPage = async (pageIndex = 0) => {
  const pageSize = 10;
  const offset = pageIndex * pageSize;
  return {
    rows: data.slice(offset, offset + pageSize),
    total: data.length,
  };
};

<DataGrid
  queryFn={fetchPage}
  columns={columns}
  mode="paginated"
  features={{
    filtering: { enabled: true },
    selection: { enabled: true },
  }}
/>
```

**Try:** Use the page controls to jump to different pages.

---

## What You Learned

- Step 1: Basic sorting
- Step 2: Column filtering
- Step 3: Row selection
- Step 4: Hierarchies with tree mode
- Step 5: Incremental loading with infinite mode
- Step 6: Page-based loading with paginated mode

Each feature layers on top. You can mix any features with any mode.

---

## Next: Learn Features in Depth

- [Sorting](03-features/sorting.md)
- [Filtering](03-features/filtering.md)
- [Selection](03-features/selection.md)
- [Tree Expansion](03-features/tree-expansion.md)
- [All features](README.md#features)

Or jump to your specific use case:

- [Flat Mode (full example)](04-data-modes-non-config/flat-mode.md)
- [Paginated Mode (full example)](04-data-modes-non-config/paginated-mode.md)
- [Infinite Mode (full example)](04-data-modes-non-config/infinite-mode.md)
- [Tree Mode (full example)](04-data-modes-non-config/tree-mode.md)

---

## Config Alternative

Don't like props? Use declarative config instead:

```tsx
const config = {
  name: "users",
  mode: "flat",
  columns: [
    { id: "name", type: "string", label: "Name" },
    { id: "age", type: "number", label: "Age" },
  ],
  features: {
    filtering: { enabled: true },
    selection: { enabled: true },
  },
  dataSource: {
    type: "local",
    data: data,
  },
};

<ConfiguredTable config={config} />
```

[Learn about config](05-config-driven-tables/config-basics.md).
