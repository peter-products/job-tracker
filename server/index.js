import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAll, getById, insert, update, remove } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3457;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/api/jobs', (req, res) => {
  res.json(getAll());
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

app.post('/api/jobs', (req, res) => {
  const defaults = {
    title: '', company: '', url: '', date_posted: '', salary_range: '',
    role_category: '', company_stage: '', company_size: '', location: '',
    remote_type: '', fit_notes: '', recruiter_contact: '',
    connections_first: '', connections_second: 0,
    interview_stage: 'Saved', applied: false
  };
  const job = insert({ ...defaults, ...req.body });
  res.json(job);
});

app.patch('/api/jobs/:id', (req, res) => {
  const job = update(req.params.id, req.body);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

app.delete('/api/jobs/:id', (req, res) => {
  remove(req.params.id);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Job Tracker running at http://localhost:${PORT}`);
});
