#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until pg_isready -U postgres -h localhost -p 5432; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Create the extension if it doesn't exist
echo "Creating pg_stat_statements extension..."
psql -U postgres -d bookmanagement -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Set the configuration parameters
echo "Setting PostgreSQL configuration..."
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';"
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET pg_stat_statements.track = 'all';"
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET pg_stat_statements.max = 10000;"
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET pg_stat_statements.track_utility = on;"
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET log_statement = 'all';"
psql -U postgres -d bookmanagement -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload configuration
echo "Reloading PostgreSQL configuration..."
psql -U postgres -d bookmanagement -c "SELECT pg_reload_conf();"

echo "✓ PostgreSQL configuration updated for observability"