const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string);

const facilities = {};
const capacityKey = Object.keys(facilities).find((item) => item.includes('ظرفیت'));

console.log(capacityKey);
