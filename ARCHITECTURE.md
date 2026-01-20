# System Architecture Diagram

## Complete Load-Balanced Setup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT / BROWSER                                │
│                                                                               │
│  • Make GraphQL queries to: http://localhost:8080/graphql                   │
│  • View dashboard at: http://localhost:8080/lb-status                       │
│  • Check health at: http://localhost:8080/health                            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   NGINX Load Balancer      │
                    │                            │
                    │  Port: 8080                │
                    │  Algorithm: Least Conn     │
                    │  Status: /lb-status        │
                    │                            │
                    │  Health Check: Every 5s    │
                    │  Failover: Automatic       │
                    └──────┬─────────┬──────┬────┘
                           │         │      │
             ┌─────────────▼──┬──────▼────┬─▼──────────────┐
             │                │           │                │
    ┌────────▼────────┐ ┌────▼────────┐ ┌▼─────────────┐
    │  Apollo Server  │ │Apollo Server │ │Apollo Server │
    │   Instance 1    │ │ Instance 2   │ │ Instance 3   │
    │                 │ │              │ │              │
    │  Port: 4001     │ │ Port: 4002   │ │ Port: 4003   │
    │  ID: instance-1 │ │ ID: instance-2
 │ │ ID: instance-3 │
    │                 │ │              │ │              │
    │ • Request Track │ │• Request Trck│ │• Request Trck│
    │ • Logging       │ │• Logging     │ │• Logging     │
    │ • Health Check  │ │• Health Check│ │• Health Check│
    └────────┬────────┘ └────┬────────┘ └┬─────────────┘
             │                │           │
             │ Share Data/Cache│           │
             │                │           │
             └────────────────┼───────────┘
                              │
             ┌────────────────┴───────────────────┐
             │                                    │
    ┌────────▼──────────────────┐      ┌──────────▼──────────────┐
    │  PostgreSQL Database       │      │   Redis Cache           │
    │                            │      │                        │
    │  Port: 5438                │      │  Port: 6379            │
    │  User: postgres            │      │  Type: Key-Value Store │
    │  Password: postgres        │      │  Persistence: AOF      │
    │  Database: apollo_db       │      │  Mode: Production      │
    │                            │      │                        │
    │  • All instances read/write│      │  • Session caching     │
    │  • Shared schema           │      │  • Query results       │
    │  • Drizzle ORM             │      │  • User data cache     │
    └────────────────────────────┘      └────────────────────────┘
```

---

## Request Flow with Load Balancing

```
Step 1: Client Makes Request
┌─────────────────────────────────────┐
│ POST /graphql                       │
│ { "query": "{ __typename }" }       │
└────────────┬────────────────────────┘
             │
Step 2: Load Balancer Routes Request
┌────────────▼────────────────────────┐
│ Check active connections:           │
│ • Instance 1: 2 connections         │  ← Least connections
│ • Instance 2: 3 connections         │     = Gets this request
│ • Instance 3: 4 connections         │
└────────────┬────────────────────────┘
             │
Step 3: Instance Processes Request
┌────────────▼────────────────────────┐
│ Instance 1 Handling:                │
│                                     │
│ 1. Log incoming request             │
│ 2. Add X-Instance-ID header         │
│ 3. Process GraphQL query            │
│ 4. Query shared database            │
│ 5. Cache result in Redis            │
│ 6. Return response with headers     │
└────────────┬────────────────────────┘
             │
Step 4: Response Sent Back
┌────────────▼────────────────────────┐
│ HTTP Response                       │
│                                     │
│ Status: 200 OK                      │
│ Headers:                            │
│   X-Instance-ID: instance-1:4001    │
│   X-Request-ID: req-123456          │
│ Body: { "data": { ... } }           │
└────────────┬────────────────────────┘
             │
