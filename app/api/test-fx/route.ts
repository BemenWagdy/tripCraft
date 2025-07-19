import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = 'e873239c9944dc25c2b59d1d01d71d77';
  
  try {
    console.log('[TEST] Testing Fixer.io API for EGP and AED rates...');
    
    // Test 1: Get latest rates with EUR base (default)
    const url1 = `https://api.fixer.io/latest?access_key=${apiKey}&symbols=EGP,AED`;
    console.log('[TEST] Request 1:', url1);
    
    const response1 = await fetch(url1);
    const data1 = await response1.json();
    console.log('[TEST] Response 1 (EUR base):', JSON.stringify(data1, null, 2));
    
    // Test 2: Try to use EGP as base (might need paid plan)
    const url2 = `https://api.fixer.io/latest?access_key=${apiKey}&base=EGP&symbols=AED`;
    console.log('[TEST] Request 2:', url2);
    
    const response2 = await fetch(url2);
    const data2 = await response2.json();
    console.log('[TEST] Response 2 (EGP base):', JSON.stringify(data2, null, 2));
    
    // Test 3: Try to use AED as base
    const url3 = `https://api.fixer.io/latest?access_key=${apiKey}&base=AED&symbols=EGP`;
    console.log('[TEST] Request 3:', url3);
    
    const response3 = await fetch(url3);
    const data3 = await response3.json();
    console.log('[TEST] Response 3 (AED base):', JSON.stringify(data3, null, 2));
    
    // Calculate rates manually from EUR base
    let calculatedRates = null;
    if (data1.success && data1.rates) {
      const eurToEgp = data1.rates.EGP;
      const eurToAed = data1.rates.AED;
      
      if (eurToEgp && eurToAed) {
        // 1 EGP = ? AED
        // If 1 EUR = X EGP and 1 EUR = Y AED
        // Then 1 EGP = Y/X AED
        const egpToAed = eurToAed / eurToEgp;
        const aedToEgp = eurToEgp / eurToAed;
        
        calculatedRates = {
          egpToAed: egpToAed,
          aedToEgp: aedToEgp,
          calculation: {
            eurToEgp: eurToEgp,
            eurToAed: eurToAed,
            formula: `1 EGP = ${eurToAed}/${eurToEgp} = ${egpToAed} AED`
          }
        };
        
        console.log('[TEST] Calculated rates:', calculatedRates);
      }
    }
    
    return NextResponse.json({
      test1_eur_base: data1,
      test2_egp_base: data2,
      test3_aed_base: data3,
      calculated_rates: calculatedRates,
      expected_rates: {
        egpToAed: 0.074,
        aedToEgp: 13.46,
        note: "These are the expected correct rates"
      }
    });
    
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}