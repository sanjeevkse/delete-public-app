#!/bin/bash

# Telescope Setup Script
# This script sets up the Telescope monitoring system

echo "🔭 Setting up Telescope..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Run the migration
echo "📦 Running database migration..."
npx sequelize-cli db:migrate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Telescope setup complete!"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Start your application: npm run dev"
    echo "   2. Open Telescope dashboard: http://localhost:3000/telescope"
    echo ""
    echo "📖 Documentation:"
    echo "   - Quick Start: TELESCOPE_QUICKSTART.md"
    echo "   - Full Docs: TELESCOPE_README.md"
    echo "   - Implementation: TELESCOPE_IMPLEMENTATION.md"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check your database configuration."
    exit 1
fi
