export interface FoodSearchItem {
  food_id: string;
  food_name: string;
  food_description: string;
  food_url: string;
  food_type: string;
  brand_name?: string;
}

// ⚠️ Use your laptop's LAN IP (not VPN IP) so the phone can reach the proxy over Wi-Fi.
// Run `ipconfig` and use the IPv4 under your Wi-Fi adapter.
// Current: 10.2.0.2 (LAN) — VPN IP 10.33.107.232 does NOT work from the phone.
const PROXY_BASE_URL = 'http://10.33.107.232:3000';

export const searchFoods = async (query: string): Promise<FoodSearchItem[]> => {
  try {
    const proxyUrl = `${PROXY_BASE_URL}/api/foods/search?query=${encodeURIComponent(query)}`;

    console.log('Sending request to proxy:', proxyUrl);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Proxy HTTP error:', errText);
      throw new Error(`Food Search error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching foods through proxy:', error);
    throw error;
  }
};
