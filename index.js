const rfr = require('rfr');
const fs = require('fs');
const $ = require('cheerio');
const models = rfr('db/models/models');
const puppeteer = require('puppeteer');
let browser = null;

const getProductsList = async (_url) => {
  const url = _url.url;
  const origin = _url.origin;
  const category = 'Product';
  const auto = _url.auto;
  try {
    let list = [];
    const html = await dynamicHtml(url);
    if (!$('div.ico.view-option-stack', html).hasClass('selected')) {
      const _url = $('div.ico.view-option-stack', html).parent().attr('href');
      console.log(`Trying to get list view with url: ${_url}`);
      return getProductsList({ url: _url, origin, category, auto });
    }
    if ($('', html).find('#id_condition a.qcat-truncate ').length > 0) {
      const conditions = $('', html).find('#id_condition a.qcat-truncate').toArray().filter(tag => {
        return $('', tag).attr('title').toLowerCase() == 'Nuevo'.toLowerCase();
      });
      if (conditions > 0) {
        const _url = $(conditions[0], '').attr('href');
        console.log(`Trying to get list of new products with url: ${_url}`);
        return getProductsList({ url: _url, origin, category, auto });
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
          auto
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
        auto
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
  const auto = _url.auto;
  const description = _url.description;
  const html = await dynamicHtml(url);
  const filename = `Product_${_url.id}.html`;
  fs.writeFile(`./docs/${filename}`, html, (err) => console.error(err));
  let list = [{
    description: `${description} Seller`,
    url: $('.reputation-view-more', html).attr('href'),
    origin: 'PDP',
    category: 'Seller',
    auto
  }];
  await models.url.saveList(list);
  //TODO Save on a Relational Table to track file against product description
};

const getSellerHtml = async (_url) => {
  const url = _url.url;
  const html = await dynamicHtml(url);
  const filename = `Seller${_url.id}.html`;
  fs.writeFile(`./docs/${filename}`, html, (err) => console.error(err));
};

const waitDelay = (t) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, t);
  });
};

const dynamicHtml = async (url) => {
  if (browser == null) {
    browser = await puppeteer.launch({ headless: true });
  }
  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.goto(url);
  const html = await page.content();
  await page.close();
  return html;
};

const getRequestsNumber = (n) => { //n-time to run
  const rpm = [10, 1000]; // request number at begining, at end
  const repetitions = 10;  //how many times should the script run
  const alpha = (rpm[1] / rpm[0]) ** (1 / (repetitions * 2 - 1)); //geometrical factor
  return Math.floor(rpm[0] * (alpha ** n)); // n-time requests to do
};

const doRequests = async (parameters, list) => {
  const delay = parameters.period * 1000 / (parameters.attempts + 1);
  let typeScrap = 0;
  try {
    for (const url of list) {
      await waitDelay(delay);
      if (url.category == 'List') {
        await getProductsList(url);
        typeScrap = 1;
      } else if (url.category == 'Product') {
        await getProductHtml(url);
        typeScrap = 1;
      } else if (url.category == 'Seller') {
        await getSellerHtml(url);
        typeScrap = 1;
      } else {
        console.error(`${url.category} is not a known reading method`);
        typeScrap = 0;
      }
      await models.url.urlChecked(url.id);
    }
    return typeScrap;
  } catch (error) {
    throw error;
  }
};

const attempt = async (period) => {
  const repetition = await models.url.getAttempts();
  console.log(repetition);
  const requestsNumber = getRequestsNumber(Number(repetition[0].count));
  console.log(period, requestsNumber);
  const parameters = {
    attempts: requestsNumber,
    period: period
  };
  let totalDone = 0;
  let typeScrap = 0;
  let trys = 0;
  try {
    do {
      trys++;
      const list = await models.url.getNonChecked(parameters.attempts - totalDone);
      totalDone += list.length;
      typeScrap = await doRequests(parameters, list);
    } while (totalDone < requestsNumber || trys < 5);
    await models.url.saveAttempts(`Se corrió un ciclo de Script con ${requestsNumber} peticiones a url`, typeScrap);
    //TODO por que se almacena 'typeScrap' ??
  } catch (error) {
    console.log(error);
    await models.url.saveAttempts(error);
  }
  console.log(`Next run should make requests to ${getRequestsNumber(Number(repetition[0].count) + 1)}`);
  process.exit(1);
};

const period = process.argv[2];
attempt(period);


