# JSONata Transforms

Use JSONata to map and transform data fields in config.

## What Is JSONata?

JSONata is a lightweight query and transformation language for JSON. In tables, use it to:
- Rename fields
- Transform values (uppercase, format, calculate)
- Conditionally show/hide fields
- Compose new fields from existing ones

## Basic Syntax

### Simple Field Mapping

```jsonata
$name        // Access the 'name' field
$.age        // Explicit dot notation
```

### Field Renaming

```jsonata
{
  "fullName": $.firstName & " " & $.lastName,
  "email": $.emailAddress
}
```

Result:
```json
{
  "fullName": "Alice Chen",
  "email": "alice@example.com"
}
```

### String Concatenation

```jsonata
{
  "description": name & " is " & age & " years old"
}
```

### Numbers and Math

```jsonata
{
  "yearOfBirth": 2024 - age,
  "salaryAfterIncrease": salary * 1.1
}
```

### Conditionals

```jsonata
{
  "status": age >= 18 ? "Adult" : "Minor",
  "level": salary > 100000 ? "Senior" : "Junior"
}
```

### String Functions

```jsonata
{
  "nameUpper": $uppercase(name),
  "nameLength": $length(name),
  "firstLetter": $substring(name, 0, 1)
}
```

### Nested Field Access

```jsonata
{
  "department": company.department.name,
  "city": address.location.city
}
```

## Config Example with JSONata

```json
{
  "name": "users",
  "columns": [
    {
      "id": "fullName",
      "type": "string",
      "label": "Full Name",
      "expr": "firstName & ' ' & lastName"
    },
    {
      "id": "status",
      "type": "string",
      "label": "Status",
      "expr": "age >= 18 ? 'Adult' : 'Minor'"
    },
    {
      "id": "yearOfBirth",
      "type": "number",
      "label": "Birth Year",
      "expr": "2024 - age"
    }
  ],
  "dataSource": {
    "type": "local",
    "data": [
      { "firstName": "Alice", "lastName": "Chen", "age": 30 },
      { "firstName": "Bob", "lastName": "Smith", "age": 25 }
    ]
  }
}
```

Rendered columns:
- **Full Name**: "Alice Chen", "Bob Smith"
- **Status**: "Adult", "Adult"
- **Birth Year**: 1994, 1999

## Common Patterns

### Format Currency

```jsonata
{
  "salary": "$" & $string(salary)
}
```

→ "$100000"

### Format Date

```jsonata
{
  "joined": $substring(joinDate, 0, 10)  // YYYY-MM-DD from full ISO
}
```

→ "2020-03-15"

### Uppercase

```jsonata
{
  "department": $uppercase(department)
}
```

→ "ENGINEERING"

### Boolean to Text

```jsonata
{
  "isActive": active ? "Yes" : "No"
}
```

→ "Yes", "No"

### Nested Condition

```jsonata
{
  "level": salary > 150000 ? "Director" : salary > 100000 ? "Senior" : "Junior"
}
```

→ "Director", "Senior", or "Junior"

## Reference

Common JSONata functions:

| Function | Example | Result |
|----------|---------|--------|
| `$string(x)` | `$string(42)` | "42" |
| `$number(x)` | `$number("42")` | 42 |
| `$length(str)` | `$length("Alice")` | 5 |
| `$uppercase(str)` | `$uppercase("alice")` | "ALICE" |
| `$lowercase(str)` | `$lowercase("ALICE")` | "alice" |
| `$substring(str, start, length)` | `$substring("Alice", 0, 1)` | "A" |
| `&` (concat) | `"Hello" & " " & "World"` | "Hello World" |
| `?:` (ternary) | `x > 10 ? "big" : "small"` | depends on x |

## Next Steps

- [Flat Table Config](flat-table-config.md) — Full example with transforms
- [Infinite Table Config](infinite-table-config.md) — With server data
- [Tree Table Config](tree-table-config.md) — Hierarchies and transforms

---

## Further Learning

For advanced JSONata:
- Official docs: https://docs.jsonata.org/
- Try it: https://try.jsonata.org/
