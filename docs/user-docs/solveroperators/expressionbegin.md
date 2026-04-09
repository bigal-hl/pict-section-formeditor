# Expression Begin Directive (:)

Marks the beginning of an inline expression within a MAP or VAR pipeline.

## Syntax

```
MAP VAR name FROM source : expression
```

## Description

The `:` operator signals the start of the expression body in a `MAP ... VAR ... FROM ...` pipeline. Everything after the `:` is the expression that gets evaluated for each element in the source data.

The `:` is used exclusively in MAP expressions and is not a general-purpose operator.

## Examples

### Basic MAP Expression

```expression
// Double each value in a set
Doubled = MAP VAR x FROM Values : x * 2
```

### MAP with Multiple Variables

```expression
// Combine values from two parallel arrays
Combined = MAP VAR a FROM Prices VAR b FROM Quantities : a * b
```

### MAP with Conditional Logic

```expression
// Apply different logic per element
Adjusted = MAP VAR val FROM RawScores : if(val, ">", 100, 100, val)
```

### In a Complex Pipeline

```expression
// Map, then aggregate
ItemTotals = MAP VAR price FROM Prices VAR qty FROM Quantities : price * qty
GrandTotal = SUM(ItemTotals)
```

## Related Operators

- [=](./assign.md) - Assignment operator
- [,](./setconcat.md) - Set concatenation (argument separator)

## Related Topics

- [Solver Expressions Advanced Topics](../Solver-Expressions-Advanced.md) - MAP, VAR, FROM details

## Notes

- The `:` must appear after all VAR/FROM declarations in a MAP expression
- Everything after the `:` is the per-element expression
- The result of the MAP expression is an array of the computed values
