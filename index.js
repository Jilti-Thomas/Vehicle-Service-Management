const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- helpers ----------
const clean = (v) => (v === '' || v === undefined ? null : v);

// Turn SQLite errors into messages a workshop user can understand
function friendly(err) {
  const m = err.message || '';
  if (m.includes('UNIQUE')) return 'That value already exists (phone, registration number or service name must be unique).';
  if (m.includes('NOT NULL')) return 'A required field is missing.';
  if (m.includes('FOREIGN KEY')) return 'This record is linked to other records, so it cannot be changed or deleted.';
  if (m.includes('CHECK')) return 'One of the values is out of the allowed range.';
  return m;
}
const wrap = (fn) => (req, res) => {
  try { res.json(fn(req, res)); }
  catch (err) { res.status(400).json({ error: friendly(err) }); }
};

// Generic CRUD for simple tables
function crud(route, table, cols, listSql) {
  const list = listSql || `SELECT * FROM ${table} ORDER BY id DESC`;
  const one = (id) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

  app.get(`/api/${route}`, wrap(() => db.prepare(list).all()));

  app.post(`/api/${route}`, wrap((req) => {
    // Leave out empty fields so column DEFAULT values (e.g. fuel_type) apply
    const used = cols.filter((c) => clean(req.body[c]) !== null);
    const sql = `INSERT INTO ${table} (${used.join(',')}) VALUES (${used.map(() => '?').join(',')})`;
    const info = db.prepare(sql).run(...used.map((c) => req.body[c]));
    return one(info.lastInsertRowid);
  }));

  app.put(`/api/${route}/:id`, wrap((req) => {
    const sql = `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`;
    const info = db.prepare(sql).run(...cols.map((c) => clean(req.body[c])), req.params.id);
    if (!info.changes) throw new Error('Record not found');
    return one(req.params.id);
  }));

  app.delete(`/api/${route}/:id`, wrap((req) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (!info.changes) throw new Error('Record not found');
    return { deleted: true };
  }));
}

crud('customers', 'customers', ['name', 'phone', 'email', 'address'],
  `SELECT c.*, (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id) AS vehicle_count
   FROM customers c ORDER BY c.id DESC`);

crud('vehicles', 'vehicles', ['customer_id', 'reg_no', 'make', 'model', 'year', 'fuel_type'],
  `SELECT v.*, c.name AS customer_name FROM vehicles v
   JOIN customers c ON c.id = v.customer_id ORDER BY v.id DESC`);

crud('mechanics', 'mechanics', ['name', 'phone', 'specialization'],
  `SELECT m.*, (SELECT COUNT(*) FROM job_cards j WHERE j.mechanic_id = m.id
                AND j.status IN ('Pending','In Progress')) AS open_jobs
   FROM mechanics m ORDER BY m.id DESC`);

crud('services', 'services', ['name', 'description', 'price']);

// ---------- job cards ----------
const JOB_SELECT = `
  SELECT j.*, v.reg_no, v.make, v.model, c.name AS customer_name, c.phone AS customer_phone,
         m.name AS mechanic_name,
         COALESCE((SELECT SUM(price)  FROM job_card_services WHERE job_card_id = j.id), 0) AS total,
         COALESCE((SELECT SUM(amount) FROM payments          WHERE job_card_id = j.id), 0) AS paid
  FROM job_cards j
  JOIN vehicles  v ON v.id = j.vehicle_id
  JOIN customers c ON c.id = v.customer_id
  LEFT JOIN mechanics m ON m.id = j.mechanic_id`;

function jobDetail(id) {
  const job = db.prepare(`${JOB_SELECT} WHERE j.id = ?`).get(id);
  if (!job) throw new Error('Job card not found');
  job.services = db.prepare(
    `SELECT s.id, s.name, js.price FROM job_card_services js
     JOIN services s ON s.id = js.service_id WHERE js.job_card_id = ? ORDER BY s.name`).all(id);
  job.payments = db.prepare('SELECT * FROM payments WHERE job_card_id = ? ORDER BY id').all(id);
  return job;
}

