import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dir, "..");
const sourcePath = resolve(
  workspaceRoot,
  "packages/pancake-client/openapi/openapi.yaml",
);
const outputPath = resolve(
  workspaceRoot,
  "packages/pancake-client/src/generated/schema.ts",
);

const invalidProperties = "      properties:\n        type: object";
const validAdditionalProperties = "      additionalProperties: true";
const expectedPatchCount = 6;

const source = await Bun.file(sourcePath).text();
const occurrences = source.split(invalidProperties).length - 1;

if (occurrences !== expectedPatchCount) {
  throw new Error(
    `Expected ${expectedPatchCount} invalid dynamic-map schemas, found ${occurrences}. Review openapi/PATCHES.md and the upstream schema.`,
  );
}

const patched = source.replaceAll(
  invalidProperties,
  validAdditionalProperties,
);
const temporaryDirectory = await mkdtemp(join(tmpdir(), "pancake-openapi-"));
const patchedPath = join(temporaryDirectory, "openapi.patched.yaml");

try {
  await writeFile(patchedPath, patched, "utf8");

  const process = Bun.spawn(
    [
      resolve(workspaceRoot, "node_modules/.bin/openapi-typescript"),
      patchedPath,
      "--output",
      outputPath,
    ],
    { cwd: workspaceRoot, stdout: "inherit", stderr: "inherit" },
  );

  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`openapi-typescript exited with code ${exitCode}`);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
