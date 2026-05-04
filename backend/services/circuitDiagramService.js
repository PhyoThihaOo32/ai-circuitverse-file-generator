function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateDiagramSvg(circuitModel) {
  const inputs = circuitModel.inputs || [];
  const gates = circuitModel.gates || [];
  const inputY = new Map(
    Object.entries(circuitModel.layout?.inputs || {}).length
      ? Object.entries(circuitModel.layout.inputs)
      : inputs.map((input, index) => [input, 110 + index * 90])
  );
  const nodeMap = new Map();
  const inputNodes = inputs.map((input) => {
    const node = { id: input, type: "INPUT", label: input, x: 34, y: Number(inputY.get(input) || 95) - 16, width: 70, height: 32 };
    nodeMap.set(input, node);
    return node;
  });

  gates.forEach((gate) => {
    nodeMap.set(gate.id, normalizeNode(gate));
  });

  const bounds = calculateBounds([...inputNodes, ...gates.map(normalizeNode)]);
  const width = Math.max(640, bounds.maxX + 56);
  const height = Math.max(340, bounds.maxY + 64);

  const wires = (circuitModel.wires || []).map((wire) => drawWire(wire, nodeMap)).join("\n");
  const nodes = [...inputNodes, ...gates.map(normalizeNode)].map(drawNode).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Generated circuit diagram">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#67e8f9"/>
  </marker>
</defs>
<rect width="100%" height="100%" fill="#08111f"/>
<text x="24" y="28" font-family="Arial" font-size="16" font-weight="700" fill="#f8fafc">${escapeXml(circuitModel.projectName || "AI Generated Circuit")}</text>
<text x="24" y="48" font-family="Arial" font-size="11" fill="#9fb6c8">${escapeXml(buildSubtitle(circuitModel))}</text>
${wires}
${nodes}
</svg>`;
}

function normalizeNode(node) {
  const sizes = {
    INPUT: [92, 36],
    OUTPUT: [76, 32],
    NOT: [58, 42],
    AND: [76, 50],
    OR: [82, 52],
    XOR: [88, 52],
    D_FLIP_FLOP: [104, 62]
  };
  const [width, height] = sizes[node.type] || [104, 58];
  return { ...node, width, height };
}

function calculateBounds(nodes) {
  return nodes.reduce(
    (bounds, node) => ({
      maxX: Math.max(bounds.maxX, (node.x || 0) + (node.width || 0)),
      maxY: Math.max(bounds.maxY, (node.y || 0) + (node.height || 0))
    }),
    { maxX: 0, maxY: 0 }
  );
}

function drawWire(wire, nodeMap) {
  const from = nodeMap.get(wire.from);
  const to = nodeMap.get(wire.to);
  if (!from || !to) return "";

  const start = outputAnchor(from);
  const end = inputAnchor(to, wire.signal);
  const path = wirePath(start, end, to.type);
  const label = wire.signal && !wire.signal.includes("_out") && !wire.signal.includes("_not_")
    ? `<text x="${start.x + 5}" y="${start.y - 5}" font-family="Arial" font-size="9" fill="#a7f3d0">${escapeXml(wire.signal)}</text>`
    : "";

  return `<path d="${path}" stroke="#67e8f9" stroke-width="2.2" fill="none" marker-end="url(#arrow)"/>
${label}`;
}

function wirePath(start, end, targetType) {
  if (Math.abs(start.y - end.y) <= 4) {
    return `M ${start.x} ${end.y} L ${end.x} ${end.y}`;
  }

  const gap = end.x - start.x;
  const elbowPadding = targetType === "OUTPUT" ? 18 : 14;
  const elbowX = Math.max(start.x + 18, end.x - elbowPadding);
  return `M ${start.x} ${start.y} L ${elbowX} ${start.y} L ${elbowX} ${end.y} L ${end.x} ${end.y}`;
}

function outputAnchor(node) {
  if (node.type === "NOT") return { x: node.x + node.width + 8, y: node.y + node.height / 2 };
  if (node.type === "AND" || node.type === "OR" || node.type === "XOR") return { x: node.x + node.width, y: node.y + node.height / 2 };
  return { x: node.x + node.width, y: node.y + node.height / 2 };
}

function inputAnchor(node, signal) {
  if (!node.inputs || node.inputs.length <= 1) return { x: node.x, y: node.y + node.height / 2 };
  const index = Math.max(0, node.inputs.indexOf(signal));
  const gap = node.height / (node.inputs.length + 1);
  return { x: node.x, y: node.y + gap * (index + 1) };
}

function drawNode(node) {
  switch (node.type) {
    case "INPUT":
      return drawPin(node, "#cffafe", "#0891b2");
    case "OUTPUT":
      return drawPin(node, "#f8fafc", "#0891b2");
    case "NOT":
      return drawNotGate(node);
    case "AND":
      return drawAndGate(node);
    case "OR":
      return drawOrGate(node, false);
    case "XOR":
      return drawOrGate(node, true);
    case "D_FLIP_FLOP":
      return drawFlipFlop(node);
    default:
      return drawPin(node, "#e0f2fe", "#0891b2");
  }
}

function drawPin(node, fill, stroke) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(node.label || node.id)}</text>
</g>`;
}

