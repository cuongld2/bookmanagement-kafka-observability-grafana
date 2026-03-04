# Book Management App - Observability

This document describes the observability stack implemented for the Book Management Application, integrated with Grafana Cloud.

## Overview

The application has comprehensive observability including:

- **Logs** - Application logs shipped to Grafana Loki
- **Traces** - Distributed tracing via OpenTelemetry and Grafana Beyla (eBPF)
- **Profiles** - Continuous profiling via Pyroscope
- **Metrics** - Application and infrastructure metrics
- **Frontend Observability** - Core Web Vitals and RUM
- **Database Observability** - PostgreSQL query analysis

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend        │     │   PostgreSQL    │
│   (Next.js)     │     │   (NestJS)       │     │   Database      │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                        │                        │
         │  OpenTelemetry         │  OpenTelemetry         │
         │  Faro (RUM)           │  Pyroscope             │  postgres_exporter
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────────┐
                          │    Grafana Alloy        │
                          │    (Collector)         │
                          │  - OTLP Receiver       │
                          │  - Loki Source         │
                          │  - Pyroscope Receiver  │
                          │  - Beyla (eBPF)       │
                          │  - Prometheus Scraper  │
                          └───────────┬─────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────────────┐
                     │           Grafana Cloud                │
                     │  - Loki (Logs)                         │
                     │  - Tempo (Traces)                      │
                     │  - Pyroscope (Profiles)               │
                     │  - Prometheus (Metrics)              │
                     │  - Frontend Cloud (RUM)               │
                     └─────────────────────────────────────────┘
