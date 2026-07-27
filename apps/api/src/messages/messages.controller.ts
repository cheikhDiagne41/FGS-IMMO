import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Messagerie')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  @Roles(Role.VENDEUR, Role.ADMIN, Role.GESTIONNAIRE)
  conversations(@CurrentUser() user: AuthUser) {
    return this.messagesService.conversations(user);
  }

  @Get('conversations/:id')
  @Roles(Role.VENDEUR, Role.ADMIN, Role.GESTIONNAIRE)
  conversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagesService.conversation(id, user);
  }

  @Post('conversations/:id/repondre')
  @Roles(Role.VENDEUR, Role.ADMIN, Role.GESTIONNAIRE)
  repondre(
    @Param('id') id: string,
    @Body('contenu') contenu: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.repondre(id, contenu, user);
  }
}
