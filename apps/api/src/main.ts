import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import type { Request, Response } from 'express'
import { AppModule } from './app.module'

function resolvePort(): number {
  const raw = process.env['PORT']
  if (raw === undefined || raw === '') return 4000
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 4000
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  const allowedOrigins = (process.env['WEB_URL'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((o) => origin === o || origin.endsWith('.vercel.app'))) {
        cb(null, true)
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true,
  })

  // Plain Express route for platform health probes (no global prefix / Nest pipes).
  const http = app.getHttpAdapter().getInstance()
  if (http && typeof http.get === 'function') {
    http.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' })
    })
  }

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Equiscore API')
      .setDescription('Trust infrastructure platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = resolvePort()
  await app.listen(port, '0.0.0.0')
  console.log(`Equiscore API listening on 0.0.0.0:${port}`)
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
