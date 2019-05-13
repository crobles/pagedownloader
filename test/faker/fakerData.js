const createFactory = require('half-faked');
const faker = require('faker');

const makeFakeObject = createFactory({
  ss:  () => faker.random.number().toString(),
  customerRut: faker.helpers.randomize(['1-9']),
  customerName: faker.name.findName,
  branchId: faker.random.number().toString(),
  branchName: faker.helpers.randomize(['(La Calera)  FALABELLA RETAIL S.A.', '(Plaza Oeste)  FALABELLA RETAIL S.A.']),
  orderId: faker.random.number().toString(),
  subOrderId: faker.random.number().toString()
});


module.exports = makeFakeObject;
