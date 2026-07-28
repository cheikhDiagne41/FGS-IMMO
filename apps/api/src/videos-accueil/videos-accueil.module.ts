import { Module } from '@nestjs/common';
import { VideosAccueilService } from './videos-accueil.service';
import { VideosAccueilController } from './videos-accueil.controller';

@Module({
  controllers: [VideosAccueilController],
  providers: [VideosAccueilService],
  exports: [VideosAccueilService],
})
export class VideosAccueilModule {}
