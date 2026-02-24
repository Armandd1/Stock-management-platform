import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { WarehousesModule } from './warehouses/warehouses.module';
import { ProductsModule } from './products/products.module';
import { MovementsModule } from './movements/movements.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
          },
        },
      },
    }),
    AuthModule,
    UsersModule,
    WarehousesModule,
    ProductsModule,
    MovementsModule,
    ReportsModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 10, // Max 10 requests per minute
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

