import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus } from '@prisma/client';
import * as moment from 'moment-timezone';
import { mailService } from 'src/lib/mail.service';
import {
  BookingDto,
  BookingPaginationResponseType,
} from 'src/modules/bookings/dto/booking.dto';
import { CreateFlightBookingDto } from 'src/modules/bookings/dto/create-flight-booking.dto';
import { CreateHotelBookingDto } from 'src/modules/bookings/dto/create-hotel-booking.dto';
import { CreateRoadVehicleBookingDto } from 'src/modules/bookings/dto/create-road-vehicle-booking.dto';
import { CreateTourBookingDto } from 'src/modules/bookings/dto/create-tour-booking.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prismaService: PrismaService) {}

  private parseDateStringWithTimezone(dateString: string): Date | undefined {
    if (!dateString) return undefined;
    const [day, month, year] = dateString.split('-').map(Number);

    // Tạo đối tượng Date và chuyển đổi về múi giờ Việt Nam (UTC+7)
    const dateInVN = moment
      .tz(`${year}-${month}-${day}`, 'Asia/Ho_Chi_Minh')
      .toDate();

    return dateInVN;
  }

  async getAllBookings(
    filters: BookingDto,
  ): Promise<BookingPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const search = filters.search || '';
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const flights = await this.prismaService.booking.findMany({
      take: items_per_page,
      skip,
      where: {
        OR: [
          {
            hotelCrawlId: {
              contains: search,
            },
          },
          {
            flightCrawlId: {
              contains: search,
            },
          },
          {
            tourId: {
              contains: search,
            },
          },
        ],
      },
    });
    const total = await this.prismaService.booking.count({
      where: {
        OR: [
          {
            hotelCrawlId: {
              contains: search,
            },
          },
          {
            flightCrawlId: {
              contains: search,
            },
          },
          {
            tourId: {
              contains: search,
            },
          },
        ],
      },
    });
    return {
      data: flights,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getBookedFlights(
    filters: BookingDto,
  ): Promise<BookingPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const getFlightBooking = await this.prismaService.booking.findMany({
      take: items_per_page,
      skip,
      where: { flightCrawlId: { not: null } },
      include: {
        flightCrawls: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const total = await this.prismaService.booking.count({
      where: { flightCrawlId: { not: null } },
    });

    return {
      data: getFlightBooking,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getRoadVehicleBooking(
    filters: BookingDto,
  ): Promise<BookingPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const getRoadVehicleBooking = await this.prismaService.booking.findMany({
      take: items_per_page,
      skip,
      where: { roadVehicleId: { not: null } },
      include: {
        roadVehicles: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    const total = await this.prismaService.booking.count({
      where: { roadVehicleId: { not: null } },
    });
    return {
      data: getRoadVehicleBooking,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getBookedHotels(
    filters: BookingDto,
  ): Promise<BookingPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const getHotelBooking = await this.prismaService.booking.findMany({
      take: items_per_page,
      skip,
      where: { hotelCrawlId: { not: null } },
      include: {
        hotelCrawls: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const total = await this.prismaService.booking.count({
      where: { hotelCrawlId: { not: null } },
    });

    return {
      data: getHotelBooking,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async getBookedTours(
    filters: BookingDto,
  ): Promise<BookingPaginationResponseType> {
    const items_per_page = Number(filters.items_per_page) || 10;
    const page = Number(filters.page) || 1;
    const skip = page > 1 ? (page - 1) * items_per_page : 0;

    const getTourBooking = await this.prismaService.booking.findMany({
      take: items_per_page,
      skip,
      where: { tourId: { not: null } },
      include: {
        tour: {
          include: {
            hotel: true,
            flight: true,
          },
        },
        hotelCrawls: true,
        flightCrawls: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const total = await this.prismaService.booking.count({
      where: { tourId: { not: null } },
    });

    return {
      data: getTourBooking,
      total,
      currentPage: page,
      itemsPerPage: items_per_page,
    };
  }

  async bookFlight(
    createFlightBookingDto: CreateFlightBookingDto,
    userId: string,
  ): Promise<Booking> {
    const { flightCrawlId, flightQuantity, ticketFlighttId, flightDate } =
      createFlightBookingDto;

    if (!moment(flightDate, 'DD-MM-YYYY', true).isValid()) {
      throw new BadRequestException(
        'flightDate must be in the format dd-mm-yyyy',
      );
    }

    const flight = await this.prismaService.flightCrawl.findUnique({
      where: { id: flightCrawlId },
      include: { Ticket: true },
    });

    if (!flight) {
      throw new Error('Flight not found');
    }

    const ticket = flight.Ticket.find(
      (ticket) => ticket.id === ticketFlighttId,
    );

    if (!ticket) {
      throw new Error('Ticket not found for this flight');
    }

    if (flight.number_of_seats_remaining < flightQuantity) {
      throw new Error('Not enough available seats for the requested quantity');
    }

    const holidays = [
      moment('01-01-2024', 'DD-MM-YYYY').toDate(),
      moment('21-01-2024', 'DD-MM-YYYY').toDate(),
    ];

    const flightMomentDate = moment(flightDate, 'DD-MM-YYYY').toDate();

    const isHoliday = holidays.some((holiday) => {
      return (
        holiday.getDate() === flightMomentDate.getDate() &&
        holiday.getMonth() === flightMomentDate.getMonth() &&
        holiday.getFullYear() === flightMomentDate.getFullYear()
      );
    });

    let totalAmountFlight = ticket.price * flightQuantity;

    if (isHoliday) {
      totalAmountFlight *= 1.2;
    }

    await this.prismaService.flightCrawl.update({
      where: { id: flightCrawlId },
      data: {
        number_of_seats_remaining:
          flight.number_of_seats_remaining - flightQuantity,
      },
    });

    const isoFlightDate = moment(flightDate, 'DD-MM-YYYY').toISOString();

    return this.prismaService.booking.create({
      data: {
        flightCrawlId,
        userId,
        flightQuantity,
        ticketFlighttId,
        totalAmount: totalAmountFlight,
        flightDate: isoFlightDate,
      },
    });
  }

  async bookRoadVehicle(
    createRoadVehicleBookingDto: CreateRoadVehicleBookingDto,
    userId: string,
  ): Promise<Booking> {
    const { roadVehicleId, roadVehicleQuantity } = createRoadVehicleBookingDto;

    const roadVehicle = await this.prismaService.roadVehicle.findUnique({
      where: { id: roadVehicleId },
    });

    if (!roadVehicle) {
      throw new Error('Road vehicle not found');
    }

    if (roadVehicle.number_of_seats_remaining < roadVehicleQuantity) {
      throw new Error('Not enough available seats for the requested quantity');
    }

    await this.prismaService.roadVehicle.update({
      where: { id: roadVehicleId },
      data: {
        number_of_seats_remaining:
          roadVehicle.number_of_seats_remaining - roadVehicleQuantity,
      },
    });

    const totalAmountRoadVehicle = roadVehicle.price * roadVehicleQuantity;

    return this.prismaService.booking.create({
      data: {
        roadVehicleId,
        userId,
        roadVehicleQuantity,
        totalAmount: totalAmountRoadVehicle,
      },
    });
  }

  async bookHotel(
    createHotelBookingDto: CreateHotelBookingDto,
    userId: string,
  ) {
    const { hotelCrawlId, hotelQuantity, roomId, checkInDate, checkOutDate } =
      createHotelBookingDto;

    const hotel = await this.prismaService.hotelCrawl.findUnique({
      where: { id: hotelCrawlId },
      include: { rooms: true },
    });

    if (!hotel) {
      throw new Error('Hotel not found');
    }

    const room = hotel.rooms.find((room) => room.id === roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.available) {
      throw new Error('Selected room type is not available');
    }

    if (hotel.number_of_seats_remaining < hotelQuantity) {
      throw new Error('Not enough available rooms for the requested quantity');
    }

    const parsedCheckInDate = this.parseDateStringWithTimezone(checkInDate);
    const parsedCheckOutDate = this.parseDateStringWithTimezone(checkOutDate);

    const stayDuration = this.calculateNights(
      parsedCheckInDate,
      parsedCheckOutDate,
    );

    if (stayDuration <= 0) {
      throw new Error('Invalid stay duration');
    }

    await this.prismaService.hotelCrawl.update({
      where: { id: hotelCrawlId },
      data: {
        number_of_seats_remaining:
          hotel.number_of_seats_remaining - hotelQuantity,
      },
    });

    const totalAmountHotel = room.pricePerDay * hotelQuantity * stayDuration;

    return this.prismaService.booking.create({
      data: {
        hotelCrawlId,
        userId,
        roomId,
        hotelQuantity,
        checkInDate: parsedCheckInDate,
        checkOutDate: parsedCheckOutDate,
        totalAmount: totalAmountHotel,
      },
    });
  }

  private calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(
      Math.abs(checkOutDate.getTime() - checkInDate.getTime()) / oneDay,
    );
  }

  async bookTour(createTourBookingDto: CreateTourBookingDto, userId: string) {
    const { tourId, tourQuantity } = createTourBookingDto;

    const tour = await this.prismaService.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new Error('Tour not found');
    }

    if (tour.number_of_seats_remaining < tourQuantity) {
      throw new Error('Not enough available seats for the requested quantity');
    }

    await this.prismaService.tour.update({
      where: { id: tourId },
      data: {
        number_of_seats_remaining:
          tour.number_of_seats_remaining - tourQuantity,
      },
    });

    const totalAmountTour = tour.adult_price * tourQuantity;

    return this.prismaService.booking.create({
      data: {
        tourId,
        userId,
        tourQuantity,
        totalAmount: totalAmountTour,
      },
    });
  }

  async cancelFlightBooking(bookingId: string, userId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    await this.prismaService.booking.delete({
      where: { id: bookingId },
    });

    return { message: 'Booking canceled successfully' };
  }

  async cancelRoadVehicleBooking(bookingId: string, userId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    await this.prismaService.booking.delete({
      where: { id: bookingId },
    });

    return { message: 'Booking canceled successfully' };
  }

  async cancelHotelBooking(bookingId: string, userId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    await this.prismaService.booking.delete({
      where: { id: bookingId },
    });

    return { message: 'Booking canceled successfully' };
  }

  async cancelTourBooking(bookingId: string, userId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking');
    }

    await this.prismaService.booking.delete({
      where: { id: bookingId },
    });

    return { message: 'Booking canceled successfully' };
  }

  async getBookedFlightDetails(bookingId: string): Promise<any> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        flightCrawls: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const { ...flightDetails } = booking;

    return {
      bookingId: booking.id,
      flightId: booking.flightCrawlId,
      ...flightDetails,
      price: booking.totalAmount,
      flightQuantity: booking.flightQuantity,
      invoice: [],
    };
  }

  async getBookedHotelDetails(bookingId: string): Promise<any> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotelCrawls: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const { ...hotelDetails } = booking.hotelCrawls;

    return {
      bookingId: booking.id,
      hotelId: booking.hotelCrawlId,
      ...hotelDetails,
      price: booking.totalAmount,
      hotelQuantity: booking.hotelQuantity,
      status: booking.status,
      user: {
        id: booking.user.id,
        name: booking.user.name,
        avatar: booking.user.avatar,
      },
      invoice: [],
    };
  }

  async getBookedRoadVehicleDetails(bookingId: string): Promise<any> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        roadVehicles: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const { ...roadVehicleDetails } = booking.roadVehicles;

    return {
      bookingId: booking.id,
      roadVehicleId: booking.roadVehicleId,
      ...roadVehicleDetails,
      price: booking.totalAmount,
      roadVehicleQuantity: booking.roadVehicleQuantity,
      status: booking.status,
      user: {
        id: booking.user.id,
        name: booking.user.name,
        avatar: booking.user.avatar,
      },
      invoice: [],
    };
  }

  async getBookedTourDetails(bookingId: string): Promise<any> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        tour: {
          include: {
            hotel: true,
            flight: true,
            roadVehicle: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const { tour } = booking;
    const { hotel, flight, roadVehicle, ...tourDetails } = tour;

    let roadVehicleDetails = null;

    if (flight) {
      roadVehicleDetails = {
        type: 'Máy bay',
        details: flight,
      };
    } else if (roadVehicle) {
      roadVehicleDetails = {
        type: 'Xe khách',
        details: roadVehicle,
      };
    }

    return {
      bookingId: booking.id,
      tourId: booking.tourId,
      ...tourDetails,
      price: booking.totalAmount,
      tourQuantity: booking.tourQuantity,
      flightQuantity: booking.flightQuantity,
      hotelQuantity: booking.hotelQuantity,
      status: booking.status,
      hotelDetails: hotel || null,
      road_vehicle: roadVehicleDetails || null,
      user: {
        id: booking.user.id,
        name: booking.user.name,
        avatar: booking.user.avatar,
      },
      invoice: [],
    };
  }

  // confirmBooking

  async confirmBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to confirm this booking');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedBooking = await this.prismaService.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
      },
    });

    await this.prismaService.invoiceDetail.create({
      data: {
        bookingId: updatedBooking.id,
        userId: updatedBooking.userId,
        totalAmount: updatedBooking.totalAmount,
      },
    });

    const htmlContent = `<h1>Xác Nhận Đặt Phòng</h1>
      <p>Thông tin đặt phòng của bạn:</p>
      <pre>${JSON.stringify(updatedBooking, null, 2)}</pre>`;

    await mailService.sendMail({
      to: user.email,
      subject: 'Xác Nhận Đặt Phòng',
      html: htmlContent,
    });

    return updatedBooking;
  }

  // hàm xoá khi mà đặt booking quá 24h thì nó sẽ tự động xoá trong database

  private async deleteExpiredBookings(entity: string) {
    const expiredBookings = await this.prismaService.booking.findMany({
      where: {
        [entity]: { not: null },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 ngày trước
        },
      },
    });

    for (const booking of expiredBookings) {
      await this.prismaService.booking.delete({
        where: { id: booking.id },
      });
    }

    return expiredBookings.length;
  }

  async deleteExpiredFlightBookings() {
    const deletedCount = await this.deleteExpiredBookings('flightCrawlId');
    return {
      message: `${deletedCount} expired flight bookings deleted successfully`,
    };
  }

  async deleteExpiredHotelBookings() {
    const deletedCount = await this.deleteExpiredBookings('hotelCrawlId');
    return {
      message: `${deletedCount} expired hotel bookings deleted successfully`,
    };
  }

  async deleteExpiredTourBookings() {
    const deletedCount = await this.deleteExpiredBookings('tourId');
    return {
      message: `${deletedCount} expired tour bookings deleted successfully`,
    };
  }

  async deleteExpiredRoadVehicleBookings() {
    const deletedCount = await this.deleteExpiredBookings('roadVehicleId');
    return {
      message: `${deletedCount} expired road vehicle bookings deleted successfully`,
    };
  }
}
