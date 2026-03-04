#!/bin/bash
set -e

# PostgreSQL configuration for observability
echo "shared_preload_libraries = 'pg_stat_statements'" >> /var/lib/postgresql/data/postgresql.conf
echo "pg_stat_statements.track = 'all'" >> /var/lib/postgresql/data/postgresql.conf
echo "pg_stat_statements.max = 10000" >> /var/lib/postgresql/data/postgresql.conf
echo "pg_stat_statements.track_utility = on" >> /var/lib/postgresql/data/postgresql.conf
echo "log_statement = 'all'" >> /var/lib/postgresql/data/postgresql.conf
echo "log_min_duration_statement = 1000" >> /var/lib/postgresql/data/postgresql.conf

echo "✓ PostgreSQL configuration updated for observability"