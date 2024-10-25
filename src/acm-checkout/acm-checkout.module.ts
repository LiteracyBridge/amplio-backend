import { Module } from '@nestjs/common';
import { AcmCheckoutController } from './acm-checkout.controller';
import { AcmCheckoutService } from './acm-checkout.service';

@Module({
  controllers: [AcmCheckoutController],
  providers: [AcmCheckoutService]
})
export class AcmCheckoutModule {}
