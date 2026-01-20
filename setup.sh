#!/bin/bash

# Make scripts executable
chmod +x start-load-balanced.sh
chmod +x test-load-balancer.sh

echo "🔧 Setting up environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Server Configuration
NODE_ENV=development

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=apollo_db
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/apollo_db

# Redis
REDIS_URL=redis://redis:6379

# Apollo Server Instances (set by docker-compose)
PORT=4000
INSTANCE_ID=default
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Make scripts executable
echo "📜 Making scripts executable..."
chmod +x start-load-balanced.sh
chmod +x test-load-balancer.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the load-balanced setup, run:"
echo "  ./start-load-balanced.sh"
echo ""
echo "To test the load balancer, run:"
echo "  ./test-load-balancer.sh 20"
echo ""
