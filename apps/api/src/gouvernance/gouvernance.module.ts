import { Module } from '@nestjs/common';
import { GouvernanceService } from './gouvernance.service';
import { GouvernanceController } from './gouvernance.controller';

@Module({
  controllers: [GouvernanceController],
  providers: [GouvernanceService],
  exports: [GouvernanceService],
})
export class GouvernanceModule {}
