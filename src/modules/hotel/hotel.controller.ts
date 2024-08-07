import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Hotel } from '@prisma/client';
import { HandleAuthGuard } from 'src/modules/auth/guard/auth.guard';
import {
  CreateHotelDto,
  HotelDto,
  HotelPaginationResponseType,
} from 'src/modules/hotel/dto/hotel.dto';
import { HotelService } from 'src/modules/hotel/hotel.service';
import { RequestWithUser } from 'src/types/users';

@Controller('hotel')
export class HotelController {
  constructor(private hotelService: HotelService) {}
  @Get()
  getHotels(@Query() params: HotelDto): Promise<HotelPaginationResponseType> {
    return this.hotelService.getHotels(params);
  }
  @Get(':id')
  getHotelById(@Query('id') id: string): Promise<Hotel> {
    return this.hotelService.getHotelById(id);
  }

  @UseGuards(HandleAuthGuard)
  @Post()
  async createHotel(
    @Body() createHotelDto: CreateHotelDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.hotelService.createHotel(createHotelDto, userId);
  }

  @UseGuards(HandleAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Hotel): Promise<Hotel> {
    return this.hotelService.updateHotel(id, body);
  }

  @UseGuards(HandleAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string): Promise<Hotel> {
    return this.hotelService.deleteHotel(id);
  }
}
