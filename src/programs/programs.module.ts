import { Module } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { ProgramSpecService } from './spec/spec.service';
import { SpecController } from './spec/spec.controller';

@Module({
  providers: [ProgramsService, ProgramSpecService],
  controllers: [ProgramsController, SpecController]
})
export class ProgramsModule {}
