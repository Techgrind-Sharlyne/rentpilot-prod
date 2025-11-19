#!/bin/bash

echo "========================================="
echo "REMS Local Setup Script for Linux/Mac"
echo "========================================="

echo ""
echo "Step 1: Installing Node.js dependencies..."
npm install

echo ""
echo "Step 2: Setting up database..."
echo "Make sure PostgreSQL is running and you have created:"
echo "- Database: rems_db"
echo "- User: rems_user with password"
echo ""

read -p "Press Enter to continue with database import (Ctrl+C to cancel)..."

echo ""
echo "Step 3: Importing database backup..."
psql -U rems_user -d rems_db -f rems_database_backup.sql

echo ""
echo "Step 4: Building application..."
npm run build

echo ""
echo "Step 5: Database migration (ensure latest schema)..."
npm run db:push

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "To start the application:"
echo "  npm start (production mode)"
echo "  npm run dev (development mode)"
echo ""
echo "Application will be available at: http://localhost:5000"
echo ""