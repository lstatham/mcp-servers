#!/usr/bin/env node
/**
 * Weather MCP Server
 *
 * Provides tools for weather data access:
 * - get_forecast: Get weather forecast for a location (up to 10 days)
 * - get_current: Get current weather conditions
 * - get_hourly: Get hourly forecast
 *
 * Uses Google Weather API as primary source, falls back to Open-Meteo for unsupported regions.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY;
const server = new McpServer({
    name: "weather-mcp-server",
    version: "1.0.0",
});
// Helper to map Google Weather condition types to simple icons
const mapConditionToIcon = (type) => {
    const iconMap = {
        'CLEAR': 'sun',
        'MOSTLY_CLEAR': 'sun',
        'PARTLY_CLOUDY': 'cloud-sun',
        'CLOUDY': 'cloud',
        'FOG': 'cloud-fog',
        'LIGHT_RAIN': 'cloud-drizzle',
        'RAIN': 'cloud-rain',
        'HEAVY_RAIN': 'cloud-showers-heavy',
        'LIGHT_SNOW': 'cloud-snow',
        'SNOW': 'cloud-snow',
        'HEAVY_SNOW': 'cloud-snow',
        'THUNDERSTORM': 'bolt',
    };
    return iconMap[type] || 'cloud';
};
// WMO Weather interpretation codes (for Open-Meteo fallback)
const WMO_CODES = {
    0: { condition: "Clear sky", icon: "sun" },
    1: { condition: "Mainly clear", icon: "sun" },
    2: { condition: "Partly cloudy", icon: "cloud-sun" },
    3: { condition: "Overcast", icon: "cloud" },
    45: { condition: "Fog", icon: "cloud-fog" },
    48: { condition: "Depositing rime fog", icon: "cloud-fog" },
    51: { condition: "Light drizzle", icon: "cloud-drizzle" },
    53: { condition: "Moderate drizzle", icon: "cloud-drizzle" },
    55: { condition: "Dense drizzle", icon: "cloud-drizzle" },
    61: { condition: "Slight rain", icon: "cloud-rain" },
    63: { condition: "Moderate rain", icon: "cloud-rain" },
    65: { condition: "Heavy rain", icon: "cloud-rain" },
    71: { condition: "Slight snow", icon: "cloud-snow" },
    73: { condition: "Moderate snow", icon: "cloud-snow" },
    75: { condition: "Heavy snow", icon: "cloud-snow" },
    80: { condition: "Slight rain showers", icon: "cloud-showers-heavy" },
    81: { condition: "Moderate rain showers", icon: "cloud-showers-heavy" },
    82: { condition: "Violent rain showers", icon: "cloud-showers-heavy" },
    95: { condition: "Thunderstorm", icon: "bolt" },
    96: { condition: "Thunderstorm with hail", icon: "bolt" },
    99: { condition: "Thunderstorm with heavy hail", icon: "bolt" },
};
// ==================== FALLBACK HELPERS ====================
async function getGoogleForecast(lat, lng, days) {
    if (!GOOGLE_WEATHER_API_KEY)
        return null;
    const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${GOOGLE_WEATHER_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=${days}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error || !data.forecastDays)
        return null;
    return data.forecastDays.map((day) => {
        const conditionType = day.daytimeForecast?.weatherCondition?.type || 'UNKNOWN';
        return {
            date: day.displayDate?.year ? `${day.displayDate.year}-${String(day.displayDate.month).padStart(2, '0')}-${String(day.displayDate.day).padStart(2, '0')}` : 'Unknown',
            condition: day.daytimeForecast?.weatherCondition?.description?.text || conditionType,
            icon: mapConditionToIcon(conditionType),
            tempHigh: day.maxTemperature?.degrees,
            tempLow: day.minTemperature?.degrees,
            precipitationProbability: day.daytimeForecast?.precipitation?.probability?.percent,
            humidity: day.averageHumidity?.percent,
            source: 'google'
        };
    });
}
async function getOpenMeteoForecast(lat, lng, days) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=${days}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error)
        return null;
    return data.daily.time.map((date, i) => {
        const code = data.daily.weather_code[i];
        const weatherInfo = WMO_CODES[code] || { condition: "Unknown", icon: "question" };
        return {
            date,
            condition: weatherInfo.condition,
            icon: weatherInfo.icon,
            tempHigh: data.daily.temperature_2m_max[i],
            tempLow: data.daily.temperature_2m_min[i],
            precipitationProbability: data.daily.precipitation_probability_max?.[i],
            precipitation: data.daily.precipitation_sum[i],
            source: 'open-meteo'
        };
    });
}
async function getGoogleCurrent(lat, lng) {
    if (!GOOGLE_WEATHER_API_KEY)
        return null;
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_WEATHER_API_KEY}&location.latitude=${lat}&location.longitude=${lng}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error)
        return null;
    const conditionType = data.weatherCondition?.type || 'UNKNOWN';
    return {
        temperature: data.temperature?.degrees,
        feelsLike: data.feelsLikeTemperature?.degrees,
        condition: data.weatherCondition?.description?.text || conditionType,
        icon: mapConditionToIcon(conditionType),
        humidity: data.relativeHumidity,
        windSpeed: data.wind?.speed?.value,
        uvIndex: data.uvIndex,
        source: 'google'
    };
}
async function getOpenMeteoCurrent(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error)
        return null;
    const code = data.current.weather_code;
    const weatherInfo = WMO_CODES[code] || { condition: "Unknown", icon: "question" };
    return {
        temperature: data.current.temperature_2m,
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
        windSpeed: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        time: data.current.time,
        source: 'open-meteo'
    };
}
// ==================== TOOLS ====================
// Tool: get_forecast
server.tool("get_forecast", {
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    days: z.number().min(1).max(10).default(7).describe("Number of days to forecast (1-10)")
}, async ({ lat, lng, days = 7 }) => {
    try {
        // Try Google first
        let forecast = await getGoogleForecast(lat, lng, days);
        // Fallback to Open-Meteo if Google fails
        if (!forecast) {
            forecast = await getOpenMeteoForecast(lat, lng, Math.min(days, 16));
        }
        if (!forecast) {
            return { content: [{ type: "text", text: "Failed to fetch forecast from any source" }], isError: true };
        }
        return { content: [{ type: "text", text: JSON.stringify(forecast, null, 2) }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Tool: get_current
server.tool("get_current", {
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude")
}, async ({ lat, lng }) => {
    try {
        // Try Google first
        let current = await getGoogleCurrent(lat, lng);
        // Fallback to Open-Meteo
        if (!current) {
            current = await getOpenMeteoCurrent(lat, lng);
        }
        if (!current) {
            return { content: [{ type: "text", text: "Failed to fetch current conditions from any source" }], isError: true };
        }
        return { content: [{ type: "text", text: JSON.stringify(current, null, 2) }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Tool: get_hourly (Open-Meteo only - Google hourly has limited coverage)
server.tool("get_hourly", {
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    hours: z.number().min(1).max(168).default(24).describe("Number of hours to forecast (1-168)")
}, async ({ lat, lng, hours = 24 }) => {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m&timezone=auto&forecast_hours=${hours}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) {
            return { content: [{ type: "text", text: `API Error: ${data.reason}` }], isError: true };
        }
        const forecast = data.hourly.time.map((time, i) => {
            const code = data.hourly.weather_code[i];
            const weatherInfo = WMO_CODES[code] || { condition: "Unknown", icon: "question" };
            return {
                time,
                condition: weatherInfo.condition,
                icon: weatherInfo.icon,
                temperature: data.hourly.temperature_2m[i],
                precipitationProbability: data.hourly.precipitation_probability[i],
                humidity: data.hourly.relative_humidity_2m[i],
                source: 'open-meteo'
            };
        });
        return { content: [{ type: "text", text: JSON.stringify(forecast, null, 2) }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
});
// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Weather MCP Server started (Google + Open-Meteo fallback)");
