import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
