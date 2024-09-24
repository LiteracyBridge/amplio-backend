import { Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProgramSpecService } from './spec.service';
import { ApiResponse } from 'src/utilities/api_response';
import { CurrentUser } from 'src/decorators/user.decorator';
import { User } from 'src/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipJwtAuth } from 'src/decorators/skip-jwt-auth.decorator';

@Controller('programs/spec')
export class SpecController {
  constructor(private service: ProgramSpecService) { }
  @Get("content")
  async getContent(
    @Query("programid") code: string,
    @CurrentUser() user: User
  ) {
    return ApiResponse.Success({ data: await this.service.findByCode(code, user) })
  }


  @SkipJwtAuth()
  @Post('upload')
  // @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    // @UploadedFile() file: Express.Multer.File,
    // @Query("programid") code: string,
  ) {

    // console.log(file);
    await this.service.import(null, null)
  }

}
