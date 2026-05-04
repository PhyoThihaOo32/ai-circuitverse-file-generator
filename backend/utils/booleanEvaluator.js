const { normalizeExpression, splitCompoundIdentifier } = require("../services/expressionNormalizer");

function tokenize(expression) {
  const input = normalizeExpression(expression);
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      let value = char;
      i += 1;
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
        value += input[i];
        i += 1;
      }
      splitCompoundIdentifier(value).forEach((part) => tokens.push({ type: "IDENT", value: part }));
      continue;
    }
    if (char === "0" || char === "1") {
      tokens.push({ type: "CONST", value: Number(char) });
      i += 1;
      continue;
    }
    if (["!", "~", "'", "+", "|", "*", "&", "^", "(", ")"].includes(char)) {
      tokens.push({ type: char, value: char });
      i += 1;
      continue;
    }
    throw new Error(`Unsupported character in expression: ${char}`);
  }

  return insertImplicitAnd(tokens);
}

function startsFactor(token) {
  return token && (token.type === "IDENT" || token.type === "CONST" || token.type === "!" || token.type === "~" || token.type === "(");
}

function endsFactor(token) {
  return token && (token.type === "IDENT" || token.type === "CONST" || token.type === "'" || token.type === ")");
}

function insertImplicitAnd(tokens) {
  const result = [];
  tokens.forEach((token, index) => {
    const previous = result[result.length - 1];
    if (index > 0 && endsFactor(previous) && startsFactor(token)) {
      result.push({ type: "*", value: "*" });
    }
    result.push(token);
  });
  return result;
}

function parseExpression(expression) {
  const tokens = tokenize(expression);
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume(type) {
    const token = peek();
    if (!token || (type && token.type !== type)) {
      throw new Error(`Expected ${type || "token"} but found ${token ? token.type : "end"}`);
    }
    position += 1;
    return token;
  }

  function parseOr() {
    let node = parseXor();
    while (peek() && (peek().type === "+" || peek().type === "|")) {
      consume();
      node = { type: "OR", left: node, right: parseXor() };
    }
    return node;
  }

  function parseXor() {
    let node = parseAnd();
    while (peek() && peek().type === "^") {
      consume("^");
      node = { type: "XOR", left: node, right: parseAnd() };
    }
    return node;
  }

  function parseAnd() {
    let node = parseUnary();
    while (peek() && (peek().type === "*" || peek().type === "&")) {
      consume();
      node = { type: "AND", left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (peek() && (peek().type === "!" || peek().type === "~")) {
      consume();
      return { type: "NOT", value: parseUnary() };
    }
    let node = parsePrimary();
    while (peek() && peek().type === "'") {
      consume("'");
      node = { type: "NOT", value: node };
    }
    return node;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("Unexpected end of expression.");
    if (token.type === "IDENT") return { type: "VAR", name: consume("IDENT").value };
    if (token.type === "CONST") return { type: "CONST", value: consume("CONST").value };
    if (token.type === "(") {
      consume("(");
      const node = parseOr();
      consume(")");
      return node;
    }
    throw new Error(`Unexpected token: ${token.type}`);
  }

  const ast = parseOr();
  if (position !== tokens.length) throw new Error(`Unexpected token: ${peek().type}`);
  return ast;
}

function evaluateAst(ast, values) {
  switch (ast.type) {
    case "VAR":
      return Boolean(values[ast.name]);
    case "CONST":
      return Boolean(ast.value);
    case "NOT":
      return !evaluateAst(ast.value, values);
    case "AND":
      return evaluateAst(ast.left, values) && evaluateAst(ast.right, values);
    case "OR":
      return evaluateAst(ast.left, values) || evaluateAst(ast.right, values);
    case "XOR":
      return evaluateAst(ast.left, values) !== evaluateAst(ast.right, values);
    default:
      throw new Error(`Unknown AST node type: ${ast.type}`);
  }
}

function evaluateExpression(expression, values) {
  return evaluateAst(parseExpression(expression), values) ? 1 : 0;
}

function astToText(ast) {
  switch (ast.type) {
    case "VAR":
      return ast.name;
    case "CONST":
      return String(ast.value);
    case "NOT":
      return `${astToText(ast.value)}'`;
    case "AND":
      return `${astToText(ast.left)} · ${astToText(ast.right)}`;
    case "OR":
      return `${astToText(ast.left)} + ${astToText(ast.right)}`;
    case "XOR":
      return `${astToText(ast.left)} XOR ${astToText(ast.right)}`;
    default:
      return "";
  }
}

module.exports = {
  tokenize,
  parseExpression,
  evaluateExpression,
  evaluateAst,
  astToText
};
