import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from "dotenv"
import { User, UserSubscriber } from './entities/user.entity';
import { Organisation } from './entities/organisation.entity';
import { UserRole } from './entities/user_role.entity';
import { Invitation } from './entities/invitation.entity';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/jwt-auth.guard';
import { Analysis } from './entities/analysis.entity';
import { SupportedCategory } from './entities/category.entity';
import { ContentMetadata } from './entities/content_metadata.entity';
import { Deployment } from './entities/deployment.entity';
import { Language, ProjectLanguage } from './entities/language.entity';
import { Message, MessageLanguages } from './entities/message.entity';
import { OrganisationProgram } from './entities/org_program.entity';
import { Playlist, PlaylistSubscriber } from './entities/playlist.entity';
import { ProgramUser } from './entities/program_user.entity';
import { Program } from './entities/program.entity';
import { Project } from './entities/project.entity';
import { Recipient } from './entities/recipient.entity';
import { Survey, SurveySection } from './entities/survey.entity';
import { TalkingBookDeployed } from './entities/tb_deployed.entity';
import { Choice } from './entities/uf_choice.entity';
import { Question } from './entities/uf_question.entity';
import { ACMCheckout } from './entities/checkout.entity';
import { AnalysisChoice } from './entities/analysis_choice.entity';
import { UserFeedbackMessage } from './entities/uf_message.entity';
import { Role } from './entities/role.entity';

config()

@Module({
  imports: [
    TypeOrmModule.forRoot({
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      type: 'postgres',
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
        UserFeedbackMessage
      ],
      subscribers: [PlaylistSubscriber, UserSubscriber],
    }),
    TypeOrmModule.forFeature([User]),

    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule { }
