/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import configuration files
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

// Import feature modules
import { ReviewsModule } from './modules/reviews/reviews.module';
import { HostawayModule } from './modules/hostaway/hostaway.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
///import { PropertiesModule } from './modules/properties/properties.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: '.env',
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // Redis Cache (Updated for Redis Cloud)
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url');
        
        return {
          store: redisStore,
          url: redisUrl,
          ttl: configService.get<number>('redis.ttl'),
          // Additional options for Redis Cloud
          socket: {
            connectTimeout: 10000,
            keepAlive: true,
          },
          // Handle connection errors gracefully
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        };
      },
      inject: [ConfigService],
    }),

    // Feature Modules
    ReviewsModule,
    HostawayModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}