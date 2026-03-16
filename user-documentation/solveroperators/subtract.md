# Subtraction Operator (-)

Subtracts the right operand from the left operand.

## Syntax

```
left - right
```

## Description

The `-` operator performs subtraction on two numeric operands. It uses arbitrary precision arithmetic for accurate results.

## Precedence

The `-` operator has the same precedence as `+` (addition). Both are evaluated after `*`, `/`, `%`, and `^`. Use parentheses to override the default order.

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Subtraction

```expression
Profit = Revenue - Cost
// With Revenue = 500, Cost = 320
// Result: "180"
```

### Computing a Difference

```expression
Remaining = Budget - Spent
// With Budget = 10000, Spent = 7500
// Result: "2500"
```

### Combined with Other Operators

```expression
// Multiplication is evaluated before subtraction
NetPay = GrossPay - TaxRate * GrossPay
// Equivalent to: GrossPay - (TaxRate * GrossPay)

// Use parentheses to subtract first
Discount = (OriginalPrice - Reduction) * Quantity
```

### Subtracting Constants

```expression
AdjustedIndex = RawIndex - 1
```

## Related Operators

- [+](./add.md) - Addition
- [*](./multiply.md) - Multiplication
- [/](./divide.md) - Division

## Related Functions

- [abs](../solverfunctions/abs.md) - Absolute value of a result
- [round](../solverfunctions/round.md) - Round a computed result

## Notes

- Uses arbitrary precision arithmetic
- Non-numeric operands may produce unexpected results
- The result is always returned as a string
