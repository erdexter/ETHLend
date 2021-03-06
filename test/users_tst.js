var targetEmail2, server, db, db_helpers, config, helpers, fs, http, assert, globalToken, SQ, NQ, targetEmail;
server     = require('../server.js');
db         = require('../db.js');
db_helpers = require('../helpers/db_helpers.js');
config     = require('../config.js');
helpers    = require('../helpers/helpers.js');
fs         = require('fs');
http       = require('http');
assert     = require('assert');
eval(fs.readFileSync('test/helpers.js') + '');
global.signature = '';
global.userId = '';
globalToken = '';
SQ = assert.equal;
NQ = assert.notEqual;
targetEmail = 'kirill@chain.cloud';
targetEmail2 = 'gerodot@chain.cloud';
global.sessionUID = '';
global.authToken = '';
global.oneOfLrId = '';

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

function isContractsEnabled(){
     var enabled = 
          (typeof(process.env.ETH_NODE)!=='undefined') && 
          (typeof(process.env.SMART_CONTRACTS_ENABLED)!=='undefined') &&
          (process.env.SMART_CONTRACTS_ENABLED=='true');
     return enabled;
}

var creator = 0;
var lender = 0;

describe('Users module and lending requests', function (T) {
     before(function (done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               lender = accounts[1];

               var uri, conn;
               uri = 'mongodb://localhost/tests';
               conn = db.connectToDb(uri, '', '');
               db.removeDb(function () {
                    server.initDb(db);
                    server.startHttp(9091,function(err){
                         if (err){
                              console.log("Problem with http: " + err);
                         }
                         done();
                    });
               });
          });
     });
     after(function (done) {
          server.stop();
          db.removeDb(function () {});
          db.disconnectDb();
          done();
     });

     it('0.1. Should return json on /api/v1/info', function(done){
          var url = '/api/v1/info';
          getData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err,null);             
               NQ(JSON.parse(h).eth_is_enabled,null)

               // TODO: add tests for all fields

               done()
          });
     });

     it('1.1. should not create user if no email in body', function (done) {
          var url, data;
          url = '/api/v1/users';
          data = '';
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.2. should not create user if no pass in body', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: 'tony@mail.ru'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.3.should not create user if bad email', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: 'tonymailu',
               pass: 'goodpass'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.4.should not create user if pass is too short', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: targetEmail,
               pass: '123'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               NQ(dataOut, '');
               done();
          });
     });

     it('1.5. should create new user', function (done) {
          var url, j, data;
          url = '/api/v1/users?do_not_send_email=1';
          j = {
               email: targetEmail,
               pass: '123456'
          };
          data = JSON.stringify(j);
          return postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var p;
               SQ(err, null);
               SQ(statusCode, 200);
               p = JSON.parse(dataOut);
               SQ(p.statusCode, 1);
               assert.notEqual(p.shortId, 0);
               return db.UserModel.findByEmail(j.email, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].shortId, p.shortId);
                    SQ(users[0].validated, false);
                    return db.UserModel.findByShortId(p.shortId, function (err, users) {
                         SQ(err, null);
                         SQ(users.length, 1);
                         SQ(users[0].shortId, p.shortId);
                         NQ(users[0].validationSig, '');
                         global.userId = users[0].shortId;
                         global.sessionUID = users[0].shortId;
                         global.signature = users[0].validationSig;
                         return db.SubscriptionModel.findByShortId(userId, function (err, subs) {
                              SQ(err, null);
                              SQ(subs.length, 1);
                              SQ(subs[0].type, 1);
                              return done();
                         });
                    });
               });
          });
     });

     it('1.6. should not login if not validated yet', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.7. should not send <reset password> if still not validated', function (done) {
          var email, url;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/reset_password_request';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);

               done();
          });
     });

     it('1.8. should not validate user without signature', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.9. should not validate user without valid user ID', function (done) {
          var url;
          url = '/api/v1/users/' + '1234' + '/validation';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.10. should validate user', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation?sig=' + signature + '&do_not_send_email=1';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               var str;
               SQ(err, null);
               SQ(statusCode, 200);
               SQ(dataOut, 200);
               str = targetEmail;
               db.UserModel.findByEmail(str, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].validated, true);
                    SQ(users[0].validationSig, '');
                    done();
               });
          });
     });

     it('1.11. should not validate user again', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation?sig=' + signature;
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.12. should not login if bad password', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: 'shitsomw'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.13. should not login if bad email', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec('nono@gmail.com');
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.14. should login if everything OK', function (done) {
          var url, j, data;
          url = '/api/v1/users/' + helpers.encodeUrlDec(targetEmail) + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var parsed, globalToken;
               SQ(err, null);
               SQ(statusCode, 200);
               parsed = JSON.parse(dataOut);
               globalToken = parsed.token;
               global.authToken = parsed.token;
               NQ(globalToken.length, 0);
               done();
          });
     });

     it('1.15. should not send <reset password> if bad user', function (done) {
          var email, url;
          email = helpers.encodeUrlDec('a.akentiev@gmail.com');
          url = '/api/v1/users/' + email + '/reset_password_request';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);

               done();
          });
     });

     it('1.16. should reset password - send email', function (done) {
          var email, url;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/reset_password_request?do_not_send_email=1';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               done();
          });
     });

     it('1.17. should set new password', function (done) {

          db.UserModel.findByEmail(targetEmail, function (err, users) {
               var sig, oldPass, url;
               SQ(err, null);
               SQ(users.length, 1);
               SQ(users[0].validated, true);
               NQ(users[0].resetSig.length, 0);
               sig = users[0].resetSig;
               oldPass = users[0].password;
               url = '/api/v1/users/' + userId + '/password?sig=' + sig + '&do_not_send_email=1';

               var data = JSON.stringify({
                    email: targetEmail,
                    pass: 'newPass'
               });

               putData(9091, url, data, function (err, statusCode, headers, dataOut) {
                    SQ(err, null);
                    SQ(statusCode, 200);
                    db.UserModel.findByEmail(targetEmail, function (err, users) {
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

     it('1.18. should validate email xxx@chain.cloud', function (done) {
          var email = 'xxx@chain.cloud';
          var emailQ = helpers.validateEmail(email);
          SQ(emailQ, true);
          done();
     });

     it('1.21. should return user data', function (done) {
          var url = '/api/v1/auth/users/' + global.sessionUID;
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);
               // SQ(JSON.parse(h).balance, 4)
               done()
          });
     });

     it('1.22. should update user data', function (done) {
          var url = '/api/v1/auth/users/' + global.sessionUID;
          var j = {
               ethAddress: lender
          }
          var data = JSON.stringify(j);

          putDataAuth(9091, url, data, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               var url = '/api/v1/auth/users/' + global.sessionUID;
               getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
                    SQ(err, null);
                    SQ(statusCode, 200);
                    SQ(JSON.parse(h).ethAddress, lender)
                    done();
               });              
          });
     });

     it('2.1. Should create new Lending Request', function (done) {
          var url = '/api/v1/auth/lrs';

          var j = {
          };
          data = JSON.stringify(j);

          postDataAuth(9091, url, data, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(statusCode, 200);
               SQ(err, null);
               //LR = JSON.parse(dataOut);
               //NQ(LR.id,0);

               //global.oneOfLrId = LR.id;
               done();
          });       
     });

     it('2.1.2. should return a list of LRs for a selected user. Returns a JSON list of IDs.', function (done) {
          var url = '/api/v1/auth/lrs';
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);
               NQ(JSON.parse(h).ids, null);
               SQ(JSON.parse(h).ids.length, 1);

               global.oneOfLrId = JSON.parse(h).ids[0];
               console.log('ID: ' + global.oneOfLrId);
               done();
          });
     });

     it('2.1.3 should return a valid state', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               // 'waiting for data'
               SQ(JSON.parse(h).current_state,0);
               done();
          });
     });

     it('2.2. Should set data for Lending Request', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;

          var j = {
               eth_count: 120,
               token_amount: 10000,
               token_name: 'Augur tokens',
               premium_wei: 1,
               token_smartcontract: '0xb533aae346245e2e05b23f420C140bCA2529b8a6',
               token_infolink: 'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
               days_to_lend: 30,
          };
          data = JSON.stringify(j);

          putDataAuth(9091, url, data, global.authToken, function (err, statusCode, h, dataOut) {
               console.log('OUT: ');
               console.log(dataOut);

               SQ(statusCode, 200);
               SQ(err, null);        
               done();
          });
     });

     it('2.2.2 Should not set data again', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;

          var j = {
               eth_count: 120,
               token_amount: 10000,
               token_name: 'Augur tokens',
               premium_wei: "1",
               token_smartcontract: '0xb533aae346245e2e05b23f420C140bCA2529b8a6',
               token_infolink: 'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
               days_to_lend: 30,
          };
          data = JSON.stringify(j);

          putDataAuth(9091, url, data, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(statusCode, 400);
               SQ(err, null);        
               done();
          });
     });

     it('2.2.1 should return a valid state', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               // 'waiting for tokens'
               var p = JSON.parse(h);

               SQ(p.current_state,1);
               SQ(p.eth_count,120);
               SQ(p.token_amount,10000);
               SQ(p.days_to_lend,30);
               SQ(p.days_to_lend,30);

               done();
          });
     });

     it('2.2.2. Shouldn`t set data for Lending Request (data not complete)', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          var j = {
               eth_count: 120,
               token_smartcontract: '0xb533aae346245e2e05b23f420C140bCA2529b8a6',
               token_infolink: 'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
               days_to_lend: 30
          };
          data = JSON.stringify(j);

          putDataAuth(9091, url, data, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(statusCode, 400);        
               done();
          });
     });

     it('2.2.3. Shouldn`t set data for Lending Request (no data)', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;

          putDataAuth(9091, url, '', global.authToken, function (err, statusCode, h, dataOut) {
               SQ(statusCode, 400);        
               done();
          });
     });

     it('2.3. should return a list of LRs for all users. Returns a JSON list of IDs.', function (done) {
          var url = '/api/v1/auth/lrs';
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);
               NQ(JSON.parse(h).ids, null);
               NQ(JSON.parse(h).ids.length, 0);
               done();
          });
     });

     it('2.4. should return a Lending Request', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               SQ(JSON.parse(h).days_to_lend,30);
               SQ(JSON.parse(h).days_left,30);

               done();
          });
     });

     it('2.5. Shouldn`t Lend my own borrow', function (done) {
          var lrId = global.oneOfLrId;
          var url = '/api/v1/auth/lrs/'+global.oneOfLrId+'/lend'
 
          postDataAuth(9091, url, '', global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);

               // TODO: not working with contracts!
               if(!isContractsEnabled()){
                    SQ(statusCode, 400);
                    var parsed = JSON.parse(dataOut)
               }
               done();
          });
     });

     it('2.x We`ll create new user to perform the next tests', function (done) {
          var url, j, data;
          url = '/api/v1/users?do_not_send_email=1';
          j = {
               email: targetEmail2,
               pass: '123456',
               ethAddress: 'some-stuff'
          };
          data = JSON.stringify(j);
          return postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var p;
               SQ(err, null);
               SQ(statusCode, 200);
               p = JSON.parse(dataOut);
               SQ(p.statusCode, 1);
               assert.notEqual(p.shortId, 0);
               return db.UserModel.findByEmail(j.email, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].shortId, p.shortId);
                    SQ(users[0].validated, false);
                    return db.UserModel.findByShortId(p.shortId, function (err, users) {
                         SQ(err, null);
                         SQ(users.length, 1);
                         SQ(users[0].shortId, p.shortId);
                         NQ(users[0].validationSig, '');
                         global.userId2 = users[0].shortId;
                         global.sessionUID2 = users[0].shortId;
                         global.signature2 = users[0].validationSig;
                         return db.SubscriptionModel.findByShortId(userId, function (err, subs) {
                              SQ(err, null);
                              SQ(subs.length, 1);
                              SQ(subs[0].type, 1);
                              db.UserModel.find({},function(err,users){
                                   SQ(users.length, 2)
                                   return done();
                              })
                              
                         });
                    });
               });
          });
     });

     it('2.x. ...then validate', function (done) {
          var url;
          url = '/api/v1/users/' + userId2 + '/validation?sig=' + signature2 + '&do_not_send_email=1';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               var str;
               SQ(err, null);
               SQ(statusCode, 200);
               SQ(dataOut, 200);
               str = targetEmail2;
               db.UserModel.findByEmail(str, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].validated, true);
                    SQ(users[0].validationSig, '');
                    done();
               });
          });
     });

     it('2.x. ... and login', function (done) {
          var url, j, data;
          url = '/api/v1/users/' + helpers.encodeUrlDec(targetEmail2) + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var parsed, globalToken;
               SQ(err, null);
               SQ(statusCode, 200);
               parsed = JSON.parse(dataOut);
               globalToken = parsed.token;
               global.authToken2 = parsed.token;
               NQ(globalToken.length, 0);
               done();
          });
     });

     it('2.6. Gerodot (new user) shouldn`t lend borrow (no token)', function (done) {
          var lrId = global.oneOfLrId;
          var url = '/api/v1/auth/lrs/'+global.oneOfLrId+'/lend'
 
          postDataAuth(9091, url, '', '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 401);
               done();
          });
     });
     
     it('2.7. Gerodot (new user) shouldn`t lend borrow (bad LR id)', function (done) {
          var lrId = global.oneOfLrId;
          var url  = '/api/v1/auth/lrs/trolololo/lend';
 
          postDataAuth(9091, url, '', global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('2.8. Gerodot should`t lend Kirill`s borrow in wrong state', function (done) {
          var lrId = global.oneOfLrId;
          var url  = '/api/v1/auth/lrs/'+global.oneOfLrId+'/lend';

          postDataAuth(9091, url, '', global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     // any user can call this method
     it('2.9. Should check for tokens', function (done) {
          var lrId = global.oneOfLrId;
          var url  = '/api/v1/auth/lrs/' + global.oneOfLrId + '/check_for_tokens';

          getData(9091, url, global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);
               done();
          });
     });

     it('2.9.2 Should not allow to move again', function (done) {
          var lrId = global.oneOfLrId;
          var url  = '/api/v1/auth/lrs/' + global.oneOfLrId + '/check_for_tokens';

          getData(9091, url, global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('2.8. Gerodot should lend Kirill`s borrow', function (done) {
          var lrId = global.oneOfLrId;
          var url  = '/api/v1/auth/lrs/'+global.oneOfLrId+'/lend';

          postDataAuth(9091, url, '', global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);
               var parsed = JSON.parse(dataOut);
               SQ(parsed.minutes_left,1440);
               done();
          });
     });

     it('2.8.2 should return a valid state', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          getData(9091, url, global.authToken, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               // 'waiting for loan'
               // TODO: not working with contracts!
               if(!isContractsEnabled()){
                    SQ(JSON.parse(h).current_state,4);
               }
               done();
          });
     });

     it('2.9. Shouldn`t create new Lending Request (no token)', function (done) {
          var url = '/api/v1/auth/lrs';

          postDataAuth(9091, url, '', '', function (err, statusCode, h, dataOut) {
               SQ(statusCode, 401);
               SQ(err, null);
               done();
          });       
     });

     it('2.10. Shouldn`t return a list of LRs (no token)', function (done) {
          var url = '/api/v1/auth/lrs';
          getData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(statusCode, 401);
               done();
          });
     });

     it('2.11. Gerodot shouldn`t set data for Kirill`s Lending Request', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;

          var j = {
               eth_count: 120,
               token_amount: 10000,
               token_name: 'Augur tokens',
               premium_wei: "1",
               token_smartcontract: '0xb533aae346245e2e05b23f420C140bCA2529b8a6',
               token_infolink: 'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
               days_to_lend: 30,
          };
          data = JSON.stringify(j);

          putDataAuth(9091, url, data, global.authToken2, function (err, statusCode, h, dataOut) {
               SQ(statusCode, 400);      
               done();
          });
     });

     it('2.12. Shouldn`t return a Lending Request (no token)', function (done) {
          var url = '/api/v1/auth/lrs/' + global.oneOfLrId;
          getData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(statusCode, 401);
               done();
          });
     });
})
