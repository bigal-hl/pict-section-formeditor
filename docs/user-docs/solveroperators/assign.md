# Assignment Operator (=)

Assigns the result of the right-hand expression to the left-hand target.

## Syntax

```
target = expression
```

## Description

The `=` operator is the assignment operator in solver expressions. It evaluates the expression on the right side and stores the result in the variable or form input identified by the left side.

The left-hand target can be:
- A form input hash (writes the result to that input)
- A temporary variable name (stores a value for use in later expressions)

## Examples

### Assigning to a Form Input

```expression
Area = Height * Width
// Computes Height * Width and writes the result to the input with hash "Area"
```

### Assigning a Constant

```expression
DefaultRate = 0.05
// Sets DefaultRate to 0.05
```

### Assigning a Computed Value

```expression
Tax = round(Subtotal * TaxRate, 2)
```

### Assigning a String

```expression
Status = if(Total, ">=", 1000, "High Value", "Standard")
```

### Using Temporary Variables

```expression
// Solver ordinal 1: compute intermediates
TempSubtotal = Price * Quantity
TempTax = round(TempSubtotal * 0.08, 2)

// Solver ordinal 2: compute final values using intermediates
GrandTotal = TempSubtotal + TempTax
```

### Expressions Without Assignment

Not all expressions need an assignment. Some functions perform side effects directly:

```expression
// These call functions without storing a return value
SetGroupVisibility("Products", "Details", if(ShowDetails, "==", 1, 1, 0))
ColorSectionBackground("Summary", "#E0F0E0", 1)
```

## Related Operators

- [?=](./nullcoalesce.md) - Null coalescence assignment (assign only if target is empty)
- [:](./expressionbegin.md) - Expression begin directive

## Related Topics

- [Solver Expression Walkthrough](../Solver-Expression-Walkthrough.md) - Expression basics
- [Solvers](../Solvers.md) - How solvers execute

## Notes

- The left-hand target is case-sensitive
- If the target matches a form input hash, the computed value is written to that input
- If the target does not match any input, it is treated as a temporary variable
- The `=` operator is evaluated after all arithmetic and function calls on the right side
