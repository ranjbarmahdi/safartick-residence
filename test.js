const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string);

console.log(isNumeric('1234'));
console.log(isNumeric('123.4'));
console.log(isNumeric('012.3'));
console.log(isNumeric('1234s'));
console.log(isNumeric(''));
console.log(isNumeric('  '));
console.log(isNumeric('  s'));
