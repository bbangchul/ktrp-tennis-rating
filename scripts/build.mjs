import { cp, mkdir, rm } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("src/", root), dist, { recursive: true });
await cp(new URL("public/", root), dist, { recursive: true });
console.log("dist 배포 파일 생성 완료");
