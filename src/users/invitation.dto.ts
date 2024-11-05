import { Type } from "class-transformer"
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class InvitationDto {
  @IsNotEmpty()
  @IsString()
  first_name: string

  @IsNotEmpty()
  @IsString()
  last_name: string

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  organisation_id?: number;

}
