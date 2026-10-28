INSERT INTO customers (id,name,phone,email,address) VALUES
 (1,'Anil Kumar','9847012345','anil@example.com','Erattupetta, Kottayam'),
 (2,'Meera Nair','9946098765','meera@example.com','Pala, Kottayam'),
 (3,'Joseph Mathew','9744011223','joseph@example.com','Kanjirappally'),
 (4,'Fathima Beevi','9605544332','fathima@example.com','Erattupetta');

INSERT INTO vehicles (id,customer_id,reg_no,make,model,year,fuel_type) VALUES
 (1,1,'KL-35-A-1234','Maruti','Swift',2019,'Petrol'),
 (2,1,'KL-35-B-7788','Honda','Activa',2021,'Petrol'),
 (3,2,'KL-05-C-4521','Hyundai','Creta',2022,'Diesel'),
 (4,3,'KL-34-D-9090','Toyota','Innova',2018,'Diesel'),
 (5,4,'KL-35-E-1111','Tata','Nexon EV',2023,'Electric');

INSERT INTO mechanics (id,name,phone,specialization) VALUES
 (1,'Rajesh P','9895011111','Engine & Transmission'),
 (2,'Sunil K','9895022222','Electrical & EV'),
 (3,'Biju T','9895033333','Brakes & Suspension');

INSERT INTO services (id,name,description,price) VALUES
 (1,'General Service','Oil change, filter replacement, 30-point check',2500),
 (2,'Oil Change','Engine oil and oil filter',1200),
 (3,'Brake Pad Replacement','Front or rear pad set with fitting',1800),
 (4,'Wheel Alignment & Balancing','Four-wheel computerised alignment',900),
 (5,'AC Service','Gas top-up, filter clean, leak check',2200),
 (6,'Battery Replacement','Battery fitting (battery cost extra)',300),
 (7,'Engine Diagnostics','OBD scan and report',700);

INSERT INTO job_cards (id,vehicle_id,mechanic_id,status,odometer,complaint,created_at,completed_at) VALUES
 (1,1,1,'Delivered',45200,'Regular service due','2026-09-20 10:00:00','2026-09-20 15:30:00'),
 (2,3,3,'Completed',28100,'Brake noise while stopping','2026-10-18 09:30:00','2026-10-19 12:00:00'),
 (3,4,1,'In Progress',96500,'Engine vibration at idle','2026-10-22 11:15:00',NULL),
 (4,5,2,'Pending',9800,'Charging slower than usual','2026-10-24 08:45:00',NULL);

INSERT INTO job_card_services (job_card_id,service_id,price) VALUES
 (1,1,2500),(1,4,900),
 (2,3,1800),(2,4,900),
 (3,7,700),(3,2,1200),
 (4,7,700);

INSERT INTO payments (job_card_id,amount,method,paid_at) VALUES
 (1,3400,'UPI','2026-09-20 15:45:00'),
 (2,1000,'Cash','2026-10-19 12:10:00');