app.get('/api/jobcards', wrap((req) => {
  const { status } = req.query;
  return status
    ? db.prepare(`${JOB_SELECT} WHERE j.status = ? ORDER BY j.id DESC`).all(status)
    : db.prepare(`${JOB_SELECT} ORDER BY j.id DESC`).all();
}));

app.get('/api/jobcards/:id', wrap((req) => jobDetail(req.params.id)));

app.post('/api/jobcards', wrap((req) => {
  const { vehicle_id, mechanic_id, odometer, complaint, service_ids = [] } = req.body;
  if (!vehicle_id) throw new Error('NOT NULL: choose a vehicle');
  if (!service_ids.length) throw new Error('Select at least one service');

  const create = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO job_cards (vehicle_id, mechanic_id, odometer, complaint) VALUES (?,?,?,?)'
    ).run(vehicle_id, clean(mechanic_id), clean(odometer), clean(complaint));
    const jobId = info.lastInsertRowid;
    const add = db.prepare(
      'INSERT INTO job_card_services (job_card_id, service_id, price) SELECT ?, id, price FROM services WHERE id = ?');
    service_ids.forEach((sid) => {
      if (!add.run(jobId, sid).changes) throw new Error(`Service ${sid} does not exist`); // rolls back the whole job card
    });
    return jobId;
  });
  return jobDetail(create());
}));

app.put('/api/jobcards/:id/status', wrap((req) => {
  const { status } = req.body;
  const done = status === 'Completed' || status === 'Delivered';
  const info = db.prepare(
    `UPDATE job_cards SET status = ?,
       completed_at = CASE WHEN ? THEN COALESCE(completed_at, datetime('now')) ELSE NULL END
     WHERE id = ?`).run(status, done ? 1 : 0, req.params.id);
  if (!info.changes) throw new Error('Job card not found');
  return jobDetail(req.params.id);
}));

app.put('/api/jobcards/:id/mechanic', wrap((req) => {
  db.prepare('UPDATE job_cards SET mechanic_id = ? WHERE id = ?').run(clean(req.body.mechanic_id), req.params.id);
  return jobDetail(req.params.id);
}));

app.post('/api/jobcards/:id/payments', wrap((req) => {
  const job = jobDetail(req.params.id);
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw new Error('Enter an amount greater than zero');
  if (amount > job.total - job.paid + 0.001) throw new Error(`Amount is more than the balance of ${job.total - job.paid}`);
  db.prepare('INSERT INTO payments (job_card_id, amount, method) VALUES (?,?,?)')
    .run(req.params.id, amount, req.body.method || 'Cash');
  return jobDetail(req.params.id);
}));

app.delete('/api/jobcards/:id', wrap((req) => {
  db.prepare('DELETE FROM job_cards WHERE id = ?').run(req.params.id);
  return { deleted: true };
}));

// ---------- dashboard ----------
app.get('/api/dashboard', wrap(() => {
  const count = (sql) => db.prepare(sql).get().n;
  const money = db.prepare(`
    SELECT COALESCE(SUM(t.total),0) AS billed, COALESCE(SUM(t.paid),0) AS collected FROM (
      SELECT j.id,
        COALESCE((SELECT SUM(price)  FROM job_card_services WHERE job_card_id = j.id),0) AS total,
        COALESCE((SELECT SUM(amount) FROM payments          WHERE job_card_id = j.id),0) AS paid
      FROM job_cards j) t`).get();
  return {
    customers: count('SELECT COUNT(*) AS n FROM customers'),
    vehicles: count('SELECT COUNT(*) AS n FROM vehicles'),
    openJobs: count("SELECT COUNT(*) AS n FROM job_cards WHERE status IN ('Pending','In Progress')"),
    billed: money.billed,
    collected: money.collected,
    outstanding: money.billed - money.collected,
    byStatus: db.prepare('SELECT status, COUNT(*) AS n FROM job_cards GROUP BY status').all(),
    topServices: db.prepare(
      `SELECT s.name, COUNT(*) AS times, SUM(js.price) AS revenue FROM job_card_services js
       JOIN services s ON s.id = js.service_id GROUP BY s.id ORDER BY times DESC, revenue DESC LIMIT 5`).all(),
    recent: db.prepare(`${JOB_SELECT} ORDER BY j.id DESC LIMIT 5`).all(),
  };
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
