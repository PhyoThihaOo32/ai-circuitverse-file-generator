# AI Logic Diagram Generator

AI Logic Diagram Generator is a local full-stack web app that converts a student's digital logic question into a parsed logic summary, truth table, SVG circuit diagram, embedded CircuitVerse simulator view, explanation, build steps, and stable downloadable artifacts.

## Problem Statement

Students often write Boolean equations, truth-table prompts, state equations, or full-adder expressions in text form. This app helps them turn those questions into a readable circuit diagram and verification artifacts without relying on a simulator-specific private file format.

## Features

- Textarea input for Boolean equations and multi-output circuits.
- Image upload for screenshots or photos of logic questions when `ANTHROPIC_API_KEY` is configured.
- Local parser that works without OpenAI.
- Claude API extraction when `ANTHROPIC_API_KEY` is set, with local parser fallback.
- Embedded local CircuitVerse simulator loaded from `../cv-simulator/simulator-dist`.
- Supports `A'`, `A’`, `!A`, `~A`, implicit AND (`AB`), `*`, `&`, `·`, `+`, `|`, `XOR`, and parentheses.
- Detects multiple output equations, state-equation style D outputs, and full-adder style examples.
- Generates truth tables for all input combinations.
- Builds an internal circuit JSON model with gates and wires.
- Renders an SVG circuit diagram with gate-like symbols.
- Generates simulator-agnostic build steps.
- Exports `.svg`, `.csv`, `.txt`, and internal `.json`.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Optional AI: OpenAI API
- No React and no TypeScript for the MVP

## How To Run

```bash
cd ai-circuitverse-file-generator/backend
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Optional AI image/text extraction:

```bash
cp .env.example .env
# add ANTHROPIC_API_KEY to .env
npm start
```

## How To Use

1. Enter a Boolean expression or multiple equations.
2. Optionally upload a screenshot/photo of the question. Image reading requires `ANTHROPIC_API_KEY`.
3. Click **Generate Circuit**.
4. Review the logic summary, truth table, circuit preview, embedded simulator, and build steps.
5. Download the SVG, CSV, TXT, or JSON artifacts.

Example inputs:

```text
F = A’B’ + B’C’
```

```text
D1 = Q1’Q0 + XQ1
D0 = X’Q0 + Q1Q0’
Z = Q1Q0
```

```text
Sum = A XOR B XOR Cin
Cout = AB + ACin + BCin
```

## API

- `GET /api/health`
- `POST /api/analyze`
- `POST /api/export/svg`
- `POST /api/export/csv`
- `POST /api/export/txt`
- `POST /api/export/json`
- `GET /api/download/:bundleId/:type`

## Limitations

- Uploaded image questions require an Anthropic API key for Claude vision extraction. Text input and local parsing work without Claude.
- Sequential support identifies D-style equations and adds D flip-flop guidance, but full clocked simulation behavior is not implemented.
- The local parser handles common coursework notation, not every Boolean algebra convention.
- Boolean simplification is not included in the MVP; the diagram generally preserves the entered expression.
- The embedded simulator is driven by generated circuit data via `postMessage`; downloadable simulator project-file compatibility is not treated as a stable export.

## Future Improvements

1. PNG export for diagrams.
2. Boolean simplification using Karnaugh map or Quine-McCluskey.
3. Truth-table-to-expression synthesis.
4. Sequential circuit support with clock, state table, and state diagram.
5. Verilog export.
6. User accounts and saved projects.
