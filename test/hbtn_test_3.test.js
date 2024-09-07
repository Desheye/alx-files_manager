import { afterEach, beforeEach, describe, it } from 'mocha';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /stats', () => {
  let client = null;
  let testClientDb = null;

  beforeEach(async () => {
    const dbInfo = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '27017',
      database: process.env.DB_DATABASE || 'files_manager',
    };

    // Connect to the database
    client = await MongoClient.connect(`mongodb://${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    testClientDb = client.db(dbInfo.database);

    // Clean up the collection
    await testClientDb.collection('users').deleteMany({});
    await testClientDb.collection('files').deleteMany({});
  });

  afterEach(async () => {
    // Close the database connection after each test
    if (client) {
      await client.close();
    }
  });

  it('should return stats with zero users and files', (done) => {
    chai.request('http://localhost:5000')
      .get('/stats')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        const bodyJson = res.body;
        expect(bodyJson.users).to.equal(0);
        expect(bodyJson.files).to.equal(0);
        done();
      });
  }).timeout(30000);
});
