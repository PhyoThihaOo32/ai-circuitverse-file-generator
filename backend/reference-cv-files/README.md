# CircuitVerse Reference `.cv` Files

Use this folder to collect real CircuitVerse offline files and verify the generator.

1. Open https://circuitverse.org/simulator
2. Manually create a small circuit, for example `F = A AND B`.
3. Click **Project**.
4. Click **Save Offline**.
5. Save the `.cv` file.
6. Place that file inside this folder.
7. From `backend/`, run:

```bash
npm run inspect:cv -- reference-cv-files/your-file.cv
```

The analyzer tries raw JSON, compressed JSON, base64, and common text encodings. Use its output to compare how CircuitVerse stores project name, circuit elements, input pins, output pins, gates, wire connections, and positions.

CircuitVerse offline `.cv` compatibility must be verified against real Save Offline files because the internal format may change.
