# noonSHOT Ordering System

This is a Next.js application built for noonSHOT Baristas to place their daily ingredient orders, and for Supply Planners to download aggregated daily Excel reports.

## Prerequisites
You need to install **Node.js** (which includes `npm`) to run this project.
Download it from: [https://nodejs.org/](https://nodejs.org/)

## Setup Instructions

1. **Open a Terminal** (Command Prompt or PowerShell) and navigate to this folder:
   ```cmd
   cd C:\Users\kangarg\.gemini\antigravity\scratch\noonshot-ordering
   ```

2. **Install Dependencies**:
   ```cmd
   npm install
   ```

3. **Initialize the Database**:
   ```cmd
   npx prisma generate
   npx prisma db push
   ```

4. **Add Dummy Data**:
   You can easily manage the database using Prisma Studio, which provides a web interface:
   ```cmd
   npx prisma studio
   ```
   *This will open `http://localhost:5555`. You can add some Stores (e.g., DXB-01) and Items here.*

5. **Start the Application**:
   ```cmd
   npm run dev
   ```
   *The application will be running at `http://localhost:3000`.*

## Features
- **Barista Portal (`/`)**: Baristas select their store (saved in the device) and submit item requirements. If an item is out of stock, it automatically swaps to the substitute SKU if configured.
- **Admin Portal (`/admin`)**: Planners can set the daily cut-off time and download the aggregated Excel file. The aggregation logic automatically takes the **MAX** quantity if a store submits multiple orders for the same item within the daily window.
