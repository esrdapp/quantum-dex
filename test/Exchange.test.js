import { ether, tokens, EVM_REVERT, ETHER_ADDRESS } from '../helpers';

const Token = artifacts.require('./Token');
const Exchange = artifacts.require('Exchange');

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('Exchange', ([ deployer, feeAccount, user1 ]) => {
  let token = null;
  let exchange = null;
  const feePercent = 10;

  beforeEach(async () => {
    token = await Token.new(); // deploy token
    exchange = await Exchange.new(feeAccount, feePercent); // deploy exchange
    token.transfer(user1, tokens(100), { from: deployer }); // transfer tokens to user1
  });
  describe('deployment', () => {
    it('tracks fee account', async() => {
      const result = await exchange.feeAccount();
      result.should.equal(feeAccount);
    });
    it('tracks fee percent', async() => {
      const result = await exchange.feePercent();
      result.toString().should.equal(feePercent.toString());
    });
  });
  describe('fallback', () => {
    it('revert when Ether is sent', async() => {
      await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT);
    });
  });
  describe('deposit Ether', async() => {
    let result = null;
    let amount = null;

    beforeEach(async () => {
      amount = ether(1);
      result = await exchange.depositEther({ from: user1, value: amount });
    });
    it('tracks Ether deposit', async() => {
      const balance = await exchange.tokens(ETHER_ADDRESS, user1);
      balance.toString().should.equal(amount.toString());
    });
    it('emits Deposit event', async() => {
      const log = result.logs[0];
      log.event.should.equal('Deposit');
      const event = log.args;
      event.token.should.equal(ETHER_ADDRESS, 'token address is correct');
      event.user.should.equal(user1, 'user address is correct');
      event.amount.toString().should.equal(amount.toString(), 'amount is correct');
      event.balance.toString().should.equal(amount.toString(), 'balance is correct');
    });
  });
  describe('deposit tokens', () => {
    let result = null;
    let amount = null;

    describe('success', () => {
      beforeEach(async () => {
        amount = tokens(10);
        await token.approve(exchange.address, amount, { from: user1 });
        result = await exchange.depositToken(token.address, amount, { from: user1 });
      });
      it('tracks token deposit', async() => {
        let balance = null;
        balance = await token.balanceOf(exchange.address); // check exchange token balance
        balance.toString().should.equal(amount.toString()); // check tokens on exchange
        balance = await exchange.tokens(token.address, user1);
        balance.toString().should.equal(amount.toString());
      });
      it('emits Deposit event', async() => {
        const log = result.logs[0];
        log.event.should.equal('Deposit');
        const event = log.args;
        event.token.toString().should.equal(token.address, 'token address is correct');
        event.user.should.equal(user1, 'user address is correct');
        event.amount.toString().should.equal(amount.toString(), 'amount is correct');
        event.balance.toString().should.equal(amount.toString(), 'balance is correct');
      });
    });
    describe('failure', () => {
      it('rejects Ether deposits', async() => {
        await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      });
      it('fails when no tokens are approved', async() => {
        await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      });
    });
  });
})