Step 5: Logs Recorded
┌────────────▼────────────────────────┐
│ [2025-01-20T08:30:45.123Z]          │
│ [instance-1] POST /graphql          │
│ Status: 200 - Duration: 334ms       │
└────────────────────────────────────┘
```

---

## Health Check System

```
┌─────────────────────────────────────────────┐
│          Load Balancer Health Check         │
│                                             │
│  Interval: Every 5 seconds                  │
│  Timeout: 3 seconds                         │
│  Max Failures: 3                            │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌─────┐      ┌─────┐      ┌─────┐
    │ :4001       │ :4002      │ :4003
    │            │            │
    │ ✓ Healthy  │ ✓ Healthy  │ ✓ Healthy
    │ Active     │ Active     │ Active
    │ Serving    │ Serving    │ Serving
    └─────┘      └─────┘      └─────┘

If one instance fails:
    ┌─────┐      ┌─────┐      ┌─────┐
    │ :4001      │ :4002      │ :4003
    │            │            │
    │ ✗ Failed   │ ✓ Healthy  │ ✓ Healthy
    │ Offline    │ Active     │ Active
    │ Removed    │ Serving    │ Serving
    │ from LB    │ (double)   │ (double)
    └─────┘      └─────┘      └─────┘
```

---

## Data Consistency Across Instances

```
┌──────────────────────────────────────────────────────┐
│          Shared Database & Cache                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Instance 1          Instance 2          Instance 3 │
│  Writes to DB   →    DB State          ← Reads from DB
│  Caches in Redis  ← Redis Cache → Uses cache        │
│                                                      │
│  All instances see the same data:                    │
│  • No data replication needed                        │
│  • ACID compliant transactions                       │
│  • Redis for performance                            │
│  • PostgreSQL for persistence                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Docker Network Diagram

```
┌────────────────────────────────────────────────────────┐
│              Docker Network: apollo-network            │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ nginx-lb │  │ postgres │  │ redis    │           │
│  │:8080     │  │:5438     │  │:6379     │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │                 │
│  ┌────▼──┐   ┌──────▼─┐   ┌──────▼──────┐          │
│  │apollo │   │apollo  │   │apollo       │          │
│  │-1     │   │-2      │   │-3          │          │
│  │:4001  │   │:4002   │   │:4003       │          │
│  └───────┘   └────────┘   └────────────┘          │
│                                                    │
│  Internal Communication:                           │
│  • apollo-server-1 ↔ apollo-server-2              │
│  • nginx-lb → all apollo servers                  │
│  • all servers → postgres, redis                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Request Distribution Graph

```
After running: ./test-load-balancer.sh 30

Distribution:
│
│ Instance 1: ████████████████ 33%
│ Instance 2: ████████████████ 33%
│ Instance 3: ████████████████ 34%
│
└─────────────────────────────────────

Perfect balance achieved! ✓
```

---

## Monitoring Points

```
┌──────────────────────────────────────────┐
│         What to Monitor                  │
├──────────────────────────────────────────┤
│                                          │
│ Load Balancer:                           │
│ • Dashboard: http://localhost:8080/lb-status
│ • Health: http://localhost:8080/health  │
│ • Logs: docker-compose logs nginx-lb    │
│                                          │
│ Individual Instances:                    │
│ • Health: http://localhost:400X/health  │
│ • Logs: docker-compose logs apollo-server-X
│ • Resource: docker stats apollo-server-X
│                                          │
│ Database:                                │
│ • Logs: docker-compose logs postgres    │
│ • Connections: psql admin queries       │
│                                          │
│ Cache:                                   │
│ • Logs: docker-compose logs redis       │
│ • Keys: redis-cli commands              │
│                                          │
└──────────────────────────────────────────┘
```

---

## Scaling Scenario

```
Current Setup (3 instances):
┌───┐  ┌───┐  ┌───┐
│ 1 │──│ 2 │──│ 3 │  Peak Load: ~200 req/s
└───┘  └───┘  └───┘

Future Scaling (6 instances):
┌───┐  ┌───┐  ┌───┐
│ 1 │──│ 2 │──│ 3 │  Peak Load: ~400 req/s
└───┘  └───┘  └───┘
   │      │      │
   └──┬───┴──┬───┘
      │      │
   ┌──┴─┐  ┌─┴──┐
   │ 4  │  │ 5  │  + More instances
   └─┬──┘  └──┬─┘
     │      │
   ┌─┴──┐
   │ 6  │
   └────┘

Same nginx.conf + docker-compose.yml update
All instances share same DB + Redis
Automatic load distribution
```
