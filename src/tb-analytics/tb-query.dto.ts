import { IsOptional, IsString } from "class-validator";

export class SummaryAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  deployment?: string;

  @IsOptional()
  @IsString()
  deployment_name?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  playlist?: string;
}
