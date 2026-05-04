const { parseExpression, astToText } = require("../utils/booleanEvaluator");

function buildCircuitModel(parsed) {
  const model = {
    projectName: "AI Generated Circuit",
    type: parsed.type,
    subtype: parsed.subtype || "general",
    inputs: parsed.inputs,
    outputs: parsed.outputs,
    expressions: parsed.expressions,
    gates: [],
    wires: [],
    metadata: {
      explanation: parsed.explanation || "",
      stateDiagram: parsed.stateDiagram || null,
      notes: parsed.notes || ""
    }
  };

  const counters = { NOT: 0, AND: 0, OR: 0, XOR: 0 };
  const notCache = new Map();
  const inputY = new Map(parsed.inputs.map((input, index) => [input, 95 + index * 72]));
  const outputLayouts = [];

  parsed.outputs.forEach((output, outputIndex) => {
    const ast = parseExpression(parsed.expressions[output]);
    const layout = layoutAst(ast, outputIndex, inputY, parsed.outputs.length);
    outputLayouts.push(layout);
    const built = buildAstGates(ast, model, { counters, notCache, inputY }, layout);
    const outputGate = {
      id: `output_${output}`,
      type: "OUTPUT",
      label: output,
      x: 210 + (layout.maxDepth + 1) * 118,
      y: layout.rootY - 15,
      inputs: [built.signal],
      output
    };
    model.gates.push(outputGate);
    model.wires.push({ from: built.sourceId, to: outputGate.id, signal: built.signal });
  });

  if (parsed.flipFlops && parsed.flipFlops.length) {
    parsed.flipFlops.forEach((name, index) => {
      model.gates.push({
        id: `dff_${name}`,
        type: "D_FLIP_FLOP",
        label: `${name} -> Q${name.replace(/^D/i, "")}`,
        x: 620,
        y: 285 + index * 80,
        inputs: [name, "CLK"],
        output: `Q${name.replace(/^D/i, "")}`
      });
    });
  }

  model.layout = {
    inputs: Object.fromEntries(inputY),
    outputs: Object.fromEntries(parsed.outputs.map((output, index) => [output, outputLayouts[index].rootY])),
    maxDepth: Math.max(1, ...outputLayouts.map((layout) => layout.maxDepth))
  };

  return model;
}

function buildAstGates(ast, model, context, layout) {
  const { counters, notCache } = context;
  if (ast.type === "VAR") {
    return { signal: ast.name, sourceId: ast.name };
  }
  if (ast.type === "CONST") {
    return { signal: String(ast.value), sourceId: String(ast.value) };
  }

  if (ast.type === "NOT") {
    const input = buildAstGates(ast.value, model, context, layout);
    const cacheKey = ast.value.type === "VAR" ? ast.value.name : null;
    if (cacheKey && notCache.has(cacheKey)) {
      return notCache.get(cacheKey);
    }
    const id = `not_${++counters.NOT}`;
    const signal = `${input.signal}_not_${counters.NOT}`;
    const point = layout.positions.get(ast);
    const alignedY = ast.value.type === "VAR" && context.inputY.has(ast.value.name)
      ? context.inputY.get(ast.value.name)
      : point.y;
    model.gates.push({
      id,
      type: "NOT",
      label: astToText(ast),
      x: point.x,
      y: alignedY - 21,
      inputs: [input.signal],
      output: signal
    });
    model.wires.push({ from: input.sourceId, to: id, signal: input.signal });
    const result = { signal, sourceId: id };
    if (cacheKey) notCache.set(cacheKey, result);
    return result;
  }

  const left = buildAstGates(ast.left, model, context, layout);
  const right = buildAstGates(ast.right, model, context, layout);
  const id = `${ast.type.toLowerCase()}_${++counters[ast.type]}`;
  const signal = `${ast.type.toLowerCase()}_${counters[ast.type]}_out`;
  const point = layout.positions.get(ast);
  model.gates.push({
    id,
    type: ast.type,
    label: astToText(ast),
    x: point.x,
    y: point.y - 25,
    inputs: [left.signal, right.signal],
    output: signal
  });
  model.wires.push({ from: left.sourceId, to: id, signal: left.signal });
  model.wires.push({ from: right.sourceId, to: id, signal: right.signal });
  return { signal, sourceId: id };
}

function layoutAst(ast, outputIndex, inputY, outputCount) {
  const positions = new Map();
  const depthByNode = new Map();
  const laneSpacing = 64;
  const outputBand = Math.max(210, inputY.size * 72 + 64);
  const bandStart = 82 + outputIndex * outputBand;
  let syntheticLeafLane = 0;

  function measure(node) {
    if (node.type === "VAR") return { depth: 0, y: inputY.get(node.name) || 120 };
    if (node.type === "CONST") {
      syntheticLeafLane += 1;
      return { depth: 0, y: bandStart + syntheticLeafLane * laneSpacing };
    }
    if (node.type === "NOT") {
      const child = measure(node.value);
      const depth = child.depth + 1;
      depthByNode.set(node, depth);
      positions.set(node, { x: 150 + depth * 118, y: child.y });
      return { depth, y: child.y };
    }
    const left = measure(node.left);
    const right = measure(node.right);
    const depth = Math.max(left.depth, right.depth) + 1;
    const y = (left.y + right.y) / 2;
    depthByNode.set(node, depth);
    positions.set(node, { x: 150 + depth * 118, y });
    return { depth, y };
  }

  const root = measure(ast);
  const minY = Math.min(...[...positions.values()].map((point) => point.y), root.y);
  const shift = Math.max(0, bandStart - minY);
  if (outputCount > 1 && shift) {
    positions.forEach((point) => {
      point.y += shift;
    });
    root.y += shift;
  }

  resolveColumnCollisions(positions);

  return {
    positions,
    rootY: root.y,
    maxDepth: root.depth
  };
}

function resolveColumnCollisions(positions) {
  const minGap = 72;
  const columns = new Map();
  positions.forEach((point) => {
    if (!columns.has(point.x)) columns.set(point.x, []);
    columns.get(point.x).push(point);
  });

  columns.forEach((points) => {
    points.sort((a, b) => a.y - b.y);
    const groups = [];
    points.forEach((point) => {
      const group = groups[groups.length - 1];
      if (!group || point.y - group[group.length - 1].y >= minGap) {
        groups.push([point]);
      } else {
        group.push(point);
      }
    });

    groups.forEach((group) => {
      if (group.length < 2) return;
      const center = group.reduce((sum, point) => sum + point.y, 0) / group.length;
      group.forEach((point, index) => {
        point.y = center + (index - (group.length - 1) / 2) * minGap;
      });
      const minY = Math.min(...group.map((point) => point.y));
      if (minY < 92) {
        const shift = 92 - minY;
        group.forEach((point) => {
          point.y += shift;
        });
      }
    });
  });
}

module.exports = { buildCircuitModel };
