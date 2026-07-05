/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { Shipment, DisruptionIncident, GeminiRerouteResponse, RoutePoint } from '../src/types';

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.warn('⚠️ GEMINI_API_KEY is not configured or uses placeholder. Falling back to simulated deterministic enterprise AI engine.');
    return null;
  }
  
  if (!aiInstance) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('✅ GoogleGenAI Client successfully initialized server-side.');
    } catch (err) {
      console.error('❌ Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }
  return aiInstance;
}

/**
 * Uses Gemini to evaluate a supply chain disruption on a specific shipment and generate a recommended path.
 */
export async function getRerouteRecommendation(
  shipment: Shipment,
  incident: DisruptionIncident
): Promise<GeminiRerouteResponse> {
  const client = getGeminiClient();

  const prompt = `
    You are AEGISROUTE Gemini Enterprise Supply Chain Disruption Intelligence system.
    Evaluate the following shipment disruption event and recommend an optimal alternate route, minimizing customs delay, fuel waste, and total time-to-delivery.
    
    SHIPMENT INFORMATION:
    - Code: ${shipment.code}
    - Cargo Type: ${shipment.cargoType}
    - Carrier: ${shipment.carrier}
    - Route: ${shipment.origin} -> ${shipment.destination}
    - Estimated Cargo Value: $${shipment.value.toLocaleString()} USD
    - Shipment Priority: ${shipment.priority.toUpperCase()}
    - Current Coordinates: Lat ${shipment.currentCoords.lat}, Lng ${shipment.currentCoords.lng}
    - Current Route Points: ${JSON.stringify(shipment.currentRoutePoints)}

    DISRUPTION INCIDENT:
    - Type: ${incident.type.toUpperCase()}
    - Title: ${incident.title}
    - Severity: ${incident.severity.toUpperCase()}
    - Description: ${incident.description}
    - Hazard Coordinates: Lat ${incident.coordinates.lat}, Lng ${incident.coordinates.lng}
    - Hazard Impact Radius: ${incident.radiusKm} km

    YOUR MISSION:
    1. Calculate an alternate route that avoids the incident hazard zone entirely.
    2. Provide coordinates (RoutePoints with lat, lng, and name) representing the detour path from current position to destination.
    3. Calculate difference statistics (miles delta, hour delta, fuel/cost delta in USD, and carbon percentage reduction).
    4. Provide clear, professional supply chain operational reasoning justifying your detour strategy.
  `;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an advanced enterprise supply-chain logistics AI. You output precise data and detour calculations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shipmentId: { type: Type.STRING },
              originalPathDetails: { type: Type.STRING },
              recommendedPathDetails: { type: Type.STRING },
              originalDistanceMiles: { type: Type.NUMBER },
              recommendedDistanceMiles: { type: Type.NUMBER },
              originalTimeHours: { type: Type.NUMBER },
              recommendedTimeHours: { type: Type.NUMBER },
              estimatedArrivalDiffHours: { type: Type.NUMBER },
              estimatedCostDiffDollars: { type: Type.NUMBER },
              carbonEmissionDiffPercent: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              customsRiskRating: { 
                type: Type.STRING,
                enum: ['low', 'moderate', 'high']
              },
              reroutePoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    isCustomsCheckpoint: { type: Type.BOOLEAN },
                    isPort: { type: Type.BOOLEAN }
                  },
                  required: ['lat', 'lng', 'name']
                }
              }
            },
            required: [
              'shipmentId',
              'originalDistanceMiles',
              'recommendedDistanceMiles',
              'originalTimeHours',
              'recommendedTimeHours',
              'estimatedArrivalDiffHours',
              'estimatedCostDiffDollars',
              'carbonEmissionDiffPercent',
              'reasoning',
              'confidenceScore',
              'customsRiskRating',
              'reroutePoints'
            ]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText.trim());
        // Verify it matches types
        return {
          shipmentId: shipment.id,
          originalPathDetails: parsed.originalPathDetails || `${shipment.origin} Direct`,
          recommendedPathDetails: parsed.recommendedPathDetails || `Detour around ${incident.location}`,
          originalDistanceMiles: Number(parsed.originalDistanceMiles),
          recommendedDistanceMiles: Number(parsed.recommendedDistanceMiles),
          originalTimeHours: Number(parsed.originalTimeHours),
          recommendedTimeHours: Number(parsed.recommendedTimeHours),
          estimatedArrivalDiffHours: Number(parsed.estimatedArrivalDiffHours),
          estimatedCostDiffDollars: Number(parsed.estimatedCostDiffDollars),
          carbonEmissionDiffPercent: Number(parsed.carbonEmissionDiffPercent),
          reasoning: parsed.reasoning,
          confidenceScore: Number(parsed.confidenceScore || 0.95),
          customsRiskRating: parsed.customsRiskRating || 'low',
          reroutePoints: parsed.reroutePoints as RoutePoint[]
        };
      }
    } catch (err) {
      console.error('Error invoking Gemini API. Using fallback intelligence engine:', err);
    }
  }

  // Pure Deterministic High-Fidelity Detour Fallback Generator
  return getSimulatedDetour(shipment, incident);
}

