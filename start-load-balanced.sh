#!/bin/bash

echo "🚀 Apollo Server Load Balanced Setup"
echo "===================================="
echo ""
echo "Starting Docker containers..."
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📋 Pulling latest images and building containers..."
docker-compose pull

echo ""
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ All services are starting!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Access Points:"
echo "   • Load Balancer Dashboard: http://localhost:8080/lb-status"
echo "   • GraphQL (via LB):        http://localhost:8080/graphql"
echo ""
echo "🔗 Direct Instance Access:"
echo "   • Instance 1: http://localhost:4001/graphql"
echo "   • Instance 2: http://localhost:4002/graphql"
echo "   • Instance 3: http://localhost:4003/graphql"
echo ""
echo "📈 Database & Cache:"
echo "   • PostgreSQL: localhost:5438"
echo "   • Redis:      localhost:6379"
echo ""
echo "📊 Monitor Logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop Services:"
echo "   docker-compose down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Service Status:"
docker-compose ps
echo ""
