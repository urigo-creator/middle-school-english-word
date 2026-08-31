// 단어 발음 mp3 생성기
// -----------------------------------------------------------------------------
// js/data/dayN.js 안의 모든 영어 단어(en 필드)를 읽어서, audio/words/ 에 아직
// 없는 단어만 macOS 내장 음성(say)으로 mp3를 만들어 넣는다.
//
//   node tools/generate-audio.js
//
// 새 Day를 추가한 뒤 이 스크립트를 한 번 돌리면, 그 Day 단어들의 발음 파일이
// 자동으로 채워진다. (온라인 TTS는 GitHub Pages에서 차단당해서 못 쓰므로,
// 갤럭시 등 speechSynthesis가 안 되는 기기를 위해 파일을 미리 만들어 둔다.)
//
// 필요 도구: macOS `say`, `ffmpeg` (brew install ffmpeg)
// -----------------------------------------------------------------------------

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "js", "data");
const OUT_DIR = path.join(ROOT, "audio", "words");
const VOICE = process.env.SAY_VOICE || "Samantha"; // en_US

// js/script.js 의 slugify 와 반드시 동일해야 한다.
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const dataFiles = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^day\d+\.js$/.test(f))
  .sort();

const words = new Map(); // slug -> 원문
for (const file of dataFiles) {
  const src = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
  for (const m of src.matchAll(/\ben:\s*"([^"]+)"/g)) {
    const raw = m[1];
    words.set(slugify(raw), raw);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let made = 0;
let skipped = 0;
for (const [slug, raw] of [...words].sort()) {
  const mp3 = path.join(OUT_DIR, `${slug}.mp3`);
  if (fs.existsSync(mp3)) {
    skipped++;
    continue;
  }
  const aiff = path.join(os.tmpdir(), `tts_${slug}.aiff`);
  execFileSync("say", ["-v", VOICE, "-o", aiff, raw]);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", aiff,
    "-codec:a", "libmp3lame", "-b:a", "64k", "-ar", "22050", "-ac", "1",
    mp3,
  ]);
  fs.unlinkSync(aiff);
  console.log(`+ ${slug}.mp3  ("${raw}")`);
  made++;
}

console.log(`\n${made} 개 생성, ${skipped} 개 이미 있음, 단어 ${words.size} 개.`);
