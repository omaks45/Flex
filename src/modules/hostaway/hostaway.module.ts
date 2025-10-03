/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HostawayService } from './hostaway.service';

@Module({
  imports: [ConfigModule],
  providers: [HostawayService],
  exports: [HostawayService],
})
export class HostawayModule {}