```

## Event-Driven Architecture with Kafka

The application uses an event-driven architecture where the API only publishes events to Kafka, and a separate worker processes those events to update the database. This prevents duplicate data and ensures consistency.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT-DRIVEN ARCHITECTURE                                │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│    ┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────────┐     │
│    │ Frontend │────▶│   Backend   │────▶│    Kafka     │────▶│ Worker (Pod)  │────▶│ PostgreSQL │
│    │  (UI)    │     │  (Producer) │     │  (broker)   │     │  (Consumer)   │     │            │
│    └──────────┘     └─────────────┘     └──────────────┘     └────────────────┘     │
│                                                                                      │
│    1. User creates/updates/deletes book via UI                                       │
│    2. API receives request → Sends Kafka event (NO direct DB write)                 │
│    3. Event stored in Kafka topic "book-events"                                     │
│    4. Worker picks up event → Processes → Writes to PostgreSQL                       │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Benefits of This Architecture

| Benefit                        | Description                               |
| ------------------------------ | ----------------------------------------- |
| **No Data Duplication**  | Only the worker writes to the database    |
| **Eventual Consistency** | Events are processed asynchronously       |
| **Scalability**          | Worker can be scaled independently        |
| **Resilience**           | Events persist in Kafka if worker is down |
| **Observability**        | Full trace visibility from API to DB      |

## Components

### 1. Backend Observability (NestJS)

**Location:** `backend/src/lib/tracing.ts`

**Features:**

- OpenTelemetry tracing with auto-instrumentation
- Pyroscope continuous profiling
- Custom Prometheus metrics

**Metrics Exposed:**

- `books_created_total` - Counter for books created
- `books_updated_total` - Counter for books updated
- `books_deleted_total` - Counter for books deleted
- `http_request_duration_seconds` - HTTP request duration histogram
- `database_query_duration_seconds` - Database query duration histogram

**Environment Variables:**

```yaml
OTEL_EXPORTER_OTLP_ENDPOINT: "http://grafana-alloy:4317"
OTEL_SERVICE_NAME: "bookmanagement-backend"
OTEL_SERVICE_VERSION: "1.0.0"
PYROSCOPE_URL: "http://grafana-alloy:9999"
PYROSCOPE_APP_NAME: "bookmanagement-backend"
```

### 2. Frontend Observability (Next.js)

**Location:** `frontend/src/components/frontend-observability.tsx`

**Features:**

- Grafana Faro SDK integration
- Core Web Vitals tracking
- Frontend error tracking
- Page performance monitoring
- Distributed tracing (e2e)

**Environment Variables:**

```yaml
NEXT_PUBLIC_FARO_URL: "https://faro-collector-prod-ap-southeast-1.grafana.net/collect/xxx"
NEXT_PUBLIC_FARO_APP_NAME: "bookmanagement-frontend"
```

### 3. Grafana Alloy Collector

**Location:** `k8s/grafana-alloy-config.yaml`

**Features:**

- OTLP receiver for traces and metrics (gRPC: 4317, HTTP: 4318)
- Loki source for Kubernetes log collection
- Pyroscope receiver for profiles (port 9999)
- Prometheus scraping for pod metrics
- PostgreSQL exporter scraping
- Beyla eBPF auto-instrumentation for traces

**Ports:**

| Port  | Protocol | Purpose             |
| ----- | -------- | ------------------- |
| 12345 | HTTP     | Alloy metrics       |
| 4317  | gRPC     | OTLP traces/metrics |
| 4318  | HTTP     | OTLP traces/metrics |
| 9999  | HTTP     | Pyroscope profiles  |

### 4. Grafana Beyla (eBPF Auto-instrumentation)

**Location:** `k8s/grafana-alloy-config.yaml` (beyla.ebpf component)

Grafana Beyla is an eBPF-based auto-instrumentation tool that provides distributed tracing and RED metrics (Rate, Errors, Duration) without requiring any code changes to your application.

#### How Beyla Works

Beyla uses **eBPF (Extended Berkeley Packet Filter)** technology to intercept system calls and network traffic at the kernel level. Here's the workflow:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Node.js    │     │   eBPF      │     │   Beyla     │     │   Grafana   │
│  Backend    │────▶│   Program   │────▶│   Collector │────▶│   Tempo     │
│  Process    │     │   (Kernel)  │     │   (User)    │     │   (Cloud)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **eBPF Hook Points**: Beyla attaches eBPF programs to kernel functions related to network operations (e.g., `tcp_send`, `tcp_recv`)
2. **Data Collection**: When an HTTP request is made, Beyla captures:
   - Request/response timestamps
   - HTTP method, path, status code
   - Connection details (IP, port)
3. **Span Creation**: Beyla constructs trace spans from the captured data
4. **Kubernetes Enrichment**: Metadata from the Kubernetes API is added (pod name, deployment, namespace)
5. **Export**: Spans are sent to Grafana Tempo via OTLP

#### What Beyla Captures

| Data                          | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| **HTTP Traces**         | Request/response timing, method, path, status codes |
| **Service Latency**     | Time spent in the application vs. network           |
| **Error Rates**         | HTTP error status codes (4xx, 5xx)                  |
| **Throughput**          | Requests per second per service                     |
| **Kubernetes Metadata** | Pod, deployment, namespace, node info               |

#### Benefits Over Manual Instrumentation

| Aspect                   | OpenTelemetry (Manual)    | Beyla (eBPF)         |
| ------------------------ | ------------------------- | -------------------- |
| **Setup**          | Code changes required     | Zero code changes    |
| **Coverage**       | Only instrumented routes  | All HTTP traffic     |
| **Infrastructure** | Database calls, queue ops | Network only         |
| **Overhead**       | Application-level         | Kernel-level (lower) |

#### Dual Tracing: OpenTelemetry + Beyla

The application uses both tracing methods for comprehensive coverage:

```
┌────────────────────────────────────────────────────────────────┐
│                      Grafana Tempo                              │
│                                                                │
│   ┌──────────────────┐         ┌──────────────────┐          │
│   │ OpenTelemetry    │         │   Beyla          │          │
│   │ (Manual)         │         │   (eBPF)         │          │
│   ├──────────────────┤         ├──────────────────┤          │
│   │ - Custom spans   │         │ - All HTTP       │          │
│   │ - Business logic │         │ - Auto-decorated │          │
│   │ - DB queries     │         │ - Lower overhead │          │
│   └────────┬─────────┘         └────────┬─────────┘          │
│            │                             │                     │
│            └──────────┬──────────────────┘                     │
│                       │                                        │
│            ┌─────────▼─────────┐                              │
│            │  Correlated       │                              │
│            │  in Grafana       │                              │
│            └───────────────────┘                              │
└────────────────────────────────────────────────────────────────┘
```

#### Configuration

The Beyla component in Alloy is configured to:

```alloy
beyla.ebpf "default" {
  attributes {
    kubernetes {
      enable = "true"  // Add Kubernetes metadata to traces
    }
  }
  
  discovery {
    services {
      kubernetes {
        namespace = "bookmanagement"  // Monitor this namespace
        deployment_name = "."        // All deployments
      }
    }
  }
  
  metrics {
    features = ["application"]  // Generate RED metrics
  }
  
  output {
    traces = [otelcol.exporter.otlphttp.beyla_tempo.input]
  }
}
```

#### Required Permissions

Beyla requires elevated permissions to function:

| Permission                | Reason                           |
| ------------------------- | -------------------------------- |
| `hostPID: true`         | Access all processes on the node |
| `privileged: true`      | Load eBPF programs into kernel   |
| `SYS_ADMIN` capability  | Create BPF maps and programs     |
| `SYS_PTRACE` capability | Read process information         |

#### Viewing Beyla Traces

In Grafana Tempo, search for traces with:

- Service name: `bookmanagement-backend`
- Or search all traces and filter by `k8s.namespace.name = bookmanagement`

The Beyla traces will have additional attributes like:

- `http.request.method`
- `http.response.status_code`
- `k8s.pod.name`
- `k8s.deployment.name`

### 5. Database Observability

**Components:**

- `postgres_exporter` - Metrics collection
- Database Observability (db-oiy) - Query-level telemetry

**Collected:**

- Query execution times
- Query samples
- Schema details
- Explain plans
- Database locks and stats

### 6. Kafka Message Streaming

**Location:** `k8s/kafka-deployment.yaml`

The application uses Kafka for event-driven architecture. When books are created, updated, or deleted, events are published to Kafka and consumed by a separate worker to maintain data consistency.

#### Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Backend    │────▶│    Kafka    │────▶│   Worker     │────▶│ PostgreSQL │
│  (Producer)  │     │  (Broker)   │     │  (Consumer)  │     │  Database  │
└──────────────┘     └─────────────┘     └──────────────┘     └───────────┘
      │                                       │
      │  OpenTelemetry                        │  OpenTelemetry
      │  (kafka.producer.send)                │  (kafka.consumer.process)
      │                                       │
      └───────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  Grafana Tempo      │
              │  (Traces)           │
              └─────────────────────┘
```

