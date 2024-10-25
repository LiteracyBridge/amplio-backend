import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from './utilities/api_response';
import { SupportedCategory } from './entities/category.entity';

@Controller('categories')
export class CategoriesController {
  @Get("supported")
  async SupportedCategories() {
    return ApiResponse.Success({ data: await SupportedCategory.find() })
  }
}
