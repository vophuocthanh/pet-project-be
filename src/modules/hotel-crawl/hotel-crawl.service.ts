import { Injectable } from '@nestjs/common';
import { HotelCrawl, RoomType } from '@prisma/client';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import { CreateHotelCrawlDto } from 'src/modules/hotel-crawl/dto/create.dto';
import {
  HotelCrawlDto,
  HotelCrawlPaginationResponseType,
} from 'src/modules/hotel-crawl/dto/hotel-crawl.dto';
import { UpdateHotelCrawlDto } from 'src/modules/hotel-crawl/dto/update.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class HotelCrawlService {
  constructor(private prismaService: PrismaService) {}

  async importHotelsFromCSV(filePath: string): Promise<void> {
    const hotels = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const hotel = {
            hotel_names:
              row.hotel_names !== 'No value' ? row.hotel_names : null,
            location: row.location !== 'No value' ? row.location : null,
            star_number:
              row.star_number !== 'No value'
                ? parseFloat(row.star_number) || 0
                : null,
            price: row.price !== 'No value' ? parseFloat(row.price) || 0 : 0,
            score_hotels:
              row.score_hotels !== 'No value'
                ? parseFloat(row.score_hotels) || 0
                : 0,
            number_rating:
              row.number_rating !== 'No value'
                ? parseFloat(row.number_rating) || 0
                : 0,
            received_time:
              row.received_time !== 'No value' ? row.received_time : null,
            giveback_time:
              row.giveback_time !== 'No value' ? row.giveback_time : null,
            description:
              row.description !== 'No value' ? row.description : null,
            hotel_link: row.hotel_link !== 'No value' ? row.hotel_link : null,
            place: row.place !== 'No value' ? row.place : null,
          };

          hotels.push(hotel);
        })
        .on('end', async () => {
          try {
            for (const hotel of hotels) {
              const createdHotel = await this.prismaService.hotelCrawl.create({
                data: hotel,
              });

              // Lấy giá mặc định từ trường price
              const defaultPrice = hotel.price; // Giá mặc định từ CSV

              // Danh sách các loại phòng với giá tăng dần
              const roomTypes = [
                { type: RoomType.SINGLE, priceMultiplier: 1.0 }, // Giá không đổi
                { type: RoomType.DOUBLE, priceMultiplier: 1.2 }, // Giá tăng 20%
                { type: RoomType.SUITE, priceMultiplier: 1.4 }, // Giá tăng 40%s
                { type: RoomType.DELUXE, priceMultiplier: 1.8 }, // Giá tăng 80%
              ];

              for (const roomType of roomTypes) {
                // Tính toán giá cho từng loại phòng
                const pricePerDay = defaultPrice * roomType.priceMultiplier;

                await this.prismaService.room.create({
                  data: {
                    type: roomType.type,
                    hotelId: createdHotel.id,
                    pricePerDay: pricePerDay, // Giá cho từng loại phòng
                  },
                });
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async getHotelCrawl(
    filters: HotelCrawlDto,
  ): Promise<HotelCrawlPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const search = filters.search || '';
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const sort_by_price = filters.sort_by_price === 'desc' ? 'desc' : 'asc';

    const min_price = parseFloat(filters.min_price?.toString() || '0');
    const max_price = parseFloat(
      filters.max_price?.toString() || `${Number.MAX_SAFE_INTEGER}`,
    );

    const starNumber = filters.star_number
      ? Number(filters.star_number)
      : undefined;

    // Lấy danh sách các place duy nhất nếu có
    const places = filters.place ? filters.place.split(',') : undefined;

    const hotelCrawl = await this.prismaService.hotelCrawl.findMany({
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
            hotel_names: {
              contains: search,
              mode: 'insensitive',
            },
          },
          places && places.length > 0
            ? {
                place: {
                  in: places, // Lọc theo danh sách các place
                },
              }
            : {},
          starNumber !== undefined
            ? {
                star_number: starNumber,
              }
            : {},
        ],
      },
      orderBy: {
        price: sort_by_price,
      },
    });

    const total = await this.prismaService.hotelCrawl.count({
      where: {
        AND: [
          {
            price: {
              gte: min_price,
              lte: max_price,
            },
          },
          {
            hotel_names: {
              contains: search,
              mode: 'insensitive',
            },
          },
          places && places.length > 0
            ? {
                place: {
                  in: places,
                },
              }
            : {},
          starNumber !== undefined
            ? {
                star_number: starNumber,
              }
            : {},
        ],
      },
    });

    return {
      data: hotelCrawl,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }
  async getHotelCrawlById(id: string) {
    const hotel = await this.prismaService.hotelCrawl.findFirst({
      where: {
        id,
      },
      include: {
        rooms: true,
      },
    });

    return {
      ...hotel,
    };
  }

  async putHotelCrawl(
    id: string,
    data: UpdateHotelCrawlDto,
  ): Promise<HotelCrawl> {
    return this.prismaService.hotelCrawl.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteHotelCrawl(id: string): Promise<{ message: string }> {
    // Xóa tất cả các bản ghi rooms liên quan trước
    await this.prismaService.room.deleteMany({
      where: {
        hotelId: id,
      },
    });

    // Xóa bản ghi hotelCrawl sau khi xóa các bản ghi liên quan
    await this.prismaService.hotelCrawl.delete({
      where: {
        id: id,
      },
    });

    return { message: 'Hotel crawl deleted successfully' };
  }

  async createHotelCrawl(data: CreateHotelCrawlDto): Promise<HotelCrawl> {
    const createdHotel = await this.prismaService.hotelCrawl.create({
      data: {
        ...data,
        description: data.description || '',
      },
    });
    const defaultPrice = data.price;

    const roomTypes = [
      { type: RoomType.SINGLE, priceMultiplier: 1.0 },
      { type: RoomType.DOUBLE, priceMultiplier: 1.2 },
      { type: RoomType.SUITE, priceMultiplier: 1.4 },
      { type: RoomType.DELUXE, priceMultiplier: 1.8 },
    ];

    for (const roomType of roomTypes) {
      const pricePerDay = defaultPrice * roomType.priceMultiplier;

      await this.prismaService.room.create({
        data: {
          type: roomType.type,
          hotelId: createdHotel.id,
          pricePerDay: pricePerDay,
        },
      });
    }

    return createdHotel;
  }

  async getUniquePlaces(): Promise<{ data: string[] }> {
    const uniquePlaces = await this.prismaService.hotelCrawl.findMany({
      distinct: ['place'],
      select: {
        place: true,
      },
    });

    const places = uniquePlaces.map((hotel) => hotel.place).filter(Boolean);

    return { data: places };
  }

  async getPopularHotelCrawl(limit: number = 10): Promise<HotelCrawl[]> {
    return this.prismaService.hotelCrawl.findMany({
      take: limit,
      orderBy: {
        star_number: 'desc',
      },
    });
  }
}
