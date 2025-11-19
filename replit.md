# Real Estate Rent Management System (REMS)

## Overview

This is a comprehensive, full-stack Real Estate Rent & Billing Management System that combines property management, tenant relations, automated billing, and financial analytics into a unified platform. The system provides landlords and property managers with tools to manage properties, track payments, handle maintenance requests, and generate detailed financial reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern React features
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessibility and customization
- **Styling**: TailwindCSS with CSS custom properties for theming support
- **State Management**: TanStack Query for server state management with React hooks for local state
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Theme System**: Custom theme provider with light/dark mode support

### Backend Architecture
- **Runtime**: Node.js with Express.js for REST API endpoints
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM for type-safe database operations and migrations
- **API Design**: RESTful endpoints with consistent error handling and logging middleware
- **File Structure**: Modular architecture with separate routing, storage, and database layers
- **Development**: Hot reload with Vite integration for seamless development experience

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless database for scalability
- **Connection Pooling**: Connection pooling for efficient database resource management
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Type Safety**: Generated TypeScript types from database schema using Drizzle-Zod

### Database Schema Design
- **Users**: Role-based system (super_admin, landlord, property_manager, agent, tenant)
- **Properties**: Multi-type property support (apartment_complex, single_family, duplex, commercial, townhouse)
- **Units**: Individual rental units with status tracking (vacant, occupied, maintenance, reserved)
- **Leases**: Tenant lease management with status lifecycle (active, expired, terminated, pending)
- **Payments**: Multi-method payment tracking (cash, check, bank_transfer, credit_card, mpesa, online)
- **Invoices**: Automated billing with status management (draft, sent, paid, overdue, cancelled)
- **Maintenance**: Request management with priority levels and category classification

### Authentication and Authorization
- **Session Management**: Express session-based authentication
- **Role-Based Access**: Hierarchical permissions system for different user types
- **Security**: Input validation using Zod schemas throughout the application

### API Architecture
- **Endpoints**: Comprehensive REST API covering all business operations
- **Error Handling**: Centralized error handling with consistent response formats
- **Logging**: Request/response logging with performance metrics
- **Validation**: Input validation using Zod schemas on all endpoints
- **Response Structure**: Consistent JSON response format across all endpoints

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database for primary data storage
- **Drizzle ORM**: Type-safe database operations and migrations
- **Connection Pooling**: PostgreSQL connection pooling for performance optimization

### Payment Processing
- **M-Pesa**: Mobile payment integration for African markets
- **Multi-Gateway Support**: Architecture designed for Stripe, PayPal, and other payment processors

### UI and Styling
- **Radix UI**: Accessible, unstyled UI primitives for all interactive components
- **TailwindCSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Consistent icon library throughout the application
- **React Hook Form**: Form state management and validation

### Development Tools
- **TypeScript**: Full-stack type safety and development experience
- **Vite**: Fast build tool with hot module replacement
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with autoprefixer

### State Management
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Context**: Local state management for theme and UI preferences

### Validation and Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Performance-optimized form handling with validation integration
- **Hookform Resolvers**: Integration between React Hook Form and Zod validation

### Deployment
- **Replit Autoscale**: Serverless deployment platform
- **Environment Variables**: Secure configuration management
- **Production Build**: Optimized bundling with static asset serving