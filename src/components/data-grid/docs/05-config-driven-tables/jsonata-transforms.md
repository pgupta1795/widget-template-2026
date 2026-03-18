# JSONata Transforms

Transform and map data using JSONata expressions in two key contexts: API response shaping and per-cell value computation.

---

## Two Contexts

### 1. Response Transform (API Nodes)

**When:** After fetching from an API endpoint.
**Input:** The entire API response object.
**Output:** Array of row objects.
**Field:** `ApiNodeConfig.responseTransform`

Used to reshape API responses into table rows, rename fields, filter, etc.

```typescript
responseTransform: `
  members.{
    "id": id,
    "name": name,
    "email": email,
    "yearsExperience": 2024 - $number($substring(joinDate, 0, 4))
  }
`
```

### 2. Value Expression (Column Nodes)

**When:** Rendering a cell value.
**Input:** The row object (available as implicit context, or as `$row`).
**Output:** Any value to display.
**Field:** `ColumnDef.valueExpr`

Used to transform cell values for display, compute badges, format currency, etc.

```typescript
valueExpr: `salary > 100000 ? "Senior" : "Junior"`
```

---

## JSONata Syntax

### Basic Field Access

```jsonata
name              // Access field 'name'
$.name            // Explicit dot notation
address.city      // Nested field access
members[0].email  // Array access
```

### String Operations

```jsonata
"Hello" & " " & "World"          // Concatenation
$uppercase(name)                 // ALICE
$lowercase(name)                 // alice
$length(name)                    // 5
$substring(name, 0, 3)           // Substring (start, length)
```

### Math

```jsonata
salary * 1.1                     // Multiply
2024 - $number(birthYear)        // Subtraction
$round(value, 2)                 // Round to 2 decimals
$ceil(value)                     // Round up
$floor(value)                    // Round down
```

### Conditionals

```jsonata
age >= 18 ? "Adult" : "Minor"
status = "active" ? "🟢" : "🔴"
salary > 150000 ? "Director" : salary > 100000 ? "Senior" : "Junior"
```

### Type Conversion

```jsonata
$string(42)                      // "42"
$number("42")                    // 42
$boolean("true")                 // true
```

### Comparisons

```jsonata
age = 30                         // Equal
age != 30                        // Not equal
age > 25                         // Greater than
age <= 30                        // Less than or equal
active = true                    // Boolean comparison
```

### Array Operations

```jsonata
$count(items)                    // Count array length
$sum(items.salary)               // Sum values
$avg(items.salary)               // Average
$max(items.salary)               // Maximum
$min(items.salary)               // Minimum
$filter(items, $.active = true)  // Filter array
```

### Object Construction

```jsonata
{
  "fullName": firstName & " " & lastName,
  "yearOfBirth": 2024 - age,
  "isManager": $count(directReports) > 0
}
```

---

## Accessing Runtime Parameters

Parameters passed to `<ConfiguredTable params={{ ... }}>` are accessible via `$params` with the `$:` prefix:

```typescript
queryParams: {
  $filter: '$:$params.searchStr ?? ""',      // Access params.searchStr
  $deptId: '$:$params.departmentId',          // Access params.departmentId
}
```

The `$:` syntax indicates a JSONata expression; the system evaluates it with `$params` available in the expression context.

### Example: Parameterized Filtering

```tsx
// Component passes searchStr
<ConfiguredTable
  config={config}
  params={{ searchStr: "alice" }}
/>

// In config, filter API based on param
queryParams: {
  $search: '$:$params.searchStr ?? ""',
}
```

---

## Real-World Examples from Existing Configs

### Example 1: eng-search.config.ts

API response contains `member[]` with nested fields. Transform flattens and renames:

```typescript
responseTransform: `
  member.{
    "id":           id,
    "name":         name,
    "title":        title,
    "type":         type,
    "revision":     revision,
    "state":        state,
    "owner":        owner,
    "organization": organization,
    "collabspace":  collabspace,
    "created":      created,
    "modified":     modified
  }
`
```

### Example 2: ca-detail.config.ts

Merges three API facets into one flat row array, tagging each with a `facet` field:

```typescript
responseTransform: `
  (
    ($p := proposed.members; $r := realized.members;
    $p.{ "facet": "proposed", ... }),
    ($r.{ "facet": "realized", ... })
  )
`
```

### Example 3: Compute Utilization with valueExpr

Column renders hours worked as a percentage:

```typescript
{
  field: "utilization",
  header: "Utilization %",
  valueExpr: `$round(hoursWorked / 40 * 100, 1) & "%"`
}
```

---

## Common Patterns

### Currency Formatting

