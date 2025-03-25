import { Module } from '@nestjs/common';
import { AcmCheckoutController } from './acm-checkout.controller';
import { AcmCheckoutService } from './acm-checkout.service';
import { DeploymentMetadataService } from './deployment-metadata.service';

@Module({
  controllers: [AcmCheckoutController],
  providers: [AcmCheckoutService, DeploymentMetadataService]
})
export class AcmCheckoutModule {}
