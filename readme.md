csv-sql
=======

A node-based tool for running SQL queries on CSV files. This project currently has
somewhat limited functionality, and was mainly created as a way to learn more about
SQL implementation. For a similar tool with more features, try
[q - Text as Data](http://harelba.github.io/q/).

Version 0.1 Checklist
---------------------

- [X] Literal identifiers using back-ticks.
- [X] Correct operator precedence.
- [ ] [Correct handling of `NULL`, following three-valued logic, including the `IS` and
       `IS NOT` operators.](https://en.wikipedia.org/wiki/Null_(SQL))
- [x] `LIKE` operator.
- [X] `GROUP BY`.
- [X] Aggregate functions.
- [X] `COUNT(*)` (synonym for `COUNT(1)`).
- [X] `HAVING`.
- [X] `CASE`.
- [ ] `IN` operator.
- [ ] More built-in functions.
- [ ] Improved error messages.
- [X] Reading input from stdin, rather than a file.

Future
------

- [ ] `DISTINCT`.
- [ ] User-defined functions provided through node modules.
- [ ] Joins.
- [ ] Compiling expressions into JS functions using `new Function`. This should
      give a very large speed up over the current AST interpreter approach.
