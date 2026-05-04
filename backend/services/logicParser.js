const { normalizeQuotes, normalizeExpression, extractIdentifiers } = require("./expressionNormalizer");

function parseLogicQuestion(question) {
  const normalized = normalizeQuotes(question);
  const expressions = {};
  const outputs = [];

  collectEquationLines(normalized).forEach(({ output, expression }) => {
    if (!outputs.includes(output)) outputs.push(output);
    expressions[output] = normalizeExpression(expression).replace(/\^/g, " XOR ");
  });

  if (!outputs.length) {
    throw new Error("No output equations found. Use lines such as F = A'B' + B'C'.");
  }

  const identifiers = extractIdentifiers(Object.values(expressions).join(" "));
  const inputs = identifiers.filter((name) => !outputs.includes(name));
  const hasDOutputs = outputs.some((name) => /^D\d+$/i.test(name));
  const hasStateVars = inputs.some((name) => /^Q\d+$/i.test(name));
  const isFullAdder =
    outputs.includes("Sum") &&
    outputs.includes("Cout") &&
    ["A", "B", "Cin"].every((name) => inputs.includes(name));

  return {
    type: hasDOutputs || hasStateVars ? "sequential" : "combinational",
    subtype: isFullAdder ? "full-adder" : hasDOutputs ? "state-equation" : "general",
    inputs,
    outputs,
    expressions,
    flipFlops: hasDOutputs ? outputs.filter((name) => /^D\d+$/i.test(name)) : [],
    stateVariables: inputs.filter((name) => /^Q\d+$/i.test(name)),
    explanation: buildExplanation(outputs, inputs, hasDOutputs, isFullAdder)
  };
}

function collectEquationLines(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const equations = [];
  let active = null;

  lines.forEach((line) => {
    const match = line.match(/(?:^|[^A-Za-z0-9_])([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      if (active && active.expression.trim()) equations.push(active);
      active = { output: match[1], expression: stripTrailingPromptText(match[2]) };
      return;
    }

    if (active) {
      active.expression = `${active.expression} ${stripTrailingPromptText(line)}`.trim();
    }
  });

  if (active && active.expression.trim()) equations.push(active);
  return equations;
}

function stripTrailingPromptText(text) {
  return String(text || "")
    .replace(/\b(create|draw|build|circuit|for|logic|question)\b/gi, " ")
    .replace(/[.:;]+$/g, "")
    .trim();
}

function buildExplanation(outputs, inputs, hasDOutputs, isFullAdder) {
  if (isFullAdder) {
    return "Detected a full adder with Sum and Cout outputs. Sum is built with XOR logic and Cout with product terms feeding OR logic.";
  }
  if (hasDOutputs) {
    return "Detected state-equation style logic. D outputs can feed D flip-flop inputs with state variables used as feedback.";
  }
  return `Detected ${outputs.length} output equation(s) driven by ${inputs.length} input signal(s).`;
}

module.exports = { parseLogicQuestion };
