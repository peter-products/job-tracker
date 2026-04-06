import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/jobs.json');

function read() {
  if (!fs.existsSync(DB_PATH)) return { jobs: [], nextId: 1 };
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getAll() {
  return read().jobs;
}

export function getById(id) {
  return read().jobs.find(j => j.id === Number(id));
}

export function insert(fields) {
  const data = read();
  const job = { id: data.nextId++, created_at: new Date().toISOString(), ...fields };
  data.jobs.unshift(job);
  write(data);
  return job;
}

export function update(id, fields) {
  const data = read();
  const idx = data.jobs.findIndex(j => j.id === Number(id));
  if (idx === -1) return null;
  data.jobs[idx] = { ...data.jobs[idx], ...fields };
  write(data);
  return data.jobs[idx];
}

export function remove(id) {
  const data = read();
  data.jobs = data.jobs.filter(j => j.id !== Number(id));
  write(data);
}
