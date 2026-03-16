# Modulus Operator (%)

Returns the remainder after dividing the left operand by the right operand.

## Syntax

```
left % right
```

## Description

The `%` operator computes the modulus (remainder) of dividing the left operand by the right operand. It uses arbitrary precision arithmetic.

## Precedence

The `%` operator has the same precedence as `*` (multiplication) and `/` (division). All three are evaluated before `+` and `-`, but after `^` (exponentiation).

| Precedence | Operators |
|------------|-----------|
| Highest | `^` |
| | `*` `/` `%` |
| Lowest | `+` `-` |

## Examples

### Basic Modulus

```expression
Remainder = 7 % 3
// Result: "1"
```

### Check for Even/Odd

```expression
// Use if() to test the remainder
Parity = if(Value % 2, "==", 0, "Even", "Odd")
```

### Cyclic Index

```expression
// Wrap an index into a fixed range (e.g. 0-11 for months)
MonthIndex = RawMonth % 12
```

### Combined with Division

```expression
// Get whole part and remainder separately
WholePart = floor(Total / GroupSize)
LeftOver = Total % GroupSize
```

## Related Operators

- [/](./divide.md) - Division
- [*](./multiply.md) - Multiplication

## Related Functions

- [floor](../solverfunctions/floor.md) - Round down to integer
- [round](../solverfunctions/round.md) - Round a computed result

## Notes

- Uses arbitrary precision arithmetic
- The result is always returned as a string
- The sign of the result matches the sign of the left operand
