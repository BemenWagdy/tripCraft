import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
  
  try {
    console.log('[TEST] Making real API request to Fixer.io...');
    
    // Test with EUR base to get EGP and AED rates
    const url = `https://api.fixer.io/latest?access_key=${apiKey}&symbols=EGP,AED`;
    
    console.log('[TEST] Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripCraft/1.0'
      }
    });
    
    console.log('[TEST] Response status:', response.status);
    console.log('[TEST] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[TEST] Full Fixer.io response:', JSON.stringify(data, null, 2));
    
    // Calculate EGP to AED rate if we have both rates
    let calculatedRates = null;
    if (data.success && data.rates && data.rates.EGP && data.rates.AED) {
      const eurToEgp = data.rates.EGP;
      const eurToAed = data.rates.AED;
      
      // 1 EGP = ? AED
      // If 1 EUR = X EGP and 1 EUR = Y AED
      // Then 1 EGP = Y/X AED
      const egpToAed = eurToAed / eurToEgp;
      const aedToEgp = eurToEgp / eurToAed;
      
      calculatedRates = {
        egpToAed: Number(egpToAed.toFixed(6)),
        aedToEgp: Number(aedToEgp.toFixed(6)),
        calculation: {
          eurToEgp: eurToEgp,
          eurToAed: eurToAed,
          formula: `1 EGP = ${eurToAed}/${eurToEgp} = ${egpToAed} AED`
        }
      };
    }
    
    return NextResponse.json({
      success: true,
      raw_fixer_response: data,
      calculated_rates: calculatedRates,
      message: "Check your Fixer.io dashboard - usage should now show 1/100"
    });
    
  } catch (error) {
    console.error('[TEST] Error making request:', error);
    return NextResponse.json({ 
      error: error.message,
      message: "Failed to make API request to Fixer.io"
    }, { status: 500 });
  }
}