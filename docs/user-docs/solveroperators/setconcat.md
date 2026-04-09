# Set Concatenation Operator (,)

Separates arguments in function calls and constructs sets of values.

## Syntax

```
function(arg1, arg2, arg3)
```

## Description

The `,` operator is the argument separator in function calls. It separates individual values passed to a function. In the expression tokenizer, commas are classified as the Set Concatenation operator because they join values into an ordered set that the function receives as its argument list.

## Examples

### Function Arguments

```expression
// Pass multiple arguments to round()
Result = round(Price * Quantity, 2)
// First argument: Price * Quantity
// Second argument: 2 (decimal places)
```

### Conditional with Multiple Arguments

```expression
Grade = if(Score, ">=", 90, "A", "F")
// Arguments: Score, ">=", 90, "A", "F"
```

### String Functions

```expression
Label = concat(FirstName, " ", LastName)
// Arguments: FirstName, " ", LastName
```

### Nested Function Calls

```expression
// Commas separate arguments at each function level
Result = round(sum(Value1, Value2, Value3), 2)
```

## Special Characters in Strings

When you need a literal comma inside a string argument, use the HTML entity `&comma;` to avoid it being interpreted as an argument separator:

```expression
Label = concat(LastName, "&comma; ", FirstName)
// Result: "Smith, John"
```

Use the `resolvehtmlentities` function to convert entities back to characters when needed.

## Related

- [Solver Expression Walkthrough](../Solver-Expression-Walkthrough.md) - Expression basics
- [Solver Functions](../Solver-Functions.md) - Complete function reference

## Notes

- Commas separate function arguments; they are not a general-purpose list operator
- Use `&comma;` for literal commas inside string arguments
- Parentheses define the scope of each function's argument list
