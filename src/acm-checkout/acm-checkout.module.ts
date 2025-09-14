import { Module } from '@nestjs/common';
import { AcmCheckoutController } from './acm-checkout.controller';
import { AcmCheckoutService } from './acm-checkout.service';
import { DeploymentMetadataService } from './deployment-metadata.service';
import { TbLoaderModule } from 'src/tb-loader/tb-loader.module';

@Module({
  imports: [TbLoaderModule],
  controllers: [AcmCheckoutController],
  providers: [AcmCheckoutService, DeploymentMetadataService]
})
export class AcmCheckoutModule {}
