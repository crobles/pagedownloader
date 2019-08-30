const rfr = require('rfr');
const $ = require('cheerio');
const models = rfr('db/models/models');
const storageUrl = rfr('storage/url');
const puppeteer = require('puppeteer');
const headerConf = rfr('libs/headerConf');
require('log-timestamp');

let browser = null;

const getUrlList = async (url, origin, category = null) => {
  try {
    let list = [];
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url: ${_url}`);
      return getUrlList(_url, origin, category);
    }
    if ($('', html).find('#id_condition a.qcat-truncate ').length > 0) {
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
          category
        });
    }
    let nextLink = $('li.andes-pagination__button.andes-pagination__button--next', html).toArray();
    nextLink = nextLink.filter(link => {
      return !$('', link).hasClass('andes-pagination__button--disabled');
    });
    const nextUrl = nextLink.length != 0 ? $('a', nextLink.pop()).attr('href') : null;
    console.log(list.length, nextUrl);
    return { list, nextUrl };
  } catch (error) {
    console.log(error);
    return { list: [], nextUrl: null };
  }
};

const getProductsList = async (_url) => {
  const url = _url.url;
  const origin = _url.origin;
  const category = 'Product';
  try {
    let list = [];
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url ->>>>>: ${_url}`);
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
          category
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
        category: 'List'
      });
    }
    console.log(list.length);
    await models.url.saveList(list);
    return { list };
  } catch (error) {
    console.log(error);
    return { list: [] };
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
    category: 'Seller'
  }];
  await models.url.saveList(list);
  //TODO Save on a Relational Table to track file against product description
};

const getSellerHtml = async (_url) => {
  const url = _url.url;
  const html = await dynamicHtml(url);
  const filename = `Seller${_url.id}.html`;
  storageUrl.uploadUrl(filename, html, (err) => {
    if (err) {
      console.error(err);
    }
  });
};

const dynamicHtml = async (url) => {

  if (browser === null) {
    browser = await puppeteer.launch();
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
    period: period
  };

  const list = await models.url.getNonChecked(parameters.attempts);
  let typeScrap = 0;

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

  try {
    await models.url.saveAttempts(`Se corre un ciclo de Script con ${n} intentos`, typeScrap);
  } catch (error) {
    console.log(error);
    await models.url.saveAttempts(error);
  }

  //TODO Recalculate next attempts per period
  process.exit(1);
};

//const period = process.argv[2];

const period = 60;
attempt(period);
