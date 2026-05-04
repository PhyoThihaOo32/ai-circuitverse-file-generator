const { evaluateExpression } = require("../utils/booleanEvaluator");

const MAX_TRUTH_TABLE_INPUTS = 8; // 2^8 = 256 rows max

function generateTruthTable(parsed) {
  const rows = [];
  const count = parsed.inputs.length;
  if (count > MAX_TRUTH_TABLE_INPUTS) return rows; // skip for very large circuits
  const maxRows = 2 ** count;

  for (let i = 0; i < maxRows; i += 1) {
    const values = {};
    parsed.inputs.forEach((input, index) => {
      const bit = (i >> (count - index - 1)) & 1;
      values[input] = bit;
    });

    const row = { ...values };
    parsed.outputs.forEach((output) => {
      row[output] = evaluateExpression(parsed.expressions[output], values);
    });
    rows.push(row);
  }

  return rows;
}

module.exports = { generateTruthTable };
