/* eslint-disable prettier/prettier */
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterReviewDto {
    @ApiPropertyOptional({ example: 1, description: 'Page number' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 20, description: 'Items per page' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ example: 'listing-123', description: 'Filter by listing ID' })
    @IsOptional()
    @IsString()
    listingId?: string;

    @ApiPropertyOptional({ example: 'hostaway', description: 'Filter by channel' })
    @IsOptional()
    @IsString()
    channel?: string;

    @ApiPropertyOptional({ example: 'published', enum: ['published', 'pending', 'draft'] })
    @IsOptional()
    @IsEnum(['published', 'pending', 'draft'])
    status?: string;

    @ApiPropertyOptional({ example: 8, minimum: 0, maximum: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(10)
    minRating?: number;

    @ApiPropertyOptional({ example: 'true', description: 'Filter approved reviews' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isApprovedForPublic?: boolean;

    @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ example: '2024-12-31', description: 'End date (YYYY-MM-DD)' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ example: 'John Doe', description: 'Search by guest name' })
    @IsOptional()
    @IsString()
    guestName?: string;

    @ApiPropertyOptional({ example: 'submittedAt', enum: ['submittedAt', 'rating', 'averageCategoryRating'] })
    @IsOptional()
    @IsString()
    sortBy?: string = 'submittedAt';

    @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
}