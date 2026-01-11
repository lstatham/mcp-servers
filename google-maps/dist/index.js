#!/usr/bin/env node
/**
 * Google Maps MCP Server
 *
 * Provides tools for Google Maps API access:
 * - search_place: Search for a place by name
 * - get_place_details: Get details for a specific Place ID
 * - geocode: Convert address to lat/lng
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY environment variable is required");
    process.exit(1);
}
const server = new McpServer({
    name: "google-maps-mcp-server",
    version: "1.0.0",
});
// Tool: search_place
// Search for a place by name and return Place ID, name, address, and coordinates
server.tool("search_place", { query: z.string().describe("Place name or query to search for (e.g., 'Shinjuku Gyoen')") }, async ({ query }) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.candidates?.length > 0) {
            const place = data.candidates[0];
            const result = {
                name: place.name,
                place_id: place.place_id,
                formatted_address: place.formatted_address,
                geo: place.geometry?.location
            };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        else {
            return { content: [{ type: "text", text: `No results found for "${query}". Status: ${data.status}` }] };
        }
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Tool: get_place_details
// Get detailed information for a specific Place ID
server.tool("get_place_details", { placeId: z.string().describe("Google Place ID (e.g., 'ChIJ51cu8IcbXWARiRtXIothAS4')") }, async ({ placeId }) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,website,formatted_phone_number,rating,user_ratings_total,types&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.result) {
            const place = data.result;
            const result = {
                name: place.name,
                formatted_address: place.formatted_address,
                geo: place.geometry?.location,
                website: place.website,
                phone: place.formatted_phone_number,
                rating: place.rating,
                reviews_count: place.user_ratings_total,
                types: place.types,
                opening_hours: place.opening_hours?.weekday_text
            };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        else {
            return { content: [{ type: "text", text: `Place not found. Status: ${data.status}` }] };
        }
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Tool: geocode
// Convert an address to lat/lng coordinates
server.tool("geocode", { address: z.string().describe("Address to geocode (e.g., '1600 Amphitheatre Parkway, Mountain View, CA')") }, async ({ address }) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.results?.length > 0) {
            const result = data.results[0];
            const output = {
                formatted_address: result.formatted_address,
                geo: result.geometry?.location,
                place_id: result.place_id,
                types: result.types
            };
            return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
        }
        else {
            return { content: [{ type: "text", text: `Geocoding failed for "${address}". Status: ${data.status}` }] };
        }
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Google Maps MCP Server started");
