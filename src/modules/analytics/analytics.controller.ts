/* eslint-disable prettier/prettier */
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ 
    summary: 'Get dashboard summary statistics',
    description: 'Returns comprehensive overview including total reviews, ratings, approval stats, and recent activity'
  })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  getSummary(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getSummary(filters);
  }

  @Get('by-property')
  @ApiOperation({ 
    summary: 'Get per-property performance breakdown',
    description: 'Returns detailed statistics for each property including ratings, review counts, and approval rates'
  })
  @ApiResponse({ status: 200, description: 'Property breakdown retrieved successfully' })
  getPropertyBreakdown(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getPropertyBreakdown(filters);
  }

  @Get('by-channel')
  @ApiOperation({ 
    summary: 'Get reviews breakdown by channel',
    description: 'Shows distribution of reviews across different channels (Hostaway, Google, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Channel breakdown retrieved successfully' })
  getChannelBreakdown(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getChannelBreakdown(filters);
  }

  @Get('trends')
  @ApiOperation({ 
    summary: 'Get time-based review trends',
    description: 'Returns daily trends for charts showing review volume and average ratings over time'
  })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  getTrends(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getTrends(filters);
  }

  @Get('category-breakdown')
  @ApiOperation({ 
    summary: 'Get rating breakdown by review category',
    description: 'Shows performance across different review categories (cleanliness, communication, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Category breakdown retrieved successfully' })
  getCategoryBreakdown(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getCategoryBreakdown(filters);
  }

  @Get('insights')
  @ApiOperation({ 
    summary: 'Get AI-like insights and recommendations',
    description: 'Returns alerts for issues, strengths, and actionable recommendations based on review patterns'
  })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  getInsights(@Query() filters: AnalyticsFilterDto) {
    return this.analyticsService.getInsights(filters);
  }
}