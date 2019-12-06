const rfr = require('rfr');
const $ = require('cheerio');
const models = rfr('db/models/models');
const storageUrl = rfr('storage/url');
const puppeteer = require('puppeteer');
const headerConf = rfr('libs/headerConf');
require('log-timestamp');

let browser = null;
const STATUS_RUNNING = 'Running';
/*const STATUS_WAITING = 'Waiting';
const STATUS_STOPPED = 'Stopped';*/
const STATUS_FINISHED = 'Finished';


const getUrlList = async (url, origin, category = null) => {
  try {
    let list = [];
    const html = await dynamicHtml(url);

    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Url List: Trying to get list view with url: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    if ($('', html).find('#id_condition a.qcat-truncate').length > 0) {
      const conditions = $('', html).find('#id_condition a.qcat-truncate ').toArray().filter(tag => {
        return $('', tag).attr('title').toLowerCase() === 'Nuevo'.toLowerCase();
      });
      if (conditions > 0) {
        const _url = $(conditions[0], '').attr('href');
        console.log(`Trying to get list of new products with url: ${_url}`);
        return getUrlList(_url, origin, category);
      }
    }
    for (const item of $('ol#searchResults li.results-item div.rowItem div.item__info-container div.item__info h2.item__title',
      html).toArray()) {
      list.push(
        {
          description: $('a', item).text(),
          url: $('a', item).attr('href'),
          origin,
          category,
        });
    }
    let nextLink = $('li.andes-pagination__button.andes-pagination__button--next', html).toArray();
    nextLink = nextLink.filter(link => {
      return !$('', link).hasClass('andes-pagination__button--disabled');
    });
    const nextUrl = nextLink.length != 0 ? $('a', nextLink.pop()).attr('href') : null;
    return {list, nextUrl};
  } catch (error) {
    console.log(error);
    return {list: [], nextUrl: null};
  }
};

