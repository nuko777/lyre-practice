// 曲目数据体检：npm run check
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ROOT = import.meta.dirname;
const DIR = join(ROOT, '..', 'songs');
const KEYS = new Set('QWERTYUASDFGHJZXCVBNM');
const problems = [];
const warns = [];

const files = (await readdir(DIR)).filter((f) => f.endsWith('.json') && f !== 'index.json');
const manifest = JSON.parse(await readFile(join(DIR, 'index.json'), 'utf8'));

for (const id of manifest.songs) {
  if (!files.includes(id + '.json')) problems.push(`index.json 列了 ${id}，但没有 songs/${id}.json`);
}

for (const file of files) {
  const id = basename(file, '.json');
  if (!manifest.songs.includes(id)) warns.push(`songs/${file} 没写进 index.json，不会被加载`);

  const song = JSON.parse(await readFile(join(DIR, file), 'utf8'));
  const tag = 'songs/' + file;

  if (song.id !== id) problems.push(`${tag}: id "${song.id}" 与文件名不一致`);
  for (const f of ['title', 'score']) if (!song[f]) problems.push(`${tag}: 缺少 ${f}`);
  if (!(song.bpm >= 40 && song.bpm <= 200)) problems.push(`${tag}: bpm=${song.bpm} 超出 40–200`);
  const bpb = song.beatsPerMeasure || 4;
  if (!(bpb >= 1 && bpb <= 12)) problems.push(`${tag}: beatsPerMeasure=${song.beatsPerMeasure} 不合法`);

  // 扫谱面
  const src = String(song.score || '').replace(/\|/g, ' | ');
  const tokens = src.match(/\[[^\]]*\](?::[0-9.]+)?|[^\s\[\]]+/g) || [];
  let beats = 0, notes = 0, bar = 0, bad = 0;
  for (const tok of tokens) {
    if (tok === '|') { if (bar > bpb + 1e-6) warns.push(`${tag}: 有一小节 ${bar} 拍，超过拍号`); bar = 0; continue; }
    let t = tok, total = null, grp = null;
    const g = /^\[([^\]]*)\](?::([0-9.]+))?$/.exec(t);
    if (g) {
      const inner = g[1].trim().split(/\s+/).filter(Boolean);
      total = g[2] ? parseFloat(g[2]) : 1;
      grp = inner.length ? inner : ['0'];
      for (const x of grp) {
        const k = x.replace(/:.*$/, '').toUpperCase();
        if (!(k === '0' || k === '-' || k === '.')) {
          if (k.split('+').some((y) => y && !KEYS.has(y))) bad++;
          else notes++;
        }
      }
      beats += total; bar += total;
      continue;
    }
    const m = /^(.+):([0-9.]+)$/.exec(t);
    if (m) { t = m[1]; total = parseFloat(m[2]); }
    if (total == null) total = 1;
    const k = t.toUpperCase();
    if (k !== '0' && k !== '-' && k !== '.') {
      if (k.split('+').some((y) => y && !KEYS.has(y))) bad++;
      else notes++;
    }
    beats += total; bar += total;
  }
  if (bad) problems.push(`${tag}: 有 ${bad} 个记号含 21 键以外的字母`);
  if (!notes) problems.push(`${tag}: 没有可用音符`);
  console.log(`${id.padEnd(14)} ${String(notes).padStart(4)} 音  ${beats.toFixed(1).padStart(7)} 拍  ${bpb}/4`);
}

for (const w of warns) console.warn('警告 · ' + w);
for (const p of problems) console.error('错误 · ' + p);
if (problems.length) { console.error(`\n${problems.length} 个错误`); process.exit(1); }
console.log(`\n${files.length} 首曲目检查通过${warns.length ? `（${warns.length} 条警告）` : ''}`);
