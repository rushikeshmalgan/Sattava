require('dotenv').config({ path: './.env' });

const CLIENT_ID = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET;

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const btoa = (input) => {
  let str = input;
  let output = '';

  for (let block = 0, charCode, i = 0, map = chars;
  str.charAt(i | 0) || (map = '=', i % 1);
  output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = block << 8 | charCode;
  }
  return output;
};

async function testApi() {
  try {
    const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=basic',
    });

    if (!response.ok) {
        console.error("Token error:", await response.text());
        return;
    }
    const tokenData = await response.json();
    const token = tokenData.access_token;
    console.log("Token generated:", token.substring(0, 10) + '...');

    const query = 'banana';
    const url = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=15`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Forwarded-For': '152.58.32.154', // spoof to the previously whitelisted one
      },
    });

    const data = await res.json();
    console.log("Search Result JSON:");
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
      console.error(e);
  }
}

testApi();
