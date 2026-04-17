export interface FoodSearchItem {
  food_id: string;
  food_name: string;
  food_description: string;
  food_url: string;
  food_type: string;
  brand_name?: string;
}

// Configure proxy base URL via .env for cross-machine compatibility.
// Example: EXPO_PUBLIC_PROXY_BASE_URL=http://192.168.1.25:3000
const PROXY_BASE_URL =
  process.env.EXPO_PUBLIC_PROXY_BASE_URL || "http://localhost:3000";

export const searchFoods = async (query: string): Promise<FoodSearchItem[]> => {
  try {
    const proxyUrl = `${PROXY_BASE_URL}/api/foods/search?query=${encodeURIComponent(query)}`;

    console.log("Sending request to proxy:", proxyUrl);

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Proxy HTTP error:", errText);
      throw new Error(`Food Search error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching foods through proxy:", error);
    throw error;
  }
};
