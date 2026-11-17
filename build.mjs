// 把曲目 JSON 内联进单文件版：node build.mjs  →  dist/index.html（可双击打开）
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ROOT = import.meta.dirname;
const MARK = 'window.__SONGS_INLINE = null;';
const REQUIRED = ['id', 'title', 'score'];

function fail(msg) {
  console.error('构建失败：' + msg);
  process.exit(1);
}

// <script> 里不能出现 </script>，也不能出现裸的 U+2028/2029
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/\u2028/g, '\u2028')
    .replace(/\u2029/g, '\u2029');
}

const html = await readFile(join(ROOT, 'index.html'), 'utf8');
if (!html.includes(MARK)) fail('index.html 里找不到内联标记：' + MARK);

const manifest = JSON.parse(await readFile(join(ROOT, 'songs', 'index.json'), 'utf8'));
if (!Array.isArray(manifest.songs) || !manifest.songs.length) fail('songs/index.json 里没有曲目');

const seen = new Set();
const songs = [];
for (const id of manifest.songs) {
  if (seen.has(id)) fail('曲目 id 重复：' + id);
  seen.add(id);

  let song;
  try {
    song = JSON.parse(await readFile(join(ROOT, 'songs', id + '.json'), 'utf8'));
  } catch (err) {
    fail('读取 songs/' + id + '.json 失败：' + err.message);
  }
  if (song.id !== id) fail('songs/' + id + '.json 里的 id 是 "' + song.id + '"，与文件名不一致');
  for (const field of REQUIRED) {
    if (!song[field]) fail('songs/' + id + '.json 缺少字段 ' + field);
  }
  if (song.bpm && (song.bpm < 40 || song.bpm > 200)) {
    console.warn('  · ' + id + ' 的 bpm=' + song.bpm + ' 超出滑杆范围 40–200，界面上会被夹到边界');
  }
  songs.push(song);
}

const payload = 'window.__SONGS_INLINE = ' + safeJson({ songs }) + ';';
const out = html.replace(MARK, () => payload);

await mkdir(join(ROOT, 'dist'), { recursive: true });
await writeFile(join(ROOT, 'dist', 'index.html'), out, 'utf8');

const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log('已生成 dist/index.html（' + songs.length + ' 首曲目，' + kb + ' KB）');
