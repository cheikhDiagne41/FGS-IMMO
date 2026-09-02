import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  /**
   * En-têtes de sécurité du navigateur.
   * - interdit l'affichage du site dans un cadre sur un autre domaine
   *   (un faux site ne peut pas piéger les clics des visiteurs) ;
   * - impose le chargement en HTTPS une fois le site en ligne ;
   * - limite les sources autorisées pour les scripts, images et cartes.
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // La police Inter vient de Google Fonts ; Tailwind injecte des
          // styles en ligne.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          // Tuiles des cartes et photos des annonces
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'https:'],
          // Carte intégrée sur la fiche d'une parcelle
          frameSrc: ["'self'", 'https://www.openstreetmap.org'],
          // Le site ne doit jamais être affiché dans le cadre d'un autre site
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      // Les médias doivent rester chargeables par le site lui-même
      crossOriginResourcePolicy: { policy: 'same-site' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Ne pas annoncer la technologie utilisée : c'est une aide gratuite
  // pour qui cherche des failles connues.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // En ligne, l'application est derrière le répartiteur de l'hébergeur.
  // Sans ceci, toutes les demandes semblent venir de la même adresse et la
  // limite de tentatives de connexion bloquerait tous les visiteurs à la fois.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Fichiers médias (images / vidéos des terrains) servis sur /uploads.
  // Ces fichiers viennent d'un envoi utilisateur : on empêche le navigateur
  // de les interpréter comme du code (HTML/SVG piégé = script exécuté sur
  // le domaine du site) en neutralisant la détection de type.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });

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

  /**
   * Documentation technique de l'API : utile pendant le développement, mais
   * elle décrit chaque route et chaque champ. La publier reviendrait à
   * remettre le plan du bâtiment à qui cherche une porte mal fermée.
   * Elle reste donc hors ligne en production, sauf demande explicite via
   * ACTIVER_DOCS_API=true.
   */
  const docsAutorisees =
    process.env.NODE_ENV !== 'production' || process.env.ACTIVER_DOCS_API === 'true';

  if (docsAutorisees) {
    const config = new DocumentBuilder()
      .setTitle('FGS_IMMO API')
      .setDescription('API de la plateforme immobilière FGS_IMMO')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port as number, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🏠 FGS_IMMO API démarrée sur http://localhost:${port}/api`);
}
bootstrap();
