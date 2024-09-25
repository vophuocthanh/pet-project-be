import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { FileUploadService } from 'src/lib/file-upload.service';
import { UpdateUserDto, UserFilterType } from 'src/modules/user/dto/user.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  async getAll(filters: UserFilterType): Promise<any> {
    const { items_per_page = 10, page = 1, search } = filters;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const users = await this.prismaService.user.findMany({
      where,
      skip: (page - 1) * items_per_page,
      take: items_per_page,
      select: {
        id: true,
        email: true,
        phone: true,
        address: true,
        avatar: true,
        name: true,
        date_of_birth: true,
        country: true,
        createAt: true,
        updateAt: true,
        verificationCode: true,
        verificationCodeExpiresAt: true,
        isVerified: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalUsers = await this.prismaService.user.count({ where });

    return {
      data: users,
      totalItems: totalUsers,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getDetail(
    id: string,
  ): Promise<Omit<User, 'password' | 'confirmPassword'>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, confirmPassword, ...userWithoutPassword } =
      await this.prismaService.user.findFirst({
        where: { id },
      });
    return userWithoutPassword;
  }

  async updateMeUser(data: UpdateUserDto, id: string): Promise<User> {
    return await this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async updateUserRole(userId: string, roleId: string): Promise<User> {
    const role = await this.prismaService.role.findUnique({
      where: {
        id: roleId,
      },
    });

    if (!role) {
      throw new HttpException(
        { message: 'Role not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        roleId,
      },
    });
  }

  async updateMeUserS3(data: UpdateUserDto, id: string): Promise<User> {
    return await this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async updateAvatarS3(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const avatarUrl = await this.fileUploadService.uploadImageToS3(
      file,
      'avatars',
    );

    return await this.prismaService.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
  }
}