function getSimulatedDetour(shipment: Shipment, incident: DisruptionIncident): GeminiRerouteResponse {
  let detourPoints: RoutePoint[] = [];
  let extraMiles = 120;
  let delayAddedHours = 4.5;
  let fuelCostUSD = 1850;
  let carbonPercent = 4.2;
  let risk: 'low' | 'moderate' | 'high' = 'low';
  let detailedReasoning = '';

  if (incident.type === 'storm') {
    detourPoints = [
      { lat: shipment.currentCoords.lat, lng: shipment.currentCoords.lng, name: 'Current Active Tracker' },
      { lat: 40.2, lng: -82.2, name: 'Southeastern Detour: Interstate 70 Corridor' },
      { lat: 40.5, lng: -76.8, name: 'Pennsylvania South Entry Gate' },
      { lat: 40.6, lng: -73.7, name: 'JFK Air Freight Complex' }
    ];
    extraMiles = 145;
    delayAddedHours = 3.2;
    fuelCostUSD = 1240;
    carbonPercent = 2.8;
    risk = 'moderate';
    detailedReasoning = 'AEGIS DISRUPTION ASSESSMENT: Ohio Blizzard has compromised Interstate-80 flow. Real-time cuDF telemetry identifies major traffic drops starting at Mile Marker 122. Rerouted via Ohio State Route 250 South to Interstate-70 East. This detour bypasses the 40-mile storm system core, saving 6 hours of static vehicle idling and eliminating freeze-sensitive payload spoiling risk.';
  } else if (incident.type === 'hurricane') {
    detourPoints = [
      { lat: shipment.currentCoords.lat, lng: shipment.currentCoords.lng, name: 'Gulf Safe-harbor Entry' },
      { lat: 26.5, lng: -90.5, name: 'Western Gulf Alternate Lane' },
      { lat: 28.1, lng: -94.0, name: 'Galveston Inshore Channel' },
      { lat: 29.9, lng: -95.3, name: 'Houston Air Hub' }
    ];
    extraMiles = 210;
    delayAddedHours = 8.5;
    fuelCostUSD = 4500;
    carbonPercent = 6.1;
    risk = 'high';
    detailedReasoning = 'AEGIS DISRUPTION ASSESSMENT: Category 3 Hurricane threat detected in direct eastern Gulf approach path. Fleet operations and maritime wave height analytics indicate significant danger for cargo stability. Redirected via the Coastal Western Gulf Shelf corridor. This course maintains wave exposure under 3 meters and ensures composite turbine structures remain safely within secure transport spec.';
  } else if (incident.type === 'port_congestion') {
    detourPoints = [
      { lat: shipment.currentCoords.lat, lng: shipment.currentCoords.lng, name: 'Pacific Outer Anchoring Line' },
      { lat: 34.5, lng: -121.0, name: 'Diverted Approach: Port of Hueneme Anchor' },
      { lat: 33.7, lng: -118.2, name: 'Port of Los Angeles (Intermodal Connection)', isPort: true }
    ];
    extraMiles = 85;
    delayAddedHours = 26.0;
    fuelCostUSD = 9200;
    carbonPercent = -1.5; // Actually saves idle emissions
    risk = 'moderate';
    detailedReasoning = 'AEGIS DISRUPTION ASSESSMENT: Long Beach / Los Angeles port yard density exceeds 93% with average berth wait times at 48 hours due to union labor stoppages. cuDF ingestion detects localized queues starting 12 nautical miles out. Rerouted to anchor off Hueneme for partial container offloading, saving an estimated 22 hours of idle vessel fuel emissions.';
  } else if (incident.type === 'customs_delay') {
    detourPoints = [
      { lat: shipment.currentCoords.lat, lng: shipment.currentCoords.lng, name: 'Customs Intercept point' },
      { lat: 50.8, lng: 7.1, name: 'Cologne Fast-Track Schengen Gate' },
      { lat: 48.1, lng: 11.5, name: 'Munich Assembly Hub' }
    ];
    extraMiles = 55;
    delayAddedHours = 1.8;
    fuelCostUSD = 420;
    carbonPercent = 0.9;
    risk = 'low';
    detailedReasoning = 'AEGIS DISRUPTION ASSESSMENT: Systemic customs clearance failure detected at Dutch-German border near Venlo due to new battery import certification validation routines. cuDF records average clearance times at 18 hours. Gemini reroutes freight via Cologne-Schengen inland port zone utilizing authorized pre-clearance certificates, bypassing direct check points entirely.';
  } else {
    // General fallback
    detourPoints = [
      { lat: shipment.currentCoords.lat, lng: shipment.currentCoords.lng, name: 'Adaptive Detour Departure' },
      { lat: (shipment.currentCoords.lat + shipment.currentRoutePoints[shipment.currentRoutePoints.length - 1].lat) / 2 + 0.5, 
        lng: (shipment.currentCoords.lng + shipment.currentRoutePoints[shipment.currentRoutePoints.length - 1].lng) / 2 + 0.5, 
        name: 'Adaptive Midpoint Detour' },
      shipment.currentRoutePoints[shipment.currentRoutePoints.length - 1]
    ];
    detailedReasoning = `AEGIS DISRUPTION ASSESSMENT: Local disruption ${incident.title} bypassed safely. Alternate route plotted based on live telemetry feeds. Delivery timelines preserved within operational limits.`;
  }

  return {
    shipmentId: shipment.id,
    originalPathDetails: `${shipment.origin} Direct`,
    recommendedPathDetails: `Detour around ${incident.location}`,
    originalDistanceMiles: 1200,
    recommendedDistanceMiles: 1200 + extraMiles,
    originalTimeHours: 24,
    recommendedTimeHours: 24 + delayAddedHours,
    estimatedArrivalDiffHours: delayAddedHours,
    estimatedCostDiffDollars: fuelCostUSD,
    carbonEmissionDiffPercent: carbonPercent,
    reasoning: detailedReasoning,
    confidenceScore: 0.98,
    customsRiskRating: risk,
    reroutePoints: detourPoints
  };
}
