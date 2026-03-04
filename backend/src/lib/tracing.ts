import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import type { IncomingMessage } from 'http';
import pyroscope from '@pyroscope/nodejs';

function initPyroscope() {
  const pyroscopeUrl = process.env.PYROSCOPE_URL;
  const pyroscopeUser = process.env.PYROSCOPE_USER;
  const pyroscopeAuthToken = process.env.PYROSCOPE_AUTH_TOKEN;
  const pyroscopeAppName =
    process.env.PYROSCOPE_APP_NAME || 'bookmanagement-backend';

  if (!pyroscopeUrl) {
    console.log('PYROSCOPE_URL not set, skipping Pyroscope profiling');
    return;
  }

  try {
    pyroscope.init({
      serverAddress: pyroscopeUrl,
      appName: pyroscopeAppName,
      basicAuthUser: pyroscopeUser,
      basicAuthPassword: pyroscopeAuthToken,
      tags: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.OTEL_SERVICE_VERSION || '1.0.0',
      },
    });
    pyroscope.start();
    console.log(`Pyroscope profiling initialized for: ${pyroscopeAppName}`);
  } catch (error) {
    console.log('Failed to initialize Pyroscope:', error);
  }
}

export function initTracing(): NodeSDK | null {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'bookmanagement-backend';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';

  initPyroscope();

  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.log(
      'OTEL_EXPORTER_OTLP_ENDPOINT not set, skipping OpenTelemetry initialization',
    );
    return null;
  }

  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
      new NestInstrumentation(),
      new HttpInstrumentation({
        applyCustomAttributesOnSpan: (span, request) => {
          const req = request as IncomingMessage;
          span.setAttribute('http.route', req.url || '');
        },
      }),
      new PgInstrumentation({
        enabled: true,
      }),
      new KafkaJsInstrumentation({
        enabled: true,
      }),
    ],
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV || 'development',
    }),
  });

  sdk.start();
  console.log(`OpenTelemetry initialized for service: ${serviceName}`);
  console.log(`OTLP endpoint: ${otlpEndpoint}`);

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) =>
        console.log('Error shutting down OpenTelemetry SDK', error),
      )
      .finally(() => process.exit(0));
  });

  return sdk;
}
