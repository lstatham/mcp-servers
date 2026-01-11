# Weather MCP Server

An MCP (Model Context Protocol) server providing tools for weather data access using the **Google Maps Platform Weather API**.

## Tools

| Tool | Description |
|------|-------------|
| `get_forecast` | Get daily weather forecast (up to 10 days) |
| `get_current` | Get current weather conditions |
| `get_hourly` | Get hourly forecast (up to 240 hours) |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build:

   ```bash
   npm run build
   ```

3. Configure your MCP client:

   ```json
   {
     "mcpServers": {
       "weather": {
         "command": "node",
         "args": ["/home/lstatham/repo/mcp-servers/weather/dist/index.js"],
         "env": {
           "GOOGLE_WEATHER_API_KEY": "YOUR_API_KEY"
         }
       }
     }
   }
   ```

## Environment Variables

- `GOOGLE_WEATHER_API_KEY`: Your Google Maps Platform Weather API key (required)

## Example Usage

**Get 7-day forecast for Tokyo:**

```
get_forecast({ lat: 35.6762, lng: 139.6503, days: 7 })
```

**Get current conditions:**

```
get_current({ lat: 35.6762, lng: 139.6503 })
```

**Get 24-hour hourly forecast:**

```
get_hourly({ lat: 35.6762, lng: 139.6503, hours: 24 })
```
