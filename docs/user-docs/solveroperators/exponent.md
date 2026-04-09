# Exponentiation Operator (^)

Raises the left operand to the power of the right operand.

## Syntax

```
base ^ exponent
```

## Description

The `^` operator raises a base value to a given power. It uses arbitrary precision arithmetic for accurate results. This is the highest-precedence arithmetic operator.

## Precedence

The `^` operator has the highest precedence among arithmetic operators. It is evaluated before all others.

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Exponentiation

```expression
Squared = Value ^ 2
// With Value = 5
// Result: "25"
```

### Cubing a Value

```expression
Cubed = Side ^ 3
// With Side = 4
// Result: "64"
```

### Square Root via Fractional Exponent

```expression
// Square root is the same as raising to the power of 0.5
SquareRoot = Value ^ 0.5
// With Value = 16
// Result: "4"
```

### In a Complex Expression

```expression
// Exponentiation is evaluated first
WidthCubeArea = Width ^ 3
HeightCubeArea = Height ^ 3
```

### Combined with Other Operators

```expression
// ^ is evaluated before * and +
Result = 2 + 3 ^ 2 * 4
// Equivalent to: 2 + (9 * 4) = 2 + 36 = 38
```

## Related Operators

- [*](./multiply.md) - Multiplication
- [/](./divide.md) - Division

## Related Functions

- [sqrt](../solverfunctions/sqrt.md) - Square root
- [round](../solverfunctions/round.md) - Round a computed result

## Notes

- Uses arbitrary precision arithmetic
- The result is always returned as a string
- Fractional exponents compute roots (e.g. `^ 0.5` for square root)
- Has the highest precedence of all arithmetic operators