#### How It Works

1. **API Request**: Frontend sends POST/PATCH/DELETE to backend API
2. **Kafka Event**: Backend sends event to Kafka (NO direct DB write)
3. **Event Processing**: Worker consumes event from Kafka topic
4. **Database Write**: Worker writes to PostgreSQL (single source of truth)

#### Kubernetes Deployments

| Deployment         | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `backend`        | API server - produces Kafka events only   |
| `backend-worker` | Worker - consumes events and writes to DB |

#### Kafka Topics

| Topic           | Description                |
| --------------- | -------------------------- |
| `book-events` | Book CRUD operation events |

#### Event Schema

```json
{
  "action": "CREATE" | "UPDATE" | "DELETE",
  "bookId": number,
  "book": { "title": string, "author": string, ... },
  "timestamp": "ISO-8601"
}
```

#### Kafka Configuration

```yaml
# Kafka Broker
KAFKA_BROKER: "my-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092"
KAFKA_ENABLED: "true"
KAFKA_CONSUMER_ENABLED: "false"  # Backend doesn't consume, worker does
```

#### Verify Kafka

```bash
# Check Kafka is running
kubectl get pods -n kafka

# Check Kafka topics
kubectl exec -n kafka deploy/my-cluster-kafka-exporter -- kafka-topics.sh --list --bootstrap-server my-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092

# Check worker is processing events
kubectl logs -n bookmanagement deployment/backend-worker
```

