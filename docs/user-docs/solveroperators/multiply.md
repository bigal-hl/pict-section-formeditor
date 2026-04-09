# Multiplication Operator (*)

Multiplies two numeric values together.

## Syntax

```
left * right
```

## Description

The `*` operator performs multiplication on two numeric operands. It uses arbitrary precision arithmetic for accurate results, even with very large numbers or many decimal places.

## Precedence

The `*` operator has the same precedence as `/` (division) and `%` (modulus). All three are evaluated before `+` and `-`, but after `^` (exponentiation).

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Multiplication

```expression
Area = Height * Width
// With Height = 12, Width = 8
// Result: "96"
```

### Computing a Product with Multiple Factors

```expression
Volume = Length * Width * Height
```

### Combined with Addition

```expression
// Multiplication is evaluated before addition
Total = BasePrice + TaxRate * BasePrice
// Equivalent to: BasePrice + (TaxRate * BasePrice)
```

### Using Parentheses

```expression
// Force addition before multiplication
Result = (Price + Tax) * Quantity
```

### With Rounding

```expression
// Multiply and round to 2 decimal places
Cost = round(UnitPrice * Quantity, 2)
```

## Related Operators

- [/](./divide.md) - Division
- [^](./exponent.md) - Exponentiation
- [+](./add.md) - Addition
- [-](./subtract.md) - Subtraction

## Related Functions

- [round](../solverfunctions/round.md) - Round a computed result
- [tofixed](../solverfunctions/tofixed.md) - Format to fixed decimal places

## Notes

- Uses arbitrary precision arithmetic
- Non-numeric operands may produce unexpected results
- The result is always returned as a string
