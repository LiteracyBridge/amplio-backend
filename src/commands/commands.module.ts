import { Module } from "@nestjs/common";
import { NewAcmService } from "./new-acm/new-acm.service";
import { config } from "dotenv";
import { AppModule } from "src/app.module";
import { ConsoleModule } from "nestjs-console";
import { ProgramsModule } from "src/programs/programs.module";

config();

@Module({
	imports: [AppModule, ProgramsModule, ConsoleModule],
	controllers: [],
	providers: [NewAcmService],
})
export class CommandsModule {}
