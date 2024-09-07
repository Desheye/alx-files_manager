import { afterEach, beforeEach, describe, it } from '@jest/globals';
import chai from 'chai';
import chaiHttp from 'chai-http';
import MongoClient from 'mongodb';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /stats', () => {
  let testClientDb = null;

  beforeEach(async () => {
    const dbInfo = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '27017',
      database: process.env.DB_DATABASE || 'files_manager',
    };

    const client = await MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    testClientDb = client.db(dbInfo.database);

    await testClientDb.collection('users').deleteMany({});
    await testClientDb.collection('files').deleteMany({}); // Clear files collection as well

    // Add 2 users
    await testClientDb.collection('users').insertMany([
      { email: 'me@me.com' },
      { email: 'me2@me.com' },
    ]);

    // Add 3 files
    await testClientDb.collection('files').insertMany([
      { name: 'file 1' },
      { name: 'file 2' },
      { name: 'file 3' },
    ]);
  });

  afterEach(async () => {
    if (testClientDb) {
      await testClientDb.client.close(); // Close the database connection if needed
    }
  });

  it('GET /stats exists', (done) => {
    chai.request('http://localhost:5000')
      .get('/stats')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        const bodyJson = res.body;
        expect(bodyJson.users).to.equal(2);
        expect(bodyJson.files).to.equal(3);
        done();
      });
  }).timeout(30000);
});
