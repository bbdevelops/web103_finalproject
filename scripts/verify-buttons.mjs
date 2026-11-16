import assert from "node:assert/strict";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { parse } from "espree";

const inventory = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (path.endsWith(".jsx")) {
      const tree = parse(await readFile(path, "utf8"), {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        loc: true,
      });
      function visit(node) {
        if (!node || typeof node !== "object") return;
        if (
          node.type === "JSXOpeningElement" &&
          ["button", "ActionButton"].includes(node.name.name)
        ) {
          // The wrapper's native implementation is not an additional action.
          if (!path.endsWith("ActionButton.jsx"))
            inventory.push({
              file: relative(process.cwd(), path).replaceAll("\\", "/"),
              line: node.loc.start.line,
              guarded: node.name.name === "ActionButton",
            });
        }
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === "object") visit(value);
        }
      }
      visit(tree);
    }
  }
}
await scan(resolve("client/src"));
const protectedCount = inventory.filter((item) => item.guarded).length;
const percentage = (protectedCount / inventory.length) * 100;
assert.ok(
  percentage >= 75,
  `Only ${percentage.toFixed(2)}% of button declarations are guarded.`,
);
assert.ok(
  inventory
    .filter((item) => !item.guarded)
    .every((item) => item.file.endsWith("/Toast.jsx")),
  "New unguarded buttons need explicit review.",
);
await mkdir(resolve(".artifacts/m5"), { recursive: true });
await writeFile(
  resolve(".artifacts/m5/button-inventory.json"),
  JSON.stringify(
    {
      protectedCount,
      total: inventory.length,
      percentage,
      excluded:
        "Existing toast dismiss/action controls preserve the teammate implementation and count in the denominator.",
      inventory,
    },
    null,
    2,
  ),
);
console.log(
  `PASS ${protectedCount}/${inventory.length} button declarations guarded (${percentage.toFixed(2)}%); toast controls included in denominator.`,
);
