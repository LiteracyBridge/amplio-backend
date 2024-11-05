import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config } from "dotenv";
import { User, UserSubscriber } from "./entities/user.entity";
import { Organisation } from "./entities/organisation.entity";
import { UserRole } from "./entities/user_role.entity";
import { Invitation } from "./entities/invitation.entity";
import { UsersModule } from "./users/users.module";
import { APP_FILTER, APP_GUARD, RouterModule, Routes } from "@nestjs/core";
import { AuthGuard } from "./guards/jwt-auth.guard";
import { Analysis } from "./entities/analysis.entity";
import { SupportedCategory } from "./entities/category.entity";
import { ContentMetadata } from "./entities/content_metadata.entity";
import { Deployment } from "./entities/deployment.entity";
import { Language, ProjectLanguage } from "./entities/language.entity";
import {
	Message,
	MessageLanguages,
	MessageSubscriber,
} from "./entities/message.entity";
import { OrganisationProgram } from "./entities/org_program.entity";
import { Playlist, PlaylistSubscriber } from "./entities/playlist.entity";
import { ProgramUser } from "./entities/program_user.entity";
import { Program } from "./entities/program.entity";
import { Project } from "./entities/project.entity";
import { Recipient, RecipientSubscriber } from "./entities/recipient.entity";
import { Survey } from "./entities/survey.entity";
import { SurveySection } from "./entities/survey_section.entity";
import { TalkingBookDeployed } from "./entities/tb_deployed.entity";
import { Choice } from "./entities/uf_choice.entity";
import { Question } from "./entities/uf_question.entity";
import { ACMCheckout } from "./entities/checkout.entity";
import { AnalysisChoice } from "./entities/analysis_choice.entity";
import { UserFeedbackMessage } from "./entities/uf_message.entity";
import { Role } from "./entities/role.entity";
import { TableauController } from "./tableau.controller";
import { DashboardQueriesModule } from "./dashboard-queries/dashboard-queries.module";
import { UserfeedbackModule } from "./userfeedback/userfeedback.module";
import { CategoriesController } from "./categories.controller";
import { ProgramsModule } from "./programs/programs.module";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { Log } from "./entities/log.entity";
import { AcmCheckoutModule } from "./acm-checkout/acm-checkout.module";
import { TalkingBookLoaderId } from "./entities/tbloader-ids.entity";
import { TbLoaderModule } from "./tb-loader/tb-loader.module";
import { PublishedProgramSpecs } from "./entities/published_spec.entity";

config();

const routes: Routes = [{ path: "/user-feedback", module: UserfeedbackModule }];

@Module({
	imports: [
		SentryModule.forRoot(),

		RouterModule.register(routes),

		TypeOrmModule.forRoot({
			host: process.env.DB_HOST,
			port: 5432,
			username: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
			type: "postgres",
			maxQueryExecutionTime: 50,
			autoLoadEntities: true,
			logNotifications: false,
			logging: false,
			entities: [
				User,
				UserRole,
				Role,
				Invitation,
				Organisation,
				Analysis,
				SupportedCategory,
				ContentMetadata,
				ACMCheckout,
				AnalysisChoice,
				Deployment,
				Language,
				Message,
				MessageLanguages,
				OrganisationProgram,
				ProjectLanguage,
				Playlist,
				ProgramUser,
				Program,
				Project,
				Recipient,
				Survey,
				SurveySection,
				TalkingBookDeployed,
				Choice,
				Question,
				UserFeedbackMessage,
				TalkingBookLoaderId,
				PublishedProgramSpecs,
			],
			subscribers: [
				PlaylistSubscriber,
				UserSubscriber,
				MessageSubscriber,
				RecipientSubscriber,
			],
		}),

		UsersModule,
		DashboardQueriesModule,
		UserfeedbackModule,
		ProgramsModule,
		Log,
		AcmCheckoutModule,
		TbLoaderModule,
	],
	controllers: [AppController, TableauController, CategoriesController],
	providers: [
		AppService,

		{
			provide: APP_FILTER,
			useClass: SentryGlobalFilter,
		},
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
		{
			provide: APP_FILTER,
			useClass: HttpExceptionFilter,
		},
	],
})
export class AppModule {}
