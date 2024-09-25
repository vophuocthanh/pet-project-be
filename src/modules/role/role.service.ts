import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from 'src/modules/role/dto/create.dto';
import { RoleDto, RoleResponseType } from 'src/modules/role/dto/role.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(data: CreateRoleDto) {
    return this.prisma.role.create({ data });
  }

  async getRoles(filter: RoleDto): Promise<RoleResponseType> {
    const search = filter.search || '';

    const role = await this.prisma.role.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
            },
          },
        ],
      },
    });

    const total = await this.prisma.role.count({
      where: {
        OR: [
          {
            name: {
              contains: search,
            },
          },
        ],
      },
    });

    return {
      data: role,
      total,
    };
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
