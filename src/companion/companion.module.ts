import { Module } from '@nestjs/common';
import { CompanionAppController } from './companion.controller';
import { CompanionAppService } from './companion.service';

@Module({
  controllers: [CompanionAppController],
  providers: [CompanionAppService]
})
export class CompanionAppModule {}
