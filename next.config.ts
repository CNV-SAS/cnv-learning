import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default de Next.js es 1MB y rechaza FormData uploads mayores
      // antes de invocar la action. submitAssignmentAction acepta
      // archivos hasta 10MB (MAX_FILE_SIZE_BYTES en assignments/data/
      // constants.ts); alineamos aqui para que el bodyparser permita
      // el upload llegar al action. La validacion final sigue
      // viviendo en submission.service.
      bodySizeLimit: "10mb",
    },
  },
  // Bloque 22.4: el route handler /api/corporate-certificates/[id]/pdf
  // lee design/templates/corporate-certificate-template.png con
  // fs.readFile(process.cwd() + ...) en runtime. Vercel hace tracing
  // estatico del bundle y NO incluye assets fuera de public/ por
  // default; sin este include el PDF prod falla con ENOENT.
  //
  // Nota Next 16: outputFileTracingIncludes salio de experimental.* en
  // Next 15.0 y vive en raiz del config. Si en algun futuro upgrade
  // vuelve a moverse, ajustar aqui.
  outputFileTracingIncludes: {
    "/api/corporate-certificates/[id]/pdf": [
      "./design/templates/corporate-certificate-template.png",
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "connected-nutrition-ventures",

  // Slug (no display name) del project en Sentry Dashboard. Si se
  // renombra el project en Sentry, actualizar aqui tambien o el upload
  // de source maps fallara silenciosamente en build.
  project: "cnv-learning",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
