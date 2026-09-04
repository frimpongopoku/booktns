import { readFileSync } from "node:fs";
import path from "node:path";

// Read from disk at startup rather than `import pkg from "../package.json"`:
// with rootDir=src the compiled output lives in dist/ and a JSON import would
// resolve to a path that doesn't exist there. The Docker image sets
// WORKDIR /app and copies package.json alongside dist/, so process.cwd() is
// correct in both local and container runs.
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const API_VERSION = readVersion();