### 7. Kafka Observability with OpenTelemetry

The backend and worker have OpenTelemetry instrumentation for Kafka operations.

#### Traces Captured

| Component         | Span Name                  | Attributes                                                                             |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| **Backend** | `kafka.producer.send`    | `messaging.system`, `messaging.destination`, `messaging.operation`               |
| **Worker**  | `kafka.consumer.process` | `messaging.kafka.topic`, `messaging.kafka.event_type`, `messaging.kafka.book_id` |

#### Viewing Kafka Traces in Grafana

In Grafana Tempo, search for traces with:

- Service name: `bookmanagement-backend` or `bookmanagement-worker`
- Span name: `kafka.producer.send` or `kafka.consumer.process`

#### Trace Attributes

The Kafka spans include:

```json
{
  "messaging.system": "kafka",
  "messaging.destination": "book-events",
  "messaging.operation": "publish" | "process",
  "messaging.kafka.message_key": "123",
  "messaging.kafka.topic": "book-events",
  "messaging.kafka.event_type": "CREATE"
}
```

#### End-to-End Trace Flow

When a book is created:

```
1. Frontend (HTTP) ──────────────────▶ Backend API
                                         │
                                         │ kafka.producer.send
                                         ▼
                                   Kafka (book-events topic)
                                         │
                                         │ kafka.consumer.process  
                                         ▼
                                   Worker ──▶ PostgreSQL
```

### 8. Kafka Monitoring with Grafana Alloy

**Location:** `k8s/grafana-alloy-config.yaml`

Grafana Alloy collects Kafka metrics by scraping the Kafka Exporter.

#### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Kafka Broker   │────▶│  Kafka Exporter  │────▶│  Grafana Alloy  │
│   (Port 9092)   │     │  (Port 9404)     │     │   (Scraper)     │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                         │
                                                         ▼
                                               ┌──────────────────┐
                                               │  Grafana Cloud   │
                                               │  Prometheus      │
                                               └──────────────────┘
```

#### Metrics Collected

The Kafka Exporter provides comprehensive metrics:

| Metric                                                  | Description                       |
| ------------------------------------------------------- | --------------------------------- |
| **Consumer Group Metrics**                        |                                   |
| `kafka_consumergroup_lag`                             | Consumer lag (messages behind)    |
| `kafka_consumergroup_offset`                          | Current offset for consumer group |
| `kafka_consumergroup_members`                         | Number of consumers in group      |
| **Topic Metrics**                                 |                                   |
| `kafka_topic_partitions`                              | Number of partitions per topic    |
| `kafka_topic_partition_current_offset`                | Current offset per partition      |
| `kafka_topic_partition_oldest_offset`                 | Oldest offset (start of topic)    |
| `kafka_topic_partition_replicas`                      | Number of replicas                |
| `kafka_topic_partition_leader`                        | Leader broker ID                  |
| **Broker Metrics**                                |                                   |
| `kafka_broker_info`                                   | Broker metadata                   |
| `kafka_broker_topic_partitions`                       | Partitions per broker             |
| **Message Metrics**                               |                                   |
| `kafka_topic_messages_in_total`                       | Total messages per topic          |
| `kafka_server_brokertopicmetrics_messages_in_per_sec` | Messages per second               |

#### Configuration

The Alloy config scrapes the Kafka Exporter service:

```alloy
# Kafka Exporter scraping
prometheus.scrape "kafka_exporter" {
  scrape_interval = "15s"
  targets = [{
    __address__ = "kafka-exporter.kafka.svc:9404",
    job = "kafka",
  }]
  forward_to = [grafana_cloud.stack.receivers.metrics]
}
```

#### Key Queries for Monitoring

**Check Consumer Lag (for your worker):**

```promql
kafka_consumergroup_lag{consumergroup="bookmanagement-worker-group"}
```

**Check Book Events Topic Health:**

```promql
# Messages in the topic
kafka_topic_messages_in_total{topic="book-events"}

# Partition status
kafka_topic_partitions{topic="book-events"}

