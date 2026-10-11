-- Reference data: administrative districts of Baku, with APPROXIMATE centre points only.
-- No boundary dataset has been verified, so boundary stays NULL and boundary_source says so.
-- Descriptions are intentionally left NULL until they are written from a cited source.
INSERT INTO neighborhood (slug, name, center, boundary_source) VALUES
 ('nasimi',     'Nasimi',     ST_SetSRID(ST_MakePoint(49.8250, 40.4040), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('yasamal',    'Yasamal',    ST_SetSRID(ST_MakePoint(49.8150, 40.3900), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('narimanov',  'Narimanov',  ST_SetSRID(ST_MakePoint(49.8680, 40.4080), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('nizami',     'Nizami',     ST_SetSRID(ST_MakePoint(49.9430, 40.3860), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('khatai',     'Khatai',     ST_SetSRID(ST_MakePoint(49.8870, 40.3830), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('sabail',     'Sabail',     ST_SetSRID(ST_MakePoint(49.8450, 40.3650), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('binagadi',   'Binagadi',   ST_SetSRID(ST_MakePoint(49.8300, 40.4500), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('sabunchu',   'Sabunchu',   ST_SetSRID(ST_MakePoint(49.9500, 40.4300), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('surakhani',  'Surakhani',  ST_SetSRID(ST_MakePoint(50.0200, 40.4000), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('garadagh',   'Garadagh',   ST_SetSRID(ST_MakePoint(49.7400, 40.2300), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('khazar',     'Khazar',     ST_SetSRID(ST_MakePoint(50.0500, 40.4800), 4326)::geography, 'Approximate centre point only; no verified boundary'),
 ('pirallahi',  'Pirallahi',  ST_SetSRID(ST_MakePoint(50.3100, 40.4800), 4326)::geography, 'Approximate centre point only; no verified boundary');
