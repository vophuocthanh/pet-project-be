import { Injectable } from '@nestjs/common';
import { HotelCrawl } from '@prisma/client';
import * as csv from 'csv-parser';
import * as fs from 'fs';
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
              await this.prismaService.hotelCrawl.create({
                data: hotel,
              });
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
            },
          },
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
            },
          },
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

  async getHotelCrawlById(id: string): Promise<HotelCrawl> {
    return this.prismaService.hotelCrawl.findFirst({
      where: {
        id,
      },
    });
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
    await this.prismaService.hotelCrawl.delete({
      where: {
        id,
      },
    });
    return { message: 'Delete hotel crawl successfully' };
  }
}