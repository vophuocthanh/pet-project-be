import {
  BadRequestException,
  ForbiddenException,
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
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const search = filters.search || '';
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

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
      skip,
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
      total: totalUsers,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getDetail(id: string): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateMeUser(data: UpdateUserDto, id: string): Promise<User> {
    return await this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async updateUserRole(
    userId: string, // ID của người dùng cần cập nhật
    roleId: string,
    currentUserId: string, // ID của người dùng hiện tại
  ): Promise<User> {
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot update your own role.');
    }

    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new HttpException(
        { message: 'Role not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.prismaService.user.update({
      where: { id: userId },
      data: { roleId },
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

  async deleteUser(
    userId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prismaService.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async getCountUser(): Promise<{ data: { total: number } }> {
    const totalUsers = await this.prismaService.user.count();
    return { data: { total: totalUsers } };
  }

  async getUserPoints(userId: string): Promise<number> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.points || 0;
  }
}
