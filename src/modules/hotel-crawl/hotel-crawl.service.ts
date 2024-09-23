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
            hotel_names: row.hotel_names || '',
            location: row.location || '',
            star_number: row.star_number || '',
            price: row.price || '0',
            score_hotels: row.score_hotels || '0',
            number_rating: row.number_rating || '0',
            received_time: row.received_time || '',
            giveback_time: row.giveback_time || '',
            description: row.description || '',
            hotel_link: row.hotel_link || '',
            place: row.place || '',
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

  async getFlightsCrawl(
    filters: HotelCrawlDto,
  ): Promise<HotelCrawlPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const search = filters.search || '';
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const hotelCrawl = await this.prismaService.hotelCrawl.findMany({
      take: items_per_page,
      skip,
      where: {
        OR: [
          {
            hotel_names: {
              contains: search,
            },
          },
        ],
      },
    });
    const total = await this.prismaService.hotelCrawl.count({
      where: {
        OR: [
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
  async getFlightCrawlById(id: string): Promise<HotelCrawl> {
    return this.prismaService.hotelCrawl.findFirst({
      where: {
        id,
      },
    });
  }

  async putFlightCrawl(
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

  async deleteFlightCrawl(id: string): Promise<{ message: string }> {
    await this.prismaService.hotelCrawl.delete({
      where: {
        id,
      },
    });
    return { message: 'Delete hotel crawl successfully' };
  }
}