const getProductsList = async (_url, _category_id) => {
  const url = _url.url;
  const origin = _url.origin;
  const category = 'Product';
  if (!url) {
    return {list: []};
  }
  try {
    let list = [];
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      if (!_url) {
        return {list: []};
      }
      console.log(`Product List: Trying to get list view with url ->>>>>: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    if ($('', html).find('#id_condition a.qcat-truncate ').length > 0) {
      const conditions = $('', html).find('#id_condition a.qcat-truncate').toArray().filter(tag => {
        return $('', tag).attr('title').toLowerCase() === 'Nuevo'.toLowerCase();
      });
      if (conditions > 0) {
        const _url = $(conditions[0], '').attr('href');
        console.log(`Trying to get list of new products with url: ${_url}`);
        return getUrlList(_url, origin, category);
      }
    }
    for (const item of $('ol#searchResults li.results-item div.rowItem div.item__info-container div.item__info h2.item__title',
      html).toArray()) {
      list.push(
        {
          description: $('a', item).text(),
          url: $('a', item).attr('href'),
          origin,
          category,
          marketplace_category_id: _category_id,
        });
    }
    let nextLink = $('li.andes-pagination__button.andes-pagination__button--next', html).toArray();
    nextLink = nextLink.filter(link => {
      return !$('', link).hasClass('andes-pagination__button--disabled');
    });
    if (nextLink.length != 0) {
      list.push({
        description: `${url} next page`,
        url: $('a', nextLink.pop()).attr('href'),
        origin,
        category: 'List',
        marketplace_category_id: _category_id,
      });
    }
    await models.url.saveList(list);
    return {list};
  } catch (error) {
    console.log(error);
    return {list: []};
  }
};

const getProductHtml = async (_url) => {
  const url = _url.url;
  const description = _url.description;
  const html = await dynamicHtml(url);
  const filename = `Product_${_url.id}.html`;
  storageUrl.uploadUrl(filename, html, (err) => {
    if (err) {
      console.error(err);
    }
  });

  let list = [{
    description: `${description} Seller`,
    url: $('.reputation-view-more', html).attr('href'),
    origin: 'PDP',
    category: 'Seller',
  }];
  await models.url.saveList(list);
  //TODO Save on a Relational Table to track file against product description
};

const getSellerHtml = async (_url, callBack = false) => {
  const url = _url.url;
  const html = await dynamicHtml(url);
  if (!callBack) {
    const filename = `Seller${_url.id}.html`;
    storageUrl.uploadUrl(filename, html, (err) => {
      if (err) {
        console.error(err);
      }
    });
  } else {
    return html;
  }

};

const dynamicHtml = async (url) => {

  if (browser === null) {
    browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  }

  const page = await browser.newPage();
  const wh = await headerConf.resolution();
  await page.setViewport(wh);
  const agent = await headerConf.userAgent();
  await page.setUserAgent(agent);
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    const delay = await headerConf.randomGet();
    await page.waitFor(delay);
    await page.goto(url);
    const html = await page.content();
    await page.close();
    return html;
  } catch (e) {
    console.error(e);
  }
};

const fz = (n) => {
  const rpm = [10, 5000];
  const days = 20;
  const alpha = (rpm[1] / rpm[0]) ** (1 / (days * 2 - 1));
  return Math.floor(rpm[0] * (alpha ** n));
};

const attempt = async (period) => {
  const m = await models.url.getAttempts();
  const n = fz(Number(m[0].count));

  const parameters = {
    attempts: n,
    period: period,
  };
  let typeScrap = 0;

  const prioritizedSeller = await models.url.getPrioritySellers();
  if (prioritizedSeller) {
    try {
      await models.url.updateStatusSeller(prioritizedSeller.id, STATUS_RUNNING);
      const sellerHrml = await getSellerHtml({url: prioritizedSeller.url}, true);
      const urlProductsSeller = $('.publications__subtitle', sellerHrml)[0].attribs.href;
      let existNextUrl = true;
      let nextUrl = null;
      const productsSeller = [];
      while (existNextUrl) {
        const products = await getProductsList({
          url: nextUrl || urlProductsSeller,
          category: 'List',
          origin: 'Manual',
          id: prioritizedSeller.id,
        });
        await asyncForEach(products.list, (product) => {
          productsSeller.push(product);
        });
        existNextUrl = !!(productsSeller.nextUrl || productsSeller[productsSeller.length - 1].category === 'List');
        nextUrl = (productsSeller.nextUrl || productsSeller[productsSeller.length - 1].url);
      }
      await models.url.updateStatusSeller(prioritizedSeller.id, STATUS_FINISHED, 0);
    } catch (e) {
      console.error(e);
    }
  }

  const prioritizedCategories = await models.url.getPendingLists();
  if (prioritizedCategories && prioritizedCategories.length > 0) {
    await asyncForEach(prioritizedCategories, async (category) => {
      if (category.url) {
        category.origin = 'Manual';
        try {
          await models.url.setCategoryStatus(category.id, 'PROCESSING');
          await getProductsList(category, category.id);
          const list = await models.url.getNonChecked(parameters.attempts, category.id);
          for (const url of list) {
            if (url.category === 'Product') {
              await getProductHtml(url);
              typeScrap = 1;
            } else if (url.category === 'Seller') {
              await getSellerHtml(url);
              typeScrap = 1;
            } else {
              console.error(`${url.category} is not a known reading method`);
              typeScrap = 0;
            }
            await models.url.urlChecked(url.id);
          }
          await models.url.setCategoryStatus(category.id, 'FINISHED');
        } catch (e) {
          await models.url.setCategoryStatus(category.id, 'FINISHED');
        }
      }
    });
  } else {
    const list = await models.url.getNonChecked(parameters.attempts);
    for (const url of list) {
      if (url.category === 'List') {
        await getProductsList(url);
        typeScrap = 0;
      } else if (url.category === 'Product') {
        await getProductHtml(url);
        typeScrap = 1;
      } else if (url.category === 'Seller') {
        await getSellerHtml(url);
        typeScrap = 1;
      } else {
        console.error(`${url.category} is not a known reading method`);
        typeScrap = 0;
      }
      await models.url.urlChecked(url.id);
    }
  }

  try {
    await models.url.saveAttempts(`Se corre un ciclo de Script con ${n} intentos`, typeScrap);
  } catch (error) {
    console.log(error);
    await models.url.saveAttempts(error);
  }

  //TODO Recalculate next attempts per period
  process.exit(1);
};

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const period = 60;
console.log('Attempt');
attempt(period);
