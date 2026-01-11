# Google Maps MCP Server

An MCP (Model Context Protocol) server providing tools for Google Maps API access.

## Tools

| Tool | Description |
|------|-------------|
| `search_place` | Search for a place by name, returns Place ID + geo |
| `get_place_details` | Get full details for a Place ID |
| `geocode` | Convert address to lat/lng |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build:

   ```bash
   npm run build
   ```

3. Configure your MCP client (e.g., Gemini) to use this server:

   ```json
   {
     "mcpServers": {
       "google-maps": {
         "command": "node",
         "args": ["/home/lstatham/repo/mcp-servers/google-maps/dist/index.js"],
         "env": {
           "GOOGLE_MAPS_API_KEY": "YOUR_API_KEY"
         }
       }
     }
   }
   ```

## Environment Variables

- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key (required)
