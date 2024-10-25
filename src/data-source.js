// ts-check

const { DataSource } = require("typeorm");
const dotenv = require("dotenv");

const { User } = require("../dist/entities/user.entity");
const { UserRole } = require("../dist/entities/user_role.entity");
const { Invitation } = require("../dist/entities/invitation.entity");
const { Organisation } = require("../dist/entities/organisation.entity");
const { Analysis } = require("../dist/entities/analysis.entity");
const { SupportedCategory } = require("../dist/entities/category.entity");
const { ContentMetadata } = require("../dist/entities/content_metadata.entity");
const { ACMCheckout } = require("../dist/entities/checkout.entity");
const { AnalysisChoice } = require("../dist/entities/analysis_choice.entity");
const { Deployment } = require("../dist/entities/deployment.entity");
const { Language } = require("../dist/entities/language.entity");
const { Message } = require("../dist/entities/message.entity");
const { MessageLanguages } = require("../dist/entities/message.entity");
const { OrganisationProgram } = require("../dist/entities/org_program.entity");
const { ProjectLanguage } = require("../dist/entities/language.entity");
const { Playlist } = require("../dist/entities/playlist.entity");
const { ProgramUser } = require("../dist/entities/program_user.entity");
const { Program } = require("../dist/entities/program.entity");
const { Project } = require("../dist/entities/project.entity");
const { Recipient } = require("../dist/entities/recipient.entity");
const { Survey } = require("../dist/entities/survey.entity");
const { SurveySection } = require("../dist/entities/survey_section.entity");
const { TalkingBookDeployed } = require("../dist/entities/tb_deployed.entity");
const { Choice } = require("../dist/entities/uf_choice.entity");
const { Question } = require("../dist/entities/uf_question.entity");
const { UserFeedbackMessage } = require("../dist/entities/uf_message.entity");
const { TalkingBookLoaderId } = require("../dist/entities/tbloader-ids.entity");
const { Role } = require("../dist/entities/role.entity");
const { Log } = require("../dist/entities/log.entity");

dotenv.config();

const AppDataSource = new DataSource({
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	host: process.env.DB_HOST,
	type: "postgres",
	schema: "public",
	entities: [
    Role,
    Log,
		User,
		UserRole,
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
    TalkingBookLoaderId
	],
	migrations: ["./migrations/*.ts"],
	// These two lines have been added:
	// seeds: ["./database/seeding/seeds/**/*{.ts,.js}"],
	// factories: ["./database/seeding/factories/**/*{.ts,.js}"],
	// subscribers: [],
});

exports.AppDataSource = AppDataSource;
