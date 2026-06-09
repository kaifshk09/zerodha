const dns = require('dns').promises;

async function testSRV() {
  try {
    console.log('Testing SRV lookup...');
    const records = await dns.resolveSrv('_mongodb._tcp.zerodhaclonecluster.a5ia8qb.mongodb.net');
    console.log('SRV records found:', records);
  } catch (err) {
    console.error('❌ SRV lookup failed:', err.code, err.message);
  }

  try {
    console.log('\nTesting standard DNS lookup...');
    const ip = await dns.resolve4('zerodhaclonecluster.a5ia8qb.mongodb.net');
    console.log('✓ DNS A record found:', ip);
  } catch (err) {
    console.error('❌ DNS A record failed:', err.code, err.message);
  }
}

testSRV();
