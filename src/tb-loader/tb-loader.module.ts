import { Module } from '@nestjs/common';
import { TbLoaderController } from './tb-loader.controller';
import { TbLoaderService } from './tb-loader.service';

@Module({
  controllers: [TbLoaderController],
  providers: [TbLoaderService]
})
export class TbLoaderModule {}
