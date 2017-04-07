// Generated by LiveScript 1.5.0
(function(){
  var server, db, db_helpers, config, helpers, fs, http, assert, signature, userId, globalToken, SQ, NQ;
  server = require('../server.js');
  db = require('../db.js');
  db_helpers = require('../helpers/db_helpers.js');
  config = require('../config.js');
  helpers = require('../helpers/helpers.js');
  fs = require('fs');
  http = require('http');
  assert = require('assert');
  eval(fs.readFileSync('test/helpers.js') + '');
  signature = '';
  userId = '';
  globalToken = '';
  SQ = assert.equal;
  NQ = assert.notEqual;
  describe('Users module', function(T){
    before(function(done){
      var uri, conn;
      uri = 'mongodb://localhost/tests';
      conn = db.connectToDb(uri, '', '');
      db.removeDb(function(){
        server.initDb(db);
        server.startHttp(9091);
        done();
      });
    });
    after(function(done){
      server.stop();
      db.removeDb(function(){});
      db.disconnectDb();
      done();
    });
    it('1.1. should not create user if no email in body', function(done){
      var url, data;
      url = '/api/v1/users';
      data = '';
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.2. should not create user if no pass in body', function(done){
      var url, j, data;
      url = '/api/v1/users';
      j = {
        email: 'tony@mail.ru'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.3.should not create user if bad email', function(done){
      var url, j, data;
      url = '/api/v1/users';
      j = {
        email: 'tonymailu',
        pass: 'goodpass'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.4.should not create user if pass is too short', function(done){
      var url, j, data;
      url = '/api/v1/users';
      j = {
        email: 'anthony.akentiev@gmail.com',
        pass: '123'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        NQ(dataOut, '');
        done();
      });
    });
    it('1.5. should create new user', function(done){
      var url, j, data;
      url = '/api/v1/users';
      j = {
        email: 'anthony.akentiev@gmail.com',
        pass: '123456'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        var p;
        SQ(err, null);
        SQ(statusCode, 200);
        p = JSON.parse(dataOut);
        SQ(p.statusCode, 1);
        NQ(p.shortId, 0);
        db.UserModel.findByEmail(j.email, function(err, users){
          SQ(err, null);
          SQ(users.length, 1);
          SQ(users[0].shortId, p.shortId);
          SQ(users[0].validated, false);
          db.UserModel.findByShortId(p.shortId, function(err, users){
            var userId, signature;
            SQ(err, null);
            SQ(users.length, 1);
            SQ(users[0].shortId, p.shortId);
            NQ(users[0].validationSig, '');
            userId = users[0].shortId;
            signature = users[0].validationSig;
            db.SubscriptionModel.findByShortId(userId, function(err, subs){
              SQ(err, null);
              SQ(subs.length, 1);
              SQ(subs[0].type, 1);
              done();
            });
          });
        });
      });
    });
    it('1.6. should not login if not validated yet', function(done){
      var email, url, j, data;
      email = helpers.encodeUrlDec('anthony.akentiev@gmail.com');
      url = '/api/v1/users/' + email + '/login';
      j = {
        pass: '123456'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 401);
        done();
      });
    });
    it('1.7. should not send <reset password> if still not validated', function(done){
      var email, url;
      email = helpers.encodeUrlDec('anthony.akentiev@gmail.com');
      url = '/api/v1/users/' + email + '/reset_password_request';
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 200);
        SQ(dataOut, 'OK');
        done();
      });
    });
    it('1.8. should not validate user without signature', function(done){
      var url;
      url = '/api/v1/users/' + userId + '/validation';
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.9. should not validate user without valid user ID', function(done){
      var url;
      url = '/api/v1/users/' + '1234' + '/validation';
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.10. should validate user', function(done){
      var url;
      url = '/api/v1/users/' + userId + '/validation?sig=' + signature;
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        var str;
        SQ(err, null);
        SQ(statusCode, 200);
        SQ(dataOut, 'OK');
        str = 'anthony.akentiev@gmail.com';
        db.UserModel.findByEmail(str, function(err, users){
          SQ(err, null);
          SQ(users.length, 1);
          SQ(users[0].validated, true);
          SQ(users[0].validationSig, '');
          done();
        });
      });
    });
    it('1.11. should not validate user again', function(done){
      var url;
      url = '/api/v1/users/' + userId + '/validation?sig=' + signature;
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.12. should not login if bad password', function(done){
      var email, url, j, data;
      email = helpers.encodeUrlDec('anthony.akentiev@gmail.com');
      url = '/api/v1/users/' + email + '/login';
      j = {
        pass: 'shitsomw'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 401);
        done();
      });
    });
    it('1.13. should not login if bad email', function(done){
      var email, url, j, data;
      email = helpers.encodeUrlDec('nono@gmail.com');
      url = '/api/v1/users/' + email + '/login';
      j = {
        pass: '123456'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 404);
        done();
      });
    });
    it('1.14. should login if everything OK', function(done){
      var url, j, data;
      url = '/api/v1/users/' + helpers.encodeUrlDec('anthony.akentiev@gmail.com') + '/login';
      j = {
        pass: '123456'
      };
      data = JSON.stringify(j);
      postData(9091, url, data, function(err, statusCode, h, dataOut){
        var parsed, globalToken;
        SQ(err, null);
        SQ(statusCode, 200);
        parsed = JSON.parse(dataOut);
        globalToken = parsed.token;
        NQ(globalToken.length, 0);
        done();
      });
    });
    it('1.15. should not send <reset password> if bad user', function(done){
      var email, url;
      email = helpers.encodeUrlDec('a.akentiev@gmail.com');
      url = '/api/v1/users/' + email + '/reset_password_request';
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 200);
        SQ(dataOut, 'OK');
        done();
      });
    });
    it('1.16. should reset password - send email', function(done){
      var email, url;
      email = helpers.encodeUrlDec('anthony.akentiev@gmail.com');
      url = '/api/v1/users/' + email + '/reset_password_request?do_not_send_email=1';
      postData(9091, url, '', function(err, statusCode, h, dataOut){
        SQ(err, null);
        SQ(statusCode, 200);
        SQ(dataOut, 'OK');
        done();
      });
    });
    it('1.17. should set new password', function(done){
      var email;
      email = 'anthony.akentiev@gmail.com';
      db.UserModel.findByEmail(email, function(err, users){
        var sig, oldPass, url;
        SQ(err, null);
        SQ(users.length, 1);
        SQ(users[0].validated, true);
        NQ(users[0].resetSig.length, 0);
        sig = users[0].resetSig;
        oldPass = users[0].password;
        url = '/api/v1/users/' + userId + '/password?sig=' + sig + '&new_val=' + 'new_Pass';
        putData(9091, url, '', function(err, statusCode, headers, dataOut){
          SQ(err, null);
          SQ(statusCode, 200);
          db.UserModel.findByEmail(email, function(err, users){
            SQ(err, null);
            SQ(users.length, 1);
            SQ(users[0].validated, true);
            SQ(users[0].resetSig, '');
            NQ(users[0].password, oldPass);
            done();
          });
        });
      });
    });
  });
}).call(this);
