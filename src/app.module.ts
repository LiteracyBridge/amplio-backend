import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from "dotenv"
import { User } from './entities/user.entity';
import { Organisation } from './entities/organisation.entity';
import { UserRole } from './entities/user_role.entity';
import { Invitation } from './entities/invitations.entity';

config()

@Module({
  imports: [
    TypeOrmModule.forRoot({
      host: process.env.DB_HOST,
      port: 3306,
      username: process.env.DB_USER || 'root',
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
        Invitation,
        Organisation
      ]
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
