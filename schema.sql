-- Vehicle Service and Management System : relational schema (SQLite / ANSI SQL)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  email       TEXT,
  address     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  reg_no       TEXT NOT NULL UNIQUE,
  make         TEXT NOT NULL,
  model        TEXT NOT NULL,
  year         INTEGER CHECK (year BETWEEN 1980 AND 2100),
  fuel_type    TEXT NOT NULL DEFAULT 'Petrol'
               CHECK (fuel_type IN ('Petrol','Diesel','CNG','Electric','Hybrid')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mechanics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  phone           TEXT,
  specialization  TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  price        REAL NOT NULL CHECK (price >= 0)
);

-- One job card = one visit of a vehicle to the workshop
CREATE TABLE IF NOT EXISTS job_cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id    INTEGER NOT NULL,
  mechanic_id   INTEGER,
  status        TEXT NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending','In Progress','Completed','Delivered')),
  odometer      INTEGER CHECK (odometer >= 0),
  complaint     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id)  ON DELETE RESTRICT,
  FOREIGN KEY (mechanic_id) REFERENCES mechanics(id) ON DELETE SET NULL
);

-- Many-to-many: services performed on a job card (price frozen at booking time)
CREATE TABLE IF NOT EXISTS job_card_services (
  job_card_id  INTEGER NOT NULL,
  service_id   INTEGER NOT NULL,
  price        REAL NOT NULL CHECK (price >= 0),
  PRIMARY KEY (job_card_id, service_id),
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_card_id  INTEGER NOT NULL,
  amount       REAL NOT NULL CHECK (amount > 0),
  method       TEXT NOT NULL DEFAULT 'Cash' CHECK (method IN ('Cash','Card','UPI')),
  paid_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_vehicle      ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status       ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_payments_job      ON payments(job_card_id);
