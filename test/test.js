const expect = require('chai').expect
const { Client } = require('pg');
const request = require('request');
const rp = require('request-promise');
const dummyData = require('../database/dummydata.js');
const db = require('../database/index.js');
const serverURL = 'http://127.0.0.1:1337';

describe ('Restaurant API routes', function() {
  //drops database and recreates a new one with dummy data
  beforeEach(function(done) {
    dummyData.dropDB()
    .then(() => done());
  });

  describe ('GET request to /api/restaurants', function() {
    it ('should return a list of restaurants', function(done) {
      rp({
        uri: `${serverURL}/api/restaurants`,
        method: 'GET',
        json: true
      })
      .then((results) => {
        expect(results.length).to.equal(9);
        expect(results[0].name).to.equal('Tempest');
        expect(results[1].status).to.equal('Open');
        expect(results[2].phone).to.equal('(415) 567-7664');
        done();
      });
    });
  });

  describe ('POST request to /api/queues', function() {
    it ('should insert a new row into queues table', function(done) {
      let oldQueueCount;
      db.Queue.count()
      .then((results) => {
        oldQueueCount = results;
        return rp({
          uri: `${serverURL}/api/queues`,
          method: 'POST',
          json: {
            name: 'Example User',
            mobile: '(123) 456-7890',
            email: 'example@email.com',
            size: 2,
            restaurantId: 1
          }
        });
      })
      .then(() => {
        return db.Queue.count()
      })
      .then((results) => {
        let newQueueCount = results;
        expect(newQueueCount).to.be.above(oldQueueCount);
        done();
      });
    });
  });

  describe ('PATCH request to /api/restaurants', function() {
    it ('should update the restrant in the restaurants table', function(done) {
      rp({
        uri: `${serverURL}/api/restaurants`,
        method: 'PATCH',
        qs: {
          restaurantId: 1,
          status: 'Closed'
        }
      })
      .then(() => db.Restaurant.findById(1))
      .then((results) => {
        expect(results.dataValues.status).to.equal('Closed');
        done()
      });
    });
  });

  describe ('PUT request to /api/queues', function() {
    it ('should remove a customer from the queue of the rastaurant', function(done) {
      rp({
        uri: `${serverURL}/api/queues`,
        method: 'PUT',
        qs: {
          queueId: 1
        }
      })
      .then(() => db.Queue.findById(1))
      .then((results) => {
        expect(results.dataValues.wait).to.be.null;
        expect(results.dataValues.position).to.be.null;
        done()
      });
    });
  });

  describe ('GET request to /api/manager/history', function() {
    it ('should return login/logout history of managers for the restaurant', function(done) {
      let cookieJar = rp.jar();
      rp({
        uri: `${serverURL}/managerlogin`,
        method: 'POST',
        jar: cookieJar,
        qs: {
          username: 'johnny',
          password: 'hunter2'
        }
      }).then(() => {
        return rp({
          uri: `${serverURL}/api/manager/history`,
          method: 'GET',
          jar: cookieJar,
          json: true
        })
      })
      .then((results) => {
        expect(results).to.be.a('array');
        expect(results[0].type).to.equal('LOGIN');
        expect(results[0].manager.username).to.equal('johnny');
        done()
      });
    });
    it ('should return 401 status code for unauthorized user', function(done) {
      rp({
        uri: `${serverURL}/api/manager/history`,
        method: 'GET'
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(401);
        done()
      });
    });
  });

  describe ('DELETE request to /api/manager/history', function() {
    it ('should delete login/logout history of managers for the restaurant', function(done) {
      let cookieJar = rp.jar();
      let numQueuesBeforeDeletion;
      rp({
        uri: `${serverURL}/managerlogin`,
        method: 'POST',
        jar: cookieJar,
        qs: {
          username: 'johnny',
          password: 'hunter2'
        }
      })
      .then(() => db.ManagerAudit.count())
      .then((results) => {
        numQueuesBeforeDeletion = results;
        return rp({
          uri: `${serverURL}/api/manager/history`,
          method: 'DELETE',
          jar: cookieJar,
          json: true
        })
      })
      .then(() => db.ManagerAudit.count())
      .then((results) => {
        let numQueuesAfterDeletion = results;
        expect(numQueuesBeforeDeletion).to.be.above(numQueuesAfterDeletion)
        done()
      });
    });
    it ('should return 401 status code for unauthorized user', function(done) {
      rp({
        uri: `${serverURL}/api/manager/history`,
        method: 'DELETE'
      })
      .catch((err) => {
        expect(err.statusCode).to.equal(401);
        done()
      });
    });
  });
});
