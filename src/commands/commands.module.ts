import { Module } from "@nestjs/common";
import { NewAcmService } from "./new-acm.service";
import { config } from "dotenv";
import { AppModule } from "src/app.module";
import { ConsoleModule } from "nestjs-console";
import { ProgramsModule } from "src/programs/programs.module";
import { AcmCheckoutModule } from "src/acm-checkout/acm-checkout.module";
import { ACMMetadataService } from "./acm-metadata.service";

config();

@Module({
	imports: [AppModule, ProgramsModule, AcmCheckoutModule, ConsoleModule],
	controllers: [],
	providers: [NewAcmService, ACMMetadataService],
})
export class CommandsModule {}
