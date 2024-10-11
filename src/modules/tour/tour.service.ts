import { Injectable, NotFoundException } from '@nestjs/common';
import { Tour } from '@prisma/client';
import * as dayjs from 'dayjs';
import { CreateDtoTour } from 'src/modules/tour/dto/create.dto';
import {
  TourDto,
  TourPaginationResponseType,
} from 'src/modules/tour/dto/tour.dto';
import { UpdateDtoTour } from 'src/modules/tour/dto/update.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class TourService {
  constructor(private prismaService: PrismaService) {}

  private parseDateString(dateString: string): Date | undefined {
    if (!dateString) return undefined;
    const [day, month, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  async getTours(filters: TourDto): Promise<TourPaginationResponseType> {
    if (!filters) {
      throw new Error('Filters must be provided');
    }

    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const search = filters.search || '';
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const sort_by_price = filters.sort_by_price === 'desc' ? 'desc' : 'asc';

    const min_price = filters.min_price
      ? parseFloat(filters.min_price.toString())
      : 0;
    const max_price = filters.max_price
      ? parseFloat(filters.max_price.toString())
      : Number.MAX_SAFE_INTEGER;

    const startDate = this.parseDateString(filters.start_date);
    const endDate = this.parseDateString(filters.end_date);

    const filterRating = filters.rating ? Number(filters.rating) : undefined;

    const tours = await this.prismaService.tour.findMany({
      take: items_per_page,
      skip,
      where: {
        AND: [
          {
            price: {
              gte: min_price,
              lte: max_price,
            },
          },
          {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
          ...(startDate || endDate
            ? [
                {
                  start_date: {
                    gte: startDate || new Date('1970-01-01'),
                    lte: endDate || new Date(),
                  },
                },
              ]
            : []),
          filterRating !== undefined
            ? {
                rating: {
                  equals: filterRating,
                },
              }
            : {},
        ],
      },
      orderBy: {
        price: sort_by_price,
      },
    });

    const total = await this.prismaService.tour.count({
      where: {
        AND: [
          {
            price: {
              gte: min_price,
              lte: max_price,
            },
          },
          {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
          ...(startDate || endDate
            ? [
                {
                  start_date: {
                    gte: startDate || new Date('1970-01-01'),
                    lte: endDate || new Date(),
                  },
                },
              ]
            : []),
          filterRating !== undefined
            ? {
                rating: {
                  equals: filterRating,
                },
              }
            : {},
        ],
      },
    });

    if (!tours) {
      throw new NotFoundException('No tours found');
    }

    return {
      data: tours,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getTourById(tourId: string, userId?: string) {
    const tour = await this.prismaService.tour.findUnique({
      where: {
        id: tourId,
      },
      include: {
        tourFavorites: {
          where: {
            userId,
          },
          select: {
            isFavorite: true,
          },
        },
      },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const isFavorite =
      tour.tourFavorites.length > 0 && tour.tourFavorites[0].isFavorite;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tourFavorites, ...tourWithoutFavorites } = tour;

    return {
      ...tourWithoutFavorites,
      isFavorite,
    };
  }

  async createTours(data: CreateDtoTour, userId: string): Promise<Tour> {
    const startDate = dayjs(data.start_date, 'DD/MM/YYYY');
    const endDate = dayjs(data.end_date, 'DD/MM/YYYY');

    if (!startDate.isValid() || !endDate.isValid()) {
      throw new Error(
        'start_date and end_date must be valid dates in the format DD/MM/YYYY',
      );
    }

    const numberOfDays = endDate.diff(startDate, 'day') + 1;
    const numberOfNights = numberOfDays > 1 ? numberOfDays - 1 : 0;

    const timeTripFormatted = `${numberOfDays}N${numberOfNights}D`;

    const babyPrice = 0;
    const childPrice = data.price / 2;
    const adultPrice = data.price;

    return this.prismaService.tour.create({
      data: {
        ...data,
        userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        time_trip: timeTripFormatted,
        baby_price: babyPrice,
        child_price: childPrice,
        adult_price: adultPrice,
      },
    });
  }

  async updateTour(id: string, data: UpdateDtoTour): Promise<Tour> {
    return this.prismaService.tour.update({
      where: {
        id,
      },
      data: {
        ...data,
        price: data.price,
      },
    });
  }

  async deleteTour(id: string): Promise<{ message: string }> {
    await this.prismaService.tour.delete({
      where: {
        id,
      },
    });
    return { message: 'Tour deleted successfully' };
  }

  // isFavorite

  async markAsFavorite(userId: string, tourId: string): Promise<void> {
    await this.prismaService.tourFavorite.upsert({
      where: {
        userId_tourId: {
          userId,
          tourId,
        },
      },
      create: {
        userId,
        tourId,
        isFavorite: true,
      },
      update: {
        isFavorite: true,
      },
    });
  }

  async unmarkAsFavorite(userId: string, tourId: string): Promise<void> {
    await this.prismaService.tourFavorite.updateMany({
      where: {
        userId,
        tourId,
      },
      data: {
        isFavorite: false,
      },
    });
  }

  async getFavoriteTours(userId: string) {
    const isFavoriteTour = await this.prismaService.tour.findMany({
      where: {
        tourFavorites: {
          some: {
            userId,
            isFavorite: true,
          },
        },
      },
      include: {
        tourFavorites: {
          where: {
            userId,
          },
        },
      },
    });

    const totalFavoriteTour = await this.prismaService.tourFavorite.count({
      where: {
        userId,
        isFavorite: true,
      },
    });

    return {
      data: isFavoriteTour,
      total: totalFavoriteTour,
    };
  }
}