# Current offsets
kafka_topic_partition_current_offset{topic="book-events"}
```

**Check Consumer Processing:**

```promql
# Consumer offset vs latest
kafka_consumergroup_lag{consumergroup="bookmanagement-worker-group", topic="book-events"}

# Is consumer catching up?
kafka_topic_partition_current_offset{topic="book-events"} 
- ignoring (partition) 
kafka_consumergroup_offset{consumergroup="bookmanagement-worker-group", topic="book-events"}
```

#### Grafana Dashboard

Now that Grafana offers the AI assistant to help with troubleshooting Grafana issues. We can ask Grafana AI assistant to create a new dashboard that monitors Kafka based on the available metrics that started with `kafka` prefix.

#### Manual Verification

```bash
# Check Kafka Exporter is running
kubectl get svc -n kafka kafka-exporter

# Check metrics endpoint
kubectl exec -n kafka deploy/my-cluster-kafka-exporter -- curl localhost:9404/metrics | head -20

# Check specific consumer group
kubectl exec -n kafka deploy/my-cluster-kafka-exporter -- curl localhost:9404/metrics | grep bookmanagement-worker-group
```

## Kubernetes Resources

| Resource                          | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `namespace.yaml`                | bookmanagement namespace                            |
| `configmap.yaml`                | Application configuration (includes Kafka settings) |
| `grafana-alloy-deployment.yaml` | Alloy collector                                     |
| `grafana-alloy-config.yaml`     | Alloy configuration (includes Kafka monitoring)     |
| `backend-deployment.yaml`       | Backend API (Kafka producer only)                   |
| `worker-deployment.yaml`        | Backend worker (Kafka consumer)                     |
| `frontend-deployment.yaml`      | Frontend with Faro                                  |
| `postgres-deployment.yaml`      | PostgreSQL with exporter                            |
| `kafka-deployment.yaml`         | Kafka message broker                                |

## Setup

### Prerequisites

- Kubernetes cluster (minikube, kind, or cloud)
- Grafana Cloud account with:
  - Loki
  - Tempo
  - Prometheus
  - Pyroscope
  - Frontend Cloud

### Deploy

1. Apply Kubernetes manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/grafana-alloy-deployment.yaml
kubectl apply -f k8s/grafana-alloy-config.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/worker-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/postgres-deployment.yaml
```

2. Create secret (or use secret.example.yaml):

```bash
kubectl apply -f k8s/secret.example.yaml
```

### Verify Deployment

```bash
# Check pods - you should see backend and backend-worker
kubectl get pods -n bookmanagement

# Check backend logs (Kafka producer)
kubectl logs -n bookmanagement deployment/backend | grep -i "kafka"

# Check worker logs (Kafka consumer)
kubectl logs -n bookmanagement deployment/backend-worker

# Check Alloy logs
kubectl logs -n bookmanagement deploy/grafana-alloy | head -20

# Check backend observability
kubectl logs -n bookmanagement deploy/backend | grep -i "otel\|pyroscope"
```

## Grafana Cloud Dashboards

### Accessing Observability Data

| Data Type | Grafana Cloud Service                      |
| --------- | ------------------------------------------ |
| Logs      | Loki -`/{stack-name}/explore`            |
| Traces    | Tempo -`/{stack-name}/explore`           |
| Profiles  | Pyroscope -`/{stack-name}/profiles`      |
| Metrics   | Prometheus -`/{stack-name}/explore`      |
| Frontend  | Frontend Cloud -`/{stack-name}/frontend` |

### Key Queries

**Backend Logs:**

```logql
{app="bookmanagement", container="backend"}
```

**Backend Traces:**

```promql
service_name="bookmanagement-backend"
```

**CPU Profiles:**

```pyroscope
bookmanagement-backend{cpu=true}
```

**Database Query Latency:**

```promql
rate(pg_stat_database_tup_fetched_total[5m])
```

## Troubleshooting

### No Logs in Grafana

1. Check pod labels include `app.k8s.io/name: bookmanagement`
2. Verify Alloy is running: `kubectl get pods -n bookmanagement`
3. Check Alloy logs: `kubectl logs -n bookmanagement deploy/grafana-alloy`

