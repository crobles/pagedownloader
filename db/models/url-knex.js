const rfr = require('rfr');
const knex = rfr('db/knex');
const table = 'urllist';
const fs = require('fs');
const read = async () => {
  return await knex.table(table).select();
};

const saveOne = async (url) => {
  try {
    if (url['origin'].length == 0) {
      return { success: false, error: 'No origin specified' };
    } else if (url['url'].length == 0) {
      return { success: false, error: 'No Url specified' };
    }
    const insertResp = await knex.table(table).insert(url);
    return { success: insertResp.rowCount > 0 };
  } catch (error) {
    return { success: false, error: error.code || error.message };
  }
};

const saveList = async (list) => {
  try {
    let errors = ['', ''];
    const _list = list.filter(url => {
      if (url['origin'].length == 0) {
        errors[1] = 'Some origins are not specified';
        return false;
      } else if (url['url'].length == 0) {
        errors[0] = 'Some url are not specified';
        return false;
      }
      return true;
    });
    //const insertResp = await knex.table(table).insert(_list);
    let query = knex().table(table).insert(_list).toString();
    let insertResp = await knex.raw(`${query}  on conflict do nothing`);
    return { success: insertResp.rowCount > 0, error: errors.join('. ') };
  } catch (error) {
    return { success: false, error: error.code || error.message };
  }
};

const saveOrderList = async (orderList) => {
  if (orderList.length > 0) {
    const newOrderList = orderList.map(order => {
      order.subOrders = JSON.stringify(order.subOrders);
      order.lineOrders = JSON.stringify(order.lineOrders);
      order.payment = JSON.stringify(order.payment);
      order.branchs = JSON.stringify(order.branchs);
      return order;
    });
    const insert = await knex.table(table).insert(newOrderList);
    return insert.rowCount;
  } else {
    return null;
  }
};

const getNonChecked = async (limit = 100) => {
  /* const queryResponse = knex.table(table)
    .where({ 'checked': false }).limit(limit)
    .select(); */
  const query = fs.readFileSync('./db/queries/balancedURL.sql', 'utf-8');
  const queryResponse = await knex.raw(query);
  return queryResponse['rows'];
};

const getNonCheckedCategory = async (category) => {
  const queryResponse = knex.table(table)
    .where({ 'checked': false, category: category })
    .select();
  return queryResponse;
};

const urlChecked = async (id) => {
  let setQuery = { 'checked': true };
  const filter = { 'id': id };
  const resp = await knex.table(table).where(filter).update(setQuery);
  return { success: resp > 0 };
};

const remove = async (filter) => {
  const queryResponse = await knex.table(table)
    .where(filter)
    .del();
  return queryResponse;
};

const getAttempts = async () => {
  const queryResponse = await knex.table('logs').where('typeScrap', '>', 0).count('id');
  return queryResponse;
};

const saveAttempts = async (message, typeScrap) => {
  const queryResponse = await knex.table('logs').insert({ message, typeScrap });
  return queryResponse.rowCount;
};

module.exports = {
  read,
  saveList,
  saveOne,
  saveOrderList,
  getNonChecked,
  urlChecked,
  remove,
  getNonCheckedCategory,
  getAttempts,
  saveAttempts
};