function drawNotGate(node) {
  const x = node.x;
  const y = node.y;
  const h = node.height;
  const w = node.width - 10;
  return `<g>
  <path d="M ${x} ${y + 6} L ${x} ${y + h - 6} L ${x + w - 10} ${y + h / 2} Z" fill="#e0f2fe" stroke="#22d3ee" stroke-width="2"/>
  <circle cx="${x + w - 2}" cy="${y + h / 2}" r="5" fill="#08111f" stroke="#22d3ee" stroke-width="2"/>
  <text x="${x + w / 2 - 5}" y="${y + h + 13}" text-anchor="middle" font-family="Arial" font-size="11" fill="#f8fafc">${escapeXml(node.label)}</text>
</g>`;
}

function drawAndGate(node) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;
  return `<g>
  <path d="M ${x} ${y} L ${x + w * 0.52} ${y} C ${x + w} ${y}, ${x + w} ${y + h}, ${x + w * 0.52} ${y + h} L ${x} ${y + h} Z" fill="#e0f2fe" stroke="#22d3ee" stroke-width="2"/>
  ${drawInputTicks(node)}
  <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#0f172a">AND</text>
  <text x="${x + w / 2}" y="${y + h + 13}" text-anchor="middle" font-family="Arial" font-size="10" fill="#f8fafc">${escapeXml(shortLabel(node.label))}</text>
</g>`;
}

function drawOrGate(node, isXor) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;
  const offset = isXor ? 9 : 0;
  const xorCurve = isXor ? `<path d="M ${x} ${y + 3} C ${x + 18} ${y + h / 2}, ${x + 18} ${y + h / 2}, ${x} ${y + h - 3}" fill="none" stroke="#22d3ee" stroke-width="2"/>` : "";
  return `<g>
  ${xorCurve}
  <path d="M ${x + offset} ${y + 2} C ${x + w * 0.34} ${y + 4}, ${x + w * 0.75} ${y + 14}, ${x + w} ${y + h / 2} C ${x + w * 0.75} ${y + h - 14}, ${x + w * 0.34} ${y + h - 4}, ${x + offset} ${y + h - 2} C ${x + 20 + offset} ${y + h / 2}, ${x + 20 + offset} ${y + h / 2}, ${x + offset} ${y + 2} Z" fill="#e0f2fe" stroke="#22d3ee" stroke-width="2"/>
  ${drawInputTicks(node)}
  <text x="${x + w / 2 + 7}" y="${y + h / 2 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#0f172a">${isXor ? "XOR" : "OR"}</text>
  <text x="${x + w / 2}" y="${y + h + 13}" text-anchor="middle" font-family="Arial" font-size="10" fill="#f8fafc">${escapeXml(shortLabel(node.label))}</text>
</g>`;
}

function drawInputTicks(node) {
  const inputs = node.inputs || [];
  if (!inputs.length) return "";
  const gap = node.height / (inputs.length + 1);
  return inputs
    .map((input, index) => {
      const y = node.y + gap * (index + 1);
      return `<line x1="${node.x - 7}" y1="${y}" x2="${node.x + 7}" y2="${y}" stroke="#67e8f9" stroke-width="2"/><text x="${node.x - 9}" y="${y - 4}" text-anchor="end" font-family="Arial" font-size="9" fill="#a7f3d0">${escapeXml(cleanSignal(input))}</text>`;
    })
    .join("");
}

function drawFlipFlop(node) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
  <text x="${x + w / 2}" y="${y + 28}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#0f172a">D FLIP-FLOP</text>
  <text x="${x + w / 2}" y="${y + 50}" text-anchor="middle" font-family="Arial" font-size="12" fill="#0f172a">${escapeXml(node.label)}</text>
</g>`;
}

function shortLabel(label) {
  const text = String(label || "");
  return text.length > 22 ? `${text.slice(0, 19)}...` : text;
}

function cleanSignal(signal) {
  return String(signal || "")
    .replace(/_not_\d+$/, "'")
    .replace(/_(out|\d+)$/g, "");
}

function buildSubtitle(circuitModel) {
  const inputs = (circuitModel.inputs || []).join(", ");
  const outputs = (circuitModel.outputs || []).join(", ");
  return `Inputs: ${inputs || "none"}   Outputs: ${outputs || "none"}`;
}

module.exports = { generateDiagramSvg };
