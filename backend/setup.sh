#!/bin/bash

# JetRPay Backend Quick Setup Script
# This script initializes the development environment

set -e  # Exit on error

echo "🚀 JetRPay Backend Setup"
echo "========================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v)
echo "   Found: $node_version"
if [[ "$node_version" != v18* ]] && [[ "$node_version" != v19* ]] && [[ "$node_version" != v20* ]]; then
  echo "   ⚠️  Warning: Node.js 18+ is recommended"
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo ""
  echo "⚙️  Setting up environment variables..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "   ✅ Created .env (copied from .env.example)"
    echo "   📝 Please edit .env with your configuration:"
    echo "      - DATABASE_URL (Neon PostgreSQL)"
    echo "      - PLUNK_API_KEY (Email service)"
    echo "      - ZYNTA_API_KEY (Payment provider)"
    echo "      - JWT_SECRET (Change this to a strong random string!)"
  else
    echo "   ❌ .env.example not found"
    exit 1
  fi
else
  echo ""
  echo "   ✅ .env file already exists"
fi

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
if command -v pnpm &> /dev/null; then
  echo "   Using pnpm..."
  pnpm install
else
  echo "   Using npm..."
  npm install
fi
echo "   ✅ Dependencies installed"

# Check database configuration
echo ""
echo "🗄️  Checking database configuration..."
if grep -q "DATABASE_URL=" .env && ! grep -q "postgresql://localhost" .env; then
  echo "   ✅ Remote database configured (Neon)"
else
  echo "   ⚠️  Using local PostgreSQL (ensure it's running)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Edit .env with your credentials:"
echo "      nano .env"
echo ""
echo "   2. Run database migrations:"
echo "      pnpm db:migrate"
echo ""
echo "   3. Start development server:"
echo "      pnpm dev"
echo ""
echo "   4. Test API:"
echo "      curl http://localhost:3000/health"
echo ""
echo "📚 Documentation: See ../docs/ folder for guides"
