# Bay Ledger: Vehicle Service and Management System

A micro project for a vehicle service workshop. Staff register customers and their vehicles,
open job cards, pick services, assign mechanics, track progress, and collect payments.

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 18 + Vite                              |
| Backend   | Node.js + Express (REST API)                 |
| Database  | SQLite (relational, SQL, foreign keys)       |

## 1. Features
- Dashboard: open jobs, billed / collected / outstanding amounts, jobs by stage, top services, latest jobs
- Customers, Vehicles, Mechanics, Service catalogue: add, edit, delete, search
- Job cards: pick vehicle, mechanic and several services; price is frozen when the job is created
- Status workflow: Pending, In Progress, Completed, Delivered
- Payments: partial or full, by Cash / UPI / Card; balance is checked so you cannot overpay
- Printable invoice for any job card
- Friendly error messages for duplicate phone / registration numbers and for records that cannot be deleted

## 2. Run it
Requirements: Node.js 18 or newer.

```bash
cd vehicle-service-system
npm install                # installs the dev tool used to start both servers
npm run install-all        # installs server and client packages
npm run dev                # starts API (port 5000) and React app (port 5173)
```
Open **http://localhost:5173**.

The database file `server/vehicle_service.db` is created automatically on the first start,
with tables from `database/schema.sql` and demo data from `database/seed.sql`.
To start again with fresh demo data: `npm run reset-db` (then restart).

Without the root helper you can also run two terminals:
`cd server && npm install && npm start` and `cd client && npm install && npm run dev`.

## 3. Database design (3NF)

```
customers 1 ──< vehicles 1 ──< job_cards >── 0..1 mechanics
                                   │  └──< payments
                                   └──< job_card_services >── services
```

| Table              | Purpose                                              | Keys |
|--------------------|------------------------------------------------------|------|
| customers          | Vehicle owners                                       | PK id, UNIQUE phone |
| vehicles           | Vehicles owned by a customer                         | PK id, FK customer_id, UNIQUE reg_no |
| mechanics          | Workshop staff                                       | PK id |
| services           | Catalogue of services with standard price            | PK id, UNIQUE name |
| job_cards          | One workshop visit of a vehicle                      | PK id, FK vehicle_id, FK mechanic_id |
| job_card_services  | Services on a job (many-to-many) with frozen price   | PK (job_card_id, service_id) |
| payments           | Payments received against a job card                 | PK id, FK job_card_id |

Constraints used: PRIMARY KEY, FOREIGN KEY (CASCADE / RESTRICT / SET NULL), UNIQUE, NOT NULL,
CHECK (status, fuel type, price, amount, year) and indexes on foreign keys.
Totals and balances are not stored; they are calculated with SQL aggregates (`SUM`) so the data never goes out of sync.

## 4. REST API

| Method | Endpoint                         | Description |
|--------|----------------------------------|-------------|
| GET/POST | `/api/customers`               | list / create |
| PUT/DELETE | `/api/customers/:id`         | update / delete |
| same pattern | `/api/vehicles`, `/api/mechanics`, `/api/services` | |
| GET    | `/api/jobcards?status=`          | list job cards (optional status filter) |
| GET    | `/api/jobcards/:id`              | one job with services and payments |
| POST   | `/api/jobcards`                  | create (`vehicle_id`, `mechanic_id`, `odometer`, `complaint`, `service_ids[]`), runs in a transaction |
| PUT    | `/api/jobcards/:id/status`       | change stage |
| PUT    | `/api/jobcards/:id/mechanic`     | assign mechanic |
| POST   | `/api/jobcards/:id/payments`     | record payment |
| GET    | `/api/dashboard`                 | summary figures |

## 5. Useful SQL for the viva / report

```sql
-- Revenue per service
SELECT s.name, COUNT(*) AS times, SUM(js.price) AS revenue
FROM job_card_services js JOIN services s ON s.id = js.service_id
GROUP BY s.id ORDER BY revenue DESC;

-- Customers with unpaid balance
SELECT c.name, SUM(js.price) - COALESCE(SUM(p.amount),0) AS due
FROM customers c JOIN vehicles v ON v.customer_id = c.id
JOIN job_cards j ON j.vehicle_id = v.id
JOIN (SELECT job_card_id, SUM(price) AS price FROM job_card_services GROUP BY job_card_id) js ON js.job_card_id = j.id
LEFT JOIN (SELECT job_card_id, SUM(amount) AS amount FROM payments GROUP BY job_card_id) p ON p.job_card_id = j.id
GROUP BY c.id HAVING due > 0;
```

## 6. Folder structure
```
vehicle-service-system/
├── database/   schema.sql, seed.sql
├── server/     index.js (API), db.js (connection + setup)
├── client/     Vite React app (src/pages, src/components, api.js, styles.css)
└── README.md
```

## 7. Possible extensions
Login with roles, SMS / email reminders for next service date, spare-parts inventory, PDF invoices, MySQL / PostgreSQL (the schema uses standard SQL; change `AUTOINCREMENT` to `AUTO_INCREMENT` / `SERIAL`).
