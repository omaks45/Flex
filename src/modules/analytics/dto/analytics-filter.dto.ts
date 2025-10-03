/* eslint-disable prettier/prettier */
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsFilterDto {
    @ApiPropertyOptional({ 
        example: '2024-01-01', 
        description: 'Start date for filtering (YYYY-MM-DD)' 
    })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ 
        example: '2024-12-31', 
        description: 'End date for filtering (YYYY-MM-DD)' 
    })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ 
        example: 'luxury-studio-central-london', 
        description: 'Filter by specific listing ID' 
    })
    @IsOptional()
    @IsString()
    listingId?: string;

    @ApiPropertyOptional({ 
        example: 'hostaway', 
        description: 'Filter by channel (hostaway, google, etc.)' 
    })
    @IsOptional()
    @IsString()
    channel?: string;

    @ApiPropertyOptional({ 
        example: 30, 
        description: 'Number of days for trend analysis',
        minimum: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    days?: number;
}