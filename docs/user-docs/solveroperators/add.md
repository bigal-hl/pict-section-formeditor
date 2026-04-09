# Addition Operator (+)

Adds two numeric values together.

## Syntax

```
left + right
```

## Description

The `+` operator performs addition on two numeric operands. It uses arbitrary precision arithmetic, so results are accurate even for very large or very small numbers.

When used in a solver expression, the `+` operator is one of the standard arithmetic operators and has lower precedence than `*`, `/`, `%`, and `^`.

## Precedence

The `+` operator has the same precedence as `-` (subtraction). Both are evaluated after `*`, `/`, `%`, and `^`. Use parentheses to override the default order.

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Addition

```expression
Total = Price + Tax
// With Price = 100, Tax = 8.50
// Result: "108.50"
```

### Chaining Multiple Additions

```expression
GrandTotal = Subtotal + Tax + ShippingFee
```

### Combined with Other Operators

```expression
// Multiplication is evaluated before addition
Result = Price + Tax * Quantity
// Equivalent to: Price + (Tax * Quantity)

// Use parentheses to add first
Result = (Price + Tax) * Quantity
```

### Adding Constants

```expression
AdjustedScore = RawScore + 10
```

## Related Operators

- [-](./subtract.md) - Subtraction
- [*](./multiply.md) - Multiplication
- [/](./divide.md) - Division

## Related Functions

- [sum](../solverfunctions/sum.md) - Sum all values in an array
- [round](../solverfunctions/round.md) - Round a computed result

## Notes

- Uses arbitrary precision arithmetic
- Non-numeric operands may produce unexpected results
- The result is always returned as a string
