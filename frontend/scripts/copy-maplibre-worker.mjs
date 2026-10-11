// MapLibre 6 ships its web worker as separate ES modules. Bundlers cannot always resolve them,
// so we serve them from /public and point MapLibre at them with setWorkerUrl().
import { cpSync, mkdirSync } from "node:fs";
const src = new URL("../node_modules/maplibre-gl/dist/", import.meta.url);
const dst = new URL("../public/maplibre/", import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(new URL(f, src), new URL(f, dst));
console.log("copied maplibre worker files to public/maplibre");
