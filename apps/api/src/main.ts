import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Fichiers médias (images / vidéos des terrains) servis sur /uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // En production : l'API sert aussi le frontend (build web) — une seule URL
  const webDist = join(process.cwd(), 'web-dist');
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
    const server = app.getHttpAdapter().getInstance();
    // Fallback SPA : toute route non-API renvoie index.html (routage React)
    server.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('FGS_IMMO API')
    .setDescription('API de la plateforme immobilière FGS_IMMO')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port as number, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🏠 FGS_IMMO API démarrée sur http://localhost:${port}/api`);
}
bootstrap();