```jsonata
"$" & $string($round(salary, 2))
// Input: 100000.5 → Output: "$100000.5"
```

### Date Formatting (ISO substring)

```jsonata
$substring(joinDate, 0, 10)
// Input: "2020-03-15T10:30:00Z" → Output: "2020-03-15"
```

### Boolean to Label

```jsonata
active ? "Active" : "Inactive"
```

### Multi-level Condition

```jsonata
status = "pending" ? "⏳ Pending" :
status = "approved" ? "✅ Approved" :
status = "rejected" ? "❌ Rejected" :
"Unknown"
```

### Count and Aggregate

```jsonata
{
  "engineer": name,
  "projectCount": $count(projects),
  "totalHours": $sum(projects.hours)
}
```

### Nested Field Extraction with Default

```jsonata
organization.department.name ?? "Unknown"
// Returns the value or "Unknown" if null/missing
```

### Uppercase/Lowercase

```jsonata
$uppercase(department)  // "ENGINEERING"
$lowercase(type)        // "software_engineer"
```

---

## JSONata Function Reference

| Function | Example | Result |
|----------|---------|--------|
| `$string(x)` | `$string(42)` | `"42"` |
| `$number(x)` | `$number("42")` | `42` |
| `$length(s)` | `$length("Alice")` | `5` |
| `$uppercase(s)` | `$uppercase("alice")` | `"ALICE"` |
| `$lowercase(s)` | `$lowercase("ALICE")` | `"alice"` |
| `$substring(s, start, length)` | `$substring("Alice", 0, 1)` | `"A"` |
| `$round(n, decimals)` | `$round(3.14159, 2)` | `3.14` |
| `$ceil(n)` | `$ceil(3.2)` | `4` |
| `$floor(n)` | `$floor(3.8)` | `3` |
| `$abs(n)` | `$abs(-5)` | `5` |
| `$count(a)` | `$count([1, 2, 3])` | `3` |
| `$sum(a)` | `$sum([1, 2, 3])` | `6` |
| `$avg(a)` | `$avg([1, 2, 3])` | `2` |
| `$max(a)` | `$max([1, 5, 3])` | `5` |
| `$min(a)` | `$min([1, 5, 3])` | `1` |
| `$exists(x)` | `$exists(field)` | `true` if exists |
| `$filter(a, pred)` | `$filter(items, $.active)` | Filtered array |

---

## In Transform Nodes

Transform nodes operate on entire row arrays. The input is an array, output must be an array:

```typescript
{
  id: "enrich-rows",
  type: "transform",
  config: {
    sourceNodeId: "api-engineers",
    expression: `
      $.{
        "id": id,
        "name": name,
        "yearOfBirth": 2024 - $number(age),
        "salaryAfterBonus": salary * 1.1,
        "level": salary > 100000 ? "Senior" : "Junior"
      }
    `
  }
}
```

Here, `$` refers to each row in the array (implicit iteration). The result is an array of transformed rows.

---

## In API Response Transforms

Response transforms reshape API data. Input is the raw API response:

```typescript
responseTransform: `
  data.members.{
    "id": id,
    "name": firstName & " " & lastName,
    "email": email,
    "joinYear": $number($substring(joinDate, 0, 4))
  }
`
```

If the API returns:
```json
{
  "data": {
    "members": [
      { "id": "1", "firstName": "Alice", "lastName": "Chen", "email": "alice@ex.com", "joinDate": "2020-03-15T..." }
    ]
  }
}
```

Output:
```json
[
  { "id": "1", "name": "Alice Chen", "email": "alice@ex.com", "joinYear": 2020 }
]
```

---

## In Value Expressions (Column Rendering)

Value expressions transform individual cell values:

```typescript
{
  field: "salary",
  header: "Compensation",
  valueExpr: `"$" & $string($round(salary, 2))`
}
```

The input row is the implicit context. Cell output: `"$100000"`.

---

## Best Practices

1. **Use `$:` for params** — Always prefix runtime parameters: `$:$params.searchStr`
2. **Null coalescing** — Use `??` to provide defaults: `name ?? "Unknown"`
3. **Type safety** — Use `$number()`, `$string()` when converting types
4. **Readable nested logic** — Break complex ternaries across lines for clarity
5. **Test with try.jsonata.org** — Prototype transforms before putting in config

---

## See Also

- [DAG Nodes](dag-nodes.md) — All node types and where transforms apply
- [Config Basics](config-basics.md) — DAG model and params
- [Flat Table Config](flat-table-config.md) — Full example with transforms
- [JSONata Official Docs](https://docs.jsonata.org/) — Complete language reference
- [JSONata Playground](https://try.jsonata.org/) — Interactive tool for testing
