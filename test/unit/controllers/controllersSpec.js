//
// test/unit/controllers/controllersSpec.js
//

var sinon = require('sinon');

// Replace saveAs plugin
saveAs = function(blob, filename) {
  saveAsLastCall = {
    blob: blob,
    filename: filename
  };
};

var startServer = require('../../mocks/FakePayProServer');

describe("Unit: Controllers", function() {
  config.plugins.LocalStorage=true;
  config.plugins.GoogleDrive=null;

  var invalidForm = {
    $invalid: true
  };

  var scope;
  var server;

  beforeEach(module('copayApp.services'));
  beforeEach(module('copayApp.controllers'));
  beforeEach(angular.mock.module('copayApp'));

  var walletConfig = {
    requiredCopayers: 3,
    totalCopayers: 5,
    spendUnconfirmed: 1,
    reconnectDelay: 100,
    networkName: 'testnet',
    alternativeName: 'lol currency',
    alternativeIsoCode: 'LOL'
  };


  describe('More Controller', function() {
    var ctrl;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();

      $rootScope.wallet = new FakeWallet(walletConfig);
      ctrl = $controller('MoreController', {
        $scope: scope,
        $modal: {},
      });
      saveAsLastCall = null;
    }));

    it('Backup controller #download', function() {
      scope.wallet.setEnc('1234567');
      expect(saveAsLastCall).equal(null);
      scope.downloadBackup();
      expect(saveAsLastCall.blob.size).equal(7);
      expect(saveAsLastCall.blob.type).equal('text/plain;charset=utf-8');
    });

    it('Backup controller should name backup correctly for multiple copayers', function() {
      scope.wallet.setEnc('1234567');
      expect(saveAsLastCall).equal(null);
      scope.downloadBackup();
      expect(saveAsLastCall.filename).equal('myNickname-myTESTwullet-testID-keybackup.json.aes');
    });

    it('Backup controller should name backup correctly for 1-1 wallet', function() {
      scope.wallet.setEnc('1234567');
      expect(saveAsLastCall).equal(null);
      scope.wallet.totalCopayers = 1;
      scope.downloadBackup();
      expect(saveAsLastCall.filename).equal('myTESTwullet-testID-keybackup.json.aes');
    });

  });

  describe('Create Controller', function() {
    var c;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      c = $controller('CreateController', {
        $scope: scope,
      });
    }));

    describe('#getNumber', function() {
      it('should return an array of n undefined elements', function() {
        var n = 5;
        var array = scope.getNumber(n);
        expect(array.length).equal(n);
      });
    });
    describe('#create', function() {
      it('should work with invalid form', function() {
        scope.create(invalidForm);
      });
    });

  });

  describe('Address Controller', function() {
    var addressCtrl;
    beforeEach(angular.mock.module('copayApp'));
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      addressCtrl = $controller('AddressesController', {
        $scope: scope,
      });
    }));

    it('should have a AddressesController controller', function() {
      expect(scope.loading).equal(false);
    });
  });

  describe('Transactions Controller', function() {
    var transactionsCtrl;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      $rootScope.wallet = new FakeWallet(walletConfig);
      transactionsCtrl = $controller('TransactionsController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(transactionsCtrl);
    });

    it('should have a TransactionController controller', function() {
      expect(scope.loading).equal(false);
    });

    it('should return an empty array of tx from insight', function() {
      scope.getTransactions();
      expect(scope.blockchain_txs).to.be.empty;
    });

    it('should call amountAlternative and return a value', function() {
      var cb = sinon.spy();
      var s1 = sinon.stub(scope, 'amountAlternative');
      s1.onCall(0).returns(1000);
      s1.onCall(1).returns(2000);
      expect(s1(100, 0, cb)).equal(1000);
      expect(s1(200, 1, cb)).equal(2000);
      sinon.assert.callCount(scope.amountAlternative, 2);
      s1.restore();
    });
  });

  describe('Send Controller', function() {
    var scope, form, sendForm, sendCtrl;
    beforeEach(angular.mock.module('copayApp'));
    beforeEach(module(function($provide) {
      $provide.value('request', {
        'get': function(_, cb) {
          cb(null, null, [{
            name: 'lol currency',
            code: 'LOL',
            rate: 2
          }]);
        }
      });
    }));
    beforeEach(angular.mock.inject(function($compile, $rootScope, $controller, rateService) {
      scope = $rootScope.$new();
      scope.rateService = rateService;
      $rootScope.wallet = new FakeWallet(walletConfig);
      $rootScope.wallet.settings.alternativeName = 'lol currency';
      $rootScope.wallet.settings.alternativeIsoCode = 'LOL';
      var element = angular.element(
        '<form name="form">' +
        '<input type="text" id="newaddress" name="newaddress" ng-disabled="loading" placeholder="Address" ng-model="newaddress" valid-address required>' +
        '<input type="text" id="newlabel" name="newlabel" ng-disabled="loading" placeholder="Label" ng-model="newlabel" required>' +
        '</form>'
      );
      scope.model = {
        newaddress: null,
        newlabel: null,
        address: null,
        amount: null
      };
      $compile(element)(scope);

      var element2 = angular.element(
        '<form name="form2">' +
        '<input type="text" id="address" name="address" ng-model="address" valid-address required>' +
        '<input type="number" id="amount" name="amount" ng-model="amount" min="1" max="10000000000" required>' +
        '<input type="number" id="alternative" name="alternative" ng-model="alternative">' +
        '<textarea id="comment" name="comment" ng-model="commentText" ng-maxlength="100"></textarea>' +
        '</form>'
      );
      $compile(element2)(scope);
      sendCtrl = $controller('SendController', {
        $scope: scope,
        $modal: {},
      });

      scope.$digest();
      form = scope.form;
      sendForm = scope.form2;
      scope.sendForm = sendForm;
    }));

    it('should have a SendController controller', function() {
      expect(scope.loading).equal(false);
    });

    it('should have a title', function() {
      expect(scope.title).equal('Send');
    });

    it('should return true if wallet has addressBook', function() {
      expect(scope.showAddressBook()).equal(true);
    });

    it('should validate address with network', function() {
      form.newaddress.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      expect(form.newaddress.$invalid).to.equal(false);
    });

    it('should not validate address with other network', function() {
      form.newaddress.$setViewValue('1JqniWpWNA6Yvdivg3y9izLidETnurxRQm');
      expect(form.newaddress.$invalid).to.equal(true);
    });

    it('should not validate random address', function() {
      form.newaddress.$setViewValue('thisisaninvalidaddress');
      expect(form.newaddress.$invalid).to.equal(true);
    });

    it('should validate label', function() {
      form.newlabel.$setViewValue('John');
      expect(form.newlabel.$invalid).to.equal(false);
    });

    it('should not validate label', function() {
      expect(form.newlabel.$invalid).to.equal(true);
    });

    it('should create a transaction proposal with given values', function() {
      sendForm.address.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      sendForm.amount.$setViewValue(1000);

      var spy = sinon.spy(scope.wallet, 'createTx');
      var spy2 = sinon.spy(scope.wallet, 'sendTx');
      scope.loadTxs = sinon.spy();

      scope.submitForm(sendForm);
      sinon.assert.callCount(spy, 1);
      sinon.assert.callCount(spy2, 0);
      sinon.assert.callCount(scope.loadTxs, 1);
      spy.getCall(0).args[0].should.equal('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      spy.getCall(0).args[1].should.equal(1000 * scope.wallet.settings.unitToSatoshi);
      (typeof spy.getCall(0).args[2]).should.equal('undefined');
    });


    it('should handle big values in 100 BTC', function() {
      var old = scope.wallet.settings.unitToSatoshi;
      scope.wallet.settings.unitToSatoshi = 100000000;;
      sendForm.address.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      sendForm.amount.$setViewValue(100);
      var spy = sinon.spy(scope.wallet, 'createTx');
      scope.loadTxs = sinon.spy();
      scope.submitForm(sendForm);
      spy.getCall(0).args[1].should.equal(100 * scope.wallet.settings.unitToSatoshi);
      scope.wallet.settings.unitToSatoshi = old;
    });


    it('should handle big values in 5000 BTC', inject(function($rootScope) {
      var old = $rootScope.wallet.settings.unitToSatoshi;
      $rootScope.wallet.settings.unitToSatoshi = 100000000;;
      sendForm.address.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      sendForm.amount.$setViewValue(5000);
      var spy = sinon.spy(scope.wallet, 'createTx');
      scope.loadTxs = sinon.spy();
      scope.submitForm(sendForm);
      spy.getCall(0).args[1].should.equal(5000 * $rootScope.wallet.settings.unitToSatoshi);
      $rootScope.wallet.settings.unitToSatoshi = old;
    }));

    it('should convert bits amount to fiat', function(done) {
      scope.rateService.whenAvailable(function() {
        sendForm.amount.$setViewValue(1e6);
        scope.$digest();
        expect(scope.alternative).to.equal(2);
        done();
      });
    });
    it('should convert fiat to bits amount', function(done) {
      scope.rateService.whenAvailable(function() {
        sendForm.alternative.$setViewValue(2);
        scope.$digest();
        expect(scope.amount).to.equal(1e6);
        done();
      });
    });

    it('should create and send a transaction proposal', function() {
      sendForm.address.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      sendForm.amount.$setViewValue(1000);
      scope.wallet.totalCopayers = scope.wallet.requiredCopayers = 1;
      var spy = sinon.spy(scope.wallet, 'createTx');
      var spy2 = sinon.spy(scope.wallet, 'sendTx');
      scope.loadTxs = sinon.spy();

      scope.submitForm(sendForm);
      sinon.assert.callCount(spy, 1);
      sinon.assert.callCount(spy2, 1);
      sinon.assert.callCount(scope.loadTxs, 1);
    });

    it('should not send txp when there is an error at creation', function() {
      sendForm.address.$setViewValue('mkfTyEk7tfgV611Z4ESwDDSZwhsZdbMpVy');
      sendForm.amount.$setViewValue(1000);
      scope.wallet.totalCopayers = scope.wallet.requiredCopayers = 1;
      sinon.stub(scope.wallet, 'createTx').yields('error');
      var spySendTx = sinon.spy(scope.wallet, 'sendTx');
      scope.loadTxs = sinon.spy();

      scope.submitForm(sendForm);
      sinon.assert.callCount(spySendTx, 0);
      sinon.assert.callCount(scope.loadTxs, 1);
    });
  });

  describe("Unit: Version Controller", function() {
    var scope, $httpBackendOut;
    var GH = 'https://api.github.com/repos/bitpay/copay/tags';
    beforeEach(angular.mock.module('copayApp'));
    beforeEach(inject(function($controller, $injector) {
      $httpBackend = $injector.get('$httpBackend');
      $httpBackend.when('GET', GH)
        .respond([{
          name: "v100.1.6",
          zipball_url: "https://api.github.com/repos/bitpay/copay/zipball/v0.0.6",
          tarball_url: "https://api.github.com/repos/bitpay/copay/tarball/v0.0.6",
          commit: {
            sha: "ead7352bf2eca705de58d8b2f46650691f2bc2c7",
            url: "https://api.github.com/repos/bitpay/copay/commits/ead7352bf2eca705de58d8b2f46650691f2bc2c7"
          }
        }]);
    }));

    var rootScope;
    beforeEach(inject(function($controller, $rootScope) {
      rootScope = $rootScope;
      scope = $rootScope.$new();
      headerCtrl = $controller('VersionController', {
        $scope: scope,
      });
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });



    it('should hit github for version', function() {
      $httpBackend.expectGET(GH);
      scope.$apply();
      $httpBackend.flush();
    });

    it('should check version ', inject(function($injector) {
      notification = $injector.get('notification');
      var spy = sinon.spy(notification, 'version');
      $httpBackend.expectGET(GH);
      scope.$apply();
      $httpBackend.flush();
      spy.calledOnce.should.equal(true);
    }));

    it('should check blockChainStatus', function() {
      $httpBackend.expectGET(GH);
      $httpBackend.flush();
      rootScope.insightError = 1;
      scope.$apply();
      expect(rootScope.insightError).equal(1);
      scope.$apply();
      expect(rootScope.insightError).equal(1);
      scope.$apply();
    });

  });

  describe("Unit: Sidebar Controller", function() {
    var rootScope;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      rootScope = $rootScope;
      rootScope.wallet = new FakeWallet(walletConfig);

      headerCtrl = $controller('SidebarController', {
        $scope: scope,
      });
    }));

    it('should return an array of n undefined elements', function() {
      var n = 5;
      var array = scope.getNumber(n);
      expect(array.length).equal(n);
    });

  });

  describe('Send Controller', function() {
    var sendCtrl, form;
    beforeEach(inject(function($compile, $rootScope, $controller) {
      scope = $rootScope.$new();
      $rootScope.availableBalance = 123456;
      $rootScope.wallet = new FakeWallet(walletConfig);

      var element = angular.element(
        '<form name="form">' +
        '<input type="number" id="amount" name="amount" placeholder="Amount" ng-model="amount" min="0.0001" max="10000000" enough-amount required>' +
        '</form>'
      );
      scope.model = {
        amount: null
      };
      $compile(element)(scope);
      scope.$digest();
      form = scope.form;

      sendCtrl = $controller('SendController', {
        $scope: scope,
        $modal: {},
      });
    }));

    it('should have a SendController', function() {
      expect(scope.isMobile).not.to.equal(null);
    });
    it('should autotop balance correctly', function() {
      scope.topAmount(form);
      form.amount.$setViewValue(123356);
      expect(scope.amount).to.equal(123356);
      expect(form.amount.$invalid).to.equal(false);
      expect(form.amount.$pristine).to.equal(false);
    });
    it('should return available amount', function() {
      var amount = scope.getAvailableAmount();
      expect(amount).to.equal(123356);
    });
    it('should return 0 if available amount below minimum fee', function() {
      inject(function($compile, $rootScope, $controller) {
        $rootScope.availableBalance = 1;
      });
      var amount = scope.getAvailableAmount();
      expect(amount).to.equal(0);
    });
  });

  describe('Import Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      what = $controller('ImportController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });
    it('import status', function() {
      expect(scope.importStatus).equal('Importing wallet - Reading backup...');
    });
  });

  describe('Open Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      what = $controller('OpenController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });
    describe('#open', function() {
      it('should work with invalid form', function() {
        scope.open(invalidForm);
      });
    });
  });

  describe('Settings Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      what = $controller('SettingsController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });
  });

  describe('Copayers Controller', function() {
    var saveDownload = null;
    var ctrl;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();

      $rootScope.wallet = new FakeWallet(walletConfig);
      ctrl = $controller('CopayersController', {
        $scope: scope,
        $modal: {},
      });
    }));

    it('should exist', function() {
      should.exist(ctrl);
    });

    it('Delete Wallet', function() {
      expect(scope.wallet).not.equal(undefined);
      scope.deleteWallet();
      expect(scope.wallet).equal(undefined);
    });

  });

  describe('Join Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      what = $controller('JoinController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });
    describe('#join', function() {
      it('should work with invalid form', function() {
        scope.join(invalidForm);
      });
    });
  });

  describe('UriPayment Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope, $location) {
      scope = $rootScope.$new();
      var routeParams = {
        data: 'bitcoin:19mP9FKrXqL46Si58pHdhGKow88SUPy1V8'
      };
      var query = {amount: 0.1, message: "a bitcoin donation"};
      what = $controller('UriPaymentController', {
        $scope: scope,
        $routeParams: routeParams,
        $location: {
          search: function() { return query; }
        }
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });

    it('should parse url correctly', function() {
      should.exist(what);
      should.exist(scope.pendingPayment);
      scope.pendingPayment.address.data.should.equal('19mP9FKrXqL46Si58pHdhGKow88SUPy1V8');
      scope.pendingPayment.data.amount.should.equal(0.1);
      scope.pendingPayment.data.message.should.equal('a bitcoin donation');
    });
  });

  describe('Warning Controller', function() {
    var what;
    beforeEach(inject(function($controller, $rootScope) {
      scope = $rootScope.$new();
      what = $controller('WarningController', {
        $scope: scope,
      });
    }));

    it('should exist', function() {
      should.exist(what);
    });
  });

});
