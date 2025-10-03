Flex Living Reviews Dashboard - Backend Documentation
Table of Contents

Introduction
Tech Stack
Architecture Overview
Setup Instructions
API Documentation
Key Design Decisions
Hostaway Integration
Google Reviews Exploration
Performance Optimizations
Testing

Introduction
This backend API powers the Flex Living Reviews Dashboard, enabling property managers to:

View and analyze guest reviews from multiple sources
Approve/reject reviews for public display
Track property performance metrics
Identify trends and recurring issues
Manage reviews across multiple channels (Hostaway, Google, etc.)

The system handles data normalization from external APIs, provides comprehensive analytics, and supports efficient filtering and sorting capabilities.

Tech Stack
Core Framework

NestJS (v10.x) - Progressive Node.js framework for building scalable server-side applications
TypeScript (v5.x) - Type-safe development

Database & Caching

MongoDB (v7.x) - NoSQL database for flexible review schema
Mongoose (v8.x) - ODM for MongoDB with schema validation
Redis - High-performance caching layer for analytics and frequently accessed data

API & Documentation

Swagger/OpenAPI - Automatic API documentation and testing interface
class-validator - DTO validation
class-transformer - Data transformation

External Integrations

Axios - HTTP client for Hostaway API
Hostaway API - Guest review data source (sandboxed)

Architecture Overview

┌─────────────────────────────────────────────────────────────┐
│                     API Layer (NestJS)                      │
├─────────────────────────────────────────────────────────────┤
│  Reviews Module  │  Analytics Module  │  Hostaway Module   │
├─────────────────────────────────────────────────────────────┤
│              Service Layer (Business Logic)                 │
├─────────────────────────────────────────────────────────────┤
│            Repository Layer (Data Access)                   │
├─────────────────────────────────────────────────────────────┤
│         MongoDB (Data Store)  │  Redis (Cache Layer)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   External APIs (Hostaway)
Module Structure
src/
├── modules/
│   ├── reviews/          # Core review management
│   ├── analytics/        # Dashboard statistics & insights
│   └── hostaway/         # External API integration
├── config/               # Configuration files
└── common/               # Shared utilities
