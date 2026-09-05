-- Must run before any other TimescaleDB command. CASCADE pulls in deps.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;