### No Traces

1. Verify OTLP endpoint: `http://grafana-alloy:4317`
2. Check backend logs for "OpenTelemetry initialized"

### No Profiles

1. Verify Pyroscope URL: `http://grafana-alloy:9999`
2. Check Alloy logs for pyroscope errors

### Beyla Traces Not Appearing

1. Verify Alloy has hostPID and privileged security context:
   ```bash
   kubectl get deployment grafana-alloy -n bookmanagement -o jsonpath='{.spec.template.spec.hostPID}'
   kubectl get deployment grafana-alloy -n bookmanagement -o jsonpath='{.spec.template.spec.containers[0].securityContext.privileged}'
   ```
2. Check Alloy logs for Beyla errors:
   ```bash
   kubectl logs -n bookmanagement deploy/grafana-alloy | grep -i "beyla"
   ```
3. Verify Beyla can access node processes:
   ```bash
   kubectl get pods -n bookmanagement -l app.k8s.io/name=grafana-alloy -o jsonpath='{.items[0].spec.hostPID}'
   ```
4. Check Beyla metrics:
   ```bash
   kubectl exec -n bookmanagement deploy/grafana-alloy -- curl localhost:12345/api/v1/targets | grep beyla
   ```

### Kafka Issues

#### Events Not Being Processed

1. Check worker is running:

   ```bash
   kubectl get pods -n bookmanagement | grep worker
   ```
2. Check worker logs for errors:

   ```bash
   kubectl logs -n bookmanagement deployment/backend-worker
   ```
3. Check Kafka broker connectivity:

   ```bash
   kubectl exec -n bookmanagement deploy/backend -- nslookup my-cluster-kafka-bootstrap.kafka.svc.cluster.local
   ```
4. Check Kafka topic has messages:

   ```bash
   # Using Kafka Exporter metrics
   kubectl exec -n kafka deploy/my-cluster-kafka-exporter -- curl localhost:9404/metrics | grep book-events
   ```

#### Consumer Lag Growing

1. Check consumer lag in Grafana:

   ```promql
   kafka_consumergroup_lag{consumergroup="bookmanagement-worker-group"}
   ```
2. Check worker is keeping up with messages:

   ```bash
   # Compare current offset vs processed
   kafka_topic_partition_current_offset{topic="book-events"} 
   - ignoring (partition) 
   kafka_consumergroup_offset{consumergroup="bookmanagement-worker-group", topic="book-events"}
   ```

#### No Kafka Metrics in Grafana

1. Check Kafka Exporter is running:

   ```bash
   kubectl get pods -n kafka | grep kafka-exporter
   ```
2. Check Alloy is scraping Kafka Exporter:

   ```bash
   kubectl logs -n bookmanagement deploy/grafana-alloy | grep kafka_exporter
   ```
3. Verify metrics endpoint:

   ```bash
   kubectl exec -n kafka deploy/my-cluster-kafka-exporter -- curl localhost:9404/metrics | head -10
   ```

#### Duplicate Data Issues

This architecture prevents duplicates by having only the worker write to the database. If you see duplicates:

1. Check that `KAFKA_CONSUMER_ENABLED=false` in backend deployment
2. Verify worker is the only consumer of `book-events` topic

### Authentication Errors (401)

1. Verify Grafana Cloud tokens in secret
2. Check PYROSCOPE_AUTH_TOKEN is valid
3. Ensure GRAFANA_CLOUD_TOKEN is set

## Security

- Secrets are stored in `k8s/secret.example.yaml` (do not commit)
- `.gitignore` excludes sensitive files
- Use Grafana Cloud tokens with minimal required permissions

## Additional Resources

- [Grafana Alloy Documentation](https://grafana.com/docs/alloy/)
- [Grafana Beyla Documentation](https://grafana.com/docs/beyla/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/js/)
- [Pyroscope Documentation](https://grafana.com/docs/pyroscope/)
- [Grafana Faro](https://grafana.com/docs/grafana-cloud/frontend-observation/)
