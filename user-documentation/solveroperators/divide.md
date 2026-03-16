# Division Operator (/)

Divides the left operand by the right operand.

## Syntax

```
left / right
```

## Description

The `/` operator performs division on two numeric operands. It uses arbitrary precision arithmetic for accurate results. Division by zero returns `0` rather than causing an error.

## Precedence

The `/` operator has the same precedence as `*` (multiplication) and `%` (modulus). All three are evaluated before `+` and `-`, but after `^` (exponentiation).

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Division

```expression
Average = Total / Count
// With Total = 250, Count = 5
// Result: "50"
```

### Percentage Calculation

```expression
PercentComplete = CompletedItems / TotalItems * 100
```

### With Rounding

```expression
// Division can produce many decimal places; round for display
Rate = round(Amount / Hours, 2)
// With Amount = 1000, Hours = 3
// Result: "333.33"
```

### In a Complex Expression

```expression
// Compute a weighted average
WeightedAvg = (Score1 * Weight1 + Score2 * Weight2) / (Weight1 + Weight2)
```

## Related Operators

- [*](./multiply.md) - Multiplication
- [%](./modulus.md) - Modulus (remainder)
- [^](./exponent.md) - Exponentiation

## Related Functions

- [round](../solverfunctions/round.md) - Round a computed result
- [avg](../solverfunctions/avg.md) - Compute average of an array

## Notes

- Uses arbitrary precision arithmetic
- Division by zero returns `0` (no error is thrown)
- The result is always returned as a string
- For long decimal results, use `round` or `tofixed` to limit precision
