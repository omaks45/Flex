Flex Living Reviews Dashboard - Backend API
<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
</p>

A comprehensive backend API for managing and analyzing property guest reviews across multiple channels, built for Flex Living property managers.

 Table of Contents

Introduction
Features
Tech Stack
Architecture
Quick Start
API Documentation
Key Design Decisions
Hostaway Integration
Google Reviews Exploration
Performance
Testing
Troubleshooting


🎯 Introduction
The Flex Living Reviews Dashboard backend provides a robust API for property managers to:

✅ Aggregate reviews from multiple sources (Hostaway, Google Reviews)
✅ Analyze performance with comprehensive analytics and insights
✅ Manage approvals for public-facing review displays
✅ Track trends across properties, time periods, and review categories
✅ Identify issues through AI-like insights and recommendations


✨ Features
Core Functionality

🔄 Multi-source Integration - Hostaway API with graceful fallback to mock data
📊 Advanced Analytics - Real-time dashboards with caching
✅ Approval Workflow - Single and bulk review approval system
🔍 Powerful Filtering - Search by property, rating, date, channel, and more
📈 Trend Analysis - Time-series data for visualizations
🎯 Smart Insights - Automated alerts and recommendations

Technical Features

⚡ High Performance - Redis caching, MongoDB aggregation pipelines
📝 Auto Documentation - Interactive Swagger/OpenAPI interface
🛡️ Type Safety - Full TypeScript implementation
🔐 Data Validation - Comprehensive DTO validation
🏗️ Scalable Architecture - Modular design with repository pattern

🛠 Tech Stack
CategoryTechnologiesFrameworkNestJS 10.x, TypeScript 5.xDatabaseMongoDB 7.x with Mongoose ODMCachingRedis (Redis Cloud compatible)API DocsSwagger/OpenAPI 3.0Validationclass-validator, class-transformerHTTP ClientAxiosExternal APIsHostaway Reviews API

🏗 Architecture
