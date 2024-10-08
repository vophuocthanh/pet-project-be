import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { HandleAuthGuard } from 'src/modules/auth/guard/auth.guard';
import {
  UpdateUserDto,
  UserFilterType,
  UserPaginationResponseType,
} from 'src/modules/user/dto/user.dto';
import { UserService } from 'src/modules/user/user.service';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(HandleAuthGuard)
  @Get('me')
  @ApiResponse({ status: 200, description: 'Successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Lấy ra thông tin user đang đăng nhập' })
  async getCurrentUser(
    @Req() req,
  ): Promise<Omit<User, 'password' | 'confirmPassword'>> {
    const userId = req.user.id;
    const user = await this.userService.getDetail(userId);
    return user;
  }

  @UseGuards(HandleAuthGuard)
  @Get()
  @ApiResponse({ status: 200, description: 'Successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Lấy ra danh sách user' })
  getAll(@Query() params: UserFilterType): Promise<UserPaginationResponseType> {
    return this.userService.getAll(params);
  }

  @UseGuards(HandleAuthGuard)
  @Get(':id')
  @ApiResponse({ status: 200, description: 'Successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Lấy ra thông tin chi tiết user' })
  getDetail(
    @Param('id') id: string,
  ): Promise<Omit<User, 'password' | 'confirmPassword'>> {
    return this.userService.getDetail(id);
  }

  @Put(':id/role')
  @ApiResponse({ status: 200, description: 'Successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Cập nhật role cho user' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleId') roleId: string,
  ) {
    return this.userService.updateUserRole(id, roleId);
  }

  @UseGuards(HandleAuthGuard)
  @Put('me')
  @ApiResponse({ status: 200, description: 'Successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Cập nhật thông tin user đang đăng nhập' })
  async updateMe(@Req() req, @Body() data: UpdateUserDto) {
    return this.userService.updateMeUser(data, req.user.id);
  }

  @UseGuards(HandleAuthGuard)
  @Post('upload-avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatarS3(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.userService.updateAvatarS3(req.user.id, file);
  }
}
