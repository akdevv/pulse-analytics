-- Enables the TimescaleDB extension on this Postgres instance.
-- Must run before any other TimescaleDB commands.
-- The CASCADE option automatically installs any dependencies.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;