# Null Coalescence Assignment (?=)

Assigns a value only if the target is currently empty or undefined.

## Syntax

```
target ?= expression
```

## Description

The `?=` operator is a conditional assignment. It evaluates the right-hand expression and assigns the result to the left-hand target only if the target does not already have a value. If the target already contains a non-empty value, the expression is skipped and the existing value is preserved.

This is useful for setting default values without overwriting user input or previously computed results.

## Examples

### Setting a Default Value

```expression
DefaultName ?= "Unnamed"
// Sets DefaultName to "Unnamed" only if it is currently empty
```

### Default Numeric Value

```expression
Quantity ?= 1
// If Quantity has no value yet, set it to 1
// If the user already entered a quantity, leave it alone
```

### Default from Another Field

```expression
DisplayName ?= FullName
// Use FullName as the default for DisplayName, but don't overwrite
// if DisplayName was already set
```

### Initializing Computed Defaults

```expression
// Set initial defaults that the user can override
TaxRate ?= 0.08
ShippingMethod ?= "Standard"
Currency ?= "USD"
```

### Combined with Regular Assignment

```expression
// Ordinal 1: Set defaults (only if empty)
DefaultRate ?= 0.05

// Ordinal 2: Compute using the value (whether default or user-entered)
Tax = round(Subtotal * DefaultRate, 2)
```

## Comparison with = (Regular Assignment)

| Operator | Behavior |
|----------|----------|
| `=` | Always assigns, overwriting any existing value |
| `?=` | Only assigns if the target is empty or undefined |

## Related Operators

- [=](./assign.md) - Regular assignment (always overwrites)

## Related Topics

- [Solver Expression Walkthrough](../Solver-Expression-Walkthrough.md) - Expression basics

## Notes

- A value is considered "empty" if it is undefined, null, or an empty string
- Zero (`0`) is not considered empty — `?=` will not overwrite a zero value
- Useful for form defaults that should not overwrite user input on re-solve
