-- PostGIS enablement for the AID-DRAS/RADAR database.
-- Mounted into /docker-entrypoint-initdb.d by docker-compose (runs once on
-- first boot of a fresh data volume).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
