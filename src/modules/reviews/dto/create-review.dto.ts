/* eslint-disable prettier/prettier */
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewCategoryDto {
    @ApiProperty({ example: 'cleanliness' })
    @IsString()
    category: string;

    @ApiProperty({ example: 9, minimum: 0, maximum: 10 })
    @IsNumber()
    @Min(0)
    @Max(10)
    rating: number;
}

export class CreateReviewDto {
    @ApiProperty({ example: 7453 })
    @IsNumber()
    hostawayId: number;

    @ApiProperty({ example: 'host-to-guest', enum: ['host-to-guest', 'guest-to-host'] })
    @IsEnum(['host-to-guest', 'guest-to-host'])
    type: string;

    @ApiProperty({ example: 'published', enum: ['published', 'pending', 'draft'] })
    @IsEnum(['published', 'pending', 'draft'])
    status: string;

    @ApiPropertyOptional({ example: 9.5, minimum: 0, maximum: 10 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10)
    rating?: number;

    @ApiProperty({ example: 'Great guest! Would host again.' })
    @IsString()
    publicReview: string;

    @ApiPropertyOptional({ example: 'Left the place very clean.' })
    @IsOptional()
    @IsString()
    privateReview?: string;

    @ApiProperty({ type: [ReviewCategoryDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReviewCategoryDto)
    reviewCategories: ReviewCategoryDto[];

    @ApiProperty({ example: '2020-08-21T22:45:14Z' })
    @IsString()
    submittedAt: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    guestName: string;

    @ApiProperty({ example: 'listing-123' })
    @IsString()
    listingId: string;

    @ApiProperty({ example: '2B N1 A - 29 Shoreditch Heights' })
    @IsString()
    listingName: string;

    @ApiPropertyOptional({ example: 'hostaway' })
    @IsOptional()
    @IsString()
    channel?: string;
}