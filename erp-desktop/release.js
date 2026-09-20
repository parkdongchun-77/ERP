// dist/ 의 설치 파일·latest.yml 을 GitHub Release 로 올린다 (gh CLI 인증 사용, 토큰 파일 불필요)
// 사용: node release.js   (전제: npm run dist 로 dist/ 가 만들어져 있어야 함)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const pkg = require("./package.json");
const tag = `v${pkg.version}`;
const dist = path.join(__dirname, "dist");
const { owner, repo } = pkg.build.publish[0];

const assets = ["latest.yml", `ERP-System-Setup-${pkg.version}.exe`, `ERP-System-Setup-${pkg.version}.exe.blockmap`]
  .map((f) => path.join(dist, f));
for (const a of assets) if (!fs.existsSync(a)) { console.error("없음: " + a); process.exit(1); }

const gh = (args) => execFileSync("gh", args, { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" }).trim();

// 이미 같은 태그가 있으면 자산만 교체
let exists = true;
try { gh(["release", "view", tag, "-R", `${owner}/${repo}`, "--json", "tagName"]); } catch { exists = false; }
if (exists) {
  gh(["release", "upload", tag, ...assets, "-R", `${owner}/${repo}`, "--clobber"]);
  console.log(`릴리스 ${tag} 자산 교체 완료`);
} else {
  gh(["release", "create", tag, ...assets, "-R", `${owner}/${repo}`, "--title", `ERP System ${pkg.version}`,
      "--notes", `ERP System 데스크톱 ${pkg.version}\n\n설치: ERP-System-Setup-${pkg.version}.exe\n기존 설치본은 자동으로 이 버전으로 업데이트됩니다.`]);
  console.log(`릴리스 ${tag} 생성 완료`);
}
console.log(`https://github.com/${owner}/${repo}/releases/tag/${tag}`);
