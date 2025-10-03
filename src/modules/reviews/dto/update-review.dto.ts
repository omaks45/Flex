/* eslint-disable prettier/prettier */
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isApprovedForPublic?: boolean;

    @ApiPropertyOptional({ example: 'Great review for our website' })
    @IsOptional()
    @IsString()
    managerNotes?: string;

    @ApiPropertyOptional({ example: 'admin@flexliving.com' })
    @IsOptional()
    @IsString()
    approvedBy?: string;
}

export class BulkApproveDto {
    @ApiPropertyOptional({ example: ['id1', 'id2', 'id3'] })
    @IsString({ each: true })
    reviewIds: string[];

    @ApiPropertyOptional({ example: 'admin@flexliving.com' })
    @IsOptional()
    @IsString()
    approvedBy?: string;
}